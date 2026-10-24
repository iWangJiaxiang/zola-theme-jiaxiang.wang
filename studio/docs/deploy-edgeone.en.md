# Deploy Creator Studio to EdgeOne Makers

[简体中文](deploy-edgeone.zh-CN.md) · [Quick start](quick-start.en.md) · [Configuration reference](setup.md)

Checked on October 24, 2026 against the official documentation and `edgeone@1.6.46` command help. Account, region, domain and quota availability must be confirmed in your console.

## Architecture

Deploy Studio as a separate project from the public Zola site. Studio serves a static interface and `/api/*` through **Node.js Cloud Functions**. Blob holds authentication sessions; a standard HTTPS Git repository holds articles, settings and images. Your existing site CI publishes content after Git commits.

Do not deploy this backend as Edge Functions or as a static-only project. Saving is not proof of a completed public-site deployment.

## Before live testing

A passing build is ready to upload; real sign-in and content tests also require:

- A separate test project, a stable HTTPS origin, and confirmed Cloud Functions/Blob availability.
- Cloud configuration with `STUDIO_STATE=blob`, the matching origin, a separate session secret and an admin password hash. A passing local `doctor` run does not validate cloud settings.
- A test content repository, branch and read/write Git credential. Prefer a separate repository so test commits cannot trigger production workflows. Public-site publishing is optional for backend-only tests.
- Per-IP ingress limits for `/api/auth/login` and `/api/auth/oidc/start`, for example five requests per minute. The in-process password limit does not coordinate across function instances.
- Password sign-in is sufficient for the first test. OIDC acceptance additionally requires provider registration, the callback URL and allowed `sub` IDs.
- For Git-import deployment, committed and pushed theme code. CLI upload can use the complete local artifact directly.

Existing images above 4 MiB cannot be previewed through the Makers API. Check those separately from deployment failures. Testing automatic public-site updates also requires checking the test repository's CI triggers and deployment target.

## Recommended: build locally or in CI, then upload with the CLI

1. Create a **direct-upload** Makers project in the account you intend to use. CLI deployment cannot update an existing Git-import project.
2. Confirm that Cloud Functions and Blob are available. Choose a stable HTTPS Studio domain.
3. Configure the production environment variables below in the project console.
4. Build from the theme's `studio/` directory using Node **22.12+**:

   ```sh
   npm ci
   npm test
   npm run build
   npm run test:deployment
   ```

5. Install the verified CLI and sign in to the appropriate account site:

   ```sh
   npm install -g edgeone@1.6.46
   edgeone login --site global
   # For a China-site account: edgeone login --site china
   edgeone makers deploy ./dist/makers -n my-blog-studio -e production --skip-ai-gateway-sync
   ```

Use your project name. AI Gateway synchronization is disabled because Studio does not use it. Do not use anonymous deployment for an administration backend. In the checked CLI, `deploy --site` applies to anonymous deployments; authenticated account selection belongs to `login --site`. Deployment `--area` (`global` or `overseas`) is a separate region option.

Upload the complete **`dist/makers`** directory. It includes the frontend, Vditor assets, `cloud-functions/api/[[default]].js`, `package.json` and `edgeone.json`. `dist/client` alone has no authentication backend. Never upload `.env`, `.state/` or the whole workspace.

The artifact check runs locally without network calls or deployment. It verifies packaging, the default cloud handler, headers, timeout configuration and unauthenticated API protection. Real Blob, OIDC, Git push and platform routing still require live verification.

The bundled function must retain a named `onRequest` export. The verified EdgeOne 1.6.46 scanner does not recognize `export { onRequest as default }` as a handler, even though Node can import it. The entry now exports both named and default handlers, and the artifact check verifies their identity. Rebuild, validate and recreate the ZIP after changing the build; re-uploading an old ZIP cannot fix missing routes.

## Runtime configuration

| Variable | Value |
| --- | --- |
| `STUDIO_ORIGIN` | Exact stable HTTPS origin, e.g. `https://studio.example.com`; no path |
| `STUDIO_STATE` | `blob` |
| `STUDIO_SESSION_SECRET` | Random secret, at least 32 characters |
| `STUDIO_ADMIN_USER` | Studio admin username, e.g. `owner` |
| `STUDIO_ADMIN_PASSWORD_HASH` | Full output hash from `npm run password`; enter the value without surrounding quotes |
| `STUDIO_GIT_URL` | Final HTTPS clone URL of the **content** repository, without embedded credentials |
| `STUDIO_GIT_BRANCH` | Existing target branch; verify `main` versus `master` |
| `STUDIO_GIT_USERNAME` | Git host's required HTTPS username |
| `STUDIO_GIT_TOKEN` | Read/write credential for that repository and branch |
| `STUDIO_GIT_AUTHOR`, `STUDIO_GIT_EMAIL` | Commit identity; configure as appropriate |

Generate a session secret locally:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`npm run setup` creates local settings. Do not copy its `http://localhost` origin or `file` state into production. Cloud execution cannot rely on local content or `.state` directories.

The Blob SDK uses platform-provided deployment credentials and the `wondershine-studio-private` namespace. The namespace name is not an access-control setting. Do not expose it through public routes or use it as an image host. Do not invent or manually populate platform-injected credential variables.

For OIDC, configure the issuer, client ID, required client secret and explicit allowed `sub` IDs; register `https://studio.example.com/api/auth/oidc/callback`. For OIDC only, remove both password account variables. Git credentials, Studio sign-in and deployment credentials are separate.

Use a separate test project/repository and session secret for preview environments. An origin or OIDC callback for a production domain cannot be used unchanged on a different preview URL. Restart/redeploy after changing runtime variables.

## Alternative: import the theme repository

Import the branch containing `studio/` and configure root `studio`, install `npm ci`, build `npm run build`, static output `dist/client`. The platform reads `cloud-functions/` from the source root; this is different from manually uploading only static files.

Source deployment explicitly selects Node 22.21.1 in `edgeone.json`, matching the current Build Guide. Some older configuration examples still use 22.11, which is too old for this project. Confirm the actual version in your build logs; if your account environment cannot provide it, use the prebuilt workflow above.

Uncommitted theme files are not available to remote builds. Updating the parent site's submodule pointer does not publish unpushed theme changes. Importing the parent site also requires correct submodule initialization and a root of `themes/<theme>/studio`; importing the theme directly is simpler.

## Limits and live acceptance checks

- Official Cloud Functions request/response body limit: 6 MB. Studio conservatively limits Makers image uploads and previews to **4 MiB** (shown as 4 MB). Local/standalone Node remains at 20 MiB.
- Source configuration requests a **120-second** function duration. Although the prebuilt file carries the same setting, the official Direct Upload guide only guarantees redirects/rewrites/headers support. Confirm the effective duration in the platform; do not infer it from the uploaded JSON. Large repositories or slow Git operations can still time out.
- Official function runtime: Node v20.x. The packaged handler was verified on Node 20.19.0; confirm the platform's actual runtime.
- Git uses temporary shallow checkouts. Persistent authentication uses Blob. Images remain in Git.

### Loading performance

The workspace loads configuration and content in parallel. Within one function instance, configuration, documents and media share a read-only Git checkout for 30 seconds, including concurrent reads. Cold starts and other instances still need their own initial clone.

Writes, deletes and uploads use a separate fresh checkout for revision checks and invalidate that instance's read cache afterward. Other instances and changes made outside Studio can remain cached for up to 30 seconds. **Refresh content** and **Refresh repository** explicitly fetch a new snapshot.

Loading views display skeletons, switch to a longer-wait hint after eight seconds, and provide retries after errors. Read-only API requests have a 60-second timeout. Counts and empty-library messages wait for successful data. Animations respect reduced-motion preferences. Run `npm run build` followed by `npm run test:loading` to verify slow and failed reads against a disposable local site without production OIDC or Git credentials. No additional environment variables are required. Large image repositories and slow Git connections still affect the first clone.

After deployment:

1. `/` shows the login UI; `/api/auth/config` returns JSON, not an HTML fallback.
2. `/api/content` returns 401 before login.
3. Sign in to verify real session storage; viewing the login page alone does not prove Blob works.
4. Read the expected site and save a test draft. Verify its Git commit on the configured branch.
5. Upload a small image and test preview/selection/save.
6. Log out, verify access is revoked, then sign in again.
7. Check your public-site CI and deployment. Draft content should remain unpublished.

HTML/404 API responses require checking the function directory, the bundled named `onRequest` export, the platform function list and SPA rewrites. Older ZIPs may omit a recognizable handler, leaving routes unregistered. Resolve routing before changing OIDC credentials. A 503 indicates incomplete configuration or unavailable runtime services. Check the exact origin for 403 errors, token and branch protection for save failures, Node version for build failures, and image size for 413 responses.

The theme's `.cnb.yml` now includes a main-branch build, test, artifact-check and EdgeOne deployment pipeline. See [automatic build and deployment](ci.en.md) for GitHub → CNB synchronization and credential setup. Publish the source and configure credentials before it can run online. The GitHub build example remains build-only. Backend code rollback and content Git rollback are separate operations. Local tests do not imply account-specific production deployment or real Blob/Git/OIDC validation.

Official references: [Direct Upload](https://pages.edgeone.ai/document/direct-upload), [Node Functions](https://pages.edgeone.ai/document/node-functions), [Cloud Functions](https://pages.edgeone.ai/document/cloud-functions), [edgeone.json](https://pages.edgeone.ai/document/edgeone-json), [CLI](https://pages.edgeone.ai/document/edgeone-cli), [Blob](https://pages.edgeone.ai/document/blob-storage), [build configuration](https://pages.edgeone.ai/document/build-guide).
