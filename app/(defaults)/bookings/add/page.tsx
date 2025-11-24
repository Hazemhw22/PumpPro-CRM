'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import AlertContainer from '@/components/elements/alerts/alert-container';
import CustomerSelect from '@/components/customer-select/customer-select';
import ServiceSelect from '@/components/service-select/service-select';
// Assignment is moved to booking preview. Do not assign driver/contractor/truck in Add.
import { getTranslation } from '@/i18n';

interface Customer {
    id: string;
    name: string;
    type: 'private' | 'business';
    email: string | null;
    phone: string;
    address: string | null;
    business_name: string | null;
    tax_id: string | null;
}

interface Truck {
    id: string;
    truck_number: string;
    license_plate: string;
    driver_id?: string | null;
}

interface Driver {
    id: string;
    name: string;
}

interface Service {
    id: string;
    name: string;
    description: string | null;
    price_private: number;
    price_business: number;
    active: boolean;
}

const AddBooking = () => {
    const { t } = getTranslation();
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [trucks, setTrucks] = useState<Truck[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [contractors, setContractors] = useState<any[]>([]);
    const [services, setServices] = useState<Service[]>([]);

    const [form, setForm] = useState({
        booking_number: '',
        customer_type: 'private' as 'private' | 'business',
        customer_id: '',
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        service_address: '',
        scheduled_date: '',
        scheduled_time: '',
        service_type: '',
        price: '',
        profit: '',
        truck_id: '',
        driver_id: '',
        notes: '',
        // New bookings start as 'request' (admin will assign and move to awaiting_execution)
        status: 'request' as 'request' | 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'awaiting_execution',
    });

    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    // Assignment will happen in booking preview, so we don't need selectedTruck/Driver/Contractor here
    const [selectedContractor, setSelectedContractor] = useState<{ id: string; name: string; phone?: string; email?: string } | null>(null);
    const [alerts, setAlerts] = useState<Array<{ id: string; type: 'success' | 'danger' | 'warning' | 'info'; message: string; title?: string }>>([]);
    const [role, setRole] = useState<string>('');
    const [contractorPrice, setContractorPrice] = useState<string>('');
    const [extraServices, setExtraServices] = useState<{ service_id: string; quantity: number }[]>([]);

    const addAlert = (type: 'success' | 'danger' | 'warning' | 'info', message: string, title?: string) => {
        const id = Date.now().toString();
        setAlerts((prev) => [...prev, { id, type, message, title }]);
    };

    const removeAlert = (id: string) => {
        setAlerts((prev) => prev.filter((alert) => alert.id !== id));
    };

    // Load data on mount
    useEffect(() => {
        const loadData = async () => {
            try {
                try {
                    const {
                        data: { user },
                    } = await supabase.auth.getUser();
                    if (user) {
                        // @ts-ignore
                        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
                        const r = (profile as any)?.role || '';
                        setRole(r);
                        if (r !== 'admin') {
                            addAlert('danger', 'Only admin can add bookings');
                            setTimeout(() => router.push('/bookings'), 1200);
                            return;
                        }
                    }
                } catch (e) {
                    // ignore role fetch errors
                }
                // @ts-ignore
                const { data: customersData } = await supabase.from('customers').select('id, name, phone, email');
                // @ts-ignore
                const { data: trucksData } = await supabase.from('trucks').select('id, truck_number, license_plate, driver_id');
                // @ts-ignore
                const { data: driversData } = await supabase.from('drivers').select('id, name');
                // @ts-ignore
                const { data: servicesData } = await supabase.from('services').select('id, name, description, price_private, price_business, active').eq('active', true);

                if (customersData) setCustomers(customersData as any);
                if (trucksData) setTrucks(trucksData as any);
                if (driversData) setDrivers(driversData as any);
                if (servicesData) setServices(servicesData as any);
                // fetch contractors
                try {
                    // We only need basic contractor info here. Do NOT fetch or rely on `balance` from this flow.
                    // Balances are managed elsewhere and this page must not modify them.
                    // @ts-ignore
                    const { data: contractorsData } = await supabase.from('contractors').select('id, name, phone, email');
                    if (contractorsData) setContractors(contractorsData as any);
                } catch (err) {
                    console.warn('Failed to fetch contractors', err);
                }

                // Auto-select contractor according to logged-in user if role is contractor
                try {
                    const {
                        data: { user },
                    } = await supabase.auth.getUser();
                    if (user) {
                        // @ts-ignore
                        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
                        if ((profile as any)?.role === 'contractor') {
                            // @ts-ignore
                            const { data: contr } = await supabase.from('contractors').select('id, name, phone, email').eq('user_id', user.id).maybeSingle();
                            if (contr) {
                                setSelectedContractor({ id: (contr as any).id, name: (contr as any).name, phone: (contr as any).phone, email: (contr as any).email } as any);
                            }
                        }
                    }
                } catch (e) {
                    // ignore
                }
            } catch (error) {
                console.error('Error loading data:', error);
            }
        };
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Auto-calculate total price from services and extra services
    const calculateTotalPrice = () => {
        let total = 0;

        // Add main service price
        if (form.service_type) {
            const mainService = services.find((s) => s.id === form.service_type);
            if (mainService) {
                const price = form.customer_type === 'private' ? mainService.price_private : mainService.price_business;
                total += price || 0;
            }
        }

        // Add extra services prices
        extraServices.forEach((row) => {
            if (row.service_id) {
                const svc = services.find((s) => s.id === row.service_id);
                if (svc) {
                    const price = form.customer_type === 'private' ? svc.price_private : svc.price_business;
                    total += (price || 0) * (row.quantity || 1);
                }
            }
        });

        return total;
    };

    // Recalculate price when service type, customer type, or extra services change
    useEffect(() => {
        const newPrice = calculateTotalPrice();
        setForm((prev) => ({ ...prev, price: newPrice ? newPrice.toString() : '' }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.service_type, form.customer_type, extraServices, services]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));

        // Price is now auto-calculated by useEffect, so we don't manually set it here

        // Auto-fill driver when selecting truck
        if (name === 'truck_id' && value) {
            const selectedTruck = trucks.find((t: Truck) => t.id === value);
            if (selectedTruck && selectedTruck.driver_id) {
                setForm((prev) => ({ ...prev, driver_id: selectedTruck.driver_id || '' }));
            }
        }

        // Auto-fill customer data when selecting from dropdown
        if (name === 'customer_id' && value) {
            const selectedCustomer = customers.find((c: Customer) => c.id === value);
            if (selectedCustomer) {
                setForm((prev) => ({
                    ...prev,
                    customer_name: selectedCustomer.name,
                    customer_phone: selectedCustomer.phone,
                    customer_email: selectedCustomer.email || '',
                }));
            }
        }
    };

    const addExtraServiceRow = () => {
        setExtraServices((prev) => [...prev, { service_id: '', quantity: 1 }]);
    };

    const updateExtraServiceRow = (index: number, field: 'service_id' | 'quantity', value: string | number) => {
        setExtraServices((prev) =>
            prev.map((row, i) =>
                i === index
                    ? {
                          ...row,
                          [field]: field === 'quantity' ? Number(value) || 1 : (value as string),
                      }
                    : row,
            ),
        );
    };

    const removeExtraServiceRow = (index: number) => {
        setExtraServices((prev) => prev.filter((_, i) => i !== index));
    };

    const validateForm = () => {
        if (!form.customer_name.trim()) {
            addAlert('danger', t('customer_name_required') || 'Customer name is required', 'Error');
            return false;
        }
        if (!form.customer_phone.trim()) {
            addAlert('danger', t('phone_required') || 'Phone is required', 'Error');
            return false;
        }
        if (!form.service_address.trim()) {
            addAlert('danger', t('service_address_required') || 'Service address is required', 'Error');
            return false;
        }
        if (!form.scheduled_date) {
            addAlert('danger', t('scheduled_date_required') || 'Scheduled date is required', 'Error');
            return false;
        }
        if (!form.scheduled_time) {
            addAlert('danger', t('scheduled_time_required') || 'Scheduled time is required', 'Error');
            return false;
        }
        // At least one service required (primary OR additional)
        if (!form.service_type.trim() && extraServices.length === 0) {
            addAlert('danger', t('at_least_one_service_required') || 'At least one service is required', 'Error');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setSaving(true);
        try {
            // Map UI-only statuses to DB-compatible enum values before saving.
            // NOTE: consider migrating the Postgres enum `booking_status` to include
            // 'request' and 'awaiting_execution' in production. See migration SQL below.
            const statusToSave = form.status === 'request' || form.status === 'awaiting_execution' ? 'request' : form.status;

            const bookingData = {
                booking_number: form.booking_number.trim() || null,
                customer_type: form.customer_type,
                customer_id: form.customer_id || null,
                customer_name: form.customer_name.trim(),
                customer_phone: form.customer_phone.trim(),
                customer_email: form.customer_email.trim() || null,
                service_address: form.service_address.trim(),
                scheduled_date: form.scheduled_date,
                scheduled_time: form.scheduled_time,
                service_type: form.service_type.trim(),
                price: parseFloat(form.price) || 0,
                profit: parseFloat(form.profit) || 0,
                // Do NOT assign truck/driver/contractor on create — assignments happen in Preview by admin
                truck_id: null,
                driver_id: null,
                contractor_id: null,
                // Do NOT store contractor_price inside notes.
                // contractor_price (when assigned) must be stored on the `bookings` row
                // and this flow MUST NOT write to `contractors.balance`.
                notes: (form.notes || '').trim() || null,
                // Save a DB-compatible status (avoid writing unknown enum values)
                status: statusToSave,
            };

            // @ts-ignore - Supabase type inference issue
            const { data: bookingResult, error: bookingError } = await supabase.from('bookings').insert([bookingData]).select();

            if (bookingError) throw bookingError;

            if (!bookingResult || bookingResult.length === 0) {
                throw new Error('Failed to create booking');
            }

            const newBooking = bookingResult[0] as any;

            // Create booking_services rows for main service and any extra services
            try {
                const bookingId = newBooking.id as string;
                const bookingServicesPayload: any[] = [];

                if (form.service_type) {
                    const mainService = services.find((s) => s.id === form.service_type);
                    const mainUnitPrice = mainService ? (form.customer_type === 'private' ? mainService.price_private : mainService.price_business) : parseFloat(form.price) || 0;

                    bookingServicesPayload.push({
                        booking_id: bookingId,
                        service_id: form.service_type,
                        quantity: 1,
                        unit_price: mainUnitPrice,
                    } as any);
                }

                extraServices.forEach((row) => {
                    if (!row.service_id) return;
                    const svc = services.find((s) => s.id === row.service_id);
                    const unitPrice = svc ? (form.customer_type === 'private' ? svc.price_private : svc.price_business) : 0;

                    bookingServicesPayload.push({
                        booking_id: bookingId,
                        service_id: row.service_id,
                        quantity: row.quantity || 1,
                        unit_price: unitPrice,
                    } as any);
                });

                if (bookingServicesPayload.length > 0) {
                    // @ts-ignore - Supabase types not generated for booking_services yet
                    await supabase.from('booking_services').insert(bookingServicesPayload);
                }
            } catch (e) {
                console.error('Error inserting booking_services rows:', e);
            }

            // Deduct the booking price from customer's balance (record as debt/negative)
            try {
                const bookingPrice = parseFloat(form.price || '0') || 0;
                if (form.customer_id && bookingPrice > 0) {
                    // Get current balance from customers table
                    const { data: custData, error: custError } = await supabase.from('customers').select('balance').eq('id', form.customer_id).maybeSingle();
                    if (custError) {
                        console.warn('Failed to fetch customer balance', custError);
                    }
                    const currentBalance = (custData && (custData as any).balance) || 0;
                    const newBalance = (currentBalance || 0) - bookingPrice; // Deduct (make negative/debt)
                    // @ts-ignore
                    const { error: updateError } = await supabase.from('customers').update({ balance: newBalance, updated_at: new Date().toISOString() }).eq('id', form.customer_id);
                    if (updateError) console.warn('Failed to update customer balance', updateError);
                    else addAlert('success', `Booking amount ₪${bookingPrice.toFixed(2)} added to customer debt`);
                }
            } catch (err) {
                console.error('Error updating customer balance:', err);
            }

            addAlert('success', t('booking_added_successfully') || 'Booking created successfully', 'Success');

            setTimeout(() => {
                router.push('/bookings');
            }, 1500);
        } catch (error) {
            console.error(error);
            addAlert('danger', error instanceof Error ? error.message : t('error_adding_booking') || 'Error adding booking', 'Error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <AlertContainer alerts={alerts} onClose={removeAlert} />

            <div className="container mx-auto p-6">
                <div className="flex items-center gap-5 mb-6">
                    <div onClick={() => router.back()}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mb-4 cursor-pointer text-primary rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </div>
                    <ul className="flex space-x-2 rtl:space-x-reverse mb-4">
                        <li>
                            <Link href="/" className="text-primary hover:underline">
                                {t('home')}
                            </Link>
                        </li>
                        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                            <Link href="/bookings" className="text-primary hover:underline">
                                {t('bookings') || 'Bookings'}
                            </Link>
                        </li>
                        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                            <span>{t('add_new_booking') || 'Add New Booking'}</span>
                        </li>
                    </ul>
                </div>

                <div className="mb-6">
                    <h1 className="text-2xl font-bold">{t('add_new_booking') || 'Add New Booking'}</h1>
                    <p className="text-gray-500">{t('create_booking_description') || 'Create a new booking for your service'}</p>
                </div>

                <div className="panel">
                    <div className="mb-5">
                        <h5 className="text-lg font-semibold dark:text-white-light">{t('booking_information') || 'Booking Information'}</h5>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Customer Type */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                Customer Type <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-4">
                                <label className="flex items-center cursor-pointer">
                                    <input
                                        type="radio"
                                        name="customer_type"
                                        value="private"
                                        checked={form.customer_type === 'private'}
                                        onChange={handleInputChange}
                                        className="form-radio text-primary"
                                    />
                                    <span className="ltr:ml-2 rtl:mr-2">Private Customer</span>
                                </label>
                                <label className="flex items-center cursor-pointer">
                                    <input
                                        type="radio"
                                        name="customer_type"
                                        value="business"
                                        checked={form.customer_type === 'business'}
                                        onChange={handleInputChange}
                                        className="form-radio text-primary"
                                    />
                                    <span className="ltr:ml-2 rtl:mr-2">Business Customer</span>
                                </label>
                            </div>
                        </div>

                        {/* Select Existing Customer */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                Select Existing Customer <span className="text-red-500">*</span>
                            </label>
                            <CustomerSelect
                                selectedCustomer={selectedCustomer}
                                onCustomerSelect={(customer) => {
                                    setSelectedCustomer(customer);
                                    if (customer) {
                                        setForm((prev) => ({
                                            ...prev,
                                            customer_id: customer.id,
                                            customer_name: customer.name,
                                            customer_phone: customer.phone,
                                            customer_email: (customer as any).email || '',
                                            service_address: (customer as any).address || prev.service_address || '',
                                        }));
                                    } else {
                                        setForm((prev) => ({
                                            ...prev,
                                            customer_id: '',
                                            customer_name: '',
                                            customer_phone: '',
                                            customer_email: '',
                                            service_address: '',
                                        }));
                                    }
                                }}
                                onCreateNew={() => {
                                    router.push('/customers/add');
                                }}
                                className="form-select"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Customer Name */}
                            <div>
                                <label htmlFor="customer_name" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                    Customer Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="customer_name"
                                    name="customer_name"
                                    value={form.customer_name}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Enter customer name"
                                    required
                                />
                            </div>

                            {/* Phone */}
                            <div>
                                <label htmlFor="customer_phone" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                    Phone <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="tel"
                                    id="customer_phone"
                                    name="customer_phone"
                                    value={form.customer_phone}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Enter phone number"
                                    required
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label htmlFor="customer_email" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                    Email <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    id="customer_email"
                                    name="customer_email"
                                    value={form.customer_email}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Enter email"
                                />
                            </div>

                            {/* Service Address */}
                            <div>
                                <label htmlFor="service_address" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                    Customer Address <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="service_address"
                                    name="service_address"
                                    value={form.service_address}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Enter service address"
                                    required
                                />
                            </div>

                            {/* Date and Time Combined in Single Input */}
                            <div className="md:col-span-2">
                                <label htmlFor="scheduled_datetime" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                    Schedule (Date & Time) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="datetime-local"
                                    id="scheduled_datetime"
                                    value={form.scheduled_date && form.scheduled_time ? `${form.scheduled_date}T${form.scheduled_time}` : ''}
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            const [date, time] = e.target.value.split('T');
                                            setForm((prev) => ({
                                                ...prev,
                                                scheduled_date: date,
                                                scheduled_time: time,
                                            }));
                                        }
                                    }}
                                    className="form-input w-full"
                                    required
                                />
                            </div>

                            {/* Main Service - Primary Service */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                    Primary Service <span className="text-red-500">*</span>
                                </label>
                                <ServiceSelect
                                    selectedService={selectedService}
                                    onServiceSelect={(service) => {
                                        setSelectedService(service);
                                        if (service) {
                                            setForm((prev) => ({
                                                ...prev,
                                                service_type: service.id,
                                            }));
                                        } else {
                                            setForm((prev) => ({
                                                ...prev,
                                                service_type: '',
                                            }));
                                        }
                                    }}
                                    onCreateNew={() => router.push('/services/add')}
                                    customerType={form.customer_type}
                                    className="form-select"
                                />
                            </div>

                            {/* Extra Services */}
                            <div className="md:col-span-2 space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="block text-sm font-bold text-gray-700 dark:text-white mb-0">
                                        Additional Services {!form.service_type && <span className="text-red-500">*</span>}
                                    </label>
                                    <button type="button" onClick={addExtraServiceRow} className="btn btn-outline-primary btn-sm">
                                        + Add Service
                                    </button>
                                </div>

                                {extraServices.length > 0 && (
                                    <div className="space-y-3">
                                        {extraServices.map((row, index) => (
                                            <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end border border-gray-200 dark:border-gray-700 rounded-md p-3">
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                                                        Service <span className="text-red-500">*</span>
                                                    </label>
                                                    <ServiceSelect
                                                        selectedService={services.find((svc) => svc.id === row.service_id) || null}
                                                        onServiceSelect={(service) => {
                                                            updateExtraServiceRow(index, 'service_id', service ? service.id : '');
                                                        }}
                                                        onCreateNew={() => router.push('/services/add')}
                                                        customerType={form.customer_type}
                                                        className="form-select"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Quantity</label>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        className="form-input"
                                                        value={row.quantity}
                                                        onChange={(e) => updateExtraServiceRow(index, 'quantity', e.target.value)}
                                                    />
                                                </div>
                                                <div className="flex md:justify-end">
                                                    <button type="button" onClick={() => removeExtraServiceRow(index)} className="btn btn-outline-danger btn-sm mt-4 md:mt-0">
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Price - Auto-calculated */}
                            <div>
                                <label htmlFor="price" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                    Price ($) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    id="price"
                                    name="price"
                                    value={form.price}
                                    readOnly
                                    className="form-input bg-gray-50 dark:bg-gray-900 cursor-not-allowed"
                                    placeholder="0"
                                    required
                                />
                            </div>

                            {/* Profit - Admin Only */}
                            <div>
                                <label htmlFor="profit" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                    Profit ($) - Admin Only
                                </label>
                                <input type="number" id="profit" name="profit" value={form.profit} onChange={handleInputChange} className="form-input" placeholder="0" />
                            </div>

                            {/* Assignment moved to Booking Preview (admin will assign driver/contractor there) */}
                        </div>

                        {/* Customer Confirmation Number */}
                        <div>
                            <label htmlFor="booking_number" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                Customer Confirmation Number <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="booking_number"
                                name="booking_number"
                                value={form.booking_number}
                                onChange={handleInputChange}
                                className="form-input"
                                placeholder="Enter confirmation number (e.g., CONF-2025-001)"
                            />
                        </div>

                        {/* Notes */}
                        <div>
                            <label htmlFor="notes" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                Notes (Optional)
                            </label>
                            <textarea id="notes" name="notes" value={form.notes} onChange={handleInputChange} className="form-textarea" placeholder="Enter any additional notes..." rows={4} />
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end gap-4 mt-8">
                            <button type="button" onClick={() => router.back()} className="btn btn-outline-danger">
                                {t('cancel')}
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? t('creating') || 'Creating...' : t('create_booking') || 'Create Booking'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};

export default AddBooking;
