# Freenote WorkBuddy 企业记录接入 Checklist

**日期** 2026-11-23

**状态** 0.1.7 本地候选包和定向 ZIP 验证已完成，WorkBuddy 平台验收待执行。

**目标** 基于 Freenote 0.1.6，让老板沿用 WorkBuddy OAuth 查询公司员工的企业记录，并完成历史 ZIP 导出。

**主计划** [GoServer 企业记录查询与 ZIP 导出](../../../patchxNoteGoServer/docs/plans/2026-11-23-workbuddy-enterprise-records-export-checklist-plan.md)。工具合同、数据口径与跨仓验收顺序以主计划为准。

## 1. 接入方式

0.1.6 生产和测试 ZIP 通过 Streamable HTTP 连接对应环境的 GoServer `/mcp`。GoServer 提供五个工具，Agent 仓库维护 WorkBuddy 渠道的 Skill、示例和 ZIP。沿用 `patchxfreenote` 连接器身份、`patchxnote` 服务名和 WorkBuddy 平台 OAuth。基线见 [0.1.6 打包 Checklist](2026-11-16-workbuddy-quality-resubmission-checklist.md)。

## 2. 实施

### A. 接收合同并更新 Skill

- [x] 接收 [主计划的工具合同](../../../patchxNoteGoServer/docs/plans/2026-11-23-workbuddy-enterprise-records-export-checklist-plan.md#2-工具合同草案)定稿，按合同核对五个工具、参数、分页、任务状态及下载入口。
- [x] 更新 `packages/workbuddy/patchxnote-agent/skills/patchxnote-mcp/SKILL.md` 和直接受影响的 `references/workflows.md`、`references/troubleshooting.md`。写清「选公司 → 找在职或离职员工 → 查录音条目 → 读所选正文」和「按员工提交导出 → 回查状态 → 交付下载」两条流程。
- [x] 在说明里写清日期留空代表全部可读历史，查全量时继续到游标结束。正文使用服务端返回的类型和可用状态。缺内容如实说明。提交导出后按任务 ID 查状态，完成时交付 ZIP 下载入口，失败时说明结果。
- [x] 更新 `packages/workbuddy/patchxnote-agent/connector-meta.json` 的中英文描述和企业示例，保留个人查询示例。建议用「查某员工全部日期的转写、纠错和 AI 总结」与「导出某位离职员工的企业历史」作为两条企业示例。
- [x] 连接器上调到 `0.1.7`，同步 Skill 版本。继续使用现有 `mcp.json`、渠道打包器和环境地址配置。npm/CLI 属于独立渠道。

### B. 打包并跑定向检查

- [x] 复用 `scripts/workbuddy-remote-connector.test.mjs` 的实际 ZIP 用例和现有校验器，在同一用例覆盖新版包的企业示例、五个工具引用及现有 OAuth 配置。
- [x] 串行运行 `node --test --test-concurrency=1 --test-name-pattern="^generated production and test ZIPs" scripts/workbuddy-remote-connector.test.mjs` 和 `git diff --check`。直接使用该用例生成的测试／生产候选 ZIP，核对版本、MCP/OAuth 地址、Skill 和示例，记录路径及 SHA256。
- [x] 继续保留 0.1.6 基线产物及对应环境，供旧授权接续验证。完成范围只覆盖 WorkBuddy 渠道、当前功能用例和直接受影响的个人入口。

首轮实际 ZIP 生成与内容对照用例 1/1 通过。显示名改为「自由记 Freenote」并修正工具说明表格排版后，最终生产和测试 ZIP 通过 9 项 WorkBuddy 打包检查。逐项对照实际 ZIP，确认排版修正仅删除 `workflows.md` 中的一行空行，名称空格仅修改三个显示名字段。候选产物位于 `dist/channels/workbuddy/<env>/0.1.7/Freenote-workbuddy-connector-0.1.7.zip`。

| 环境 | SHA256 |
| --- | --- |
| production | `a860c72355d7c56061e489a442c0c84e7a5872c8e40b7a8fb06b050eb80ecedc` |
| test | `a9852aac41b4c0b13958d7bdc6ab2928c78ee97a467b6e8928ed447007d7535d` |

## 3. 联调与平台验收

### 本地 npm 联调

使用已发布的 `patchxnote-agent@0.2.18` 和 `note-test` 的专用 profile。先完成浏览器 OAuth，再启动 stdio 代理。PowerShell 命令如下。

```powershell
$testBase = 'https://note-test.patch-x.cn'
$env:PATCHXNOTE_MCP_MODE = 'remote'
npx -y patchxnote-agent@0.2.18 mcp login --profile enterprise-note-test --server-base-url $testBase
npx -y patchxnote-agent@0.2.18 mcp serve --profile enterprise-note-test --server-base-url $testBase
```

启动命令由同一台机器上的 MCP 调试客户端运行，沿用相同 profile 和测试地址。通过 `tools/list` 发现五个工具，再用 [主计划的测试账号和样本](../../../patchxNoteGoServer/docs/plans/2026-11-23-workbuddy-enterprise-records-export-checklist-plan.md#联调账号与实际操作)逐步验收。导出任务就绪后从返回的链接实际下载 ZIP。

2026-11-23 只读探测时，`note-test` 的 MCP 健康入口返回 19 个工具，OAuth 发现指向同一测试域名。现有测试 ZIP 配置的 `ws-lab` MCP 健康入口返回 502。候选部署后，先确认对外路由和 OAuth 发现，再以实际工具列表判定。任务状态为待部署联调。

### WorkBuddy 平台验收

按 [主计划的跨仓验收顺序](../../../patchxNoteGoServer/docs/plans/2026-11-23-workbuddy-enterprise-records-export-checklist-plan.md#5-跨仓交付与验收)执行。浏览器验收使用用户指定的 `@chrome`，平台不可用时记录待验项。联调环境就绪后，先核对实际 `tools/list` 与定稿合同一致。 使用[主计划的专用老板、员工账号和实际 Web 归档样本](../../../patchxNoteGoServer/docs/plans/2026-11-23-workbuddy-enterprise-records-export-checklist-plan.md#联调账号与实际操作)执行下列用例。

| 用例 | 通过条件 |
| --- | --- |
| WB-01 旧授权接续 | 使用更新 GoServer 前保留的 0.1.6 授权重连，发现新增工具并成功读一条企业记录。按实际结果记录是否复用旧授权。 |
| WB-02 员工历史查询 | 0.1.7 候选中，老板能用姓名定位员工，查全部日期并翻页，成功读一条转写、纠错、AI 总结和一条有正文的深度调研。 |
| WB-03 离职员工导出 | 能定位离职员工，日期留空提交导出。沿 WorkBuddy 返回的入口实际下载 ZIP，复用 GoServer 跨页样本核对清单和 Markdown 正文。 |
| WB-04 直接回归 | 用同一授权完成一次既有个人记录查询，确认个人入口仍可用。 |

- [ ] 分别记录本地 ZIP 检查与真实 WorkBuddy 结果，标出实际连接器版本、环境和完成用例。上传、发布和线上联调按实际授权执行。
