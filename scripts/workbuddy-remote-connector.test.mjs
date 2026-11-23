import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { before, test } from "node:test";
import { validateWorkBuddyConnector } from "./validate-workbuddy-connector.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(fs.readFileSync(path.join(repoRoot, "packages/distribution/channels.json"), "utf8"));
const version = JSON.parse(fs.readFileSync(path.join(repoRoot, config.channels.workbuddy.manifest), "utf8")).version;
const artifacts = new Map();

function readJSON(root, name) {
  return JSON.parse(fs.readFileSync(path.join(root, name), "utf8"));
}

function editJSON(root, name, edit) {
  const value = readJSON(root, name);
  edit(value);
  fs.writeFileSync(path.join(root, name), `${JSON.stringify(value, null, 2)}\n`);
}

function mutateBundle(t, edit) {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "workbuddy-remote-package-"));
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
  const bundle = path.join(temporary, "bundle");
  fs.cpSync(artifacts.get("production").bundle, bundle, { recursive: true });
  edit(bundle);
  return () => validateWorkBuddyConnector({ connectorRoot: bundle, expectedURL: config.environments.production.mcpURL });
}

// Read actual stored ZIP payloads independently from the production name validator.
function readArchive(zipPath) {
  const buffer = fs.readFileSync(zipPath);
  const entries = new Map();
  let offset = 0;
  while (buffer.readUInt32LE(offset) === 0x04034b50) {
    assert.equal(buffer.readUInt16LE(offset + 8), 0, "packager uses stored entries");
    const size = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const name = buffer.subarray(offset + 30, offset + 30 + nameLength).toString("utf8");
    const contentStart = offset + 30 + nameLength + extraLength;
    assert.ok(!entries.has(name), `duplicate ZIP entry: ${name}`);
    entries.set(name, buffer.subarray(contentStart, contentStart + size));
    offset = contentStart + size;
  }
  assert.equal(buffer.readUInt32LE(offset), 0x02014b50);
  assert.equal(entries.size, buffer.readUInt16LE(buffer.length - 12));
  return entries;
}

before(() => {
  for (const environment of ["production", "test"]) {
    const result = spawnSync(process.execPath, ["scripts/package-channel.mjs", "--channel", "workbuddy", "--env", environment], {
      cwd: repoRoot, encoding: "utf8", timeout: 30000, windowsHide: true
    });
    assert.equal(result.status, 0, result.stderr || result.error?.message);
    const output = JSON.parse(result.stdout);
    const zipPath = path.resolve(repoRoot, output.artifact);
    artifacts.set(environment, { zipPath, bundle: path.join(path.dirname(zipPath), "bundle") });
  }
});

test("generated production and test ZIPs use direct MCP and matching platform OAuth", () => {
  for (const [environment, { zipPath, bundle }] of artifacts) {
    const url = config.environments[environment].mcpURL;
    const meta = readJSON(bundle, "connector-meta.json");
    const mcp = readJSON(bundle, "mcp.json");
    assert.equal(meta.source, "patchxfreenote");
    assert.equal(meta.version, version);
    assert.equal(meta.auth_mode, "server-side");
    assert.equal(meta.server_auth.auth_type, "mcp_oauth");
    assert.deepEqual(meta.server_auth.data, { mcp_oauth: { server_url: url } });
    assert.deepEqual(mcp, { mcpServers: { patchxnote: { type: "streamableHttp", url, timeout: 30000 } } });
    const entries = readArchive(zipPath);
    assert.deepEqual([...new Set([...entries.keys()].map(name => name.split("/")[0]))].sort(),
      ["connector-meta.json", "icon.png", "mcp.json", "skills"]);
    for (const [name, content] of entries) {
      assert.deepEqual(content, fs.readFileSync(path.join(bundle, name)), `ZIP differs from bundle: ${name}`);
      assert.doesNotMatch(content.toString("utf8"), /\{\{[A-Z_]+\}\}/, name);
      if (name.endsWith(".md")) {
        assert.doesNotMatch(content.toString("utf8"), /preAuth|npx\s|mcp (?:login|status)|--no-browser|brotliDecompressSync/, name);
      }
    }
    const skill = entries.get("skills/patchxnote-mcp/SKILL.md").toString("utf8");
    for (const tool of [
      "patchxnote_list_enterprises",
      "patchxnote_list_enterprise_members",
      "patchxnote_list_enterprise_records",
      "patchxnote_get_enterprise_record_content",
      "patchxnote_export_enterprise_records",
    ]) {
      assert.ok(skill.includes(tool), `enterprise workflow is missing ${tool}`);
    }
    assert.ok(meta.examples_zh.some(example => example.includes("ZIP") && example.includes("离职")));
    assert.ok(meta.examples_en.some(example => /former employee.*ZIP/i.test(example)));
    validateWorkBuddyConnector({ connectorRoot: bundle, expectedURL: url, zipPath });
  }
});

test("rejects the mixed MCP and CLI package that the uploader refused", t => {
  assert.throws(mutateBundle(t, root => fs.writeFileSync(path.join(root, "cli.json"), "{}")), /cli\.json/);
});

test("rejects CLI preAuth left in a remote MCP config", t => {
  assert.throws(mutateBundle(t, root => editJSON(root, "mcp.json", mcp => { mcp.preAuth = "cli"; })), /preAuth/);
});

test("rejects local and encoded startup args even alongside a remote URL", t => {
  assert.throws(mutateBundle(t, root => editJSON(root, "mcp.json", mcp => {
    mcp.mcpServers.patchxnote.command = "node";
    mcp.mcpServers.patchxnote.args = ["-e", "require('node:zlib').brotliDecompressSync(Buffer.from('fixture','base64'))"];
  })), /command|args|local/i);
});

test("rejects an executable bootstrap accidentally copied into the package", t => {
  assert.throws(mutateBundle(t, root => fs.writeFileSync(path.join(root, "bootstrap.cjs"), "// fixture")), /bootstrap|script|unexpected/i);
});

test("rejects OAuth discovery targeting a different environment", t => {
  assert.throws(mutateBundle(t, root => editJSON(root, "connector-meta.json", meta => {
    meta.server_auth.data.mcp_oauth.server_url = config.environments.test.mcpURL;
  })), /server_url|environment|URL/);
});

test("rejects an unresolved URL template in generated metadata", t => {
  assert.throws(mutateBundle(t, root => editJSON(root, "connector-meta.json", meta => {
    meta.server_auth.data.mcp_oauth.server_url = "{{MCP_URL}}";
  })), /server_url|template|URL/);
});

test("rejects a stale Skill version in the new connector package", t => {
  assert.throws(mutateBundle(t, root => {
    const file = path.join(root, "skills/patchxnote-mcp/SKILL.md");
    fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace(`${version}-workbuddy`, "0.0.0-workbuddy"));
  }), /Skill version/);
});

test("rejects a Skill that omits the note rendering tool used by its example", t => {
  assert.throws(mutateBundle(t, root => {
    const file = path.join(root, "skills/patchxnote-mcp/SKILL.md");
    fs.writeFileSync(file, fs.readFileSync(file, "utf8").replaceAll("patchxnote_render_webhook_message", "missing_render_tool"));
  }), /patchxnote_render_webhook_message/);
});
