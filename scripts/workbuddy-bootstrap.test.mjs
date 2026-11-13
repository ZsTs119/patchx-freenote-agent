import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { bootstrapArgs, bootstrapCommand, renderWorkBuddyBootstrap } from "./lib/workbuddy-bootstrap.mjs";
import { selectTests } from "./validate-release-metadata.mjs";

const require = createRequire(import.meta.url);
const { createRuntime } = require("../packages/workbuddy/patchxnote-agent/bootstrap.cjs");
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(repo, "packages/workbuddy/patchxnote-agent/bootstrap.cjs");
const source = fs.readFileSync(sourcePath, "utf8");
function fixture(t) {
  const temp = fs.realpathSync(os.tmpdir());
  const root = fs.mkdtempSync(path.join(temp, "patchx-wb-bootstrap-"));
  t.after(() => { assert.equal(path.dirname(fs.realpathSync(root)), temp); fs.rmSync(root, { recursive: true, force: true }); });
  const env = { ...process.env, PATCHXNOTE_WORKBUDDY_HOME: path.join(root, "Agent files"),
    WORKBUDDY_CONFIG_DIR: path.join(root, "WorkBuddy"),
    npm_config_prefix: path.join(root, "npm prefix"), npm_config_cache: path.join(root, "npm cache") };
  delete env.PATCHXNOTE_WORKBUDDY_CHANNEL;
  return { root, env };
}
test("Windows and macOS preflight creates a complete prefix before npm, idempotently", t => {
  const { env } = fixture(t);
  for (const platform of ["win32", "darwin"]) {
    const runtime = createRuntime({ env, platform });
    runtime.directories();
    for (const folder of ["", "bin", "lib/node_modules"]) assert.ok(fs.statSync(path.join(runtime.paths.prefix, folder)).isDirectory());
    const marker = path.join(runtime.paths.cache, "keep.txt");
    fs.writeFileSync(marker, "keep");
    runtime.directories();
    assert.equal(fs.readFileSync(marker, "utf8"), "keep");
    assert.ok(runtime.selectionFor("0.2.16").binary.endsWith(platform === "win32" ? ".exe" : "patchxnote"));
  }
});
test("generated Node CLI and MCP entry execute with spaced paths and the selected legacy install-dir", t => {
  const { root, env } = fixture(t);
  const options = { channel: "latest", profile: "workbuddy", serverBaseURL: "https://freenote.patch-x.cn" };
  const runtime = createRuntime({ ...options, env });
  runtime.directories();
  const selected = runtime.selectionFor("0.2.16");
  fs.mkdirSync(path.dirname(selected.entry), { recursive: true });
  fs.mkdirSync(selected.binaryDir, { recursive: true });
  fs.writeFileSync(path.join(selected.packageDir, "package.json"), JSON.stringify({ version: "0.2.16" }));
  fs.writeFileSync(selected.binary, "fixture");
  fs.writeFileSync(selected.entry, "console.log(JSON.stringify({authenticated:false,args:process.argv.slice(2)}))");
  fs.writeFileSync(runtime.paths.stateFile, JSON.stringify({ current: selected, receipt: { at: Date.now() } }));
  const checkArgs = bootstrapArgs(source, options, "check");
  const check = spawnSync(process.execPath, checkArgs, { env, encoding: "utf8", timeout: 5000, cwd: root });
  assert.equal(check.status, 0, check.stderr);
  assert.equal(check.stdout.trim(), "workbuddy-ready=1.0.0");
  const args = bootstrapArgs(source, options, "run", ["status", "--output", "json"]);
  const command = bootstrapCommand(args);
  assert.ok(command.length < 8000);
  const result = spawnSync(command, { shell: true, env, cwd: root, encoding: "utf8", timeout: 5000, windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.authenticated, false);
  assert.equal(output.args[output.args.indexOf("--install-dir") + 1], selected.binaryDir);
  assert.equal(output.args[output.args.indexOf("--profile") + 1], "workbuddy");
  const mcp = spawnSync(process.execPath, bootstrapArgs(source, options, "run", ["serve"]),
    { env, cwd: root, encoding: "utf8", timeout: 5000 });
  assert.equal(mcp.status, 0, mcp.stderr);
  assert.deepEqual(JSON.parse(mcp.stdout).args.slice(0, 2), ["mcp", "serve"]);
});
test("published connector wiring uses readiness, preserves auth flags, and defaults to latest", () => {
  const cli = JSON.parse(fs.readFileSync(path.join(repo, "packages/workbuddy/patchxnote-agent/cli.json")));
  const mcp = JSON.parse(fs.readFileSync(path.join(repo, "packages/workbuddy/patchxnote-agent/mcp.json")));
  renderWorkBuddyBootstrap(cli, mcp, { sourcePath, serverBaseURL: "https://freenote.patch-x.cn" });
  assert.equal(cli.versionCheck.minVersion, "1.0.0");
  assert.match("workbuddy-ready=0.0.0", new RegExp(cli.versionCheck.versionPattern));
  assert.equal(cli.authWaitForExit, true);
  for (const platform of ["win32", "darwin"]) {
    assert.match(cli.auth[platform], /--no-browser/);
    assert.match(cli.auth[platform], /--force/);
    assert.match(cli.status[platform], /status/);
    assert.doesNotMatch(cli.status[platform], /--verify/);
    assert.ok(cli.init[platform].length < 8000);
  }
  const server = Object.values(mcp.mcpServers)[0];
  assert.equal(server.command, "node");
  assert.equal(JSON.parse(Buffer.from(server.args[4], "base64")).channel, "latest");
  assert.equal(server.env.PATCHXNOTE_MCP_MODE, "remote");
});
test("candidate channel uses a different selection record from production", t => {
  const { env } = fixture(t);
  const production = createRuntime({ env });
  const candidate = createRuntime({ env: { ...env, PATCHXNOTE_WORKBUDDY_CHANNEL: "next" } });
  assert.notEqual(candidate.paths.stateFile, production.paths.stateFile);
});
test("this release selects only its update tests while unrelated runtime changes keep their gate", () => {
  const files = ["packages/workbuddy/patchxnote-agent/bootstrap.cjs", "packages/npm/bin/patchxnote-agent.js", "server.json"];
  assert.equal(selectTests("v0.2.17", files, () => "", () => "").runtimeWorkbuddyUpdateOnly, true);
  assert.equal(selectTests("v0.2.17", [...files, "internal/cli/mcp.go"], () => "", () => "").runtimeWorkbuddyUpdateOnly, false);
});

