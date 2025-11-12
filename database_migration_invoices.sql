-- Migration script to add missing fields to invoices table
-- Run this in your Supabase SQL editor

-- Add missing columns to invoices table
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'tax_invoice', -- tax_invoice, receipt_only, tax_invoice_receipt, general
ADD COLUMN IF NOT EXISTS invoice_direction TEXT DEFAULT 'positive', -- positive, negative
ADD COLUMN IF NOT EXISTS invoice_date DATE DEFAULT CURRENT_DATE, -- Date of invoice (separate from due_date)
ADD COLUMN IF NOT EXISTS customer_name TEXT, -- Customer name (denormalized for easier queries)
ADD COLUMN IF NOT EXISTS customer_phone TEXT, -- Customer phone
ADD COLUMN IF NOT EXISTS service_name TEXT, -- Service name (from services table)
ADD COLUMN IF NOT EXISTS service_description TEXT, -- Service description
ADD COLUMN IF NOT EXISTS tax_amount NUMERIC DEFAULT 0, -- Tax amount (18% VAT)
ADD COLUMN IF NOT EXISTS subtotal_amount NUMERIC DEFAULT 0, -- Amount before tax
ADD COLUMN IF NOT EXISTS notes TEXT, -- Free text/notes field
ADD COLUMN IF NOT EXISTS commission NUMERIC, -- Commission amount
ADD COLUMN IF NOT EXISTS bill_description TEXT, -- Description for general bills
ADD COLUMN IF NOT EXISTS tranzila_document_id TEXT, -- Tranzila document ID
ADD COLUMN IF NOT EXISTS tranzila_document_number TEXT, -- Tranzila document number
ADD COLUMN IF NOT EXISTS tranzila_retrieval_key TEXT, -- Tranzila retrieval key
ADD COLUMN IF NOT EXISTS tranzila_created_at TIMESTAMP WITH TIME ZONE; -- Tranzila document creation date

-- Update existing records to have default values
UPDATE invoices
SET 
    invoice_type = 'tax_invoice',
    invoice_direction = 'positive',
    invoice_date = COALESCE(due_date, created_at::date),
    subtotal_amount = COALESCE(total_amount, 0),
    tax_amount = ROUND(COALESCE(total_amount, 0) * 0.18 / 1.18, 2)
WHERE invoice_type IS NULL;

-- Create index on invoice_type for faster queries
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_type ON invoices(invoice_type);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_name ON invoices(customer_name);

-- Add comment to document the invoice_type values
COMMENT ON COLUMN invoices.invoice_type IS 'Type of invoice: tax_invoice, receipt_only, tax_invoice_receipt, general';
COMMENT ON COLUMN invoices.invoice_direction IS 'Direction: positive (income) or negative (expense/refund)';
COMMENT ON COLUMN invoices.invoice_date IS 'Date when invoice was issued (may differ from due_date)';
COMMENT ON COLUMN invoices.subtotal_amount IS 'Amount before tax';
COMMENT ON COLUMN invoices.tax_amount IS 'Tax amount (18% VAT in Israel)';
COMMENT ON COLUMN invoices.total_amount IS 'Total amount including tax (subtotal_amount + tax_amount)';

-- Note: Payment details are stored in the separate 'payments' table
-- This keeps the invoices table clean and allows multiple payments per invoice

