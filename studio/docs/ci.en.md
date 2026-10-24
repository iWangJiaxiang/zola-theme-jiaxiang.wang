# GitHub source → CNB mirror → EdgeOne Studio

[中文](ci.zh-CN.md) · [EdgeOne deployment](deploy-edgeone.en.md)

Edit theme source on GitHub. The `Sync theme to CNB` workflow pushes branches and tags to CNB, where `.cnb.yml` includes `studio/deploy/cnb-build.yml`. A push to `main` installs dependencies, runs tests, builds and checks the complete Makers artifact, then deploys it to the existing direct-upload project. The content repository remains independent.

## GitHub configuration

Under the theme repository's Settings → Secrets and variables → Actions, set:

- Repository variable `CNB_MIRROR_REPOSITORY`: `wangjiaxiang/wonder-shine`.
- Repository secret `CNB_MIRROR_TOKEN`: a CNB token with code read/write access to that theme repository only.

The workflow runs on branch/tag pushes, manually, and every six hours to catch bot commits made using `GITHUB_TOKEN`. Scheduled/manual availability requires the workflow on the default branch. Scheduling is best effort. Missing repository variable skips synchronization; missing token fails after enabling it.

Synchronization preserves commit IDs, never force-pushes, and never deletes destination refs. Divergent branches or conflicting tags fail; other refs may already have updated. Keep CNB theme branches free of independent edits. This is conservative one-way synchronization, not a destructive exact mirror.

## CNB deployment credential

Create a **private secret repository** `wangjiaxiang/studio-secrets`. In its `main` branch create `edgeone.yml` based on [this example](../deploy/edgeone-secret.example.yml). Restrict `allow_slugs` to `wangjiaxiang/wonder-shine`, `allow_branches` to `main`, and `allow_events` to `push` and `web_trigger_studio`.

Set `EDGEONE_PROJECT_NAME` to `blog-studio` and `EDGEONE_API_TOKEN` to a Makers API Token from the account/site containing the existing project. Enter the token only in the secret repository web editor. Never commit it to the public theme repository. This is separate from both the mirror token and the runtime content repository token.

Only the deployment stage imports this credential. Existing OIDC, session and content Git settings remain in EdgeOne production environment variables. For a different secret repository, update the imports URL in the GitHub source. When changing the production branch, also update the pipeline branch key, the `refs/heads/main` freshness check and the secret allowlist.

## Enable and verify

Publish the full Studio source, lockfile, required theme assets and workflows to GitHub; exclude local secrets, state, dependencies and build output. Review and merge into the actual remote `main`, without force-overwriting it with a potentially different local branch. Run **Sync theme to CNB** manually once and compare main commit IDs.

Allow automatic builds in CNB repository and organization settings. A main push starts production CI; `web_trigger_studio` on main allows a manual retry. A lock serializes deployments and a final main-commit check skips stale builds. Other branches and tags do not deploy production. Confirm the CNB deployment result, the new EdgeOne production deployment and Studio login/content access separately.

The build pins Node `22.21.1-bookworm` and `edgeone@1.6.46`, and uploads `studio/dist/makers`, including the named `onRequest` Cloud Function. Local checks do not validate real cloud credentials or deployment. Runtime rollback and content Git rollback remain separate.

References checked 2026-10-24: [CNB sync tools](https://docs.cnb.cool/zh/guide/migration-tools.md), [trigger rules](https://docs.cnb.cool/zh/build/trigger-rule.md), [secret repositories](https://docs.cnb.cool/zh/repo/secret.md), [file reference permissions](https://docs.cnb.cool/zh/build/file-reference.md), [EdgeOne CLI](https://pages.edgeone.ai/document/edgeone-cli).
