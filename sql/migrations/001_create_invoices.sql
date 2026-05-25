-- Migration: create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  status TEXT,
  document_type TEXT,
  customer JSONB,
  device JSONB,
  items JSONB,
  payment JSONB,
  signatures JSONB,
  notes TEXT,
  terms JSONB,
  template_settings JSONB,
  company JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
