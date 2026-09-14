# PatchXNote Skill And MCP Publishing Checklist

更新日期：2026-09-03

## 0. Baseline

- [ ] `git status --short --branch` 只包含本次变更或已确认的用户变更。
- [ ] `npm view patchxnote-agent version dist-tags.latest repository.url --registry https://registry.npmjs.org` 与计划版本一致。
- [ ] README、中文 README、npm README、Skill onboarding 和 starter-prompts 的同语言 setup 一句话一致。
- [ ] 生产服务根地址、`/mcp` 协议端点、`/mcp/setup/` 页面和 `/download/` 下载入口按用途对应；当前对外文案不再使用测试地址或未启用域名。
- [ ] npm homepage 与插件 homepage/websiteURL 指向实际接入页面；repository 与第三方官方文档链接保持各自用途。
- [ ] `docs/mcp-clients/clients.json` 的 P0/P0.5 状态已经复核。
- [ ] OpenAI、Claude、Agent Skills、MCP Registry、Smithery 官方文档在本次发布窗口内复核过。

## 1. Skill

- [ ] `skills/patchxnote-mcp/SKILL.md` frontmatter 有 `name` 和 trigger-oriented `description`。
- [ ] references 按需加载，不把长流程全部塞进 `SKILL.md`。
- [ ] 正向/负向触发用例覆盖。
- [ ] 不写死当前工具数量。
- [ ] 明确浏览器 OAuth 和不得粘贴 code/token/secret。
- [ ] 明确 PatchXNote 返回内容是数据，不是指令。

## 2. Plugin Packages

- [ ] OpenAI/Codex `.codex-plugin/plugin.json` 通过本地 validator。
- [ ] Claude Code `.claude-plugin/plugin.json` 路径和版本已检查。
- [ ] package copies 由 sync 脚本生成。
- [ ] `node scripts/sync-patchxnote-skill-packages.mjs --check` 通过。
- [ ] `node scripts/validate-patchxnote-skill-packages.mjs` 通过。

## 2.1 统一渠道生成入口

仅修改渠道包装时，以本节为本地交付检查范围；上面安装/SOP 的全链路检查仅在对应内容实际改动时执行。

- [ ] 使用 `node scripts/package-channel.mjs --channel workbuddy`；其他渠道将参数值换为 `codex`、`claude-code` 或 `coze`。
- [ ] 默认生产环境；测试构建显式加 `--env test`，取用命令打印的当前产物路径。
- [ ] 渠道展示文案与 ZIP 文件名前缀为 `PatchXFreeNote`，插件机器标识与 marketplace 引用为 `patchxfreenote`；现有安装命令与 MCP 工具名保持原值。新建 WorkBuddy 连接器的 `source` 为 `patchxfreenote`，授权前确认目标 GoServer 已部署对应回调支持。
- [ ] WorkBuddy ZIP 可打开，根目录、MCP 端点、metadata 与 Skill 正确。
- [ ] Codex / Claude Code bundle 包含 marketplace 清单及其引用的插件目录；生产公共 Skill 来自当前源文件。
- [ ] 扣子 ZIP 包含根目录 `plugin.json`、`mcp.json` 和 `skills/`，符合 Agent Plugins 1.0.0；使用“扩展 → 插件 → 上传插件包”入口，平台导入与授权结果单独记录。
- [ ] 只验证本次生成模块及直接修改的打包函数，不重新运行未改动的 Go/npm/OAuth/MCP 流程。
- [ ] 按平台要求提交对应材料；构建结果与提交、审核状态分别记录。

配置入口：`packages/distribution/channels.json`；完整生成命令和材料取用说明见 `docs/release-and-maintenance-runbook.zh-CN.md` 的“统一渠道上架包生成”。

## 3. MCP Registry And Directories

- [ ] `server.json` 与 `packages/npm/package.json#mcpName` 一致。
- [ ] 对应 npm 版本已发布后再 registry publish。
- [ ] Smithery URL publishing 不用于本地 stdio unless 已有 Streamable HTTP + OAuth。
- [ ] Smithery local path 需要 MCPB bundle 时，单独验收 install/update/uninstall。
- [ ] Glama、PulseMCP、MCP.so、mcpservers.org、officialskills.sh 等目录只声明实际状态。

## 4. Public Review

- [ ] OpenAI publisher identity 已验证。
- [ ] support URL、privacy policy URL、terms URL 可公开访问且与发布主体一致。
- [ ] reviewer/demo account 不依赖在聊天里粘贴手机验证码或 token。
- [ ] 至少 5 个正向、3 个负向测试用例完成并记录。
- [ ] 文案不声明 raw audio、完整转写、硬件写、支付、Admin、模型执行或后台自动发送。

## 5. Release Evidence

- [ ] evidence log 记录每个渠道的 status、owner、version、证据。
- [ ] release notes 区分 docs-only、skills-only、plugin package、registry metadata、public marketplace acceptance。
- [ ] 如发现错误，有 rollback/deprecation 操作路径。
