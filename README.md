# LittleWords

LittleWords is a mobile-first, parent-guided language app for children around 2–4. Its learning loop is **see → hear → say, point, or respond → expand → explore the real world**. Familiar words become short phrases. No endless feed, pronunciation scoring, ads, streaks, or pressure to keep playing.

## Run locally

Use Node.js 22 or newer and PostgreSQL 14 or newer. No Docker or paid API is required.

```sh
npm install
cp .env.example .env
# Set DATABASE_URL and PARENT_SESSION_SECRET in .env.
npx prisma generate
npm run db:migrate
npm run db:seed
npm run dev
```

Create a PostgreSQL user and database using your PostgreSQL administration tool. `DATABASE_URL` follows `postgresql://USER:PASSWORD@HOST:5432/littlewords?schema=public`. URL-encode reserved characters in the password. Use a dedicated database/user with migration permissions for development; use appropriate least-privilege roles in production. Keep credentials out of version control.

With no `DATABASE_URL`, the app offers a **read-only demo**. Learning, languages, categories, and missions work, but edits and session history are not persisted. If a configured database is unavailable or not seeded, the app shows a retryable error; it does not silently replace your child's data with a demo.

The current cloud workspace has an initialized local PostgreSQL instance. Its ignored `.env` is already configured. Cloud-only database tooling and data live outside the repository in `/workspace/.littlewords-tools`; they are not app dependencies. Start its `postgres.mjs` helper if the database process has stopped. Do not copy its credentials into documentation.

## Commands

| Command                    | Purpose                                                                     |
| -------------------------- | --------------------------------------------------------------------------- |
| `npm install`              | Install dependencies using the committed lockfile                           |
| `npm run dev`              | Start Next.js development server                                            |
| `npx prisma generate`      | Generate the typed database client                                          |
| `npm run test:integration` | Exercise production API flows using a disposable PostgreSQL schema          |
| `npm run db:migrate`       | Apply the committed PostgreSQL migration                                    |
| `npm run db:seed`          | Create demo content/profile without overwriting parent edits                |
| `npm test`                 | Run session-generation and deployment tests                                 |
| `npm run build`            | Generate Prisma client, type-check, and build production app                |
| `npm run deploy:prepare`   | Validate hosting settings, apply migrations, and seed without starting HTTP |
| `npm run deploy:start`     | Prepare the database/uploads and start the hosted service on `$PORT`        |
| `npm start`                | Run the production build                                                    |

For a new schema change in a separate development task, use `npx prisma migrate dev --name descriptive_name` and commit the generated migration. Deployments use `migrate deploy`, never `db push` or destructive resets. Seeding can be repeated: existing phrases, statuses, settings, custom cards, and exposure counts are retained.

## Environment variables

| Variable                | Purpose                                                                                             |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | PostgreSQL connection string; unset enables the read-only demo                                      |
| `UPLOAD_DIR`            | Absolute persistent upload directory in hosting; unset keeps `public/uploads` for local development |
| `APP_ORIGIN`            | Optional canonical public HTTPS origin for parent requests behind a proxy                           |
| `STORAGE_PROVIDER`      | `local` (default); another provider requires a PhotoStorage adapter                                 |
| `TTS_PROVIDER`          | `none`; reserved for a future server-side provider, not used to call an API                         |
| `PARENT_SESSION_SECRET` | Random secret of at least 32 characters for signed parent cookies; required in production           |

Generate the session secret with a secure random tool and save it directly in your local environment or secret manager. Never commit `.env`. Choose your parent password in the app on first launch. It is stored in PostgreSQL as a salted scrypt hash, never plaintext. You can change it in Parent area; changing it locks other parent sessions. There is no default password. Parent sessions expire after 30 minutes, use HttpOnly/SameSite cookies, and are locked when learning begins. Parent writes check the gate on the server and enforce same-origin requests. The gate uses a basic single-process attempt limit.

This MVP uses one household and one seeded child (`demo-child`). The parent password is a child-mode gate, not a multi-user authentication system. Do not expose private photos/profile APIs on the public Internet without adding full household authentication, tenant authorization, production rate limiting, upload limits at the reverse proxy, and privacy/deletion controls. The data model supports additional users/children; the UI intentionally focuses on one child.

## Learning and personalization

The demo child knows `car`, `truck`, `police-car`, `excavator`, `red`, `blue`, `green`, and `yellow`. Five additional concepts start as Learning to demonstrate the mix.

`SessionGenerator` in `lib/session/generator.ts` accepts concepts, vocabulary, language, an optional category, a finite length (5, 8, 10, or 12), and a reproducible random seed. The API loads the requested child's vocabulary. It targets **50% known / 30% learning / 20% new**, fills shortages with known concepts first, avoids duplicates, filters inactive cards, and mixes categories where possible. A small category ends when its available unique cards run out.

Known concepts start at level 2. Curated alternatives in `lib/content/expansions.ts` prioritize a familiar color + familiar vehicle (e.g. known yellow + truck → “Yellow truck”), without composing or translating phrases at runtime. The parent can confirm comfort with a word, short phrase, or richer phrase in **My words → Phrase comfort**. That unlocks the next level. Exposure counts alone do not unlock additional levels. A confirmed short phrase plus four exposures unlocks level 3; a confirmed richer phrase plus eight exposures unlocks level 4. Parent-edited phrases and existing recordings take precedence over the seed alternatives. Every first card exposure in a session is stored once; revisiting the same card does not inflate its count. Completion is saved separately and does not mark words as known.

Each session contains the configured number of **total cards, including missions**. The API sets `includeMissions` on the generator, reserving a real-world pause after every four word cards. A default ten-card session has eight word cards and two mission cards. Small categories finish earlier, with no duplicated filler. All five authored mission types cycle across sessions. Pause screens offer Done or Skip with no automated verification. Every third word card includes a gentle parent question, a three-second wait, and an expansion suggestion. The completion screen gives one last offline activity and waits for the parent to leave; it never starts another session automatically.

Swipe left/up to continue, right/down to revisit, or use large labeled buttons. Images and Listen buttons replay audio only on a tap; there is no automatic audio. Language switches select one curated language at a time. The primary language and enabled languages are configured in Parent area. No runtime LLM or translation service is used.

## Levels and the mission path

In **Parent area → Phrase level**, choose automatic familiar-word expansion (the default) or one of four practice levels: **1: words**, **2: short phrases**, **3: richer phrases**, **4: simple sentences**. The selected level is stored on the child profile and used for regular sessions; it is an explicit parent choice, never an automatic reward for swiping. Cards show the phrase building up, then offer a turn for a look, point, or word and a chance to say it together. Content remains authored in each language; levels describe complexity rather than an exact word count across languages.

**Missions** opens a finite 12-adventure path, with three missions at each level. Each adventure has up to four unique word cards and a real-world pause, with repeated themes to grow familiar language. The mission defines its practice level independently of the regular-session setting. Mission prompts live in `lib/content/track.ts`; level guidance lives in `lib/content/levels.ts`. New Burmese prompts are reviewable alongside the existing Burmese content.

Mission progress is stored in PostgreSQL for each child and language. The first mission is available immediately; each later mission needs the earlier missions confirmed. Starting practice requires the parent gate; learning locks it again. After completing all mission cards, leave the screen and explore the activity. Back on the mission path, a parent presses **We explored it together** and opens the gate to confirm. Only that confirmation unlocks the next mission. Skipping a pause, completing a session, or exposure counts alone cannot advance the track. Replay completed missions freely, resume an unfinished practice at its next card, and stop after any session. No pronunciation grading, points, streaks, or automatic next session are added.

## First-run password setup and upgrading

After configuring the database, apply migrations and seed, then open the app privately to set and confirm an 8–128 character parent password. The singleton credential prevents two simultaneous setup requests from overwriting each other. The first person who can access an unclaimed household installation can perform setup, so complete it before making the installation publicly accessible. `PARENT_SESSION_SECRET` is still a server signing secret, not the parent's password; Render generates it automatically.

Existing installations that have `PARENT_PIN` set require that old PIN once during first-run password setup. After setup, only the new password works; remove `PARENT_PIN` from hosting variables. The credential and mission progress survive redeploys and repeated seeds. Existing vocabulary and phrase comfort are preserved. Old PIN-era parent cookies are invalidated on upgrade.

There is no email password recovery. For an owner-managed recovery, use a trusted PostgreSQL administration connection to delete only the `ParentCredential` row with id `household`, lock down access to the app, remove or retain a known legacy PIN as appropriate, and complete first-run setup again. This invalidates parent access until reconfigured and must only be done by the household's administrator; it does not reset vocabulary or missions.

## Content and translations

The seed includes **73 concepts across nine categories**, prioritizing vehicles, actions, colors/descriptions, and familiar home objects. The Prisma schema includes User, ChildProfile, Category, Concept, ConceptTranslation, ChildVocabulary, LearningSession, and SessionCard. The initial SQL migration is committed in `prisma/migrations`.

- `lib/content/catalogue.ts`: authored English and German phrase levels and category metadata.
- `lib/content/burmese.ts`: **separate Burmese editorial drafts/placeholders**, deliberately easy to review. Many entries include four draft levels; some have word-only placeholders repeated across levels. All Burmese seed translations carry `needsReview=true`. Review with a native-speaking educator and replace incomplete levels before relying on Burmese progression. No native-speaker certification is claimed.
- `lib/content/missions.ts`: curated real-world prompts and basic child-facing controls for all three languages.
- `types/index.ts`: UI/domain types, separate from the database client.

Parents can create/edit concepts in **Parent area → Content library**, assign a category/type/difficulty, set a local image path, enter each language's four phrase levels, add audio paths, review language, and pause or activate content. Existing parent edits are not replaced when seeding again. Edit database content in the UI; source seed edits affect new databases/new concepts only. A reviewed flag is editorial metadata; drafts remain available for parents to evaluate in this MVP.

For source additions, add a category if needed, add a row with complete English/German authored phrases, add the Burmese entry separately, and place the image at its documented path. Use natural equivalents rather than word-for-word translation. Use `npm run db:seed` to insert the new concept. Category IDs in the seed deliberately equal their slugs.

## Images and My World

Seed paths use `/images/<category>/<slug>.svg`. Place files in `public/images`; `/images/vehicles/truck.svg` maps to `public/images/vehicles/truck.svg`. The repository provides local illustration placeholders: custom vector vehicles and emoji-based familiar-object placeholders. They require no third-party image URL. Replace them with clear, licensed real-world photographs for production. Emoji appearance can vary with the device's fonts. The generic fallback prevents broken-image displays.

**My world** lets parents upload JPG/PNG/WebP photos (up to 5 MB), enter curated phrases for English, Burmese, and German, choose a category, and save personalized concepts. The new card belongs to the child and is eligible for sessions. Mark it Knows in My words to prioritize expansion. Give it a unique identifier such as `my-blue-truck`.

`lib/storage/index.ts` defines the `PhotoStorage` interface. The local adapter stores UUID-named files in `UPLOAD_DIR` (or ignored `public/uploads/` during local development) and serves validated filenames through `/api/photos/...`. Uploads require the parent gate and validate file signatures. Back up uploads and the database together. Restarting a deployment with an ephemeral filesystem loses uploaded photos; use the configured persistent disk/volume described in [deployment instructions](docs/deployment.md), or implement an S3-compatible adapter before horizontal scaling. Image cleanup after unused uploads and private signed delivery are future work. Photo metadata stripping is not implemented.

## Audio

`lib/audio/service.ts` owns `playWord`, `playPhrase`, `playSentence`, and `stop`. It stops existing audio and speech before new playback or navigation. A recording URL is tried first. Put recordings in `public/audio/<language>/` and set the translation's local `/audio/...` paths in Content library. Level-2 recordings use `audioPhraseUrl`; a future schema field can support a separate level-3 recording. Never put audio-provider credentials in the browser.

The seed has **no recordings**. The parent can allow the device's built-in Web Speech voice as a free fallback, a setting saved only on that browser. No external TTS request is made by the app; the device controls its available voices and may use its own speech services. Myanmar voices are often unavailable, so the app asks a parent to read the curated phrase. Disable device voice for recording-only/parent-spoken use. Voice quality, accent, network use, and availability depend on the device. Audio never scores pronunciation.

## PWA and accessibility

The manifest, PNG icons, standalone mode, and service worker are in `public`. Installation requires HTTPS (or localhost during development) and browser support. The basic service worker caches an explicit offline activity page and a few generic assets; it does **not** cache child data, uploaded photos, API responses, or full learning sessions. Previously downloaded cards/audio and offline synchronization are prepared as future work, not claimed as implemented.

The app includes responsive phone/tablet layouts, large child controls, labeled arrow fallbacks, reduced-motion support, keyboard focus indicators, image fallback, loading/empty/error states, and separate parent/child UI. Parent editor screens are never shown in a learning session. Swipes have button alternatives. No points, streaks, automated mission verification, negative feedback, or infinite feed is present.

## Architecture

```text
app/                 App Router pages, APIs, global styling
components/child/    finite session, audio controls, missions
components/parent/   gate, vocabulary, settings, content/photo editor
lib/session/         deterministic domain selection and phrase levels
lib/audio/           recording-first audio service
lib/content/         centralized curated content and editorial drafts
lib/db/              Prisma, demo fixtures, safe API errors
lib/storage/         swappable local photo storage
prisma/              schema, migration, idempotent seed
public/              local artwork, icons, manifest, offline shell
 tests/              session generation tests
```

API validation uses Zod. Known Prisma errors produce usable conflict/not-found messages; database failures give retryable messages without returning credentials or raw SQL. Parent-only writes are checked on the server. No analytics dashboard or external API is required.

## Render and Coolify

Both platforms are supported using native Node build/start commands. [Deployment instructions](docs/deployment.md) cover Render's `render.yaml` Blueprint and Coolify's `nixpacks.toml`, PostgreSQL, durable photo storage, secrets, health checks, and redeployment. No Dockerfile is required in this repository; Coolify manages its own containers through Nixpacks.

Hosted services use `npm run deploy:start`: validate runtime settings, verify a writable upload mount, apply Prisma migrations, idempotently seed content, then listen on `0.0.0.0:$PORT`. Required variables are `DATABASE_URL`, `PARENT_SESSION_SECRET`, and an absolute `UPLOAD_DIR` on persistent storage. The Render Blueprint provisions paid PostgreSQL and a disk-backed single web-service instance. Nothing is provisioned just by committing these files.

`/api/health` returns 200 only when the database/profile and upload directory are available. Parent cookies are always Secure in production; optional `APP_ORIGIN` handles proxies with rewritten Host headers without trusting arbitrary forwarded headers.

## Production and validation

Configure PostgreSQL and the parent-security variables, apply migrations, seed, then:

```sh
npm run build
npm start
```

Tests cover selection ratios, language availability, finite length, deterministic output, parent-controlled levels, mission unlocking per language, salted password hashing, runtime configuration, proxy origins, and external photo storage. The cloud setup additionally exercised migrations and repeatable seeds against real PostgreSQL, production startup, and browser/API flows. Run `npm run build` then `npm run test:integration` with a PostgreSQL role that can create schemas to exercise the full production API flow: atomic first-run setup, PIN upgrade, password changes, server-enforced levels and mission progression, idempotent exposure writes, resume, and restart/seed persistence. The integration check creates a random isolated schema and removes only that schema afterwards; it does not reset your household data. It starts a temporary production server on port 3120 (`INTEGRATION_PORT` can override it).

Current boundaries: single household/child, illustrative seed images, Burmese editorial review, no bundled recordings, basic offline shell only, local upload storage, and no parent-account authentication. Suggested next steps are native-language review, clear object photos and recorded audio, more curated descriptor combinations, an S3 adapter, household authentication/data deletion, and deliberately finite offline sessions. Keep parent-child interaction central as the app grows.
