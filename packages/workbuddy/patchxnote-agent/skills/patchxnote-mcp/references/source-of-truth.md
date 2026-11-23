# WorkBuddy 包与参考资料

本包：{{PACKAGE_VERSION}}；source：{{CONNECTOR_SOURCE}}；接入方式：远程 MCP + 平台 OAuth。服务端业务更新直接用于此连接，连接地址、授权配置或包内说明变化可能需要更新包。

- WorkBuddy 最低版本：5.0.0。
- 环境：{{ENVIRONMENT}}；API：{{API_BASE_URL}}；MCP：{{MCP_URL}}。
- 凭据由 WorkBuddy 平台管理；工具名称、参数和范围以当前连接的实时 schema 为准。
- 连接器源码：packages/workbuddy/patchxnote-agent/。

本版三个示例为账号状态和剩余额度、最近五条记录或总结、最近可读总结转 Markdown 笔记。具体调用顺序、参数来源与完成标准直接见主 SKILL.md；其他已支持工具仍见 references/workflows.md。

## 需要进一步查阅时

- 仓库与版本说明：https://github.com/ZsTs119/patchx-freenote-agent
- 用户接入页：https://freenote.patch-x.cn/mcp/setup/
- 飞书公开说明：https://patchx2025.feishu.cn/wiki/PnVRwYT7IirFPckairGcWPnHnCd
- WorkBuddy 连接器规范：https://open.workbuddy.cn/docs/connector

日常连接遵循本包的平台授权流程。进一步排查先确认失败阶段和当前服务地址；不同客户端的本地安装指引不适用于本连接器。

ZIP 生成、本地测试、平台解析、浏览器授权、工具调用、刷新及市场审核分别记录。质量评测的账号由维护者在平台授权，包内不包含账号或凭据。实际执行和评测结果应对应本次上传版本；打包不会自动提交平台审核或改变线上服务。
