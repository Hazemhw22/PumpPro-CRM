'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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

interface Service {
    id: string;
    name: string;
    price_private?: number;
    price_business?: number;
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
    status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
    service_type: string;
    price?: number;
    profit?: number;
    truck_id?: string;
    driver_id?: string;
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

    const [form, setForm] = useState({
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

    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                // Load customers and services
                // @ts-ignore
                const { data: customersData } = await supabase.from('customers').select('id, name, phone, email');
                // @ts-ignore
                const { data: servicesData } = await supabase.from('services').select('id, name, price_private, price_business').eq('active', true);

                if (customersData) setCustomers(customersData as any);
                if (servicesData) setServices(servicesData as any);

                // Load booking
                // @ts-ignore
                const { data, error } = await supabase.from('bookings').select('*').eq('id', bookingId).single();

                if (error) throw error;

                if (data) {
                    const bookingData = data as any;
                    setBooking(bookingData);
                    setForm({
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
                }
            } catch (error) {
                console.error('Error loading data:', error);
                setAlert({ visible: true, message: t('error_loading_data'), type: 'danger' });
            } finally {
                setLoading(false);
            }
        };

        if (bookingId) {
            loadData();
        }
    }, [bookingId]);

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
        if (!form.customer_id) {
            setAlert({ visible: true, message: t('customer_required') || 'Customer is required', type: 'danger' });
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
        if (!form.service_type) {
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
                customer_type: form.customer_type,
                customer_id: form.customer_id || null,
                customer_name: form.customer_name.trim(),
                customer_phone: form.customer_phone.trim(),
                service_address: form.service_address.trim(),
                scheduled_date: form.scheduled_date,
                scheduled_time: form.scheduled_time,
                status: form.status,
                service_type: form.service_type.trim(),
            };

            // @ts-ignore - Supabase type inference issue
            const { error } = await supabase.from('bookings').update(bookingData).eq('id', bookingId);

            if (error) throw error;

            setAlert({ visible: true, message: t('booking_updated_successfully') || 'Booking updated successfully', type: 'success' });

            setTimeout(() => {
                router.push('/bookings');
            }, 1500);
        } catch (error) {
            console.error(error);
            setAlert({
                visible: true,
                message: error instanceof Error ? error.message : t('error_updating_booking') || 'Error updating booking',
                type: 'danger',
            });
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                        {/* Customer Name */}
                        <div>
                            <label htmlFor="customer_id" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                {t('customer_name') || 'Customer Name'} <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="customer_id"
                                name="customer_id"
                                value={form.customer_id}
                                onChange={handleInputChange}
                                className="form-select"
                                required
                            >
                                <option value="">-- Select Customer --</option>
                                {customers.map((customer) => (
                                    <option key={customer.id} value={customer.id}>
                                        {customer.name} 
                                    </option>
                                ))}
                            </select>
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
                            <label htmlFor="service_type" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                {t('service_type') || 'Service Type'} <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="service_type"
                                name="service_type"
                                value={form.service_type}
                                onChange={handleInputChange}
                                className="form-select"
                                required
                            >
                                <option value="">-- Select Service --</option>
                                {services.map((service: Service) => (
                                    <option key={service.id} value={service.id}>
                                        {service.name}
                                    </option>
                                ))}
                            </select>
                        </div>

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

                        {/* Status */}
                        <div>
                            <label htmlFor="status" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                {t('status') || 'Status'} <span className="text-red-500">*</span>
                            </label>
                            <select id="status" name="status" value={form.status} onChange={handleInputChange} className="form-select" required>
                                <option value="pending">{t('pending') || 'Pending'}</option>
                                <option value="confirmed">{t('confirmed') || 'Confirmed'}</option>
                                <option value="in_progress">{t('in_progress') || 'In Progress'}</option>
                                <option value="completed">{t('completed') || 'Completed'}</option>
                                <option value="cancelled">{t('cancelled') || 'Cancelled'}</option>
                            </select>
                        </div>
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
        </div>
    );
};

export default EditBooking;
