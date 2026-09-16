import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { validateMetadata, selectTests } from './validate-release-metadata.mjs';

const require = createRequire(import.meta.url);
const pkg = require('../packages/npm/package.json');
const server = JSON.parse(fs.readFileSync(new URL('../server.json', import.meta.url), 'utf8'));
const { createInstallPlan } = require('../packages/npm/bin/patchxnote-agent.js');
assert.equal(validateMetadata(pkg, server, createInstallPlan).length, 6);
for (const change of [
  p => { p.name = 'patchx-freenote-agent'; },
  p => { p.mcpName = 'io.github.zsts119/patchxnote-agent'; },
  p => { p.mcpName = 'io.github.ZsTs119/patchx-freenote-agent'; },
  p => { p.repository.url = p.repository.url.replace('ZsTs119', 'zsts119'); },
  p => { p.version = '0.0.1'; }
]) {
  const modified = structuredClone(pkg); change(modified);
  assert.throws(() => validateMetadata(modified, server, createInstallPlan));
}
for (const change of [
  s => { s.name = 'io.github.ZsTs119/patchx-freenote-agent'; },
  s => { s.packages[0].identifier = 'patchx-freenote-agent'; },
  s => { s.packages[0].version = '0.0.1'; },
  s => { s.packages[0].packageArguments.pop(); }
]) {
  const modified = structuredClone(server); change(modified);
  assert.throws(() => validateMetadata(pkg, modified, createInstallPlan));
}
assert.throws(() => validateMetadata(pkg, server, createInstallPlan, 'refs/tags/v0.0.1'));
assert.throws(() => validateMetadata(pkg, server, (...args) => ({ ...createInstallPlan(...args), asset_name: 'renamed-binary' })));
const before = 'Short: "PatchXNote Agent", enabled: false';
const after = 'Short: "PatchX Freenote Agent", enabled: false';
assert.equal(selectTests('v0.2.14', ['internal/cli/root.go'], () => before, () => after).runtimeBrandingOnly, true);
assert.equal(selectTests('v0.2.14', ['internal/cli/root.go'], () => before, () => after.replace('false', 'true')).runtimeBrandingOnly, false);
assert.equal(selectTests('v0.2.14', ['internal/config/paths.go'], () => before, () => after).runtimeBrandingOnly, false);
assert.equal(selectTests('v0.2.14', ['go.mod'], () => before, () => after).runtimeBrandingOnly, false);
assert.equal(selectTests(null, [], () => before, () => after).runtimeChanged, true);
assert.equal(selectTests('v0.2.14', ['README.md'], () => before, () => after).runtimeChanged, false);
assert.equal(selectTests('v0.2.14', ['packages/npm/bin/patchxnote-agent.js'], () => before, () => after).wrapperChanged, true);
console.log('Release identity and affected-test selection checks passed.');
