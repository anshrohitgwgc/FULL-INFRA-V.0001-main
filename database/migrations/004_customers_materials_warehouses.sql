-- ==============================================================================
-- GreenWave Ops (V2) - Migration 004: Customers, Materials, Warehouses
-- ==============================================================================

CREATE TABLE IF NOT EXISTS warehouse (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    province VARCHAR(10) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    line1 VARCHAR(255),
    line2 VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- "material" backs the frontend's product/material catalogue. `entity`
-- distinguishes Greenwave Recycling vs Greenwave Healthcare catalogues
-- (see isRecycling()/entity filtering in Greenwaveapp's assets/app.js).
CREATE TABLE IF NOT EXISTS material (
    id SERIAL PRIMARY KEY,
    entity VARCHAR(20) NOT NULL DEFAULT 'recycling' CHECK (entity IN ('recycling', 'healthcare')),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    unit VARCHAR(50) NOT NULL DEFAULT 'tonne',
    capture VARCHAR(20) NOT NULL DEFAULT 'simple' CHECK (capture IN ('simple', 'weighed', 'sized')),
    sizes JSONB,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_material_entity ON material (entity);
CREATE INDEX IF NOT EXISTS idx_customer_name ON customer (name);
