'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { getTranslation } from '@/i18n';

interface Customer {
    id: string;
    type: 'private' | 'business';
    name?: string;
    business_name?: string;
    phone: string;
    email?: string;
    address?: string;
    tax_id?: string;
    notes?: string;
}

const EditCustomer = () => {
    const { t } = getTranslation();
    const router = useRouter();
    const params = useParams();
    const customerId = params?.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [customerType, setCustomerType] = useState<'private' | 'business'>('private');

    const [form, setForm] = useState({
        type: 'private' as 'private' | 'business',
        phone: '',
        email: '',
        address: '',
        notes: '',
        name: '',
        business_name: '',
        tax_id: '',
    });

    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        const fetchCustomer = async () => {
            try {
                // @ts-ignore
                const { data, error } = await supabase.from('customers').select('*').eq('id', customerId).single();

                if (error) throw error;

                if (data) {
                    const customerData = data as any;
                    setCustomer(customerData);
                    setCustomerType(customerData.type || 'private');
                    setForm({
                        type: customerData.type || 'private',
                        phone: customerData.phone || '',
                        email: customerData.email || '',
                        address: customerData.address || '',
                        notes: customerData.notes || '',
                        name: customerData.name || '',
                        business_name: customerData.business_name || '',
                        tax_id: customerData.tax_id || '',
                    });
                }
            } catch (error) {
                console.error('Error fetching customer:', error);
                setAlert({ visible: true, message: 'Error loading data', type: 'danger' });
            } finally {
                setLoading(false);
            }
        };

        if (customerId) {
            fetchCustomer();
        }
    }, [customerId]);

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
                customerData.business_name = null;
                customerData.tax_id = null;
            } else {
                customerData.business_name = form.business_name.trim();
                customerData.tax_id = form.tax_id.trim() || null;
                customerData.name = null;
            }

            // @ts-ignore
            const { error } = await supabase.from('customers').update(customerData).eq('id', customerId);

            if (error) throw error;

            setAlert({ visible: true, message: 'Customer updated successfully', type: 'success' });

            setTimeout(() => {
                router.push('/customers');
            }, 1500);
        } catch (error) {
            console.error(error);
            setAlert({
                visible: true,
                message: error instanceof Error ? error.message : 'Error updating customer',
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
                <span className="ml-3">Loading...</span>
            </div>
        );
    }

    if (!customer) {
        return (
            <div className="flex flex-col items-center justify-center h-80">
                <p className="text-xl font-bold mb-2">Customer not found</p>
                <button onClick={() => router.push('/customers')} className="btn btn-primary mt-4">
                    Back to Customers
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
                        <Link href="/customers" className="text-primary hover:underline">
                            Customers
                        </Link>
                    </li>
                    <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                        <span>Edit Customer</span>
                    </li>
                </ul>
            </div>

            <div className="mb-6">
                <h1 className="text-2xl font-bold">Edit Customer</h1>
                <p className="text-gray-500">Update customer information</p>
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
                            {saving ? 'Updating...' : 'Update Customer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditCustomer;
