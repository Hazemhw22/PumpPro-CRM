'use client';
import React, { useState, useEffect } from 'react';
import AssignmentModeSelectAdd from '@/components/assignment-mode-select/assignment-mode-select-add';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import AlertContainer from '@/components/elements/alerts/alert-container';
import CustomerSelect from '@/components/customer-select/customer-select';
import TruckSelect from '@/components/truck-select/truck-select';
import DriverSelect from '@/components/driver-select/driver-select';
import ServiceSelect from '@/components/service-select/service-select';
import ContractorSelect from '@/components/contractor-select/contractor-select';
import StatusSelect from '@/components/status-select/status-select';
import { getTranslation } from '@/i18n';
import IconInfoCircle from '@/components/icon/icon-info-circle';
import IconBox from '@/components/icon/icon-box';
import IconClock from '@/components/icon/icon-clock';
import { Tab } from '@headlessui/react';

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

interface Service {
    id: string;
    name: string;
    description: string | null;
    price_private: number;
    price_business: number;
    active: boolean;
}

interface Truck {
    id: string;
    truck_number: string;
    license_plate: string;
    capacity_gallons: number;
    status: 'available' | 'in_use' | 'maintenance' | 'out_of_service' | 'active' | 'maintenance' | 'inactive' | 'retired';
    driver_id: string | null;
}

interface Driver {
    id: string;
    name: string;
    phone: string;
    license_number: string | null;
    status: 'active' | 'inactive' | 'on_leave';
}

interface Booking {
    id: string;
    booking_number: string;
    customer_type: 'private' | 'business';
    customer_id?: string;
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    service_address: string;
    scheduled_date: string;
    scheduled_time: string;
    status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'awaiting_execution';
    service_type: string;
    price?: number;
    profit?: number;
    truck_id?: string;
    driver_id?: string;
    contractor_price?: number | null;
    contractor_name?: string | null;
    notes?: string;
}

const EditBooking = () => {
    const { t } = getTranslation();
    const router = useRouter();
    const params = useParams();
    const bookingId = params?.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [booking, setBooking] = useState<Booking | null>(null);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [trucks, setTrucks] = useState<any[]>([]);
    const [drivers, setDrivers] = useState<any[]>([]);

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
        status: 'pending' as 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled',
        service_type: '',
        price: '',
        profit: '',
        payment_status: 'unpaid' as 'paid' | 'unpaid',
        truck_id: '',
        driver_id: '',
        notes: '',
    });

    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [selectedTruck, setSelectedTruck] = useState<Truck | null>(null);
    const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [selectedContractor, setSelectedContractor] = useState<{ id: string; name: string } | null>(null);

    const [alerts, setAlerts] = useState<Array<{ id: string; type: 'success' | 'danger' | 'warning' | 'info'; message: string; title?: string }>>([]);
    const [assignMode, setAssignMode] = useState<'contractor' | 'driver'>('driver');
    const [contractorPrice, setContractorPrice] = useState<string>('');
    const [hasInvoice, setHasInvoice] = useState<boolean>(false);
    const [extraServices, setExtraServices] = useState<{ service_id: string; quantity: number }[]>([]);

    const addAlert = (type: 'success' | 'danger' | 'warning' | 'info', message: string, title?: string) => {
        const id = Date.now().toString();
        setAlerts((prev) => [...prev, { id, type, message, title }]);
    };

    const removeAlert = (id: string) => {
        setAlerts((prev) => prev.filter((alert) => alert.id !== id));
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                // Load customers, services, trucks, and drivers
                // @ts-ignore
                const { data: customersData } = await supabase.from('customers').select('id, name, type, email, phone, address, business_name, tax_id');
                // @ts-ignore
                const { data: servicesData } = await supabase.from('services').select('id, name, description, price_private, price_business, active').eq('active', true);
                // @ts-ignore
                const { data: trucksData } = await supabase.from('trucks').select('id, truck_number, license_plate, capacity_gallons, status, driver_id');
                // @ts-ignore
                const { data: driversData } = await supabase.from('drivers').select('id, name, phone, license_number, status');

                if (customersData) setCustomers(customersData as any);
                if (servicesData) setServices(servicesData as any);
                if (trucksData) setTrucks(trucksData as any);
                if (driversData) setDrivers(driversData as any);

                // Load booking
                // @ts-ignore
                const { data, error } = await supabase.from('bookings').select('*').eq('id', bookingId).single();

                if (error) throw error;

                if (data) {
                    const bookingData = data as any;
                    setBooking(bookingData);
                    setAssignMode(bookingData.contractor_id ? 'contractor' : 'driver');
                    setForm({
                        booking_number: bookingData.booking_number || '',
                        customer_type: bookingData.customer_type || 'private',
                        customer_id: bookingData.customer_id || '',
                        customer_name: bookingData.customer_name || '',
                        customer_phone: bookingData.customer_phone || '',
                        customer_email: bookingData.customer_email || '',
                        service_address: bookingData.service_address || '',
                        scheduled_date: bookingData.scheduled_date || '',
                        scheduled_time: bookingData.scheduled_time || '',
                        status: bookingData.status || 'pending',
                        service_type: bookingData.service_type || '',
                        price: bookingData.price ? String(bookingData.price) : '',
                        profit: bookingData.profit ? String(bookingData.profit) : '',
                        payment_status: bookingData.payment_status || 'unpaid',
                        truck_id: bookingData.truck_id || '',
                        driver_id: bookingData.driver_id || '',
                        notes: bookingData.notes || '',
                    });
                    setContractorPrice(typeof bookingData.contractor_price === 'number' && !Number.isNaN(bookingData.contractor_price) ? String(bookingData.contractor_price) : '');
                    // Load contractor if assigned
                    if (bookingData.contractor_id) {
                        try {
                            const { data: contractorData } = await (supabase.from('contractors') as any).select('id, name').eq('id', bookingData.contractor_id).single();
                            if (contractorData) {
                                const cd = contractorData as any;
                                setSelectedContractor({ id: cd.id, name: cd.name });
                            }
                            // Check if invoice exists for this booking to block edits
                            try {
                                const { data: inv } = await supabase.from('invoices').select('id').eq('booking_id', bookingId).maybeSingle();
                                setHasInvoice(!!inv);
                                if (inv) {
                                    addAlert('info', t('invoice_exists_no_edit') || 'An invoice exists for this booking. Editing is disabled.', 'Info');
                                }
                            } catch (e) {
                                // ignore
                            }
                        } catch (e) {
                            // ignore if not found
                        }
                    }

                    // Set selected items
                    if (customersData && bookingData.customer_id) {
                        const customer = customersData.find((c: any) => c.id === bookingData.customer_id);
                        setSelectedCustomer(customer || null);
                    }
                    if (trucksData && bookingData.truck_id) {
                        const truck = trucksData.find((t: any) => t.id === bookingData.truck_id);
                        setSelectedTruck(truck || null);
                    }
                    if (driversData && bookingData.driver_id) {
                        const driver = driversData.find((d: any) => d.id === bookingData.driver_id);
                        setSelectedDriver(driver || null);
                    }
                    if (servicesData && bookingData.service_type) {
                        const service = servicesData.find((s: any) => s.id === bookingData.service_type);
                        setSelectedService(service || null);
                    }

                    // Load additional services from booking_services (excluding main service_type)
                    try {
                        // @ts-ignore
                        const { data: bookingServicesData } = await supabase.from('booking_services').select('service_id, quantity').eq('booking_id', bookingId);
                        if (bookingServicesData) {
                            const rows = bookingServicesData as any[];
                            const mainServiceId = bookingData.service_type || null;
                            const extras = mainServiceId ? rows.filter((r: any) => r.service_id !== mainServiceId) : rows.slice(1);
                            setExtraServices(
                                extras.map((r: any) => ({
                                    service_id: r.service_id,
                                    quantity: r.quantity || 1,
                                })),
                            );
                        }
                    } catch (e) {
                        // ignore booking_services load errors
                    }
                }
            } catch (error) {
                console.error('Error loading data:', error);
                addAlert('danger', t('error_loading_data') || 'Error loading data', 'Error');
            } finally {
                setLoading(false);
            }
        };

        if (bookingId) {
            loadData();
        }
    }, [bookingId, t]);

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
    }, [form.service_type, form.customer_type, extraServices, services, calculateTotalPrice]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));

        // Price is now auto-calculated by useEffect, so we don't manually set it here

        // Auto-fill driver when selecting truck
        if (name === 'truck_id' && value) {
            const selectedTruck = trucks.find((t: any) => t.id === value);
            if (selectedTruck && selectedTruck.driver_id) {
                setForm((prev) => ({ ...prev, driver_id: selectedTruck.driver_id }));
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
        if (!form.customer_id) {
            addAlert('danger', t('customer_required') || 'Customer is required', 'Error');
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
        if (!form.service_type && extraServices.length === 0) {
            addAlert('danger', t('at_least_one_service_required') || 'At least one service is required', 'Error');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (hasInvoice) {
            addAlert('danger', t('cannot_edit_with_invoice') || 'Cannot edit a booking after an invoice is created.', 'Error');
            return;
        }

        if (!validateForm()) return;

        if (selectedContractor && (!contractorPrice || Number(contractorPrice) <= 0)) {
            addAlert('danger', 'Contractor price must be a positive number', 'Error');
            return;
        }

        setSaving(true);
        try {
            const bookingData = {
                booking_number: form.booking_number.trim() || null,
                customer_type: form.customer_type,
                customer_id: form.customer_id || null,
                customer_name: form.customer_name.trim(),
                customer_phone: form.customer_phone.trim(),
                service_address: form.service_address.trim(),
                scheduled_date: form.scheduled_date,
                scheduled_time: form.scheduled_time,
                status: form.status,
                service_type: form.service_type.trim(),
                contractor_id: selectedContractor ? selectedContractor.id : null,
                contractor_name: selectedContractor ? selectedContractor.name : null,
                contractor_price: selectedContractor ? Number(contractorPrice) : null,
                // Remove contractor_price from notes; we record it on the contractor's balance instead.
                notes: (form.notes || '').replace(/\ncontractor_price:\s*[0-9]+(?:\.[0-9]+)?/g, '').trim() || null,
            };

            // @ts-ignore - Supabase type inference issue
            const { error } = await supabase.from('bookings').update(bookingData).eq('id', bookingId);

            if (error) throw error;

            // Sync booking_services (main + extra services)
            try {
                // @ts-ignore
                await supabase.from('booking_services').delete().eq('booking_id', bookingId);

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
                    // @ts-ignore
                    await supabase.from('booking_services').insert(bookingServicesPayload);
                }
            } catch (e) {
                console.error('Error updating booking_services rows:', e);
            }

            // Handle contractor balance adjustments when contractorPrice changed or contractor reassigned.
            try {
                const newCp = parseFloat(contractorPrice || '') || 0;
                const oldCp = Number(booking?.contractor_price || 0);

                const prevContractorId = (booking as any)?.contractor_id || null;
                const newContractorId = selectedContractor ? selectedContractor.id : null;

                // If contractor changed and there was an old contractor price applied, revert it from previous contractor
                if (prevContractorId && prevContractorId !== newContractorId && oldCp > 0) {
                    try {
                        const { data: prevContr, error: prevErr } = await supabase.from('contractors').select('balance').eq('id', prevContractorId).maybeSingle();
                        const prevBalance = (prevContr && (prevContr as any).balance) || 0;
                        const { error: revertErr } = await (supabase.from('contractors') as any)
                            .update({ balance: prevBalance + oldCp, updated_at: new Date().toISOString() })
                            .eq('id', prevContractorId);
                        if (revertErr) console.warn('Failed to revert previous contractor balance', revertErr);
                    } catch (e) {
                        console.warn('Error reverting previous contractor balance', e);
                    }
                }

                // Apply new contractor price to currently selected contractor
                if (newContractorId && newCp > 0) {
                    try {
                        const { data: contrData, error: contrErr } = await supabase.from('contractors').select('balance').eq('id', newContractorId).maybeSingle();
                        const currentBalance = (contrData && (contrData as any).balance) || 0;

                        // If same contractor, apply delta (new - old), otherwise subtract full newCp
                        const delta = prevContractorId === newContractorId ? newCp - oldCp : newCp;
                        const newBalance = (currentBalance || 0) - delta;
                        const { error: updateErr } = await (supabase.from('contractors') as any).update({ balance: newBalance, updated_at: new Date().toISOString() }).eq('id', newContractorId);
                        if (updateErr) console.warn('Failed to update contractor balance', updateErr);
                        else addAlert('success', `Recorded contractor adjustment ₪${delta.toFixed(2)} for contractor`, 'Success');
                    } catch (e) {
                        console.warn('Error updating contractor balance', e);
                    }
                }
            } catch (e) {
                console.error('Error handling contractor balance adjustments:', e);
            }

            addAlert('success', t('booking_updated_successfully') || 'Booking updated successfully', 'Success');

            setTimeout(() => {
                router.push('/bookings');
            }, 1500);
        } catch (error) {
            console.error(error);
            addAlert('danger', error instanceof Error ? error.message : t('error_updating_booking') || 'Error updating booking', 'Error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-80">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
                <span className="ml-3">{t('loading')}</span>
            </div>
        );
    }

    if (!booking) {
        return (
            <div className="flex flex-col items-center justify-center h-80">
                <p className="text-xl font-bold mb-2">{t('booking_not_found') || 'Booking not found'}</p>
                <button onClick={() => router.push('/bookings')} className="btn btn-primary mt-4">
                    {t('back_to_bookings') || 'Back to Bookings'}
                </button>
            </div>
        );
    }

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
                            <span>{t('edit_booking') || 'Edit Booking'}</span>
                        </li>
                    </ul>
                </div>

                <div className="mb-6">
                    <h1 className="text-2xl font-bold">{t('edit_booking') || 'Edit Booking'}</h1>
                    <p className="text-gray-500">{t('update_booking_information') || 'Update booking information'}</p>
                </div>

                <Tab.Group>
                    <Tab.List className="mt-3 flex flex-wrap border-b border-white-light dark:border-[#191e3a]">
                        <Tab as="div" className="flex-1">
                            {({ selected }) => (
                                <button
                                    type="button"
                                    className={`${selected ? 'text-primary !outline-none before:!w-full' : ''} relative -mb-[1px] flex w-full items-center justify-center border-b border-transparent p-5 py-3 before:absolute before:bottom-0 before:left-0 before:right-0 before:m-auto before:inline-block before:h-[1px] before:w-0 before:bg-primary before:transition-all before:duration-700 hover:text-primary hover:before:w-full`}
                                >
                                    <IconInfoCircle className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                                    {t('basic_information') || 'Basic Information'}
                                </button>
                            )}
                        </Tab>
                        <Tab as="div" className="flex-1">
                            {({ selected }) => (
                                <button
                                    type="button"
                                    className={`${selected ? 'text-primary !outline-none before:!w-full' : ''} relative -mb-[1px] flex w-full items-center justify-center border-b border-transparent p-5 py-3 before:absolute before:bottom-0 before:left-0 before:right-0 before:m-auto before:inline-block before:h-[1px] before:w-0 before:bg-primary before:transition-all before:duration-700 hover:text-primary hover:before:w-full`}
                                >
                                    <IconBox className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                                    {t('assignment') || 'Assignment'}
                                </button>
                            )}
                        </Tab>
                        <Tab as="div" className="flex-1">
                            {({ selected }) => (
                                <button
                                    type="button"
                                    className={`${selected ? 'text-primary !outline-none before:!w-full' : ''} relative -mb-[1px] flex w-full items-center justify-center border-b border-transparent p-5 py-3 before:absolute before:bottom-0 before:left-0 before:right-0 before:m-auto before:inline-block before:h-[1px] before:w-0 before:bg-primary before:transition-all before:duration-700 hover:text-primary hover:before:w-full`}
                                >
                                    <IconClock className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                                    {t('schedule_information') || 'Schedule Information'}
                                </button>
                            )}
                        </Tab>
                    </Tab.List>

                    <Tab.Panels className="mt-5">
                        {/* Basic Information Tab */}
                        <Tab.Panel>
                            <div className="panel">
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {/* Booking Number */}
                                        <div>
                                            <label htmlFor="booking_number" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                                {t('booking_number') || 'Booking Number'} (Optional)
                                            </label>
                                            <input
                                                type="text"
                                                id="booking_number"
                                                name="booking_number"
                                                value={form.booking_number}
                                                onChange={handleInputChange}
                                                className="form-input"
                                                placeholder="Enter booking number (e.g., BK-2025-001)"
                                            />
                                        </div>

                                        {/* Customer Name */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                                {t('customer_name') || 'Customer Name'} <span className="text-red-500">*</span>
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
                                                        }));
                                                    }
                                                }}
                                                onCreateNew={() => router.push('/customers/add')}
                                                className="form-select"
                                            />
                                        </div>

                                        {/* Customer Phone */}
                                        <div>
                                            <label htmlFor="customer_phone" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                                {t('phone') || 'Phone'} <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="tel"
                                                id="customer_phone"
                                                name="customer_phone"
                                                value={form.customer_phone}
                                                onChange={handleInputChange}
                                                className="form-input"
                                                placeholder={t('enter_phone') || 'Enter phone number'}
                                                required
                                            />
                                        </div>

                                        {/* Service Type */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">{t('service_type') || 'Service Type'} (Optional)</label>
                                            <ServiceSelect
                                                selectedService={selectedService}
                                                onServiceSelect={(service) => {
                                                    setSelectedService(service);
                                                    if (service) {
                                                        const price = form.customer_type === 'private' ? service.price_private : service.price_business;
                                                        setForm((prev) => ({
                                                            ...prev,
                                                            service_type: service.id,
                                                            price: price.toString(),
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
                                                    {t('additional_services') || 'Additional Services'} {!form.service_type && <span className="text-red-500">*</span>}
                                                </label>
                                                <button type="button" onClick={addExtraServiceRow} className="btn btn-outline-primary btn-sm">
                                                    + {t('add_service') || 'Add Service'}
                                                </button>
                                            </div>

                                            {extraServices.length > 0 && (
                                                <div className="space-y-3">
                                                    {extraServices.map((row, index) => (
                                                        <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end border border-gray-200 dark:border-gray-700 rounded-md p-3">
                                                            <div>
                                                                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                                                                    {t('service') || 'Service'} <span className="text-red-500">*</span>
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
                                                                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">{t('quantity') || 'Quantity'}</label>
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
                                                                    {t('remove') || 'Remove'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        {/* Status */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                                {t('status') || 'Status'} <span className="text-red-500">*</span>
                                            </label>
                                            <StatusSelect
                                                value={form.status}
                                                onChange={(value) => setForm((prev) => ({ ...prev, status: value as any }))}
                                                type="booking"
                                                className="form-select"
                                                required
                                            />
                                        </div>

                                        {/* Price - Auto-calculated */}
                                        <div>
                                            <label htmlFor="price" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                                {t('price') || 'Price'}
                                            </label>
                                            <input
                                                type="number"
                                                id="price"
                                                name="price"
                                                value={form.price}
                                                readOnly
                                                className="form-input bg-gray-50 dark:bg-gray-900 cursor-not-allowed"
                                                placeholder="0.00"
                                            />
                                        </div>

                                        {/* Profit */}
                                        <div>
                                            <label htmlFor="profit" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                                {t('profit') || 'Profit'}
                                            </label>
                                            <input type="number" id="profit" name="profit" value={form.profit} onChange={handleInputChange} className="form-input" placeholder="0.00" />
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    <div>
                                        <label htmlFor="notes" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                            {t('notes') || 'Notes'}
                                        </label>
                                        <textarea
                                            id="notes"
                                            name="notes"
                                            value={form.notes}
                                            onChange={handleInputChange}
                                            className="form-textarea"
                                            rows={4}
                                            placeholder={t('enter_notes') || 'Enter additional notes'}
                                        />
                                    </div>

                                    {/* Service Address */}
                                    <div>
                                        <label htmlFor="service_address" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                            {t('service_address') || 'Service Address'} <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            id="service_address"
                                            name="service_address"
                                            value={form.service_address}
                                            onChange={handleInputChange}
                                            className="form-textarea"
                                            placeholder={t('enter_service_address') || 'Enter service address'}
                                            rows={4}
                                            required
                                        />
                                    </div>

                                    {/* Submit Button */}
                                    <div className="flex justify-end gap-4 mt-8">
                                        <button type="button" onClick={() => router.back()} className="btn btn-outline-danger">
                                            {t('cancel')}
                                        </button>
                                        <button type="submit" className="btn btn-primary" disabled={saving}>
                                            {saving ? t('updating') || 'Updating...' : t('update_booking') || 'Update Booking'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </Tab.Panel>

                        {/* Assignment Tab */}
                        <Tab.Panel>
                            <div className="panel ">
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {/* Assignment Mode */}
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">Assignment Mode</label>
                                            <AssignmentModeSelectAdd
                                                value={assignMode}
                                                onChange={(val) => {
                                                    setAssignMode(val);
                                                    if (val === 'contractor') {
                                                        setSelectedDriver(null);
                                                        setSelectedTruck(null);
                                                        setForm((prev) => ({ ...prev, driver_id: '', truck_id: '' }));
                                                    } else if (val === 'driver') {
                                                        setSelectedContractor(null);
                                                        setContractorPrice('');
                                                    }
                                                }}
                                                className="form-select"
                                            />
                                        </div>
                                        {/* Assign Truck (Always visible) */}
                                        {assignMode === 'driver' && (
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">{t('assign_truck') || 'Assign Truck'}</label>
                                                <TruckSelect
                                                    selectedTruck={selectedTruck}
                                                    onTruckSelect={(truck) => {
                                                        setSelectedTruck(truck);
                                                        if (truck) {
                                                            setForm((prev) => ({
                                                                ...prev,
                                                                truck_id: (truck as any).id,
                                                                driver_id: assignMode === 'driver' && (truck as any).driver_id ? (truck as any).driver_id : prev.driver_id,
                                                            }));
                                                            if (assignMode === 'driver' && (truck as any).driver_id) {
                                                                const driver = drivers.find((d) => d.id === (truck as any).driver_id);
                                                                if (driver) setSelectedDriver(driver);
                                                            }
                                                        } else {
                                                            setForm((prev) => ({ ...prev, truck_id: '' }));
                                                        }
                                                    }}
                                                    onCreateNew={() => router.push('/fleet/add')}
                                                    className="form-select"
                                                />
                                            </div>
                                        )}
                                        {/* Driver Assignment */}
                                        {assignMode === 'driver' && (
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">{t('assign_driver') || 'Assign Driver'}</label>
                                                <DriverSelect
                                                    selectedDriver={selectedDriver}
                                                    onDriverSelect={(driver) => {
                                                        setSelectedDriver(driver);
                                                        if (driver) {
                                                            setForm((prev) => ({ ...prev, driver_id: driver.id }));
                                                            const truck = trucks.find((t) => (t as any).driver_id === driver.id);
                                                            if (truck) {
                                                                setSelectedTruck(truck);
                                                                setForm((prev) => ({ ...prev, truck_id: (truck as any).id }));
                                                            }
                                                        } else {
                                                            setForm((prev) => ({ ...prev, driver_id: '' }));
                                                        }
                                                    }}
                                                    onCreateNew={() => router.push('/drivers/add')}
                                                    className="form-select"
                                                />
                                            </div>
                                        )}
                                        {/* Contractor Assignment */}
                                        {assignMode === 'contractor' && (
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">{t('contractor') || 'Contractor'}</label>
                                                <ContractorSelect
                                                    selectedContractor={selectedContractor as any}
                                                    onContractorSelect={(c) => {
                                                        setSelectedContractor(c);
                                                        if (!c) {
                                                            setContractorPrice('');
                                                        }
                                                    }}
                                                    onCreateNew={() => router.push('/contractors/add')}
                                                    className="form-select"
                                                />
                                                {selectedContractor && (
                                                    <div className="mt-3">
                                                        <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">Contractor Price You Pay</label>
                                                        <input type="number" className="form-input" placeholder="0" value={contractorPrice} onChange={(e) => setContractorPrice(e.target.value)} />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-end gap-4 mt-8">
                                        <button type="button" onClick={() => router.back()} className="btn btn-outline-danger">
                                            {t('cancel')}
                                        </button>
                                        <button type="submit" className="btn btn-primary" disabled={saving || hasInvoice}>
                                            {hasInvoice ? t('disabled') || 'Disabled' : saving ? t('updating') || 'Updating...' : t('update_booking') || 'Update Booking'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </Tab.Panel>

                        {/* Schedule Information Tab */}
                        <Tab.Panel>
                            <div className="panel">
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {/* Scheduled Date */}
                                        <div>
                                            <label htmlFor="scheduled_date" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                                {t('scheduled_date') || 'Scheduled Date'} <span className="text-red-500">*</span>
                                            </label>
                                            <input type="date" id="scheduled_date" name="scheduled_date" value={form.scheduled_date} onChange={handleInputChange} className="form-input" required />
                                        </div>

                                        {/* Scheduled Time */}
                                        <div>
                                            <label htmlFor="scheduled_time" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                                {t('scheduled_time') || 'Scheduled Time'} <span className="text-red-500">*</span>
                                            </label>
                                            <input type="time" id="scheduled_time" name="scheduled_time" value={form.scheduled_time} onChange={handleInputChange} className="form-input" required />
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-4 mt-8">
                                        <button type="button" onClick={() => router.back()} className="btn btn-outline-danger">
                                            {t('cancel')}
                                        </button>
                                        <button type="submit" className="btn btn-primary" disabled={saving}>
                                            {saving ? t('updating') || 'Updating...' : t('update_booking') || 'Update Booking'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </Tab.Panel>
                    </Tab.Panels>
                </Tab.Group>
            </div>
        </>
    );
};

export default EditBooking;
