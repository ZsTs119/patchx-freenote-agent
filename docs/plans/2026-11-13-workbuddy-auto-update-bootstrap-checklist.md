# WorkBuddy 自动安装与热更新第一版 Checklist 计划

**日期：** 2026-11-13

**状态：** 本地实现及计划内定向验证完成；Windows 真实启动、更新、回退和连接保持已验证。Mac/WorkBuddy 新包界面验收、候选公开发布及平台审核尚未完成，线上 latest 保持 0.2.16。

**目标：** 更新一次 WorkBuddy 连接器后，Windows/macOS 新用户无需终端操作即可完成安装、浏览器授权和连接；后续 npm 与配套 Go 程序在下次连接时自动更新，更新失败继续使用已有可用版本。

**架构：** 连接器携带稳定引导入口，在 npm 执行前准备环境并接通安装、更新调度。npm 包负责可更新的安装与启动逻辑，Go CLI 继续承担现有授权和 MCP 功能。一次连接选定一套具体 npm/Go 版本，准备完成后切换，运行中的连接继续使用原版本。

**技术栈：** WorkBuddy 托管 Node、CLI preAuth、Node.js npm launcher、现有 Go CLI/stdio MCP、GitHub Releases、npm dist-tags。

**实施方式：** 主 Agent 串行完成。第一版只做本计划的功能闭环，沿用现有校验、来源证明和凭据存储，不另建安全策略、权限审批或通用更新平台。Git 提交和发布按届时明确授权执行。

**候选发布授权：** 2026-11-13 用户明确允许提交、推送本轮改动，发布 GitHub v0.2.18 和 npm 0.2.18 到 next；npm latest 保持 0.2.16，WorkBuddy 提交审核由用户处理。

## 1. 已确认的事实与范围

- [x] 用户确认 Windows WorkBuddy 已能连接。
- [x] Mac 手动登录及 `mcp status --verify` 成功，凭据可读取，远程验证通过。
- [x] Mac npm 日志先报 `cli-connector-packages` 不存在；补根目录后改报其 `lib` 不存在；补齐 `lib/node_modules` 和 `bin` 后，用户确认 WorkBuddy 连接成功。
- [x] 同版 WorkBuddy 5.9.3 本机程序调查发现：运行时设置 npm prefix/cache；安装检查取命令首个可执行程序。当前命令首项为 `npx`，找到它不等于我们的程序已安装完整。
- [x] 当前连接器固定 npm `0.2.16`；npm launcher 在检查现有二进制前获取安装锁，不同版本共用二进制安装位置。
- [x] 本次讨论期间从官方 npm registry 回读：`latest` 指向 `0.2.16`。现有 npm publish 工作流未指定 `--tag`，需要在候选发布前修正。

以上是旧问题的诊断和手工恢复结果，不表示本计划的自动安装、升级或回退已经验收。现有业务工具、OAuth、profile、账号内容读取继续复用；GoServer、其他连接器渠道及业务功能不进入本轮改造。

## 2. 已确认的产品与发布规则

| 项目 | 本版约定 |
| --- | --- |
| 版本来源 | 正式连接器跟随 npm `latest`，包内不固定 npm 发行版本；明确读取标签，不能取版本列表中的最大值 |
| 更新时机 | 首次安装及下一次连接/重连的准备阶段检查；不打断正在运行的连接 |
| 更新失败 | 已有可用版则继续使用；首次安装无可用版则提示具体失败阶段及重试方法 |
| 本次连接 | 登录、状态检查和 MCP 启动使用同一套已选定版本，状态轮询不重新解析 `latest` |
| 平台兼容 | Windows/macOS 自动准备目录，使用托管 Node，处理路径、架构和执行权限 |
| 用户状态 | 保持 `workbuddy` profile、生产地址和既有凭据，不因更新要求重新授权 |
| 旧用户 | 先升级一次 WorkBuddy 连接器包；必要时按既定方式卸载后重装连接器，再进入新更新机制 |
| 候选发布 | 可发布 npm/CLI `0.2.18` 到 `next`；具体版本在发布前确认未被使用 |
| 审核期间 | npm `latest` 必须保持 `0.2.16`；正式送审包默认仍跟随 `latest` |
| 正式启用 | WorkBuddy 新包审核通过并确认可用后，单独切换 `latest`；版本回退同样通过标签完成 |

“热更新”在本计划中特指下一次连接采用新版。普通 npm/CLI 修复通过发布制品分发；引导协议或 WorkBuddy 平台接口本身改变时，仍可能需要更新连接器包。

## 3. 第一版执行路径

```text
用户点击连接
  → WorkBuddy 准备托管 Node
  → 包内引导入口补齐运行目录
  → 连接前轻量检查：当前可用版本、latest 指向、是否需要安装
  → 需要时进入安装阶段：准备目标 npm 包及匹配 Go 二进制
      → 准备成功：选定新版
      → 准备失败且有旧版：选定旧版，继续连接
      → 没有任何可用版：提示失败阶段，允许重试
  → 检查同一 profile 的授权，必要时打开浏览器
  → 使用本次选定版本启动 MCP
```

引导代码必须在目标 npm 包尚未安装或旧 launcher 已损坏时仍能执行。不能把全部自救逻辑放进待修复的 npm 包里，也不能只把所有 `0.2.16` 字符串替换成 `latest`。

### 连接检查、安装与启动之间的最小约定

以已核对的 WorkBuddy 5.9.3 调度为依据：`versionCheck` 非零退出会中断连接，并不会触发安装；本方案通过成功返回且准备标记低于约定值来进入 `init`，安装后还会再检查一次。采用以下接线，并在 A 阶段验证实际客户端执行结果：

| 入口 | 本版职责 | 给 WorkBuddy 的结果 |
| --- | --- | --- |
| 连接前 check | 补目录、短时查询目标标签、判断是否需要准备；保存本次确定的目标版本 | 已就绪返回退出码 0 和 `workbuddy-ready=1.0.0`；需要安装返回退出码 0 和 `workbuddy-ready=0.0.0` |
| init / prepare | 按 check 确定的具体版本准备 npm 和 Go；首次 check 未取得版本时，在安装阶段重试查询 | 新版可用或已选定可用旧版均退出 0；没有可用版本才返回安装失败 |
| 安装后的 check | 读取并消费本次 prepare 结果，包含回退结果 | 返回就绪；不再次查询标签、重新要求安装 |
| auth/status/unAuth/serve | 读取本次选定的 npm 包目录和二进制目录，执行已有命令 | 保留各命令原有输出和退出语义，不进行更新检查 |

`versionCheck.minVersion=1.0.0` 在这里仅表示引导准备协议，匹配明确的 `workbuddy-ready=` 前缀，不是固定 npm 发行版本。准备结果不能让后续连接永久跳过更新；下一次独立连接重新查询标签。安装阶段的总超时要早于 WorkBuddy 的安装超时，为结束下载子进程、回退和返回结果留出时间，不能等宿主强制终止后才尝试回退。

## 4. 修改位置

以下为相对仓库根目录的文件路径；标记“新增”的文件在实施时创建。

| 模块 | 文件与用途 |
| --- | --- |
| 连接器引导 | 新增 `packages/workbuddy/patchxnote-agent/bootstrap.cjs`：稳定环境准备、连接前检查、安装调度和版本选择 |
| 连接器配置 | `packages/workbuddy/patchxnote-agent/cli.json`、`mcp.json`、`connector-meta.json`：接通引导，递增连接器版本，保持 source 身份 |
| npm 安装启动 | `packages/npm/bin/patchxnote-agent.js`：已安装快路径与带进程归属的安装锁；安装编排复用包内引导层 |
| npm 元数据 | `packages/npm/package.json`、`server.json`：候选版本和已有发布元数据保持一致，确保新增运行文件进入 tarball |
| 渠道打包 | `packages/distribution/channels.json`、`scripts/package-channel.mjs`、`scripts/lib/workbuddy-bootstrap.mjs`、`scripts/validate-workbuddy-connector.mjs`：去掉 WorkBuddy 固定版本假设，支持引导入口和候选验证 |
| 发布流程 | `.github/workflows/publish-npm.yml`；按实际需要调整 `.github/workflows/release.yml`、`scripts/validate-release-metadata.mjs` 的本轮定向测试选择 |
| 定向测试 | 新增 `packages/npm/test/workbuddy-update.test.js`、`scripts/workbuddy-bootstrap.test.mjs`；发布选测函数若有实际逻辑变化，再为对应分支补用例，不预设独立发布测试模块 |
| 使用说明 | WorkBuddy 包内 `SKILL.md`、`references/onboarding.md`、`troubleshooting.md`、`source-of-truth.md`，以及 `packages/npm/README.md`、发布 runbook 的相关段落 |

Go 运行时代码原则上复用。只有为本轮安装路径或启动参数接续确有必要时才修改对应函数，并增加该函数的定向用例；不顺带重构授权、业务工具或其他渠道。

## 5. 实施 Checklist

### A. 先落实真实连接时的引导和更新触发

- [x] 先用最小夹具串起 `安装检查 → versionCheck → init → 再检查 → status/auth → MCP`，再接实际下载安装。覆盖未安装和已安装后重新连接；即使命令首项为已存在的 Node，也要由准备检查正确触发安装。
- [x] 将引导代码作为连接器的一部分交付，由打包器从单一源码生成可执行入口，避免依赖未知工作目录或写死解压路径；在 Windows 实际执行生成的命令，覆盖转义、空格路径和命令长度，Mac 使用同一份引导逻辑。
- [x] 按第 3 节的准备协议接通 `versionCheck`：需要更新时仍正常退出，由准备标记触发 init；检查在宿主 10 秒时限内返回，下载进入安装阶段。
- [x] 验证 check 已确定的目标不会在同一次安装中被重新解析成另一版本；prepare 成功或回退后复查均可继续，下一次连接又能检查更新，避免循环安装或永久停留旧版。
- [x] 引导接口保持小而稳定：环境准备、更新检查、安装准备、选定版本启动；普通功能继续放在 npm/Go 层。

### B. Windows/macOS 环境与首次安装

- [x] 使用 WorkBuddy 托管 Node 及注入的 prefix/cache/PATH，解析用户目录和自定义配置目录；不把本机用户名或 `.workbuddy` 绝对位置写死进包。
- [x] npm 执行前递归创建所需目录，包含 Mac 的 prefix、`lib/node_modules`、`bin` 和缓存目录；重复执行可正常继续。
- [ ] 根据实际运行平台与架构选择程序；处理 Windows `.cmd`/`.exe`、带空格路径，以及 Mac 执行权限。架构映射使用定向夹具验证，实际客户端先覆盖现有 Windows amd64 和 Mac arm64。
- [x] 安装阶段完成 npm 包及对应 Go 二进制的准备和可启动检查；不能以“npx 存在”或“npm 包装好了”作为全部完成的依据。
- [x] npm 已安装但二进制缺失、下载中断或版本不符时，重试能重新进入安装准备；不把耗时下载塞进状态查询。
- [x] 目录不可写、网络失败、二进制不能执行分别给出阶段和重试信息；目录不存在自动创建。

### C. npm 自身更新、配套二进制与版本切换

- [x] 正式连接从 npm 官方 registry 读取 `latest`，候选验证可显式选 `next` 或具体版本；明确执行标签的新鲜度检查，不用旧 npx 缓存推断最新版。先以 3 秒作为查询超时初值，通过计划内实测调整；查询失败且有可用版时直接沿用。
- [x] 为目标 npm 包和匹配 Go 二进制使用独立版本目录；原程序在新版本准备期间继续可用，不原地覆盖运行中的 Windows 二进制。
- [x] 可用版本记录同时保存具体 npm 包目录和 Go 程序目录。除二进制版本检查外，还要实际通过目标 npm 入口运行一次本地状态探测；未登录是有效结果，不能因此判安装失败。完整准备后再切换记录。
- [x] 引导层使用 Node 和选定 npm 入口的绝对路径启动，参数以数组传递；安装和 mcp 子命令统一传递该版本的 `--install-dir`，避免又落回共享二进制位置或由 PATH 找到旧 npm 包。
- [x] 更新的不只是 Go 二进制：用可区分的前后版本夹具证明新 npm 逻辑实际生效；旧 npm 入口启动失败时，引导层仍可独立取得修复版。
- [x] 给安装子进程设置早于宿主的总时限，超时主动结束本次安装并完成回退；旧版仅在确认仍可启动时复用，无旧版则返回可重试失败。失败产物不写成可用版本。
- [x] 本次连接的 auth/status/serve 只读取同一份选择结果；当前 MCP 进程保持启动时路径。更新失败不清理登录态；授权失败或业务接口失败沿用原处理，不误当成下载失败反复换版本。
- [x] 支持 `latest` 回指已验证版本；不能只做“版本号更大才升级”。先保留可用旧版，不增加自动清理历史缓存的独立模块。

### D. 启动速度、安装锁和已有授权接续

- [x] 已安装且可启动的程序先走快速路径，不因安装锁存在而等待；`status` 不检查更新、不下载、不自动登录，继续读取本地 JSON 状态。
- [x] 只在实际安装/写入同一版本时协调竞争；中断遗留状态可恢复，不沿用当前“所有命令先等空目录锁”的路径。
- [x] auth/status/unAuth/MCP 统一 profile 和服务地址，沿用 `--no-browser`、`authWaitForExit` 及现有浏览器回调；安装更新不改凭据位置。
- [x] MCP stdout 保持 JSON-RPC，更新和故障提示进入 stderr；验证退出和信号转发能结束对应子进程。

### E. 打包、审核过渡与说明

- [x] 正式包以 `latest` 为目标；递增连接器版本，保持 `source=patchxfreenote`、当前示例和业务工具用途。
- [x] 修改校验器：验证真实引导、同一 profile 和版本选择接续，不再强制所有命令使用固定 npm 版本的 npx 字符串。
- [x] 审核期间正式包必须能在 `latest=0.2.16` 时完成基础安装和连接；复用旧包已具备的 `install`、`mcp ... --install-dir` 接口，安装与启动使用同一个版本目录，不要求旧 npm 提供新增命令。以已发布 tarball 验证，不只看当前源码。
- [ ] 候选验证使用独立安装目录和显式通道覆盖，不修改用户 HOME 或正式可用版本记录。用同一引导源码模拟 `latest: 0.2.16 → 候选版 → 回退版`，并用 `next` 实包补验，过程中保持线上 latest 不变。
- [x] 正式送审 ZIP 的默认目标仍为 latest，使用旧 latest 完成一次基础连接；记录实际 ZIP 和摘要，不能将改写为 next 的另一个包当作正式包验收结果。
- [x] 生成并读取实际 WorkBuddy ZIP，核对引导片段、目标标签、profile、地址和包内说明；同步“升级一次连接器，后续下次连接自动更新”的说明。

### F. 候选发布与正式切换

- [ ] 候选发行元数据统一为实际选定版本（建议 `0.2.18`）；先准备对应 GitHub 二进制和既有校验/来源材料，不再次覆盖 `v0.2.16` 资产。
- [ ] npm publish 增加显式发布标签参数，候选默认使用 `next`；核对实际调度的 workflow ref 和 publish 命令确实包含该标签。发布前后回读并确认 `latest=0.2.16`，不能只修改本地 YAML 后仍运行旧工作流。
- [x] 发布工作流只执行本计划对应的定向测试入口；为本次改动选择两个专用测试文件，不触发现有 npm test 的无关 Skill/安装场景。仅调整本轮命中的选测路径，其他发行逻辑保持原状。
- [ ] 发布候选 npm 后，用 registry 实际包验证目标入口，并记录候选 npm 版本、二进制版本和实际采用版本。
- [ ] 用户提交新 WorkBuddy 包，单独记录审核结果；审核前持续保持 `latest=0.2.16`。
- [ ] 审核通过且新包可用后，再按确认的上线时点使用现有 `set-latest` 操作切换；回读标签，验证新连接采用目标版。

## 6. 仅针对本计划的测试与验收

本轮测试范围由实际修改和下面场景确定。不开全仓 Go、完整 npm 安装器、其他渠道、所有 MCP 业务工具、长稳或大规模并发测试；不为未改动的纯文案和无关分支补测试。沿用现有检查即可证明的内容不另造重复测试。

自动化测试使用隔离临时目录和小型版本/下载夹具，顺序模拟状态变化。超时、更新中断和前后版本切换使用可控夹具，不真实等待数分钟，也不增加后台更新服务。主 Agent 串行执行，Node 测试使用单 worker；如实际修改 Go，仅运行受影响的具名用例。定向检查通过后不重复扩大范围。

| 场景 | 通过条件 | 验证位置 |
| --- | --- | --- |
| 缺目录/重复准备 | prefix、Mac lib/bin、cache 自动就绪；第二次不破坏已有文件 | bootstrap 定向用例 |
| 真实调度与首次安装 | 已有 Node 但未装 Agent 时仍触发完整安装；needs-prepare 正常退出、init 后复查成功；下载不落入 10 秒 status | bootstrap 调度用例及 WorkBuddy 实测 |
| 半安装重试 | npm 包已存在但 Go 缺失，下一次准备能完成 | npm/update 夹具 |
| 正常升级及 npm 自更新 | 旧 npm 入口损坏仍能取得修复版；确认执行了新版 npm 和匹配目录中的 Go，不是仅二进制版本变了 | npm/update 夹具及候选实包 |
| 更新失败回退 | 标签查询失败、安装超时或启动检查失败时，在宿主终止前选择可用旧版；复查不循环安装，下一次连接仍可更新；无旧版明确提示 | npm/update 夹具与 bootstrap 同一调度场景 |
| 标签回退/连接一致性 | latest 回指后新连接采用回退版；当前进程继续原版，auth/status/serve 版本一致 | npm/update 夹具 |
| 快速状态/遗留锁 | 已安装程序在遗留安装状态下仍快速返回；status 不触发网络下载 | launcher 受影响路径用例 |
| 审核过渡 | 0.2.16 tarball 的安装与启动目录一致；正式 ZIP 跟随旧 latest 能连接；独立夹具完成标签切换，候选入口补验新版 | 包检查及同一引导源码的版本夹具 |
| Windows/Mac 闭环 | 全新目录点击连接、浏览器授权、MCP 初始化和一次账户读取成功；更新后保持授权 | 真实 WorkBuddy，由用户协助验证 |
| 发布标签 | 实际候选发布参数为 next，前后 latest 均为 0.2.16；正式切换后回读与启动一致 | workflow 参数核对及实际发布回读；仅新增函数有逻辑时补定向用例 |

拟新增的定向命令如下，实施后记录真实结果；当前不是已存在或已通过的测试：

```bash
node --test --test-concurrency=1 scripts/workbuddy-bootstrap.test.mjs
node --test --test-concurrency=1 packages/npm/test/workbuddy-update.test.js
```

完成相关适配后，只打包本次 WorkBuddy 渠道：

```bash
node scripts/package-channel.mjs --channel workbuddy --env production
```

- [x] 每个行为选一个最直接的验证位置；同一条闭环复用夹具，不在 bootstrap、npm 和发布层各复制一套。将共用安装函数的受影响分支纳入两个定向文件，不运行现有安装器全套。
- [ ] 对候选 npm 做一次内容检查和安装 dry-run；真实启动选 Windows 和 Mac 已有设备，不把模拟路径或交叉编译当成设备验收。
- [x] 发布 YAML、纯打包字段和文案以实际命令、制品内容及标签回读检查，不为字符串快照另建测试模块；发布元数据/选测函数有逻辑变化时才补对应分支。重新构建未改动 Go 程序不触发 Go 业务测试。
- [x] CLI 层验证只覆盖授权状态接续、stdio initialize/tools/list 和一次账户读取；不执行模型、Webhook 发送、硬件或其他业务回归。
- [x] 本机/夹具、候选制品、真实 WorkBuddy、审核和线上 latest 切换分别记录；未执行、跳过、无匹配用例均不记为通过。

## 7. 完成标准与执行记录

- [ ] 新版连接器具备自动环境准备，Windows/macOS 首次使用无需手工 mkdir 或终端初始化。
- [ ] 已安装用户在下一次连接获得新 npm 和对应 Go 程序；失败能沿用旧版，状态查询快速，授权保留。
- [ ] 候选 `next` 与生产 `latest` 的发布流程分离，审核前 `latest` 始终保持 `0.2.16`。
- [ ] 本计划的定向用例、真实客户端验收和实际制品记录齐全；剩余未验证事项如实列出。
- [x] 交付 WorkBuddy ZIP、SHA-256、候选版本、简短升级说明和验证结果。

| 阶段 | 当前状态 / 后续填写 |
| --- | --- |
| 计划编写 | 2026-11-13；仅新增本文件 |
| 主 Agent 自审 | 2026-11-13 完成计划与实现自审：check/init/复查、超时回退、路径配对和候选过渡已实现并完成本机验证；仅保留两组必要自动化及制品检查。不是独立评审，真实新版 WorkBuddy 界面及 Mac 验收仍待完成 |
| 程序与连接器实现 | 本地完成；Go 业务代码未改动；连接器 0.1.3、npm 候选 0.2.18 |
| 定向测试 / Windows / Mac | 两组共 13 项通过；Windows 真实进程与公开旧版/本地候选接续通过；Mac 原生进程及新版 WorkBuddy 界面仍待用户验证 |
| 候选 npm / GitHub 制品 | 本地 npm 0.2.18 tarball、Windows 候选已验证；未公开发布，后续使用 next 标签 |
| WorkBuddy ZIP / 审核 | 0.1.3 ZIP 已生成并核对字节；本版未提交审核 |
| npm latest | 要求保持 `0.2.16`，审核通过后单独确认切换 |
| Git 提交 / 推送 / 线上切换 | 本轮均未执行 |

参考：[WorkBuddy 官方连接器说明](https://open.workbuddy.cn/docs/connector)、[npm 标签发布说明](https://docs.npmjs.com/adding-dist-tags-to-packages/)、[此前授权闭环计划](2026-10-19-workbuddy-connector-auth-usage-checklist.md)。官方文档中的安装/状态超时与实际客户端调度，在 A 阶段一起核对；本计划不把固定最低版本检查误当作动态更新。

## 8. 本轮实施与验证记录（2026-11-13）

- 两组定向测试：bootstrap 5 项、npm/update 8 项，合计 13 项，在 Windows Node 22.18.0 和 WorkBuddy 托管 Node 20.18.0 上串行通过。未运行全仓 Go、完整 npm 安装器或其他业务/渠道测试。
- 真实 Windows 隔离安装：从 npm registry 取得原版 0.2.16，自动准备目录并安装匹配公开二进制，首次准备约 13,701 毫秒；现有 workbuddy 授权读取正常。
- 本地候选：实际安装 0.2.18 tarball 和本地构建的匹配 Windows Go 程序；候选使用 local-workbuddy-candidate 构建标记，不冒充已签名公开发行物。
- 从生成的 MCP 入口启动旧版和候选版，均完成 initialize、19 个工具发现和一次账户读取，stderr 为 0 字节。候选下载使用本地制品，不能替代未来 next 实包验证。
- 保持旧版 MCP 进程运行时切换到候选版，旧连接仍成功响应账户读取；新连接采用候选版。模拟 registry 不可达后继续候选版，再回退到 0.2.16，复查均可继续。
- npm pack 内容和安装 dry-run 通过；两个 workflow 的 YAML 解析通过；发布选择回读 runtimeChanged=false、runtimeWorkbuddyUpdateOnly=true。候选发布显式 next，实际公开发布尚未执行。
- 实际 ZIP 10 个文件与 bundle 逐字节一致，默认目标 latest；Windows 最长命令 5,257 字符。
- ZIP：`dist/channels/workbuddy/production/0.1.3/PatchX Freenote-workbuddy-connector-0.1.3.zip`，106,153 字节，SHA-256：`9277e0cb9f78d0f65216870adbf496d0631110650f98c9337a05107938f72388`。
- 原始本机证据：`.tmp/workbuddy-auto-update-20261113/evidence/windows-runtime.json`、`connection-continuity.json`、`package-check.json`；这些是本机验证文件，不进入发布包。
- 主 Agent 自审：已检查准备结果消费、更新后复查、超时前回退、同版本损坏重装、npm/Go 路径一致、stdout 和发布标签；这是自审，不是独立验收。

待完成：Mac/新版 WorkBuddy 界面验收；Git 提交推送及 GitHub/npm next 公开发布；公开候选实包复验；用户提交审核与审核通过后的 latest 切换。上述项目仍保留未勾选，不以本机通过替代。
