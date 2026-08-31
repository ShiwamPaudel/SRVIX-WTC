# SRVIX — WTC · Project Memory

> Reference brief for future work on this repo. **This is a LIVE PRODUCTION system.** Treat every
> change as a change to a running service used daily by field engineers.

Last studied: 2026-08-07 · branch `main` · last commit `52ca120 changes to active cpu usage on cloud`

---

## 1. What this is

**SRVIX** is a Service Operations Management System built for **Web Trading Concern Pvt. Ltd. (WTC)**,
a Nepal-based medical-equipment company. It manages the full field-service lifecycle:

customers → installed machines → warranty/contract coverage → PMS schedules → service tickets →
engineer dispatch/acceptance → closure with signed service report → attendance & daily reporting.

- Package name: `srvix-wtc`, version `0.1.0`, private.
- Timezone-critical app: **all business dates are Asia/Kathmandu (NPT)**, `APP_TIME_ZONE` in `src/lib/utils.ts`.
- Branding: SRVIX (product) + WTC (org). Colors: navy `#12384f`, blue `#38b6ff` / `#087fb6`, cream `#fffdf7`.
- Installable **PWA** (`public/manifest.webmanifest`, `public/sw.js`, `PWARegister` install prompt).

---

## 2. Stack & deployment

| Layer | Choice |
|---|---|
| Framework | Next.js **16.2.6** App Router, React 19, TypeScript strict |
| Styling | Tailwind CSS v4 (`@import "tailwindcss"` in `src/app/globals.css`), no tailwind.config |
| UI | Hand-rolled shadcn-style primitives in `src/components/ui/`, Radix, lucide-react, framer-motion, recharts, sonner (toasts) |
| Auth | NextAuth v5 beta (`next-auth@5.0.0-beta.31`), Credentials provider, **JWT sessions** |
| DB | **Turso / libSQL** via `@tursodatabase/serverless/compat` |
| Files | **Zoho WorkDrive** (service reports, photos) — never store binaries in Turso |
| Email | nodemailer → Zoho SMTP |
| Push | `web-push` (VAPID) + custom service worker |
| Maps | **Leaflet + OpenStreetMap** loaded from unpkg CDN at runtime (no API key). Component is named `google-map-view.tsx` but is *not* Google Maps |
| PDF | `pdfkit` (daily attendance report) |
| Forms | react-hook-form + zod v4 |
| Host | **Vercel** (`vercel.json` defines crons) |

Scripts: `npm run dev|build|start|lint`, `db:migrate`, `db:create-admin`, `db:import-csv`.

`next.config.ts` only sets `experimental.serverActions.bodySizeLimit = "8mb"` (for uploads).

---

## 3. Data model (Turso)

Schema lives in **`src/lib/turso/schema.sql`**; TS types mirror it in **`src/types/service.ts`**.

**Convention that matters: every column is `TEXT NOT NULL DEFAULT ''`.** There are no nulls, no
numbers, no booleans, no dates in the DB — everything is a string, and `rowToRecord()` coerces
`null → ""`. Dates are `YYYY-MM-DD` strings or ISO timestamps; numbers are numeric strings.

### Tables (18)

| Table | PK | Purpose |
|---|---|---|
| `customers` | CustomerID | Hospitals/clients. `HospitalName` is normalized to equal `NameOfCustomer` on read |
| `device_models` | ModelID | Brand + model + `PMSFrequency` (**days**, as string) + image |
| `installations` | InstallationID | **The real machine table** |
| `contracts` | ContractID | AMC / CMC / RRC contracts, linked by `InstallationID` |
| `tickets` | TicketID | Service tickets (33 columns) |
| `ticket_logs` | LogID | Append-only audit trail per ticket |
| `engineers` | EngineerID | Engineer profile + last known live location |
| `engineer_location_logs` | LocationLogID | Every GPS check-in (drives attendance + map) |
| `pms_schedule` | PMSID | Preventive-maintenance rows, one per due date |
| `previousrecords` | (ticket_id) | **Imported legacy history** — lowercase snake_case columns, no real PK |
| `users` | UserID | Login accounts; `EngineerID` links to engineer profile |
| `notifications` | NotificationID | In-app + email notification records |
| `leave_requests` | LeaveRequestID | Engineer leave, admin approves/rejects |
| `push_subscriptions` | SubscriptionID | Web-push endpoints (unique `Endpoint`) |
| `planned_visits` | PlanID | Planner-created visits (each spawns a ticket) |
| `customer_visit_rules` | RuleID | Recurring "every N days" visit rules (virtual, not materialized) |
| `service_center_movements` | MovementID | Machine brought into the service center |
| `service_center_tasks` | TaskID | Work done on a machine while in the service center |

### Critical modeling quirk — `Machine` is derived, not stored

There is **no `machines` table**. `dataService.machines()` builds `Machine` objects in memory from
`installations` + `device_models` + `contracts` (`installationToMachine()` in `src/lib/turso/service.ts`).

- **`MachineID === InstallationID`** — always. Code defensively matches on both.
- `ContractType`, `ContractStart`, `ContractEnd` on a Machine are **computed live** by
  `machineCoverage()` (`src/lib/coverage.ts`), not read from a column.
- `LastPMS` / `NextPMS` are hardcoded `""` in the derivation; pages compute them from `pms_schedule`.
- `createMachine()` actually inserts an **installation** row.

### Coverage logic (`src/lib/coverage.ts`)

Priority: active contract → active warranty → out of warranty.
`AMC → "Under AMC"`, `CMC → "CMC"`, `RRC → "RRC"`, else `"Out of Warranty"` / `"Under Warranty"`.
All comparisons use `YYYY-MM-DD` string keys (`dateKey`), never Date arithmetic.

---

## 4. Data access layer — `src/lib/turso/service.ts` (867 lines)

Single `dataService` object; **the only place raw SQL is written**. `import "server-only"` guards it.

Key mechanics to respect when editing:

- **Column allow-list** (`columns` const) drives SELECT/INSERT/UPDATE. Adding a DB column requires
  adding it here **and** in `schema.sql` **and** in `src/types/service.ts` — otherwise it is silently
  ignored (`tableColumn()` throws for unknown columns in WHERE/ORDER BY).
- **In-process read cache**: 30 s TTL, max 80 entries, plus a pending-promise dedupe map.
  `users` and `push_subscriptions` are **never cached** (`nonCachedTables`).
  **Any insert/update/delete calls `clearReadCache()`** — a full flush, not selective.
  Cached values are cloned on read, so callers can mutate freely.
- Identifiers are quoted via `quote()`; all values are parameterized. No string interpolation of
  user input (the one interpolated value, `LIMIT`, is clamped to 1..100).
- `normalizeTicket()` collapses legacy `"Resolved"` → `"Closed"`; anything not `Closed` → `Pending`.
  It also cross-fills the duplicate pairs `TicketDate`/`Date`, `ProblemDescription`/`Description`,
  `MachineID`/`InstallationID`.
- `deleteTicket()` also detaches the linked PMS row (back to `Scheduled`) and deletes its ticket logs.
- `updateTicket()` always stamps `LastUpdated`.

`src/lib/data.ts` sits on top: `getServiceDataset()`, `joinTicketsWithRelations()`,
`getTicketsWithRelations()`, `getTicket()`, `getDashboardMetrics()` — and applies **engineer-scoped
filtering** (an Engineer sees only tickets where `AssignedEngineer === session.engineerId`).

`src/lib/mock-data.ts` (418 lines) is **dead code** — nothing imports it.

---

## 5. Auth, roles, permissions

- `src/auth.ts` — Credentials provider. Looks up user by case-insensitive email, rejects
  `ActiveStatus === "Inactive"`, then compares `parsed.password !== user.PasswordHash`.
  ⚠️ **Passwords are stored and compared in plaintext** despite the column name `PasswordHash`
  (see `scripts/turso-create-admin.mjs`, `api/engineers` POST, `api/profile` PATCH). Known issue —
  do not "fix" silently; changing it invalidates every existing login and needs a migration plan.
- JWT callbacks put `role` and `engineerId` on the token/session (`src/types/next-auth.d.ts`).
- **Roles: `Admin` | `Manager` | `Engineer`.** In practice most gates are `isAdmin()` (binary);
  `Manager` behaves as a read-mostly non-admin and is barely differentiated.
- `src/lib/permissions.ts` — `isAdmin()` and `canAccessPath()` with an admin-only path list:
  `/settings, /engineers, /customers/new, /device-models/new, /machines/new, /tickets/new, /contracts, /pms`.
- `middleware.ts` — redirects unauthenticated users to `/login`; enforces `canAccessPath` for pages
  (not `/api`). Public routes: `/login`, `/api/auth`, `/api/reports/daily-email`,
  `/api/pms/auto-create-tickets` (the last two are protected by `CRON_SECRET` instead).
- **API routes re-check auth themselves** — middleware is not the API's authorization layer.
- Engineer PATCH on a ticket is field-restricted to
  `AttachmentURLs, TicketStatus, EngineerRemarks, Resolution, CompletionDate`; any other key → 403.

---

## 6. Route map

### Pages — `src/app/(app)/*` (all wrapped in `AppShell`, which redirects to `/login`)

`/dashboard` · `/tickets` · `/tickets/new` · `/tickets/[ticketId]` · `/tickets/[ticketId]/edit` ·
`/machines` · `/machines/new` · `/machines/[machineId]` · `/service-center` · `/planner` ·
`/attendance` · `/contracts` · `/contracts/new` · `/engineers` · `/engineers/new` · `/pms` ·
`/maps` · `/settings` · `/profile` · `/customers/new` · `/device-models/new`
`/` → redirects to `/dashboard`; `/analytics` → redirects to `/settings`.

Nav is defined in `src/components/nav-items.ts` (`visibleNavItems(role)`).

### API — `src/app/api/*`

| Route | Methods | Notes |
|---|---|---|
| `/api/auth/[...nextauth]` | GET POST | NextAuth handlers |
| `/api/tickets` | GET POST | POST is Admin-only; enforces service-report attachment before `Closed` |
| `/api/tickets/[ticketId]` | GET PATCH DELETE | Accept-ticket flow, engineer field allow-list, PMS sync, logs. DELETE Admin-only |
| `/api/machines` | POST | Admin. Creates installation **and auto-generates up to 100 PMS rows** through warranty expiry |
| `/api/contracts` | POST | Admin. Creates contract **and auto-generates up to 100 PMS rows** through contract end |
| `/api/customers`, `/api/device-models` | POST | Admin |
| `/api/engineers` | POST | Admin. Creates engineer + linked user account |
| `/api/engineers/location` | PATCH | GPS check-in; remarks required; writes log + notifies admins |
| `/api/pms` | GET | ⚠️ **No auth check** |
| `/api/pms/[pmsId]/ticket` | POST | Admin; manual PMS→ticket |
| `/api/pms/auto-create-tickets` | GET | **Cron**, `CRON_SECRET` |
| `/api/planner/plans` | POST PATCH | Plan CRUD; POST admin, PATCH admin-or-assigned-engineer |
| `/api/planner/rules` | POST PATCH DELETE | Admin; recurring visit rules |
| `/api/planner/pms` | PATCH | Admin; reassign/reschedule PMS + cascade to linked ticket |
| `/api/leave-requests` | GET POST PATCH | Engineer creates, Admin approves/rejects |
| `/api/notifications` | GET POST PATCH | Also opportunistically runs planner activation every 15 min |
| `/api/push/subscriptions` \| `/test` \| `/public-key` | | Web-push plumbing |
| `/api/profile` | PATCH | Self name/password |
| `/api/upload` | POST | multipart → Zoho WorkDrive |
| `/api/reports/daily-pdf` | GET | Admin; streams the attendance PDF |
| `/api/reports/daily-email` | GET | **Cron**, `CRON_SECRET`; `?verify=1` tests SMTP |

---

## 7. Business workflows

### PMS (preventive maintenance)
1. `POST /api/machines` — model's `PMSFrequency` (days) drives an arithmetic series from
   installation date to warranty expiry, capped at **100 rows**, `Status: "Scheduled"`, numbered `PMSNumber`.
2. `POST /api/contracts` — same generation from contract start to contract end; `PMSNumber` continues
   from the machine's current max.
3. **Cron `15 3 * * *` UTC = 09:00 NPT** hits `/api/pms/auto-create-tickets` →
   `createDuePMSTickets()` in `src/lib/pms-tickets.ts` creates a ticket for every PMS due **today (NPT)**,
   sets PMS `Status: "Scheduled"` + `TicketID`, writes a log, and pushes to the assigned engineer.
   Idempotent: skips rows that already have a ticket or are `Completed`.
4. Closing a PMS ticket flips the PMS row to `Completed` with `CompletionDate` (in the ticket PATCH handler).

### Ticket lifecycle
`Pending → Closed` only (there is no in-progress state). Flow:
Admin/planner/PMS creates → push + email to assigned engineer → engineer **accepts**
(`TicketAcceptedAt` stamped; only the assignee can accept; reassignment clears acceptance) →
engineer uploads service report → closes with remarks → admins get a "ticket closed" push.

**Service report gate:** `serviceReportRequiredForServiceType()` in `src/lib/constants.ts` — a report
attachment is required to close **except** for `General Visit` and `Breakdown (On-call Addressed)`.
Enforced in three places: `TicketForm`, `TicketClosePanel`, and both ticket API handlers.

### Planner (`src/lib/planner-tickets.ts`, `src/components/planner-calendar.tsx` — 627 lines)
- Creating a plan **immediately creates its ticket**, but with `ResponseType = "Planner scheduled for 9 AM NPT"`.
- `activateDuePlannerTickets()` flips it to `"Planner activated"` and fires the push once the visit
  date has arrived and it's past 09:00 NPT. This is invoked **lazily** from the `/tickets` page,
  `/planner` page, and `GET /api/notifications` (throttled to once per 15 min per instance) —
  **not** by a cron.
- `customer_visit_rules` occurrences are rendered **virtually** in the calendar (`addRuleOccurrences`),
  deduped against real plans; they are never persisted as rows.

### Service center (newest feature — see §9)
`Machine → "Return to Service Center"` (admin) creates a `service_center_movements` row and sets the
installation `Status = "In Service Center"`. Engineers open/close `service_center_tasks` (one open task
per engineer per machine). Admin marks **Repaired**, then **Deploys** to a customer/department, which
rewrites the installation's customer and reassigns pending PMS rows. Uses **server actions**
(`src/lib/service-center-actions.ts`), not API routes — the only feature that does.

### Attendance & daily report
`attendanceReportData()` (`src/lib/attendance.ts`) derives presence from four event sources:
ticket **accepted**, ticket **closed**, **location** check-in, closed **service-center task**, plus
approved **leave**. A day counts as present if any event exists. Engineers see only themselves;
Admin sees everyone.
**Cron `15 14 * * *` UTC = 20:00 NPT** → `/api/reports/daily-email` → PDF via `pdfkit`
(`src/lib/daily-report-pdf.ts`) emailed to `REPORT_EMAIL_TO` via Zoho SMTP.

### Notifications
Two layers, usually fired together via `notifyTarget()`:
1. **In-app** row in `notifications` (bell panel, `NotificationPanel`).
2. **Web push** to `push_subscriptions` matching userId → engineerId → role.
Push failures with status 404/410 auto-delete the dead subscription.
Email (`sendNotification()`) is used separately for ticket assignment when SMTP is configured.

### File uploads
`UploadWidget` → client-side image compression (`browser-image-compression`, max 1 MB / 1800 px) →
`POST /api/upload` → `storageService` → `zohoWorkDriveService`. Files land in a folder path
`Customer / Model / Serial / Date` (strategy `ZOHO_WORKDRIVE_FOLDER_STRATEGY`, alt `"date"`), named
`YYYY-MM-DD - Ticket Title.ext`, and a long-lived public download link is created. Only the **URL**
is stored in Turso (`AttachmentURLs` is a comma-separated string).

---

## 8. Environment variables (`.env.local`, mirrored in Vercel)

```
TURSO_DATABASE_URL, TURSO_AUTH_TOKEN            # required at import time — client.ts throws if missing
AUTH_SECRET, AUTH_URL                           # NextAuth
CRON_SECRET                                     # Bearer or x-cron-secret header, timing-safe compared
ZOHO_CLIENT_ID / _SECRET / _REFRESH_TOKEN
ZOHO_DATA_CENTER                                # com | eu | in | au
ZOHO_WORKDRIVE_ROOT_FOLDER_ID
ZOHO_WORKDRIVE_FOLDER_STRATEGY                  # customer-machine (default) | date
ZOHO_WORKDRIVE_LINK_EXPIRY_DAYS                 # default 3650
ZOHO_SMTP_HOST/_PORT/_SECURE/_USER/_PASSWORD    # daily report email
REPORT_EMAIL_FROM, REPORT_EMAIL_TO              # comma-separated recipients
SMTP_HOST/_PORT/_SECURE/_USER/_PASSWORD/_FROM   # generic notification email
WEB_PUSH_VAPID_PUBLIC_KEY/_PRIVATE_KEY/_SUBJECT
STORAGE_PROVIDER
```

Missing config degrades gracefully almost everywhere (push/email/upload all check `isConfigured()`
first) — **except Turso**, which throws on module load.

---

## 9. Current working-tree state (uncommitted as of 2026-08-07)

The **Service Center feature is built but NOT committed**, so it is very likely **not yet in production**:

- Untracked: `src/app/(app)/service-center/`, `src/lib/service-center.ts`, `src/lib/service-center-actions.ts`
- Untracked: `public/Serviol - Favicon.png`, `Serviol - Logo.png`, `Serviol - Logo White.png`
  (suggests a possible **"Serviol" rebrand** in flight — not referenced by any code yet)
- Modified: `schema.sql` (+35: the two `service_center_*` tables + indexes), `service.ts` (+144),
  `types/service.ts` (+38), `turso-migrate.mjs` (+5 indexes), `attendance.ts` (+21: service-center
  events), `data.ts`, `nav-items.ts` (+Service Center link), `machines/[machineId]/page.tsx`
  (+Return-to-Service-Center button), `notifications/route.ts`, `attendance-report.tsx`, `planner-calendar.tsx`

**Before touching anything, confirm with the user whether prod already has these tables.**
`npm run db:migrate` must be run against prod Turso before deploying this code.

---

## 10. Conventions to follow

- **No semicolonless / no default exports for components** — named exports, arrow-free `function` declarations.
- Server Components by default; `"use client"` only where interactivity is needed.
- Data fetching in pages: `Promise.all([...])` of `dataService.*` calls, then in-memory `Map` joins.
- Mutations from the client: `fetch()` to an API route → `toast` from sonner → `router.refresh()`.
  (Service Center is the exception: server actions + `revalidatePath`.)
- IDs: `compactId(prefix)` → `PRE-YYYYMMDD-XXXX`; use `uniqueCompactId(prefix, existingIds)` when
  collision matters. Prefixes in use: `TKT, LOG, INS, CON, PMS, CUS, MDL, ENG, USR, LOC, NTF, LVR, PLN, RUL, PSH, SCM, SCT`.
- Dates for display: `formatDate` / `formatDateTime` from `src/lib/utils.ts` (always NPT).
- Dates for logic: string comparison on `YYYY-MM-DD`, never `Date` math across timezones.
- Free-text inputs are `.slice()`-capped (usually 1000 chars, titles 160, remarks 500).
- Pages that must not be statically cached declare `export const dynamic = "force-dynamic"`.

---

## 11. Known issues / risks (do not fix without asking)

1. **Plaintext passwords** in `users.PasswordHash` (§5). Highest-severity item.
2. **`GET /api/pms` has no auth check** — leaks the full PMS schedule to anyone.
3. `readCache` is per-serverless-instance; any write flushes the whole cache. On Vercel, different
   instances can serve stale reads for up to 30 s.
4. Planner activation depends on someone loading `/tickets`, `/planner`, or the notification poll —
   a quiet day means late activation. There is no cron for it.
5. PMS generation is capped at **100 rows** per call; long warranties/contracts silently truncate.
6. `installationToMachine()` runs over **all** installations on every `machines()` call — O(n·m) with
   `contracts` and `device_models`. Fine at current scale, will not stay fine.
7. Leaflet is loaded from **unpkg CDN** at runtime — a CDN outage breaks the map.
8. `previousrecords` has no primary key; `idColumns` claims `ticket_id`, so update/delete by ID is unsafe there.
9. Duplicated ticket fields (`Date`/`TicketDate`, `Description`/`ProblemDescription`,
   `MachineID`/`InstallationID`) must be kept in sync — `normalizeTicket()` only fixes reads.
10. `src/lib/mock-data.ts` is dead code (418 lines).
11. `README.md` is one line. `google-apps-script/` is empty (legacy from a Sheets-based predecessor).

---

## 12. Fast orientation index

| I need to… | Go to |
|---|---|
| Change what's stored | `src/lib/turso/schema.sql` + `src/types/service.ts` + `columns` in `src/lib/turso/service.ts` (all three) |
| Change a DB query | `src/lib/turso/service.ts` |
| Change ticket/customer joins or dashboard metrics | `src/lib/data.ts` |
| Change warranty/contract logic | `src/lib/coverage.ts` |
| Change PMS auto-tickets | `src/lib/pms-tickets.ts` |
| Change planner behavior | `src/lib/planner-tickets.ts` + `src/components/planner-calendar.tsx` |
| Change attendance/report | `src/lib/attendance.ts`, `src/lib/daily-report-pdf.ts`, `src/lib/daily-report-email.ts` |
| Change notifications/push | `src/lib/notifications.ts`, `src/lib/push-notifications.ts` |
| Change file storage | `src/lib/storage/service.ts` → `src/lib/zoho/workdrive.ts` |
| Change access rules | `src/lib/permissions.ts` + `middleware.ts` + the individual API route |
| Change nav/shell | `src/components/nav-items.ts`, `src/components/app-shell.tsx` |
| Run a schema migration | `npm run db:migrate` (idempotent: `CREATE TABLE IF NOT EXISTS` + `PRAGMA table_info` guarded `ALTER TABLE`) |
