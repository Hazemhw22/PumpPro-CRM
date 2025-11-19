-- Create table for contractor payments
create table if not exists public.contractor_payments (
    id uuid primary key default uuid_generate_v4(),
    contractor_id uuid not null references public.contractors(id) on delete cascade,
    booking_id uuid references public.bookings(id) on delete set null,
    amount numeric not null check (amount > 0),
    payment_method text not null,
    payment_date date not null default now(),
    reference_number text,
    notes text,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_contractor_payments_contractor_id on public.contractor_payments(contractor_id);
create index if not exists idx_contractor_payments_booking_id on public.contractor_payments(booking_id);

create trigger set_timestamp_on_contractor_payments
    before update on public.contractor_payments
    for each row
    execute procedure trigger_set_timestamp();

