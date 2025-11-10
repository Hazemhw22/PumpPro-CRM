# Supabase Migrations - Customer Balance Feature

## Overview
This migration adds a `balance` field to the customers table and implements automatic balance tracking through database triggers.

## Features Added
1. **Balance Column**: Tracks customer account balance
2. **Automatic Updates**: Balance updates automatically when:
   - New invoice is created (balance increases by remaining_amount)
   - Payment is made (balance decreases by payment amount)
3. **Default Value**: New customers start with balance = 0
4. **Data Migration**: Recalculates balance for existing customers

## How to Apply Migration

### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the contents of `add_customer_balance.sql`
5. Paste into the SQL editor
6. Click **Run** to execute

### Option 2: Using Supabase CLI
```bash
# If you have Supabase CLI installed
supabase db push

# Or apply directly
psql -h <your-db-host> -U postgres -d postgres -f add_customer_balance.sql
```

## What the Migration Does

### 1. Adds Balance Column
```sql
ALTER TABLE customers
ADD COLUMN balance DECIMAL(10, 2) DEFAULT 0.00 NOT NULL;
```

### 2. Creates Automatic Triggers
- **On Invoice Creation**: Adds `remaining_amount` to customer balance
- **On Payment**: Subtracts `amount` from customer balance

### 3. Recalculates Existing Data
Automatically calculates correct balance for all existing customers based on their invoices and payments.

## Balance Calculation Logic

**Customer Balance = Total Remaining Amount from All Invoices**

- When invoice is created: `balance += invoice.remaining_amount`
- When payment is made: `balance -= payment.amount`
- When invoice is updated: Balance is recalculated based on remaining_amount

## Testing the Migration

After applying the migration, you can test:

```sql
-- Check a customer's balance
SELECT id, name, balance FROM customers WHERE id = 'customer-uuid';

-- Verify balance calculation
SELECT 
    c.id,
    c.name,
    c.balance as current_balance,
    COALESCE(SUM(i.remaining_amount), 0) as calculated_balance
FROM customers c
LEFT JOIN invoices i ON i.customer_id = c.id
GROUP BY c.id, c.name, c.balance;
```

## Rollback (if needed)

If you need to remove the balance feature:

```sql
-- Drop triggers
DROP TRIGGER IF EXISTS trigger_update_balance_on_invoice ON invoices;
DROP TRIGGER IF EXISTS trigger_update_balance_on_payment ON payments;

-- Drop functions
DROP FUNCTION IF EXISTS update_customer_balance_on_invoice();
DROP FUNCTION IF EXISTS update_customer_balance_on_payment();
DROP FUNCTION IF EXISTS recalculate_customer_balance(UUID);

-- Remove column
ALTER TABLE customers DROP COLUMN IF EXISTS balance;
```

## Notes
- The balance field is automatically managed by database triggers
- You don't need to manually update balance in your application code
- The balance represents money the customer owes (positive = debt, negative = credit)
- All existing customers will have their balance recalculated automatically
