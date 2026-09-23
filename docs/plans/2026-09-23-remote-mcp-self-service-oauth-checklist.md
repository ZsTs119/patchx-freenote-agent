# 远程 MCP 通用自助接入 Checklist 计划

**日期：** 2026-09-23

**状态：** 本地功能闭环完成；计划内定向测试与 Codex CLI OAuth 凭据验收通过。Go Server `5579ec9` 已提交、推送并核验远端一致；待用户部署。

**目标：** 支持标准 DCR/OAuth 客户端通过远程 MCP URL 自助注册、登录授权和调用工具，同时保留本地 Agent、WorkBuddy 与 Coze 接入。

**实施仓库：** `/home/zsts_119/patchxNoteGoServer`；本文件保存在当前 Agent 仓库 `docs/plans`。

**实施方式：** 主 Agent 串行执行。用户于 2026-09-23 追加授权提交、普通推送并保持工作区干净，同时确认两份既有历史计划单独提交推送；部署由用户执行。

## 1. 已确认范围

- 通用自助接入是默认能力，用户不需要联系我们逐个平台登记 OAuth 客户端。
- 本地 Codex 等客户端、云端 AI 平台都可以远程直连；原有本地 Agent / stdio 路线继续保留。
- WorkBuddy、Coze 的特殊接入用于平台兼容与审核，继续保留，但不决定通用入口的回调规则。
- 运行时只改 Go Server，不要求修改或重新发布 Agent/npm 包。
- 本轮以现有 DCR + Authorization Code + PKCE 闭环为交付范围。通用动态注册使用 public client；Coze 继续使用既有 confidential client 路线。CIMD 不纳入本轮，也不宣称仅支持 CIMD 的客户端已经兼容。
- 复用现有登录、授权、scope、令牌和工具体系；保留必要的回调匹配与 PKCE 校验，不新建安全平台、审批系统、复杂策略模块或额外限制模块。
- 不新增平台准入白名单、人工审核、注册配额、风控或通用策略引擎。必要的回调匹配、PKCE 和未登录拒绝沿用现有 OAuth 流程，不另立安全建设任务。
- 不新增 MCP 业务工具，不改 App/PC 登录、硬件、计费、模型执行和内容处理；不处理 GitHub 下载、安装器、渠道审核或上架。

## 2. 当前问题与依据

2026-09-23 已实测生产入口 `https://freenote.patch-x.cn/mcp`：健康检查、初始化和工具发现成功；使用 `/callback` 或 `/callback/<id>` 的 loopback 地址进行动态注册，返回 `400 invalid_redirect_uri`。当前本地 stdio 账户和记录查询成功，这不代表远程新用户授权成功。

Go Server `50ff503`（2026-09-07）新增 DCR 时即采用 WorkBuddy 专用回调规则；`RegisterClient` 还固定使用 WorkBuddy 的客户端来源、ID 前缀和默认展示名称。原有预注册客户端与本地 Agent 授权没有被删除。编写计划时 Go Server HEAD 为 `ec0176d`，实施前刷新实际基线。

## 3. 实施 Checklist

### A. 通用注册与回调

主要文件（以下代码路径均相对 Go Server）：

- `internal/agentoauth/service.go`
- `internal/agentoauth/http.go`
- `internal/agentoauth/repository.go`
- `internal/agentoauth/domain.go`（仅在返回类型或字段确需调整时修改）

- [x] 先补能复现问题的定向用例：Codex loopback 注册、带不同路径的通用 loopback 注册、通用 HTTPS 回调注册。新增入口统一为 `TestGenericMCPRegistration` 和 `TestGenericMCPRegistrationHTTP`，各地址变体用表驱动子用例覆盖。
- [x] 将通用 DCR 回调校验与 WorkBuddy 私有协议适配分开；通用客户端不需要冒充 WorkBuddy 或命中特定产品名称。
- [x] 支持本机 loopback 回调，包括 `127.0.0.1`、`[::1]`，并兼容现有 `localhost`；支持 `/callback`、`/callback/<id>` 等实际路径，覆盖无端口登记后在授权时使用动态端口的客户端行为。
- [x] 支持云端客户端登记合法 HTTPS 回调，无需逐个平台硬编码域名或路径；登记后授权与换令牌仍匹配该客户端的回调，本机端口按标准处理。
- [x] 更新旧测试中把合法通用回调当作错误的断言；保留真正的回调不匹配等失败用例，避免旧渠道规则继续阻止通用接入。
- [x] 为通用动态注册使用中性的来源、ID 前缀和默认展示名称；保留已有 WorkBuddy client_id、来源与固定客户端，不迁移或失效化已有连接。
- [x] 核对客户端持久化和重复注册复用逻辑，通用客户端不误复用 WorkBuddy/Coze 客户端；只做支持本轮所需的最小调整。

现有客户端表的来源字段不是渠道枚举，原则上复用现有表结构。只有实际约束阻止本轮功能时才增加迁移，不预先新增表或配置体系。

### B. 发现、授权与令牌闭环

主要文件：`internal/agentoauth/http.go`、`service.go`；`internal/remotemcp/handler.go` 仅在实际发现必要兼容问题时修改。

- [x] 核对并修正 OAuth 发现信息：protected resource 的 `authorization_servers` 与授权服务器 `issuer` 对齐，客户端能按标准发现 registration / authorize / token 端点；兼容现有根路径和带前缀部署。
- [x] 新客户端完成 `发现 → DCR 注册 → 浏览器登录授权 → callback → token`，无需维护者提前创建 client_id。
- [x] 使用新客户端完成 MCP `initialize`、初始化通知和 `tools/list`；使用它本次取得的令牌成功调用 `patchxnote_get_current_user` 与 `patchxnote_list_memories`，后者参数为 `{"platform":"mobile","limit":1}`；合法空列表也算调用成功，不借用已有已登录连接作为新登录证据。
- [x] 同一客户端完成一次 refresh，并用新令牌再次调用账户工具；撤销后再次访问返回未授权。
- [x] 保留现有浏览器登录页和授权交互；注册成功不代表用户已经授权，不因自助注册跳过登录。

### C. 直接相关兼容

- [x] WorkBuddy：旧、新品牌私有协议回调和现有 loopback 路线继续通过注册、授权与换令牌，不要求更换既有连接器。
- [x] Coze：既有预注册客户端、client_secret 与已限定的 PKCE 兼容继续可用；通用客户端不套用 Coze 的特殊分支。
- [x] 本地 Agent：用既有预注册客户端的定向 OAuth 用例确认 loopback 授权可用，再用现有 stdio 连接完成一次账户与记录查询；不重新安装、不跑 Agent 全套测试、不重复进行多端登录验收。

### D. 直接相关合同与说明

- [x] 更新 `openapi/openapi.yaml` 中受影响的 OAuth 注册/发现描述与示例，去除“公共 DCR 仅限 WorkBuddy”的表述。
- [x] 同步对应 OpenAPI changelog、Apifox 生成物和 `docs/integrations/apifox/shared/integration-guide.zh-CN.md` 的受影响段落；涉及契约版本变化时同步直接相关版本断言。
- [x] 在说明中区分通用 DCR 自助接入、本地 Agent，以及 WorkBuddy/Coze 平台适配；如需更新 Agent 文档，仅改对应接入说明，不触发 npm 发布。

## 4. 测试范围与执行

只验证本次修改函数、完整接入链路和直接相关兼容。测试串行执行；同属一个 Go package 不代表全部用例都需要运行。用例通过后停止扩测，除非新改动或失败需要复验。

| 检查 | 最小通过标准 | 落点 |
| --- | --- | --- |
| 通用注册 | loopback、HTTPS、非产品固定路径通过；来源与客户端记录正确 | `internal/agentoauth/service_test.go`、`http_test.go` |
| 必要失败路径 | 回调不匹配、PKCE 不匹配、无令牌调用仍被拒绝；复用既有用例 | `internal/agentoauth/*_test.go`、`internal/remotemcp/handler_test.go` |
| 数据库存储 | 新通用客户端可保存/读取/复用，不误复用已有渠道客户端；复用现有隔离 schema | `internal/agentoauth/repository_integration_test.go`；仅新增通用存储用例 |
| OAuth 到 MCP | 对真实 Go Server 和隔离数据库，以 loopback、HTTPS 各走一条注册、授权、token、两项工具调用链路；refresh/revoke 只覆盖其中一条 | `tests/smoke/agent-access/remote_mcp_oauth_test.go`（新增独立顶层用例，不 Mock token/MCP 响应） |
| Codex 实际直连 | 全新远程 MCP 配置自助登录成功，账户和记录工具调用成功 | 当前实际 Codex 客户端；登录页仅使用指定 `@chrome` |
| 既有接入回归 | WorkBuddy 旧/新回调、loopback 及 Coze 既有 OAuth 流程的定向用例通过；本地 Agent 查询一次 | 本节限定用例与现有 stdio 连接，不复测渠道后台配置/准备/审核 |

通用 HTTPS 链路是本轮服务端功能的必测项，不绑定某个云端品牌或平台账号。真实云端平台有现成可用入口时，可补一次同样的登录与调用，作为该平台验收单独记录；不为本轮注册新平台、申请审核或把平台账号准备列为服务端功能完成的前置条件。没有真实平台证据时，只报告通用 HTTPS 协议链路通过，不报告该平台已验收。

### 4.1 定向命令

以下命令在 Go Server 仓库执行，属于实施阶段；编写本计划时不运行。使用仓库要求的 Go 工具链。

```bash
# 通用注册、发现、既有本地授权与必要失败用例；不整包运行。
# 前两个 TestGeneric... 是本计划要求新增的测试函数。
oauth_cases='TestGenericMCPRegistration|TestGenericMCPRegistrationHTTP|TestRegisterClientRejectsInvalidMetadata'
oauth_cases+='|TestAuthorizationCodeTokenAndMCPAuthenticationFlow|TestAuthorizeAllowsConfiguredLoopbackPort'
oauth_cases+='|TestAuthorizeRejectsLoopbackPortPathMismatch|TestTokenRejectsPKCEMismatch'
oauth_cases+='|TestProtectedResourceMetadataUsesPublicPathPrefix|TestAuthorizationServerMetadata|TestAuthorizationServerMetadataWithPublicPathPrefixIncludesRegistrationEndpoint'
GOMAXPROCS=1 go test -p=1 -parallel=1 ./internal/agentoauth \
  -run "^(${oauth_cases})$" -count=1 -v

# 只回归共用注册/授权逻辑直接影响的 WorkBuddy 和 Coze 用例。
compat_cases='TestRegisterClientValidWorkBuddyRequestReturnsPublicClient|TestRegisterClientAcceptsWorkBuddyLoopbackFallback'
compat_cases+='|TestRegisterClientUsesDefaults|TestRegisterClientReusesDuplicateWorkBuddyRegistration|TestRegisterClientDoesNotReuseFixedWorkBuddyFallback'
compat_cases+='|TestRegisteredDynamicClientCanAuthorizeWithExactWorkBuddyCallback|TestRegisteredPatchXFreeNoteClientCallbackFlow'
compat_cases+='|TestCozeHTTPAuthorizeAndToken|TestCozePKCECompatibility'
GOMAXPROCS=1 go test -p=1 -parallel=1 ./internal/agentoauth \
  -run "^(${compat_cases})$" -count=1 -v

# 仅远程 MCP 的发现、鉴权和基础读取，不运行其他工具业务测试。
GOMAXPROCS=1 go test -p=1 -parallel=1 ./internal/remotemcp \
  -run '^(TestHandlerInitializeAndToolsListArePublic|TestHandlerToolsCallRequiresBearerChallenge|TestHandlerToolsCallAuthenticatesBeforeToolDispatch|TestHandlerCallsReadTool)$' -count=1

# 配好现有隔离测试配置 PATCHNOTE_SMOKE_CONFIG 后，只验证通用注册存储。
# 此函数是本计划要求新增的数据库测试，包含与已有渠道记录的区分。
GOMAXPROCS=1 go test -p=1 -parallel=1 -tags=integration ./internal/agentoauth \
  -run '^TestRepositoryRegisterGenericClient$' -count=1 -v
```

- [x] 确认上述每个新增测试已存在并实际运行；`no tests to run` 不算通过。现有测试若因实现调整而改名，同步修改筛选，不扩大到整个包。
- [x] 确认数据库集成测试实际执行，缺少配置导致 `SKIP` 不记为通过；复用现有隔离 schema 准备方式，不使用生产用户数据。
- [x] 新增独立 `TestRemoteMCPSelfServiceLive`，只准备本次必需的登录状态、OAuth 客户端与 API 运行环境，复用现有 testkit 和隔离数据机制。HTTPS 回调可由协议测试驱动接收授权响应并继续换 token，无需新增回调代理服务。
- [x] 使用可独立执行该测试的最小入口；只构建/启动真实 API、隔离数据库及 API 已有必需依赖。测试准备所需的迁移、账号数据不扩展成迁移兼容或 OTP 业务回归。
- [x] 环境准备完毕后只运行该顶层测试：`GOMAXPROCS=1 go test -p=1 -parallel=1 -tags=smoke ./tests/smoke/agent-access -run '^TestRemoteMCPSelfServiceLive$' -count=1 -v`。实施时记录该独立用例所需的 API 地址和隔离配置；沿用现有环境变量命名，不为配合通用 runner 补齐无关服务。

当前 `agent-access` 顶层冒烟包含 OTP、硬件卡、额度、用量等业务用例，`record` 函数也没有读取 case filter；通用 `run-module.sh` 还准备 worker、smokeproxy 和 Lite 模型包。因此不直接运行该完整入口，也不把改造通用 runner 列为必做任务。若确实无法复用现有入口，只增加本次 OAuth 用例所需的最小调用方式，不重构测试框架。

**不默认执行的同包用例：** 登录页样式和按钮测试、public base 配置开关测试、`TestWorkBuddyFallbackClientMigration`、`TestCozeRepositoryPreparationAndOAuth`（包含客户端准备、绑定及迁移往返）、其他 Agent 工具业务测试。若本轮确实修改了对应实现，才补其直接受影响用例并记录原因；若修改 `RegisterClient` 的数据库复用逻辑，可追加现有 `TestRepositoryRegisterClientPersistsAndReusesWorkBuddyClient`，不追加整套存储测试。

合同文件发生变化时，只补直接受影响的 OpenAPI/Apifox 生成一致性和文档检查。**不运行全仓 `go test ./...`、完整 `make ci`、全模块 smoke、负载/长稳测试或其他平台的重复验收。** 正式发布如需执行既有发布门禁，单独列入获授权的发布任务，不算本轮功能测试。

## 5. 完成标准与交付记录

- [x] 通用 DCR、授权、token、工具调用和会话续用形成闭环，通用回调不再被 WorkBuddy 规则挡住。
- [x] Codex 实际新登录和通用 HTTPS 对真实服务的完整协议链路通过；额外云端平台验收单独记录，不混入服务端功能完成条件。
- [x] WorkBuddy、Coze 和本地 Agent 的本计划相关回归通过；不重新跑平台审核、全部工具或不相关业务。
- [x] 自审确认代码仅覆盖计划范围，测试结果与尚未验证的项目如实记录；不把自审写成独立审查。
- [x] 交付列明实际修改文件、运行命令、测试结果、实际客户端版本和目标环境；只记录状态与数量，不记录验证码、令牌或用户正文。
- [x] 若 Codex 实际验收缺少账号、Chrome 连接或可用环境，继续完成代码与定向测试，将该必要验收记为未完成，不用工具发现替代通过。额外云端平台未验证只影响该平台的验收记录。

**状态分开记录：** 本地实现及测试 / 实际客户端验收 / 部署及生产验收。实现完成不代表线上已修复；部署只在另有明确授权后执行。本计划以功能闭环为完成条件，不新增无关门禁。

## 6. 执行记录

| 项目 | 当前状态 | 后续填写 |
| --- | --- | --- |
| 计划编写 | 完成 | 2026-09-23 |
| 计划自审 | 完成并修订 | 收窄到函数级测试；删除未改动的迁移/客户端准备回归、通用 runner 改造和未指定云端平台账号前置要求 |
| Go Server 实施 | 完成，已提交推送 | 基线 `ec0176d` → `5579ec9`；通用注册、回调与发现、授权码消费时间顺序已实现；OpenAPI/Apifox/shared 指南已同步 |
| 定向测试 | PASS | OAuth 10 项、渠道兼容 9 项、Remote MCP 4 项、数据库 1 项，共 24 个顶层用例，无 SKIP；包含实际修改的旧校验断言与时钟差回归 |
| Codex 实际验收 / 通用 HTTPS 闭环 | PASS（隔离测试账户） | Windows Codex CLI 0.120.0 自助注册、回调、换令牌、原生凭据存储成功；使用该次凭据完成两项工具调用。scope `r029172a9eef1` 的 loopback/HTTPS 实服务闭环通过 |
| 额外云端平台验收 | 非必选，未执行 | 有现成入口时补充，不代表平台已通过 |
| 相关兼容回归 | PASS | WorkBuddy/Coze 限定 OAuth 用例通过；本地预注册授权用例通过；现有 stdio 账户/手机端记录查询各一次通过 |
| 提交、推送、部署 | Go Server Git 交付 PASS；部署未执行 | `codex/backend-implementation` 的本地 HEAD、origin 引用和远端分支一致；本清单随 Agent 文档提交，两个仓库最终核验记录见 ignored `artifacts/remote-mcp-self-service/git-closeout.json` |

### 实施结果与证据边界

- 先取得通用注册行为 RED，再完成 GREEN。主要运行时代码仅涉及 `internal/agentoauth/service.go`、`http.go`、`repository.go`；无数据库迁移、无新配置开关、无 Agent/npm 运行时变更。
- 通用客户端使用中性 `mcp` 来源和 ID；HTTPS、本机不同路径、无端口注册与动态监听端口通过。WorkBuddy 私有协议、原有客户端记录和 Coze 既有例外保持。
- 真实服务复现了 API 与数据库秒级时间差导致授权码消费失败；仅在 OAuth repository 使用 `GREATEST(consumed_at_input, created_at)` 保持时间顺序，数据库定向用例已覆盖，未修改系统时间或其他模块。
- `TestRemoteMCPSelfServiceLive` 用隔离 PostgreSQL/Redis 和真实 API 通过 loopback、HTTPS 两条链路，覆盖新注册、登录页、授权、token、初始化、工具发现、账户和记录调用，并在 loopback 覆盖 refresh/revoke。仅启动 API；登录夹具由 fake SMS 单次、单并发处理准备，不启动 worker/proxy、不测 OTP 业务。
- Codex CLI 使用独立临时 CODEX_HOME，实际执行 `mcp login` 并成功接收回调、兑换令牌、写入 Windows Credential Manager。指定 Chrome extension 验证了客户端生成的授权页。账户登录与授权由测试驱动经真实 API 完成；随后读取本次 Codex 凭据在内存中完成 MCP 初始化、19 项工具发现、账户与手机端记录调用，空列表正常。此证据不代表真人短信或浏览器表单点击全流程、其他 Codex 版本、其他云端平台或生产已经验收。
- Codex 夹具一度返回 `sms_unavailable`：隔离库内旧 fake SMS 请求先被单次处理，当前请求仍 pending。清理本次测试投递队列后登录通过；未调用真实短信供应商、未消耗线上短信额度、未修改短信模块。
- 原有 stdio 工具查询成功是既有连接的回归对照；候选服务对本地预注册授权的兼容由本计划定向用例验证，不混称为候选 Agent 安装验收。
- 合同检查：`make -j1 apifox-bundle openapi-check` 通过，仍为 254 个 operation；另用 4 种实际通用注册请求/响应逐项通过 OpenAPI schema 验证，生成的 Apifox 响应 schema 同步。自审补齐了响应侧旧 WorkBuddy 回调枚举，未运行全仓 CI、全模块 smoke、负载或无关业务测试。
- 源码自审完成；这是主 Agent 自审，不是独立审查。最终定向复验 24/24，通过的输出与脱敏 Codex 验收摘要位于 Go Server ignored 的 `artifacts/remote-mcp-self-service/`；具体 `-run` 范围见本计划，额外执行的旧校验用例仅因其断言随通用接入调整。
- 测试 API 已停止且核实无残留进程；隔离数据库/Redis、临时服务配置和生成密钥已按 smokectl 清理；Codex 测试凭据已通过 `mcp logout` 删除，Chrome 临时验收页已关闭。
- Windows 临时配置与辅助文件删除被自动审批策略拦截（仅返回 `blocked by policy`，没有更具体原因）；保留临时目录中的无登录凭据文件。未修改用户现有 Codex 配置。
- Go Server 已提交并推送 `5579ec9ceb3be67456b841f1dcb91eb69591c5e7`，远端 `codex/backend-implementation` 与本地一致，工作区 clean。Agent 仅交付本计划文档，另按用户确认单独归档两份既有历史计划；不发布 Agent/npm。
- 本轮未部署。线上需要部署上述 Go Server 后才会获得本次修复；本地功能通过不等于线上更新完成。本次增量没有 migration、运行配置、secret、AI 包或模型路由更新；发布环境仍按既有部署流程验收。
