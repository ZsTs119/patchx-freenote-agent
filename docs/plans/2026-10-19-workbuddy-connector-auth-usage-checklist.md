# WorkBuddy 连接器首次授权与使用闭环 Checklist 计划

**日期：** 2026-10-19

**状态：** 本地实现、候选包与计划内定向验证已完成；用户已提交 WorkBuddy 连接器更新，并授权提交、推送及发布 Agent CLI/npm 0.2.16。CLI 发布进行中，官方效果在更新通过后确认。

**目标：** 用户首次安装连接器后，可以从三句示例中的任意一句开始，完成浏览器授权并继续原任务；后续使用自动续期，重启后保持登录。

**方案：** WorkBuddy MCP 连接器使用 CLI 前置授权，再启动本地 stdio MCP；两者共用现有 Agent 的登录状态和自动刷新能力。

**技术栈：** WorkBuddy `preAuth` / `cli.json`、现有 Go CLI、npm launcher、MCP stdio、渠道打包脚本和 Skill。

**实施方式：** 主 Agent 串行完成；本计划以第一版功能闭环为目标，测试仅覆盖下文列出的模块和场景。

**2026-10-19 执行补充：** 用户明确“本地是本地测试，发布更新通过后才能在官方看效果”。本轮完成本地实现、候选包及定向测试；WorkBuddy 官方导入/更新、真实短信授权、自然语言示例和重启续期效果移到发布后确认。桌面操作已按用户 Esc 停止，不再继续控制界面。

## 1. 已核实的基线

- 连接器源码：`packages/workbuddy/patchxnote-agent/`。
- 当时指定上传的生产包：`dist/channels/workbuddy/production/0.1.0/PatchXFreeNote-workbuddy-connector-0.1.0.zip`，19,976 字节。
- 该包的 `source=patchxfreenote`、展示名和三句示例与用户截图一致；来源见 [原打包记录第 12 节](2026-09-14-unified-channel-package-checklist.md#12-workbuddy-新连接器身份与服务端回调2026-09-14)。尚未从平台后台下载当前上架包做内容比对。
- 本地 ZIP 是 `0.1.0`；源码 metadata 已是 `0.1.1`，实施时以实际平台版本确定新版本号。
- 现有包采用远程 `streamableHttp`，没有 `cli.json` / `preAuth`；Skill 限制本地 `npx`，鉴权失败主要引导界面重连。
- 工具发现、常用工作流、GitHub/npm/飞书链接已经存在；缺少完整的首次授权、令牌续期、失败恢复和任务接续说明。
- CLI 已有 `mcp login/status/logout/serve`、本机回调、原生凭据存储与自动刷新。服务端默认访问令牌为 15 分钟、刷新令牌为 720 小时；实际运行以返回的到期时间为准。
- 生成器当前固定写入远程 URL；WorkBuddy 校验器拒绝 `cli.json`、stdio 和 `preAuth`。Coze 渠道还复用 WorkBuddy 的 Skill 源文件，需要在调整时解除这部分耦合。

本轮只交付 WorkBuddy 桌面连接器的授权、使用说明和可验收包，优先验收用户当前的 Windows WorkBuddy。复用现有服务端 OAuth 和业务工具，不增加新业务工具，不扩展服务端认证方案，也不另建安全、审批或策略模块。其他平台及其他业务模块不作为本轮验收项。

## 2. 第一版执行路径

```text
用户点击连接或任一示例
  → WorkBuddy 准备 CLI 运行环境
  → 检查 workbuddy 配置档案的登录状态
  → 未登录时由 CLI 输出授权链接，WorkBuddy 打开浏览器
  → 用户完成授权，CLI 接收回调并保存凭据
  → 启动使用同一配置档案的 mcp serve
  → 验证账户和记录读取，继续用户原来的查询或整理
```

[WorkBuddy 官方文档](https://open.workbuddy.cn/docs/connector)于 2026-10-19 核对：MCP 顶层 `preAuth: "cli"` 自 5.0.0 起支持；`authWaitForExit` 可保留认证进程。本轮先验证该组合的本地命令链路，WorkBuddy 实际调度效果在更新通过后确认。

**执行顺序：** 先完成 A 的配置和 D 中使候选 ZIP 可生成的必要适配，再补齐 B/C，并通过本地模拟服务验证 CLI 授权、同 profile 的 MCP 调用及恢复。真实 Windows 候选验证启动和公共 MCP 协议；发布后再验证 WorkBuddy 的实际调度，不重复跑无关模块。

### A. 接通 CLI 前置授权和 MCP

涉及文件：

- `packages/workbuddy/patchxnote-agent/mcp.json`
- 新增 `packages/workbuddy/patchxnote-agent/cli.json`
- `packages/workbuddy/patchxnote-agent/connector-meta.json`

- [x] 记录目标 WorkBuddy 的实际版本；新包声明 `minWorkbuddyVersion` 至少为 `5.0.0`，保持连接器 `source=patchxfreenote`。
- [x] 保持连接器类型为 MCP；`mcp.json` 配置顶层 `preAuth: "cli"` 和单个 stdio MCP，启动现有 `mcp serve`。
- [x] 所有安装后命令统一使用 `--profile workbuddy`、`--server-base-url https://freenote.patch-x.cn`，并在 WorkBuddy 启动 MCP 的同一操作系统和用户环境执行。OAuth 客户端沿用 CLI 的默认值，与 `mcp serve` 保持一致；连接器 `source` 不用作 OAuth `client_id`。
- [x] stdio 配置复用现有 `PATCHXNOTE_MCP_MODE=remote`，明确通过本地 CLI 凭据代理生产 MCP，避免缺少凭据时自动进入另一套本地登录模式；不新增运行模式。
- [x] `cli.json` 声明所需 Node 运行时；安装阶段完成 npm wrapper 和其对应原生二进制的准备，避免认证阶段承担首次下载。实际核对 auth/status/MCP 子进程都能找到同一个安装版本，不仅检查终端的 PATH。
- [x] 优先复用已发布 CLI，记录实际选用版本并固定到包的安装配置。若最小适配必须改 CLI，明确标出配套版本的发布依赖，不能用本地源码通过代替用户可取得的版本通过。
- [x] 登录使用 `mcp login --no-browser`，由 WorkBuddy 读取链接并打开浏览器；设置 `authUrlDomain` 和 `authWaitForExit`，验证输出链接后回调进程仍存活，等待时限与客户端一致。
- [x] 状态检查使用 `mcp status --output json`，按 `authenticated` 字段匹配；正常轮询不使用会刷新或访问服务的 `--verify`。这个结果只表示本地凭据可尝试复用，服务端是否接受仍由账户工具确认。
- [x] 退出调用同一配置档案的 `mcp logout`；stdio 启动与 auth/status/unAuth 能找到同一安装版本。Windows 命令启动方式按实际 launcher 行为验证。
- [x] 本地走通“未登录 → 授权链接提取 → 回调 → 同 profile 的账户/记录工具成功”；核对候选 ZIP 的实际配置。此项使用模拟 OAuth/MCP 服务，不声明 WorkBuddy 界面或生产账号已验收。

CLI 调度的既有命令对应关系如下，公共参数按上面的同一配置档案和服务地址传入：

| WorkBuddy 动作 | CLI 命令 | 期望 |
| --- | --- | --- |
| 安装准备 | npm 安装指定版本，再执行 `patchxnote-agent install` | 原生二进制已经可启动 |
| auth | `patchxnote-agent mcp login --no-browser` | 输出链接，等待回调并保存登录状态 |
| status | `patchxnote-agent mcp status --output json` | 快速返回状态，不触发登录或续期 |
| unAuth | `patchxnote-agent mcp logout` | 清理本连接的登录状态 |
| MCP | `patchxnote-agent mcp serve` | 读取同一凭据，通过 stdio 提供工具 |

### B. 登录状态、恢复和任务接续

优先复用既有实现；必要适配落在 `internal/cli/{mcp,mcp_login}.go`、`internal/oauthflow/{callback,refresh,store}.go`、`internal/remotemcp/proxy.go`。npm launcher 只有出现实际启动问题时才进入修改范围。

自审发现两个现有行为需要明确处理：`mcp status` 主要判断本地刷新凭据的到期时间，普通 `mcp login` 可能复用已被服务端撤销的凭据；`Proxy.forward` 当前可能将取令牌过程中的网络错误也返回为 `auth_required`。实施只围绕下列恢复分支验证和作必要修正。

- [x] 无凭据时启动一次授权；已有可用登录状态时直接执行原任务，不重复弹窗。
- [x] 访问令牌过期但刷新令牌有效时，使用现有自动刷新并保存轮换结果；不把 15 分钟解释成每 15 分钟重新登录。
- [x] 刷新凭据过期或服务端明确判定失效时重新授权；本地尚未到期但已经失效的情况走 `mcp login --force`，使用相同 profile/服务地址，成功后替换凭据，避免再次返回“已经登录”。由前置认证调度时带 `--no-browser`；由 Skill 执行 CLI 恢复时使用可真正打开浏览器的同环境登录入口。
- [x] 暂时网络失败返回可识别的连接/重试提示，保留已有登录状态；必要时修正代理把此类错误统一转成 `auth_required` 的分支，不增加通用错误处理框架。
- [x] 用户取消或等待超时时停止本次等待，说明当前阶段和重试方法；重复点击不连续打开多个登录流程，优先沿用 WorkBuddy 的认证调度。
- [x] 本地验证同 profile 的 stdio 调用读取到新凭据并接续工具任务；Skill 明确官方连接恢复后再验证账户，未恢复时只重连当前连接器。实际 WorkBuddy 接续效果移到第 5 节，未用终端或 status 结果冒充通过。
- [x] 本地新 CLI 命令实例复用同 profile 的夹具凭据，退出后可重新授权；WorkBuddy 实际重启保持移到第 5 节。切换账号沿用“退出 → 登录 → 核对当前账号”的说明，不新增账号管理功能。
- [x] 区分安装失败、浏览器未打开、等待授权、回调超时、令牌交换失败和工具调用失败，提示具体下一步。
- [x] 区分账号授权、连接器绑定和记录为空；旧测试地址或另一条本地 MCP 只提示其来源，不把它的登录状态算到当前连接器上。

继续使用现有凭据存储；验证码由用户在浏览器填写，不进入聊天或包文件。这部分沿用已有机制，不新增安全流程。

### C. Skill、工具指引和三句示例

涉及文件：`packages/workbuddy/patchxnote-agent/skills/patchxnote-mcp/SKILL.md` 及其 `references/onboarding.md`、`workflows.md`、`troubleshooting.md`、`source-of-truth.md`；示例位于 `connector-meta.json`。

- [x] 主 Skill 写明最短操作顺序：确认当前连接 → 必要时前置授权 → 真实工具验证 → 继续原任务。删除与新接入方式冲突的“不要使用本地 CLI”说明。
- [x] 授权参考说明两种令牌及到期字段，分别指导复用、自动刷新和重新授权；正常状态判断由程序完成，Skill 不自行推算或搬运令牌。
- [x] 故障参考覆盖 B 的恢复分支，不把所有错误都归结为“去界面重连”。
- [x] 按实时工具列表补全“用户需求 → 工具 → 关键参数 → 下一步”的简明说明，补上设备卡、额度、模型用量和 Webhook 模板指引；参数以实际 schema 为准，不固定工具数量。
- [x] 给出列表 → 获取真实记录 ID → 详情/整理结果 → 输出的例子，明确 `platform`、`memory_id`、`cursor` 等关键参数；“最近一次”先查列表，不假定已有选中记录。
- [x] 第三句必须取得可读的整理内容。可复用 `patchxnote_render_webhook_message` 返回的 Markdown；只有标题、ID 或元数据不算完成。当前 stdio 是远程代理，草稿工具仍返回内容，不传远程不支持的 `save_draft=true` / `out`，直接展示可复制笔记，不增加文件导出功能。
- [x] 记录为空时说明暂无记录；分页、手机端/桌面端和草稿输出按既有能力处理。三句示例只使用账户、记录和必要的整理/草稿流程。
- [x] 保留仓库、npm、飞书及接入页链接，说明版本差异或故障排查时查阅；日常授权和使用所需步骤在包内完整提供。
- [x] 使用下面三句中文示例，并同步英文含义。第一句已有登录态时复用，不强制重新打开浏览器。

1. 帮我登录并连接 PatchX Freenote，打开浏览器让我完成授权，然后检查连接是否成功。
2. 帮我查看最近的手机端录音总结；如果尚未登录，请先引导我完成授权。
3. 帮我把最近一次手机端录音总结整理成可复制的笔记；如果尚未登录，请先引导我完成授权。

### D. 打包、旧用户接续和交付

涉及文件：`packages/distribution/channels.json`、`scripts/package-channel.mjs`、`scripts/validate-workbuddy-connector.mjs`，以及上面的连接器文件。

- [x] 将 `cli.json` 纳入 WorkBuddy 包；生成器按 transport 处理配置，不再给 stdio 强行添加远程 URL，正确传入所选环境的 CLI 服务地址。
- [x] 调整 WorkBuddy 校验器，使其检查新包的 cli/auth/status/unAuth、stdio、版本和文件组成；去除旧草稿对 `cli.json`、stdio、`preAuth` 及固定文件数量的阻挡。
- [x] 修改 WorkBuddy Skill 前，将 Coze 当前复用且将被改动的说明保留到现有 Coze 包目录，更新渠道映射。仅检查这些文件的内容与引用保持一致，不扩成公共 Skill 重构，也不生成或验收 Coze 包。
- [x] 按已知版本递增候选包，保持 source 身份；平台版本最终核对放在提交前，不阻塞候选开发。旧远程连接切换为本地授权时说明首次需要重新授权，其他已有配置保留；本次重连后使用新路径，不同时调用新旧两套入口。
- [x] 仅生成本次 WorkBuddy 生产包，读取实际 ZIP，核对配置、三句示例、Skill 和模板替换结果。
- [x] 在本计划交付记录中写入版本、CLI 版本、最低 WorkBuddy 版本、ZIP 路径和 SHA-256，避免把源码版本当成用户收到的包版本。
- [x] 提供简单的安装/升级与重连说明；包可验收和平台上架状态分别记录。提交、推送、CLI/npm 发布、平台上传或部署按后续明确授权执行。当前交付包依赖 CLI 0.2.16 先发布，不能直接以尚不存在的 npm 版本进行官方安装。

## 3. 定向测试与验收

**只测试本计划实际修改的函数、配置、包和用户路径。** 同属一个 package 或共用脚本不构成扩测理由；定向用例通过后停止重复测试，除非新修改或失败需要复验。不运行 `go test ./...`、全仓 CI、完整 smoke、全部业务工具测试、其他渠道平台验收或长稳测试。本轮也不开展新的跨操作系统测试矩阵。

下表是按用户最新要求完成的本地验证；模拟服务、真实 Windows 进程、公共线上接口及官方客户端效果分开记录。

| 检查 | 本地通过标准与实际证据 |
| --- | --- |
| 配置与 ZIP | 0.1.2 ZIP 的 preAuth、cli.json、stdio、profile/地址/代理模式、三句示例与 Skill 一致；无占位符残留；包内内容与 bundle 一致 |
| 首次授权与同 profile 接续 | `TestWorkBuddyConnectorLocalFlows` 通过本地 HTTP OAuth fixture、真实 CLI 命令树和实际 loopback 回调，接续账户、记录和 Markdown 工具；凭据存储为内存夹具 |
| 三句示例对应流程 | 三个独立子场景从未授权状态开始；连接场景覆盖空记录，后两条使用同一类可读夹具记录，第三条取得实际 fixture Markdown。未测试官方模型对示例的理解 |
| 保持与续期 | 新 CLI 命令实例复用同 profile；模拟访问过期后刷新、保存轮换凭据并读取账户成功；可控时钟验证 30 天刷新凭据到期，无真实等待 |
| 恢复 | 取消/重试、已有登录复用、强制重新授权、退出/再连接；网络和 503 保留凭据，401/invalid_grant 清理失效凭据，权限不足单独返回 |
| Windows 启动与协议 | 交叉构建 0.2.16 Windows amd64 候选，通过 npm launcher 和独立无凭据 profile 启动；生产公共 initialize/tools/list 成功（19 个工具），账户调用返回 auth_required，stdout 仅 JSON-RPC、stderr 空 |
| 打包与直接引用 | Windows installer dry-run、npm pack dry-run 通过；Coze 保留的 5 份说明与变更前逐字节一致，仅核对引用，不打包或测试其他渠道 |

实际 WorkBuddy 浏览器授权、真实账号内容、应用重启保持、自然语言三句示例和官方发布版本同步列入第 5 节，不用上述本地结果替代。

### 可复用的定向入口

以下保留按实际改动选择用例的映射；实际执行范围见第 4 节，未执行这张表中的所有用例。没有修改对应代码且无需覆盖新增接入链路时，不追加测试。

| 实际修改位置 | 可复用用例 |
| --- | --- |
| 登录启动或强制重新授权 | `TestMCPLoginBrowserOAuthStoresCredentialAndDoesNotLeak`、`TestMCPLoginAlreadyLoggedInAndForceReplacement`，按改动选取 |
| 回调等待/取消 | `TestMCPLoginTimeoutAndStateMismatchDoNotStoreCredential` |
| 状态检查 | `TestMCPStatusNoCredentialJSON`；只有状态逻辑变化时补轮询无副作用用例 |
| 退出接线 | `TestMCPLogoutRevokesAndDeletesCredential` |
| stdio 代理选择 | `TestMCPServeUsesRemoteProxyWhenCredentialExists` |
| 刷新与保存 | `TestRefreshProviderRotatesAndStoresTokens`；按修改补已过期/已失效分支 |
| 代理鉴权重试及错误分类 | `TestProxyPreservesIDAndRefreshesOnceOnUnauthorized`；修改网络错误分类时只补网络失败保留凭据、不误报重登录的用例 |

命令在 Agent 仓库执行，串行运行。下面的 Go 命令仅示范单个用例的执行方式；实施时替换为真正受影响的用例名，不直接拼成整组必跑命令。

```bash
# 仅在状态检查逻辑发生变化时执行；此例只验证无凭据状态。
GOMAXPROCS=1 go test -p=1 -parallel=1 ./internal/cli \
  -run '^TestMCPStatusNoCredentialJSON$' -count=1

# 完成连接器配置和打包适配后，只生成 WorkBuddy 生产包。
node scripts/package-channel.mjs --channel workbuddy --env production
```

- [x] 现有用例未覆盖的状态轮询、刷新过期或配置档案接续，只在本计划对应测试文件增加必要用例；实际执行后补记名称和命令，`no tests to run` / `SKIP` 不记为通过。
- [x] 只调整 JSON/Skill/打包脚本且未改 Go 时，不运行 Go 包测试；通过实际包检查和目标 WorkBuddy 流程验证。
- [x] 修改打包分支时，仅核对本次新增的 CLI 文件、stdio 参数/环境渲染和最终 ZIP；不重测 ZIP 算法、所有非法输入或其他渠道生成流程。
- [x] 仅当 npm launcher 被修改，才追加它实际变更的启动/参数转发用例和一次 installer dry-run；不执行现有安装器全部场景。
- [x] 设备卡、额度、模型用量、Webhook 模板等只补文字指引时，核对工具名称和 schema 即可，不触发相关业务回归或真实发送。
- [x] 没有真实记录时，不把空列表当成第三句整理成功；保留已通过的连接结果，用可读测试记录补齐该场景。

## 4. 完成标准与交付记录

- [x] 第一版本地候选形成“安装配置 → CLI 授权/回调 → 原任务对应工具流程”的闭环，官方客户端效果留待发布后确认。
- [x] 自动续期、跨命令实例保持、取消重试和退出再连接达到第 3 节本地验证标准。
- [x] 三句示例、Skill、运行配置及实际 ZIP 内容一致，文档不会引导进入另一条凭据链路。
- [x] 计划内定向检查完成，记录未验证事项；主 Agent 自审只检查本计划范围和事实一致性。
- [x] 交付新 ZIP、版本与校验值、简短升级说明及实际验收结果。是否上架由平台结果单独确认。

| 项目 | 当前记录 |
| --- | --- |
| 计划编写 | 2026-10-19 完成；仅新增本计划文档 |
| 计划自审 | 2026-10-19 完成优化：补齐失效凭据恢复、代理模式与真实内容输出；拆分必需验收和按改动选择的单测；这是主 Agent 自审，不是运行时验收 |
| 实施 / 最小链路 | 本地完成；CLI 授权 fixture、同 profile stdio 和可复制笔记流程通过 |
| 目标 WorkBuddy / OS | 本机 Windows WorkBuddy 5.8.2，版本已核实；官方界面测试按用户要求延后 |
| CLI 版本 / 新连接器版本 | CLI 候选 0.2.16 / 连接器 0.1.2；执行时 npm latest 为 0.2.15 |
| 新 ZIP / SHA-256 | `dist/channels/workbuddy/production/0.1.2/PatchX Freenote-workbuddy-connector-0.1.2.zip`；23,781 字节；`9af93397b8f4579d676e5c6c3e0f017518a7136a5178ee951c1c098d51310552` |
| 定向测试 / 实际客户端验收 | 6 个顶层定向用例通过，含 12 个子场景；Windows 本地启动与协议检查通过；官方客户端未验收 |
| Git 提交 / 发布 / 部署 | 2026-10-19 用户已授权提交、推送并发布 Agent CLI/npm；WorkBuddy 连接器由用户提交，不重复上传 |

### 本轮实际测试与自审

- 工具链：WSL Go 1.24.11；`GOMAXPROCS=1`、`-p=1`、`-parallel=1` 串行执行。Windows Node 22.18.0 用于打包和 launcher 检查。
- `./internal/remotemcp`：`TestProxyClassifiesTokenFailures`、`TestProxyPreservesIDAndRefreshesOnceOnUnauthorized`。先复现网络/权限错误被误分类，再验证修复。
- `./internal/oauthflow`：`TestRefreshFailureKeepsRetryableCredential`、`TestExpiredRefreshCredentialRequiresLogin`、`TestRefreshProviderRotatesAndStoresTokens`。
- `./internal/cli`：新增 `TestWorkBuddyConnectorLocalFlows`，只覆盖上述三个场景及其授权恢复；未运行该包其他业务测试。
- JSON/Skill/ZIP 检查包括实时工具名称覆盖、同版本和 profile、状态检查不刷新、回调进程保留、占位符替换、Coze 副本保持以及最终 ZIP 内容核对。
- Windows Go 直接测试 UNC 仓库遇到文件锁不支持，改用已安装的 WSL Go 完成定向测试并交叉构建 Windows 候选。npm pack 对 UNC 路径解析失败后，仅将待打包文件复制到任务临时目录完成 dry-run；没有更改用户安装或 npm 配置。
- 主 Agent 自审确认运行时代码改动仅为代理刷新错误分类和失效刷新凭据处理；其余为连接器配置、说明、打包、必要测试及 CLI 候选版本。未执行全仓测试、无关业务测试或其他渠道平台验证。

### 0.2.16 发布准备补充

- 功能提交 `22bda98` 已推送。用户明确同意将最新发布基线合入当前分支后，合并提交 `ccdd041` 纳入 `origin/main` 的 0.2.15 品牌和 Registry 修复，保留本轮授权逻辑；未修改 GoServer。
- 相对 v0.2.15 的运行时代码差异只有本计划的 5 个 Go 文件，npm launcher 与已发布版一致。合并后串行复验上述 6 个顶层用例、12 个子场景全部通过。
- 发布流程复用按改动选测机制：仅当 Go 差异限于本计划的文件时运行 `scripts/test-workbuddy-auth.sh`，本次不触发全仓 Go 或完整安装器测试；另外核对发行版本、六平台资产命名与 npm 打包内容。
- 合并后重建 WorkBuddy 包通过，相关源码与 `22bda98` 无差异，10 个包内文件内容保持一致。ZIP 生成器写入文件时间戳，因此复核包 SHA-256 为 `166a977b0efcd2d599d859998d5eb62728528da7de3da924038e35da88839237`；第 4 节的 `9af933...` 是先前交付包校验值。用户已提交的连接器无需因此重新上传。

## 5. 发布及官方效果确认

- [ ] 将本轮 CLI 修复整合到当前发布基线，按现有发布流程发布签名二进制与 npm `patchxnote-agent@0.2.16`；连接器固定引用该版本，先确认它可以正常取得。
- [x] 用户确认已提交 WorkBuddy 连接器更新；本地交付的 0.1.2 ZIP 与校验值见第 4 节，未从平台后台独立核对上传字节。等待平台通过并生效。
- [ ] 更新通过后，在 WorkBuddy 官方连接器验证首次浏览器授权、三句示例、真实记录、重启保持、自动续期和退出再连接。浏览器只用指定 Chrome；不扩测其他模块。
