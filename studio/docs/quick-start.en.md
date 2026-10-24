# Start using Creator Studio

[简体中文](quick-start.zh-CN.md) · [Full manual (Chinese)](../README.md) · [Configuration and troubleshooting](setup.md)

Creator Studio is the theme's administration app. Write articles, upload images and manage settings in your browser. Files stay in your local site or Git repository; Zola still builds the public website.

## 1. Prepare your site

Install Node.js 22.12+ and npm. Use an existing Wonder Shine site containing `config.toml`, `data.toml` and `content/`. Studio does not create a new public site or replace your content with examples.

For a theme installed as a submodule, run from your site root:

```sh
git submodule update --init --recursive
cd themes/zola-theme-jiaxiang.wang/studio
npm ci
npm run setup -- --lang en
```

Adjust the theme directory name if needed. For a standalone theme checkout, enter its `studio/` directory instead.

## 2. Follow the terminal prompts

1. Choose **local site** to edit files on your computer, or **HTTPS Git** to read and commit directly to a repository such as GitHub or CNB.
2. Select the site root, or enter the final HTTPS clone URL, existing branch, Git username and access token. Verify your branch name; the wizard's `main` default may not match your repository.
3. Keep `http://localhost:5173` for local use, unless you need another port.
4. Choose a Studio administrator username and a password of at least 12 characters. This account is separate from your Git account. Password and token input are hidden.

The wizard creates a private `.env` containing a password hash and a random session secret. It never overwrites an existing `.env` or stores your plaintext password. Ctrl+C cancels unfinished setup.

Do not copy `.env.example` before running the wizard. If you already have an `.env`, follow the [manual configuration guide](setup.md) to complete it.

## 3. Check and start

```sh
npm run doctor -- --lang en
# Optional for Git: read-only connection check, no content writes or pushes
npm run doctor -- --connect --lang en
npm run dev
```

`PASS` confirms the stated check. Review `WARN` items and resolve `FAIL` items. A successful Git read does not prove push permissions. OIDC sign-in, cloud storage and site deployment require checks in the actual environment.

Open the configured URL and sign in with your new Studio account. Use `localhost` consistently if that is your configured hostname. The development server listens locally; public hosting requires the deployment configuration described below.

## 4. Create your first draft

The dashboard includes a dismissible introduction. Reopen it from **User guide** in the sidebar.

1. Review **Site information**, including the name, description and public URL. Save changes.
2. Add names in **Tags and categories**, then select them while writing.
3. Upload images in **Media library**, or use **Choose or upload** on an image field. Uploads are saved immediately; selecting an image and saving its form are separate actions.
4. Create an article and save it as a draft. Clear the Draft option and save when it is ready to publish.
5. Build and publish your local Zola site, or check your existing site CI after a Git save.

**Saving is not deployment.** Published is an editorial status. Readers see changes only after the public site is built and deployed. Studio does not create a CI workflow or claim that deployment has succeeded.

## 5. Connect services and deploy

- **Git:** set `STUDIO_GIT_URL`, `STUDIO_GIT_BRANCH`, `STUDIO_GIT_USERNAME` and `STUDIO_GIT_TOKEN`. Use a final HTTPS clone URL without embedded credentials. The target branch must permit direct pushes. SSH, Git LFS and content inside another submodule are not supported.
- **OIDC:** configure the issuer, client ID, optional client secret and explicit allowed subject IDs. Register `<STUDIO_ORIGIN>/api/auth/oidc/callback`. Email addresses and ordinary GitHub OAuth are not substitutes for OIDC subject IDs and a standard OIDC provider. Password and OIDC sign-in can coexist.
- **Standalone Node:** run `npm run build`, then `npm start`. Configure the public HTTPS origin, persistent session storage and reverse proxy as needed. Production listens on `127.0.0.1:5173` by default; configure `PORT` and `STUDIO_HOST` for your host.
- **Makers:** use an independent backend project with Cloud Functions, HTTPS origin, Git storage and `STUDIO_STATE=blob`. `dist/makers` is the complete built artifact; `dist/client` alone has no authentication backend. See the [deployment instructions](deploy-edgeone.en.md) and current platform documentation before deploying.

Keep secrets in server environment variables, never `VITE_*`, Markdown, TOML or a public repository. Studio login credentials, Git credentials and deployment credentials have different purposes.

## Common tasks

- Page content and template settings are saved separately. Pages using the same template can share settings.
- Friend link **Local icon** supports image previews and selection; **Backup icon URL** is stored without automatic fetching.
- The interface defaults to English and selects a supported browser language on first use. Manual changes are remembered and never translate your content or change the public site's language.
- For save conflicts, download a backup before reloading and merging. The backup is a JSON recovery file, not a publishable Markdown document.
- Find password recovery, Git and upload troubleshooting in [setup.md](setup.md).
