'use client';
import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { getTranslation } from '@/i18n';

interface Service {
    id: string;
    name?: string;
    description?: string;
    price_private?: number;
    price_business?: number;
    active?: boolean;
}

export default function EditService() {
    const { t } = getTranslation();
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [service, setService] = useState<Service | null>(null);

    const [form, setForm] = useState({
        name: '',
        description: '',
        price_private: '',
        price_business: '',
        active: true,
    });

    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        if (id) fetchService();
    }, [id]);

    const fetchService = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('services').select('*').eq('id', id).single();
            if (error) throw error;
            if (data) {
                setService(data as Service);
                setForm({
                    name: (data as any).name || '',
                    description: (data as any).description || '',
                    price_private: (data as any).price_private ? String((data as any).price_private) : '',
                    price_business: (data as any).price_business ? String((data as any).price_business) : '',
                    active: (data as any).active !== false,
                });
            }
        } catch (err) {
            console.error('Error fetching service:', err);
            setAlert({ visible: true, message: 'Failed to load service', type: 'danger' });
        } finally {
            setLoading(false);
        }
    };

    const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            setForm((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else {
            setForm((prev) => ({ ...prev, [name]: value }));
        }
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) {
            setAlert({ visible: true, message: 'Service name is required', type: 'danger' });
            return;
        }
        setSaving(true);
        try {
            const payload: any = {
                name: form.name.trim(),
                description: form.description.trim() || null,
                price_private: form.price_private ? Number(form.price_private) : null,
                price_business: form.price_business ? Number(form.price_business) : null,
                active: form.active,
            };

            const { error } = await (supabase as any).from('services').update(payload).eq('id', id);
            if (error) throw error;
            setAlert({ visible: true, message: 'Service updated successfully', type: 'success' });
            setTimeout(() => router.push('/services'), 1200);
        } catch (err) {
            setAlert({ visible: true, message: err instanceof Error ? err.message : 'Error updating service', type: 'danger' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <span className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-primary border-l-transparent"></span>
            </div>
        );
    }

    if (!service) {
        return (
            <div className="container mx-auto p-6">
                <div className="panel">
                    <p className="text-center text-danger">Service not found</p>
                    <div className="mt-4 text-center">
                        <Link href="/services" className="btn btn-primary">
                            Back to Services
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
            <div className="mb-6 flex items-center gap-5">
                <div onClick={() => router.back()}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mb-4 cursor-pointer text-primary rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </div>
                <ul className="mb-4 flex space-x-2 rtl:space-x-reverse">
                    <li>
                        <Link href="/" className="text-primary hover:underline">
                            {t('home')}
                        </Link>
                    </li>
                    <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                        <Link href="/services" className="text-primary hover:underline">
                            Services
                        </Link>
                    </li>
                    <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                        <span>Edit Service</span>
                    </li>
                </ul>
            </div>

            <div className="panel">
                <div className="mb-5 flex items-center justify-between">
                    <h5 className="text-lg font-semibold dark:text-white-light">Edit Service</h5>
                    <Link href={`/services/preview/${id}`} className="btn btn-outline-info">
                        View Details
                    </Link>
                </div>

                {alert.visible && (
                    <div className="mb-4">
                        <Alert type={alert.type} message={alert.message} onClose={() => setAlert({ ...alert, visible: false })} />
                    </div>
                )}

                <form onSubmit={onSubmit}>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                            <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-white">Service Name *</label>
                            <input type="text" name="name" value={form.name} onChange={onChange} className="form-input" placeholder="e.g. Fuel Delivery" required />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-white">Price for Private Customers</label>
                            <input type="number" step="0.01" name="price_private" value={form.price_private} onChange={onChange} className="form-input" placeholder="0.00" />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-white">Price for Business Customers</label>
                            <input type="number" step="0.01" name="price_business" value={form.price_business} onChange={onChange} className="form-input" placeholder="0.00" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-white">Description</label>
                            <textarea name="description" value={form.description} onChange={onChange} className="form-textarea" rows={4} placeholder="Service description..." />
                        </div>
                        <div className="md:col-span-2">
                            <label className="flex items-center cursor-pointer">
                                <input type="checkbox" name="active" checked={form.active} onChange={onChange} className="form-checkbox" />
                                <span className="ml-2 text-sm font-bold text-gray-700 dark:text-white">Active</span>
                            </label>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-4">
                        <Link href="/services" className="btn btn-outline-danger">
                            {t('cancel')}
                        </Link>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Saving...' : 'Update Service'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
