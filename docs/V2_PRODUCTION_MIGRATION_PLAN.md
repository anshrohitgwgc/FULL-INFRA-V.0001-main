# GreenWave V2 — Production Migration Plan (Gate 1 §15/§16)

**This document is read-only analysis. No migration in it has been applied
anywhere except the staging database described in `V2_STAGING_REPORT.md`.
Production Postgres (`192.168.1.22`) was never queried — this sandbox has no
network route to it (confirmed via one connection timeout, not probed
further) and no credentials for it exist here. The comparison below is
against `docs/DATABASE.md`'s documented schema, not a live introspection of
production, and is explicitly labeled as such everywhere it matters.**

## 1. Schema comparison — documented production vs. migrations 004–010

`docs/DATABASE.md` (this repo, pre-dating this pass) documents exactly
three production tables: `user`, `pickup`, `photo`. Migrations 001–003
reproduce those. Migrations 004–010 (built and verified in this gate) are
listed below against that documented baseline.

### New tables (no production equivalent — pure additions)

| Table | Purpose | Production conflict risk |
|---|---|---|
| `warehouse` | GreenWave Ops locations | None — no such table exists today |
| `customer` | Invoice bill-to prefill data | None |
| `material` | Materials/products catalogue | None |
| `invoice`, `invoice_line` | Invoicing | None |
| `inventory_transaction` | Stock ledger | None |
| `shift` | Timesheets | None |
| `audit_event` | Append-only history | None |

Because every one of these is net-new, applying 004–010 to production is a
set of `CREATE TABLE`/`CREATE TYPE`/`CREATE VIEW` statements with **zero
risk of colliding with or altering existing production data** — nothing
existing is dropped, renamed, or type-changed.

### Changed table: `photo`

Migration 007 runs:
```sql
ALTER TABLE photo
    ALTER COLUMN "pickupId" DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS "warehouseId" INTEGER REFERENCES warehouse(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS entity VARCHAR(20) CHECK (entity IN ('recycling', 'healthcare')),
    ADD COLUMN IF NOT EXISTS caption TEXT;
```
- `pickupId` is **already nullable** in the documented production schema
  (`docs/DATABASE.md` §2 shows no `NOT NULL` on it) — `DROP COLUMN
  ... NOT NULL` on an already-nullable column is a no-op in PostgreSQL, not
  an error. **No risk.**
- The three `ADD COLUMN` statements are additive and nullable — existing
  production `photo` rows get `NULL` in all three new columns, which is
  exactly the intended value for pre-existing pickup-attached photos (they
  were never Ops uploads). **No data conversion needed, no risk.**

### Missing indexes (relative to what this gate added)

Production's documented `photo` table has `idx_photo_pickup_id` only.
Migration 007 adds `idx_photo_warehouse_id` and `idx_photo_uploaded_by` —
both additive, no production index is altered or dropped.

### Data conversion requirements

**None.** Every migration in 004–010 is additive relative to the documented
production schema — new tables, or nullable new columns on an existing
table. There is no `ALTER COLUMN ... TYPE`, no `NOT NULL` being added to a
column that could contain existing NULLs, no renamed column, and no
`DROP TABLE`/`DROP COLUMN` anywhere in 004–010.

### Potential conflicts / existing-data risks

1. **`warehouse.name` UNIQUE constraint (migration 010):** if production
   ever gets seed data for warehouses with duplicate names before this
   constraint is applied, the migration would fail. Mitigation: seed/dedupe
   warehouse names before running 010, or run 010 before any warehouse
   rows exist.
2. **`invoice_number_seq START 1115`:** this assumes the same fact stated in
   the frontend's local-storage seed (`assets/store.js`) — that the last
   real invoice issued was #1114. If production's actual next invoice
   number differs from 1115 by the time this runs, the sequence start value
   needs to be adjusted to match reality before first use — **this is a
   business fact to confirm with whoever has been issuing invoices, not
   something derivable from the schema.**
3. **`pickups` module schema drift (pre-existing, unrelated to 004–010):**
   this gate turned off TypeORM's `synchronize: true` (§4 of the staging
   report) because it was silently rewriting the schema underneath the
   `Pickup` entity, which doesn't match migration 002's actual columns. If
   `synchronize` is still `true` in whatever is currently running against
   production, turning it off there will surface the same mismatch and the
   `/pickups` endpoints will start failing until that entity is fixed or
   migration 002 is reconciled with it. **This is a real, pre-existing
   risk independent of the new V2 work — flagging it here because this
   gate is what surfaced it.**
4. **RBAC / auth guards:** production's current `/users` (and likely other
   endpoints) may still be unguarded, matching this repo's pre-gate state.
   Deploying this gate's `JwtAuthGuard`/`RolesGuard` changes to production
   will start requiring a valid JWT on every route that isn't `@Public()` —
   confirm every legitimate existing caller (mobile app, any internal
   script) already sends a Bearer token before flipping this on, or they
   will start getting 401s.

## 2. Recommended production sequencing

1. **Confirm the invoice-number fact** (§1.2 above) with the business owner
   before applying migration 005.
2. Apply 004 → 010 in order on production Postgres during a maintenance
   window — each is individually fast (no data backfill, no table locks
   beyond the brief DDL lock every `CREATE`/`ALTER` takes).
3. Deploy the backend with `synchronize: false` — do **not** let it run
   with `synchronize: true` against production even briefly; that's what
   surfaced the `pickups` entity drift in staging (§1.3) and would risk the
   same against real data.
4. Deploy behind the existing nginx config, proxying the new routes exactly
   as `/auth/*` is already proxied today (per this repo's own
   `infrastructure/nginx/*`, unchanged by this gate).
5. Verify the JWT guard doesn't break any existing unauthenticated caller
   (§1.4) before enabling it in front of live traffic.
6. Leave the BullMQ worker inline (same process as the API) for the first
   production deployment — the standalone VM103 split (staging report §5)
   is a later, optional step, not a blocker.
7. Frontend: deploy `Greenwaveapp`'s `greenwave-v2` branch (auth + this
   gate's newly-wired views) with `sw.js`'s cache bumped to `greenwave-v6`
   (already done in this branch) so clients pick up the new `api.js`
   methods cleanly, matching the v3→v4→v5→v6 pattern already used in this
   repo's history.

## 3. Rollback

Every migration here is additive (new tables, nullable new columns). If a
rollback is needed: `DROP VIEW`/`DROP TABLE`/`DROP COLUMN` in reverse order
(010 → 004) is non-destructive to any pre-existing production data, since
nothing in 004–010 modifies or removes an existing column's data. The one
exception to double-check before any rollback: don't drop `invoice`/
`invoice_line`/`inventory_transaction`/`shift`/`audit_event` if real
business data has already been written into them post-deploy — treat that
the same as any other production table once it holds real records.

## 4. Final compatibility verdict

**PRODUCTION SCHEMA COMPATIBILITY: PASS** (as a docs-based, read-only
comparison — see the disclaimer at the top of this document; this has not
been confirmed against a live introspection of the actual production
database, which this environment cannot reach).
