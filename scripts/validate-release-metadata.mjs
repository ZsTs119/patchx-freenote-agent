import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
const pkg = require('../packages/npm/package.json');
const server = JSON.parse(fs.readFileSync(path.join(root, 'server.json'), 'utf8'));
const { createInstallPlan } = require('../packages/npm/bin/patchxnote-agent.js');

const expectedName = 'io.github.ZsTs119/patchxnote-agent';
export function validateMetadata(pkg, server, createInstallPlan, ref = '') {
  const repository = new URL(pkg.repository.url.replace(/^git\+/, '').replace(/\.git$/, ''));
  assert.equal(repository.href, 'https://github.com/ZsTs119/patchx-freenote-agent');
  const [owner, repo] = repository.pathname.slice(1).split('/');
  // Distribution identities remain independent of the renamed source repository.
  assert.equal(pkg.name, 'patchxnote-agent');
  assert.equal(pkg.mcpName, expectedName, 'npm mcpName must preserve GitHub owner casing');
  assert.equal(server.name, expectedName);
  assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
  assert.equal(server.version, pkg.version);
  assert.ok(server.description.length > 0 && server.description.length <= 100);
  assert.equal(server.repository.url, `https://github.com/${owner}/${repo}`);
  assert.equal(server.packages.length, 1);
  const entry = server.packages[0];
  assert.equal(entry.registryType, 'npm');
  assert.equal(entry.identifier, pkg.name);
  assert.equal(entry.version, pkg.version);
  assert.equal(entry.transport.type, 'stdio');
  assert.deepEqual(entry.packageArguments.map(arg => [arg.type, arg.value]), [
    ['positional', 'mcp'], ['positional', 'serve']
  ]);
  if (ref.startsWith('refs/tags/v')) {
    assert.equal(ref.slice('refs/tags/v'.length), pkg.version);
  }
  const targets = [];
  for (const platform of ['darwin', 'linux', 'win32']) {
    for (const arch of ['x64', 'arm64']) {
      const plan = createInstallPlan('install', { platform, arch });
      assert.equal(plan.version, pkg.version);
      const os = platform === 'win32' ? 'windows' : platform;
      const cpu = arch === 'x64' ? 'amd64' : arch;
      const asset = `patchxnote_${pkg.version}_${os}_${cpu}${platform === 'win32' ? '.exe' : ''}`;
      assert.equal(plan.asset_name, asset);
      assert.equal(plan.asset_url, `https://github.com/${owner}/${repo}/releases/download/v${pkg.version}/${asset}`);
      targets.push(plan.asset_name);
    }
  }
  return targets;
}

// Only reviewed display-copy files qualify. Any additional runtime file or
// non-brand edit retains the normal test gate, including config/keychain paths.
const brandingFiles = new Set([
  'internal/cli/auth_status.go', 'internal/cli/login.go', 'internal/cli/logout.go',
  'internal/cli/mcp.go', 'internal/cli/mcp_login.go', 'internal/cli/model_io.go',
  'internal/cli/root.go', 'internal/cli/setup.go', 'internal/cli/setup_test.go',
  'internal/cli/version.go', 'internal/cli/webhook.go',
  'internal/mcp/errors.go', 'internal/mcp/model_io_tools.go', 'internal/mcp/server.go',
  'internal/mcp/tools.go', 'internal/mcp/webhook_tools.go',
  'internal/oauthflow/callback.go', 'internal/oauthflow/oauthflow_test.go',
  'internal/remotemcp/proxy.go', 'internal/renderdoc/markdown.go',
  'internal/renderdoc/templates.go', 'internal/webhook/files.go', 'internal/webhook/payload.go'
]);

export function selectTests(base, changed, readBase, readCurrent) {
  const runtime = changed.filter(file => /\.go$|^(cmd\/|internal\/|go\.(mod|sum)$|\.goreleaser\.yaml$)/.test(file));
  const runtimeChanged = !base || runtime.length > 0;
  const runtimeBrandingOnly = !!base && runtime.length > 0 && runtime.every(file => {
    if (!brandingFiles.has(file)) return false;
    try {
      const before = readBase(file).replaceAll('\r\n', '\n');
      const after = readCurrent(file).replaceAll('\r\n', '\n');
      return before !== after && before.replace(/\bPatchXNote\b/g, 'PatchX Freenote') === after;
    } catch { return false; }
  });
  const wrapperChanged = !base || changed.some(file => /^packages\/npm\/(bin\/|test\/)/.test(file));
  return { runtimeChanged, runtimeBrandingOnly, wrapperChanged };
}

function main() {
  const targets = validateMetadata(pkg, server, createInstallPlan, process.env.GITHUB_REF);

  // Keep normal runtime/wrapper tests when those modules changed. Metadata releases
  // validate their actual distribution fields without rerunning unrelated suites.
  let base = null;
  let changed = [];
  try {
    base = execFileSync('git', ['describe', '--tags', '--match', 'v[0-9]*', '--abbrev=0', 'HEAD^'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    // Include local edits in preflight; clean CI compares the same release content.
    changed = execFileSync('git', ['diff', '--name-only', base], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim().split('\n').filter(Boolean);
  } catch {
    // Without a comparison baseline, retain the existing full validation.
    base = null;
  }
  const selected = selectTests(base, changed,
    file => execFileSync('git', ['show', `${base}:${file}`], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }),
    file => fs.readFileSync(path.join(root, file), 'utf8'));
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `runtime_changed=${selected.runtimeChanged}\nruntime_branding_only=${selected.runtimeBrandingOnly}\nwrapper_changed=${selected.wrapperChanged}\n`);
  }
  console.log(JSON.stringify({ name: expectedName, version: pkg.version, targets, base, ...selected }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
