# Wonder Shine 创作中心

这是主题自带的 SSG 管理后台。文章仍然是 Markdown，配置仍然是 TOML；你在网页中编辑，服务端负责保存文件或提交 Git，Zola 继续生成公开网站。

后台与主站分开部署，建议使用 `studio.example.com`。访问者不需要登录主站；管理员登录后台后才能读取内容、修改设置。前端沿用主题的颜色变量，登录后读取站点主题色、字体和明暗偏好。

## 从这里开始

- 第一次使用：[中文快速开始](docs/quick-start.zh-CN.md) · [English quick start](docs/quick-start.en.md)
- 已有配置或遇到问题：[配置参考与排错 / Configuration and troubleshooting](docs/setup.md)
- 查具体功能：[媒体库与选图](#媒体库与选图) · [页面与模板设置](#页面与模板设置) · [编辑与恢复](#编辑与恢复)
- 部署与登录：[账号与 OIDC](#账号与-oidc) · [Git 内容仓库](#接入-githubcnb-或其他-git-仓库) · [Makers 部署](#部署到-edgeone-makers)

新安装在 `studio/` 执行：

```sh
npm ci
npm run setup
npm run doctor
npm run dev
```

向导支持中英文，创建管理员、随机会话密钥和本地/Git 内容连接，保留已有 `.env`。登录后工作台提供可关闭的入门指引，左侧「使用指南」随时可以重新打开。没有公开注册或浏览器内密钥设置入口。

## 已实现

- 单管理员账号密码，以及标准 OIDC；两种方式可以同时启用。
- 站点信息、顶部/左侧/页脚导航、友链分组、关于页组件、首页推荐、标签/分类字典和外观设置。
- 文章、页面、专栏、合集、章节的创建、编辑与删除。文章和页面列表隐藏结构目录；专栏按层级浏览，支持跨层级搜索、分页与分组设置。非空专栏/合集不能直接删除。
- 标签、分类、合集展示标签使用统一多选控件（不超过 5 项平铺，超过 5 项在遮罩弹窗中搜索选择），界面显示名称，保留原有标识和未登记的旧标签；新增名称在「标签与分类」中管理。新建文章可选择所属合集，新建合集或章节直接选择上级名称，支持中文目录。已有内容的所属目录暂不支持移动。
- Markdown 源码、可视化编辑、经过 DOMPurify 清理的正文预览。含 Zola shortcode 的文稿使用源码编辑，保留原文。
- 媒体库：上传、浏览当前仓库图片，搜索、按来源/文件夹筛选、预览、刷新与复制路径；图片表单统一支持选图与上传，Markdown 源码支持上传并插入图片。
- 本地浏览器草稿恢复、下载备份、保存前版本检查。配置表单离开时提示未保存更改，并保留当前标签页的恢复副本。
- 中文与英文界面：首次按浏览器语言选择，无匹配时使用英文；登录页和后台右上角可手动切换，并记住选择。
- 本地文件模式，以及 GitHub / CNB / 其他标准 HTTPS Git 服务的通用 Git 模式。
- Node 独立运行产物和 EdgeOne Makers Cloud Functions 产物。

**保存成功不等于网站已经上线。**「草稿 / 已发布」表示内容的编辑状态，不代表线上部署结果。Git 模式提交后由已有 CI 构建发布；本地模式需要另外运行 Zola。后台不会虚构部署进度。

登录过期后，账号密码重新登录会保留当前表单；OIDC 跳转回来后，重新打开原配置分组可恢复当前标签页副本。

当前不包含自动创建仓库、远程 Git 分支管理、多人细分角色、云端草稿和发布状态查询。图片可上传到仓库、选择已有仓库图片，也可填写已有图床地址；图片字段与正文预览通过登录后的接口读取仓库附件。恢复草稿只保存在当前浏览器，同一设备清理浏览器数据后无法恢复，公共设备请用完后清理草稿。

## 界面语言

默认语言为英文。首次访问按浏览器的语言偏好顺序匹配英文或中文，中文地区变体统一使用简体中文；没有支持的语言时回退到英文。首次结果和之后的手动选择保存在当前浏览器，下次访问沿用；浏览器禁止本地存储时仍可在当前页面切换。

登录页和后台右上角均可选择 `English` 或 `简体中文`。切换即时生效，保留未保存的表单和文章内容。后台语言只影响菜单、控件、提示和编辑器，不修改主站的 `default_language`、文章正文、标题、标签名称或配置值。

## 媒体库与选图

左侧「媒体库」显示当前内容仓库 `static/` 和 `content/` 内的图片，支持搜索、文件夹筛选、分页预览和复制路径。Git 模式沿用已有服务端 Git 凭据，不需要额外图床 key；仓库更新后点击「刷新仓库」读取新图片。

Logo、头像、二维码、背景、装备图片、个人照片等图片表单都有「选择或上传」，选中后点「使用这张图片」才会填入字段；取消不会修改原值，最终仍需保存表单。

友链的 `logo` 显示为「备用图标地址」，后台仅保留和编辑地址，不会自动拉取或预览；`local_logo`「本地图标」正常预览、选择和上传。此规则同时适用于 JSON 和 TOML 友链清单。

媒体库和图片弹窗顶部都有上传区：点击「选择文件」或拖入图片，一次最多 20 张，本地/独立 Node 每张最多 20 MB，Makers 每张最多 4 MB；界面按部署显示限制。保存位置使用选择控件：公共图片默认存入 `static/uploads/`，也可选择库中已有的公共图片文件夹；当前文稿为 `index.md` 或 `_index.md` 时，可上传到该文稿目录，文章封面默认使用此位置。普通单文件文章使用公共图片。

上传后立即保存图片，逐张显示结果并选中成功上传的图片；失败不会清除已经成功的图片。同名文件自动添加随机后缀，不覆盖原图。关闭选择弹窗只取消表单选择，已经上传的文件仍保留在媒体库。新文稿尚未保存时，上传的配图也会先留在仓库。

本地模式写入当前站点目录，Git 模式按图片单独提交并推送到配置分支，沿用现有仓库写权限，不需要新增 key。上传成功会刷新本实例的媒体缓存；若 Git 返回结果未确认，先刷新媒体库检查，再决定是否重试。图片公开可访问仍需等待主站部署。

上传校验扩展名、文件头、路径与大小。SVG 使用严格静态子集，允许常见形状、渐变、同文档引用和基础 fill/stroke 样式，不接受脚本、动画、外部资源或复杂 CSS；不符合要求的 SVG 可导出为 PNG 后上传。原有仓库图片不在上传时自动改写。服务器或云平台若设置更小的请求体限制，以实际限制为准；本地/独立 Node 上限为 20 MiB，Makers 为 4 MiB。

- 公共图片：从 `static/` 选择，例如 `static/img/logo.webp` 自动填写为 `/img/logo.webp`。
- 文章封面：独立目录内的 `index.md` 选择同目录图片，保存文件名；普通 `story.md` 请使用「公共封面」选择公共图片。专栏/合集分组的封面使用公共图片。
- 正文插图：切到「Markdown 源码」，将光标放到需要的位置，点击「插入图片」。可选公共图片；`index.md` 页面包和 `_index.md` 分组还可选直接同目录图片。中文、空格和圆括号会正确编码。
- 其他内容目录的图片可在媒体库浏览和复制仓库路径；仓库路径不是公开网址，不应直接粘贴到任意页面。

支持 JPG、JPEG、PNG、WebP、AVIF、GIF、SVG、ICO、BMP。单张预览上限本地/独立 Node 为 20 MB、Makers 为 4 MB，单次最多列出 5000 张图片并扫描 20000 个条目；隐藏路径、符号链接及生成目录会跳过。SVG 仅作为图片显示。媒体接口需要登录，Git 凭据不会发给浏览器。

当前媒体库提供上传、浏览和选择，不包含删除或手动重命名。Git LFS 图片及其他 submodule 中的图片暂不支持。主题自带但没有放入当前内容仓库的图片不会列出；已有配置地址会保留。

## 页面与模板设置

从「页面」打开一页，使用「正文与属性」编辑标题、摘要、地址和正文，使用「页面设置」维护模板实际使用的数据。新建页面时可选择页面类型。

| 页面类型 | 对应设置 |
| --- | --- |
| 关于页 | 介绍、组件、个人信息、技能清单、赞赏名单 |
| 装备页 | 横幅与按钮（config.toml）、设备分组与清单（data.toml） |
| 友链页 | 展示模式、动态 JSON 清单或静态 TOML 清单 |
| 音乐页 | 播放器开关、歌单与音乐服务；与导航音乐共用 |
| 公众号页 | 二维码、头像、名称、简介、扫码帮助 |
| 归档页 | 共享侧栏与标签名称；文章列表自动生成 |
| 含 subscribe_list 的页面 | 公众号、Follow、RSS 订阅卡片链接 |
| 普通 Markdown 页 | 正文驱动，没有独立模板设置 |

同一模板的多份页面共享对应的 config.toml/data.toml 设置。正文与设置分别保存；未保存的配置会阻止更换模板或移除相关组件入口。自定义模板保留原始模板值，但需要在 `studio/shared/page-settings.ts` 注册专属字段后才能显示配置表单。

公众号名片使用可选的 `[extra.wechat]` 配置（`qrcode`、`avatar`、`name`、`description`、`tips`、`help_text`、`help_url`）。订阅卡片使用可选的 `[extra.subscribe]`（`wechat_url`、`follow_url`、`rss_url`）。通过后台保存时会自动写入这些字段；已有站点未设置时继续使用模板默认值。

## 本地启动

开发和构建需要 Node.js 22.12+、npm，以及包含 `config.toml`、`data.toml`、`content/` 的站点目录。

推荐按上面的 `npm run setup` 完成首次配置。已有 `.env` 不会被覆盖；只想手动配置时，在主题的 `studio/` 目录执行（仅在没有 `.env` 时复制示例）：

```sh
npm ci
test -e .env || cp .env.example .env
npm run password
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

把生成的密码哈希和随机字符串填入 `.env`：

```dotenv
STUDIO_ORIGIN=http://localhost:5173
STUDIO_SITE_ROOT=../../..
STUDIO_STATE=file
STUDIO_SESSION_SECRET=填入随机字符串
STUDIO_ADMIN_USER=owner
STUDIO_ADMIN_PASSWORD_HASH='填入完整的scrypt哈希'
```

`STUDIO_SITE_ROOT=../../..` 适用于 `站点/themes/主题/studio` 结构。它指向**主站仓库**；修改主题自带的演示站点时改为 `..`。也可以写绝对路径。本地模式会在站点根目录保存历史副本，请在**内容仓库自身**的 `.gitignore` 加入 `.studio-history/` 和 `.studio-write-lock/`；主题的忽略规则不能代替主站仓库的规则。

```sh
npm run doctor
npm run dev
```

浏览器打开配置的 `STUDIO_ORIGIN`。必须保持 hostname 一致，不能配置 `localhost` 却用 `127.0.0.1` 登录。开发服务仅监听本机。

生产独立运行：

```sh
npm run build
npm start
```

默认仍监听 `127.0.0.1:5173`。需要反向代理时设置公开 HTTPS `STUDIO_ORIGIN`，按部署需要设置 `STUDIO_HOST` 和 `PORT`。打包产物支持 Node.js 20.19+。单机持久化模式可使用文件会话；多实例/无服务器部署使用下面的 Blob 模式。不要把 `.state`、`.studio-history` 或 `.env` 放进静态输出目录。

## 账号与 OIDC

账号密码是后台自身的管理员账号，与 Git 仓库账号无关。密码只保存 scrypt 哈希（单次验证使用约 128 MiB 内存，函数应预留足够内存，建议至少 256 MiB）；没有公开注册入口。修改密码后重启服务会令旧会话失效。

OIDC 使用标准的 Authorization Code + PKCE，校验签名、issuer、audience、nonce、state 和管理员 `sub` 白名单。GitHub 普通 OAuth 登录不属于这套 OIDC 登录接口。可接入已经支持标准 OIDC 的身份服务，无需为每个 Git 平台开发登录适配。

在身份服务创建 Web 应用，登记完整回调地址：

```text
https://studio.example.com/api/auth/oidc/callback
```

服务端配置：

```dotenv
STUDIO_OIDC_ISSUER=https://identity.example.com/realms/blog
STUDIO_OIDC_CLIENT_ID=creator-studio
STUDIO_OIDC_CLIENT_SECRET=身份服务发放的密钥
STUDIO_OIDC_SUBJECTS=管理员的sub值,另一个管理员的sub值
STUDIO_OIDC_LABEL=统一身份登录
```

- `issuer` 必须与身份服务返回的值完全一致，包括可能存在的末尾斜杠。
- `sub` 是身份服务中的稳定用户 ID，不是邮箱、昵称或 Git 用户名；从身份服务的管理员界面取得。
- 所有白名单用户都拥有完整后台权限。邮箱后缀、首次登录者都不会自动变成管理员。
- 公共客户端可不填 client secret，但身份服务必须允许对应 Web 客户端使用 PKCE。普通 confidential Web client 应填写 secret。
- 仅启用 OIDC 时，删掉账号及密码哈希两项；保留两项即可同时支持密码登录。
- 会话有效期 8 小时；退出登录删除服务端会话。轮换 session secret 后重启/重新部署可撤销全部会话。
- 登录接口有单实例限流。正式部署请为 `/api/auth/login` 和 `/api/auth/oidc/start` 在入口配置按 IP 限流，例如每分钟 5 次；函数内部计数不是分布式限流。

## 接入 GitHub、CNB 或其他 Git 仓库

先创建好仓库和分支，放入真实 Zola 站点文件。配置：

```dotenv
STUDIO_GIT_URL=https://github.com/your-name/your-blog.git
STUDIO_GIT_BRANCH=master
STUDIO_GIT_USERNAME=x-access-token
STUDIO_GIT_TOKEN=仅该仓库可写的token
STUDIO_GIT_AUTHOR=Creator Studio
STUDIO_GIT_EMAIL=studio@example.com
```

| 仓库 | HTTPS 用户名 | 凭据要求 |
| --- | --- | --- |
| GitHub | `x-access-token` | 建议 fine-grained PAT，仅目标仓库 `Contents: Read and write` |
| CNB | `cnb` | 使用该仓库支持 HTTPS 克隆和推送的访问令牌，限制到目标仓库 |
| GitLab / Gitea / 其他 | 按该平台的 Git HTTPS 规定 | 对目标分支可读写的 token / app password |

后台通过 Git smart HTTP 操作，不依赖某个平台的文件 API。兼容前提是标准 Git HTTPS、网络可达、目标分支允许直接推送。不能保证任意私有网络、SSO 网关或定制协议兼容。SSH、Git LFS、客户端证书和交互式认证暂不支持；内容位于另一个 submodule 内也不能自动跨仓写入。

Git URL 必须使用最终 HTTPS 地址，不可内嵌账号密码。为避免凭据通过重定向泄漏，服务端不跟随重定向。保存只提交目标文件，不 force push；遇到新提交或分支保护会保留编辑内容并提示检查。

内容读取/保存会进行临时浅克隆，配置保存最多需要多次克隆。媒体列表与缩略图在同一服务实例内共享最多 60 秒的临时 checkout，点击刷新会重新读取仓库；不同函数实例仍可能分别克隆。适合小型博客；大型仓库、很多大图片或严格的函数超时限制下，请使用独立内容仓，或者把同一后台部署到有持久磁盘的 Node 环境。不要对外宣称零成本或无限容量。

Git 连接使用服务端凭据；普通编辑用户看不到 token。账号密码认证、OIDC 配置、Git 写入凭据、Makers 部署 token 是四件不同的事。**任何 secret 都不能加 `VITE_` 前缀或写入 TOML、Markdown、公开仓库。**

## 部署到 EdgeOne Makers

完整操作步骤：[EdgeOne 中文部署指南](docs/deploy-edgeone.zh-CN.md) · [English deployment guide](docs/deploy-edgeone.en.md)。包含中国站/国际站登录、环境变量、域名、Blob、OIDC、Git、CI、验收与排错。

持续发布：[GitHub 主题源 → CNB 镜像 → EdgeOne 自动构建与部署](docs/ci.zh-CN.md) · [English CI guide](docs/ci.en.md)。主题根目录已提供 CNB 流水线入口；首次启用需配置镜像与部署凭据，再发布源码。

推荐 **本地或 CI 构建 → CLI 上传 `dist/makers`**。后台使用 Node.js Cloud Functions，公开 Zola 主站独立部署；不能只上传 `dist/client`。CLI 更新已有项目时要求项目是「直接上传」类型，Git 导入项目使用自己的构建部署流程。

```sh
npm ci
npm test
npm run build
npm run test:deployment
# 先安装 CLI、登录并配置项目变量；完整步骤见上面的指南。
edgeone makers deploy ./dist/makers -n your-studio-project -e production --skip-ai-gateway-sync
```

运行时需要 HTTPS `STUDIO_ORIGIN`、`STUDIO_STATE=blob`、Git 内容仓库和密码或 OIDC 认证。Blob 使用平台凭据保存会话，图片保存在 Git。源码导入根目录为 `studio`，`edgeone.json` 指定构建 Node 22.21.1；Node 独立产物已在 20.19.0 验证。

Cloud Functions 请求/响应体限制为 6 MB，因此本后台 Makers 模式对单张上传和预览采用 **4 MiB** 上限（界面显示 4 MB）；本地/独立 Node 保留 20 MiB。源码配置请求 120 秒；官方直接上传指南仅承诺识别 redirects/rewrites/headers，上传模式须另外确认实际函数时长。仍需关注仓库体积与网络。配置和产物检查不替代账号内真实登录、Blob、Git 推送与主站发布验收。

## 编辑与恢复

- TOML 只修改白名单中的对应字段，未改动的字段与注释保留。被编辑的对象/数组整体重新排版，其内部注释不保证保留。
- 未知 frontmatter 字段会保留。既有 shortcode 保持源码，不自动转换成富文本。
- 专栏对应 `content/collections/<column>/_index.md`；合集位于专栏下，使用 `collection-detail` / `collection-content` 模板；章节为合集下的 Markdown。先创建上级目录对应的专栏/合集，再创建子内容。
- 页面正文在“页面”编辑；关于页卡片在“关于页设置”编辑。
- 标签字典中的 `id` 供文章 `taxonomies.tags` / `taxonomies.categories` 引用，`name` 为展示名称。重命名/删除字典不会批量改写已有文章，请同步调整内容。
- 文件发生外部修改时保存返回冲突。先下载当前编辑内容的备份，再重新加载远程文件合并；没有“强制覆盖”按钮。
- 本地文件原文保存在站点根目录 `.studio-history/`，Git 模式用 Git 提交历史恢复。手动恢复前先停止编辑服务。
- 本地写锁 `.studio-write-lock/` 防止并发覆盖；若进程被强制终止留下旧锁，确认没有保存任务后再删除锁目录。
- 下载备份为含正文与元数据的 JSON 恢复副本，不是可直接交给 Zola 的文章文件。

## 统一表单体验

- 关联/固定选项不超过 5 项时平铺，单值用单选、多值用多选；超过 5 项使用带搜索的选择弹窗。取消、Esc 和遮罩关闭都不写入选择，确认后更新表单。
- 推荐文章按标题选择，保存 content-relative 文件路径；导航和其他链接可选择站内页面，也可保留外部地址。`safe` / `off` 路由及 ASCII `on` 路由可推导；多语言及需要非 ASCII 转写的路径会提示手动填写构建后的地址。
- 日期与时间分别使用选择器，已有时区和小数秒精度会保留；时间控件显示到毫秒，未修改时间时保留更高精度。文章/章节的发布时间不可清空，选填更新时间清空后删除元数据字段。旧格式无法识别时展示原值，等待用户修正。
- 颜色支持实时色块预览、系统颜色选择器和文本值。主题色需要六位十六进制；其他已有颜色表达式保留，使用选择器后转为十六进制。
- 内置字体图标和 SVG 图标可预览、搜索选择，个人标签的表情可预览与替换。自定义图标集保留原值，暂不解析外部 SVG，也不执行配置中的 HTML。
- 表单填入已声明的默认值和必要的结构字段，尊重明确填写的空值、false 和 0；默认值本身不会使页面变为待保存。新增列表条目使用干净默认值，不复制上一位作者、设备或友链的信息。可选 SVG 图标集和本地 Logo 不补空串，以保留主题继承行为。

## 验证

```sh
npm test
npm run typecheck
npm run build
npm run test:deployment
# 安装了 Chrome/Chromium 时，运行浏览器回归；自动使用临时站点，不修改你的内容。
npm run test:browser
# 安装 Zola 后，独立验证无分类文章、相关推荐、公众号与订阅配置的实际 HTML 输出。
npm run test:templates
```

浏览器不在默认位置时，设置 `STUDIO_TEST_BROWSER` 为可执行文件绝对路径。截图写入 `test-results/`。若系统安装了 Zola，浏览器测试还会构建新增文章、专栏、合集与章节，并访问生成的主站页面检查 production 脚本错误、图片加载及公众号桌面/移动布局。

测试涵盖 TOML 精确修改、主题文档 roundtrip、真实配置加载、路径与 symlink 限制、并发保存、密码/CSRF/会话，以及带真实 RSA 签名的模拟 OIDC provider。Git 集成测试通过本地 `git http-backend` 运行真实克隆和推送，需要系统 `git`。

官方参考：
- https://pages.edgeone.ai/document/node-functions
- https://pages.edgeone.ai/document/blob-storage
- https://pages.edgeone.ai/document/edgeone-cli
- https://github.com/panva/openid-client
