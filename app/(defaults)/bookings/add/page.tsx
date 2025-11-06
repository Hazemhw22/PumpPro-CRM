'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { getTranslation } from '@/i18n';

interface Customer {
    id: string;
    name: string;
    phone: string;
    email?: string;
}

interface Truck {
    id: string;
    truck_number: string;
    license_plate: string;
}

interface Driver {
    id: string;
    name: string;
}

interface ServiceType {
    name: string;
    private_price: number;
    business_price: number;
}

const AddBooking = () => {
    const { t } = getTranslation();
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [trucks, setTrucks] = useState<Truck[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

    const serviceTypes: ServiceType[] = [
        { name: 'ניקוי שוחות', private_price: 800, business_price: 600 },
        { name: 'פתיחת סתימות', private_price: 600, business_price: 500 },
    ];

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
        status: 'pending' as 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled',
    });

    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    // Load data on mount
    useEffect(() => {
        const loadData = async () => {
            try {
                // @ts-ignore
                const { data: customersData } = await supabase.from('customers').select('id, name, phone, email');
                // @ts-ignore
                const { data: trucksData } = await supabase.from('trucks').select('id, truck_number, license_plate');
                // @ts-ignore
                const { data: driversData } = await supabase.from('drivers').select('id, name');

                if (customersData) setCustomers(customersData as any);
                if (trucksData) setTrucks(trucksData as any);
                if (driversData) setDrivers(driversData as any);
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
            const serviceType = name === 'service_type' ? value : form.service_type;
            const customerType = name === 'customer_type' ? value : form.customer_type;
            
            const selectedService = serviceTypes.find(s => s.name === serviceType);
            if (selectedService) {
                const price = customerType === 'private' ? selectedService.private_price : selectedService.business_price;
                setForm(prev => ({ ...prev, price: price.toString() }));
            }
        }
    };

    const handleCustomerSearch = (searchTerm: string) => {
        setForm(prev => ({ ...prev, customer_name: searchTerm }));
        if (searchTerm.length > 0) {
            const filtered = customers.filter(c => 
                c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.phone.includes(searchTerm)
            );
            setFilteredCustomers(filtered);
            setShowCustomerDropdown(true);
        } else {
            setShowCustomerDropdown(false);
        }
    };

    const selectCustomer = (customer: Customer) => {
        setForm(prev => ({
            ...prev,
            customer_id: customer.id,
            customer_name: customer.name,
            customer_phone: customer.phone,
            customer_email: customer.email || '',
        }));
        setShowCustomerDropdown(false);
    };

    const validateForm = () => {
        if (!form.booking_number.trim()) {
            setAlert({ visible: true, message: t('booking_number_required') || 'Booking number is required', type: 'danger' });
            return false;
        }
        if (!form.customer_name.trim()) {
            setAlert({ visible: true, message: t('customer_name_required') || 'Customer name is required', type: 'danger' });
            return false;
        }
        if (!form.customer_phone.trim()) {
            setAlert({ visible: true, message: t('phone_required') || 'Phone is required', type: 'danger' });
            return false;
        }
        if (!form.service_address.trim()) {
            setAlert({ visible: true, message: t('service_address_required') || 'Service address is required', type: 'danger' });
            return false;
        }
        if (!form.scheduled_date) {
            setAlert({ visible: true, message: t('scheduled_date_required') || 'Scheduled date is required', type: 'danger' });
            return false;
        }
        if (!form.scheduled_time) {
            setAlert({ visible: true, message: t('scheduled_time_required') || 'Scheduled time is required', type: 'danger' });
            return false;
        }
        if (!form.service_type.trim()) {
            setAlert({ visible: true, message: t('service_type_required') || 'Service type is required', type: 'danger' });
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
                booking_number: form.booking_number.trim(),
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
            const { data, error } = await supabase.from('bookings').insert([bookingData]).select();

            if (error) throw error;

            setAlert({ visible: true, message: t('booking_added_successfully') || 'Booking added successfully', type: 'success' });

            setTimeout(() => {
                router.push('/bookings');
            }, 1500);
        } catch (error) {
            console.error(error);
            setAlert({
                visible: true,
                message: error instanceof Error ? error.message : t('error_adding_booking') || 'Error adding booking',
                type: 'danger',
            });
        } finally {
            setSaving(false);
        }
    };

    return (
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

            {alert.visible && (
                <div className="mb-6">
                    <Alert
                        type={alert.type}
                        title={alert.type === 'success' ? t('success') : t('error')}
                        message={alert.message}
                        onClose={() => setAlert({ visible: false, message: '', type: 'success' })}
                    />
                </div>
            )}

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
                    <div className="relative">
                        <label htmlFor="customer_search" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                            Select Existing Customer (Optional)
                        </label>
                        <input
                            type="text"
                            id="customer_search"
                            value={form.customer_name}
                            onChange={(e) => handleCustomerSearch(e.target.value)}
                            className="form-input"
                            placeholder="Search customer..."
                            autoComplete="off"
                        />
                        {showCustomerDropdown && filteredCustomers.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                                {filteredCustomers.map((customer) => (
                                    <div
                                        key={customer.id}
                                        onClick={() => selectCustomer(customer)}
                                        className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                                    >
                                        <div className="font-semibold">{customer.name}</div>
                                        <div className="text-sm text-gray-500">{customer.phone}</div>
                                    </div>
                                ))}
                            </div>
                        )}
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
                            <label htmlFor="service_type" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                Service Type <span className="text-red-500">*</span>
                            </label>
                            <select id="service_type" name="service_type" value={form.service_type} onChange={handleInputChange} className="form-select" required>
                                <option value="">Select service</option>
                                {serviceTypes.map((service) => (
                                    <option key={service.name} value={service.name}>
                                        {service.name} - Private: ${service.private_price} | Business: ${service.business_price}
                                    </option>
                                ))}
                            </select>
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
                            <label htmlFor="truck_id" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                Assign Truck (Optional)
                            </label>
                            <select id="truck_id" name="truck_id" value={form.truck_id} onChange={handleInputChange} className="form-select">
                                <option value="">Select truck</option>
                                {trucks.map((truck) => (
                                    <option key={truck.id} value={truck.id}>
                                        {truck.truck_number} - {truck.license_plate}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Assign Driver */}
                        <div>
                            <label htmlFor="driver_id" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                Assign Driver (Optional)
                            </label>
                            <select id="driver_id" name="driver_id" value={form.driver_id} onChange={handleInputChange} className="form-select">
                                <option value="">Select driver</option>
                                {drivers.map((driver) => (
                                    <option key={driver.id} value={driver.id}>
                                        {driver.name}
                                    </option>
                                ))}
                            </select>
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
    );
};

export default AddBooking;
