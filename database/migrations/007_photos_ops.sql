-- ==============================================================================
-- GreenWave Ops (V2) - Migration 007: Photos — extend for Ops uploads
--
-- The `photo` table already exists (migration 003) for pickup-attached
-- photos. Ops photos (weigh-in/stock photos, not tied to a pickup) reuse the
-- same table: "pickupId" stays NULL for these, and a warehouse relationship
-- plus a free-text caption are added.
-- ==============================================================================

ALTER TABLE photo
    ALTER COLUMN "pickupId" DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS "warehouseId" INTEGER REFERENCES warehouse(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS entity VARCHAR(20) CHECK (entity IN ('recycling', 'healthcare')),
    ADD COLUMN IF NOT EXISTS caption TEXT;

CREATE INDEX IF NOT EXISTS idx_photo_warehouse_id ON photo ("warehouseId");
CREATE INDEX IF NOT EXISTS idx_photo_uploaded_by ON photo ("uploadedBy");
