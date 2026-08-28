-- ==============================================================================
-- GreenWave Ops (V2) - Migration 008: Timesheets
--
-- "Only one active shift" is enforced here, at the database, not in
-- application code: a partial unique index on (staffId) WHERE "endAt" IS
-- NULL means two concurrent clock-ins for the same person can't both
-- succeed — the loser gets a unique-violation the API turns into 409.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS shift (
    id SERIAL PRIMARY KEY,
    "staffId" INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    "warehouseId" INTEGER REFERENCES warehouse(id) ON DELETE SET NULL,
    "startAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endAt" TIMESTAMP WITH TIME ZONE,
    note TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_shift_one_active_per_staff
    ON shift ("staffId")
    WHERE "endAt" IS NULL;

CREATE INDEX IF NOT EXISTS idx_shift_staff_id ON shift ("staffId");
CREATE INDEX IF NOT EXISTS idx_shift_warehouse_id ON shift ("warehouseId");
