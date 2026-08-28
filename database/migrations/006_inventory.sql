-- ==============================================================================
-- GreenWave Ops (V2) - Migration 006: Inventory transactions & balances
--
-- Inventory is derived, not stored: on-hand = signed SUM of posted
-- transactions per warehouse+material, exactly as Greenwaveapp's client-side
-- balances() computes it today. "A mistake is corrected with an opposite
-- ticket" (frontend README) — transactions are append-only; 'adjustment' is
-- an explicit third type for corrections that aren't a literal in/out
-- shipment.
-- ==============================================================================

CREATE TYPE inventory_txn_type AS ENUM ('inbound', 'outbound', 'adjustment');

CREATE TABLE IF NOT EXISTS inventory_transaction (
    id SERIAL PRIMARY KEY,
    entity VARCHAR(20) NOT NULL DEFAULT 'recycling' CHECK (entity IN ('recycling', 'healthcare')),
    "warehouseId" INTEGER NOT NULL REFERENCES warehouse(id) ON DELETE RESTRICT,
    "materialId" INTEGER NOT NULL REFERENCES material(id) ON DELETE RESTRICT,
    type inventory_txn_type NOT NULL,
    qty NUMERIC(14, 3) NOT NULL,
    "qtyBySize" JSONB,
    gross NUMERIC(14, 3),
    tare NUMERIC(14, 3),
    ref VARCHAR(255),
    date DATE NOT NULL,
    "postedBy" INTEGER REFERENCES "user"(id) ON DELETE SET NULL,
    "postedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- inbound/outbound qty is a magnitude (direction comes from `type`);
    -- adjustment qty carries its own sign (a correction can go either way).
    CONSTRAINT chk_inventory_qty_sign CHECK (type = 'adjustment' OR qty >= 0)
);

CREATE INDEX IF NOT EXISTS idx_inventory_txn_warehouse ON inventory_transaction ("warehouseId");
CREATE INDEX IF NOT EXISTS idx_inventory_txn_material ON inventory_transaction ("materialId");
CREATE INDEX IF NOT EXISTS idx_inventory_txn_warehouse_material ON inventory_transaction ("warehouseId", "materialId");

-- Signed on-hand balance per warehouse+material. 'adjustment' rows carry
-- their own sign via qty (positive = increase, negative = decrease) since,
-- unlike inbound/outbound, a correction can go either direction.
CREATE OR REPLACE VIEW v_inventory_balances AS
SELECT
    t."warehouseId",
    t."materialId",
    m.entity,
    m.name AS "materialName",
    m.unit,
    SUM(
        CASE
            WHEN t.type = 'inbound' THEN t.qty
            WHEN t.type = 'outbound' THEN -t.qty
            WHEN t.type = 'adjustment' THEN t.qty
        END
    ) AS balance
FROM inventory_transaction t
JOIN material m ON m.id = t."materialId"
GROUP BY t."warehouseId", t."materialId", m.entity, m.name, m.unit;
