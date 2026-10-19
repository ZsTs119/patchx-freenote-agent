# PatchX Freenote Agent 品牌兼容更新证据

日期：2026-09-16。发行版本：`0.2.15`。状态：品牌、发行、目录及相关兼容验收通过；旧 npm 发布绑定清理等待维护者安全密钥验证。

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
| npm 发布绑定 | 用户在 Chrome 保存新仓库绑定，回读见成功通知、新旧绑定并存；workflow 为 `publish-npm.yml`，environment 留空，允许直接发布；实际 OIDC 发布成功，来源证明对应新仓库／本次提交 |
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

## 公开发行与安装结果

| 项目 | 结果／证据 |
| --- | --- |
| 发行提交／tag | `e05f3c096700b07151b79c0c1114306397b357bb`，`v0.2.15`；main 与 tag 在发行时指向同一已验证提交 |
| GitHub Release | [v0.2.15](https://github.com/ZsTs119/patchx-freenote-agent/releases/tag/v0.2.15)，[工作流 35052300464](https://github.com/ZsTs119/patchx-freenote-agent/actions/runs/35052300464) 成功 |
| 资产来源 | 六个平台二进制及 checksums 全部通过 SHA256 与 attestation；验证明确绑定新仓库、release.yml、v0.2.15 和发行提交 |
| npm | [patchxnote-agent@0.2.15](https://www.npmjs.com/package/patchxnote-agent/v/0.2.15)，[OIDC 工作流 35053146805](https://github.com/ZsTs119/patchx-freenote-agent/actions/runs/35053146805) 成功，latest=0.2.15 |
| npm 真实包 | 官方 tarball SHA512 与 integrity 相符，9 个文件的内容散列与预装包完全一致；provenance 的 repository ID、仓库 URL、workflow 和源码提交均对应本次发行 |
| 用户安装入口 | 官方 npm 的 `patchxnote-agent@latest install` 在空目录安装0.2.15成功；旧0.2.14固定安装继续可用 |
| 原路径升级 | 隔离目录0.2.14→0.2.15升级成功；Windows二进制SHA256=`b29590606d0c23c0bbc01864c75c1df318bf6f71044539734fd81de460487367` |
| MCP／凭据 | 原配置文件散列及 `mcp config` JSON不变；原测试环境会话 `mcp status --verify` 成功，无需重新登录；本地／远端各19个工具的名称、schema与初始化身份保持兼容，只有本地展示文案与版本更新 |
| npm托管Skill | 原 `.agents/skills/patchxnote-mcp` 更新成功，marker身份不变，6文件完整，无重复Skill目录 |
| skills CLI新来源 | 官方CLI 1.5.18从新仓库安装成功，锁文件记录新来源与原slug，6文件与canonical逐字节相同 |
| skills CLI旧来源 | `skills update patchxnote-mcp --project --yes` 原位更新成功，旧来源锁文件保留，computedHash更新，6文件与新版一致，无重复目录 |
| 已有渠道分支 | 品牌材料提交 `80c07ca5b1b95b903cbab537cc260be4cf41b249` 已推送 `codex/workbuddy-connector-package`；其额外功能未合入main |

本轮仅运行改名计划相关的检查。六平台均完成构建、资产散列和签名验证；本次未重跑macOS实际安装或任何App／GoServer／硬件业务回归。已有macOS smoke默认0.2.6不作为本次新版验收。

### 外部同步与本机网络记录

- npm发布工作流先成功，公开Registry短时仍返回0.2.14；等待同步后，指定版本、latest、真实tarball和实际latest安装均完成回读。未重复发布。
- Registry发布接口已接受0.2.15，最初搜索缓存未更新；随后固定版本、latest和搜索回读通过。未再次创建条目。
- Skill第一次Windows拉取被中止，WSL短超时尝试未完成；最终仅对本次调用启用Git HTTP/1.1后，新来源安装成功。未改变全局Git设置；额外旧来源回归关闭telemetry。
- 中止的npm安装留下本次临时目录的空锁；确认无对应进程后移除，再在空目录完成公开latest安装。未更改安装器锁逻辑。
- 旧来源Skill更新有“无法检查已删除Skill”的CLI提示，但选定Skill更新、文件内容与锁文件验证均通过；没有把该提示写成全链路无警告。

## 目录与可用于展示的链接

| 渠道 | 当前可用入口 | 实际发现结果 |
| --- | --- | --- |
| GitHub | [PatchX Freenote Agent](https://github.com/ZsTs119/patchx-freenote-agent) | 仓库新名称、About、双语README、四张当前图片可见；旧仓库URL仍重定向 |
| npm | [patchxnote-agent](https://www.npmjs.com/package/patchxnote-agent) | 原包名，0.2.15，新品牌正文与新仓库provenance |
| MCP官方Registry | [搜索 patchxnote](https://registry.modelcontextprotocol.io/?q=patchxnote) · [0.2.15详情](https://registry.modelcontextprotocol.io/v0.1/servers/io.github.ZsTs119%2Fpatchxnote-agent/versions/0.2.15) | 原ID active/latest，标题为PatchX Freenote Agent；品牌全称搜索目前不命中，使用保留ID搜索 |
| skills.sh | [新来源详情](https://skills.sh/zsts119/patchx-freenote-agent/patchxnote-mcp) · [品牌搜索](https://skills.sh/?q=PatchX+Freenote) | 新来源和新品牌正文可见；`PatchX Freenote`与`patchx-freenote`搜索均命中 |

旧skills.sh来源页面仍能访问，但保留旧正文并作为单独条目展示；未观察到自动跳转，也不声称安装统计已合并。当前展示材料采用新来源详情。平台安装数包含验证行为，不用作外部用户数证明。页面收录和可安装不等于平台推荐或安全认证；新来源页另有Socket／Snyk的WARN标签，本次没有扩大到第三方审计整改。

Chrome扩展已实际核对GitHub中英文README、npm、MCP Registry与skills.sh页面，并在任务中记录截图。API／文件检查和浏览器验收分别完成。

## 仍待账号操作的收尾

新版OIDC绑定已验证可发布。删除旧 `ZsTs119/patchxnote-agent` Trusted Publisher时，npm要求安全密钥／通行密钥验证，已交接维护者；该旧绑定清理尚未宣称完成。新版发行、安装与登记已可用。

## 自审

主代理自审：发行包、机器标识、配置／凭据路径、API／OAuth／工具schema保持兼容，当前Go差异仅品牌展示字符串；来源仓库与发行校验按新旧身份分离。GoServer、App及其部署未修改。GitHub保留原仓库历史与原版本资产。

<details>
<summary>四张图片的实际编辑提示词（内置 imagegen）</summary>

**English cover**

```text
Use case: text-localization. Edit target: the provided existing English GitHub README cover. Change only its brand wording for the confirmed rename. The top pill must read exactly "PatchX Freenote Agent". The main headline must read "Your PatchX Freenote records, connected to AI"; reflow it within the existing left headline area to fit with good whitespace, using 3 lines if needed. Exact brand spelling: PatchX, space, Freenote (only F uppercase), space, Agent. Preserve the silver physical recorder, PATCHX logos, layout, translucent cards, blue-white colors and all other English text verbatim. Maintain the original landscape aspect ratio and high-resolution crisp readable text. Do not change any product function or add marketing claims.
```

**Chinese cover**

```text
Use case: text-localization. Edit target: existing Chinese GitHub README cover. Change only the brand wording. Top pill exact text: "PatchX Freenote Agent". Main headline exact Chinese text: "把 PatchX Freenote 记录\n接入 AI 助手". Reflow or slightly adjust headline size to fit the left area without overlapping the recorder; preserve the large bold hierarchy. Brand must be PatchX Freenote, with a space and only F uppercase in Freenote. Keep the silver physical recorder and all PATCHX logos, all other Chinese text, right-side cards, background, blue-white palette, composition and original landscape aspect ratio. No additional wording or functional claims.
```

**English quickstart**

```text
Use case: text-localization. Edit target: existing English README quickstart illustration. Replace only the top-left brand pill text "PatchXNote Agent" with exactly "PatchX Freenote Agent". Expand that pill horizontally only as needed. Preserve all other text exactly, including Connect in three steps, Local clients: setup, browser sign-in, verify., the three numbered cards, OS/client labels. Keep all icons, product recorder, PATCHX device logo, layout, blue-white translucent style, dimensions and landscape aspect ratio. Crisp type, no extra text.
```

**Chinese quickstart**

```text
Use case: text-localization. Edit target: existing Chinese README quickstart illustration. Change only the small top-left pill brand from "PatchXNote Agent" to exactly "PatchX Freenote Agent", enlarging the pill width as needed. Preserve all remaining text exactly, including 三步接入 AI 助手, 本地客户端：选择客户端，浏览器授权，验证连接。, 选择客户端, 浏览器授权, 验证并使用, and the bottom OS/client labels. Preserve all card geometry, icons, recorder device and PATCHX logo, palette, whitespace and original landscape aspect ratio. Clear sharp Chinese type. No added content.
```

</details>
