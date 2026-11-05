#!/usr/bin/env node
// Scoped acceptance of a candidate binary using existing test-profile credentials.
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({ options: {
  case: { type: "string" }, bin: { type: "string" },
  "server-base-url": { type: "string" }, profile: { type: "string" }, out: { type: "string" },
} });
for (const key of ["case", "bin", "server-base-url", "profile", "out"]) {
  if (!values[key]) throw new Error(`Missing --${key}`);
}
if (!["local-content", "remote-compat"].includes(values.case)) throw new Error("Unknown acceptance case");
const expectedMode = values.case === "local-content" ? "local" : "remote";
if (process.env.PATCHXNOTE_MCP_MODE !== expectedMode) throw new Error("Set PATCHXNOTE_MCP_MODE to the intended branch");
const destination = path.resolve(values.out);
await fs.mkdir(destination, { recursive: true, mode: 0o700 });
const checks = [];
function check(name, ok) {
  checks.push({ name, pass: Boolean(ok) });
  if (!ok) throw new Error(`Failed check: ${name}`);
}
const child = spawn(path.resolve(values.bin), ["--server-base-url", values["server-base-url"], "--profile", values.profile, "mcp", "serve"], {
  env: process.env, stdio: ["pipe", "pipe", "pipe"], windowsHide: true,
});
let nextID = 0;
let pending;
let buffer = "";
let stderrBytes = 0;
let exited = false;
let exitCode;
child.stderr.on("data", chunk => { stderrBytes += chunk.length; });
child.stdout.on("data", chunk => {
  buffer += chunk.toString("utf8");
  let pos;
  while ((pos = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, pos); buffer = buffer.slice(pos + 1);
    if (!line.trim()) continue;
    try {
      const response = JSON.parse(line);
      if (!pending || response.id !== pending.id) throw new Error("Unexpected JSON-RPC response ID");
      const current = pending; pending = undefined; clearTimeout(current.timer);
      if (response.error) current.reject(new Error(`RPC error: ${response.error.code}/${response.error.data?.code || "unknown"}`));
      else current.resolve(response.result);
    } catch {
      pending?.reject(new Error("Invalid stdio response"));
    }
  }
});
const closed = new Promise(resolve => {
  child.on("error", () => { pending?.reject(new Error("Candidate process failed")); });
  child.on("exit", code => { exited = true; exitCode = code; pending?.reject(new Error("Candidate exited before response")); resolve(); });
});
async function rpc(method, params) {
  if (pending) throw new Error("Requests must be sequential");
  if (exited) throw new Error("Candidate has exited");
  const id = ++nextID;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending = undefined; reject(new Error(`Timed out: ${method}`)); }, 30000);
    pending = { id, resolve, reject, timer };
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
  });
}
async function tool(name, args) {
  const result = await rpc("tools/call", { name: `patchxnote_${name}`, arguments: args });
  if (result.isError) throw new Error(`Tool failed: ${name}`);
  const text = result.content?.find(item => item.type === "text")?.text;
  if (!text) throw new Error(`Missing tool payload: ${name}`);
  try { return JSON.parse(text); } catch { throw new Error(`Invalid tool payload: ${name}`); }
}
let failure;
let toolCount = 0;
try {
  const initialized = await rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "account-content-acceptance", version: "1" } });
  check("initialize", Boolean(initialized.serverInfo && initialized.protocolVersion));
  child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`);
  const catalog = await rpc("tools/list", {});
  toolCount = catalog.tools?.length || 0;
  await fs.writeFile(path.join(destination, "tool-contract.json"), JSON.stringify(catalog, null, 2), { mode: 0o600 });
  const listTool = catalog.tools?.find(item => item.name === "patchxnote_list_memories");
  check("optional_platform_schema", listTool?.inputSchema.properties.platform.enum.includes("web") && !listTool.inputSchema.required?.includes("platform"));
  if (expectedMode === "local") {
    check("local_search_contract", catalog.tools.some(item => item.name === "patchxnote_search_memories" && /cache/.test(item.description)));
  }
  const all = [];
  const cursors = new Set();
  let cursor;
  do {
    const args = { limit: 1 };
    if (cursor) args.cursor = cursor;
    const page = await tool("list_memories", args);
    check("page_items", Array.isArray(page.items));
    all.push(...page.items);
    cursor = page.next_cursor;
    if (cursor) { check("cursor_progress", !cursors.has(cursor)); cursors.add(cursor); }
  } while (cursor);
  check("three_sources_and_pagination", ["mobile", "desktop", "web"].every(p => all.some(item => item.platform === p)) && cursors.size >= 1);
  check("unique_source_ids", new Set(all.map(item => `${item.platform}:${item.id}`)).size === all.length);
  for (const platform of ["mobile", "desktop", "web"]) {
    const page = await tool("list_memories", { platform, limit: 50 });
    check(`filter_${platform}`, page.items.length > 0 && page.items.every(item => item.platform === platform));
    const detail = await tool("get_memory", { memory_id: page.items[0].id, platform });
    check(`detail_${platform}`, detail.id === page.items[0].id && detail.platform === platform);
  }
  const web = all.find(item => item.platform === "web");
  const unique = await tool("get_memory", { memory_id: web.id });
  check("unique_without_platform", unique.id === web.id && unique.platform === "web");
  if (expectedMode === "local") {
    const search = await tool("search_memories", { query: "event_summary", limit: 50 });
    check("cached_search_all", ["mobile", "desktop", "web"].every(p => search.items.some(item => item.platform === p)));
    const webSearch = await tool("search_memories", { query: "event_summary", platform: "web", limit: 50 });
    check("cached_search_web", webSearch.items.length > 0 && webSearch.items.every(item => item.platform === "web"));
    const parsed = await tool("get_model_io_parsed_result", { memory_id: web.id });
    check("parsed_result", parsed.available === true && parsed.platform === "web" && JSON.stringify(parsed).includes("Synthetic account content"));
    const draftPath = path.join(destination, "draft");
    const draft = await tool("render_webhook_message", { memory_id: web.id, save_draft: true, out: draftPath, include_model_io: true });
    check("draft_result", draft.memory?.platform === "web");
    const markdown = await fs.readFile(path.join(draftPath, "message.md"), "utf8");
    const metadata = JSON.parse(await fs.readFile(path.join(draftPath, "metadata.json"), "utf8"));
    check("draft_files", markdown.trim().length > 0 && markdown === draft.markdown && metadata.platform === "web");
    const exportPath = path.join(destination, "model-io.json");
    const result = await tool("export_model_io", { memory_id: web.id, platform: "web", out: exportPath });
    const exported = JSON.parse(await fs.readFile(exportPath, "utf8"));
    check("export_file", result.exported === true && exported.memory?.platform === "web" && JSON.stringify(exported.parsed_result_json).includes("Synthetic account content"));
  }
} catch (error) {
  failure = error.message;
} finally {
  if (pending) { clearTimeout(pending.timer); pending = undefined; }
  child.stdin.end();
  const timer = setTimeout(() => child.kill(), 5000);
  await closed; clearTimeout(timer);
}
const report = { case: values.case, mode: expectedMode, target: values["server-base-url"], profile: values.profile, checks, tool_count: toolCount, rpc_requests: nextID, process_exit: exitCode, stderr_bytes: stderrBytes, pass: !failure && exitCode === 0, failure };
await fs.writeFile(path.join(destination, "report.json"), JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
process.exitCode = report.pass ? 0 : 1;
