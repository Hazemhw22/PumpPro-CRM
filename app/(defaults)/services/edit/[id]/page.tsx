'use client';
import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { getTranslation } from '@/i18n';
import { Tab } from '@headlessui/react';
import IconBox from '@/components/icon/icon-box';
import IconDollarSign from '@/components/icon/icon-dollar-sign';
import IconSettings from '@/components/icon/icon-settings';

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

            <div className="mb-6">
                <h1 className="text-2xl font-bold">Edit Service</h1>
                <p className="text-gray-500">Update service information</p>
            </div>

            {alert.visible && (
                <div className="mb-4">
                    <Alert type={alert.type} message={alert.message} onClose={() => setAlert({ ...alert, visible: false })} />
                </div>
            )}

            <Tab.Group>
                <Tab.List className="mt-3 flex flex-wrap border-b border-white-light dark:border-[#191e3a]">
                    <Tab as="div" className="flex-1">
                        {({ selected }) => (
                            <button
                                type="button"
                                className={`${
                                    selected ? 'text-primary !outline-none before:!w-full' : ''
                                } relative -mb-[1px] flex w-full items-center justify-center border-b border-transparent p-5 py-3 before:absolute before:bottom-0 before:left-0 before:right-0 before:m-auto before:inline-block before:h-[1px] before:w-0 before:bg-primary before:transition-all before:duration-700 hover:text-primary hover:before:w-full`}
                            >
                                <IconBox className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                                Basic Information
                            </button>
                        )}
                    </Tab>
                    <Tab as="div" className="flex-1">
                        {({ selected }) => (
                            <button
                                type="button"
                                className={`${
                                    selected ? 'text-primary !outline-none before:!w-full' : ''
                                } relative -mb-[1px] flex w-full items-center justify-center border-b border-transparent p-5 py-3 before:absolute before:bottom-0 before:left-0 before:right-0 before:m-auto before:inline-block before:h-[1px] before:w-0 before:bg-primary before:transition-all before:duration-700 hover:text-primary hover:before:w-full`}
                            >
                                <IconDollarSign className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                                Pricing
                            </button>
                        )}
                    </Tab>
                    <Tab as="div" className="flex-1">
                        {({ selected }) => (
                            <button
                                type="button"
                                className={`${
                                    selected ? 'text-primary !outline-none before:!w-full' : ''
                                } relative -mb-[1px] flex w-full items-center justify-center border-b border-transparent p-5 py-3 before:absolute before:bottom-0 before:left-0 before:right-0 before:m-auto before:inline-block before:h-[1px] before:w-0 before:bg-primary before:transition-all before:duration-700 hover:text-primary hover:before:w-full`}
                            >
                                <IconSettings className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                                Status & Settings
                            </button>
                        )}
                    </Tab>
                </Tab.List>

                <Tab.Panels className="mt-5">
                    {/* Basic Information Tab */}
                    <Tab.Panel>
                        <div className="panel">
                            <form onSubmit={onSubmit}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-white">Service Name <span className="text-red-500">*</span></label>
                                        <input type="text" name="name" value={form.name} onChange={onChange} className="form-input" placeholder="e.g. Fuel Delivery" required />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-white">Description</label>
                                        <textarea name="description" value={form.description} onChange={onChange} className="form-textarea" rows={4} placeholder="Service description..." />
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
                    </Tab.Panel>

                    {/* Pricing Tab */}
                    <Tab.Panel>
                        <div className="panel">
                            <form onSubmit={onSubmit}>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-white">Price for Private Customers</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                            <input type="number" step="0.01" name="price_private" value={form.price_private} onChange={onChange} className="form-input pl-8" placeholder="0.00" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-white">Price for Business Customers</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                            <input type="number" step="0.01" name="price_business" value={form.price_business} onChange={onChange} className="form-input pl-8" placeholder="0.00" />
                                        </div>
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
                    </Tab.Panel>

                    {/* Status & Settings Tab */}
                    <Tab.Panel>
                        <div className="panel">
                            <form onSubmit={onSubmit}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="flex items-center cursor-pointer">
                                            <input type="checkbox" name="active" checked={form.active} onChange={onChange} className="form-checkbox" />
                                            <span className="ml-2 text-sm font-bold text-gray-700 dark:text-white">Active Service</span>
                                        </label>
                                        <p className="mt-1 text-xs text-gray-500">Inactive services will not be available for new bookings</p>
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
                    </Tab.Panel>
                </Tab.Panels>
            </Tab.Group>
        </div>
    );
}
