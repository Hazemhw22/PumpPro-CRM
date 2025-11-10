'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import AlertContainer from '@/components/elements/alerts/alert-container';
import CustomerSelect from '@/components/customer-select/customer-select';
import ServiceSelect from '@/components/service-select/service-select';
import TruckSelect from '@/components/truck-select/truck-select';
import DriverSelect from '@/components/driver-select/driver-select';
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
    const [services, setServices] = useState<Service[]>([]);

    const [form, setForm] = useState({
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
        status: 'pending' as 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled',
    });

    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [selectedTruck, setSelectedTruck] = useState<Truck | null>(null);
    const [selectedDriver, setSelectedDriver] = useState<{ id: string; name: string; phone: string; license_number: string | null; status: 'active' | 'inactive' | 'on_leave' } | null>(null);
    const [alerts, setAlerts] = useState<Array<{ id: string; type: 'success' | 'danger' | 'warning' | 'info'; message: string; title?: string }>>([]);
    
    const addAlert = (type: 'success' | 'danger' | 'warning' | 'info', message: string, title?: string) => {
        const id = Date.now().toString();
        setAlerts(prev => [...prev, { id, type, message, title }]);
    };
    
    const removeAlert = (id: string) => {
        setAlerts(prev => prev.filter(alert => alert.id !== id));
    };

    // Load data on mount
    useEffect(() => {
        const loadData = async () => {
            try {
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
            } catch (error) {
                console.error('Error loading data:', error);
            }
        };
        loadData();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));

        // Auto-fill price based on service type and customer type
        if (name === 'service_type' || name === 'customer_type') {
            const serviceId = name === 'service_type' ? value : form.service_type;
            const customerType = name === 'customer_type' ? value : form.customer_type;
            
            const selectedService = services.find((s: Service) => s.id === serviceId);
            if (selectedService) {
                const price = customerType === 'private' ? selectedService.price_private : selectedService.price_business;
                setForm(prev => ({ ...prev, price: price ? price.toString() : '' }));
            }
        }

        // Auto-fill driver when selecting truck
        if (name === 'truck_id' && value) {
            const selectedTruck = trucks.find((t: Truck) => t.id === value);
            if (selectedTruck && selectedTruck.driver_id) {
                setForm(prev => ({ ...prev, driver_id: selectedTruck.driver_id || '' }));
            }
        }

        // Auto-fill customer data when selecting from dropdown
        if (name === 'customer_id' && value) {
            const selectedCustomer = customers.find((c: Customer) => c.id === value);
            if (selectedCustomer) {
                setForm(prev => ({
                    ...prev,
                    customer_name: selectedCustomer.name,
                    customer_phone: selectedCustomer.phone,
                    customer_email: selectedCustomer.email || '',
                }));
            }
        }
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
        if (!form.service_type.trim()) {
            addAlert('danger', t('service_type_required') || 'Service type is required', 'Error');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setSaving(true);
        try {
            const bookingData = {
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
                truck_id: form.truck_id || null,
                driver_id: form.driver_id || null,
                notes: form.notes.trim() || null,
                status: form.status,
            };

            // @ts-ignore - Supabase type inference issue
            const { data: bookingResult, error: bookingError } = await supabase.from('bookings').insert([bookingData]).select();

            if (bookingError) throw bookingError;
            
            if (!bookingResult || bookingResult.length === 0) {
                throw new Error('Failed to create booking');
            }

            const newBooking = bookingResult[0] as any;

            // Create invoice automatically for the booking
            const invoiceData = {
                booking_id: newBooking.id,
                customer_id: form.customer_id || null,
                total_amount: parseFloat(form.price) || 0,
                paid_amount: 0,
                remaining_amount: parseFloat(form.price) || 0,
                status: 'pending',
                due_date: new Date(new Date(form.scheduled_date).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days after booking
            };

            // @ts-ignore
            const { error: invoiceError } = await supabase.from('invoices').insert([invoiceData]);

            if (invoiceError) {
                console.error('Error creating invoice:', invoiceError);
                // Don't throw error, booking was created successfully
            }

            addAlert('success', t('booking_added_successfully') || 'Booking and invoice created successfully', 'Success');

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
                            Select Existing Customer (Optional)
                        </label>
                        <CustomerSelect
                            selectedCustomer={selectedCustomer}
                            onCustomerSelect={(customer) => {
                                setSelectedCustomer(customer);
                                if (customer) {
                                    setForm(prev => ({
                                        ...prev,
                                        customer_id: customer.id,
                                        customer_name: customer.name,
                                        customer_phone: customer.phone,
                                        customer_email: (customer as any).email || '',
                                    }));
                                } else {
                                    setForm(prev => ({
                                        ...prev,
                                        customer_id: '',
                                        customer_name: '',
                                        customer_phone: '',
                                        customer_email: '',
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
                                Email (Optional)
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
                                Service Address <span className="text-red-500">*</span>
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

                        {/* Date */}
                        <div>
                            <label htmlFor="scheduled_date" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                Date <span className="text-red-500">*</span>
                            </label>
                            <input type="date" id="scheduled_date" name="scheduled_date" value={form.scheduled_date} onChange={handleInputChange} className="form-input" required />
                        </div>

                        {/* Time */}
                        <div>
                            <label htmlFor="scheduled_time" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                Time <span className="text-red-500">*</span>
                            </label>
                            <input type="time" id="scheduled_time" name="scheduled_time" value={form.scheduled_time} onChange={handleInputChange} className="form-input" required />
                        </div>

                        {/* Service Type */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                Service Type <span className="text-red-500">*</span>
                            </label>
                            <ServiceSelect
                                selectedService={selectedService}
                                onServiceSelect={(service) => {
                                    setSelectedService(service);
                                    if (service) {
                                        setForm(prev => ({
                                            ...prev,
                                            service_type: service.id,
                                            price: (form.customer_type === 'private' ? service.price_private : service.price_business).toString()
                                        }));
                                    } else {
                                        setForm(prev => ({ ...prev, service_type: '', price: '' }));
                                    }
                                }}
                                onCreateNew={() => router.push('/services/add')}
                                customerType={form.customer_type}
                                className="form-select"
                            />
                        </div>

                        {/* Price */}
                        <div>
                            <label htmlFor="price" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                Price ($) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                id="price"
                                name="price"
                                value={form.price}
                                onChange={handleInputChange}
                                className="form-input"
                                placeholder="0"
                                required
                            />
                        </div>

                        {/* Profit - Admin Only */}
                        <div>
                            <label htmlFor="profit" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                Profit ($) - Admin Only
                            </label>
                            <input
                                type="number"
                                id="profit"
                                name="profit"
                                value={form.profit}
                                onChange={handleInputChange}
                                className="form-input"
                                placeholder="0"
                            />
                        </div>

                        {/* Assign Truck */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                Assign Truck (Optional)
                            </label>
                            <TruckSelect
                                selectedTruck={selectedTruck as any}
                                onTruckSelect={(truck) => {
                                    setSelectedTruck(truck as any);
                                    if (truck) {
                                        setForm(prev => ({
                                            ...prev,
                                            truck_id: truck.id,
                                            driver_id: truck.driver_id || prev.driver_id
                                        }));
                                        // Auto-select driver if truck has one assigned
                                        if (truck.driver_id) {
                                            const driver = drivers.find(d => d.id === truck.driver_id);
                                            if (driver) {
                                                setSelectedDriver(driver as any);
                                            }
                                        }
                                    } else {
                                        setForm(prev => ({ ...prev, truck_id: '' }));
                                    }
                                }}
                                onCreateNew={() => router.push('/fleet/add')}
                                className="form-select"
                            />
                        </div>

                        {/* Assign Driver */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                Assign Driver (Optional)
                            </label>
                            <DriverSelect
                                selectedDriver={selectedDriver}
                                onDriverSelect={(driver) => {
                                    setSelectedDriver(driver);
                                    if (driver) {
                                        setForm(prev => ({ ...prev, driver_id: driver.id }));
                                    } else {
                                        setForm(prev => ({ ...prev, driver_id: '' }));
                                    }
                                }}
                                onCreateNew={() => router.push('/drivers/add')}
                                className="form-select"
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label htmlFor="notes" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                            Notes (Optional)
                        </label>
                        <textarea
                            id="notes"
                            name="notes"
                            value={form.notes}
                            onChange={handleInputChange}
                            className="form-textarea"
                            placeholder="Enter any additional notes..."
                            rows={4}
                        />
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
