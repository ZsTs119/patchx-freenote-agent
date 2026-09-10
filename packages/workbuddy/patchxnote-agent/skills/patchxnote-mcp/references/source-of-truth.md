# PatchXNote WorkBuddy Source Of Truth

Use this reference when links, versions, endpoint claims, or publishing status matter.

## PatchXNote Links

- GitHub repository: `https://github.com/ZsTs119/patchxnote-agent`
- npm package: `https://www.npmjs.com/package/patchxnote-agent`
- Feishu public guide: `https://patchx2025.feishu.cn/wiki/PnVRwYT7IirFPckairGcWPnHnCd`

## WorkBuddy Links

- Connector docs: `https://open.workbuddy.cn/docs/connector`

## Current WorkBuddy Draft

- Connector package version: `0.1.0`
- Source: `patchxnote-agent`
- Transport: `streamableHttp`
- Test MCP URL: `https://ws-lab.patch-x.cn/patchnote-test-api/mcp`
- Package source directory: `packages/workbuddy/patchxnote-agent/`

The test MCP URL is for first upload and review. Do not describe it as production marketplace acceptance.

## Status Rules

- npm package publication does not prove WorkBuddy marketplace acceptance.
- Local stdio MCP smoke does not prove WorkBuddy remote MCP auth acceptance.
- WorkBuddy zip upload does not prove browser auth, `tools/list`, or tool-call success.
- Claim `platform_accepted` only after the actual WorkBuddy connector has uploaded, parsed, authenticated, listed tools, and completed at least one safe real PatchXNote tool call.
