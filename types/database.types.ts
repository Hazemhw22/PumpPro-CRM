// ============================================
// Database Types - Auto-generated from Supabase Schema
// ============================================

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// ============================================
// Enums
// ============================================

export type AppRole = 'admin' | 'driver';

export type TruckStatus = 'available' | 'in_use' | 'maintenance' | 'out_of_service';

export type CustomerType = 'private' | 'business';

export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export type InvoiceStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';

export type PaymentMethod = 'cash' | 'credit_card' | 'bank_transfer' | 'check';

export type DriverStatus = 'active' | 'inactive' | 'on_leave';

// ============================================
// Database Tables
// ============================================

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    email: string;
                    full_name: string | null;
                    role: string;
                    avatar_url: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id: string;
                    email: string;
                    full_name?: string | null;
                    role?: string;
                    avatar_url?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    email?: string;
                    full_name?: string | null;
                    role?: string;
                    avatar_url?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            user_roles: {
                Row: {
                    id: string;
                    user_id: string;
                    role: AppRole;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    role?: AppRole;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    role?: AppRole;
                    created_at?: string;
                };
            };
            trucks: {
                Row: {
                    id: string;
                    truck_number: string;
                    license_plate: string;
                    capacity_gallons: number;
                    status: TruckStatus;
                    driver_id: string | null;
                    purchase_date: string | null;
                    last_maintenance: string | null;
                    notes: string | null;
                    photo_url: string | null;
                    truck_photos: string[];
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    truck_number: string;
                    license_plate: string;
                    capacity_gallons: number;
                    status?: TruckStatus;
                    driver_id?: string | null;
                    purchase_date?: string | null;
                    last_maintenance?: string | null;
                    notes?: string | null;
                    photo_url?: string | null;
                    truck_photos?: string[];
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    truck_number?: string;
                    license_plate?: string;
                    capacity_gallons?: number;
                    status?: TruckStatus;
                    driver_id?: string | null;
                    purchase_date?: string | null;
                    last_maintenance?: string | null;
                    notes?: string | null;
                    photo_url?: string | null;
                    truck_photos?: string[];
                    created_at?: string;
                    updated_at?: string;
                };
            };
            drivers: {
                Row: {
                    id: string;
                    first_name: string;
                    last_name: string;
                    phone: string;
                    email: string | null;
                    license_number: string;
                    license_expiry: string;
                    hire_date: string;
                    status: DriverStatus;
                    notes: string | null;
                    photo_url: string | null;
                    driver_photos: string[];
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    first_name: string;
                    last_name: string;
                    phone: string;
                    email?: string | null;
                    license_number: string;
                    license_expiry: string;
                    hire_date: string;
                    status?: DriverStatus;
                    notes?: string | null;
                    photo_url?: string | null;
                    driver_photos?: string[];
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    first_name?: string;
                    last_name?: string;
                    phone?: string;
                    email?: string | null;
                    license_number?: string;
                    license_expiry?: string;
                    hire_date?: string;
                    status?: DriverStatus;
                    notes?: string | null;
                    photo_url?: string | null;
                    driver_photos?: string[];
                    created_at?: string;
                    updated_at?: string;
                };
            };
            customers: {
                Row: {
                    id: string;
                    name: string | null;
                    type: CustomerType;
                    email: string | null;
                    phone: string;
                    address: string | null;
                    business_name: string | null;
                    tax_id: string | null;
                    notes: string | null;
                    photo_url: string | null;
                    balance: number;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name?: string | null;
                    type: CustomerType;
                    email?: string | null;
                    phone: string;
                    address?: string | null;
                    business_name?: string | null;
                    tax_id?: string | null;
                    notes?: string | null;
                    photo_url?: string | null;
                    balance?: number;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string | null;
                    type?: CustomerType;
                    email?: string | null;
                    phone?: string;
                    address?: string | null;
                    business_name?: string | null;
                    tax_id?: string | null;
                    notes?: string | null;
                    photo_url?: string | null;
                    balance?: number;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            contractors: {
                Row: {
                    id: string;
                    name: string;
                    email: string | null;
                    phone: string | null;
                    balance: number;
                    password: string | null;
                    metadata: Json | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    email?: string | null;
                    phone?: string | null;
                    balance?: number;
                    password?: string | null;
                    metadata?: Json | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    email?: string | null;
                    phone?: string | null;
                    balance?: number;
                    password?: string | null;
                    metadata?: Json | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            services: {
                Row: {
                    id: string;
                    name: string;
                    description: string | null;
                    price_private: number;
                    price_business: number;
                    active: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    description?: string | null;
                    price_private: number;
                    price_business: number;
                    active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    description?: string | null;
                    price_private?: number;
                    price_business?: number;
                    active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            bookings: {
                Row: {
                    id: string;
                    booking_number: string;
                    customer_name: string;
                    customer_phone: string;
                    customer_email: string | null;
                    service_address: string;
                    scheduled_date: string;
                    scheduled_time: string;
                    status: BookingStatus;
                    contractor_id: string | null;
                    truck_id: string | null;
                    driver_id: string | null;
                    service_type: string;
                    estimated_duration: number | null;
                    notes: string | null;
                    created_by: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    booking_number: string;
                    customer_name: string;
                    customer_phone: string;
                    customer_email?: string | null;
                    service_address: string;
                    scheduled_date: string;
                    scheduled_time: string;
                    status?: BookingStatus;
                    contractor_id?: string | null;
                    truck_id?: string | null;
                    driver_id?: string | null;
                    service_type: string;
                    estimated_duration?: number | null;
                    notes?: string | null;
                    created_by?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    booking_number?: string;
                    customer_name?: string;
                    customer_phone?: string;
                    customer_email?: string | null;
                    service_address?: string;
                    scheduled_date?: string;
                    scheduled_time?: string;
                    status?: BookingStatus;
                    contractor_id?: string | null;
                    truck_id?: string | null;
                    driver_id?: string | null;
                    service_type?: string;
                    estimated_duration?: number | null;
                    notes?: string | null;
                    created_by?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            invoices: {
                Row: {
                    id: string;
                    invoice_number: string;
                    booking_id: string | null;
                    customer_id: string | null;
                    total_amount: number;
                    paid_amount: number;
                    remaining_amount: number;
                    status: InvoiceStatus;
                    due_date: string;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    invoice_number: string;
                    booking_id?: string | null;
                    customer_id?: string | null;
                    total_amount: number;
                    paid_amount?: number;
                    remaining_amount?: number;
                    status?: InvoiceStatus;
                    due_date: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    invoice_number?: string;
                    booking_id?: string | null;
                    customer_id?: string | null;
                    total_amount?: number;
                    paid_amount?: number;
                    remaining_amount?: number;
                    status?: InvoiceStatus;
                    due_date?: string;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            payments: {
                Row: {
                    id: string;
                    invoice_id: string;
                    booking_id: string | null;
                    customer_id: string | null;
                    amount: number;
                    payment_method: PaymentMethod;
                    transaction_id: string | null;
                    notes: string | null;
                    payment_date: string;
                    created_by: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    invoice_id: string;
                    booking_id?: string | null;
                    customer_id?: string | null;
                    amount: number;
                    payment_method: PaymentMethod;
                    transaction_id?: string | null;
                    notes?: string | null;
                    payment_date: string;
                    created_by?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    invoice_id?: string;
                    booking_id?: string | null;
                    customer_id?: string | null;
                    amount?: number;
                    payment_method?: PaymentMethod;
                    transaction_id?: string | null;
                    notes?: string | null;
                    payment_date?: string;
                    created_by?: string | null;
                    created_at?: string;
                };
            };
        };
        Views: {
            booking_details: {
                Row: {
                    id: string;
                    booking_number: string;
                    customer_name: string;
                    customer_phone: string;
                    customer_email: string | null;
                    service_address: string;
                    scheduled_date: string;
                    scheduled_time: string;
                    status: BookingStatus;
                    service_type: string;
                    estimated_duration: number | null;
                    notes: string | null;
                    created_at: string;
                    updated_at: string;
                    truck_number: string | null;
                    license_plate: string | null;
                    capacity_gallons: number | null;
                    driver_name: string | null;
                    driver_phone: string | null;
                    created_by_name: string | null;
                };
            };
            invoice_details: {
                Row: {
                    id: string;
                    invoice_number: string;
                    customer_name: string;
                    service_description: string | null;
                    amount: number;
                    tax: number;
                    total: number;
                    status: InvoiceStatus;
                    issue_date: string;
                    due_date: string;
                    paid_date: string | null;
                    notes: string | null;
                    created_at: string;
                    booking_number: string | null;
                    customer_full_name: string | null;
                    customer_type: CustomerType | null;
                    customer_email: string | null;
                    customer_phone: string | null;
                    total_paid: number;
                    balance_due: number;
                };
            };
        };
        Functions: {
            generate_booking_number: {
                Args: Record<string, never>;
                Returns: string;
            };
            generate_invoice_number: {
                Args: Record<string, never>;
                Returns: string;
            };
        };
    };
}

// ============================================
// Helper Types
// ============================================

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

// Specific table types for easier import
export type Profile = Tables<'profiles'>;
export type UserRole = Tables<'user_roles'>;
export type Truck = Tables<'trucks'>;
export type Driver = Tables<'drivers'>;
export type Customer = Tables<'customers'>;
export type Contractor = Tables<'contractors'>;
export type Service = Tables<'services'>;
export type Booking = Tables<'bookings'>;
export type Invoice = Tables<'invoices'>;
export type Payment = Tables<'payments'>;

// View types
export type BookingDetail = Database['public']['Views']['booking_details']['Row'];
export type InvoiceDetail = Database['public']['Views']['invoice_details']['Row'];

// Insert types
export type ProfileInsert = Inserts<'profiles'>;
export type UserRoleInsert = Inserts<'user_roles'>;
export type TruckInsert = Inserts<'trucks'>;
export type DriverInsert = Inserts<'drivers'>;
export type CustomerInsert = Inserts<'customers'>;
export type ContractorInsert = Inserts<'contractors'>;
export type ServiceInsert = Inserts<'services'>;
export type BookingInsert = Inserts<'bookings'>;
export type InvoiceInsert = Inserts<'invoices'>;
export type PaymentInsert = Inserts<'payments'>;

// Update types
export type ProfileUpdate = Updates<'profiles'>;
export type UserRoleUpdate = Updates<'user_roles'>;
export type TruckUpdate = Updates<'trucks'>;
export type DriverUpdate = Updates<'drivers'>;
export type CustomerUpdate = Updates<'customers'>;
export type ContractorUpdate = Updates<'contractors'>;
export type ServiceUpdate = Updates<'services'>;
export type BookingUpdate = Updates<'bookings'>;
export type InvoiceUpdate = Updates<'invoices'>;
export type PaymentUpdate = Updates<'payments'>;
