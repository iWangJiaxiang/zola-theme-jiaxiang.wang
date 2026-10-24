# GitHub 主题源 → CNB 镜像 → EdgeOne 创作中心

[English](ci.en.md) · [EdgeOne 部署指南](deploy-edgeone.zh-CN.md)

主题源码统一在 GitHub 修改。CNB 的 `wangjiaxiang/wonder-shine` 接收主题代码，构建后更新现有 EdgeOne 直接上传项目 `blog-studio`。博客内容仍由 Studio 直接读写 CNB 的博客仓库，不参与主题镜像。

```text
GitHub 主题源码更新
  → GitHub Actions 同步分支与标签
  → CNB wonder-shine 的 main 更新
  → npm ci → 测试 → 构建 → 检查完整云函数产物
  → EdgeOne blog-studio 生产部署
```

## 1. 让 GitHub 自动同步主题

在 GitHub **主题仓库**的 Settings → Secrets and variables → Actions 中配置：

| 类型 | 名称 | 值 |
| --- | --- | --- |
| Repository variable | `CNB_MIRROR_REPOSITORY` | `wangjiaxiang/wonder-shine` |
| Repository secret | `CNB_MIRROR_TOKEN` | 只授权该主题仓库、允许代码读写的 CNB 访问令牌 |

`.github/workflows/sync-cnb.yml` 在代码/标签推送后同步，也可以在 Actions 中手动运行。每 6 小时补同步一次，用于收集由 `GITHUB_TOKEN` 生成、不会触发后续 Actions 的 CSS 等机器人提交。定时和手动入口需要工作流先进入 GitHub 默认分支，计划任务不保证准点。

同步的是最新的 GitHub 分支和标签，保留提交 SHA。不执行 force push，不删除 CNB 多出来的分支或标签。因此这是保守的单向同步，不是包含删除操作的严格 `git push --mirror`。分支分叉、同名标签冲突时任务会失败；不要直接在 CNB 修改镜像中的主题代码。若其中一个 ref 冲突，其他 ref 可能已经同步，应按失败日志核对。

没有设置 variable 时同步任务跳过。设置 variable 后缺少 Token 会明确失败。此 Token 与运行中 Studio 访问**博客仓库**的 `STUDIO_GIT_TOKEN` 分开管理。

## 2. 在 CNB 保存部署凭据

在 `wangjiaxiang` 组织创建**密钥仓库** `studio-secrets`，不要创建公开普通仓库。在其 `main` 分支新建 `edgeone.yml`，参考 [示例文件](../deploy/edgeone-secret.example.yml)：

```yaml
allow_slugs:
  - wangjiaxiang/wonder-shine
allow_branches:
  - main
allow_events:
  - push
  - web_trigger_studio
EDGEONE_PROJECT_NAME: blog-studio
EDGEONE_API_TOKEN: 在密钥仓库网页中填入自己的值
```

API Token 在 **EdgeOne Makers 控制台的 API Token 页面**创建，必须属于现有 `blog-studio` 项目所在账号/站点。它用于发布后台，不是腾讯云 SecretId/SecretKey，也不是 CNB Token。不要将真实值提交到 GitHub 主题仓库、放进 `VITE_*` 或发送到聊天。

流水线只在部署阶段引用该文件。OIDC、会话密钥和 `STUDIO_GIT_TOKEN` 继续保留在 EdgeOne 现有生产环境变量里，CI 无需复制这些值。

若使用其他仓库名，在 GitHub 源码中修改 `studio/deploy/cnb-build.yml` 的 imports 地址，并相应修改密钥文件的 `allow_slugs`。如果改生产分支，需要同时修改 CNB 配置的分支键、部署前的 `refs/heads/main` 检查及密钥白名单。

## 3. 发布源码并启用

1. 将完整 `studio/` 源码、依赖锁文件、构建所需主题资源、本次 `.cnb.yml` 和同步 workflow 提交到 GitHub 主题仓库。不要提交 `.env`、`.state/`、`node_modules/` 或本地 `dist/`。
2. 先评审合并到实际的 `main` 分支。不要用本地同名分支强制覆盖远程；本地主题开发分支和远程 main 可能不同。
3. 在 GitHub Actions 手动执行一次 **Sync theme to CNB**，确认 CNB main 与 GitHub main 的 SHA 相同。
4. 在 CNB 仓库设置的云原生构建中确认允许自动触发；组织级开关也需允许。首次同步 main 后会按 `.cnb.yml` 构建。必要时在 CNB main 手动触发 `web_trigger_studio` 重部署。
5. 查看 CNB 的测试、构建、产物检查和部署结果，再到 EdgeOne 确认生产版本更新。登录后台验证内容读取；首次保存需确认博客 Token 具有写权限。

只发布到功能分支不会部署生产。流水线用锁串行运行，上传前再次核对当前 main，跳过已经落后的构建。部署失败时查看 CNB 日志，不能用“镜像成功”代替“部署成功”。

## 构建和发布边界

- `.cnb.yml` 是生效入口，引用 `studio/deploy/cnb-build.yml`；不只是待复制示例。
- Node 构建镜像固定为 `22.21.1-bookworm`，CLI 固定 `edgeone@1.6.46`。
- 部署的是完整 `studio/dist/makers`，包括具名 `onRequest` 云函数入口。不是仅静态文件。
- 每次 main 推送执行一次构建；其他分支及标签同步不会发布生产。
- `.cnb.yml` 是主题源的一部分，镜像时一起同步，不在 CNB 单独维护一份。
- 本地验证不调用真实身份服务，也不验证平台发布凭据。成功启用仍需完成上述平台配置与首次线上流水线。

核对日期：2026-10-24。CNB 官方提供 [Git Sync 等迁移/同步工具](https://docs.cnb.cool/zh/guide/migration-tools.md)，也支持 [定时流水线](https://docs.cnb.cool/zh/build/crontab.md)。当前方案选用 GitHub 主动推送，以便更新后触发 CNB 构建，不依赖一个未经核实的“镜像仓库开关”。参考：[CNB 触发规则](https://docs.cnb.cool/zh/build/trigger-rule.md)、[CNB 密钥仓库](https://docs.cnb.cool/zh/repo/secret.md)、[文件引用权限](https://docs.cnb.cool/zh/build/file-reference.md)、[EdgeOne CLI](https://pages.edgeone.ai/document/edgeone-cli)。
