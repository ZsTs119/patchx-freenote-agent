# WorkBuddy 远程 MCP 与平台 OAuth 第一版 Checklist 计划

> **2026-11-16 接续：** 用户反馈 0.1.4 已因沙箱质量评测未达标被驳回，具体失败日志尚未取得。后续包内容与三条业务示例优化按 [0.1.6 质量评测接续计划](2026-11-16-workbuddy-quality-resubmission-checklist.md)执行；Go 修复由用户负责。本文件保留原实现和验证历史，不代表当前平台审核通过。

**日期：** 2026-11-13

**状态：** A–D 本地实施、主 Agent 自审及 7 项定向测试完成，WorkBuddy 0.1.4 生产/测试包已生成。用户负责上传验证，F 项平台闭环待验收；本轮未修改服务端、npm 或 Go CLI，未提交、推送、发布或部署。

**目标：** 用户安装或更新 WorkBuddy 连接器后，直接完成浏览器授权、调用现有远程 MCP 工具，并能正常重连和续期；Windows/macOS 均无需手动初始化本地环境。

**架构：** WorkBuddy 直接通过 Streamable HTTP 连接现有 GoServer `/mcp`，平台通过已有 OAuth 服务完成授权和凭据管理。连接器采用 `server-side` + `mcp_oauth` 动态注册，复用现有业务工具；服务端仅在实际联调发现不兼容时做必要修复。

**技术栈：** WorkBuddy Connector JSON、现有 Node.js 渠道打包/校验脚本、GoServer 远程 MCP 与 OAuth DCR/PKCE/refresh。

**执行方式：** 主 Agent 串行实施、自审和测试。用户已授权按计划实施、限定模块测试和生成候选包，并明确 npm latest 保持 0.2.16、上传验证由用户处理；本轮不含 Git 提交、推送、发布或部署。

## 1. 背景与已确认决策

- [x] 核心业务是远程 MCP 和平台 OAuth，继续让 AI 直接发现和调用 MCP 工具。
- [x] 新方案使用纯远程 MCP 包，保留 `source=patchxfreenote`、品牌及现有业务用途，不新建连接器身份。
- [x] 第一版完成安装、授权、工具调用、重连、刷新闭环；不新增更新平台、安全策略模块或额外审批限制。
- [x] npm `latest` 按约定继续保持 `0.2.16`，已发布的 `0.2.18 next` 保留。本计划不执行标签切换，也不以连接器审核通过作为自动切换指令。
- [x] 旧用户切换后可能需要重新授权一次；不迁移电脑中的 CLI 凭据到 WorkBuddy 云端，不删除已有本地安装和登录资料。

本计划接续 [自动安装与热更新计划](2026-11-13-workbuddy-auto-update-bootstrap-checklist.md)。旧方案的 npm 改进、候选发行和本机验证记录继续保留，但 WorkBuddy `0.1.3` ZIP 已被上传解析器拒绝，不能继续作为可提交包。

本次需消除的实际拒绝原因：同包存在 `mcp.json` 与 `cli.json`、`preAuth: cli` 混合方案、Base64/Brotli 编码的执行源码、MCP args 中的大段内联代码。新包直接连接远程 URL，因此不需要在包里换一种脚本加载方式。

依据为用户提供的上传错误，以及 2026-11-13 核对的 [WorkBuddy 官方连接器规范](https://open.workbuddy.cn/docs/connector)。配置采用该规范的 MCP、云端 OAuth 和动态注册字段；正式上传时仍须以平台实际解析结果验收。

## 2. 已有能力与待核实点

| 项目 | 已知事实 | 本轮需要补齐的证据 |
| --- | --- | --- |
| 远程 MCP | 本次讨论期间 `/mcp/health` 返回正常，报告 19 个工具 | 新连接器取得自己的授权后实际调用；不把健康检查当业务验收，也不固定工具总数 |
| OAuth | 已有发现、注册、授权、换令牌和刷新接口 | WorkBuddy 云端使用实际参数完成整条链路 |
| 回调 | 源码保留旧、新品牌 WorkBuddy 私有回调，通用注册支持 HTTPS 回调 | 当前生产部署是否具备对应能力，实际平台 HTTPS 回调是否可用 |
| 客户端认证 | 当前源码的 DCR 仅接受 `token_endpoint_auth_method=none`；发现信息还可列出预注册客户端使用的其他方式 | WorkBuddy 动态注册与换令牌实际使用什么方式，不能仅看 metadata 判断兼容 |
| 历史成功 | 用户已确认 Windows/Mac 的本地 CLI 授权与代理连接成功 | 该结果不替代本次平台托管 OAuth 验收 |

服务端源码、历史定向测试、线上公开端点和真实 WorkBuddy 连接分别记录。集成指南中的“候选/待部署”说明不能作为生产已更新的证据。

## 3. 本版范围与更新方式

主流程：

```text
安装/更新连接器 → 平台发现 OAuth 服务并注册客户端 → 浏览器登录授权
→ WorkBuddy 云端换取并管理凭据 → 远程 MCP 工具调用 → 重连复用/自动刷新
```

- 业务修复通过服务端正常发布生效。工具描述/schema 的变化按平台缓存行为刷新或重连，不承诺运行中的工具列表即时更新。
- MCP 地址、授权配置或包内 Skill 变化时更新连接器包；普通服务端修复无需再发布 npm 或连接器。
- 本路线不承担离线运行或本地旧版本兜底。网络/服务暂时不可用时提示重试，不清理授权或反复要求用户登录。
- 不修改 npm/Go CLI 功能，不重建安装锁、目录初始化或二进制更新模块，不顺带改造其他渠道和业务工具。
- 沿用已有 OAuth 校验和凭据处理；不降低已有校验，也不新建域名准入、审计、风控等体系。验证记录只保存脱敏结果，不收集或输出令牌、验证码和用户正文。

## 4. 实施 Checklist

**执行顺序：** A 只读核对 → B/C/D 实现及定向验证 → G 先交付本地已验证候选包 → 用户上传解析、开放测试入口后执行 F → 遇到明确服务端问题再进入 E，修复后只复验失败链路 → G 收口记录。无需等到平台实测全部完成才把 ZIP 交给用户；没有平台入口时继续完成本地工作，平台项保持待验收。

### A. 核对实际接入合同

涉及：`../patchxNoteGoServer/docs/integrations/apifox/shared/integration-guide.zh-CN.md`、`../patchxNoteGoServer/internal/agentoauth/{service,http}.go`、现有远程 MCP handler 与官方连接器规范。

- [x] 只读核对生产 `/mcp` 的未授权响应、`WWW-Authenticate` 指向的资源 metadata、授权服务器 metadata；按发现结果使用现有 `/v1/agent/oauth/*`，不照抄官方示例另建一套接口路径。
- [x] 核对现有默认 scopes 是否覆盖当前连接器所承诺的工具，优先复用现有默认值；确需声明时与服务端合同一致，不新增业务权限或固定本地 CLI 的 client_id。
- [x] 将尚未知晓的平台注册、回调和刷新参数列为 F 项现场核对内容，不把“先取得完整平台注册结果”作为生成候选包的前置条件。现有通用 HTTPS 注册已能接受的请求直接复用。

### B. 连接器配置与渠道打包

涉及：

- `packages/workbuddy/patchxnote-agent/connector-meta.json`
- `packages/workbuddy/patchxnote-agent/mcp.json`
- `packages/distribution/channels.json`
- `scripts/package-channel.mjs`

- [x] 连接器版本从 `0.1.3` 递增为 `0.1.4`，保留 `source=patchxfreenote` 和现有 MCP server key；设置平台 OAuth。最低宿主版本按使用字段核对，第一版可沿用现有 `5.0.0`，不扩展老版本验收矩阵。
- [x] `mcp.json` 使用远程 URL；移除 `preAuth`、本地 command/args/runtime/env。渠道清单不再打包 `cli.json`，不再读取 `cliPackageTag` 或 bootstrap。
- [x] 打包器移除 WorkBuddy 分支对 `renderWorkBuddyBootstrap` 的调用；在生成 manifest 时同时填入选定环境的 OAuth `server_url`，保证它与 MCP URL 一致。当前 manifest 没有统一模板渲染，不能只在源 JSON 填占位符就认为已完成。
- [x] 生产、测试两种 WorkBuddy 输出都能生成；正式 ZIP 根目录只有元信息、MCP 配置、图标和 Skill。旧引导源码及既有 npm 测试可保留，不把删除旧实现、重写 CI 或重发二进制扩大成本轮任务。

目标配置关键字段如下，其余名称、描述与示例沿用现有文件。`scopes` 先使用服务端默认值，按 A 项核对后决定是否显式填写。

```json
{
  "source": "patchxfreenote",
  "type": "mcp",
  "version": "0.1.4",
  "auth_mode": "server-side",
  "server_auth": {
    "auth_type": "mcp_oauth",
    "data": {
      "mcp_oauth": {
        "server_url": "{{MCP_URL}}"
      }
    }
  }
}
```

```json
{
  "mcpServers": {
    "patchxnote": {
      "type": "streamableHttp",
      "url": "{{MCP_URL}}",
      "timeout": 30000
    }
  }
}
```

这两段为源码配置示意，最终 ZIP 必须是实际环境地址；客户端信息由动态注册取得，不放入包内。

### C. 校验器与本次故障回归

涉及：`scripts/validate-workbuddy-connector.mjs`；新增一个聚焦本模块的 `scripts/workbuddy-remote-connector.test.mjs`。

- [x] 校验器从“强制 CLI preAuth”改为验证本连接器的纯远程 MCP、平台 OAuth、地址一致和包结构，移除 bootstrap 解码与 CLI tag 依赖。
- [x] 保留现有基础文件、图标和敏感内容检查；不扩写通用安全扫描。补上本次实际拒绝原因的回归：混装 `cli.json`、残留 `preAuth`、本地/编码启动入口应被拒绝。
- [x] 用实际渠道生成器覆盖生产、测试地址同步，确认 OAuth 地址不遗漏模板渲染、不串环境；有地址不一致或未替换占位符时明确失败。
- [x] 读取生成的真实 ZIP 内容并与 bundle 对照，不只验证源配置或文件名列表；确认没有脚本入口和引导代码混入。测试集中复用这些夹具，不再建一套测试框架。

只验证生成后的 bundle/ZIP；源码目录可保留未入包的旧 `cli.json` 和引导文件。校验器的默认入口、打包器调用和测试都使用生成目录，避免把保留历史源码误判为正式包混装。

### D. 包内使用说明与维护记录

涉及：`packages/workbuddy/patchxnote-agent/skills/patchxnote-mcp/SKILL.md` 及其 `references/{onboarding,workflows,troubleshooting,security-and-evidence,source-of-truth}.md`；维护文档仅更新 WorkBuddy 相关段落。

- [x] 将首次使用和授权恢复改成平台连接/重新授权；移除 npm 安装、profile、keychain、`mcp login/status`、`--no-browser` 和本地热更新操作指引，避免 Skill 再引导用户走旧链路。
- [x] 保留现有三类示例：连接检查、查看最近手机录音总结、整理可复制笔记；沿用远程工具及其实时 schema，保留账号级读取和来源信息，不新增工具或重写业务逻辑。
- [x] 登录取消/失效、网络故障分别提示平台重试或重新授权；正常重连复用平台授权。说明旧用户可能需授权一次、业务更新由服务端发布，避免承诺“以后任何变化都不需要更新包”。
- [x] 更新 `docs/release-and-maintenance-runbook.zh-CN.md`、`docs/mcp-clients/README.zh-CN.md` 的对应接入与验收记录；不修改公共 Skill、npm 内 Skill 或其他渠道。旧计划保留历史结果并指向本计划。

### E. 必要时的小范围服务端修复

条件项。本轮公开入口核对未发现必须修改服务端的问题，因此未修改、测试或部署服务端。真实平台 DCR/授权尚待用户验证，以下修复项当前不适用，若出现明确问题再进入。

- [ ] 仅修复实际阻断本链路的注册/回调/令牌交换/刷新问题，落点优先为既有 `internal/agentoauth`；只有发现入口或 MCP 鉴权确有问题才涉及对应 handler。
- [ ] 若 DCR 不兼容，先记录实际字段差异与错误阶段，再确定补丁，不靠关闭已有校验、改回 CLI 或混装两套授权配置绕过；如确需预注册，单独说明原因及凭据准备，不预先实现第二条路线。
- [ ] 为真实失败补一个能复现的定向用例并验证修复；仅运行修改函数及直接受影响的已有兼容用例。接口合同变化时同步对应 OpenAPI 与集成说明；不改账号、短信、额度、内容处理等业务模块。
- [ ] 分别记录本地结果、实际部署版本和线上复验结果。若需要部署，准备好具体改动与验证后按授权发布，不把本地补丁写成线上已生效。

### F. 实际授权与使用闭环

- [ ] 用户上传同一份正式候选 ZIP，记录平台解析结果；四类历史解析错误均消失。确认该账号实际可用的草稿/测试安装入口，以及云端授权是否还需平台配置；若只能审核后测试，先记录该平台依赖，不把它误归为服务端代码问题。
- [ ] 首次连接使用本连接器新取得的授权，走完发现、注册、浏览器授权、换令牌、MCP 初始化和工具发现；核对实际 client name、HTTPS 回调、PKCE、token 认证方式和刷新能力。不能复用旧私有回调客户端或本地 CLI 凭据充当平台成功证据。
- [ ] 用该连接调用 `patchxnote_get_current_user` 和 `patchxnote_list_memories`（按实时 schema，手机示例使用 `{"platform":"mobile","limit":1}`）。选择已有一条可读总结的验收账号/测试记录，用返回的真实 ID 调用现有读取/渲染工具，得到可复制笔记；不发送 webhook，也不新建造数模块。空列表仅说明授权和查询成功，笔记示例须保持待验收，不能随之勾选通过。
- [ ] 断开重连后再次调用账户工具，验证有效授权能复用；用户取消一次首次授权后可再次连接完成授权，不出现循环弹窗。
- [ ] 取得一次真实平台刷新成功后继续调用工具的证据。优先使用平台已有测试/强制刷新入口或现有隔离测试环境；不可用时在自然刷新后补验，不改生产令牌时长，不用重新登录或服务端单测替代平台刷新证据。未取得证据时本项保持待验收。
- [ ] Windows 和 macOS 各完成一次新包授权、调用和重连，记录宿主版本；两次分别覆盖首次使用、已有连接器更新，不扩成两端各测全矩阵。确认实际生效的是 `0.1.4` 的远程配置，已有本地 CLI 登录不算云端已授权。宿主无法直接更新时允许通过其正常界面移除并重新添加本连接器，不要求手动改 npm 目录或清理全局缓存。
- [ ] 上述连接验证同时确认工具来自包中远程 URL、使用实时 schema，连接不依赖本地 npm/Go。若 E 实际发布服务端补丁，保持同一 ZIP 再调用验证修复生效；没有服务端改动时不为证明热更新额外发布假版本或增加版本查询接口。同一云端刷新流程只验证一次。

### G. 交付

- [x] 交付 `dist/channels/workbuddy/production/0.1.4/PatchX Freenote-workbuddy-connector-0.1.4.zip`，记录 SHA256、实际文件清单及本地验证结果；保持旧发行资产不被覆盖。
- [x] 更新本计划的检查状态与证据，分别列出：实现、本地检查、平台解析、Windows/macOS 实测、刷新、审核/发布。用户未提供或未观察到的结果不勾选。
- [x] npm latest 保持 `0.2.16`，next 保留 `0.2.18`；本轮交付不要求新 npm/Go 版本。提交审核由用户处理，市场审核通过与正式发布状态另记，不与功能验收混为一谈。

## 5. 只测试本计划模块

| 检查 | 最小范围与通过标准 |
| --- | --- |
| 打包与校验 | 一个 Node 测试文件：正确远程包、历史混合/内联入口拒绝、生产/测试地址一致、实际 ZIP 内容 |
| 公共入口 | 一次未授权挑战与 metadata 核对，发现到的地址一致；不做压测或重复全站探测 |
| 平台 OAuth → MCP | 纳入下面两端实测中的一次：新授权、账户/记录调用、重连、取消后重试；另补一次刷新后调用，不单独再建一套重复登录测试 |
| 跨平台 | Windows/macOS 各一次真实连接闭环，合计覆盖新用户与旧连接器接续；不重测本地安装器、二进制架构矩阵或所有宿主版本 |
| 业务示例 | 复用上述连接覆盖现有查询与笔记示例；空列表不能代替笔记生成证据，不遍历全部工具或发送外部消息 |
| 条件服务端补丁 | 只测实际改动函数及直接受影响兼容；未改服务端就不跑其测试套件 |

实施后的本地命令，从 Agent 仓库根目录串行执行：

```sh
node --test --test-concurrency=1 scripts/workbuddy-remote-connector.test.mjs
node scripts/package-channel.mjs --channel workbuddy --env production
node scripts/package-channel.mjs --channel workbuddy --env test
git diff --check
```

第一条测试文件已新增并执行；两个打包命令已内含对应产物校验，不另跑同一套重复检查。测试中的生成夹具若已经留下同一源码版本的有效生产/测试产物，核对后直接交付，省去重复生成；否则执行后两条打包命令生成正式产物。当前宿主可使用 Windows Node 从仓库 UNC 目录运行。

不运行 `go test ./...`、npm 安装/锁/更新测试、全仓 CI、其他渠道生成或无关业务 smoke。条件服务端测试在确定补丁后，把具体 `-run` 用例与串行命令补到执行记录；不预设全包扫描。通过后停止扩测，只有新改动或实际失败才复验。

## 6. 完成条件与执行记录

- [x] 实现和限定本地检查通过，正式候选 ZIP 已生成并核对。
- [ ] 平台解析通过；新授权、直接工具调用、重连与刷新有真实证据。
- [ ] Windows/macOS 的计划内使用闭环通过，功能与现有示例一致。
- [x] 没有为本轮扩大 npm、Go CLI、其他渠道或业务测试范围；遗留事项和审核状态已如实说明。

本地交付可先完成，但平台解析、真实客户端或刷新证据缺失时，只报告对应阶段完成，不报告整条功能闭环已验收。浏览器检查只使用指定 Chrome；用户实际 WorkBuddy 操作的结果单独记录。

**本次自审结果（2026-11-13）：** 已补齐候选包先交付后联调的顺序、生成目录校验、已有连接器接续、笔记示例真实数据验收，并合并跨平台/OAuth/业务的重复检查。没有新增功能模块、安全策略或无关测试。计划可以覆盖本版功能闭环；DCR 实际兼容、平台测试入口和真实刷新仍须在实施时验证。

## 7. 本地实施与交付证据（2026-11-13）

- 配置与生成：source 保持 patchxfreenote，连接器版本 0.1.4；远程 MCP 与 OAuth server_url 使用同一环境地址。生产/测试包均为 9 个文件，无 CLI 配置、启动脚本、内联代码或残留模板。
- 默认 scopes：服务端 resolveRegisterScopes 复用 DefaultScopes，已包含账户、硬件、额度、用量、两种兼容内容范围、模型 IO 和既有 webhook 范围。包不另填 scopes，沿用默认授权，不新增权限或工具。源码参考 GoServer HEAD 6920cdb3、候选合同 0.20.92；不将该源码版本当作生产部署版本。
- 公开 HTTP 核对：资源 metadata 和授权服务器 metadata 均为 200；未认证 tools/call 为 401，并携带指向生产资源 metadata 的 WWW-Authenticate。GET /mcp 为 405，initialize 为 200，符合当前 handler 的公开初始化/受保护工具调用分层；该结果不能证明平台 OAuth 已通过。
- OAuth metadata 声明 DCR、S256、authorization_code 与 refresh_token。源码 DCR 目前仅接受 none，其他 advertised token 方式可用于预注册客户端；WorkBuddy 实际参数、云端回调和刷新仍待 F 项核对。没有创建测试 OAuth 客户端或请求用户授权。
- 定向回归先复现旧包缺少 server-side，以及校验器接受 preAuth/额外引导脚本的问题；修改后 7/7 通过，无跳过。Windows Node v22.18.0 串行执行，只运行 scripts/workbuddy-remote-connector.test.mjs；测试中依次生成生产/测试包并读取 ZIP 实际内容与 bundle 比较。
- 未运行 Go、npm 安装/锁/更新、其他渠道、全仓 CI 或业务测试；未用本地 CLI 登录替代平台证据。仅更新 WorkBuddy 专用 Skill，公共 Skill 与 npm 副本未变。
- 规范依据为同日讨论阶段已读取的官方页面和用户上传错误；实施时搜索服务重新抓取该页面超时，未将本地测试等同于平台解析通过。
- npm 标签经公开 registry 回读仍为 latest=0.2.16、next=0.2.18，本轮没有任何标签写操作。旧生产 0.1.3 ZIP 已核对恢复为既有发布资产 SHA256 9277e0cb9f78d0f65216870adbf496d0631110650f98c9337a05107938f72388，线上资产未变。
- 本地公开探测与产物摘要保存在 ignored 的 .tmp/workbuddy-remote-oauth-20261113/，只包含非敏感元信息。自审由主 Agent 完成，不属于独立评审。

| 产物 | 大小 | SHA256 |
| --- | --- | --- |
| production/0.1.4/PatchX Freenote-workbuddy-connector-0.1.4.zip | 18,818 字节 | cca9e1aa612938339ff7521eb0e9cd93de52a996a2584de2a74ae06fbe6e73a8 |
| test/0.1.4/PatchX Freenote-workbuddy-connector-0.1.4.zip | 18,936 字节 | 0bc41dc1fd43d1f2ab34f2bad28a701d512612046b65802f50fc437ab485f45c |

路径均位于 dist/channels/workbuddy/ 下。上传取 production 包；test 包仅用于明确选择测试环境的联调，本轮未验证测试服务器可用性。

包内文件：connector-meta.json、mcp.json、icon.svg，以及 skills/patchxnote-mcp/ 下的 SKILL.md、references/onboarding.md、references/workflows.md、references/troubleshooting.md、references/security-and-evidence.md、references/source-of-truth.md。

**用户验证接续：** 上传生产 ZIP，先确认解析成功，再在可用的测试/连接入口完成授权、账户查询、记录与笔记、重连；Windows/macOS 各覆盖一次，刷新证据按 F 项补齐。遇到失败记录阶段、时间、宿主/连接器版本和脱敏错误，不提供令牌或完整回调链接。

**当前检查点：** 本轮本地范围已完成，候选包已准备交付用户上传验证。平台解析、真实授权/调用/刷新、两端实测和市场审核均保持待验收；Git 未暂存、提交、推送，线上服务与 npm 标签未修改。

## 8. 展示图替换（2026-11-16）

用户要求用新提供的产品照片替换 WorkBuddy 市场展示图。当天重新核对[官方图片规范](https://open.workbuddy.cn/docs/connector)：支持 SVG/PNG/JPG，PNG/JPG 建议 64×64，建议透明背景；版本更新建议递增。

- [x] 原图为 476×711 透明 PNG。仅去除四周透明空白并等比例缩放，完整产品居中放入 64×64 透明画布，保留原图产品及标志内容；产物 `packages/workbuddy/patchxnote-agent/icon.png` 为 RGBA PNG、4,313 字节。
- [x] WorkBuddy 文件映射改为 `icon.png`，连接器版本递增至 0.1.5；保留旧 `icon.svg` 及其他渠道的原映射。校验器兼容原 SVG 与新 PNG，原 0.1.4 生成目录仍通过校验。
- [x] 串行运行既有 `scripts/workbuddy-remote-connector.test.mjs`，7/7 通过，测试依次生成生产和测试 ZIP。未运行 Go、npm、服务端或其他渠道测试。
- [x] 独立读取 ZIP 并核对 CRC、实际 PNG 字节、64×64/透明通道及 9 个文件。与对应 0.1.4 包相比，仅图标替换、manifest 版本和 `source-of-truth.md` 包版本说明变化；MCP 配置、OAuth 字段及其他 Skill 内容一致。首次对比脚本误把未变化的 Skill 版本也替换，修正比较范围后通过，产品文件无需修正。
- [x] 两份 0.1.4 ZIP 的 SHA256 与第 7 节原记录一致，未覆盖已提交包。`git diff --check` 通过；工作区中此前远程连接器改动保留。
- [ ] 用户上传 0.1.5，确认平台解析与市场展示图实际效果。本轮不替代平台 OAuth 和业务验收。

| 产物 | 大小 | SHA256 |
| --- | --- | --- |
| production/0.1.5/PatchX Freenote-workbuddy-connector-0.1.5.zip | 21,679 字节 | a7aca3064af27a60dfbdba8f59a3401e1dee71b984598ff5bbea9cdaff56666f |
| test/0.1.5/PatchX Freenote-workbuddy-connector-0.1.5.zip | 21,797 字节 | cfc77de3608cdbe07fa14f67ca69959960136afde28f7bafa7618f8f7d3883a8 |

以上路径位于 `dist/channels/workbuddy/` 下，上传使用 production 包。当前检查点：换图和本地验证完成，等待用户上传；本轮未暂存、提交、推送、部署或修改 npm 标签。
