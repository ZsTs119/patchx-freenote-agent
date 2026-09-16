# PatchX Freenote Coze Source Of Truth

Use this reference when links, package versions, connection settings, or publishing status matter.

## Package Connection

- Plugin version: `{{PACKAGE_VERSION}}`
- Environment: `{{ENVIRONMENT}}`
- API base URL: `{{API_BASE_URL}}`
- Remote MCP endpoint: `{{MCP_URL}}`
- Package format: Agent Plugins 1.0.0, with root `plugin.json`, `mcp.json`, and `skills/`.
- Remote transport value in this package: `streamable-http`.

Coze discovers the MCP connection from the package. Complete account authorization in Coze's connection UI/browser when prompted. Do not request credentials in chat or assume the plugin publisher's account is shared with users. Authentication remains client-managed; the portable manifest does not embed OAuth client credentials.

## Maintained Links

- Production setup page: `https://freenote.patch-x.cn/mcp/setup/`
- Repository: `https://github.com/ZsTs119/patchx-freenote-agent`
- npm package for separate local clients: `https://www.npmjs.com/package/patchxnote-agent`
- PatchX Freenote guide: `https://patchx2025.feishu.cn/wiki/PnVRwYT7IirFPckairGcWPnHnCd`
- Coze plugin import: `https://docs.coze.cn/create-plugin`
- Agent Plugins specification: `https://agent-plugins.org/specification`

## Publishing Evidence

This ZIP is for Coze's Extensions > Plugins > Upload plugin package entry. It is a Skill + Remote MCP capability plugin and does not include a Panel. The icon asset is included for selecting an icon in the platform UI; portable `plugin.json` has no icon field.

Local package validation does not prove Coze import, browser authorization, tool discovery, or marketplace approval. Record each result separately and only report actual tool-call evidence. Coze Programming's API/OpenAPI plugin creation is a separate entry and does not use this ZIP format.
