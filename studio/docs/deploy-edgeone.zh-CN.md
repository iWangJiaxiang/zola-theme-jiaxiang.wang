# 将创作中心部署到 EdgeOne Makers

[English](deploy-edgeone.en.md) · [首次使用](quick-start.zh-CN.md) · [配置与排错](setup.md) · [完整文档](../README.md)

核对日期：2026-10-24。下文以当前官方文档及实际检查过的 `edgeone@1.6.46` 命令为准；账号可用地域、配额、域名规则以控制台为准。

## 先弄清楚部署的是什么

你需要两个独立项目：

- **公开博客**：Zola 生成的静态网站，读者访问这里。
- **创作中心**：这个目录提供的管理后台，包含静态界面和 Node.js Cloud Functions，管理员登录这里。

```text
管理员浏览器 → studio.example.com
                    ├─ 静态后台界面
                    └─ /api/* → Node Cloud Function
                                  ├─ Blob：登录会话、OIDC 临时状态
                                  └─ HTTPS Git：文章、配置、图片
                                                   ↓ 内容提交
                                               主站 CI → 公开博客
```

后台代码在**主题仓库**，写作内容在**内容仓库**。两个仓库可以托管在不同平台。保存成功表示内容已写入 Git，主站还需要自己已有的 CI 构建发布。

**推荐走“本地/CI 构建 → CLI 上传产物”。** 这样能固定构建用的 Node 版本，也不会把主站误当成后台部署。

## 部署前准备

1. 内容仓库已存在，包含实际的 `config.toml`、`data.toml`、`content/`；确认分支名称究竟是 `main`、`master` 还是其他名称。
2. 准备允许读取仓库、直接推送目标分支的 Git 凭据。GitHub、CNB 等都使用各自的 HTTPS Git 认证要求。
3. 准备一个稳定的后台域名，或先用平台给该项目分配的稳定域名。`STUDIO_ORIGIN` 必须与实际访问地址一致，不能用一次性预览地址代替正式地址。
4. 在 EdgeOne 对应站点的账号中确认 **Cloud Functions 和 Blob** 可用。只有静态托管、只有 Edge Functions，或者不能使用 Blob 的项目，都不符合当前后台的部署要求。
5. 本地安装 Node.js **22.12+** 和 npm。打包后的服务已验证可由 Node.js **20.19.0** 加载；平台函数文档写明 Node v20.x，实际小版本仍需以平台运行时为准。

无需把管理中心的管理员密码交给 Git；也不需要为图片上传单独申请图床 key。图片存入内容仓库，Blob 只保存认证状态。

### 开始线上测试前

构建通过表示可以上传代码，只有下面的配置就绪后，才能开始真实登录和内容读写测试：

- 有独立的后台测试项目和稳定 HTTPS 地址，并确认项目可以使用 Cloud Functions 与 Blob。
- 云端配置使用 `STUDIO_STATE=blob`、正确的 `STUDIO_ORIGIN`、独立会话密钥及管理员密码哈希；本地 `doctor` 通过不能代替云端配置检查。
- 配置测试内容仓库、分支及可读写 Git 凭据。建议使用独立仓库，避免测试提交触发现有正式站点流水线；仅测试后台时，可以暂不配置公开站点发布。
- 在入口为 `/api/auth/login` 和 `/api/auth/oidc/start` 配置按 IP 限流，例如每分钟 5 次。当前代码只有单实例密码登录限流，不能代替跨云函数实例的入口限制。
- 首轮可只用账号密码登录；若需要验收 OIDC，另行配置身份服务、回调地址和 `sub` 白名单。
- 采用 CLI 上传时，本地完整产物即可开始；采用 Git 导入时，必须先把主题代码提交并推送到选定分支。

已有图片也受 4 MiB 预览限制。测试前检查大图片，不要将这类预览失败误判为部署失败。若要验收“保存后网站自动更新”，还需单独确认测试内容仓的 CI 触发条件和发布目标。

## 方式 A：本地构建，CLI 上传（推荐）

### 1. 在控制台创建后台项目

选择 **直接上传** 类型，项目名例如 `my-blog-studio`。CLI 可以创建项目，但首次使用建议先在控制台创建，便于先配置域名和环境变量。

CLI `makers deploy` 只能更新直接上传类型的已有项目。如果你已经通过 Git 导入建立了项目，使用后面的方式 B，或者另建直接上传项目。

### 2. 配置服务端环境变量

在后台项目的**生产环境**填写以下变量；不要放进公开主站的 TOML、前端 `VITE_*` 变量或代码仓库。

| 变量 | 示例 / 如何填写 |
| --- | --- |
| `STUDIO_ORIGIN` | `https://studio.example.com`，不带路径 |
| `STUDIO_STATE` | 必须为 `blob` |
| `STUDIO_SESSION_SECRET` | 至少 32 字符的随机值；建议本地生成 64 位十六进制字符串 |
| `STUDIO_ADMIN_USER` | 例如 `owner`，这是后台账号 |
| `STUDIO_ADMIN_PASSWORD_HASH` | `npm run password` 输出的完整 scrypt 哈希 |
| `STUDIO_GIT_URL` | 内容仓库最终 HTTPS 克隆地址，例如 `https://cnb.cool/your-group/your-blog.git` |
| `STUDIO_GIT_BRANCH` | 实际已有分支名称 |
| `STUDIO_GIT_USERNAME` | 平台要求的 Git HTTPS 用户名；CNB 示例 `cnb`，GitHub 示例 `x-access-token` |
| `STUDIO_GIT_TOKEN` | 内容仓库可读写令牌 |
| `STUDIO_GIT_AUTHOR` | 可选，例如 `Creator Studio` |
| `STUDIO_GIT_EMAIL` | 建议设置真实的提交者邮箱 |

在主题 `studio/` 中生成所需值：

```sh
npm ci
npm run password -- --lang zh-CN
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

密码哈希包含 `$`。在控制台只粘贴完整**值**，不要复制 `STUDIO_ADMIN_PASSWORD_HASH=`，也不要带 `.env` 示例外层的引号。`npm run setup` 创建的是本机配置，不能原样作为云端配置：其中 `http://localhost` 和 `STUDIO_STATE=file` 必须改掉。

云端不要配置 `STUDIO_SITE_ROOT` 或依赖 `.state/`。函数临时磁盘只用于 Git 临时 checkout，不保存长期会话或站点文件。

**Blob**：代码使用 `wondershine-studio-private` 命名空间，SDK 使用平台提供的部署凭据；这个名称本身不是访问控制开关。不要创建公开读取该命名空间的接口，也不要把 Blob 当成公共图床。本地普通 Node 进程缺少平台凭据时不能直接验证 Blob；不要手动伪造平台注入变量。

### 3. 构建完整产物

仍在主题 `studio/` 目录执行：

```sh
npm test
npm run build
npm run test:deployment
```

最终上传目录：

```text
dist/makers/
├─ index.html
├─ assets/
├─ vendor/vditor/
├─ cloud-functions/api/[[default]].js
├─ package.json
└─ edgeone.json
```

`test:deployment` 检查实际打包后的入口、静态资源、配置、未登录 API 保护以及不应打包的文件。它不联网，也不会部署；通过不等于真实 Blob、Git 推送或线上路由已经通过。

函数产物必须保留具名 `onRequest` 导出。已核对的 EdgeOne 1.6.46 扫描器不会把 `export { onRequest as default }` 识别为处理器；虽然这种模块在 Node 中可导入，部署时仍可能没有 API 路由。当前入口同时导出具名和默认处理器，产物检查会校验两者一致。修改构建流程后必须重新构建、检查并打包，不能重复上传旧 ZIP。

**不要只上传 `dist/client`**，它没有后台 API；也不要上传整个工作目录、`.env` 或 `.state/`。正式 CLI 上传请直接使用这个完整目录，不要改函数路径。

### 4. 登录并部署

本次验证的 CLI 版本：

```sh
npm install -g edgeone@1.6.46
# 中国站账号
edgeone login --site china
# 国际站账号改用：edgeone login --site global
```

登录是根命令 `edgeone login`，不是 `edgeone makers login`。确认登录账号与目标项目在同一站点，然后执行：

```sh
edgeone makers deploy ./dist/makers -n my-blog-studio -e production --skip-ai-gateway-sync
```

这里关闭 CLI 自动同步 AI Gateway 密钥，因为这个后台不使用 AI Gateway。命令里的项目名请换成自己的。

不要使用匿名部署发布管理后台。`deploy --site` 在已核对的 CLI 中用于匿名部署；正常账号应在 `login --site` 选择中国站或国际站。`deploy --area` 则是另一项部署区域选择（`global` / `overseas`），不是账号站点；按项目实际可用区域选择，不要机械照抄。

首次部署后，绑定域名并启用 HTTPS。若先用平台域名测试，`STUDIO_ORIGIN` 就填写那个实际地址；切换域名后更新变量并重新部署。域名接入、备案等要求按平台对应区域的控制台提示完成。

### 5. 完成上线验收

在正式后台域名依次验证：

1. `/` 能打开登录页，`/api/auth/config` 返回 JSON，不能返回登录页 HTML。
2. 未登录访问 `/api/content` 返回 `401`。
3. 用管理员账号登录。成功登录才能证明会话存储实际可写，不应仅凭登录页打开就认定 Blob 正常。
4. 打开文章和站点信息，确认读取的是预期内容仓库。
5. 新建一篇测试**草稿**并保存，到 Git 平台确认提交进入正确分支。
6. 上传一张小于 4 MB 的测试图片，确认预览、选择和保存正常。
7. 退出登录后确认 API 不再可用，再重新登录。可用新的浏览器会话复查认证。
8. 到主站构建平台确认构建触发并成功；测试草稿不应公开。要验证公开页面更新，可使用专门的测试内容按自己的发布流程检查。

测试数据由你确认后清理。后台不会自动创建主站发布流水线，也不会把编辑状态当作部署成功。

## 方式 B：导入主题 Git 仓库

控制台导入包含这份 `studio/` 的**主题仓库分支**，根目录选择 `studio`：

| 设置 | 值 |
| --- | --- |
| 根目录 | `studio` |
| 安装命令 | `npm ci` |
| 构建命令 | `npm run build` |
| 静态输出目录 | `dist/client` |
| 云函数源码 | 根目录下 `cloud-functions/api/[[default]].ts` |
| 构建 Node | `22.21.1`，已写入 `edgeone.json` |

源码模式由平台读取根目录 `cloud-functions/`；`dist/client` 只是静态输出配置，不能单独拿去做手动上传。

官方 Build Guide 已列出预装 Node 22.21.1，本项目通过 `edgeone.json` 明确指定该版本。部分旧配置示例仍写 22.11，低于本项目要求，不要照抄。构建日志中仍应确认实际 `node --version`；如果账号所在环境未提供所需版本，采用方式 A。`package.json` 的 engines 声明本身不是切换运行时的命令。

主题代码中的本地未提交文件，不会出现在远程导入构建里。主题更新需要先进入主题仓库目标分支；主站仓库里的 submodule 指针更新并不等于主题改动已发布。不要让平台误用主题演示站点的 Zola 构建命令。

如果坚持从包含 submodule 的主站仓库导入，必须确保平台 checkout 初始化了正确的主题 submodule，再把根目录指向 `themes/<主题目录>/studio`；这条路径比直接导入主题仓库更容易出错，本文不将其作为首选。

## OIDC 和预览环境

OIDC 可与密码登录并存。配置 `STUDIO_OIDC_ISSUER`、`STUDIO_OIDC_CLIENT_ID`、身份服务需要的 `STUDIO_OIDC_CLIENT_SECRET`，以及明确的 `STUDIO_OIDC_SUBJECTS` 管理员白名单。在身份服务登记：

```text
https://studio.example.com/api/auth/oidc/callback
```

`sub` 不是邮箱、昵称或 Git 用户名。只用 OIDC 时，同时移除密码账号和哈希变量。先按身份服务说明完成注册，再按实际账号测试；普通 GitHub OAuth 不能直接替代标准 OIDC。

预览部署使用测试仓库、独立会话密钥和匹配的 origin/OIDC 回调。建议另建测试后台项目，避免生产与预览共用项目状态命名空间或凭据。不要把生产写权限自动提供给不可信分支构建。

## 平台限制与当前实现

| 项目 | 当前处理 |
| --- | --- |
| 函数类型 | Node.js Cloud Functions，不能迁移到 Edge Functions 目录代替 |
| 官方请求/响应体上限 | 6 MB；本后台 Makers 模式保守限制单张上传及预览为 **4 MiB**，界面简写 4 MB |
| 本地 / 独立 Node 图片限制 | 继续为 20 MiB；云端不会显示同样的 20 MB 承诺 |
| 执行时间 | 源码配置请求 120 秒。官方直接上传指南仅承诺识别 redirects/rewrites/headers，因此上传产物中的 maxDuration 不能证明生效，需在平台确认实际函数时长 |
| 函数运行时 | 官方 Node v20.x；项目产物在 Node 20.19.0 验证通过 |
| Git | 临时浅克隆、小型内容仓库；大仓库、慢网络或多次克隆仍可能超时 |
| 会话 | Blob 强一致读取；本地文件会话不可用于此云端入口 |
| 图片 | 存在 Git 中，不通过 Blob 图床；更大的既有图片会在媒体库标记不可预览 |

直接上传模式不能按配置文件就认定获得 120 秒时长；请检查平台实际配置。即使 120 秒生效，也不是速度保证。若内容仓包含大量图片、历史或大附件，优先缩小内容仓库；也可将同一后台放到有持久磁盘的 Node 服务。套餐额度与运行费用不在本地验证范围内，不承诺“永久免费”。

## 常见部署问题

| 现象 | 优先检查 |
| --- | --- |
| `/api/auth/config` 返回 HTML / 404 | 检查完整函数目录、产物的具名 onRequest 导出和平台函数列表；旧 ZIP 可能未注册路由。另检查是否只上传静态目录或添加了覆盖 `/api/*` 的 SPA 重写。此时先排查部署，不要靠修改 OIDC 密钥解决 |
| API 返回 503 | `STUDIO_STATE=blob`、HTTPS origin、Git URL、session secret、密码/OIDC配置，以及平台 Blob 能力是否完整 |
| 能打开登录页，但登录报错 | Blob 运行时凭据与服务可用性；函数日志只看必要错误，不粘贴密钥 |
| 登录报 403 | 实际浏览器域名与 `STUDIO_ORIGIN` 是否完全一致，是否混用预览域名和正式域名 |
| Git clone 失败 | 网络、最终 HTTPS URL、分支和令牌权限；服务端不跟随 Git URL 重定向 |
| 保存失败但能读 | 分支保护或 token 只有只读权限；不要 force push 或反复覆盖 |
| CLI 提示项目类型不支持 | 该项目可能是 Git 导入类型；改用原构建流程或另建直接上传项目 |
| 构建提示 Node 版本不符 | 确保实际构建 Node 22.12+，或改用预构建上传 |
| 图片报 413 | Makers 当前每张限制 4 MB；前端旧版本请刷新，压缩后再上传 |
| 大图片预览失败 | 已有 Git 图片也受函数响应体限制，压缩或使用已有外部图片地址 |
| 保存耗时过长 | 检查函数120秒配置是否生效、仓库体积和Git访问网络 |
| 主站没有变化 | 检查内容分支对应的 CI、草稿状态和主站部署日志 |

## 加载速度与等待反馈

工作台并行读取站点配置和内容。一个运行中的函数实例会让配置、文章和媒体共用只读 Git 快照，缓存 30 秒，合并同一时刻的仓库拉取。冷启动或不同实例仍需要首次拉取；这不是跨实例的永久缓存。

保存、删除和上传仍使用独立的最新 checkout 校验版本，操作结束后清掉该实例的只读缓存。其他实例会在各自缓存过期后看到新内容。仓库外部更新也可能有最多 30 秒的缓存窗口；文章列表的「刷新内容」和媒体库的「刷新仓库」会主动重新读取。

页面等待时显示骨架屏和加载提示，超过 8 秒提示仍在等待服务器；只读 API 请求最多等待 60 秒，失败后可以重试。加载完成前不显示零计数或“没有内容”。系统开启减少动态效果时会停用动画。

本地可先运行 `npm run build`，再运行 `npm run test:loading`，用临时测试站点验证慢请求、失败重试与移动端；该检查不使用真实 OIDC 或内容仓库。

这些优化不需要新增环境变量。如果首次打开依然慢，可检查内容仓库的图片体积和 Git 网络耗时。缓存能减少重复传输，但不能消除第一次 clone 或函数冷启动。

## CI 与更新

主题根目录的 `.cnb.yml` 已引用 `deploy/cnb-build.yml`：CNB `main` 更新后执行测试、构建、产物检查并部署到 EdgeOne。GitHub → CNB 同步及部署密钥配置见 [自动构建与发布](ci.zh-CN.md)。需先配置凭据并发布源码，才会在线生效。`deploy/github-build.yml` 仍是可选的仅构建示例。

Makers 部署凭据与 `STUDIO_GIT_TOKEN` 是不同用途。前者给 CI 发布后台，后者仅给运行中的后台写内容。运行时密钥放在后台项目环境配置中，不需要写进构建产物。

更新后台：更新主题代码 → 安装依赖 → 测试/构建/产物检查 → 部署 → 再做登录和测试草稿验收。回滚后台代码不等于回滚内容 Git 提交；需要分别处理。环境变量变更后同样重新部署。

## 核对依据与验收边界

已做：源码和预构建配置一致性检查、实际产物的函数导出与未登录请求测试、Node 20.19.0 加载检查、媒体上限测试及浏览器验证。尚未做：你的 EdgeOne 账号/地域内实际部署、真实 Blob 会话、OIDC 提供方、真实内容仓推送及主站发布。

官方参考：

- [Node Functions：入口与路由](https://pages.edgeone.ai/document/node-functions)
- [Cloud Functions：运行时与请求/响应限制](https://pages.edgeone.ai/document/cloud-functions)
- [edgeone.json 配置](https://pages.edgeone.ai/document/edgeone-json)
- [EdgeOne CLI](https://pages.edgeone.ai/document/edgeone-cli)
- [Direct Upload：函数目录及配置字段限制](https://pages.edgeone.ai/document/direct-upload)
- [Blob Storage](https://pages.edgeone.ai/document/blob-storage)
- [Build Configuration](https://pages.edgeone.ai/document/build-guide)

CLI 参数还用 `edgeone@1.6.46` 的 `login --help`、`makers deploy --help` 实际核对；升级 CLI 后以当前帮助和官方文档为准。
