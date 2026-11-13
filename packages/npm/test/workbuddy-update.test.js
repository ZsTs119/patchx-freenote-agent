"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const cp = require("node:child_process");
const { createRuntime, execute } = require("../../workbuddy/patchxnote-agent/bootstrap.cjs");

function fixture(t, overrides = {}) {
  const temp = fs.realpathSync(os.tmpdir());
  const root = fs.mkdtempSync(path.join(temp, "patchx-wb-update-"));
  t.after(() => {
    assert.equal(path.dirname(fs.realpathSync(root)), temp);
    fs.rmSync(root, { recursive: true, force: true });
  });
  const data = { tag: "0.2.16", requests: 0, installs: [], probes: [], fail: false, offline: false, runs: [] };
  const env = { ...process.env, PATCHXNOTE_WORKBUDDY_HOME: root, WORKBUDDY_CONFIG_DIR: path.join(root, "WorkBuddy"),
    npm_config_prefix: path.join(root, "managed prefix"), npm_config_cache: path.join(root, "managed cache") };
  delete env.PATCHXNOTE_WORKBUDDY_CHANNEL;
  const deps = {
    diagnostic: () => {},
    requestJSON: async () => { data.requests++; if (data.offline) throw Error("offline"); return { latest: data.tag }; },
    install: async selection => {
      data.installs.push(selection.version);
      fs.mkdirSync(path.dirname(selection.entry), { recursive: true });
      fs.writeFileSync(path.join(selection.packageDir, "package.json"), JSON.stringify({ version: selection.version }));
      if (data.fail) throw Error("interrupted");
      fs.mkdirSync(selection.binaryDir, { recursive: true });
      fs.writeFileSync(selection.binary, "binary fixture");
      fs.writeFileSync(selection.entry, "process.stdout.write(JSON.stringify({authenticated:false}));");
    },
    probe: async selection => { data.probes.push(selection.version); },
    execute: async (command, args) => { data.runs.push({ command, args }); return { code: 0, stdout: "" }; },
    ...overrides
  };
  const runtime = createRuntime({ env, installTimeoutMs: 80 }, deps);
  return { runtime, data, env, root, deps };
}
test("fresh install, post-install recheck, npm self update and rollback share a selected version", async t => {
  const { runtime: r, data } = fixture(t);
  assert.equal(await r.check(), false);
  const first = await r.prepare();
  const checked = data.requests;
  assert.equal(await r.check(), true);
  assert.equal(data.requests, checked, "post-install recheck must not resolve latest again");
  await r.run(["status", "--output", "json"]);
  assert.equal(data.runs.at(-1).args[0], first.entry);
  assert.ok(data.runs.at(-1).args.includes(first.binaryDir));
  data.tag = "0.2.18";
  assert.equal(await r.check(), false);
  data.tag = "0.2.19";
  const second = await r.prepare();
  assert.equal(second.version, "0.2.18", "prepare uses the version selected by check");
  assert.notEqual(first.packageDir, second.packageDir);
  assert.ok(fs.existsSync(first.entry), "old running version is retained");
  assert.equal(await r.check(), true);
  await r.run(["serve"]);
  assert.equal(data.runs.at(-1).args[0], second.entry, "new npm entry, not just new Go binary");
  data.tag = "0.2.16";
  assert.equal(await r.check(), false);
  assert.equal((await r.prepare()).entry, first.entry);
  assert.deepEqual(data.installs, ["0.2.16", "0.2.18"]);
});
test("registry outage and interrupted update preserve a usable version without an update loop", async t => {
  const { runtime: r, data } = fixture(t);
  await r.check(); await r.prepare(); await r.check();
  data.offline = true;
  assert.equal(await r.check(), true);
  data.offline = false; data.tag = "0.2.18"; data.fail = true;
  assert.equal(await r.check(), false);
  assert.equal((await r.prepare()).version, "0.2.16");
  assert.equal(await r.check(), true, "fallback must pass WorkBuddy's post-init recheck");
  assert.equal(await r.check(), false, "a later connection retries the update");
  data.fail = false;
  assert.equal((await r.prepare()).version, "0.2.18");
});
test("fresh installation failure and half-installed files can be retried", async t => {
  const { runtime: r, data } = fixture(t);
  data.fail = true;
  await r.check();
  await assert.rejects(r.prepare(), /Installation failed/);
  assert.equal(r.readState().current, null);
  data.fail = false;
  await r.check();
  const selected = await r.prepare();
  await r.check();
  fs.unlinkSync(selected.binary);
  assert.equal(await r.check(), false);
  assert.notEqual((await r.prepare()).binaryDir, selected.binaryDir);
});
test("broken old npm launcher is not needed to obtain a repair version", async t => {
  const { runtime: r, data } = fixture(t);
  await r.check(); const old = await r.prepare(); await r.check();
  fs.writeFileSync(old.entry, "throw new Error('old npm launcher is broken')");
  data.tag = "0.2.18";
  assert.equal(await r.check(), false);
  const repaired = await r.prepare();
  assert.equal(repaired.version, "0.2.18");
  await r.run(["status"]);
  assert.equal(data.runs.at(-1).args[0], repaired.entry);
});
test("an installed version that fails its launcher probe is re-prepared, not treated as ready", async t => {
  let broken;
  const { runtime: r } = fixture(t, { probe: async selection => {
    if (selection.entry === broken) throw Error("launcher cannot start");
  } });
  await r.check(); const first = await r.prepare(); await r.check();
  broken = first.entry;
  assert.equal(await r.check(), false);
  const repaired = await r.prepare();
  assert.equal(repaired.version, first.version);
  assert.notEqual(repaired.entry, first.entry);
});
test("installation child timeout completes fallback before the host would kill bootstrap", async t => {
  const { runtime: r, data, deps, env } = fixture(t);
  await r.check(); await r.prepare(); await r.check();
  data.tag = "0.2.18";
  const runtime = createRuntime({ env, installTimeoutMs: 40 }, {
    ...deps,
    install: async (_selection, remaining) => execute(process.execPath, ["-e", "setInterval(()=>{},1000)"], { timeoutMs: remaining() })
  });
  await runtime.check();
  const start = Date.now();
  assert.equal((await runtime.prepare()).version, "0.2.16");
  assert.ok(Date.now() - start < 2500);
  assert.equal(await runtime.check(), true);
});
test("package-pinned binary fast path bypasses install locks and rejects missing prepared binaries", async t => {
  const { root } = fixture(t);
  const installDir = path.join(root, "binary");
  fs.mkdirSync(installDir);
  const binary = path.join(installDir, process.platform === "win32" ? "patchxnote.exe" : "patchxnote");
  fs.writeFileSync(binary, "fixture");
  fs.mkdirSync(binary + ".lock");
  const file = require.resolve("../bin/patchxnote-agent.js");
  const original = cp.spawnSync;
  cp.spawnSync = () => ({ status: 0, stdout: JSON.stringify({ version: require("../package.json").version }) });
  delete require.cache[file];
  const wrapper = require(file);
  cp.spawnSync = original;
  t.after(() => { delete require.cache[file]; });
  const start = Date.now();
  assert.equal((await wrapper.ensureBinary({ installDir })).install_path, binary);
  assert.ok(Date.now() - start < 1000);
  const previous = process.env.PATCHXNOTE_AGENT_REQUIRE_INSTALLED;
  process.env.PATCHXNOTE_AGENT_REQUIRE_INSTALLED = "1";
  try { await assert.rejects(wrapper.ensureBinary({ installDir: path.join(root, "missing") }), /reconnect/); }
  finally {
    if (previous === undefined) delete process.env.PATCHXNOTE_AGENT_REQUIRE_INSTALLED;
    else process.env.PATCHXNOTE_AGENT_REQUIRE_INSTALLED = previous;
  }
});
test("installer lock ownership preserves a live writer and recovers a stopped writer", async t => {
  const { root } = fixture(t);
  const wrapper = require("../bin/patchxnote-agent.js");
  const lock = path.join(root, "fixture.lock");
  fs.mkdirSync(lock);
  fs.writeFileSync(path.join(lock, "owner.json"), JSON.stringify({ pid: process.pid }));
  await wrapper.removeStaleLock(lock);
  assert.ok(fs.existsSync(lock));
  fs.writeFileSync(path.join(lock, "owner.json"), JSON.stringify({ pid: 987654321 }));
  const kill = process.kill;
  process.kill = () => { const error = new Error("not running"); error.code = "ESRCH"; throw error; };
  try { await wrapper.removeStaleLock(lock); } finally { process.kill = kill; }
  assert.equal(fs.existsSync(lock), false);
  const plan = { install_dir: root, install_path: path.join(root, "owned") };
  await wrapper.withInstallLock(plan, async () => assert.equal(JSON.parse(fs.readFileSync(plan.install_path + ".lock/owner.json")).pid, process.pid));
  assert.equal(fs.existsSync(plan.install_path + ".lock"), false);
});

