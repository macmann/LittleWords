# Deploy LittleWords on Render or Coolify

Use a **Node.js web service**, PostgreSQL, and a persistent upload directory. The app requires its API routes and cannot be deployed as a static site. No Dockerfile or Docker Compose file is required in this repository. Coolify still builds and runs containers internally through Nixpacks.

Both platform configurations use Node 22, `npm ci --include=dev && npm run build`, and the deployment entrypoint `node scripts/deploy.mjs` (also exposed as `npm run deploy:start`). Coolify uses `exec node scripts/deploy.mjs` so the signal-forwarding entrypoint owns the runtime process. The deploy start command validates runtime settings, checks that uploads can be written, applies committed Prisma migrations, runs the idempotent seed, then starts Next.js on `0.0.0.0:$PORT`. A missing prerequisite or failed migration prevents the service from starting. Build steps never migrate or reset the database.

## Render

### Blueprint (recommended)

1. Push the repository, then create a **New Blueprint** in Render using `render.yaml`. The checked-in blueprint deploys `main`; merge the feature branch first or select a feature branch for a preview. Forks should select their own repository/branch.
2. Review the resources and plans before creating them. The blueprint creates a **Starter Node web service**, **Basic 256 MB PostgreSQL database**, and **1 GB persistent disk**. These are paid resources. Free web services cannot provide durable local photo storage. Both resources use Render's default region; keep database and web service in the same region if changing it.
3. Render generates `PARENT_SESSION_SECRET` and injects the database's internal connection string automatically. No database password is committed to the repository. External database access is disabled by the blueprint's empty `ipAllowList`.
4. Deploy. Startup migrates and seeds the database. The disk mounts at `/var/data`; uploads use `/var/data/uploads`. Render supplies `PORT` automatically.
5. Set a custom domain and HTTPS if desired. When a proxy rewrites the Host header, set `APP_ORIGIN` to the canonical HTTPS site origin (e.g. `https://words.example.com`). Do not include a path. When set, parent writes are accepted only from that exact browser origin. Choose one canonical domain; alternate domains should redirect to it.
6. Confirm that `/api/health` returns HTTP 200 with `{"status":"ok"}`. The first page should show signup/login. Create an account with child age, open the parent gate with that account password, save a photo card, redeploy, sign back in, and verify the photo and progress persist.

The single disk-backed instance is intentional. Render disk-backed services have deployment downtime and cannot share this local disk across multiple instances. Use coordinated database releases and object storage before horizontal scaling. Back up both PostgreSQL and the upload disk.

### Manual Render setup

Create a PostgreSQL database and a **Web Service → Native Node**, using the repository root:

| Setting           | Value                                             |
| ----------------- | ------------------------------------------------- |
| Branch            | Branch containing the app (`main` after merging)  |
| Build command     | `npm ci --include=dev && npm run build`           |
| Start command     | `node scripts/deploy.mjs`                         |
| Health check path | `/api/health`                                     |
| Node version      | `22` (`NODE_VERSION=22`, also pinned by `.nvmrc`) |
| Disk              | Mount `/var/data`; choose suitable capacity       |
| Instances         | 1                                                 |

Use the runtime variables listed below. Set `DATABASE_URL` to Render's **internal** database URL. Do not set a fixed Render port or use a static-site publish directory. Keep preparation in the start command: a persistent disk is available in the running service, not the build environment or a separate pre-deploy job.

## Coolify

1. Create a PostgreSQL resource on the same destination/server network and start it. Keep its persistent database volume. Copy the **internal** PostgreSQL connection URL into the application's runtime variables; `localhost` inside the app is not the database container.
2. Create an application from this Git repository. Choose the branch containing the app, set base directory to `/`, and select the **Nixpacks** build pack. Do not select Static Site, Dockerfile, or a standalone-only Next.js deployment preset.
3. Nixpacks reads `nixpacks.toml`. If Coolify's UI overrides commands, set:
   - Install: `npm ci --include=dev`
   - Build: `npm run build`
   - Start: `exec node scripts/deploy.mjs`
   - Node version: `NIXPACKS_NODE_VERSION=22`
4. Set **Ports Exposes** to `3000` and runtime `PORT=3000`. Bind the public HTTPS domain to this application port. The start command listens on all interfaces.
5. Add **Persistent Storage** as a volume or bind mount with destination `/app-data`, then set `UPLOAD_DIR=/app-data/uploads`. Ensure the runtime application's user can read and write the mount. The filesystem of a build/deployment container is otherwise ephemeral. Never mount over the source root, `public`, `node_modules`, or `.next`.
6. Set `DATABASE_URL` and `PARENT_SESSION_SECRET` as runtime variables. Keep them out of Git. Generate a random secret of at least 32 characters and retain it across redeploys. Enable build-time variables only when necessary; the build does not need live database access or parent credentials. Keep Node version available to the build pack. Set `APP_ORIGIN` to your public HTTPS origin if the proxy rewrites Host; using it explicitly also restricts parent writes to the selected domain.
7. Enable HTTP health checks: GET `/api/health`, port `3000`, expected status `200`. Give a fresh deployment at least **120 seconds** of startup grace for installation-independent migration/seed work (increase if your database is slow). These settings are per-application controls in Coolify; no health-check binary is required in the image.
8. Deploy and check logs. First startup inserts 345 shared concepts and preserves a legacy demo profile for credential-authorized migration. New signups create their own child records. Verify parent edits, a complete finite session, and a photo upload. Redeploy and verify the photo and vocabulary remain.

Nixpacks automatically builds Coolify's container; no local Docker installation is needed to develop this app. Database and uploads must each have durable storage. Keep one application replica with local photos; do not configure rolling overlap or horizontally scale until uploads use shared object storage and migrations are coordinated.

## Runtime variables

| Variable                | Required               | Value                                                                                                                                     |
| ----------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | Yes                    | Internal PostgreSQL connection string. Use provider-required TLS options for remote connections; do not disable certificate verification. |
| `PARENT_SESSION_SECRET` | Yes                    | Stable random string of at least 32 characters.                                                                                           |
| `UPLOAD_DIR`            | Yes for `deploy:start` | Absolute directory on a mounted persistent disk/volume.                                                                                   |
| `PORT`                  | Platform-dependent     | Render supplies it; use `3000` in Coolify. Defaults to `3000` outside Render.                                                             |
| `NODE_ENV`              | Yes                    | `production` (also enforced by the deploy start script).                                                                                  |
| `STORAGE_PROVIDER`      | Default                | `local`. No paid storage API required.                                                                                                    |
| `TTS_PROVIDER`          | Default                | `none`. Device voices/parent speech remain optional.                                                                                      |
| `APP_ORIGIN`            | Optional               | Canonical public HTTPS origin; needed when the proxy changes Host.                                                                        |

`UPLOAD_DIR` must be outside `public`. Startup safely moves matching legacy `public/uploads` files into private storage, preserving filenames and `/api/photos/<filename>` references. It never overwrites a conflicting file. If old uploads are on a previous deployment's ephemeral disk rather than in the new source checkout, back them up and transfer them onto the persistent mount before redeploying. For local development, run `npm run photos:migrate`; the default private folder is `var/uploads`. Direct `/uploads/...` requests are blocked.

`prisma` and `tsx` are runtime dependencies because migrations and the TypeScript seed execute at startup. `npm ci --include=dev` remains required for building Tailwind and TypeScript, even when `NODE_ENV=production`. After a successful build, production dependency pruning is safe for this workflow. Keep the source checkout, `prisma/`, `lib/content/`, `types/`, `tsconfig.json`, `public/`, scripts, and `.next` in the deployed artifact; do not publish just `.next/standalone`.

## Readiness, deploys, and rollback

- `/api/health` is dynamic and uncached. It checks the seeded profile/database and upload-directory access. It returns generic HTTP 503 when unready, never a database connection string or child profile. Missing database configuration intentionally returns 503 on this endpoint.
- `npm run deploy:prepare` performs the same validation, writable-directory check, migrations, and seed without starting HTTP. It needs runtime database credentials and an accessible upload mount. The normal platform start command includes it automatically.
- Prisma `migrate deploy` applies only committed migrations. No reset or `db push` is run. The seed preserves existing parent-edited phrases, settings, custom cards, and vocabulary. Future migrations should be backward-compatible so the previous application version can still run. Rolling back application code does not undo a database migration.
- The startup script forwards SIGTERM/SIGINT to its current child so the platform can stop Next.js or preparation cleanly. A stable parent-session secret keeps valid signed cookies usable across redeploys; parent gates expire after 30 minutes, account sessions after 30 days.
- Back up and restore PostgreSQL and uploads together. Rendering a seeded photo placeholder does not prove an uploaded file survived: test a real saved custom photo after redeployment.

## Accounts and private data

Every family must sign up or sign in to use learning or read family records. Signup needs email, password, parent name, and child age, with no verification email. Each user's profile, vocabulary, sessions, mission progress, custom cards, and photos are scoped to their account on the server. Signup cannot request administrator privileges. The same account password opens the parent gate; child learning hides editing controls. Shared-library editing is restricted to trusted `ADMIN` users assigned by the deployment administrator. HTTPS is required for hosted cookies and PWA installation.

Passwords are salted scrypt hashes; account session tokens are hashed in PostgreSQL. Signout revokes a session; changing a password revokes other account sessions. Neither the service worker nor API/photo cache stores private family data. Before scaling beyond one instance, replace the basic in-process failed-attempt limit with a coordinated limiter and local storage with shared object storage. No email verification, automated password recovery, account deletion/export, or age-based recommendation system is included yet.

## First launch and upgrading

No user's password belongs in environment variables. Keep `PARENT_SESSION_SECRET` stable as a separate server signing secret. New accounts set their password and child age in the signup form and always receive their own family records.

Existing household installations retain their records through the additive migration. **Link existing household** requires the old parent password or, for PIN-era installations, the old `PARENT_PIN`, before attaching those records to a new account. Keep `PARENT_PIN` only until this one-time migration succeeds, then remove it. An unclaimed legacy profile cannot be read or claimed by ordinary signup. The successful legacy owner retains administrator access to the shared library. Existing vocabulary, mission progress, photos, and edits survive migration and repeated seeds. See README for the recovery limitations and private-photo migration.

## PWA and free Render

The manifest and service worker are served by the existing Next.js service over HTTPS. Parent area offers installation or browser-specific home-screen instructions. The offline shell supports a real-world activity and bounded public artwork caching, not offline sessions or progress synchronization; account and photo responses are never cached.

Free Render services cannot attach a persistent disk. `UPLOAD_DIR=/tmp/littlewords-uploads` is acceptable for a temporary demo, but uploaded photos can disappear after a restart or redeploy. PostgreSQL must be configured separately; verify its provider's expiry/retention policy. For durable photos, use the paid disk configuration above or implement an object-storage adapter. Keep `npm run deploy:start` as the service start command so new content is seeded automatically.
