# PatchXNote Skill 与 MCP 公开目录发布及检索验收 Checklist

**日期：** 2026-09-15

**状态：** 0.2.14 发行、安装／协议、Registry 登记／公开回读完成；skills.sh 安装／检索／详情正文通过。Chrome 页面截图仍受工具故障阻断；腾讯按约定完成首轮预检。

**Goal：** 复用现有公开发行物，完成首轮平台的安装、登记和搜索验收，取得可用于 PPT 的真实发布证据。

**Architecture：** 复用现有发行物，在仓库外完成必要的渠道材料适配，沿“准备 → 提交／登记 → 安装 → 检索与页面取证”推进。一次准备和可复用的验证结果不在各渠道重复执行。

**Tech Stack：** 已发布的 npm 包与 GitHub Skill、Vercel skills CLI、MCP 官方 Registry 发布工具、平台公开 HTTP API、用户指定的 `@chrome`。

> 执行约定：主代理串行完成，沿用用户现有协作规则。进入执行阶段后，已对齐范围内的准备、适配、验证和常规问题处理直接推进；只把真实缺项或改变既定条件的决定交给用户。

## 0. 本次自审与调整

| 原计划的问题 | 调整结果 |
| --- | --- |
| 多处要求重新核实范围、审阅材料、取得授权，容易让执行停在重复确认。 | 保留用户已要求的正式提交前材料审阅，能一起准备的材料一次展示；确认后的同一内容继续完成发布和验收，不再逐步骤询问。 |
| “原仓库不动”容易被解释成连仓库外的说明、路径和打包字段都不能调整。 | 明确允许在任务目录中适配渠道副本。只有确实需要改原仓库、发行物、主体、许可或运行行为时才单列差异。 |
| 固定临时目录结构、反复记录 Git 基线、可选截止日期和泛化审计占用执行精力。 | 一个仓库外任务目录即可；开始与结束各检查一次工作区。PPT 日期是可选信息，不进入完成门槛；不自建审计或验证体系。 |
| MCP 安装冒烟可能连带调用账号和记忆业务，验证范围容易扩大。 | 增加模块验证表；默认只验安装、元数据、协议发现和平台检索，不跑未改动的业务及跨平台回归。 |
| 缺少校验命令、独立详情页或索引结果时，容易直接停在“待定”。 | 使用平台现有能力完成验证；缺独立详情页可用官方搜索页与准确记录。索引待定必须附下一次检查和排障动作。 |
| 腾讯预检与未来上架之间缺少后续路径。 | 保持首轮资料预检范围；补齐满足条件并审阅材料后的提交、安装、检索步骤，不把预检当作上架完成。 |

保留的约束来自用户已明确的现状要求和已核实的平台条件：原仓库、Git 与发布身份保持现状，许可不变，凭据不公开，浏览器使用 `@chrome`。不额外引入人工独立审计、重复安全扫描、测试数量指标或全仓测试门槛。

## 1. 已对齐的范围

- [x] 保持现状，不做品牌统一、仓库重命名、账号迁移或许可变更。
- [x] 首轮优先处理 **skills.sh** 和 **MCP 官方 Registry**。
- [x] 腾讯 SkillHub 先核对企业发布资料与适用条款，是否正式上架另按完整材料审阅结果决定。
- [x] **ClawHub 暂缓**：当前 Skill 为 `UNLICENSED`，平台要求 `MIT-0`，不能默认替换许可后上传。
- [x] 最新授权仅扩展到 0.2.14 发行元数据、相关校验与文档；业务逻辑、Skill 内容／许可、服务端保持现状。
- [x] 用户已明确授权本次必要 Git 提交／推送、GitHub／npm 修正版发布及 Registry 登记；详见第 11 节。没有合并或发布 workbuddy 分支的其他内容。
- [x] 使用仓库外任务目录安装和准备材料；允许调整渠道副本的简介、文件布局、图标引用及平台要求的非秘密字段，保持现有身份、许可和功能含义。
- [x] 按用户之前的要求，在正式提交前展示最终材料；已确认内容直接推进。仅排版、目录组织等不改变公开含义的修正无需再次审阅。
- [x] 本文作为唯一仓库内进度记录，材料和取证文件存放在任务目录；PPT 日期未提供不影响执行。

## 2. 基线与现有材料

### 2.1 发行物与身份基线

| 项目 | 2026-09-15 核对结果 | 使用约定 |
| --- | --- | --- |
| 本次工作区基线 | `codex/workbuddy-connector-package`；HEAD `f60786ac475a02d7f7c16a447a16870b570db756` | 计划创建前干净；本次审核开始时仅本文未跟踪，执行前后各检查一次即可 |
| GitHub 仓库 | `ZsTs119/patchxnote-agent` | 复用现有公开仓库及身份 |
| npm 包 | `patchxnote-agent@0.2.13` | 已公开发布；执行时核对 registry 并选定具体版本 |
| 公开 Skill | `skills/patchxnote-mcp`，元数据版本 `0.1.1` | 复用实际公开的内容，记录对应 Git ref/commit |
| Skill 作者／许可 | `PatchXNote`／`UNLICENSED` | 保持现状，不将公开可读描述为已授予开源许可 |
| MCP Registry 名称 | `io.github.zsts119/patchxnote-agent` | 必须与所选 npm 版本的 `mcpName` 一致 |
| 生产接入页 | `https://freenote.patch-x.cn/mcp/setup/` | 使用已发布公开入口 |
| 生产 Remote MCP | `https://freenote.patch-x.cn/mcp` | 仅在对应渠道确需远程入口时使用，不将其验收与 stdio 混用 |

`packages/distribution/channels.json` 已使用 `PatchXFreeNote` 展示名称，而现有公开 npm/Skill 仍有 `PatchXNote` 标识。本计划不修改任何一处；首轮复用所选公开发行物的身份与名称，平台最终显示内容在提交前列明。不承诺在保持源码不变时消除所有命名差异。

### 2.2 只读参考文件

- `packages/npm/package.json`
- `packages/npm/skills/patchxnote-mcp/`
- `skills/patchxnote-mcp/` 及其 `references/`
- `server.json`
- `scripts/smoke-mcp-stdio.mjs`
- `docs/marketplace/evidence-log.md`
- `docs/marketplace/mcp-registry.zh-CN.md`
- `docs/marketplace/privacy-security.md`
- `docs/marketplace/listing.zh-CN.md`、`listing.en.md`
- `docs/marketplace/publishing-checklist.zh-CN.md`
- `docs/plans/2026-09-04-npm-skill-install-and-ecosystem-search.md`
- `docs/plans/2026-09-14-unified-channel-package-checklist.md`

旧文档中的本地验证、生产业务验证或已生成渠道包，只作为历史证据。它们不自动证明本次平台发布、安装或搜索验收通过。

## 3. 当前发现状态

以下为 2026-09-15 首轮执行前的调查快照；执行后的当前状态见第 9 节，不是完整浏览器验收。

| 渠道 | 已取得的事实 | 当前阶段 |
| --- | --- | --- |
| npm／GitHub Release | 可查询 `0.2.13` 公开发行物 | 既有发布已确认，本次安装待验 |
| skills.sh | `patchxnote` 搜索接口返回 0 条；候选详情页正文显示不可用 | 未发现有效索引 |
| MCP 官方 Registry | `search=patchxnote` 返回 `servers: []` | 未发现登记记录 |
| 腾讯 SkillHub | `patchxnote`、`patchnote-agent` 查询均返回 0 条 | 资料核对待执行 |
| ClawHub | 搜索及名称前缀查询为空；平台许可与现状冲突 | 暂缓 |
| SkillsMP／Smithery／Glama | 本次公开搜索结果未发现准确条目 | 未取得收录证据，不断言永久未收录 |
| skillpm | 已发现从 npm 自动聚合的条目 | 可检索性补充证据，不作为平台认证 |
| `@chrome` | 本次连接因 request-header policy 加载失败而不可用 | 浏览器操作执行前重新检查 |

主要缺口：9 月 4 日 npm Skill 发版没有包含各平台目录提交；9 月 14 日统一渠道打包也将平台提交、审核列为后续工作。当前自有 `patchxnote-agent skill install` 是复制 npm 内置 Skill，不会自动产生 Vercel skills CLI 的安装记录。后者是 skills.sh 官方说明的收录来源；是否另有索引延迟或平台过滤，尚无足够证据。

## 4. Task 1：建立仓库外工作目录与候选材料

**输入：** 第 2.2 节中与当前渠道直接相关的文件，无需逐次重读所有文档。**输出：** 仓库外任务目录中的可提交材料。

- [x] 选择仓库外任务目录：`C:\Users\11979\AppData\Local\Temp\patchxnote-directory-20260915-102151`。
- [x] 检查工作区并固定 `patchxnote-agent@0.2.13`；npm latest 同为 `0.2.13`，名称与 `mcpName` 一致。
- [x] 下载并解包公开 npm 发行物，取得 v0.2.13 的 `server.json`；公开 Skill 的六个文件与必需引用齐备。
- [x] 在副本完成 MCP 描述长度、启动参数与展示入口适配；腾讯副本补齐其必填字段，许可保持不变。
- [x] 最终 MCP 登记文件已打开供用户审阅并发起一次确认；腾讯候选 ZIP、资料说明和验证结果已准备。MCP 最终材料已获用户明确确认。

只读基线命令示例（从本仓库目录执行）：

```powershell
wsl.exe -d Ubuntu-22.04 --cd /home/zsts_119/patchnote-agent git status -sb
wsl.exe -d Ubuntu-22.04 --cd /home/zsts_119/patchnote-agent git rev-parse HEAD
Invoke-RestMethod 'https://registry.npmjs.org/patchxnote-agent/0.2.13'
```

**完成标准：** 材料可实际提交、来源清楚、原仓库功能文件保持不变。不以生成了草稿作为整个任务完成。

## 5. Task 2：skills.sh 安装与检索验收

此渠道以 GitHub Skill 和 skills CLI 安装记录为基础，不把它等同于上传到 npm，也不保证安装一次立即出现详情页。

- [x] skills CLI `1.5.18` 在任务目录完成项目级安装，识别一个 `patchxnote-mcp`；六个文件存在，五个 references 无缺失。
- [x] 来源记录为公开 `ZsTs119/patchxnote-agent`，公共 HEAD 为 `bf536290f06e9d576612a10c9d2d0e38627550cb`；安装锁文件记录来源类型 github 与准确 Skill 路径。
- [x] WSL 安装环境未设置 `DISABLE_TELEMETRY`、`DO_NOT_TRACK`、`CI`。未取得平台接收安装统计的确认，不能把安装成功等同于已索引。
- [x] 11:22 搜索 `patchxnote` 和 `patchxnote-mcp` 均命中 `zsts119/patchxnote-agent/patchxnote-mcp`；已核对详情正文、公开来源与安装命令。证据：`evidence/skills-discovery-check.json`。
- [ ] 用 `@chrome` 打开实际详情页及其安装指令，保存一份可用于 PPT 的公开页面截图。
- [x] 安装后等待并复查，搜索由 0 条变为准确命中；没有重复安装。小写详情 URL 曾显示正文 404，保留 GitHub 账号大小写的详情 URL 已有效，HTTP/API 与浏览器验收分别记录。

候选命令如下；执行前以当前帮助为准，工作目录必须是仓库外的任务目录：

```text
npx -y skills --help
npx -y skills add ZsTs119/patchxnote-agent --skill patchxnote-mcp --agent codex --yes
npx -y skills find patchxnote
```

公开搜索接口（不代替浏览器验收）：

```text
https://skills.sh/api/search?q=patchxnote&limit=10
```

**完成标准：** 公开安装成功、准确条目可检索、详情页有效。浏览器截图作为 PPT 交付项单列；索引或截图未完成时继续跟进对应项，不重做已通过的安装验证。

执行说明：Windows 与 WSL 的整仓冷下载均长时间未完成，已结束失败尝试；使用 `GIT_ALTERNATE_OBJECT_DIRECTORIES=/home/zsts_119/patchnote-agent/.git/objects` 只读复用本机 Git 对象缓存后，仍由公开 GitHub 地址解析来源，安装在数秒内完成。原仓库未改动；这是缓存环境下的公开来源安装通过，不代表冷下载故障已消失。成功后没有重复安装；早期 API 与 `skills find` 为 0 条，11:22 API 两个关键词均已命中。有效详情页：`https://skills.sh/ZsTs119/patchxnote-agent/patchxnote-mcp`。页面包含 Skill 正文和安装命令；仓库页显示 1 个 Skill、1 次安装，本次验证计数不能写成外部用户数。

## 6. Task 3：MCP 官方 Registry 登记与安装验收

首轮登记现有 npm **stdio** 发行物。`server.json` 使用仓库外副本；不为本次登记调整原仓库的协议、OAuth 或工具能力。

- [x] 下载 MCP 官方 `mcp-publisher v1.8.1`，副本身份、版本和 npm 关联已核对。
- [x] 官方 `validate` 首次返回 422：description 超过 100 字符。缩短副本描述并补充启动 MCP 必需的 `packageArguments: mcp, serve` 后，最终材料验证通过。
- [x] Windows npm 安装成功，CLI 报告 `0.2.13`／commit `b645657fbb9bd04bd5aeae510e5f6bf2895b955c`。从官方 npm 解包内容启动、仅覆盖本次安装目录，按候选参数完成 initialize 与 tools/list：19 个工具定义，stderr 0 bytes，无业务调用。
- [x] 最终材料已审阅，GitHub 设备授权成功，身份核对为 `ZsTs119`；完成一次真实 publish 尝试并保留结果。该项只代表提交已执行，登记成功仍未通过。
- [x] 0.2.14 正式登记后，版本详情和关键词搜索均回读成功；所有 server 字段与发行候选 deepEqual，status=active、isLatest=true。
- [ ] 用 `@chrome` 核对可分享入口及安装说明与已验证材料一致。没有独立详情页的平台，以准确的官方搜索页与 API 记录交付。
- [x] 已确认并修正原 0.2.13 名称大小写冲突，按用户扩展授权发布 0.2.14。首次 publish 后搜索回读暂未命中，随后独立版本详情与搜索通过；未重复 publish。

正式动作候选命令（仅在审阅与授权完成后执行）：

```text
mcp-publisher login github
mcp-publisher publish
```

公开查询接口：

```text
https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.zsts119%2Fpatchxnote-agent
```

**完成标准：** 登记记录可查、元数据与已验证发行物一致、安装及协议发现通过。网页截图作为独立交付项；本次不要求完成整个账号、OAuth 和记忆业务回归，也不将 Registry 登记描述为功能或安全认证。

最终材料：任务目录 `mcp-registry/server.json`；展示名 `PatchXNote Agent`，登记名 `io.github.zsts119/patchxnote-agent`，版本 `0.2.13`，官网为现有生产接入页。用户已回复“确认，继续完成剩余事项”，材料审阅完成。会话 `36203` 已结束：身份授权通过，publish 返回 HTTP 403，回读 `servers: []`。未再次请求授权或重复提交。

## 6.1 原 0.2.13 的 403 与修正提案（已按第 11 节完成）

直接事实：GitHub 授权、身份核对与 Registry token 交换成功；publish HTTP 403，公开回读为空。helper 没有保留该次错误正文或权限声明，不能把推断写成服务端已明确返回的原因。

高度可信的原因：官方 GitHub 授权用原始用户名构造权限 `io.github.ZsTs119/*`，匹配区分大小写；当前候选及 npm `0.2.13` 的 `mcpName` 是小写 `io.github.zsts119/patchxnote-agent`。npm 校验同样精确匹配，因此只改副本名字会出现另一处不匹配。

建议修正范围（未执行）：同步 `packages/npm/package.json` 的 `mcpName` 与 `server.json` 的 `name` 为 `io.github.ZsTs119/patchxnote-agent`；带回本次已经验证的短描述与启动参数；按现有发行链路发布修正版。npm 不能覆盖已有版本，且安装器从 npm 版本生成 GitHub 二进制制品地址，所以不能只升 npm 版本却不提供相应发行物。仅同步相关版本／说明和校验，不改业务逻辑与许可。

用户随后已明确授权扩展发行修正范围，第 11 节记录实际执行和通过结果。原提案保留用于解释本次版本升级的原因。

官方依据：
- https://github.com/modelcontextprotocol/registry/blob/main/internal/api/handlers/v0/auth/github_at.go
- https://github.com/modelcontextprotocol/registry/blob/main/internal/auth/jwt.go
- https://github.com/modelcontextprotocol/registry/blob/main/internal/validators/registries/npm.go
- https://docs.npmjs.com/cli/v11/commands/npm-publish/

## 7. Task 4：腾讯 SkillHub 资料预检；其他平台暂缓

- [x] 官方发布参考确认必填字段为 slug、version、displayName；官方教程要求发布账号完成实名认证。公开查询无准确条目。license 在发布参考中是建议项，线上许可接受情况仍需账号环节确认。
- [x] 已生成 `tencent/patchxnote-mcp-0.1.1.zip`（11,748 bytes，根目录 SKILL.md 与五个 references），保留 `UNLICENSED`。官方 CLI kit `2026.8.5` 的 publish dry-run 成功；未全局安装 CLI、未登录或上传。
- [x] 首轮预检结论与候选 ZIP 已交付，见任务目录 `tencent/preflight-summary.zh-CN.md` 与 `tencent/patchxnote-mcp-0.1.1.zip`。
- [ ] 后续账号、实名和许可条件满足且材料审阅完成后，再按“提交 → 页面可查 → 安装 → 检索与截图”推进腾讯上架。此为条件性后续项，不计为本轮已上架。
- [ ] 对于已验证过的相同 npm／Skill 入口，复用结果；腾讯特有包装或安装方式只补测其差异。
- [ ] ClawHub 继续暂缓，除非用户单独改变许可决策；不能只改上传副本就认为没有影响授权范围。
- [ ] Smithery、Glama、SkillsMP 等暂不扩展执行范围；需要新增渠道时在本计划增补范围、条件和验收项。

## 8. 仅验证本计划涉及的模块

| 模块 | 必要验证 | 通过后如何复用 |
| --- | --- | --- |
| 渠道材料 | 平台要求的字段、来源、名称／版本对应正确；有打包时确认包能打开且引用文件存在 | 同一份公共资料只核对一次；只检查后续改动的字段 |
| skills.sh 分发 | 一次公开来源的项目级真实安装，Skill 和必需引用可读取 | 未改内容不重复安装；CLI 搜索不能替代安装结果 |
| MCP Registry | 元数据关联正确、正式登记回读成功，当前 Windows 环境完成一次登记入口的安装和协议发现 | 相同版本、入口和配置直接复用，不因多上架一个目录重跑 |
| 腾讯特有包装／入口 | 预检阶段只核对要求；进入发布后，仅补测与既有入口不同的导入或安装步骤 | 相同 npm／Skill 路径复用前述结果 |
| 平台搜索与页面 | 关键词找到准确条目，公开页面或官方查询记录可访问；用 `@chrome` 取证 | 每个平台核对自己的索引，不能拿另一个平台的结果替代 |

验证范围约定：

- **不运行**全仓 `go test ./...`、完整 npm 安装器测试集、macOS/Linux 回归、全部 MCP 客户端、模型效果或 Skill 全量正反例测试。本计划没有修改这些模块。
- **不默认执行** `scripts/smoke-mcp-stdio.mjs`：现有脚本会额外调用账号和记忆业务。本次协议检查止于 `initialize` 与 `tools/list`，使用现有工具或任务目录中的最小一次性检查即可，不新增仓库测试体系。
- 仅当某平台明确把登录后工具调用作为发布／可用性检查时，补充其要求的最小授权和只读调用；该项单独记录，不扩展为 OAuth 或业务全链路回归。
- 复用证据应注明版本、入口和环境；不匹配时只重验受影响项。失败时先修正实际问题；没有改动、失败或新疑点时不重复测试。
- 平台自带的校验或扫描按其流程处理，不叠加自建安全扫描、独立人工审计、故障注入或逐字节可复现检查。

### 索引待定与异常处理

1. 安装／提交完成后查询一次，区分“未提交成功”“已经登记但搜索未更新”“API 已有记录但页面未更新”。
2. 未提交成功时修正具体报错；已登记但尚未索引时保留已完成结果，按平台给出的更新时间安排下一次检查。没有公开时间时记录下次人工复查窗口，不假设等候即通过。
3. 复查仍无记录时，核对来源、名称、公开可见性及平台支持的索引机制；需要联系平台时整理具体问题，按用户已有外部沟通授权处理。
4. 单渠道等待时继续其他已对齐工作。记录阻塞原因、最后检查时间和下一步，不以一个笼统“待定”结束验收，也不创建用户未要求的定时任务。

## 9. 状态记录与 PPT 交付

| 渠道 | 准备／提交 | 安装验证 | 搜索／页面证据 | 下一步 |
| --- | --- | --- | --- | --- |
| skills.sh | 公开来源安装已完成 | 缓存环境下通过 | 两个关键词已命中，详情正文和安装命令有效；Chrome 截图未完成 | Chrome 恢复后补截图 |
| MCP 官方 Registry | 0.2.14 已登记，active | Windows 新版安装及 19 工具协议发现通过 | 官方版本记录和 patchxnote 搜索均准确命中 | Chrome 恢复后补截图 |
| 腾讯 SkillHub | 预检、候选 ZIP、官方 dry-run 通过 | ZIP 结构通过；线上安装尚未验证 | 当前 0 条 | 登录实名及许可确认后再决定正式发布 |
| ClawHub | 许可原因暂缓 | 不执行 | 本轮调查为空 | 保持现有许可 |

- [x] 已生成任务目录 `ppt-evidence-links.zh-CN.md`，含 npm、GitHub、skills.sh 准确链接、可复制 PPT 表述、版本、测试环境及限制。
- [ ] 用 `@chrome` 取得可直接放入 PPT 的截图和配套表述。浏览器不可用时继续 API 与安装工作，标记截图／浏览器验收待补，不使用 IAB 替代。
- [x] 本轮证据未写入凭据或业务数据；1 次安装包含本次验证，不当作外部用户数；PPT 使用分发／收录措辞。
- [x] 11:25 Git 状态仅本文未跟踪；受跟踪文件无修改，未执行 Git 写入、npm 重发或新版本发布。未完成项已明确到具体原因与下一步。

首轮交付包含：平台链接与搜索词、安装／协议结果、浏览器截图、可复制 PPT 表述、待审核或待索引项。只完成计划、准备或提交时，不能标记整个任务完成。

### 本轮相关模块验证结果

| 验证 | 结果 | 任务目录中的证据 |
| --- | --- | --- |
| npm `0.2.13` Windows 独立安装 | PASS | `evidence/npm-install.log` |
| 最终 Registry 材料官方校验 | PASS | `evidence/registry-validate-final.log` |
| 候选启动参数的 initialize／tools/list | PASS：版本正确，19 个工具，无账号／记忆调用 | `evidence/registry-stdio-check.json` |
| skills CLI 公开来源安装与必需引用 | PASS：使用本机 Git 对象缓存 | `evidence/skills-install-check.json`、`skills-sh/skills-lock.json` |
| 腾讯副本与 ZIP | PASS：六个文件，许可未变 | `evidence/tencent-package-check.json` |
| 腾讯官方 CLI 本地预检 | PASS | `evidence/tencent-official-dry-run.json` |
| skills.sh 搜索及详情正文 | PASS：两个关键词准确命中，正文及安装说明有效 | `evidence/skills-search-post-auth.json`、`evidence/skills-discovery-check.json` |
| MCP 正式登记 | PASS：0.2.14 active，版本详情与搜索回读完全匹配 | `evidence/registry-0.2.14-public-readback.json`；旧失败证据保留 |
| 浏览器取证 | BLOCKED：request-header policy 加载错误 | Chrome inventory 一度可读，创建页面持续失败；重置工具会话后仍失败 |

skills.sh 搜索与有效详情正文已经取证，无需继续盲目等待收录；待 Chrome 工具恢复后补浏览器截图。未创建自动化。腾讯待补项详见任务目录 `tencent/preflight-summary.zh-CN.md`。

### 当前任务检查点

- **发行闭环：** 0.2.14 的 main 提交、tag、GitHub Release、npm latest、Windows 安装、协议发现、Registry 登记及公开搜索／版本回读均通过。
- **源码／tag：** `2dcebd0e6f67bcf4c856004a6058e4d0c50d4fe5`；`v0.2.14`。发行工作区 `/home/zsts_119/patchnote-agent-registry-0.2.14`；原 workbuddy 工作区的功能文件未改动。
- **远端流程：** Release run `34925935935`、npm run `34926192210` 均 success。没有仍在运行的发布／安装／授权进程，Windows 验收进程数为 0。
- **验证：** 官方元数据校验、六平台实际二进制 SHA-256、固定源码／tag／workflow 的 attestation、npm tarball integrity、Windows 官方源实际安装、initialize/tools/list、Registry 全字段与搜索匹配均 PASS。运行时与 Skill 内容无变化，未跑无关业务测试。
- **平台状态：** skills.sh 安装／检索／有效详情正文通过；腾讯首轮预检通过且未上传；ClawHub 按许可决定暂缓。
- **剩余项：** 仅 Chrome 浏览器页面操作与 PPT 截图，工具再次报 request-header policy 加载失败。现有 HTTP/API 证据不标成浏览器验收。
- **交付：** 任务目录 `ppt-evidence-links.zh-CN.md` 与发行分支 `docs/evidence/2026-09-15-release-0.2.14.zh-CN.md`。主代理自审通过；证据文档已以 04e933f 提交并推送 main 和修正分支。
- **恢复规则：** 不重复发版、重新授权或重装制造计数；如恢复只补文档收尾状态或 Chrome 取证。

## 10. 官方规则与本次文档验证

执行参考如下；本轮已核对关键平台规则，实际执行前仍需逐项确认当前要求和命令支持：

- [skills.sh FAQ：安装统计与收录](https://skills.sh/docs/faq)
- [skills.sh CLI 文档](https://skills.sh/docs/cli)
- [MCP Registry 官方发布流程](https://modelcontextprotocol.io/registry/quickstart)
- [MCP Registry 身份验证与职责](https://modelcontextprotocol.io/registry/about)
- [腾讯 SkillHub 官方项目](https://github.com/Tencent/skillhub)
- [腾讯 SkillHub 开放接口](https://github.com/Tencent/skillhub/blob/main/docs/README.md)
- [ClawHub Skill 格式与许可](https://docs.openclaw.ai/clawhub/skill-format#license)

计划审核阶段只修订 Markdown；随后已按授权执行第 8 节的相关模块验证和一次 Registry 提交。没有运行无关业务测试，原仓库功能文件保持不变。

- 2026-09-15：用户完成 GitHub 设备授权并提供成功页面；程序确认 `ZsTs119` 身份，发布返回 403。已核对官方权限实现与 npm 关联字段，并完成 skills.sh 搜索和有效正文复查。

## 11. 0.2.14 授权执行结果

用户明确授权“继续修正发行元数据，并完成必要的 Git 提交／推送、GitHub／npm 修正版发布及 Registry 登记”。此前不改 manifest／不做 Git 写入／不发新版的范围约定，在本次修正范围内由此授权取代。

- [x] 复用 WSL gh 登录态，实际权限 `io.github.ZsTs119/*` 已确认；token 未落盘。
- [x] 独立工作区基于公开 main `bf536290f06e9d576612a10c9d2d0e38627550cb` 准备修正版，保留 workbuddy 工作区已有内容。
- [x] 修正 npm／Registry 名称大小写、版本 0.2.14、短描述、mcp serve 参数及展示链接；同步相关校验与 README／runbook。
- [x] 旧名称回归失败／修正后通过；六目标安装计划、官方 validate、npm pack 九文件、四组 Git fixture 选测、YAML 与 whitespace 检查通过。CI 实际跳过无关全仓 Go 和完整 wrapper 套件。
- [x] 发行提交 `2dcebd0` 已推送 main 和修正分支；tag `v0.2.14` 已发布，未重写 tag。
- [x] [GitHub Release](https://github.com/ZsTs119/patchxnote-agent/releases/tag/v0.2.14) 七个资产齐备；六平台实取 SHA-256 均匹配；attestation 绑定源码、tag 和 release.yml 验证通过。
- [x] [npm](https://www.npmjs.com/package/patchxnote-agent/v/0.2.14) 已公开，latest=0.2.14，mcpName 正确；provenance 已公开，tarball integrity 通过。
- [x] Windows 官方源实际安装、版本／commit、initialize／tools/list（19 工具、stderr 0 bytes）通过；无账号／记忆／模型业务调用。
- [x] [Registry 官方版本记录](https://registry.modelcontextprotocol.io/v0.1/servers/io.github.ZsTs119%2Fpatchxnote-agent/versions/0.2.14) status=active、isLatest=true；版本与关键词搜索记录的所有 server 字段匹配。
- [ ] Chrome 页面取证：工具最后复查仍失败；保留 API／安装结果，仅此浏览器项待恢复，不重复发布。
- [x] 整理可复制 PPT 表述与当前链接，腾讯首轮预检材料继续保留。

执行暂态：npm 初次公开查询尚在平台处理窗口；本机 npmmirror 镜像初次 ETARGET，通过本次命令指定官方源后安装成功，未更改默认 registry。Registry 接受发布后首次搜索回读未命中，随后版本详情和关键词查询均通过，没有重复提交。

收尾状态：发行工作区干净；main 与修正分支均为证据提交 04e933f，v0.2.14 仍固定发行提交 2dcebd0。原 workbuddy 工作区保留其分支和功能文件，本文作为本地任务计划已更新、仍为该分支上的未跟踪文件。

## 12. 中英文 README 优化（用户已授权提交／推送）

- 目标：按审阅的六项优化中英文 README，检查通过后提交并推送 main，不新增 npm／GitHub Release。
- 工作区：`/home/zsts_119/patchnote-agent-registry-0.2.14`，分支 `codex/readme-publication-polish`，基线为公开 main `04e933f7c8ca4d57972d2d8dd5ded4e2eda5960c`，开始时干净。
- 范围：安装验证移出 logout；更新中英封面与接入图；明确 stdio 代理／本地工具适用范围；修复参数表格；补齐公开发布／收录链接；调整首页层次、完整 AI prompt 折叠保留、镜像 FAQ。
- 图片：使用内置 image_gen，延续现有视觉；文档只保留封面与接入图，其余重复大图不再嵌入首页，原素材不删除。任务材料在 Windows 临时任务目录 `readme-polish`。
- 验证：中英文命令／结构一致性、Markdown 表格／折叠／锚点、本地链接及图片检查、图片人工目检、公开渠道链接；仅文档和素材变更，不跑无关 runtime 回归。
- 当前：中英 README 与四张图片已完成。每版 483 行、10 张表、9 个折叠区、2 张正文图片；完整 AI prompt 保持原文，机器命令／JSON 配置对齐。GitHub Markdown API 渲染、41 个链接／锚点、表格竖线、非登出验证段落、PNG 与公开渠道链接均通过；主代理自审通过，准备提交。
- README 收尾：提交 8cbc877742ad5475163ae145600e5b610821e05c 已推送 main 与 codex/readme-publication-polish；工作区干净。两份公开 README 与本地字节内容一致，四张公开图片 URL 可访问。只有文档与图片变更，未发新版本，未运行无关 runtime 回归。
