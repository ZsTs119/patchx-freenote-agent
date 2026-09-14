# PatchXNote WorkBuddy Source Of Truth

Use this reference when links, versions, endpoint claims, or publishing status matter.

## PatchXNote Links

- GitHub repository: `https://github.com/ZsTs119/patchxnote-agent`
- npm package: `https://www.npmjs.com/package/patchxnote-agent`
- Feishu public guide: `https://patchx2025.feishu.cn/wiki/PnVRwYT7IirFPckairGcWPnHnCd`

## WorkBuddy Links

- Connector docs: `https://open.workbuddy.cn/docs/connector`

## WorkBuddy Package

- Connector package version: `{{PACKAGE_VERSION}}`
- Source: `{{CONNECTOR_SOURCE}}`
- Transport: `streamableHttp`
- Environment: `{{ENVIRONMENT}}`
- MCP URL: `{{MCP_URL}}`
- Package source directory: `packages/workbuddy/patchxnote-agent/`

The selected endpoint identifies this package's environment. Package generation does not establish marketplace acceptance.

## Status Rules

- npm package publication does not prove WorkBuddy marketplace acceptance.
- Local stdio MCP smoke does not prove WorkBuddy remote MCP auth acceptance.
- WorkBuddy zip upload does not prove browser auth, `tools/list`, or tool-call success.
- Claim `platform_accepted` only after the actual WorkBuddy connector has uploaded, parsed, authenticated, listed tools, and completed at least one safe real PatchXNote tool call.
