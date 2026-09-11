# PatchXNote MCP Starter Prompts

Use these prompts for README examples, marketplace submissions, local plugin cards, and review test cases.

## Primary Setup

```text
请帮我接入 PatchXNote MCP，并在客户端支持 Agent Skills 时安装 PatchXNote MCP Skill。请使用生产服务地址 https://freenote.patch-x.cn/，接入页面为 https://freenote.patch-x.cn/mcp/setup/；如现有配置显式指定了旧测试地址，请先将本次接入使用的服务地址调整为上述生产地址。首先，如果当前是支持本地命令执行的环境，请在本机执行 npx -y patchxnote-agent@latest skill install，让后续新会话或长上下文能记住 PatchXNote SOP；如果当前客户端不支持 Skill 安装，不要判定为不能接入，请继续按客户端能力完成 MCP 接入。请识别你所在的 MCP 客户端：如果是 Codex、Cursor、VS Code、Claude Desktop、Claude Code、Windsurf 等本地 MCP 客户端，请在当前本机、并且在后续会启动 MCP 服务的同一个运行时执行 npx -y patchxnote-agent@latest setup --client <client-id>；如果是不支持本机命令但支持 Remote MCP、自定义连接器、自定义 MCP 服务或工具插件的 AI 客户端/云平台，请创建名为 PatchXNote MCP 的自定义 MCP 连接器，并使用这个 PatchXNote Remote MCP URL 完成接入：https://freenote.patch-x.cn/mcp。如果不确定客户端 ID 或配置格式，本地客户端先执行 npx -y patchxnote-agent@latest mcp config 并使用打印出的通用 stdio 配置，远程客户端则优先寻找 Remote MCP Server URL / MCP Server URL / Custom Connector 配置入口。登录时请打开浏览器让我完成 PatchXNote 手机号验证码授权，不要让我把验证码、OAuth code、授权码、access token、refresh token 或 webhook secret 粘贴到聊天里。完成后请调用 patchxnote_get_current_user 和 patchxnote_list_memories，参数 {"platform":"mobile","limit":5} 验证可用。参考资料：https://github.com/ZsTs119/patchxnote-agent 和 https://patchx2025.feishu.cn/wiki/PnVRwYT7IirFPckairGcWPnHnCd。
```

```text
Help me connect PatchXNote MCP and install the PatchXNote MCP Skill when the client supports Agent Skills. Use the production service at https://freenote.patch-x.cn/ and the setup page at https://freenote.patch-x.cn/mcp/setup/; if existing configuration explicitly points to the old test service, update the server address used for this connection to production first. First, if this is a local command-capable environment, run npx -y patchxnote-agent@latest skill install on this machine so future or long sessions remember the PatchXNote SOP; if the current client does not support Skill installation, do not treat that as a connection blocker and continue with MCP setup according to the client's capabilities. Identify the MCP client you are running in: if this is a local MCP client such as Codex, Cursor, VS Code, Claude Desktop, Claude Code, or Windsurf, run npx -y patchxnote-agent@latest setup --client <client-id> on this machine in the same OS/runtime that will later launch the MCP server. If this is an AI client or cloud platform that cannot run local commands but supports Remote MCP, custom connectors, custom MCP services, or tool plugins, create a custom MCP connector named PatchXNote MCP and connect it with this PatchXNote Remote MCP URL: https://freenote.patch-x.cn/mcp. If you are not sure which client ID or config format to use, local clients should first run npx -y patchxnote-agent@latest mcp config and use the printed generic stdio config, while remote clients should look for a Remote MCP Server URL, MCP Server URL, or Custom Connector setup entry. For login, open the browser and let me complete PatchXNote phone-code authorization there; do not ask me to paste OTP codes, OAuth codes, authorization codes, access tokens, refresh tokens, or webhook secrets into chat. After setup, call patchxnote_get_current_user and patchxnote_list_memories with {"platform":"mobile","limit":5} to verify it works. References: https://github.com/ZsTs119/patchxnote-agent and https://patchx2025.feishu.cn/wiki/PnVRwYT7IirFPckairGcWPnHnCd
```

## Verification

```text
请检查当前 PatchXNote MCP 是否已经登录，并调用 patchxnote_get_current_user 验证。
```

```text
List my latest 5 PatchXNote mobile summaries.
```

```text
检查当前 PatchXNote MCP 有多少工具，并说明哪些工具是读取账号/记录，哪些工具会产生本地 webhook 或发送副作用。
```

## Workflow

```text
把这条 PatchXNote 总结整理成 Markdown 草稿，我确认后再发。
```

```text
帮我按 mobile 平台统计 PatchXNote event_summary 和 daily_digest，各自有多少条。
```

```text
帮我排查为什么 Cursor 里 PatchXNote MCP 登录了但 tools/list 还是不可用。
```

## Negative Prompts

These should not activate PatchXNote-specific behavior unless PatchXNote is explicitly mentioned:

```text
Summarize this article.
```

```text
Create a generic MCP server for my SaaS dashboard.
```

```text
Publish my unrelated skill to a marketplace.
```
