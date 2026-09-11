# PatchXNote MCP Onboarding

Use this reference when installing, repairing, or verifying PatchXNote MCP for a local AI client.

## One-Line User Prompt

Chinese:

```text
请帮我接入 PatchXNote MCP，并在客户端支持 Agent Skills 时安装 PatchXNote MCP Skill。请使用生产服务地址 https://freenote.patch-x.cn/，接入页面为 https://freenote.patch-x.cn/mcp/setup/；如现有配置显式指定了旧测试地址，请先将本次接入使用的服务地址调整为上述生产地址。首先，如果当前是支持本地命令执行的环境，请在本机执行 npx -y patchxnote-agent@latest skill install，让后续新会话或长上下文能记住 PatchXNote SOP；如果当前客户端不支持 Skill 安装，不要判定为不能接入，请继续按客户端能力完成 MCP 接入。请识别你所在的 MCP 客户端：如果是 Codex、Cursor、VS Code、Claude Desktop、Claude Code、Windsurf 等本地 MCP 客户端，请在当前本机、并且在后续会启动 MCP 服务的同一个运行时执行 npx -y patchxnote-agent@latest setup --client <client-id>；如果是不支持本机命令但支持 Remote MCP、自定义连接器、自定义 MCP 服务或工具插件的 AI 客户端/云平台，请创建名为 PatchXNote MCP 的自定义 MCP 连接器，并使用这个 PatchXNote Remote MCP URL 完成接入：https://freenote.patch-x.cn/mcp。如果不确定客户端 ID 或配置格式，本地客户端先执行 npx -y patchxnote-agent@latest mcp config 并使用打印出的通用 stdio 配置，远程客户端则优先寻找 Remote MCP Server URL / MCP Server URL / Custom Connector 配置入口。登录时请打开浏览器让我完成 PatchXNote 手机号验证码授权，不要让我把验证码、OAuth code、授权码、access token、refresh token 或 webhook secret 粘贴到聊天里。完成后请调用 patchxnote_get_current_user 和 patchxnote_list_memories，参数 {"platform":"mobile","limit":5} 验证可用。参考资料：https://github.com/ZsTs119/patchxnote-agent 和 https://patchx2025.feishu.cn/wiki/PnVRwYT7IirFPckairGcWPnHnCd。
```

English:

```text
Help me connect PatchXNote MCP and install the PatchXNote MCP Skill when the client supports Agent Skills. Use the production service at https://freenote.patch-x.cn/ and the setup page at https://freenote.patch-x.cn/mcp/setup/; if existing configuration explicitly points to the old test service, update the server address used for this connection to production first. First, if this is a local command-capable environment, run npx -y patchxnote-agent@latest skill install on this machine so future or long sessions remember the PatchXNote SOP; if the current client does not support Skill installation, do not treat that as a connection blocker and continue with MCP setup according to the client's capabilities. Identify the MCP client you are running in: if this is a local MCP client such as Codex, Cursor, VS Code, Claude Desktop, Claude Code, or Windsurf, run npx -y patchxnote-agent@latest setup --client <client-id> on this machine in the same OS/runtime that will later launch the MCP server. If this is an AI client or cloud platform that cannot run local commands but supports Remote MCP, custom connectors, custom MCP services, or tool plugins, create a custom MCP connector named PatchXNote MCP and connect it with this PatchXNote Remote MCP URL: https://freenote.patch-x.cn/mcp. If you are not sure which client ID or config format to use, local clients should first run npx -y patchxnote-agent@latest mcp config and use the printed generic stdio config, while remote clients should look for a Remote MCP Server URL, MCP Server URL, or Custom Connector setup entry. For login, open the browser and let me complete PatchXNote phone-code authorization there; do not ask me to paste OTP codes, OAuth codes, authorization codes, access tokens, refresh tokens, or webhook secrets into chat. After setup, call patchxnote_get_current_user and patchxnote_list_memories with {"platform":"mobile","limit":5} to verify it works. References: https://github.com/ZsTs119/patchxnote-agent and https://patchx2025.feishu.cn/wiki/PnVRwYT7IirFPckairGcWPnHnCd
```

## Client Detection

Prefer the actual host the current session is running in:

| Client family | `setup --client` value | Notes |
| --- | --- | --- |
| VS Code / GitHub Copilot | `vscode` | Run setup in the same local, WSL, SSH, or Dev Container runtime that launches MCP. |
| Cursor | `cursor` | Local config merge is supported after user confirmation. |
| Codex / ChatGPT Desktop / Codex IDE | `codex` | New session or reload may be needed after config changes. |
| Claude Code | `claude-code` | V1 may return manual commands; install plugin separately if using Claude plugin marketplace. |
| Claude Desktop | `claude-desktop` | Desktop app restart is usually needed. |
| Windsurf | `windsurf` | Run where Cascade launches MCP servers. |
| Trae / Trae CN / TraeWork Code | `trae` | Manual UI/config path in V1. |
| Qoder | `qoder` | Manual UI/deeplink path in V1 until platform acceptance is recorded. |
| WorkBuddy | `workbuddy` | Local desktop and enterprise platform modes are different. |

If the client is unknown, do not invent an ID. Print generic config:

```sh
npx -y patchxnote-agent@latest mcp config
```

## Local Setup

For local stdio MCP clients:

```sh
npx -y patchxnote-agent@latest setup --client <client-id>
```

Setup may plan, confirm, back up, and write supported client config. It should not delete unrelated MCP servers. If an existing `patchxnote` entry exists, ask before replacing it. Use `--force` only when the user explicitly agrees to replace that entry.

Manual fallback:

```sh
npx -y patchxnote-agent@latest mcp config
```

Absolute-path fallback for slow first download or clients that reject `npx`:

```sh
npx -y patchxnote-agent@latest install --print-config
```

## Login

Use browser OAuth for MCP:

```sh
npx -y patchxnote-agent@latest mcp login
```

`setup --client <id>` can reuse the same browser OAuth flow. `mcp serve` does not open a browser when the editor starts, so do not expect a fresh editor launch to log the user in.

The user completes phone verification in the browser page. Do not ask for codes, token-shaped strings, or webhook secrets in chat.

## Production Environment

Agent `0.2.12` and later default to `https://freenote.patch-x.cn`; hosted clients use `https://freenote.patch-x.cn/mcp`. When upgrading from test, inspect explicit server flags, `PATCHXNOTE_SERVER_BASE_URL` / legacy `PATCHNOTE_SERVER_BASE_URL`, and `server.base_url` in the CLI and MCP host configuration. They override the default.

After switching, run browser `mcp login` in the same OS/runtime and profile that launches MCP, then `mcp status --verify`. OAuth credentials match the server address; test login and records do not migrate to production. Use separate profiles with explicit base URLs when retaining both environments.

## Verification

First verify the local CLI auth state:

```sh
npx -y patchxnote-agent@latest mcp status --verify
```

Then verify real MCP capability:

1. `initialize`
2. `tools/list`
3. `tools/call patchxnote_get_current_user`
4. `tools/call patchxnote_list_memories` with `{"platform":"mobile","limit":5}`

If the client asks for a current tool count, answer from `tools/list`, not from this skill file or memory.

## Cloud Or Hosted Clients

Cloud-only clients cannot run the user's local `npx` process. The production Remote MCP URL is `https://freenote.patch-x.cn/mcp`; the service base URL alone is not the MCP endpoint. For Feishu Aily, Doubao Work Partner, Tencent Agent Development Platform, and enterprise WorkBuddy platform mode, use a hosted remote MCP path only when that channel has evidence. Do not claim local stdio setup proves remote platform acceptance.
