'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { getTranslation } from '@/i18n';

const AddCustomer = () => {
    const { t } = getTranslation();
    const router = useRouter();
    const [saving, setSaving] = useState(false);

    const [customerType, setCustomerType] = useState<'private' | 'business'>('private');

    const [form, setForm] = useState({
        // Common fields
        type: 'private' as 'private' | 'business',
        phone: '',
        email: '',
        address: '',
        notes: '',
        
        // Private customer fields
        name: '',
        
        // Business customer fields
        business_name: '',
        tax_id: '',
    });

    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleCustomerTypeChange = (type: 'private' | 'business') => {
        setCustomerType(type);
        setForm((prev) => ({ ...prev, type: type }));
    };

    const validateForm = () => {
        if (customerType === 'private') {
            if (!form.name.trim()) {
                setAlert({ visible: true, message: 'Name is required', type: 'danger' });
                return false;
            }
        } else {
            if (!form.business_name.trim()) {
                setAlert({ visible: true, message: 'Business name is required', type: 'danger' });
                return false;
            }
        }
        
        if (!form.phone.trim()) {
            setAlert({ visible: true, message: 'Phone is required', type: 'danger' });
            return false;
        }
        
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setSaving(true);
        try {
            const customerData: any = {
                type: customerType,
                phone: form.phone.trim(),
                email: form.email.trim() || null,
                address: form.address.trim() || null,
                notes: form.notes.trim() || null,
            };

            if (customerType === 'private') {
                customerData.name = form.name.trim();
            } else {
                customerData.business_name = form.business_name.trim();
                customerData.tax_id = form.tax_id.trim() || null;
            }

            // @ts-ignore
            const { data, error } = await supabase.from('customers').insert([customerData]).select();

            if (error) throw error;

            setAlert({ visible: true, message: 'Customer added successfully', type: 'success' });

            setTimeout(() => {
                router.push('/customers');
            }, 1500);
        } catch (error) {
            console.error(error);
            setAlert({
                visible: true,
                message: error instanceof Error ? error.message : 'Error adding customer',
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
                        <Link href="/customers" className="text-primary hover:underline">
                            Customers
                        </Link>
                    </li>
                    <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                        <span>Create Customer</span>
                    </li>
                </ul>
            </div>

            <div className="mb-6">
                <h1 className="text-2xl font-bold">Create Customer</h1>
                <p className="text-gray-500">Add a new customer to your system</p>
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
                    <h5 className="text-lg font-semibold dark:text-white-light">Customer Information</h5>
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
                                    checked={customerType === 'private'}
                                    onChange={() => handleCustomerTypeChange('private')}
                                    className="form-radio text-primary"
                                />
                                <span className="ltr:ml-2 rtl:mr-2">Private</span>
                            </label>
                            <label className="flex items-center cursor-pointer">
                                <input
                                    type="radio"
                                    name="customer_type"
                                    value="business"
                                    checked={customerType === 'business'}
                                    onChange={() => handleCustomerTypeChange('business')}
                                    className="form-radio text-primary"
                                />
                                <span className="ltr:ml-2 rtl:mr-2">Business</span>
                            </label>
                        </div>
                    </div>

                    {/* Private Customer Fields */}
                    {customerType === 'private' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Name */}
                            <div>
                                <label htmlFor="name" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                    Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={form.name}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Enter name"
                                    required
                                />
                            </div>

                            {/* Phone */}
                            <div>
                                <label htmlFor="phone" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                    Phone <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    value={form.phone}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Enter phone number"
                                    required
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label htmlFor="email" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                    Email (Optional)
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Enter email"
                                />
                            </div>

                            {/* Address */}
                            <div>
                                <label htmlFor="address" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                    Address (Optional)
                                </label>
                                <input
                                    type="text"
                                    id="address"
                                    name="address"
                                    value={form.address}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Enter address"
                                />
                            </div>
                        </div>
                    )}

                    {/* Business Customer Fields */}
                    {customerType === 'business' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Business Name */}
                            <div>
                                <label htmlFor="business_name" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                    Business Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="business_name"
                                    name="business_name"
                                    value={form.business_name}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Enter business name"
                                    required
                                />
                            </div>


                            {/* Phone */}
                            <div>
                                <label htmlFor="phone" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                    Phone <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    value={form.phone}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Enter phone number"
                                    required
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label htmlFor="email" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                    Email (Optional)
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Enter email"
                                />
                            </div>

                            {/* Tax ID */}
                            <div>
                                <label htmlFor="tax_id" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                    Tax ID (Optional)
                                </label>
                                <input
                                    type="text"
                                    id="tax_id"
                                    name="tax_id"
                                    value={form.tax_id}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Enter tax ID"
                                />
                            </div>

                            {/* Address */}
                            <div>
                                <label htmlFor="address" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                    Address (Optional)
                                </label>
                                <input
                                    type="text"
                                    id="address"
                                    name="address"
                                    value={form.address}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Enter address"
                                />
                            </div>
                        </div>
                    )}

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
                            {saving ? 'Creating...' : 'Create Customer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddCustomer;
