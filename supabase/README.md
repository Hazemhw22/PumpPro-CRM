# PumpPro CRM - Supabase Database Setup

## Overview
This directory contains the database schema and setup instructions for the PumpPro CRM application using Supabase.

## Database Schema

### Tables

1. **profiles** - User profile information (extends auth.users)
2. **user_roles** - User role assignments (admin, manager, driver, user)
3. **trucks** - Truck fleet management
4. **drivers** - Driver information and management
5. **customers** - Customer records (private and business)
6. **services** - Service offerings with pricing
7. **bookings** - Service bookings/appointments
8. **invoices** - Invoice management
9. **payments** - Payment records

### Custom Types (ENUMs)

- `app_role`: admin, manager, driver, user
- `truck_status`: active, maintenance, inactive, retired
- `customer_type`: private, business
- `booking_status`: pending, confirmed, in_progress, completed, cancelled

### Views

- `booking_details` - Complete booking information with related truck, driver, and user data
- `invoice_details` - Invoice information with payment totals and balance due

## Setup Instructions

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for the project to be ready

### 2. Run the Schema

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy the contents of `schema.sql`
4. Paste and run the SQL script
5. Verify all tables are created successfully

### 3. Configure Environment Variables

Create a `.env.local` file in the root of your project:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Get these values from:
- Supabase Dashboard → Settings → API

### 4. Update Supabase Client Configuration

The Supabase client files are already configured in:
- `lib/supabase/client.ts` - For client-side operations
- `lib/supabase/server.ts` - For server-side operations

### 5. Authentication Setup

The schema includes automatic profile creation on user signup:
- When a user signs up, a profile is automatically created
- Default role 'user' is assigned
- Admins can upgrade roles through the user_roles table

## Features

### Row Level Security (RLS)

All tables have RLS enabled with policies:

- **Profiles**: Users can view/edit their own profile, admins can view all
- **User Roles**: Users can view their own roles, admins can manage all
- **Trucks/Drivers/Customers**: Authenticated users can view, admins/managers can manage
- **Services**: Everyone can view active services, admins/managers can manage
- **Bookings**: Users can view their own, authenticated users can create, admins/managers can manage all
- **Invoices/Payments**: Authenticated users can view, admins/managers can manage

### Automatic Timestamps

All tables with `updated_at` columns have triggers that automatically update the timestamp on record modification.

### Auto-generated Numbers

Helper functions are included for:
- `generate_booking_number()` - Generates unique booking numbers (BK-YYYYMMDD-0001)
- `generate_invoice_number()` - Generates unique invoice numbers (INV-YYYYMMDD-0001)

### Indexes

Performance indexes are created on:
- Foreign keys
- Status fields
- Date fields
- Frequently queried fields

## Usage Examples

### Create a Booking

```typescript
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

// Generate booking number
const { data: bookingNumber } = await supabase
  .rpc('generate_booking_number');

// Create booking
const { data, error } = await supabase
  .from('bookings')
  .insert({
    booking_number: bookingNumber,
    customer_name: 'John Doe',
    customer_phone: '555-0123',
    service_address: '123 Main St',
    scheduled_date: '2024-12-01',
    scheduled_time: '10:00:00',
    service_type: 'Septic Tank Pumping',
    truck_id: 'truck-uuid',
    driver_id: 'driver-uuid'
  })
  .select()
  .single();
```

### Get Booking Details with Related Data

```typescript
const { data, error } = await supabase
  .from('booking_details')
  .select('*')
  .eq('id', bookingId)
  .single();

// Returns booking with truck, driver, and creator information
```

### Create Invoice with Payment

```typescript
// Generate invoice number
const { data: invoiceNumber } = await supabase
  .rpc('generate_invoice_number');

// Create invoice
const { data: invoice, error: invoiceError } = await supabase
  .from('invoices')
  .insert({
    invoice_number: invoiceNumber,
    booking_id: bookingId,
    customer_id: customerId,
    customer_name: 'John Doe',
    service_description: 'Septic Tank Pumping',
    amount: 150.00,
    tax: 15.00,
    total: 165.00,
    issue_date: '2024-12-01',
    due_date: '2024-12-31'
  })
  .select()
  .single();

// Record payment
const { data: payment, error: paymentError } = await supabase
  .from('payments')
  .insert({
    invoice_id: invoice.id,
    customer_id: customerId,
    amount: 165.00,
    payment_date: '2024-12-01',
    payment_method: 'credit_card',
    transaction_id: 'TXN123456'
  });
```

### Query with TypeScript Types

```typescript
import { Database } from '@/types/database.types';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient<Database>();

// Type-safe queries
const { data: trucks } = await supabase
  .from('trucks')
  .select('*')
  .eq('status', 'active');

// trucks is typed as Truck[]
```

## Security Notes

1. **Never expose service role key** on the client side
2. **Use RLS policies** - All tables have RLS enabled
3. **Validate user roles** before sensitive operations
4. **Use server-side operations** for admin tasks
5. **Sanitize user inputs** before database operations

## Maintenance

### Backup

Regular backups are automatically handled by Supabase. You can also:
1. Go to Database → Backups in Supabase dashboard
2. Download manual backups as needed

### Migrations

For future schema changes:
1. Create migration files in `supabase/migrations/`
2. Use Supabase CLI for version control
3. Test migrations in staging before production

### Monitoring

Monitor your database:
1. Supabase Dashboard → Database → Query Performance
2. Check slow queries and optimize indexes
3. Monitor storage usage

## Support

For issues or questions:
1. Check Supabase documentation: https://supabase.com/docs
2. Review the schema.sql file for table structures
3. Check database.types.ts for TypeScript types

## Sample Data

The schema includes sample services data for testing. You can add more sample data by running additional INSERT statements in the SQL Editor.
