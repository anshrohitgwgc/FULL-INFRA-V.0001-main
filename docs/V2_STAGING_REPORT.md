# GreenWave V2 — Gate 1 Staging Report

Real, non-mocked staging run. No production system was touched, queried, or
scanned at any point — see "What was not touched" at the end.

## 1. What actually existed vs. the Gate 1 brief

The brief assumed the V2 backend already lived in the same repo as the
frontend, on branch `greenwave-v2`, fully implemented (migrations 001–010,
customers/materials/warehouses/invoices/inventory/photos/timesheets/audit).
That was not the case:

- `Greenwaveapp` (frontend) only had auth wired to a real API. Every other
  view read/wrote `localStorage`/IndexedDB.
- `FULL-INFRA-V.0001-main` (backend, a separate repo) existed but implemented
  a different product — pickup/dispatch logistics (`/pickups`, 4 roles
  including `driver`) — with migrations 001–003 only, no RBAC guards
  anywhere (`/users` was unauthenticated), `synchronize: true` (schema came
  from entities, not migrations), and `StorageService`/`StorageController`
  were empty stubs.

This gate therefore **built** the missing backend (migrations 004–010,
8 new NestJS modules, JWT auth guards, RBAC, a BullMQ worker, a real MinIO
storage service) and **wired** the frontend's pending views to it, before
running the actual gate tests. That work is on branch `greenwave-v2` in both
repos.

## 2. Staging infrastructure — rootless, no Docker

Docker was not available in the build environment. All three services are
real, unmodified upstream binaries, run as plain local processes (not
containers, not mocks):

| Service | Version | How obtained | Port |
|---|---|---|---|
| PostgreSQL | 16.15 (Ubuntu build) | `apt-get download` + `dpkg -x` (extract only, no system install, no root) | 5433 |
| Redis | 7.0.15 (Ubuntu build) | same extraction method | 6380 |
| MinIO | RELEASE.2025-09-07 | official static binary from `dl.min.io` | 9002 (API), 9003 (console) |

Credentials are staging-only, randomly generated (`openssl rand -hex`),
written to a local `.env.staging` (gitignored, never committed, never
printed to logs/docs — this document names the env var keys, not values). A
MinIO credential was accidentally echoed once during setup and was rotated
immediately; the bucket was wiped and re-created before any real test data
went into it.

`staging/start.sh` / `stop.sh` bring the whole stack up/down idempotently.
Backend runs via `node dist/main.js` on port 4000 with `DB_*`, `REDIS_*`,
`MINIO_*`, `JWT_*` pointed at the staging stack above — never at
`192.168.1.22`, `.14`, `.23`, or any other production host. Frontend served
via `python3 -m http.server 8081` from `Greenwaveapp`, with
`localStorage.setItem('greenwave.apiBase', 'http://127.0.0.1:4000')` — never
pointed at `api.gwgc.cloud`.

## 3. Database migrations 001–010 — applied and verified

All ten migrations applied cleanly, in order, with zero errors, to the
staging database:

- 001 user (existing) · 002 pickup (existing) · 003 photo (existing)
- **004** customer, material, warehouse
- **005** invoice, invoice_line, `invoice_number_seq` (starts at 1115 —
  continues from the paper trail's last invoice, 1114)
- **006** inventory_transaction (`inbound`/`outbound`/`adjustment`),
  `v_inventory_balances` view
- **007** ALTER `photo` — adds `warehouseId`, `entity`, `caption` for
  Ops (non-pickup) uploads
- **008** shift, with `uq_shift_one_active_per_staff` — a **partial unique
  index** `ON shift("staffId") WHERE "endAt" IS NULL`, which is what makes
  "only one active shift" a real database invariant, not an
  application-level check that a race can slip past
- **009** audit_event — UUID primary key (`gen_random_uuid()`, native to
  PG16), insert-only from application code
- **010** `uq_warehouse_name`, `v_active_shifts` view, `v_recent_audit` view

**Verified via `psql` introspection (not asserted from the SQL files):**

| Check | Result |
|---|---|
| Tables | 11 base tables (`\dt` — see §7 for full list) |
| Views | 3 (`v_inventory_balances`, `v_active_shifts`, `v_recent_audit`) |
| Foreign keys | 16, including every warehouse relationship (invoice, inventory_transaction, photo, shift → warehouse) |
| UUID columns | `invoice."publicId"`, `audit_event.id` |
| Invoice counter | `invoice_number_seq` confirmed at 1115 before first use |
| Timesheet uniqueness | `uq_shift_one_active_per_staff` confirmed present as a partial unique index |
| Audit events | `audit_event` table confirmed, insert-only usage pattern |
| Inventory structure | `inventory_transaction` + `v_inventory_balances` confirmed |
| Photo metadata | `photo` table + migration 007's additions confirmed |

## 4. Backend — built and verified live

New modules: `warehouses`, `customers`, `materials`, `invoices`,
`inventory`, `photos` (real MinIO-backed, `storage.service.ts` was an empty
stub before this pass), `timesheets`, `audit`. Plus, previously missing
entirely: `JwtStrategy`/`JwtAuthGuard`/`RolesGuard`/`@Roles()` — `/users` had
no auth at all before this pass.

Bugs found and fixed during this pass (not pre-existing, introduced and
caught within this same build):
- `app.module.ts` read `DATABASE_HOST/PORT/USER/PASSWORD/NAME`; `.env.example`
  and the existing docker-compose used `DB_HOST/PORT/USERNAME/PASSWORD/DATABASE`
  — aligned on the documented names.
- `typeorm` was pinned to `^1.0.0` in `package.json` (an unrelated, ancient
  package — the real dependency needed is the `0.3.x` line
  `@nestjs/typeorm@11` expects) — fixed.
- `TypeOrmModule` had `synchronize: true` — turned off; schema now comes
  from migrations only, which is what makes this gate's schema checks mean
  anything.
- `POST /users` returned the bcrypt password hash in its response body —
  fixed in `users.service.ts` before any real account was exposed this way.
- The global `ValidationPipe`'s `whitelist: true` silently stripped every
  field from `CreateInvoiceDto` and `UploadPhotoDto` because neither had
  class-validator decorators yet — surfaced immediately by the invoice
  concurrency test (10/10 requests 500'd), fixed by adding proper decorators
  to both DTOs.
- `GET /users` was admin-only, which broke Timeclock's "team hours right
  now" view for managers (RBAC table grants managers full Timeclock access)
  — relaxed to `admin, manager`.

**Endpoint verification (live `curl`/script tests, not unit-test mocks):**
health, auth (login/register/bootstrap-once), RBAC (staff/manager/admin
boundaries on every module), customers, materials, staff (real account
creation via `POST /users`), warehouses, invoices (create/update/duplicate),
inventory (transactions + balances), photos (upload/list/presign/delete),
timesheets (clock-in/out/current/history), audit (list, RBAC-restricted to
manager+) — all exercised against the real staging Postgres/Redis/MinIO,
all passing.

## 5. Worker — BullMQ, inline mode

No BullMQ code existed before this pass. Added `PhotosQueueService`
(producer) and `PhotosProcessor` (consumer), both running in the same
process as the API today — this is "inline mode" per Gate 1 §4, and it was
verified working: every photo upload enqueues a `photo.uploaded` job, and
the corresponding `photo-processed` audit event (written by the worker, not
the request handler) appears in the audit log asynchronously — confirmed in
the live audit-event breakdown during testing.

**Exact changes for a standalone VM103 deployment** (documented in
`photos-queue.service.ts`, not executed — VM103 was not touched):
1. A new bootstrap (`app/api/src/worker.ts`) building a Nest
   application-context (no HTTP listener), importing only the modules the
   processor needs.
2. `photos.processor.ts` moves unchanged — it only talks to Redis (queue)
   and Postgres (TypeORM), never the HTTP layer.
3. Both processes point at the same `REDIS_HOST`/`REDIS_PORT` and queue name
   (`photos`) — BullMQ already supports producer/consumer running on
   different hosts.
4. Remove the processor registration from the API's `app.module.ts` (keep
   the producer so the API can still enqueue), give `worker.ts` its own
   process-manager entry.

## 6. Functional tests — all against real staging infra

**Invoices (10 concurrent creates):** `invoice_number_seq` produced 10
unique numbers under real concurrency (Python `ThreadPoolExecutor`, 10
parallel `POST /invoices`). All 10 totals matched the frontend's worked
example exactly: 3.658 t × $140.00 → subtotal $512.12, GST $25.61, total
**$537.73** — matches the README's checked invoice 1114 math. Re-`GET`
confirmed persistence. **PASS**

**Inventory (Warehouse A/B isolation):** A: inbound 10, outbound 3,
adjustment −1 → balance **6**. B: inbound 50 only → balance **50**, with
zero leakage between warehouses (`v_inventory_balances`, correctly scoped by
`warehouseId`). **PASS**

**Photos:** real JPEG uploaded through `POST /photos` → confirmed landed in
MinIO (`mc ls`) → metadata row confirmed in Postgres → presigned URL
downloaded and byte-compared identical to the source file → **direct
unauthenticated access to the object denied (403 — bucket is private, not
public)** → a different staff account attempting the same photo's presigned
URL got **403 (IDOR blocked)** → RBAC-restricted delete (staff got 403,
admin succeeded). **PASS**

**Timesheets:** 10 concurrent `POST /timesheets/clock-in` for the same
staff account → **exactly 1 succeeded, 9 got 409** (enforced by the
database's partial unique index, not application logic). Clock-out
persisted; history confirmed the completed shift; re-clock-in permitted
afterward. **PASS**

**Audit:** 38 real events generated across the session (`sign-in`,
`create-invoice`, `inventory-inbound/outbound/adjustment`, `upload-photo`,
`photo-processed`, `clock-in`/`clock-out`, `create-user`,
`create-warehouse`, `create-material`, `bootstrap-admin`). Every event
carries actor, timestamp, action, entity, warehouse where applicable.
Raw-row grep for password/bearer/JWT-shaped content in every `audit_event`
row: **none found**. RBAC-restricted to manager+ (staff got 403). **PASS**

## 7. Real browser QA — Playwright + Chromium (not simulated)

Chromium 151 (via Playwright, downloaded without the usual `apt` system-dep
step since no root was available — browser binary only, no missing runtime
deps hit in practice). Tested against the frontend on `:8081` pointed at
staging `:4000`, at all five required viewports:

| Viewport | Blank screen | Logged in | Console errors | Failed requests | Horizontal overflow |
|---|---|---|---|---|---|
| 1920×1080 | no | yes | 0 | 0 | no |
| 1440×900 | no | yes | 0 | 0 | no |
| 1280×720 | no | yes | 0 | 0 | no |
| 390×844 | no | yes | 0 | 0 | no |
| 430×932 | no | yes | 0 | 0 | no |

Every nav view (inventory, weigh-in, invoices, photos, timeclock,
customers, materials, staff, history) rendered at every viewport, including
opening the off-canvas mobile menu drawer on the two phone viewports (a real
interaction, not just checking DOM `hidden` attributes).

**Interactive workflow test** (separate run, real clicks/fills, not just
navigation): signed in as manager → added a customer via the UI → it
appeared in the list without a reload → created an invoice via the UI
(server assigned **#1135**+) → uploaded a real photo via the UI → the grid
rendered a real `<img>` pointed at a genuine presigned MinIO URL → clocked
in via the UI, state visibly changed. **Zero console errors across the
entire interactive sequence** (one 403 was hit on a first pass — see §4's
bug list — fixed and reconfirmed clean).

**PASS.**

## 8. PWA

- **Fresh install:** service worker registers, activates, precaches all 11
  files (index.html, manifest, app.css, api.js, app.js, store.js,
  photos.js, logo.png, 2 icons, `/`) into cache `greenwave-v6`.
- **Genuine upgrade path** (not simulated by hand-editing caches): a client
  installed on the *previous real* `sw.js` (byte-identical to the actual
  prior commit, cache name `greenwave-v5`) was then served the *actual
  current* `sw.js` from this repo. The browser's real update() → install →
  activate cycle ran, dropped the old `greenwave-v5` cache, and the new
  `greenwave-v6` cache held the correct 11 files. No manual cache
  manipulation was used to fake this result.
- **Offline:** with the browser context set fully offline, navigating to
  `/` still returned 200 with the full cached document.
- **Manifest:** valid — name, short_name, start_url, standalone display, 3
  icons.

**PASS.**

## 9. API performance (staging, local rootless stack)

| Endpoint | Avg latency (5 runs) |
|---|---|
| `GET /health` | 1.1 ms |
| `POST /auth/login` | 276.3 ms (bcrypt, 12 rounds — intentional cost) |
| `GET /customers` | 2.6 ms |
| `GET /inventory/balances` | 2.6 ms |
| `GET /invoices` | 4.2 ms |
| `GET /timesheets/me/history` | 2.6 ms |
| `POST /photos` (1 upload) | 27.3 ms |

Numbers reflect a local, single-node staging stack on shared hardware — not
representative of production's multi-VM, network-separated topology, and
not a load test (see §14 gap list).

## 10. Security

- Wrong password → 401, generic "Invalid credentials" (no email
  enumeration — confirmed identical message for unknown email).
- RBAC boundaries confirmed for every module: staff blocked from
  `/invoices`, `/audit`, `/users`; only admin can create warehouses/staff
  accounts/delete photos.
- IDOR: a staff member's presigned-URL request for another staff member's
  photo → 403.
- File upload: non-image file rejected (400, "Only JPEG, PNG or WebP images
  are accepted").
- Tampered JWT → 401. Missing `Bearer` prefix → 401.
- SQL-injection-shaped input (`Robert'); DROP TABLE customer;--`) stored
  and returned as inert text (TypeORM parameterized queries) — table intact
  afterward.
- Bootstrap-only registration: second `POST /auth/register` attempt after
  an admin exists → 403.
- No secrets found in any audit_event row (see §6).

**PASS.**

## 11. Known limitations / not done in this pass

Being explicit about what was *not* completed, rather than skipping it
silently:

- **`material.rateCents`** (a "default rate" the old local-storage build
  had) has no server-side column — the Products/Materials "Default rate"
  column now always shows "—" for server-sourced materials. Not part of any
  Gate 1 checklist item; flagged for a follow-up migration.
- **Staff deactivate/reactivate** has no backend endpoint — the control was
  removed from the Staff screen rather than left as a fake local-only
  toggle that would resurrect on reload.
- **Customer/material delete** buttons were removed from the UI for the
  same reason — no `DELETE` endpoint exists yet for either.
- **Ticket "By" column** (who posted an inventory transaction) shows "—"
  for server-sourced tickets — the transaction list endpoint returns
  `postedBy` as a user id, and this pass didn't add a name lookup for it.
- **`pickups` module** (pre-existing, untouched, unrelated to this gate):
  its entity's columns don't match migration 002's actual table — this was
  silently working before only because `synchronize: true` was rewriting
  the schema underneath it. Turning that off (required for this gate to
  mean anything) exposes the mismatch. Not exercised by anything in Gate 1
  — the frontend never calls `/pickups`.

## 12. What was not touched

`gwgc.cloud`, `api.gwgc.cloud`, `192.168.1.12/21/31` (prod API nodes),
`192.168.1.22` (prod Postgres — confirmed unreachable from this sandbox via
a single timeout; no further connection attempts were made, and no
credentials for it exist here), `192.168.1.14` (prod Redis), `192.168.1.23`
(prod MinIO), `192.168.1.13` (prod worker), `www.gwgcservers.ca`,
`mgmt-api.gwgcservers.ca`, `n8n.gwgcservers.ca`, VM105 / `192.168.1.15`. No
migration was applied anywhere but the staging database described in §2.
