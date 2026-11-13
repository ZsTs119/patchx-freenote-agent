# WorkBuddy 安装、登录与重连

本包使用托管 Node 引导、CLI preAuth 和 stdio MCP。最低 WorkBuddy 版本为 5.0.0，source 为 {{CONNECTOR_SOURCE}}；配置档案为 workbuddy，API 为 {{API_BASE_URL}}，后端 MCP 为 {{MCP_URL}}，运行模式为 PATCHXNOTE_MCP_MODE=remote。

## 首次连接

1. 点击连接，WorkBuddy 准备托管 Node；引导入口创建完整 npm 安装和缓存目录。
2. 连接前查询 npm latest，安装对应 npm 包及 Go 程序；安装完成后才查询登录状态。
3. 未登录时，CLI 输出授权链接，WorkBuddy 打开浏览器。authWaitForExit 保留回调进程。
4. 用户完成浏览器授权后，CLI 将凭据保存至既有原生存储。
5. WorkBuddy 使用本次选定 npm 和二进制目录启动 MCP，调用账户工具和记录工具确认，再继续用户任务。

Windows 和 Mac 都通过托管 Node 执行选定 npm 入口。路径来自运行环境和选择记录；Mac 会准备 lib/node_modules、bin 及执行权限，Windows 不覆盖运行中的旧版本。终端/WSL 的成功不代表 WorkBuddy 的实际连接已经成功。

## 更新、回退与重新连接

- 正式包跟随 npm latest，不固定某个发行版本。已连接进程继续运行，下次连接检查更新。
- 更新成功后整套切换 npm 和 Go；下载或启动检查失败时继续使用旧版，日志给出实际使用版本。
- 首次安装没有可用旧版时，提示安装失败并允许重试。
- 状态轮询只读取本地登录态，不检查更新、下载或执行远程 verify。
- 更新和连接器升级保留 workbuddy profile 的凭据。旧用户先更新一次连接器包，之后使用自动更新。
- 审核期间 latest 可仍为旧版本；候选 next 的测试结果与正式包验收分开记录。

## 授权恢复与退出

优先在当前连接器重新连接，使用包内声明的 auth/status/unAuth 入口。若需要直接诊断，先取得本次选择记录中的 npm 入口与 binaryDir，再在同一 OS、profile、服务地址执行对应 mcp 命令，并传递相同的 --install-dir；不要另外用未选定版本的 npx 命令代替当前连接。

正常连接的 --no-browser 由 WorkBuddy 负责打开链接；直接终端登录需由 CLI 打开浏览器。已有有效授权应复用；访问和刷新凭据的时效以实际返回字段为准。仅明确失效或用户要求切换账号时重新授权。

退出调用同一 profile 的 mcp logout。安装更新不等于退出登录，解绑连接器是否执行 unAuth 以实际行为为准。验证码仅在浏览器输入，不在聊天里传递。
