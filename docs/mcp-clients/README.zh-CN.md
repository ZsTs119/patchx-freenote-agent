# PatchX Freenote MCP 客户端登记表

这组文件是 PatchX Freenote MCP 官网、CLI `setup --client`、后续市场提交和平台联调共用的事实源。第一版先把本地可闭环和平台待闭环分开，避免把“能复制配置”误写成“已经一键安装验证通过”。

官网新会话和平台联调入口先读 `docs/mcp-local-remote-handoff.zh-CN.md`，再读本目录的客户端登记表和 `website/README.zh-CN.md`。官网相关页面架构、动作模型、官方依据、视觉系统、参考仓库、开写清单、验收 checklist 和素材说明都集中在 `website/` 目录。

## 状态口径

- `supported`：CLI 已能给出可执行安装路径，或能安全写入已验证格式的本地配置。
- `manual`：CLI 给出复制命令、配置片段和验证提示，但 V1 不自动写配置。
- `planned`：已确认方向，等待平台端、远程 MCP 网关或真实客户端验收。
- `research`：仅作为观察列表，还不能放进首版主路径。

`evidence_state` 比 `support_status` 更细，允许从 `researched` 逐步推进到 `implemented`、`locally_smoked`、`published_smoked`、`platform_accepted`。

## 本地闭环

`0.2.13` 已发布，统一了生产接入文案与链接；实际 npm 包 README/Skill 一致性、生产 stdio 读工具、Windows/macOS 安装和 Linux 制品验证通过。证据见 `docs/evidence/2026-09-11-release-0.2.13.zh-CN.md`。

`0.2.12` 已发布到 npm 和 GitHub Releases，生产 OAuth、发布包 stdio 读工具、Windows/macOS 安装和 Linux 制品验证均通过；本次状态见 `docs/evidence/2026-09-11-release-0.2.12.zh-CN.md`。下文保留历史版本的实际验收记录。

截至 `2026-09-04`，`patchxnote-agent@0.2.11` 已发布到 npm 和 GitHub Releases，并完成发布包 `skill install`、`mcp config`、Windows 安装、stdio MCP `tools/list/current-user/mobile memories` smoke；发布证据见 `docs/evidence/2026-09-04-release-0.2.11.zh-CN.md`。上一版 `patchxnote-agent@0.2.10` 已发布到 npm 和 GitHub Releases，发布包 `mcp config`、clean-profile `mcp status`、`setup --client cursor --dry-run --print-config`、Windows 安装、stdio MCP `tools/list/current-user/mobile memories` smoke 均已通过。`0.2.9` 曾完成发布包 install、`mcp config`、clean-profile `mcp status`、`setup --client cursor --dry-run --print-config`、Windows 安装、Linux checksum、macOS 安装/MCP smoke。`0.2.8` 本地候选曾通过 Windows-native 通用链路验收：浏览器 OAuth 自动打开、GoServer 页面登录、Windows 凭据保存、`mcp status --verify`、stdio `initialize/tools/list/current-user`、mobile 总结记录和 model-IO 字段读取、以及 npm wrapper `--from-local` 候选安装代理。历史证据见 `docs/evidence/2026-09-04-release-0.2.10.zh-CN.md`、`docs/evidence/2026-09-01-release-0.2.9.zh-CN.md` 和 `docs/evidence/2026-08-27-mcp-oauth-local-acceptance.zh-CN.md`。

Fresh registry 包浏览器 OAuth 登录仍是单独验收项：`0.2.11` 已完成发布包可安装、可启动、已登录环境 stdio MCP smoke，但不要把它写成“每个编辑器或平台都已完成真实授权验收”。`0.2.9` 本地源码候选登录闭环曾通过。

这个结论只代表“通用本地 stdio MCP 链路可用”。VS Code、Cursor、Codex、Claude Desktop、Claude Code、Windsurf、Trae、Qoder、WorkBuddy 等每个客户端自己的 UI/配置写入/刷新流程，还需要在发布候选包或 registry 包上分别验收后，才能把对应客户端标记为 `locally_smoked` 或 `published_smoked`。

本地客户端第一步统一执行浏览器 OAuth 登录：

```sh
npx -y patchxnote-agent@latest mcp login
```

然后使用无密钥 stdio 配置：

```json
{
  "mcpServers": {
    "patchxnote": {
      "command": "npx",
      "args": ["-y", "patchxnote-agent@latest", "mcp", "serve"]
    }
  }
}
```

`setup --client <id>` 会复用同一套 `mcp login`。编辑器启动 `mcp serve` 时不会自动弹浏览器，避免 MCP Host 启动超时。令牌只存 OS 原生安全存储。官网、编辑器配置、MCP JSON/TOML 都不能出现手机号、验证码、access token、refresh token、webhook secret、录音原文、完整转写或模型 provider 原始响应。

关键要求：在哪个运行时启动 MCP，就在哪个运行时执行登录和 setup。Windows 桌面编辑器、WSL 终端、VS Code Remote、Dev Container、远端 Linux 主机不能默认共享同一个本机安全存储。

## 平台闭环

### WorkBuddy 0.1.6 候选（2026-11-16）

平台展示名称为 **Freenote**，中英文名称一致；使用 `Freenote-workbuddy-connector-0.1.6.zip` 上传，连接器身份保持不变。

source 仍为 `patchxfreenote`，远程 MCP / 平台 OAuth 配置与现有 PNG 图标保持。新版示例聚焦账号状态和额度、最近记录或总结、可读总结转 Markdown 笔记；核心工具顺序和输出要求已写入主 Skill，记录默认按账号查询并保留来源。

当前仅完成本地候选：9 项 WorkBuddy 包定向检查和生产/测试 ZIP 内容核对通过，0.1.4/0.1.5 旧产物保留。用户需在平台完成本候选真实 OAuth，用有可读总结的账号验证三个示例和重连，再接续质量评测；尚未标记 `platform_accepted`。详见 [0.1.6 质量评测接续计划](../plans/2026-11-16-workbuddy-quality-resubmission-checklist.md)。npm latest 按约定保持 0.2.16，本次没有标签写操作。

下文保留历史记录：0.1.4 已由用户提交，后因沙箱质量评测未达标被驳回，具体失败日志尚未取得；此前“无需授权”的初始化自测不能作为平台 OAuth 完成的证据。

### WorkBuddy 0.1.4 候选（2026-11-13）

连接器 `source=patchxfreenote` 使用远程 `streamableHttp` + `server-side` / `mcp_oauth`，由 WorkBuddy 云端动态注册并管理授权凭据。用户从平台连接入口登录，Windows/macOS 无需本地 Node、npm 或 Go 程序。原本本地登录的用户更新后可能需重新授权一次。

当前证据：生产/测试 ZIP 与 7 项包生成/校验定向测试通过；生产 OAuth 资源和授权服务器 metadata 返回 200，未授权工具调用返回 401 并提供资源发现地址。公开初始化可用不等于用户已授权。平台上传解析、新授权、真实工具调用、令牌刷新和两端实测仍待用户验证，尚未标记为 `platform_accepted`。产物与后续结果见[远程 MCP 与平台 OAuth 计划](../plans/2026-11-13-workbuddy-remote-mcp-platform-oauth-checklist.md)。

旧 0.1.3 混合包的本机运行证据不代表平台可接受，该包已被上传解析器拒绝。npm `latest=0.2.16`、`next=0.2.18` 保持；此远程候选不依赖 npm 标签。

### 其他平台与通用入口

飞书 Aily / 豆包工作伙伴、腾讯 Agent 平台、企业版 WorkBuddy 这类平台通常不能运行用户本机的 `npx`，所以它们走远程 MCP 网关：

```text
https://freenote.patch-x.cn/mcp
```

远程 MCP 的目标是和本地 Agent MCP 使用同一套 curated 工具语义，当前生产服务端 `/mcp` 已按 19 个 V1 工具暴露；平台控制台最终可用范围还要以平台权限、OAuth 授权和真实验收为准。官网文案不要把平台型客户端写成“本地一键安装”，只写“远程 MCP 待验收”。

## 维护规则

- 新客户端先进入 registry，再进入官网和 CLI。
- 未经真实客户端验证，不把 `website_buttons` 写成一键安装。
- 自动写配置前必须有确认、备份、回滚路径和 fixture 测试。
- 官方文档链接需要按发布日期重新审查；本文件最后审查日期是 `2026-08-28`。
- 客户端 Logo、名称和商标使用在公开官网发布前单独确认授权或使用规范。
