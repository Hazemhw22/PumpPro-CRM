-- Add balance column to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS balance DECIMAL(10, 2) DEFAULT 0.00 NOT NULL;

-- Update existing customers to have 0 balance
UPDATE customers
SET balance = 0.00
WHERE balance IS NULL;

-- Add comment to the column
COMMENT ON COLUMN customers.balance IS 'Customer account balance - increases with invoices, decreases with payments';

-- Create index on balance for better query performance
CREATE INDEX IF NOT EXISTS idx_customers_balance ON customers(balance);

-- Create a function to update customer balance when invoice is created
CREATE OR REPLACE FUNCTION update_customer_balance_on_invoice()
RETURNS TRIGGER AS $$
BEGIN
    -- Add invoice amount to customer balance
    UPDATE customers
    SET balance = balance + NEW.remaining_amount
    WHERE id = NEW.customer_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a function to update customer balance when payment is made
CREATE OR REPLACE FUNCTION update_customer_balance_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    -- Subtract payment amount from customer balance
    UPDATE customers
    SET balance = balance - NEW.amount
    WHERE id = NEW.customer_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for invoice creation
DROP TRIGGER IF EXISTS trigger_update_balance_on_invoice ON invoices;
CREATE TRIGGER trigger_update_balance_on_invoice
    AFTER INSERT ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_balance_on_invoice();

-- Create trigger for payment creation
DROP TRIGGER IF EXISTS trigger_update_balance_on_payment ON payments;
CREATE TRIGGER trigger_update_balance_on_payment
    AFTER INSERT ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_balance_on_payment();

-- Create a function to recalculate customer balance (for existing data)
CREATE OR REPLACE FUNCTION recalculate_customer_balance(customer_uuid UUID)
RETURNS DECIMAL AS $$
DECLARE
    total_invoices DECIMAL;
    total_payments DECIMAL;
    new_balance DECIMAL;
BEGIN
    -- Calculate total remaining amount from invoices
    SELECT COALESCE(SUM(remaining_amount), 0)
    INTO total_invoices
    FROM invoices
    WHERE customer_id = customer_uuid;
    
    -- Calculate total payments
    SELECT COALESCE(SUM(amount), 0)
    INTO total_payments
    FROM payments
    WHERE customer_id = customer_uuid;
    
    -- Calculate new balance (invoices - payments already paid)
    new_balance := total_invoices;
    
    -- Update customer balance
    UPDATE customers
    SET balance = new_balance
    WHERE id = customer_uuid;
    
    RETURN new_balance;
END;
$$ LANGUAGE plpgsql;

-- Recalculate balance for all existing customers
DO $$
DECLARE
    customer_record RECORD;
BEGIN
    FOR customer_record IN SELECT id FROM customers LOOP
        PERFORM recalculate_customer_balance(customer_record.id);
    END LOOP;
END $$;
