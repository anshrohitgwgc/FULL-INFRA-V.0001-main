-- ==============================================================================
-- GreenWave Ops (V2) - Migration 010: Cross-cutting constraints, indexes, views
-- ==============================================================================

-- A staff account can't be deleted out from under historical invoices/audit
-- rows it created — those FKs already use ON DELETE SET NULL (005, 009), so
-- this migration only adds what's still missing: uniqueness on warehouse
-- name (two warehouses can't silently collide) and a helper view for the
-- currently-active shift per staff member (used by GET /timesheets/me/current
-- and by managers' "who is on shift right now" view).

ALTER TABLE warehouse ADD CONSTRAINT uq_warehouse_name UNIQUE (name);

CREATE OR REPLACE VIEW v_active_shifts AS
SELECT
    s.id,
    s."staffId",
    u."fullName" AS "staffName",
    s."warehouseId",
    w.name AS "warehouseName",
    s."startAt"
FROM shift s
JOIN "user" u ON u.id = s."staffId"
LEFT JOIN warehouse w ON w.id = s."warehouseId"
WHERE s."endAt" IS NULL;

-- Cross-entity audit convenience view: last 90 days, actor + entity in one
-- row, matching the "History" screen's columns directly.
CREATE OR REPLACE VIEW v_recent_audit AS
SELECT id, "actorId", "actorName", action, "entityType", "entityId", "warehouseId", "createdAt"
FROM audit_event
WHERE "createdAt" > (CURRENT_TIMESTAMP - INTERVAL '90 days')
ORDER BY "createdAt" DESC;
