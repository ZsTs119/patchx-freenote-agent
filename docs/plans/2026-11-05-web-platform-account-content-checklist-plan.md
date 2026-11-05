# Web 来源与账号内容读取（方案 B）首版 Checklist 计划

**日期：** 2026-11-05

**状态：** COMPLETE / SCOPED_VALIDATION_PASS / NOTE_TEST_AGENT_PATHS_PASS / PRIMARY_SELF_REVIEW_PASS；已实现并完成计划内验收；用户已授权Git交付，见第7节；未发布。

**目标：** 本地 Agent/CLI/MCP 默认读取本人账号的 App、PC、Web 内容，支持指定来源筛选，并打通列表、详情、当前会话缓存搜索、模型结果读取和本地导出。

**架构：** 沿用现有 Go CLI → 本地 MCP stdio → GoServer Agent API；来源筛选与内容读取权限分开处理，服务端负责账号查询和分页，本地保留记录真实来源。本地工具分支的搜索继续使用当前会话已加载的缓存，已有OAuth远程转发分支沿用服务端工具。

**技术栈：** Go、Cobra、现有 HTTP API client、MCP JSON-RPC、内存缓存及现有 Skill 同步脚本。

**实施方式：** 用户已授权实施，由主 Agent 串行执行；仅本仓计划内代码、文档与定向验收，不提交、推送、发布或部署。

## 1. 已确认基线与方案

- Agent 基线：分支 `codex/workbuddy-connector-package`，HEAD `fd1ab862e48c176ebbf022cda211954497f54792`；编写计划前工作区干净。仓库文档当前记录 CLI/npm `0.2.16`，本轮未在线核验发布渠道。
- 服务端合同：OpenAPI `0.20.85`；[Web/Agent交接](../../../patchxNoteGoServer/docs/integrations/apifox/client/web-client-platform-handoff.zh-CN.md)、[Agent设计](../../../patchxNoteGoServer/docs/engineering/agent-access-v1.md)。执行时核对目标环境实际版本。
- 本地 `internal/api/client.go`、MCP Schema/validator、CLI/modelio 和缓存仍有“仅mobile/desktop、平台必填、按平台精确匹配scope”的旧逻辑。
- `AGENTS.md`、`docs/engineering-rules.md`、原V1计划和Skill中旧的“必须指定单平台”描述与本次已确认方案冲突；本计划记录该冲突，实施时同步当前说明，历史验收记录保留并注明被本次合同更新。
- `internal/cli/mcp.go` 的 `mcp serve` 有两条路径：存在适用的MCP OAuth凭据时走 `internal/remotemcp` 远程转发；Agent会话路径使用本仓 `internal/mcp` 本地工具与缓存。两条路径沿用现状，本次重点修改后者及CLI/API内容入口。
- GoServer远程MCP已具备方案B；本地Agent需独立适配与验收。服务端Web自动快照刷新修复属于GoServer任务，本计划不承担该修复或其部署。

### 首版行为约定

| 使用方式 | 结果 |
| --- | --- |
| 列表省略 `platform` | 服务端返回本人账号三种来源的可读内容，沿用服务端分页 |
| `platform=mobile / desktop / web` | 只筛选对应来源 |
| 详情/模型结果/导出省略 `platform` | 沿用服务端按账号定位；有来源歧义时提示补充平台，不自行猜测 |
| 搜索省略 `platform` | 搜索当前账号、本次MCP会话已加载的三端缓存 |
| 搜索指定 `platform` | 只搜索已加载的对应来源缓存 |
| 旧内容权限或统一内容权限 | 任一 `agent:content.read:mobile`、`agent:content.read:desktop`、`agent:content.read` 均按方案B解释为本人内容读取权限 |

上表中的缓存搜索专指本地工具分支；OAuth代理的搜索范围由服务端返回工具说明决定，不把两者混写。

“全部”通过省略参数表示，不新增 `all` 平台或 `agent:content.read:web` 权限。返回记录保持真实 `platform`。已有有效会话沿用，不为新增Web强制重新登录；仅账号资料权限仍不具备内容读取权限，原有失效/撤销处理保持。

本次只适配现有内容读取功能；不新增云端全文检索、自动拉取全部历史、后台同步或新的权限体系。账号登录、安装器、支付、硬件、音频/AI执行及Webhook发送机制沿用现状，不作为本次改造模块。

### 原有流程兼容要求

本次兼容目标是保留原有入口、连接路径和有效调用；已确认的变化为内容查询支持Web、可省略平台，以及内容scope采用方案B语义，不把这些预期变化列为回归问题。

| 入口 | 必须保留的行为 | 本次验证 |
| --- | --- | --- |
| Agent Auth / CLI登录 | `login`、`auth status`、`logout`及Agent专用会话保持；已有有效凭据直接可用，到期沿用原刷新与轮换；不占App/PC/Web安装槽 | AC-03、AC-06；既有登录/刷新/退出定向用例 |
| MCP OAuth | `mcp login/status/logout`、既有授权回调和凭据存储方式保持；Agent凭据与MCP OAuth凭据互不覆盖；不因新增Web重登/重授权 | AC-03；既有OAuth成功登录、凭据分离、刷新及退出用例 |
| 本地MCP | `mcp serve`、stdio/JSON-RPC、工具名及原非平台参数保持；旧 `platform=mobile/desktop` 调用继续按来源筛选 | AC-02、AC-07A |
| OAuth代理 / 远程MCP | 保持 `/mcp` 转发与服务端工具发现；请求ID、cursor及平台参数透传；沿用原401后刷新重试和失效提示 | AC-02、AC-03、AC-07B |
| CLI内容命令 | 原命令、已有flags、输出格式/字段和退出状态保持；`--platform mobile/desktop`继续可用，新增Web及省略平台用法 | AC-05、AC-06 |
| 配置与缓存 | 服务地址、profile、凭据存储键和已保存MCP配置保持；同账号令牌刷新/续页不丢缓存，账号切换或退出才清空旧账号缓存 | AC-03、AC-04；定向对照与代码自审 |

`PATCHXNOTE_MCP_MODE=auto/local/remote` 是现有能力：auto仍按匹配且有效的OAuth凭据选择路径，local/remote显式选择保持。新内容参数不得改变这条选择规则，不能为了让测试通过而修改用户已有凭据或默认模式。

**服务端配套与发布顺序：** 新Agent的默认全来源查询依赖GoServer方案B（本次对应0.20.85合同）。联调使用已具备该能力的测试服；面向正式用户发布前，先确认实际目标服务端支持，再发布Agent并提示客户端刷新工具列表。测试服结果不能代替生产核对。本版不增加旧服务端自动兼容层，不静默改成mobile查询或分别拉取三端；目标环境未支持时记录为配套未就绪。仅旧的显式平台调用保持兼容，不承诺新语义在旧服务端生效。

## 2. 首版功能闭环

```text
沿用有效Agent会话，明确走本地工具分支（到期时走既有刷新）
→ 本地MCP发现支持Web且platform可省略的工具
→ 默认列出本人三端内容，按原cursor续页
→ 可显式筛选Web/App/PC
→ 查看详情及已有模型结果
→ 搜索当前已加载缓存
→ 生成本地Markdown草稿或导出结果文件
→ 全程保留原来源，旧App/PC调用仍可用
```

还需保持已有OAuth使用链：有效MCP OAuth凭据 → 本地stdio代理 → GoServer远程MCP发现/调用 → 默认三端及显式来源读取；刷新后仍可继续调用。平台直接连接远程MCP仍由GoServer提供，本次不改其服务端实现，也不要求重新验收各平台客户端UI。

对“搜索不到”的说明保持准确：未加载记录不在本地搜索范围内；用户可先翻页加载再搜索。本版不把缓存搜索描述为全账号云端历史搜索。

## 3. 实施 Checklist

每项先补充或修正直接相关断言、复现差异，再做最小修改与定向复验。以下完成状态对应第6节实际证据；前面的计划编写/复审记录保留为历史。

### T01 — API来源参数与服务端查询对齐

涉及：`internal/api/client.go`、`internal/api/client_test.go`；响应字段确有缺口时才修改 `internal/api/types.go`。

- [x] 将内容来源校验统一为可省略或 `mobile/desktop/web`；省略时HTTP请求不携带 `platform`，不发送 `platform=all`，也不默认改成mobile。
- [x] 对齐 `ListMemories`、`GetMemory`、`ListModelIOTraces`、delivery document、memory model IO、model-run IO查询。
- [x] 原样传递cursor、来源和已有过滤条件；直接消费服务端统一列表，不分别请求三端再自行合并分页。
- [x] 响应保留各记录真实平台；唯一记录可无平台读取，同ID多来源歧义沿用服务端错误并提示指定来源。
- [x] AC-01通过；同步原 `TestListMemoriesRequiresPlatform` 等直接冲突的旧断言，保留真正非法值的校验。

### T02 — MCP工具与内容权限兼容

涉及：`internal/mcp/tools.go`、`internal/mcp/server.go`、`internal/mcp/model_io_tools.go`、`internal/mcp/webhook_tools.go` 及其对应 `*_test.go`。

- [x] list/search/get memories、model IO列表/字段/导出、读取memory生成草稿等已有工具，Schema枚举包含Web，`platform`改为可选，validator与描述同步。
- [x] 内容工具统一使用内容读取权限判断：接受统一scope和两个旧scope，不再拼接 `agent:content.read:` 加查询平台。
- [x] 应用于直接读token及自动刷新后的重试分支；保留凭据中的原scope表达，不改写已有token或其他功能权限。
- [x] 默认全来源时也执行内容权限检查；资料权限、无登录及已失效会话沿用现有结果，不增加一套新规则。
- [x] 工具名称和既有非平台参数保持；无需为Web复制一套工具。
- [x] 用现有Auth/OAuth测试验证旧凭据直接使用、续期轮换、退出及两个凭据空间互不覆盖；不为本期改写登录协议、回调、钥匙串或有效期策略。AC-03记录具体函数和结果。
- [x] AC-02、AC-03通过；核对本次 `tools/list` 的真实输出，防止只改handler未改Schema。只读核对 `internal/cli/mcp.go`、`internal/cli/mcp_login.go` 的分支接线，在已有 `internal/cli/mcp_test.go`、`internal/cli/mcp_login_test.go` 中覆盖auto/local/remote选择及本次来源参数/Schema；OAuth代理仍透传服务端工具，不复制本地缓存逻辑或改登录流程。

### T03 — 三端缓存与当前会话搜索

涉及：`internal/cache/memory.go`、`internal/cache/memory_test.go`、`internal/mcp/tools.go`、`internal/mcp/server.go` 及对应测试。

- [x] 列表/详情回填缓存时保留每条记录真实来源，继续使用“来源＋记录ID”区分，同ID跨来源不能互相覆盖。
- [x] 缓存检索支持可选平台；省略时遍历当前账号已加载的各来源，显式Web时只返回Web。
- [x] 使用现有credential的 `AccountID` 绑定当前内存缓存；账号切换/退出时清空旧缓存即可；同一AccountID正常刷新令牌、续页或切换来源筛选时保留已加载缓存。不建立新的持久化数据库或多账号管理模块。
- [x] 当前账号记录的展示、统计与去重保留来源维度；Skill中的 `client_object_id` 去重建议同步为账号内“来源＋对象ID”，避免混算。
- [x] AC-04通过：三端同ID各自保留、全部/单来源搜索、无匹配正常返回、同账号刷新后仍可搜索、切换账号不命中旧缓存。

### T04 — CLI、模型结果和本地导出接通

涉及：`internal/cli/model_io.go`、`internal/cli/webhook.go`、`internal/modelio/modelio.go`，及 `model_io_test.go`、`webhook_test.go`、`modelio_test.go`；复用现有API和渲染实现。

- [x] `model-io list` 的 `--platform` 改为可选；字段查看、导出和memory草稿入口支持Web并沿用可选来源。
- [x] CLI/MCP共享的 `ValidateLookup`、辅助validator、帮助文案及歧义提示同步，不遗留“列表能读Web、详情或导出拒绝Web”的分支。
- [x] 未指定来源时，输出及本地文件元数据使用服务端实际解析的来源，不能空缺或伪标mobile。
- [x] memory驱动的Webhook草稿/发送入口可读取Web来源；本次只改它们的内容读取接点，不修改发送规则，验收不向真实群或Webhook地址发送。
- [x] AC-05、AC-06通过；显式mobile/desktop旧调用与Web/省略平台新调用成对验证，既有输出格式、字段、cursor和退出状态保持。导出只使用合成内容并在测试临时目录回读。

### T05 — 使用说明与随包Skill同步

涉及：`README.md`、`README.zh-CN.md`、`packages/npm/README.md`、`AGENTS.md`、`docs/engineering-rules.md`、`docs/plans/2026-08-06-agent-v1-mvp.md` 的当前说明；`skills/patchxnote-mcp/` 中直接受影响的正文及references。

- [x] 说明默认本人全部来源、可选三端筛选、已有有效会话兼容，以及本地工具分支的搜索仅覆盖已加载缓存；OAuth代理按远端工具说明使用。保留mobile/desktop示例作为筛选示例。
- [x] 默认使用示例采用 `{"limit":5}`；Web示例采用 `{"platform":"web","limit":5}`，详情优先沿用列表返回的ID和来源。
- [x] 修正当前规则/Skill中“每次必须指定mobile或desktop”等冲突；旧V1计划只加当前合同更新说明，不重写历史完成记录。
- [x] 使用现有 `scripts/sync-patchxnote-skill-packages.mjs` 同步npm、OpenAI和Claude插件中的Skill副本；不扩展渠道安装或发布模块。
- [x] AC-08通过，并在本计划登记实际修改路径、合同版本和测试结果。

### T06 — 定向验收与交付

- [x] 完成下表AC-01～08，其中AC-07分别记录本地工具分支A、OAuth远程代理分支B；区分单元/合同检查与真实Agent进程连测试服的结果；实际未执行项明确记 `NOT_RUN`。
- [x] 主代理自审：平台枚举/可选参数、权限兼容、刷新分支、缓存、详情/导出、Schema及文案成套对齐；结果记为自审，不称独立评审。
- [x] 记录本地工具合同输出/摘要；核对GoServer交接提到的本地工具快照或hash引用，若在其他仓库，提供对应差异供维护方同步，不在本计划扩大成服务端修改。
- [x] 登记目标GoServer合同与接口实测、Agent候选版本和两条MCP路径；给出“先服务端支持方案B、再发布Agent、最后刷新工具列表”的交付说明。发布前目标环境未核对时保持待确认，不新增运行时开关。
- [x] 功能闭环通过后给出使用方升级与刷新工具列表说明。实际Git提交/推送、npm/GitHub发布及平台安装验收在另获覆盖相应动作的授权后执行，不能把源码通过写成已发布。

## 4. 本次测试范围

| Case | 模块与必要断言 | 证据方式 |
| --- | --- | --- |
| AC-01 | API省略平台不发该query；三端筛选；cursor/来源原样传递；详情唯一/歧义及原非法值 | `internal/api` 定向HTTP客户端测试 |
| AC-02 | 工具Schema/validator对齐；原工具名和非平台参数保持；auto/local/remote路径选择、代理参数透传保持 | `internal/mcp`、`internal/cli` 定向协议/分支断言及既有代理测试 |
| AC-03 | 两旧scope/统一scope可读全来源；仅资料权限仍拒绝；旧凭据复用、登录/刷新/退出、OAuth凭据分离及401重试保持 | 内容权限新断言＋下列具名Auth/OAuth/代理兼容用例 |
| AC-04 | 三端同ID不覆盖、已加载缓存全部/单来源检索、同账号刷新保留、账号切换清空 | `internal/cache` 与MCP接线定向测试 |
| AC-05 | Web及省略平台的模型结果读取、Markdown草稿、本地导出；输出来源正确，歧义提示可操作 | `internal/modelio`、`internal/mcp` 的内容读取入口 |
| AC-06 | CLI旧mobile/desktop命令继续可用；model-io list平台可省略；Web/详情/导出/草稿参数及旧输出格式保持 | `internal/cli` 定向命令测试 |
| AC-07 | A：本地工具默认三端/续页→筛选→详情→缓存搜索→模型结果/草稿/导出；B：OAuth代理工具发现→默认三端/原mobile及desktop/Web调用 | 同一候选顺序运行两条既有路径，核对实际输出、来源及模式；不以远程结果替代本地结果 |
| AC-08 | 当前说明与示例正确，canonical Skill与三个随包副本一致 | 定向文案审查＋现有同步脚本 `--check` |

### 执行命令与证据

本次新增断言统一采用 `TestAccountContent...` 前缀，分别放入上述已有测试文件，不另建通用测试框架。本次修改的旧测试函数也纳入精确选择器，避免只测新增函数而漏掉旧的“平台必填/拒绝Web/按单平台授权”断言；重命名后记录新旧名称。

```bash
# 在本仓库根目录，使用已满足go.mod的既有Go工具链；串行执行。
GOMAXPROCS=1 go test -p=1 -parallel=1 -count=1 \
  ./internal/api ./internal/cache ./internal/mcp ./internal/modelio ./internal/cli \
  -run '^TestAccountContent' -v
# 再按实际修改旧函数的完整名称运行精确 -run；将命令写入执行记录。
node scripts/sync-patchxnote-skill-packages.mjs --check
git diff --check
```

预期：选中用例确实执行且全部PASS，Skill副本无差异，差异检查无错误。不能把 `no tests to run` 视为通过。

Auth/OAuth和代理只复验下列与本次兼容要求直接相关的既有函数，不运行它们的整包历史测试。实现未改这些模块时也不增加新的登录框架或测试体系：

```bash
GOMAXPROCS=1 go test -p=1 -parallel=1 -count=1 ./internal/cli \
  -run '^(TestLoginWithFlagsStoresCredentialAndDoesNotLeakSensitiveInput|TestMCPLoginBrowserOAuthStoresCredentialAndDoesNotLeak|TestSessionCredentialProviderSkipsFreshAccess|TestSessionCredentialProviderRefreshesExpiredAccess|TestLogoutRemovesLocalCredentialWhenServerLogoutFails|TestMCPLogoutRevokesAndDeletesCredential|TestMCPServeUsesRemoteProxyWhenCredentialExists|TestMCPServeWritesJSONRPCToStdoutOnly)$' -v
GOMAXPROCS=1 go test -p=1 -parallel=1 -count=1 ./internal/oauthflow \
  -run '^(TestStoreSeparatesMCPAuthFromLegacyCredential|TestRefreshProviderRotatesAndStoresTokens)$' -v
GOMAXPROCS=1 go test -p=1 -parallel=1 -count=1 ./internal/remotemcp \
  -run '^(TestProxyPreservesIDAndRefreshesOnceOnUnauthorized|TestProxyClassifiesTokenFailures)$' -v
```

这些既有用例使用受控依赖验证登录/回调/刷新接线，不调用真实短信，也不表示浏览器UI已验收。实际内容权限新增测试沿用AC-03；两类测试合并构成兼容证据，不再运行PKCE、安装器或其他历史专项。


AC-07复用现有JSON-RPC测试方式；已新增薄脚本 `scripts/smoke-account-content.mjs`，驱动本次候选二进制和已存在的测试服。A、B串行运行，每次仅一个MCP进程，无其他辅助服务。脚本接受 `--case local-content / remote-compat`，输出脱敏的模式、来源/数量、结果及文件校验结论；凭据沿用专用测试profile的既有存储，不放入命令行。

```bash
mkdir -p .tmp/account-content
GOMAXPROCS=1 go build -p=1 -o .tmp/account-content/patchxnote ./cmd/patchxnote
# A：使用既有Agent会话；现有模式参数确保验到本地工具，不必删除OAuth凭据。
PATCHXNOTE_MCP_MODE=local node scripts/smoke-account-content.mjs \
  --case local-content --bin .tmp/account-content/patchxnote \
  --server-base-url https://note-test.patch-x.cn \
  --profile account-content-test --out .tmp/account-content/local
# A结束后执行B：使用测试服的有效OAuth连接器凭据，验证真实代理路径。
PATCHXNOTE_MCP_MODE=remote node scripts/smoke-account-content.mjs \
  --case remote-compat --bin .tmp/account-content/patchxnote \
  --server-base-url https://note-test.patch-x.cn \
  --profile account-content-oauth-test --out .tmp/account-content/remote
```

测试账号预先具备三端各一条可读合成记录、至少一条可查看/导出的已有模型结果；沿用现有受控准备方式，为两个profile准备同账号的Agent会话和MCP OAuth会话。A按服务端cursor完成至少一次续页、检查三端覆盖，再检查各来源筛选、详情、已加载缓存搜索及文件回读；B验证工具发现及默认/显式三端调用，使用同账号来源事实核对结果，不要求代理实现本地缓存或文件功能。两边都必须核对实际记录/来源，不能只看HTTP200或JSON-RPC成功。

令牌刷新、登录/退出及同ID歧义由上述具名兼容/定向测试覆盖，不强制远端等令牌自然过期或重走真实短信。缺任一会话、数据或服务端能力时，只将对应分支记为 `NOT_RUN`，继续其他检查；AC-07 A/B均有通过证据前，不能宣称两种MCP路径已完成兼容验收。此前直接调用GoServer远程MCP的证据不能替代本次Agent代理路径。

既有 `scripts/smoke-mcp-stdio.mjs` 默认运行npm latest且只做基础调用，不能单独证明本次源码；`scripts/e2e/mvp-smoke.sh` 包含安装器等较宽范围，不作为本次执行入口。没有测试账号、数据或目标环境能力时，记录AC-07相应分支未完成，不以mock或此前GoServer远程MCP结果替代。

本次不运行 `go test ./...`、完整MVP/安装器测试、跨OS安装矩阵、历史发布回归或真实Webhook发送。只运行本表及本次直接修改的旧断言；失败定位后的补测仍限定对应模块。用户本次定向范围优先于仓库旧文档的全仓测试默认。

## 5. 完成标准与执行记录

- [x] 本地Agent按方案B打通第2节流程，Web/App/PC筛选均可用，保留来源及既有有效会话。
- [x] 第1节兼容矩阵逐项对应PASS证据；AC-01～08及AC-07 A/B完成，既有mobile/desktop调用与新用法均通过。单元测试不能代替两条真实进程路径。
- [x] 没有为本期新增复杂安全模块、额外业务限制或无关重构。
- [x] 仅本期修改留在工作区；临时导出/夹具与进程按本次运行清理，正常账号数据不受影响。
- [x] 报告代码、测试、真实联调、Git和发布状态；生产配套核对、实际发布及客户端升级另行记录，未发布不写为已对使用方生效。

**2026-11-05计划编写：** 已只读核对当前Agent代码和GoServer方案B交接，确定上述首版范围；自审补齐本地工具/OAuth代理分支区别及对应验收要求，计划引用和修改范围检查通过。仅新增本计划；尚未实施、未运行功能测试、未提交/推送或发布。下一步是用户授权后从T01开始，逐项记录实际测试命令与结果。


**2026-11-05兼容复审：** 已将MCP/Auth/OAuth代理/CLI及配置兼容要求落为矩阵，并补齐12个现有具名回归函数、两条串行真实MCP路径、同账号刷新保留缓存和先服务端后Agent的配套顺序。按“入口→会话→发现→查询/分页→详情→搜索/导出→旧调用兼容”逐项自审，计划覆盖首版功能闭环，未发现需要增加复杂模块的缺口。结论仅为 **计划自审通过**；兼容实现和运行验收仍待实施，不承诺尚未验证的零回归。本轮仅完善本计划，未改代码、测试或配置，未运行功能测试，未提交/推送或发布。


## 6. 2026-11-05 实施、定向验收与自审结果

用户已授权按本计划实施及测试。T01～T06完成，Git仍为基线 `fd1ab862e48c176ebbf022cda211954497f54792` 上的未提交改动；本节覆盖前文“未实施”的历史状态。本次没有Git写操作、发布、部署或其他仓库源码修改。

### 实施结果

- API、CLI及本地MCP接受Web，省略平台时不发送该query；使用服务端原cursor，保留各条实际来源。
- 本地内容权限统一按账号内容语义检查，兼容两个旧scope；刷新后的重试沿用相同检查，原凭据scope不被改写。
- 缓存保留“来源＋ID”键并绑定当前AccountID；三端同ID各自保留，同账号令牌轮换不清空，切换账号/退出后不能检索旧缓存。
- 模型结果、详情、本地草稿和导出支持Web；来源歧义时提示明确选择mobile/desktop/web。19个工具名称与顺序保持，4个工具移除platform必填项。
- Auth/OAuth登录、凭据存储、刷新实现、远程代理及MCP分支选择的生产代码保持；CLI内容参数按本期范围调整，原显式mobile/desktop调用通过。
- 双语README、npm README、工程规则及canonical Skill同步；npm/OpenAI/Claude三份Skill副本一致。README明确是未发布源码增量，未将0.2.16宣称为已支持本次本地适配。

### 验收结果

| Case | 结果 | 实际证据 |
| --- | --- | --- |
| AC-01 | PASS | API默认/三端参数、cursor及来源传递；服务端歧义错误保留，指定Web后可读取 |
| AC-02 | PASS | 本地Schema/validator及19工具名；auto/local/remote六组组合；代理保留来源、cursor和JSON-RPC ID |
| AC-03 | PASS | 三种内容scope、资料权限拒绝及刷新后权限检查；12个既有Auth/OAuth/代理具名兼容用例 |
| AC-04 | PASS | 三端同ID缓存、全来源/Web搜索、同账号刷新保留、换号/退出清理；真实本地会话也完成加载后搜索 |
| AC-05 | PASS | Web/省略平台的模型结果、来源提示、草稿和导出；真实文件与服务端投影对应，模型结果保留合成标记 |
| AC-06 | PASS | CLI默认/显式三端查询及导出参数、实际返回来源；既有字段命令、列表/导出/校验用例通过 |
| AC-07A | PASS | 当前候选二进制 → 本地MCP工具 → note-test；17次JSON-RPC请求、23项检查，进程exit0、stderr0 |
| AC-07B | PASS | 同一候选 → OAuth远程代理 → note-test；12次JSON-RPC请求、16项检查，进程exit0、stderr0 |
| AC-08 | PASS | Skill同步及 `--check`，文档相关说明/引用、格式和差异检查 |

**具名检查共43个（函数去重）：** 13个 `TestAccountContent...` 新用例、17个直接受影响的原用例、12个计划指定的Auth/OAuth/代理原用例，另1个既有 `TestInitializeAndToolsList` 核对全部工具名称与协议。所有命令均 `GOMAXPROCS=1`、`-p=1 -parallel=1 -count=1`；使用已有Go1.26.5和Node22.18.0。精确选择器/结果记录在 `.tmp/account-content/{new-command,affected-command,compat-command}.json`、对应日志以及 `review-checks.log`。未执行整包/全仓测试、安装器或历史专项。

首次新增断言在原代码上复现Web/省略平台被拒绝（`red.log`）；实现后通过。直接冲突的旧断言同步为真正非法来源：`TestListMemoriesRequiresPlatform` 更名为 `TestListMemoriesRejectsUnsupportedPlatformAndLimit`，缓存校验测试更名为 `TestSearchMemoriesRequiresQueryAndValidOptionalPlatform`；API/模型IO中的Web负例及MCP缺平台负例也已修正并具名复验，未以只测新用例掩盖旧测试失败。

### 真实测试服与清理

- 实际联调目标 `https://note-test.patch-x.cn`，当时运行revision `84dc85ee567fa0a1f5766bfe00eae8dd30348a07`。这是现场核对版本，不沿用前一轮GoServer任务的旧revision，也未重新部署。
- 使用1个专用合成账号，三端各1条公开BYOK adapt生成的可读模型结果；本地路径使用旧mobile内容scope的Agent会话，代理路径使用统一内容scope的OAuth会话。OTP挑战/终态投递为受控夹具，账号校验/会话签发、内容adapt及OAuth授权换token走真实公开接口；真实短信及付费AI/ASR均未调用。
- 测试准备通过临时Go overlay复用既有GoServer夹具，在Agent的ignored工作目录构建；未写入GoServer源码。临时测试profile位于专用隔离目录，不覆盖用户原有登录、MCP配置或profile。
- 第一轮脚本用合成正文词搜索元数据缓存，及假定服务端草稿Markdown包含原模型正文，均不符合当前既有投影。已改为检索确实返回的 `event_summary` 元数据，并逐项校验草稿文件等于渲染响应、导出模型结果保留合成标记；这是验收断言修正，未改变搜索/渲染业务范围。原报告保留；最终A/B均PASS。
- 验收后走正式账号注销，active安装/Agent会话均为0，合成SMS投递夹具删除；正常注销账号及审计/账务/被引用身份历史保留。原用户安装记录摘要、运行配置及API/Worker PID和restart保持。
- 本地/远端临时凭据包、两个测试profile、验收二进制及9份合成导出文件已清理；MCP进程均退出。只保留脱敏报告、源码辅助材料、合同快照及文件校验摘要。

证据目录：ignored `.tmp/account-content/`。汇总 `verification.json`；真实路径 `local-final/report.json`、`remote/report.json`；准备/清理 `fixture-report.json`、`cleanup-report.json`、`runtime-before.json`、`runtime-after.json`、`export-cleanup.json`。主代理自审为 **PRIMARY_SELF_REVIEW_PASS**，不是独立评审。

### 工具合同交接与发布状态

本地 `tools/list` 快照及摘要位于 `.tmp/account-content/local-final/tool-contract.json`、`tool-contract-handoff.json`，给GoServer维护方的候选简表为 `.tmp/account-content/local_tools_19.candidate.json`。对照的服务端文件是 `internal/remotemcp/testdata/local_tools_19.json`，其测试已明确把旧本地快照的platform必填差异视为兼容变化；本次提供四处必填项差异供后续同步，没有改动该仓库或重跑其模块。

**本次结论仅为Agent实现、定向检查和两条测试服路径通过。** 生产合同配套、实际npm/GitHub发布、使用方升级和平台UI验收尚未执行；需先确认目标GoServer支持方案B，再按后续发布授权更新Agent，最后刷新客户端工具列表。功能验收时的Git改动随后获得用户提交推送授权，按第7节收口；npm/GitHub发布仍未授权或执行。


## 7. 2026-11-05 本期Git交付

用户追加授权“提交推送agent仓库的改动，保持工作区干净”。本轮沿用 `codex/workbuddy-connector-package`，普通推送到 `origin/codex/workbuddy-connector-package`；不切换分支、不改写已发布历史、不发tag或npm/GitHub Release。

提交前将42个本期文件与第6节验收清单的SHA256逐项核对，全部一致；仅追加本节及当前Git状态说明。43个具名检查和两条真实MCP路径证据保持，不重复运行未变化的业务测试。本轮复核提交范围、差异及文档，忽略目录中的凭据/夹具/原始运行材料均不纳入提交。

精确commit/tree、推送前后远端SHA、验收证据校验值和工作区状态记录于ignored `.tmp/account-content/git-closeout.json`；远端SHA核对一致且工作区为空后才完成Git交付。本次代码推送不代表npm发布、生产配套或平台UI验收通过，后续发布仍按第1节的服务端配套顺序执行。
