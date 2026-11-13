"use strict";

// This file is embedded in the connector. It must work without an installed npm package.
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const { spawn, spawnSync } = require("node:child_process");

function readJSON(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}
function writeJSON(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = file + "." + process.pid + ".tmp";
  fs.writeFileSync(temporary, JSON.stringify(value) + "\n");
  fs.renameSync(temporary, file);
}
function requestJSON(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const transport = require(url.startsWith("https:") ? "node:https" : "node:http");
    const request = transport.get(url, { headers: { "cache-control": "no-cache" } }, response => {
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error("registry returned HTTP " + response.statusCode));
        return;
      }
      let text = "";
      response.setEncoding("utf8");
      response.on("data", chunk => { text += chunk; });
      response.on("end", () => {
        try { resolve(JSON.parse(text)); } catch { reject(new Error("registry returned invalid JSON")); }
      });
      response.on("error", reject);
    });
    const timer = setTimeout(() => request.destroy(new Error("registry request timed out")), timeoutMs);
    request.on("close", () => clearTimeout(timer));
    request.on("error", reject);
  });
}
function stopChild(child) {
  if (!child.pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill.exe", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore", windowsHide: true });
  } else {
    try { process.kill(-child.pid, "SIGKILL"); } catch { child.kill("SIGKILL"); }
  }
}
function execute(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd, env: options.env || process.env, windowsHide: true,
      detached: process.platform !== "win32",
      stdio: options.live ? ["pipe", "inherit", "inherit"] : ["ignore", "pipe", "pipe"]
    });
    let stdout = "", stderr = "", expired = false;
    const timer = options.timeoutMs ? setTimeout(() => { expired = true; stopChild(child); }, options.timeoutMs) : null;
    if (options.live) {
      child.stdin.on("error", () => {});
      process.stdin.pipe(child.stdin);
    } else {
      child.stdout.on("data", data => { stdout = (stdout + data).slice(-65536); });
      child.stderr.on("data", data => { stderr = (stderr + data).slice(-65536); });
    }
    const forward = () => stopChild(child);
    process.once("SIGINT", forward);
    process.once("SIGTERM", forward);
    const cleanup = () => {
      if (timer) clearTimeout(timer);
      process.removeListener("SIGINT", forward);
      process.removeListener("SIGTERM", forward);
      process.removeListener("exit", forward);
      if (options.live) { process.stdin.unpipe(child.stdin); process.stdin.pause(); }
    };
    child.once("error", error => { cleanup(); reject(error); });
    process.once("exit", forward);
    child.once("close", (code, signal) => {
      cleanup();
      if (expired) reject(new Error("process timed out"));
      else resolve({ code: code === null ? (signal === "SIGINT" ? 130 : 143) : code, stdout, stderr });
    });
  });
}
function findNpmCLI(executable = process.execPath) {
  const paths = [executable];
  try { paths.push(fs.realpathSync(executable)); } catch {}
  for (const item of paths) {
    for (const file of [
      path.join(path.dirname(item), "node_modules/npm/bin/npm-cli.js"),
      path.resolve(path.dirname(item), "../lib/node_modules/npm/bin/npm-cli.js"),
      path.resolve(path.dirname(item), "../share/nodejs/npm/bin/npm-cli.js")
    ]) {
      if (fs.existsSync(file)) return file;
    }
  }
  throw new Error("npm CLI is missing from the Node runtime");
}
function createRuntime(options = {}, dependencies = {}) {
  const env = options.env || process.env;
  const platform = options.platform || process.platform;
  const arch = options.arch || process.arch;
  const profile = options.profile || "workbuddy";
  const server = options.serverBaseURL || "https://freenote.patch-x.cn";
  const channel = env.PATCHXNOTE_WORKBUDDY_CHANNEL || options.channel || "latest";
  const registry = (options.registry || "https://registry.npmjs.org").replace(/\/$/, "");
  const data = env.WORKBUDDY_CONFIG_DIR || env.CODEBUDDY_CONFIG_DIR || path.join(os.homedir(), ".workbuddy");
  const prefix = env.npm_config_prefix || env.NPM_CONFIG_PREFIX || path.join(data, "binaries/node/cli-connector-packages");
  const cache = env.npm_config_cache || env.NPM_CONFIG_CACHE || path.join(data, "binaries/node/cli-connector-cache");
  const namespace = crypto.createHash("sha256").update(server + "\n" + profile + "\n" + channel).digest("hex").slice(0, 12);
  const root = path.join(env.PATCHXNOTE_WORKBUDDY_HOME || path.join(data, "patchxnote-runtime"), namespace, platform + "-" + arch);
  const stateFile = path.join(root, "state.json");
  const deps = { requestJSON, execute, now: Date.now, ...dependencies };
  const diagnostic = dependencies.diagnostic || (text => process.stderr.write("[PatchX Freenote] " + text + "\n"));
  const state = () => readJSON(stateFile, {});
  const save = value => writeJSON(stateFile, value);
  function directories() {
    for (const dir of [prefix, path.join(prefix, "bin"), path.join(prefix, "lib/node_modules"), cache, root]) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  function usable(selection) {
    if (!selection || ![selection.packageDir, selection.entry, selection.binary].every(item => typeof item === "string")) return false;
    const metadata = readJSON(path.join(selection.packageDir, "package.json"));
    return metadata?.version === selection.version && fs.existsSync(selection.entry) && fs.existsSync(selection.binary);
  }
  function selected() {
    const current = state();
    return [current.current, current.previous].find(usable) || null;
  }
  async function target() {
    if (/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(channel)) return channel;
    const tags = await deps.requestJSON(registry + "/-/package/patchxnote-agent/dist-tags", options.queryTimeoutMs || 3000);
    const version = tags[channel];
    if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version || "")) throw new Error("npm tag has no usable version");
    return version;
  }
  async function check() {
    directories();
    const current = state();
    if (current.receipt && deps.now() - current.receipt.at < 30000 && usable(current.current)) {
      delete current.receipt;
      save(current);
      return true;
    }
    delete current.receipt;
    let version;
    try { version = await target(); }
    catch (error) {
      let old = selected();
      if (old) { try { await probe(old, 3500); } catch { old = null; } }
      save({ ...current, current: old, pending: { version: null, at: deps.now() } });
      if (old) diagnostic("Update check unavailable; continuing with " + old.version + ".");
      return !!old;
    }
    const old = selected();
    let ready = usable(old) && old.version === version;
    if (ready) { try { await probe(old, 3500); } catch { ready = false; } }
    save({ ...current, current: old, pending: ready ? null : { version, at: deps.now() } });
    return ready;
  }
  function selectionFor(version) {
    const folder = path.join(root, "versions", version + "-" + crypto.randomBytes(5).toString("hex"));
    const packageDir = path.join(folder, "npm/node_modules/patchxnote-agent");
    const binaryDir = path.join(folder, "bin");
    return {
      version, packageDir, binaryDir, npmPrefix: path.join(folder, "npm"),
      entry: path.join(packageDir, "bin/patchxnote-agent.js"),
      binary: path.join(binaryDir, platform === "win32" ? "patchxnote.exe" : "patchxnote")
    };
  }
  async function probe(selection, timeoutMs = 5000) {
    if (!usable(selection)) throw new Error("installed files are incomplete");
    if (deps.probe) return deps.probe(selection, timeoutMs);
    const started = deps.now();
    const version = await deps.execute(selection.binary, ["version", "--output", "json"], { env, timeoutMs });
    if (version.code !== 0 || JSON.parse(version.stdout).version !== selection.version) throw new Error("binary version check failed");
    const result = await deps.execute(process.execPath, [selection.entry, "mcp", "status",
      "--install-dir", selection.binaryDir, "--output", "json", "--profile", profile, "--server-base-url", server
    ], { env, timeoutMs: Math.max(1, timeoutMs - (deps.now() - started)) });
    if (result.code !== 0 || typeof JSON.parse(result.stdout).authenticated !== "boolean") throw new Error("npm launcher status check failed");
  }
  async function install(selection, remaining) {
    fs.mkdirSync(selection.npmPrefix, { recursive: true });
    const npm = findNpmCLI();
    const result = await deps.execute(process.execPath, [npm, "install", "--prefix", selection.npmPrefix,
      "--no-audit", "--no-fund", "--package-lock=false", "--registry", registry,
      "patchxnote-agent@" + selection.version
    ], { cwd: selection.npmPrefix, env: { ...env, npm_config_cache: cache }, timeoutMs: remaining() });
    if (result.code !== 0) throw new Error("npm package installation failed (exit " + result.code + ")");
    const binary = await deps.execute(process.execPath, [selection.entry, "install", "--install-dir", selection.binaryDir],
      { cwd: selection.npmPrefix, env, timeoutMs: remaining() });
    if (binary.code !== 0) throw new Error("Go binary installation failed (exit " + binary.code + ")");
  }
  async function prepare() {
    directories();
    const before = state();
    const deadline = deps.now() + (options.installTimeoutMs || 240000);
    const remaining = () => {
      const time = deadline - deps.now();
      if (time <= 0) throw new Error("installation timed out");
      return time;
    };
    try {
      const version = before.pending?.version || await target();
      let next = [before.current, before.previous].find(item => usable(item) && item.version === version);
      if (next) {
        try { await probe(next, Math.min(5000, remaining())); } catch { next = null; }
      }
      if (!next) {
        next = selectionFor(version);
        await (deps.install || install)(next, remaining);
        await probe(next, Math.min(5000, remaining()));
      }
      save({ current: next, previous: before.current?.version !== version ? before.current : before.previous,
        pending: null, receipt: { at: deps.now() } });
      diagnostic("Ready: " + next.version + ".");
      return next;
    } catch (error) {
      for (const old of [before.current, before.previous]) {
        if (!usable(old)) continue;
        try {
          await probe(old);
          save({ ...before, current: old, pending: null, receipt: { at: deps.now() } });
          diagnostic("Update failed (" + error.message + "); continuing with " + old.version + ".");
          return old;
        } catch {}
      }
      throw new Error("Installation failed; retry connecting. " + error.message);
    }
  }
  async function run(args) {
    const current = state();
    const active = current.current;
    if (!usable(active)) throw new Error("Agent installation is incomplete; reconnect to prepare it.");
    // A canceled connection must not leave a receipt that skips the next update check.
    if (current.receipt) { delete current.receipt; save(current); }
    const result = await deps.execute(process.execPath, [active.entry, "mcp", ...args,
      "--install-dir", active.binaryDir, "--profile", profile, "--server-base-url", server
    ], { env: { ...env, PATCHXNOTE_AGENT_REQUIRE_INSTALLED: "1" }, live: true });
    return result.code;
  }
  return { check, prepare, run, probe, directories, selectionFor, paths: { root, prefix, cache, stateFile }, readState: state };
}
async function main(argv = process.argv.slice(2)) {
  const [action, encodedOptions, ...args] = argv;
  const options = JSON.parse(Buffer.from(encodedOptions, "base64").toString("utf8"));
  const runtime = createRuntime(options);
  if (action === "check") console.log("workbuddy-ready=" + (await runtime.check() ? "1.0.0" : "0.0.0"));
  else if (action === "prepare") await runtime.prepare();
  else if (action === "run") process.exitCode = await runtime.run(args);
  else throw new Error("Unknown WorkBuddy bootstrap action");
}
module.exports = { createRuntime, execute, findNpmCLI, main };

