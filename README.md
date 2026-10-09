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

Every family must create an account or sign in before accessing learning or family records. PostgreSQL is required for signup and progress; without it, the app shows a setup notice instead of exposing demo records. A configured but unavailable or unseeded database shows a retryable error.

The current cloud workspace has an initialized local PostgreSQL instance. Its ignored `.env` is already configured. Cloud-only database tooling and data live outside the repository in `/workspace/.littlewords-tools`; they are not app dependencies. Start its `postgres.mjs` helper if the database process has stopped. Do not copy its credentials into documentation.

## Commands

| Command                    | Purpose                                                                     |
| -------------------------- | --------------------------------------------------------------------------- |
| `npm install`              | Install dependencies using the committed lockfile                           |
| `npm run dev`              | Start Next.js development server                                            |
| `npx prisma generate`      | Generate the typed database client                                          |
| `npm run test:integration` | Exercise production API flows using a disposable PostgreSQL schema          |
| `npm run db:migrate`       | Apply the committed PostgreSQL migration                                    |
| `npm run db:seed`          | Insert shared content without overwriting family records                    |
| `npm run photos:migrate`   | Move legacy public uploads into private storage without changing URLs       |
| `npm test`                 | Run session-generation and deployment tests                                 |
| `npm run build`            | Generate Prisma client, type-check, and build production app                |
| `npm run deploy:prepare`   | Validate hosting settings, apply migrations, and seed without starting HTTP |
| `npm run deploy:start`     | Prepare the database/uploads and start the hosted service on `$PORT`        |
| `npm start`                | Run the production build                                                    |

For a new schema change in a separate development task, use `npx prisma migrate dev --name descriptive_name` and commit the generated migration. Deployments use `migrate deploy`, never `db push` or destructive resets. Seeding can be repeated: existing phrases, statuses, settings, custom cards, and exposure counts are retained.

## Environment variables

| Variable                | Purpose                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | PostgreSQL connection string; required for accounts and learning                                        |
| `UPLOAD_DIR`            | Absolute persistent upload directory in hosting; unset uses private `var/uploads` for local development |
| `APP_ORIGIN`            | Optional canonical public HTTPS origin for parent requests behind a proxy                               |
| `STORAGE_PROVIDER`      | `local` (default); another provider requires a PhotoStorage adapter                                     |
| `TTS_PROVIDER`          | `none`; reserved for a future server-side provider, not used to call an API                             |
| `PARENT_SESSION_SECRET` | Random secret of at least 32 characters for signed parent cookies; required in production               |

Generate the session secret with a secure random tool and save it directly in your environment or secret manager. Never commit `.env`. `PARENT_SESSION_SECRET` is a server signing secret, not a user's password.

## Accounts, age, and saved progress

Signup asks for the parent's name, email, password, the child's age in years/months, optional child name, and primary language. No verification email or paid service is required. Each account starts with its own child profile and vocabulary; families mark familiar words themselves. The same account password opens the parent gate. Signup opens the parent area initially; starting learning locks it. Settings allow changing age, password, and signing out.

Passwords use independently salted scrypt hashes. Account cookies contain random opaque tokens; only token hashes are stored in `AccountSession`. Cookies are HttpOnly, SameSite=Strict, Secure in production, and expire after 30 days. The separate parent gate expires after 30 minutes and is bound to the user, account session, and password version. Signout revokes that account session. Password changes revoke other devices and invalidate older parent gates. Writes enforce same-origin requests. Failed login and parent-password attempts have a basic single-process rate limit.

Profiles, vocabulary, custom cards, photos, learning sessions, and mission progress are scoped to the signed-in account on the server. API responses and photos are private and uncached. Shared curated cards are readable by all signed-in families; only trusted `ADMIN` accounts can edit the shared library. Ordinary parents can edit their own My World cards. Public signup cannot grant administrator privileges. A deployment administrator can assign an existing user's `User.role` to `ADMIN` using a trusted database connection.

The child age is saved as an `ageMonths` snapshot plus `ageRecordedAt`; no birthday is inferred or required. An age helper advances that snapshot by elapsed calendar months for future personalization. Current card selection uses parent vocabulary and phrase levels, **not age-based recommendations yet**. The UI currently manages one child per account; database relations allow additional children later.

Every first card exposure is saved once, alongside completion, vocabulary comfort, profile settings, and confirmed mission progress. Leaving a regular session midway exposes **Continue our cards** on Home after signing back in; missions resume from the mission path. Resuming is a deliberate choice and never auto-starts another session. Settings show a small saved-progress summary for the parent.

## Learning and personalization

The legacy demo child knows `car`, `truck`, `police-car`, `excavator`, `red`, `blue`, `green`, and `yellow`. Five additional concepts start as Learning to demonstrate the mix.

`SessionGenerator` in `lib/session/generator.ts` accepts concepts, vocabulary, language, an optional category, a finite length (5, 8, 10, or 12), and a reproducible random seed. The API loads the requested child's vocabulary. It targets **50% known / 30% learning / 20% new**, fills shortages with known concepts first, avoids duplicates, filters inactive cards, and mixes categories where possible. A small category ends when its available unique cards run out.

Known concepts start at level 2. Curated alternatives in `lib/content/expansions.ts` prioritize a familiar color + familiar vehicle (e.g. known yellow + truck → “Yellow truck”), without composing or translating phrases at runtime. The parent can confirm comfort with a word, short phrase, or richer phrase in **My words → Phrase comfort**. That unlocks the next level. Exposure counts alone do not unlock additional levels. A confirmed short phrase plus four exposures unlocks level 3; a confirmed richer phrase plus eight exposures unlocks level 4. Parent-edited phrases and existing recordings take precedence over the seed alternatives. Every first card exposure in a session is stored once; revisiting the same card does not inflate its count. Completion is saved separately and does not mark words as known.

Each session contains the configured number of **total cards, including missions**. The API sets `includeMissions` on the generator, reserving a real-world pause after every four word cards. A default ten-card session has eight word cards and two mission cards. Small categories finish earlier, with no duplicated filler. All five authored mission types cycle across sessions. Pause screens offer Done or Skip with no automated verification. Every third word card includes a gentle parent question, a three-second wait, and an expansion suggestion. The completion screen gives one last offline activity and waits for the parent to leave; it never starts another session automatically.

Swipe left to continue or right to revisit, with large labeled buttons also available. Scroll vertically to read longer cards. Touch and pen swipes show drag feedback; a vertical scroll, canceled gesture, short drag, or pinch does not advance a card. Images and Listen buttons replay audio only on a tap; swiping does not trigger accidental playback. Language switches select one curated language at a time. The primary language and enabled languages are configured in Parent area. No runtime LLM or translation service is used.

## Levels and the mission path

In **Parent area → Phrase level**, choose automatic familiar-word expansion (the default) or one of four practice levels: **1: words**, **2: short phrases**, **3: richer phrases**, **4: simple sentences**. The selected level is stored on the child profile and used for regular sessions; it is an explicit parent choice, never an automatic reward for swiping. Cards show the phrase building up, then offer a turn for a look, point, or word and a chance to say it together. Content remains authored in each language; levels describe complexity rather than an exact word count across languages.

**Missions** opens a finite 12-adventure path, with three missions at each level. Each adventure has up to four unique word cards and a real-world pause, with repeated themes to grow familiar language. The mission defines its practice level independently of the regular-session setting. Mission prompts live in `lib/content/track.ts`; level guidance lives in `lib/content/levels.ts`. New Burmese prompts are reviewable alongside the existing Burmese content.

Mission progress is stored in PostgreSQL for each child and language. The first mission is available immediately; each later mission needs the earlier missions confirmed. Starting practice requires the parent gate; learning locks it again. After completing all mission cards, leave the screen and explore the activity. Back on the mission path, a parent presses **We explored it together** and opens the gate to confirm. Only that confirmation unlocks the next mission. Skipping a pause, completing a session, or exposure counts alone cannot advance the track. Replay completed missions freely, resume an unfinished practice at its next card, and stop after any session. No pronunciation grading, points, streaks, or automatic next session are added.

## Upgrading an existing household

Apply the committed migration, repeat the seed, and move old local photos with `npm run photos:migrate` before starting development. Hosted `deploy:start` performs the photo migration automatically when legacy files are present in the source checkout. Existing profiles, vocabulary, phrase comfort, custom cards, and sessions are preserved; migration never silently assigns them to the next signup.

If the old household has a password or `PARENT_PIN`, the signup screen offers **Link existing household**. Enter the old credential plus the new account information and child age. Only a successful old-password/PIN check can claim the legacy records. This atomic, one-time operation attaches them to an account and retains administrator access to the shared content library. New signups always get separate empty family records. After linking, remove the obsolete `PARENT_PIN`; it is consulted only for this legacy upgrade, never for new accounts.

There is no email verification or self-service password recovery. This intentionally simple signup does not prove email ownership. Any recovery must use a trusted deployment administrator and a verified owner identity; do not delete credentials or let the next visitor claim records. Account deletion/export, verified recovery, and distributed rate limiting are future additions.

## Content and translations

The seed includes **345 concepts across nine categories**, with at least ten cards in every category, prioritizing vehicles, actions, colors/descriptions, and familiar home objects. The Prisma schema includes User, AccountSession, PhotoAsset, ChildProfile, Category, Concept, ConceptTranslation, ChildVocabulary, LearningSession, and SessionCard. The initial SQL migration is committed in `prisma/migrations`.

- `lib/content/catalogue.ts`: authored English and German phrase levels and category metadata.
- `lib/content/expansion-pack.ts`: 200 more everyday concepts, each with four authored English/German stages and an illustration reference.
- `lib/content/expansion-pack-burmese.ts`: the matching 200 separately reviewable Burmese draft entries; review them with a native-speaking educator.
- `lib/content/additional.ts`: 72 additional English/German cards across all nine categories, with all four authored stages.
- `lib/content/additional-burmese.ts`: corresponding Burmese draft stages, separately reviewable.
- `lib/content/burmese.ts`: **separate Burmese editorial drafts/placeholders**, deliberately easy to review. Many entries include four draft levels; some have word-only placeholders repeated across levels. All Burmese seed translations carry `needsReview=true`. Review with a native-speaking educator and replace incomplete levels before relying on Burmese progression. No native-speaker certification is claimed.
- `lib/content/missions.ts`: curated real-world prompts and basic child-facing controls for all three languages.
- `types/index.ts`: UI/domain types, separate from the database client.

Trusted administrators can create/edit shared concepts in **Parent area → Content library**, assign a category/type/difficulty, set a local image path, enter each language's four phrase levels, add audio paths, review language, and pause or activate content. Existing parent edits are not replaced when seeding again. Edit database content in the UI; source seed edits affect new databases/new concepts only. A reviewed flag is editorial metadata; drafts remain available for parents to evaluate in this MVP.

For source additions, add a category if needed, add a row with complete English/German authored phrases, add the Burmese entry separately, and place the image at its documented path. Use natural equivalents rather than word-for-word translation. Use `npm run db:seed` to insert the new concept. Category IDs in the seed deliberately equal their slugs.

## Images and My World

Seed paths use `/images/<category>/<slug>.svg`. Place files in `public/images`; `/images/vehicles/truck.svg` maps to `public/images/vehicles/truck.svg`. The repository provides local illustration placeholders: custom vector vehicles and emoji-based familiar-object placeholders. They require no third-party image URL. Replace them with clear, licensed real-world photographs for production. Emoji appearance can vary with the device's fonts. The generic fallback prevents broken-image displays.

**My world** lets parents upload JPG/PNG/WebP photos (up to 5 MB), enter curated phrases for English, Burmese, and German, choose a category, and save personalized concepts. The new card belongs to the child and is eligible for sessions. Mark it Knows in My words to prioritize expansion. Give it a readable identifier such as `my-blue-truck`; it is namespaced per child so different families can use the same label.

`lib/storage/index.ts` defines the `PhotoStorage` interface. The local adapter stores UUID-named files in `UPLOAD_DIR` (or ignored private `var/uploads/` during local development) and serves validated filenames through `/api/photos/...`. Uploads require the signed-in parent gate and validate file signatures. `PhotoAsset` records ownership, and photo reads require that same family's account. Direct `/uploads/...` access is blocked, including legacy public uploads. Back up uploads and the database together. Restarting a deployment with an ephemeral filesystem loses uploaded photos; use the configured persistent disk/volume described in [deployment instructions](docs/deployment.md), or implement an S3-compatible adapter before horizontal scaling. Unused-photo cleanup and object-storage signed delivery are future work. Photo metadata stripping is not implemented.

## Audio

`lib/audio/service.ts` owns `playWord`, `playPhrase`, `playSentence`, and `stop`. It stops existing audio and speech before new playback or navigation. A recording URL is tried first. Put recordings in `public/audio/<language>/` and set the translation's local `/audio/...` paths in Content library. Level-2 recordings use `audioPhraseUrl`; a future schema field can support a separate level-3 recording. Never put audio-provider credentials in the browser.

The seed has **no recordings**. The parent can allow the device's built-in Web Speech voice as a free fallback, a setting saved only on that browser. No external TTS request is made by the app; the device controls its available voices and may use its own speech services. Myanmar voices are often unavailable, so the app asks a parent to read the curated phrase. Disable device voice for recording-only/parent-spoken use. Voice quality, accent, network use, and availability depend on the device. Audio never scores pronunciation.

## PWA and accessibility

The manifest, PNG icons, standalone mode, and service worker are in `public`. Installation requires HTTPS (or localhost during development) and browser support. Parent area includes an optional **Install LittleWords** button when the browser offers installation, Safari/iPhone Share → Add to Home Screen guidance, and standalone detection. No install prompts interrupt learning. The mobile UI accounts for notches and home indicators, keeps form controls at 16px to avoid iOS focus zoom, and retains pinch zoom and touch-swipe/button alternatives. My words uses 24-card pages, lazy artwork, result counts, search, and category/status filters rather than rendering hundreds of cards. Phrase comfort shows the profile's primary language.

The service worker caches an explicit offline activity page and up to 120 previously viewed public illustrations; it does **not** cache child data, uploaded photos, API responses, authenticated app HTML, or full learning sessions. An offline banner explains the connection requirement; starting/resuming sessions is blocked while the browser reports offline, so families can choose a real-world activity instead. No offline progress synchronization is claimed. Worker updates use no-cache headers and remove older artwork caches. Complete offline sessions/audio and offline synchronization are prepared as future work, not claimed as implemented.

The app includes responsive phone/tablet layouts, large child controls, labeled arrow fallbacks, reduced-motion support, keyboard focus indicators, image fallback, loading/empty/error states, and separate parent/child UI. Parent editor screens are never shown in a learning session. Swipes have button alternatives. No points, streaks, automated mission verification, negative feedback, or infinite feed is present.

## Architecture

```text
app/                 App Router pages, APIs, global styling
components/child/    finite session, audio controls, missions
components/parent/   signup/login, gate, vocabulary, settings, content/photo editor
lib/session/         deterministic domain selection and phrase levels
lib/audio/           recording-first audio service
lib/content/         centralized curated content and editorial drafts
lib/db/              Prisma, demo fixtures, safe API errors
lib/security/        account sessions, password hashes, age snapshots
lib/storage/         private local photo storage and legacy migration
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

Tests cover selection ratios, language availability, finite length, deterministic output, parent-controlled levels, mission unlocking per language, salted password hashing, runtime configuration, proxy origins, and external photo storage. The cloud setup additionally exercised migrations and repeatable seeds against real PostgreSQL, production startup, and browser/API flows. Run `npm run build` then `npm run test:integration` with a PostgreSQL role that can create schemas to exercise the full production API flow: signup/login, cross-account isolation, password-authorized legacy adoption, password changes, server-enforced levels and mission progression, idempotent exposure writes, resume, and restart/seed persistence. The integration check creates a random isolated schema and removes only that schema afterwards; it does not reset your household data. It starts a temporary production server on port 3120 (`INTEGRATION_PORT` can override it).

Current boundaries: one child in each account's UI, no verification/reset email, basic in-process rate limiting, illustrative seed images, Burmese editorial review, no bundled recordings, basic offline shell only, and local upload storage. Suggested next steps are age-aware curation, verified recovery and account deletion/export, native-language review, clear object photos and recorded audio, more curated descriptor combinations, an S3 adapter, and deliberately finite offline sessions. Keep parent-child interaction central as the app grows.

## Updating this content pack

Deploy with `npm run deploy:start` to insert the 200 new concepts automatically. For local or manually started deployments, run `npm run db:seed` with the configured PostgreSQL database. No new schema migration is required for this pack. Repeated seeding preserves family vocabulary, existing curated edits, sessions, photos, and mission progress. New concepts become available in the existing finite sessions and categories; familiar-word expansion remains prioritized over the size of the new-word pool.

On a free Render web service, `UPLOAD_DIR=/tmp/littlewords-uploads` can run a demo but photos are ephemeral and may disappear after restarting or redeploying. Durable photos require a paid disk or a storage adapter. Account/progress persistence depends on the configured PostgreSQL database's retention, not PWA installation. Installation requires HTTPS, with browser support varying across iOS and Android.

### Optional AI adventures (OpenAI or DeepSeek)

The home screen includes **A playful adventure together**. A parent starts a finite session with picture choices, simple interactive scenes, and say-it-together turns. Real-world pauses and parent-selected phrase levels still apply. Accounts save the chosen layout and card progress, so resuming does not call AI again. Curated adventures work without an API key.

To enable AI planning, set server environment variables and restart:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your-server-key
OPENAI_MODEL=gpt-4.1-mini
```

Or use `AI_PROVIDER=deepseek`, `DEEPSEEK_API_KEY`, and optionally `DEEPSEEK_MODEL=deepseek-chat`. Never use a `NEXT_PUBLIC_` prefix for API keys. On Render, add these in the service Environment settings; keep `npm run deploy:start` as the start command so migrations run. No extra storage or paid service is required for curated adventures.

Then open **Parent area**, enable **Allow AI to plan activity layouts**, and save settings. Consent defaults off, including for existing accounts. Providers may charge for requests; configure a provider spending limit. A key being configured does not guarantee it is valid: safe server logs report provider HTTP status or invalid layouts without revealing keys or response bodies.

AI only arranges tested activity components and approved themes. It cannot generate child-facing wording, HTML, JavaScript, images, translations, scores, or phrase levels. The local session generator prioritizes familiar vocabulary and decides stages. Requests contain at most 24 public concept options, labels in the session language, selected stages and familiarity flags. Names, email, ages, family photos, custom cards and recordings are excluded. Curated Burmese remains separately reviewable; this feature does not assess speech or promise developmental outcomes.

Each launch makes at most one request, with an eight-second timeout, bounded responses and strict validation. Missing keys, outages, rejected layouts and rapid repeat launches use curated activities. The one-minute per-child request cooldown is per server process; distributed deployments should add a shared rate limiter and account quotas. Custom My World cards remain available in regular sessions and are excluded from AI adventures. Full account sessions require connectivity; the PWA caches the offline shell and public images, never private account responses.

`npm test` covers both providers using mocked responses (no API key or paid calls needed), privacy boundaries, unsafe output and fallbacks. After `npm run build`, `npm run test:integration` checks account isolation, consent, adventure persistence and completion against a temporary PostgreSQL schema.

### Illustration accuracy

The [illustration review guide](docs/illustration-review.md) documents corrected art for 163 concepts, including every action and color/description, the reviewed picture-choice rules, and how to add accurate illustrations. Use the shared `ConceptImage` renderer in new UI; it applies reviewed artwork consistently and preserves parent photos and edited image URLs. Existing accounts receive these corrections without reseeding or losing progress. After deployment, close and reopen the PWA to activate the updated public-art cache.
