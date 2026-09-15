import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
const pkg = require('../packages/npm/package.json');
const server = JSON.parse(fs.readFileSync(path.join(root, 'server.json'), 'utf8'));
const { createInstallPlan } = require('../packages/npm/bin/patchxnote-agent.js');
const repository = new URL(pkg.repository.url.replace(/^git\+/, '').replace(/\.git$/, ''));
assert.equal(repository.hostname, 'github.com');
const [owner, repo] = repository.pathname.slice(1).split('/');
assert.equal(pkg.name, repo);
// Registry GitHub permissions and npm ownership use case-sensitive names.
const expectedName = `io.github.${owner}/${pkg.name}`;
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
if (process.env.GITHUB_REF?.startsWith('refs/tags/v')) {
  assert.equal(process.env.GITHUB_REF.slice('refs/tags/v'.length), pkg.version);
}
const targets = [];
for (const platform of ['darwin', 'linux', 'win32']) {
  for (const arch of ['x64', 'arm64']) {
    const plan = createInstallPlan('install', { platform, arch });
    assert.equal(plan.version, pkg.version);
    assert.ok(plan.asset_url.startsWith(`https://github.com/${owner}/${repo}/releases/download/v${pkg.version}/`));
    assert.ok(plan.asset_name.includes(`_${pkg.version}_`));
    targets.push(plan.asset_name);
  }
}

// Keep normal runtime/wrapper tests when those modules changed. Metadata releases
// validate their actual distribution fields without rerunning unrelated suites.
let base = null;
let changed = [];
try {
  base = execFileSync('git', ['describe', '--tags', '--match', 'v[0-9]*', '--abbrev=0', 'HEAD^'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  changed = execFileSync('git', ['diff', '--name-only', base, 'HEAD'], { cwd: root, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
} catch {
  // Without a comparison baseline, retain the existing full validation.
  base = null;
}
const runtimeChanged = !base || changed.some(file => /\.go$|^(cmd\/|internal\/|go\.(mod|sum)$|\.goreleaser\.yaml$)/.test(file));
const wrapperChanged = !base || changed.some(file => /^packages\/npm\/(bin\/|test\/)/.test(file));
if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `runtime_changed=${runtimeChanged}\nwrapper_changed=${wrapperChanged}\n`);
}
console.log(JSON.stringify({ name: expectedName, version: pkg.version, targets, base, runtimeChanged, wrapperChanged }, null, 2));
