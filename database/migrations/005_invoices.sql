-- ==============================================================================
-- GreenWave Ops (V2) - Migration 005: Invoices
--
-- Numbering: the paper trail continues from invoice 1114 (last issued under
-- the pre-V2 local-storage app), so the shared counter starts at 1115. A
-- SEQUENCE makes concurrent invoice creation safe: PostgreSQL guarantees
-- nextval() never returns the same value twice, even under concurrent
-- transactions, without taking a table lock.
-- ==============================================================================

CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1115 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS invoice (
    id SERIAL PRIMARY KEY,
    -- Stable external/idempotency reference, independent of the human-facing
    -- sequential number (which stays a free-editable text field, matching
    -- "every field is a text box" in the frontend).
    "publicId" UUID NOT NULL DEFAULT gen_random_uuid(),
    number VARCHAR(50) NOT NULL,
    "warehouseId" INTEGER REFERENCES warehouse(id) ON DELETE SET NULL,
    "customerId" INTEGER REFERENCES customer(id) ON DELETE SET NULL,
    "billTo" TEXT NOT NULL,
    "shipTo" TEXT,
    "shipVia" VARCHAR(255),
    "shipDate" DATE,
    date DATE NOT NULL,
    "termsDays" INTEGER NOT NULL DEFAULT 15,
    "taxLabel" VARCHAR(100),
    "taxRate" NUMERIC(6, 4) NOT NULL DEFAULT 0,
    "payNote" TEXT,
    company JSONB NOT NULL,
    "subtotalCents" BIGINT NOT NULL DEFAULT 0,
    "taxCents" BIGINT NOT NULL DEFAULT 0,
    "totalCents" BIGINT NOT NULL DEFAULT 0,
    "createdBy" INTEGER REFERENCES "user"(id) ON DELETE SET NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_invoice_number UNIQUE (number),
    CONSTRAINT uq_invoice_public_id UNIQUE ("publicId")
);

CREATE TABLE IF NOT EXISTS invoice_line (
    id SERIAL PRIMARY KEY,
    "invoiceId" INTEGER NOT NULL REFERENCES invoice(id) ON DELETE CASCADE,
    "lineIndex" INTEGER NOT NULL,
    date DATE,
    service VARCHAR(255),
    unit VARCHAR(50),
    description TEXT,
    qty NUMERIC(14, 3) NOT NULL DEFAULT 0,
    "rateCents" BIGINT NOT NULL DEFAULT 0,
    rebate BOOLEAN NOT NULL DEFAULT FALSE,
    "amountCents" BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_invoice_warehouse ON invoice ("warehouseId");
CREATE INDEX IF NOT EXISTS idx_invoice_customer ON invoice ("customerId");
CREATE INDEX IF NOT EXISTS idx_invoice_date ON invoice (date);
CREATE INDEX IF NOT EXISTS idx_invoice_line_invoice_id ON invoice_line ("invoiceId");
