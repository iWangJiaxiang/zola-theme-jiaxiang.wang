# 配置与排错 / Configuration and troubleshooting

[中文快速开始](quick-start.zh-CN.md) · [English quick start](quick-start.en.md) · [完整文档](../README.md) · [EdgeOne 部署](deploy-edgeone.zh-CN.md) / [Deploy to EdgeOne](deploy-edgeone.en.md)

## 选择运行方式 / Choose a mode

| 方式 / Mode | 内容保存位置 / Content | 会话存储 / Sessions | 适用场景 / Use |
| --- | --- | --- | --- |
| Local | `STUDIO_SITE_ROOT` 目录 / directory | File | 电脑上写作 / writing on your computer |
| Git + Node | HTTPS Git 分支 / branch | File on persistent disk | 独立主机 / dedicated server |
| Git + Makers | HTTPS Git 分支 / branch | Blob | 无服务器 / serverless |

`npm run setup` 为本机运行创建初始配置，可选择本地或 Git 内容来源。之后可按下面的说明改成正式部署配置。它不会覆盖已有 `.env`，不创建仓库、不创建 OIDC 应用、不创建主站发布流程。

`npm run setup` creates an initial configuration for local execution with local or Git content. Adjust it for production afterward. It does not overwrite `.env`, create repositories, provision an OIDC provider or create your site deployment workflow.

## 首次配置与已有配置 / New and existing configurations

新安装 / New installation:

```sh
npm ci
npm run setup
npm run doctor
npm run dev
```

命令默认按终端 `LC_ALL` / `LC_MESSAGES` / `LANG` 选择语言，无匹配则英文；可追加 `-- --lang en` 或 `-- --lang zh-CN`。现有 `.env` 不会被向导替换。

The commands detect the terminal language and fall back to English. Append `-- --lang en` or `-- --lang zh-CN` to choose explicitly. The wizard leaves existing `.env` files untouched.

已有配置或只想手动设置 / Existing configuration or manual setup:

1. 只在没有 `.env` 时复制 `.env.example`。/ Copy `.env.example` only if you do not already have `.env`.
2. 运行 `npm run password` 生成密码哈希；不要把明文密码填入 `STUDIO_ADMIN_PASSWORD_HASH`。/ Generate a hash; never put the plaintext password in the hash variable.
3. 运行下面的命令生成随机会话密钥，保存到 `STUDIO_SESSION_SECRET`。/ Generate and save a random session secret:

   ```sh
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. 按表格填写变量，运行 `npm run doctor`。修改后重启服务。/ Complete the variables, run diagnostics, then restart.

`.env` 中的 scrypt 哈希包含 `$`，保持单引号包围完整值。部署平台控制台填写的是值本身，不要连外层引号一起复制。已有 shell 环境变量会优先于 `.env`；检查与启动应使用同一套环境。

Keep the full scrypt hash in single quotes inside `.env`. In a deployment dashboard, enter the value without these outer quotes. Existing shell environment variables override `.env`; use the same environment for diagnostics and startup.

## 环境变量 / Environment variables

| Variable | 用途 / Purpose | 默认或要求 / Default or requirement |
| --- | --- | --- |
| `STUDIO_ORIGIN` | 后台公开地址 / Studio origin | `http://localhost:5173`; public hosts require HTTPS; no path |
| `STUDIO_SESSION_SECRET` | 会话签名 / Session secret | Required, at least 32 characters; wizard generates 64 hex characters |
| `STUDIO_ADMIN_USER` | 后台账号 / Admin username | Pair with password hash; no default account/password |
| `STUDIO_ADMIN_PASSWORD_HASH` | 密码哈希 / Password hash | Output of `npm run password`; wizard generates it automatically |
| `STUDIO_SITE_ROOT` | 本地站点目录 / Local site root | Runtime default `..`; example `../../..`; wizard writes an absolute path |
| `STUDIO_STATE` | 会话存储 / Session storage | `file` by default; use `blob` for Makers |
| `STUDIO_STATE_DIR` | 本地会话目录 / File sessions directory | `.state`, relative to Studio's working directory |
| `STUDIO_GIT_URL` | Git 内容仓库 / Git content repository | Setting it selects Git mode; final HTTPS clone URL without credentials |
| `STUDIO_GIT_BRANCH` | 已存在的写入分支 / Existing target branch | Runtime default `master`; wizard asks and suggests `main`; verify your actual branch |
| `STUDIO_GIT_USERNAME` | Git HTTPS 用户名 / Git HTTPS username | Runtime default `x-access-token`; use the Git host's required value |
| `STUDIO_GIT_TOKEN` | 仓库凭据 / Repository credential | Needs repository read and target branch write permission |
| `STUDIO_GIT_AUTHOR` | 提交者名称 / Commit author | `Creator Studio` |
| `STUDIO_GIT_EMAIL` | 提交者邮箱 / Commit email | `studio@localhost`; change for your hosted repository |
| `STUDIO_OIDC_ISSUER` | OIDC issuer | Exact HTTPS issuer from your provider |
| `STUDIO_OIDC_CLIENT_ID` | OIDC 应用 / OIDC client | Required when OIDC is enabled |
| `STUDIO_OIDC_CLIENT_SECRET` | OIDC 应用密钥 / Client secret | Required by confidential clients; optional for compatible public clients |
| `STUDIO_OIDC_SUBJECTS` | 管理员白名单 / Admin allowlist | Required for OIDC; comma-separated stable `sub` IDs, not emails |
| `STUDIO_OIDC_LABEL` | 登录按钮 / Sign-in label | Built-in label is translated; custom labels are preserved |
| `STUDIO_HOST` | 独立服务监听地址 / Standalone bind address | `127.0.0.1`; development always listens locally |
| `PORT` | 独立服务端口 / Standalone port | `5173`; development uses the port in `STUDIO_ORIGIN` |

至少启用密码或 OIDC 之一。仅使用 OIDC 时同时移除 `STUDIO_ADMIN_USER` 和 `STUDIO_ADMIN_PASSWORD_HASH`。Git 凭据不参与后台登录。不要给密钥添加 `VITE_` 前缀。

Enable password sign-in, OIDC, or both. For OIDC only, remove both password account variables. Git credentials do not sign you into Studio. Never prefix secrets with `VITE_`.

## 检查范围 / What diagnostics checks

```sh
npm run doctor
npm run doctor -- --connect
```

默认检查配置格式、认证必填项、本地站点 TOML/内容目录和目录写权限，不写入文件。`--connect` 在 Git 模式读取目标分支中的 `config.toml` 和 `data.toml`；会产生正常的临时 checkout，完成后清理，不提交、不推送。网络超时或无权限会返回失败。

By default, diagnostics validates configuration and local site files without writing them. In Git mode, `--connect` reads the configured branch's TOML files using temporary checkouts, cleaned up afterward. It does not commit or push.

检查不会验证：每个文件的写权限、分支保护是否允许推送、OIDC 实际登录、Blob 运行时访问、Makers 套餐额度、Zola 编译或网站部署。这些需要在相应环境做实际测试。看到 `WARN` 不代表失败，也不能理解为这一项已经完成。

The check does not prove individual file write access, push authorization, OIDC login, Blob availability, platform quotas, Zola compilation or deployment. Verify those in the target environment. A warning is neither a failure nor a completed check.

## 常见问题 / Troubleshooting

| 现象 / Symptom | 处理 / Action |
| --- | --- |
| `.env already exists` | 向导保护已有配置。编辑现有 `.env` 并运行 doctor。/ Edit the existing file and run doctor. |
| 缺少 `config.toml` / Missing site files | `STUDIO_SITE_ROOT` 应指向主站根目录，不是 `studio/`。/ Point to the site root, not Studio. |
| 登录失败 / Sign-in rejected | 使用后台账号；确认地址 hostname 与 `STUDIO_ORIGIN` 一致。/ Use the Studio account and configured hostname. |
| 忘记密码 / Forgotten password | 运行 `npm run password`，替换完整哈希，重启服务；旧会话失效。/ Replace the hash and restart. |
| OIDC 没有权限 / OIDC access denied | 核对 `sub` 白名单、issuer、client 和完整回调地址。/ Check allowed subjects and provider configuration. |
| Git 读取失败 / Git read fails | 检查最终 HTTPS clone URL、token、分支和网络；重定向不被跟随。/ Check the final URL, credential, branch and network. |
| 能读不能保存 / Reads work, saves fail | 检查 token 写权限和分支保护；后台不 force push。/ Check write permission and branch protection. |
| 保存冲突 / Save conflict | 下载当前编辑备份，再重新读取并合并；不要反复点击保存。/ Back up, reload and merge changes. |
| 上传报 413 / Upload returns 413 | 本地/Node 每张 20 MB，Makers 每张 4 MB；压缩后重试。/ Local/Node: 20 MB; Makers: 4 MB per image. |
| SVG 被拒绝 / SVG rejected | 只接受安全静态 SVG 子集；可导出 PNG。/ Export complex or active SVG as PNG. |
| 只有页面，没有 API / UI works, API missing | Makers 需要完整 `dist/makers` 产物，不是仅 `dist/client`。/ Deploy the full artifact. |
| 保存了但线上没变化 / Live site unchanged | 检查主站构建分支、构建日志、部署状态以及文章是否草稿。/ Check site CI and article draft status. |
| 端口占用 / Port in use | 将本地 `STUDIO_ORIGIN` 改为如 `http://localhost:5174` 后重启；独立服务还需匹配 `PORT`。/ Change the origin port; standalone also needs `PORT`. |

本地内容仓库应忽略 `.studio-history/` 和 `.studio-write-lock/`；主题 submodule 的忽略规则不能替代主仓库。`.env` 和 `.state/` 必须留在私有服务端目录。更新主题前保留自己的配置，更新后在 `studio/` 运行 `npm ci`、检查和构建，再重启或重新部署。

Ignore `.studio-history/` and `.studio-write-lock/` in the content repository itself. Keep `.env` and `.state/` private. Preserve your configuration during theme updates, then install dependencies, check, build and restart or redeploy Studio.
