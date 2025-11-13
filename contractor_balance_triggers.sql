-- ============================================
-- CONTRACTOR BALANCE MANAGEMENT SYSTEM
-- ============================================
-- This script creates automatic triggers to update contractor balance
-- when bookings or payments are created, updated, or deleted.
--
-- Balance Logic:
-- - When booking is added: balance -= booking.price (subtract)
-- - When payment is added: balance += payment.amount (add)
-- ============================================

-- Add contractor_id column to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL;

-- Add contractor_id column to payments table
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_contractor_id ON bookings(contractor_id);
CREATE INDEX IF NOT EXISTS idx_payments_contractor_id ON payments(contractor_id);

-- Add comment to explain the relationship
COMMENT ON COLUMN bookings.contractor_id IS 'Reference to the contractor assigned to this booking';
COMMENT ON COLUMN payments.contractor_id IS 'Reference to the contractor who received this payment';

-- ============================================
-- TRIGGER FUNCTIONS FOR AUTOMATIC BALANCE UPDATE
-- ============================================

-- Function to update contractor balance when a booking is created/updated/deleted
CREATE OR REPLACE FUNCTION update_contractor_balance_on_booking()
RETURNS TRIGGER AS $$
BEGIN
    -- When a new booking is created with a contractor
    IF (TG_OP = 'INSERT' AND NEW.contractor_id IS NOT NULL) THEN
        UPDATE contractors 
        SET balance = COALESCE(balance, 0) - NEW.price,
            updated_at = NOW()
        WHERE id = NEW.contractor_id;
        RETURN NEW;
    END IF;

    -- When a booking is updated
    IF (TG_OP = 'UPDATE') THEN
        -- If contractor was removed
        IF (OLD.contractor_id IS NOT NULL AND NEW.contractor_id IS NULL) THEN
            UPDATE contractors 
            SET balance = COALESCE(balance, 0) + OLD.price,
                updated_at = NOW()
            WHERE id = OLD.contractor_id;
        -- If contractor was added
        ELSIF (OLD.contractor_id IS NULL AND NEW.contractor_id IS NOT NULL) THEN
            UPDATE contractors 
            SET balance = COALESCE(balance, 0) - NEW.price,
                updated_at = NOW()
            WHERE id = NEW.contractor_id;
        -- If contractor changed
        ELSIF (OLD.contractor_id IS NOT NULL AND NEW.contractor_id IS NOT NULL AND OLD.contractor_id != NEW.contractor_id) THEN
            -- Add back to old contractor
            UPDATE contractors 
            SET balance = COALESCE(balance, 0) + OLD.price,
                updated_at = NOW()
            WHERE id = OLD.contractor_id;
            -- Subtract from new contractor
            UPDATE contractors 
            SET balance = COALESCE(balance, 0) - NEW.price,
                updated_at = NOW()
            WHERE id = NEW.contractor_id;
        -- If price changed for same contractor
        ELSIF (OLD.contractor_id = NEW.contractor_id AND OLD.price != NEW.price) THEN
            UPDATE contractors 
            SET balance = COALESCE(balance, 0) + OLD.price - NEW.price,
                updated_at = NOW()
            WHERE id = NEW.contractor_id;
        END IF;
        RETURN NEW;
    END IF;

    -- When a booking is deleted
    IF (TG_OP = 'DELETE' AND OLD.contractor_id IS NOT NULL) THEN
        UPDATE contractors 
        SET balance = COALESCE(balance, 0) + OLD.price,
            updated_at = NOW()
        WHERE id = OLD.contractor_id;
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update contractor balance when a payment is created/updated/deleted
CREATE OR REPLACE FUNCTION update_contractor_balance_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    -- When a new payment is created
    IF (TG_OP = 'INSERT' AND NEW.contractor_id IS NOT NULL) THEN
        UPDATE contractors 
        SET balance = COALESCE(balance, 0) + NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.contractor_id;
        RETURN NEW;
    END IF;

    -- When a payment is updated
    IF (TG_OP = 'UPDATE') THEN
        -- If contractor changed
        IF (OLD.contractor_id IS NOT NULL AND NEW.contractor_id IS NOT NULL AND OLD.contractor_id != NEW.contractor_id) THEN
            -- Subtract from old contractor
            UPDATE contractors 
            SET balance = COALESCE(balance, 0) - OLD.amount,
                updated_at = NOW()
            WHERE id = OLD.contractor_id;
            -- Add to new contractor
            UPDATE contractors 
            SET balance = COALESCE(balance, 0) + NEW.amount,
                updated_at = NOW()
            WHERE id = NEW.contractor_id;
        -- If amount changed for same contractor
        ELSIF (OLD.contractor_id = NEW.contractor_id AND OLD.amount != NEW.amount) THEN
            UPDATE contractors 
            SET balance = COALESCE(balance, 0) - OLD.amount + NEW.amount,
                updated_at = NOW()
            WHERE id = NEW.contractor_id;
        END IF;
        RETURN NEW;
    END IF;

    -- When a payment is deleted
    IF (TG_OP = 'DELETE' AND OLD.contractor_id IS NOT NULL) THEN
        UPDATE contractors 
        SET balance = COALESCE(balance, 0) - OLD.amount,
            updated_at = NOW()
        WHERE id = OLD.contractor_id;
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CREATE TRIGGERS
-- ============================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_update_contractor_balance_on_booking ON bookings;
DROP TRIGGER IF EXISTS trigger_update_contractor_balance_on_payment ON payments;

-- Create trigger for bookings
CREATE TRIGGER trigger_update_contractor_balance_on_booking
    AFTER INSERT OR UPDATE OR DELETE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_contractor_balance_on_booking();

-- Create trigger for payments
CREATE TRIGGER trigger_update_contractor_balance_on_payment
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_contractor_balance_on_payment();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION update_contractor_balance_on_booking() IS 'Automatically updates contractor balance when bookings are created, updated, or deleted. Subtracts booking price from balance.';
COMMENT ON FUNCTION update_contractor_balance_on_payment() IS 'Automatically updates contractor balance when payments are created, updated, or deleted. Adds payment amount to balance.';

-- ============================================
-- TESTING QUERIES (Optional - for verification)
-- ============================================

-- Check contractor balance before and after operations
-- SELECT id, name, balance FROM contractors WHERE id = 'YOUR_CONTRACTOR_ID';

-- Test: Create a booking for a contractor
-- INSERT INTO bookings (contractor_id, price, ...) VALUES ('contractor_id', 1000, ...);
-- Expected: contractor.balance should decrease by 1000

-- Test: Create a payment for a contractor
-- INSERT INTO payments (contractor_id, amount, ...) VALUES ('contractor_id', 500, ...);
-- Expected: contractor.balance should increase by 500

-- ============================================
-- NOTES
-- ============================================
-- 1. Balance calculation: balance = payments - bookings
-- 2. Negative balance means contractor owes money (bookings > payments)
-- 3. Positive balance means contractor has credit (payments > bookings)
-- 4. All triggers update the 'updated_at' timestamp automatically
-- 5. COALESCE ensures NULL values are treated as 0
