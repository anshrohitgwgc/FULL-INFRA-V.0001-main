-- ==============================================================================
-- GreenWave Ops (V2) - Migration 009: Audit events
--
-- Append-only history: every sign-in, ticket, photo, invoice, clock-in and
-- staff change, with who and when (frontend README, "History" section).
-- UUID primary key (native gen_random_uuid(), PostgreSQL 16 core — no
-- extension needed) since these are an event log, not a foreign-keyed
-- business entity. Application code must never write password/token values
-- into `detail`.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS audit_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "actorId" INTEGER REFERENCES "user"(id) ON DELETE SET NULL,
    "actorName" VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    "entityType" VARCHAR(50) NOT NULL,
    "entityId" VARCHAR(100),
    "warehouseId" INTEGER REFERENCES warehouse(id) ON DELETE SET NULL,
    detail JSONB,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_event_actor ON audit_event ("actorId");
CREATE INDEX IF NOT EXISTS idx_audit_event_entity ON audit_event ("entityType", "entityId");
CREATE INDEX IF NOT EXISTS idx_audit_event_warehouse ON audit_event ("warehouseId");
CREATE INDEX IF NOT EXISTS idx_audit_event_created_at ON audit_event ("createdAt");
