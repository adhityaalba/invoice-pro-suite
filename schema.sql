-- Invoice Pro Suite - Database Schema for Vercel Postgres (Neon)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255),
    address TEXT,
    instagram VARCHAR(100),
    notes TEXT,
    total_services INTEGER DEFAULT 0,
    total_purchases INTEGER DEFAULT 0,
    last_visit TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster phone lookups
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- ============================================
-- CIRCLE PAIR INVOICES (Service)
-- ============================================
CREATE TABLE IF NOT EXISTS circle_pair_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    number VARCHAR(100) UNIQUE NOT NULL,
    customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    customer_email VARCHAR(255),
    customer_address TEXT,
    customer_pin VARCHAR(20),
    customer_notes TEXT,

    -- Device info
    device_type VARCHAR(100),
    device_storage VARCHAR(50),
    device_color VARCHAR(50),
    device_imei VARCHAR(100),
    device_complaint TEXT,
    device_diagnosis TEXT,
    device_warranty_status VARCHAR(100),

    -- Invoice details
    date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, paid, unpaid, partial
    document_type VARCHAR(20) NOT NULL DEFAULT 'service_order', -- invoice, service_order

    -- Amounts (stored for easier queries)
    subtotal INTEGER DEFAULT 0,
    discount_total INTEGER DEFAULT 0,
    tax_total INTEGER DEFAULT 0,
    grand_total INTEGER DEFAULT 0,
    down_payment INTEGER DEFAULT 0,
    remaining_amount INTEGER DEFAULT 0,

    -- Additional fields
    notes TEXT,
    terms_warranty TEXT,
    terms_general TEXT,

    -- Template settings (JSON)
    template_settings JSONB,

    -- Company info (denormalized for invoices)
    company_name VARCHAR(100),
    company_email VARCHAR(255),
    company_phone VARCHAR(50),
    company_address TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_circle_pair_number ON circle_pair_invoices(number);
CREATE INDEX IF NOT EXISTS idx_circle_pair_customer ON circle_pair_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_circle_pair_phone ON circle_pair_invoices(customer_phone);
CREATE INDEX IF NOT EXISTS idx_circle_pair_date ON circle_pair_invoices(date);
CREATE INDEX IF NOT EXISTS idx_circle_pair_status ON circle_pair_invoices(status);

-- ============================================
-- CIRCLE PAIR INVOICE ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS circle_pair_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES circle_pair_invoices(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    qty INTEGER NOT NULL DEFAULT 1,
    unit_price INTEGER NOT NULL DEFAULT 0,
    discount INTEGER DEFAULT 0,
    tax_percent INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_circle_pair_items_invoice ON circle_pair_items(invoice_id);

-- ============================================
-- CIRCLE PAIR SIGNATURES
-- ============================================
CREATE TABLE IF NOT EXISTS circle_pair_signatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES circle_pair_invoices(id) ON DELETE CASCADE,
    customer_signature TEXT,
    company_signature TEXT,
    customer_in_date DATE,
    customer_out_date DATE,
    company_in_date DATE,
    company_out_date DATE
);

CREATE INDEX IF NOT EXISTS idx_circle_pair_sigs_invoice ON circle_pair_signatures(invoice_id);

-- ============================================
-- CIRCLE PHONE INVOICES (Sales)
-- ============================================
CREATE TABLE IF NOT EXISTS circle_phone_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    number VARCHAR(100) UNIQUE NOT NULL,
    customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    customer_email VARCHAR(255),
    customer_address TEXT,
    customer_instagram VARCHAR(100),

    date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, reserved, partial, paid, delivered

    -- Payment info
    subtotal INTEGER DEFAULT 0,
    down_payment INTEGER DEFAULT 0,
    trade_in_value INTEGER DEFAULT 0,
    remaining_amount INTEGER DEFAULT 0,
    payment_method VARCHAR(50),
    payment_notes TEXT,

    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_circle_phone_number ON circle_phone_invoices(number);
CREATE INDEX IF NOT EXISTS idx_circle_phone_customer ON circle_phone_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_circle_phone_phone ON circle_phone_invoices(customer_phone);
CREATE INDEX IF NOT EXISTS idx_circle_phone_date ON circle_phone_invoices(date);
CREATE INDEX IF NOT EXISTS idx_circle_phone_status ON circle_phone_invoices(status);

-- ============================================
-- CIRCLE PHONE ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS circle_phone_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES circle_phone_invoices(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL, -- device, accessory
    name VARCHAR(255) NOT NULL,
    description TEXT,
    qty INTEGER NOT NULL DEFAULT 1,
    unit_price INTEGER NOT NULL DEFAULT 0,
    discount INTEGER DEFAULT 0,

    -- Device-specific fields
    imei VARCHAR(100),
    storage VARCHAR(50),
    color VARCHAR(50),
    condition VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_circle_phone_items_invoice ON circle_phone_items(invoice_id);

-- ============================================
-- CIRCLE PHONE TRADE-INS
-- ============================================
CREATE TABLE IF NOT EXISTS circle_phone_trade_ins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES circle_phone_invoices(id) ON DELETE CASCADE,
    model VARCHAR(100),
    storage VARCHAR(50),
    color VARCHAR(50),
    imei VARCHAR(100),
    condition VARCHAR(50),
    estimated_price INTEGER DEFAULT 0,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_circle_phone_tradein_invoice ON circle_phone_trade_ins(invoice_id);

-- ============================================
-- SERVICE HISTORY (Unified tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS service_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL,
    invoice_number VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL, -- service, sales
    date DATE NOT NULL,
    device_model VARCHAR(100),
    amount INTEGER NOT NULL,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_service_history_user ON service_history(user_id);
CREATE INDEX IF NOT EXISTS idx_service_history_type ON service_history(type);

-- ============================================
-- FUNCTIONS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_circle_pair_updated_at ON circle_pair_invoices;
CREATE TRIGGER update_circle_pair_updated_at BEFORE UPDATE ON circle_pair_invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_circle_phone_updated_at ON circle_phone_invoices;
CREATE TRIGGER update_circle_phone_updated_at BEFORE UPDATE ON circle_phone_invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMPANY PROFILES TABLE (Optional - for multiple company profiles)
-- ============================================
CREATE TABLE IF NOT EXISTS company_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    tagline VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    brand_color VARCHAR(20), -- hex color
    logo_url TEXT,
    qr_code_url TEXT,
    payment_methods TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS update_company_profiles_updated_at ON company_profiles;
CREATE TRIGGER update_company_profiles_updated_at BEFORE UPDATE ON company_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
