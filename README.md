# Adalat Diary

A court diary for a practising advocate. Case records, today's cause list, and — above all —
**next dates**. Android-first and installable as a PWA, with a full desktop layout above
1024px, and usable inside a courtroom with no signal.

Design language and tokens live in [DESIGN.md](DESIGN.md).

---

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | **Next.js 15** (App Router) + React 19 | One codebase for the Android PWA and the later web layout. Route handlers give the API without a second server. |
| Language | **TypeScript** (strict) | The record shape is the whole product; it should be checked. |
| Styling | **Tailwind CSS 3** with M3-Expressive tokens | Tokens declared once as channel-based CSS vars → dark theme is a variable swap, and `/opacity` still works. |
| Type | **Poppins + Inter**, self-hosted via `next/font` | Poppins for headings and numerals, Inter for dense UI. Two families, no runtime font request. |
| Auth | **jose** JWT in an httpOnly cookie + `node:crypto` scrypt | Edge-verifiable in middleware; scrypt is memory-hard and already in the standard library, so no bcrypt and no native build. |
| Database | **MongoDB** via **Mongoose 8** | Connection cached across serverless invocations; compound + text indexes on the read paths. |
| Validation | **Zod** | One schema shared by the API and the form. |
| Data fetching | **SWR** | Stale-while-revalidate on the client, mirroring the service worker's strategy. |
| Offline | **idb-keyval** + hand-written service worker | Write-behind outbox and a cached docket. No `next-pwa` — ~90 lines beats a build plugin here. |
| PDF | **jsPDF + autotable**, dynamically imported | Cause lists are generated on the device, so nothing leaves it and no function pays the render cost. ~350 KB, kept out of the first-load bundle. |
| Icons | Inline SVG (`components/ui/Icon.tsx`) | The Material Symbols font is ~2 MB and cannot be relied on offline. |

---

## Getting started

```bash
npm install
cp .env.example .env.local     # add your MONGODB_URI
npm run dev                    # http://localhost:3000
```

Open `/signup` and create your account. The diary starts empty — there is no
sample or seed data anywhere in the app; every record you see is one you entered.

`MONGODB_URI` is required — the app has no fallback store and will tell you plainly if it
cannot reach the database. Check `/api/health` to see the connection state at any time.

### Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (flat config) |
| `npm run migrate:crn` | One-off: make the CRN index partial (pre-0.5 databases only) |
| `npm run migrate:dates` | One-off: derive `hearingDates` for records saved before 0.9 (safe to re-run) |
| `npm run csv:prompt` | Regenerate `docs/csv-import-prompt.md` from the live court and stage lists |
| `node scripts/generate-icons.mjs` | Regenerate the PWA icon set |

---

## The record

Seven fields carry the diary. Everything else is optional context.

| Field | Type | Notes |
| --- | --- | --- |
| `crn` | string, optional | Case Registration Number. Unique per chamber where present — a matter can be opened before the registry issues one. |
| `preDate` | Date \| null | Previous hearing date. |
| `court` | string, **required** | One of the 93 court codes in `lib/constants/courts.ts`, chosen from a grouped dropdown. |
| `party1` | string, **required** | Petitioner / Plaintiff / Complainant. |
| `party2` | string, **required** | Respondent / Defendant / Accused. |
| `stage` | enum, **required** | One of 30 procedural stages (`lib/constants/stages.ts`), defaulting to Notice / Summons. |
| `nextDate` | Date \| null | Next date of hearing. |

Plus: `caseNo`, `courtRoom`, `judge`, `purpose`, `appearingFor`, `clientName`,
`clientPhone`, `notes`, `pinned`, `status`, `history[]`, `ownerId`, timestamps.

### Indexes

```js
{ ownerId: 1, crn: 1 }                 // unique, PARTIAL — only where crn exists
{ ownerId: 1, status: 1, nextDate: 1 } // the hot path: board, diary, docket sort
{ ownerId: 1, pinned: -1, nextDate: 1 }// pinned-first docket
{ crn, caseNo, party1, party2, court, judge } // weighted text index for search
```

---

## Responsive layout

One breakpoint carries it: **`lg` (1024px)**.

| | Mobile | Desktop |
| --- | --- | --- |
| Navigation | Bottom bar, FAB docked centre | Fixed 240px sidebar with live counts |
| Board | Stacked, 2×2 stats | Inset hero, 1×4 stats, 1.6 : 1 split |
| Docket / Diary | One column, stage chips behind a toggle | Two columns at `xl`, chips always visible |
| Case detail | Scroll, floating CTA above the nav | Sticky dossier column + scrolling tabs |
| Forms | One column, sticky action bar | Two-column grid in 46rem, inline actions |
| Auth | Centred card on navy | Brand panel + form, side by side |
| Sheets | Bottom sheet | Centred dialog |

Screens never invent their own width — three `.page*` container classes in `globals.css`
decide the measure, and the app bar takes a matching `width` prop so titles line up with the
content beneath them. See [DESIGN.md](DESIGN.md) for the full rationale.

---

## Screens

| Route | Screen | Purpose |
| --- | --- | --- |
| `/login` | **Sign in** | Username and password. Nothing else. |
| `/signup` | **Create account** | Same two fields; the account is the chamber. |
| `/` | **Board** | Today's date, four counters, today's cause list, what's coming up. |
| `/cases` | **Docket** | Search omnibar, filter segments (All / Today / Upcoming / Passed / Disposed), stage chips, paged list. |
| `/cases/new` | **New case** | The seven fields above the fold, chamber details collapsed. |
| `/cases/[id]` | **Case detail** | Dossier card, next-date panel, Overview / History tabs, pin, share, edit, delete. |
| `/cases/[id]/edit` | **Edit** | Same form, pre-filled. |
| `/diary` | **Diary** | Every upcoming date grouped chronologically, overdue pinned on top. |
| `/settings` | **Chamber** | Profile picture, sign-out, light/dark/system theme, sync status, pending writes, PDF share, CSV import/export, install prompt. |
| `/offline` | **Offline** | Served by the SW only when a navigation misses the cache. Auto-returns when connectivity comes back. |
| `not-found.tsx` | **404** | "This file is not on the record." |
| `error.tsx` | **Error** | Leads with "your case records are safe", offers retry + digest. |

The **"Record next date"** sheet on the detail screen is the app's most-used write: it moves
`nextDate` into `preDate`, sets the new date, updates the stage, and appends to the
procedural history in one atomic MongoDB update.

---

## Courts

`lib/constants/courts.ts` holds the 93 establishments this chamber practises in — the Ajmer
district headquarters and its tehsil courts — as the registry's own codes (`ADJ1`,
`KISHANGARH-ACJM2`, `BEAWAR-NI`…). The codes are stored verbatim, because that is what goes
on a cause list.

The court field is a **dropdown** with a filter box, grouped by establishment so 93 options
stay navigable:

| Group | Courts |
| --- | --- |
| Ajmer — District Headquarters | 61 |
| Kishangarh | 7 |
| Nasirabad | 3 |
| Beawar | 12 |
| Kekri | 5 |
| Other tehsils | 5 |

A record carrying a court that is no longer on the list keeps it as a selectable option, so
editing an old matter cannot silently move it to another court. The CSV importer matches
cells against the same list, tolerating case and spacing (`adj 1` → `ADJ1`), and reports a
row naming a court that does not exist rather than filing it in the wrong place.

---

## Sharing & import

### PDF cause lists

Three documents, all built in the browser by `lib/pdf/diary.ts` and handed to the Web Share
API — on Android that puts the file straight into WhatsApp; everywhere else it downloads.

| Document | Orientation | Where | Contents |
| --- | --- | --- | --- |
| **Day cause list** | Landscape | Diary → the share icon on any day heading; Board → *Share PDF* | One table of everything on that day's page |
| **Monthly diary** | Landscape | Diary → *Share PDF*; Chamber → *Share as PDF* | **A separate table per day**, each under its own dated heading, in date order |
| **Case sheet** | Portrait | Case detail → *PDF* | The full record, its chamber notes and its procedural history |

The cause lists carry the register's own columns, in the register's own order:

```
Sr No · CRN · Pre Date · Court · Party 1 · Party 2 · Stage · Next Date · Status · Listed For
```

`Status` is *Listed*, *Heard* or *Disposed* — a day's page holds matters that were before
the court that day and have since been adjourned as well as matters still to be taken up,
and the column says which a row is. `Next Date` reads **Awaited** where the court has not
given one.

They print landscape because they have to: a real CRN is an unbreakable eighteen-character
token, and on A4 portrait there is no width at which it and two party names all fit without
one of them splitting through the middle of a word. Court codes still exceed their column —
`PISANGAN-GRAM-NYAYALAYA` is the worst — so they are broken at the hyphen nearest their
centre rather than wherever the text ran out.

Each is drawn in the app's own colours — navy header band with the ochre rule, tabular
figures, zebra rows — with a footer carrying the chamber, the generation time and
`Page n of m`, and a header summarising the day (`4 matters · 2 listed · 2 already heard`).
No row is ever split across a page. jsPDF is `import()`ed at the moment you press share, so
a session that never prints never downloads it.

A single record also shares as **plain text** (the cause slip) from the share icon on any
docket card, or from the app bar on the case detail screen.

### CSV import

Chamber → *Import from CSV*, or the *Import* button on the docket. A three-step dialog:
drop the file, review what was read, confirm.

- **Drag and drop**, or a file picker. Up to 500 rows.
- **The accepted format is on the first screen**, not behind a help link — every column,
  whether it is required, and a worked example — with a one-click template download.
- Headers may be in **any order and any casing**, and common aliases are understood
  (`Petitioner` → Party 1, `NDOH` → Next Date). Unrecognised columns are reported and
  ignored rather than failing the import.
- Dates accept `25/09/2026`, `25-09-2026` and `2026-09-25`. Stages match on label, short
  name, id or the register's own short codes — `CR` → Cheque Report, `PF` → Process Fee,
  `WS` and `Reply` → Written Statement / Reply, `Judgement` → Judgment.
- Review shows **per-row reasons** for anything that will be skipped — a missing party, an
  unreadable date, a CRN duplicated inside the file — and a preview of what will land.
- *Update matters that already exist* matches on CRN; left off, existing matters are skipped.

Parsing is RFC 4180, so quoted fields containing commas and newlines survive, and Excel's
UTF-8 BOM is stripped.

**Handing the job to someone else:** [`docs/csv-import-prompt.md`](docs/csv-import-prompt.md)
is a self-contained brief — every column, the date formats, all 96 court codes, all 30 stage
names with their accepted short codes, and a worked example. Copy it to a clerk or paste it
into an assistant. It is **generated from the app's own constants** (`npm run csv:prompt`),
so it cannot drift from what the importer actually accepts.

---

## Authentication

Username and password. No email, no reset flow, no third-party identity provider — an
advocate's diary does not need one, and every extra field is another thing to get wrong at
6 a.m. in a bar room.

- **Passwords** are hashed with `node:crypto`'s scrypt (`scrypt$<salt>$<key>`,
  `lib/auth/password.ts`). Wrong password and unknown username return the identical message,
  and a missing user still burns a decoy hash so response time reveals nothing.
- **Sessions** are HS256 JWTs in an `httpOnly`, `sameSite=lax`, 30-day cookie
  (`lib/auth/session.ts`). The server derives their signing key from the required,
  server-only MongoDB connection credential, so there is no separate auth-secret variable.
- **`src/middleware.ts`** verifies the token on the edge before any page renders, so a
  signed-out visitor never reaches a screen that would query the database. It remembers the
  requested path in `?next=` and returns them there after login. API routes check the session
  themselves and answer `401` JSON rather than redirecting.
- **Scoping**: the JWT `sub` *is* the `ownerId` on every case. There is no query in the app
  that is not scoped by it, so one account can never read another's docket.
- **"Keep me signed in"** picks the lifetime. Checked, the cookie persists for 90 days on
  that device. Unchecked, it is a *session* cookie with no expiry at all — the browser drops
  it on close, which is what you want on a shared chamber machine. The JWT's own expiry
  always matches the cookie, so clearing one cannot leave the other valid.
- **Profile picture**: cropped to a square and scaled to 256px in the browser, then stored
  as a data URL on the user document. A 4 MB camera photo becomes a ~20 KB upload, and the
  server needs no image library — which matters on a cold-starting function.

---

## Offline behaviour

Three independent layers, so a dead signal degrades gracefully rather than failing:

1. **Service worker** (`public/sw.js`)
   - build assets → cache-first
   - navigations → network-first, cache fallback, then `/offline`
   - `GET /api/cases|stats` → stale-while-revalidate, capped at 60 entries

2. **IndexedDB snapshot** (`lib/offline/cache.ts`) — the last good docket and stats, so a
   cold offline start paints real data instead of an empty screen.

3. **Write-behind outbox** (`lib/offline/outbox.ts`) — creating a case or recording a next
   date while offline queues the request in IndexedDB. `SyncProvider` drains it in order the
   moment the device reconnects. 4xx responses are dropped (the server will never accept
   them); 5xx and network errors retry up to five times, preserving ordering.

A banner under the app bar always states which of these is in play, with a live count of
pending writes.

---

## Deploying to Vercel

Next.js is Vercel's own framework, so there is no adapter and no `vercel.json` — the
defaults are correct. Four steps:

### 1. Push to GitHub

```bash
git add -A
git commit -m "Adalat Diary"
git remote add origin https://github.com/<you>/adalat-diary.git
git push -u origin master
```

`.env.local` is gitignored and must stay that way — your database password lives in it.
Verify before pushing:

```bash
git ls-files | grep -c "^.env.local$"   # must print 0
```

### 2. Open MongoDB Atlas to Vercel

Vercel's serverless functions do not have fixed IP addresses, so an allowlist of your home
IP will fail in production. In Atlas → **Network Access** → Add IP Address, choose
**Allow access from anywhere** (`0.0.0.0/0`).

That is safe here because the connection string itself is the credential — keep it out of
the repo and rotate it if it ever leaks. If you would rather not open it, Atlas private
endpoints require a paid Vercel plan.

### 3. Import the project

On [vercel.com/new](https://vercel.com/new), import the repository. Framework preset,
build command and output directory are all detected automatically. Before the first deploy,
add the environment variables (Settings → Environment Variables), for **Production**,
**Preview** and **Development**:

| Variable | Value | Notes |
| --- | --- | --- |
| `MONGODB_URI` | your Atlas connection string | Percent-encode the password if it contains `@ : / ? # [ ] %` |
| `MONGODB_DB` | `adalat_diary` | |
| `NEXT_PUBLIC_APP_NAME` | `Adalat Diary` | Shown in the manifest and share sheet |
| `NEXT_PUBLIC_APP_URL` | `https://<your-app>.vercel.app` | Set after the first deploy, then redeploy |
| `LOG_LEVEL` | `info` | `debug` if you are chasing something |

`NEXT_PUBLIC_*` values are inlined into the client bundle at build time, so changing either
of them needs a redeploy, not just a restart.

### 4. Verify the deployment

```
https://<your-app>.vercel.app/api/health
```

`{"status":"ok", …}` means the function reached Atlas. If it returns `503`, the JSON body
carries the real driver error and the Vercel function log carries the one-line diagnosis —
`bad auth`, IP allowlist, DNS, and so on. Then open `/signup` and create your account.

### Notes

- **The PWA only installs from the deployed site.** The service worker is registered only
  when `NODE_ENV=production`, so "Add to Home screen" appears on the Vercel URL, not on
  `localhost`. HTTPS is required, which Vercel gives you.
- **Every route is dynamic.** The diary is per-user and cookie-scoped, so nothing is
  statically cached — no stale docket after a write, and no ISR to configure.
- **Cold starts.** The Mongoose connection is cached on `globalThis`, so a warm function
  reuses its pool instead of opening a new one per request. `maxPoolSize` is 10; if you ever
  run a large number of concurrent functions, lower it rather than raising Atlas's limit.
- **Region.** Put the Vercel function region near your Atlas cluster (Settings → Functions)
  — for an India cluster, `bom1`. A mismatched region adds a round trip to every query.

---

## Logging & diagnostics

Every log line is tagged with its subsystem and passed through `redact()`
(`lib/utils/logger.ts`), which strips `user:password` out of anything shaped like a
connection string — a credential cannot reach a terminal, a log file or an error tracker.

```
› 06:38:33.147 [db] connecting { scheme: 'mongodb', hosts: [ … ], database: 'adalat_diary' }
› 06:38:34.473 [db] ready { ms: 1312, database: 'adalat_diary', host: '…mongodb.net' }
› 06:38:50.297 [auth] account created { username: 'garvit', id: '6aa644fa…' }
```

**Connection lifecycle** — `lib/db/mongodb.ts` logs the target before dialling (hosts and
database only), the time taken once ready, and every Mongoose lifecycle event thereafter:
`connected`, `reconnected`, `disconnected`, `close`, `error`.

**Failures come with the fix, not just the stack.** A rejected connection is matched against
the usual causes and logged with one actionable sentence:

```
✕ [db] connect failed { name: 'MongoServerError', code: 8000, codeName: 'AtlasError',
                        message: 'bad auth : authentication failed' }
✕ [db] Atlas rejected the username or password. Check Database Access in Atlas, and
       remember the password must be percent-encoded if it contains @ : / ? # [ ] or %.
```

Covered: bad auth, unreachable server / IP allowlist, DNS and SRV failures, timeouts,
missing permissions on the database, and placeholders left in `MONGODB_URI`.

**Status codes tell the truth.** A database that is down is a `503` with *"Cannot reach the
database right now. Your records are safe — please retry."*, not a generic `500`.

**`GET /api/health`** reports the live connection state, the database and host it resolved
to, and the ping latency — with the real driver error when it is down:

```json
{ "status": "ok", "database": { "state": "connected", "database": "adalat_diary",
  "host": "…mongodb.net" }, "latencyMs": 52 }
```

**`LOG_LEVEL`** (`debug` | `info` | `warn` | `error`) controls verbosity — `debug` in
development, `info` in production.

**Auth events** are logged without secrets: account created, signed in, login failed (no such
user), login failed (wrong password). Passwords never reach the logger.

---

## Folder structure

```
adalat-diary/
├── DESIGN.md                     design system + product rationale
├── next.config.mjs               security headers, SW cache policy, bundle tuning
├── tailwind.config.ts            M3 tokens (alpha-aware rgb vars)
├── scripts/
│   └── generate-icons.mjs        PNG icon set, no image dependency
├── public/
│   ├── manifest.webmanifest      installable, with app shortcuts
│   ├── sw.js                     service worker
│   ├── robots.txt                a private diary: indexed by nobody
│   └── icons/                    192 / 512 / maskable / apple-touch / svg
└── src/
    ├── middleware.ts             edge session check on every page request
    ├── app/
    │   ├── layout.tsx            shell: fonts, metadata, viewport, providers
    │   ├── globals.css           design tokens (light + dark) and component layer
    │   ├── (auth)/               signed-out group — no nav, no sync banner
    │   │   ├── layout.tsx        centred navy shell
    │   │   └── login/  signup/   → two fields each
    │   ├── (app)/                signed-in group — session gate + nav + sync
    │   │   ├── layout.tsx        resolves the session once, provides it downward
    │   │   ├── page.tsx          → Board       (server-seeded)
    │   │   ├── cases/…           → Docket, New, Detail, Edit (server-seeded)
    │   │   └── diary/  settings/ → Diary, Chamber
    │   ├── offline/              → offline screen
    │   ├── not-found.tsx  error.tsx  global-error.tsx
    │   └── api/
    │       ├── auth/signup · login · logout · me
    │       ├── health/route.ts           GET — can we reach the database?
    │       ├── cases/route.ts            GET list · POST create
    │       ├── cases/[id]/route.ts       GET · PATCH · DELETE
    │       ├── cases/[id]/adjourn/route.ts  POST — roll the date forward
    │       └── stats/route.ts            GET — six counters in one $facet
    ├── components/
    │   ├── auth/                 AuthForm (login + signup share one component)
    │   ├── layout/               AppShell · AppBar · BottomNav · SideNav
    │   │                         AppProviders · SyncProvider · SessionProvider
    │   │                         Hydrate · ThemeScript
    │   ├── screens/              one file per screen, all client components
    │   ├── cases/                CaseCard · CaseForm · AdjournSheet · StageBadge
    │   │                         DateChip · ImportDialog · ExportDialog
    │   ├── settings/             ProfileCard
    │   └── ui/                   Button · Form (the field kit) · Select · DatePicker
    │                             Popover · Icon · Sheet · Toaster · SearchBar
    │                             SegmentedTabs · EmptyState · Skeleton · Avatar
    ├── hooks/                    useCases · useCase · useStats · useOnline
    │                             useToast · useTheme · useInstallPrompt
    ├── lib/
    │   ├── api/                  fetch client · wire serializer · SWR cache keys
    │   ├── auth/                 scrypt hashing · JWT session · server helpers
    │   ├── csv/                  column spec · RFC 4180 parser · row validation
    │   ├── pdf/                  cause lists, monthly diary, case sheets
    │   ├── data/                 the one server-side reader, shared by API + RSC
    │   │                         plus `prefetch()` — seeding may fail without
    │   │                         taking the screen down
    │   ├── db/                   cached, instrumented Mongoose connection
    │   ├── models/               Case and User schemas and indexes
    │   ├── validation/           Zod schemas
    │   ├── offline/              outbox + snapshot cache
    │   ├── constants/            stages, courts, nav
    │   └── utils/                dates, class names, API helpers, case helpers,
    │                             redacting logger
    └── types/                    shared record types
```

`app/` holds routing only — every screen is a component in `components/screens/`, so a route
file stays under ten lines and the same screen can be reused in the tablet split view later.

---

## Performance notes

- **No fetch waterfall on first paint.** Board, docket, diary and case detail read through
  `lib/data/cases.ts` on the server and hand SWR a pre-keyed cache via `<Hydrate>`
  (`lib/api/keys.ts` computes the same key on both sides). The first HTML frame carries real
  case data; SWR revalidates underneath. No skeleton flash, no round trip.
- The session is resolved **once** in the `(app)` server layout and passed down through
  context — no `/api/auth/me` call on the client.
- **103 kB** shared first-load JS; the heaviest screen adds ~9 kB.
- Mongoose is server-external (`serverExternalPackages`) so the driver never reaches the
  client bundle.
- Every list query is index-covered and `.lean()`; board counters are a single `$facet`
  aggregation instead of six round trips.
- `CaseCard` is memoised — a docket re-renders on every keystroke of the search box.
- Poppins and Inter are self-hosted at build time via `next/font` — no runtime font
  request, no layout shift, and both render offline.
- `jose` is imported by subpath (`jose/jwt/sign`, `jose/jwt/verify`) so the package's JWE
  decryption — which reaches for `DecompressionStream` — never enters the edge bundle.
- Theme is applied by an inlined pre-paint script, so a dark-mode user never sees a light flash.
- Icons are inline paths, not a font or sprite sheet.
- `console.*` except `error`/`warn` is stripped in production builds.

## Roadmap

- **Web layout.** Screens are capped at `max-w-screen-sm` today. The tablet/desktop split
  view (cause list left, dossier right) reuses the same screen components.
- Push reminders the evening before a listed date; document vault; fee tracking.
