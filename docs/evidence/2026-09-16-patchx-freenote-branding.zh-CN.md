# PatchX Freenote Agent 品牌兼容更新证据

日期：2026-09-16。候选版本：`0.2.15`。状态：本地相关验证通过，公开发行进行中。

## 范围与身份

- 展示品牌：`PatchX Freenote`；目标仓库：`ZsTs119/patchx-freenote-agent`。
- npm：`patchxnote-agent`；Skill：`patchxnote-mcp`；MCP Registry：`io.github.ZsTs119/patchxnote-agent`。
- CLI、制品名、配置／安装／凭据路径、OAuth 身份、服务地址及 Go module 保持原值。
- 公共发行基于 main `8cbc877742ad5475163ae145600e5b610821e05c`。WorkBuddy 分支只同步已有渠道材料，不合入其未发布功能。
- 原 GitHub repository ID：`1324845696`，node ID：`R_kgDOTveKgA`。

## 已完成的验证

| 检查 | 实际结果 |
| --- | --- |
| 发行身份与选测 | 正确组合、六平台旧制品名通过；错误包名、owner 大小写、MCP ID、版本、参数被拒绝；非品牌逻辑变化保留原门禁 |
| 安装器 | `node packages/npm/test/install.test.js` 通过 |
| Skill 副本 | canonical、npm、OpenAI、Claude 同步与校验通过；Skill／plugin metadata version 为 `0.1.2` |
| Go 相关测试 | `bash scripts/test-branding.sh` 通过；仅 CLI、callback、协议错误文案、渲染标题及本地别名相关现有用例 |
| 既有渠道包 | WorkBuddy、Codex、Claude Code、Coze 各 production／test 共 8 组合串行生成通过；生成后的机器身份、目录和服务地址与改名前一致 |
| npm 发布绑定 | 用户在 Chrome 保存新仓库绑定，回读见成功通知、新旧绑定并存；workflow 为 `publish-npm.yml`，environment 留空，允许直接发布；实际 OIDC 发布待验证 |
| 现有登录基线 | Windows default 凭据对应原测试地址；旧版在生产地址返回 `server_or_client_mismatch`，使用原测试地址返回 `authenticated=true`；原测试地址 `mcp status --verify` 通过；未更改本机配置 |
| GitHub 社交预览 | API 返回 `usesCustomOpenGraphImage=false`，没有需替换的自定义旧品牌图 |

## 双语图片

使用内置 `imagegen` 编辑原图，保留设备、配色、步骤和其他文案。四张结果均已目检品牌拼写与布局，写回以下 Agent 资源：

- `docs/assets/patchxnote-agent-cover.en.png`
- `docs/assets/patchxnote-agent-cover.zh-CN.png`
- `docs/assets/patchxnote-agent-quickstart.en.png`
- `docs/assets/patchxnote-agent-quickstart.zh-CN.png`

提示词要点：`text-localization`；品牌精确写为 `PatchX Freenote Agent`；英文封面标题改为 “Your PatchX Freenote records, connected to AI”，中文封面为“把 PatchX Freenote 记录／接入 AI 助手”；两张接入步骤图仅替换左上品牌胶囊文字，保持其余内容。

## 仓库改名与旧版本入口

原仓库已原地改名为 `ZsTs119/patchx-freenote-agent`，repository ID 不变。旧 `patchxnote-agent@0.2.14` tarball 在空安装目录中经旧 GitHub URL 下载成功，二进制 SHA256 为 `39d761ccaafb3f41818b9c8ac81227a1f39de2bf1e5d61d900b199ff36d71fab`，与改名前一致。旧仓库页面、raw 图片和 badge 的 HTTP 检查通过。

双语 README 的完整 AI 接入提示、命令一致性、10 张表格、9 组折叠内容、各 2 张图片及 41 个链接／锚点检查通过，GitHub GFM 渲染通过。

## 待补公开结果

- Git 提交／推送和 tag。
- GitHub Release、真实 tarball 预装、npm OIDC 与 latest 回读。
- 新旧实际安装、原目录升级、现有会话验证和协议差异比较。
- Registry 新版本、skills.sh 新来源详情／搜索、Chrome 页面验收。

上述项目以实际完成的 workflow、版本、链接和检查结果更新。当前未声称公开发行已完成。
