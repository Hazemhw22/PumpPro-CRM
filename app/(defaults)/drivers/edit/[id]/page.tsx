'use client';
import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { getTranslation } from '@/i18n';

interface Driver {
    id: string;
    driver_number?: string;
    name?: string;
    phone?: string;
    email?: string;
    license_number?: string;
    license_expiry?: string;
    status?: 'active' | 'inactive' | 'on_leave';
    notes?: string;
    photo_url?: string;
}

export default function EditDriver() {
    const { t } = getTranslation();
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [driver, setDriver] = useState<Driver | null>(null);

    const [form, setForm] = useState({
        driver_number: '',
        name: '',
        phone: '',
        email: '',
        license_number: '',
        license_expiry: '',
        status: 'active' as 'active' | 'inactive' | 'on_leave',
        notes: '',
        photo_url: '',
    });

    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        if (id) fetchDriver();
    }, [id]);

    const fetchDriver = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('drivers').select('*').eq('id', id).single();
            if (error) throw error;
            if (data) {
                setDriver(data as Driver);
                setForm({
                    driver_number: (data as any).driver_number || '',
                    name: (data as any).name || '',
                    phone: (data as any).phone || '',
                    email: (data as any).email || '',
                    license_number: (data as any).license_number || '',
                    license_expiry: (data as any).license_expiry || '',
                    status: (data as any).status || 'active',
                    notes: (data as any).notes || '',
                    photo_url: (data as any).photo_url || '',
                });
            }
        } catch (err) {
            console.error('Error fetching driver:', err);
            setAlert({ visible: true, message: 'Failed to load driver', type: 'danger' });
        } finally {
            setLoading(false);
        }
    };

    const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) {
            setAlert({ visible: true, message: 'Driver name is required', type: 'danger' });
            return;
        }
        setSaving(true);
        try {
            const payload: any = {
                driver_number: form.driver_number.trim() || null,
                name: form.name.trim(),
                phone: form.phone.trim() || null,
                email: form.email.trim() || null,
                license_number: form.license_number.trim() || null,
                license_expiry: form.license_expiry || null,
                status: form.status,
                notes: form.notes || null,
                photo_url: form.photo_url || null,
            };

            const { error } = await (supabase as any).from('drivers').update(payload).eq('id', id);
            if (error) throw error;
            setAlert({ visible: true, message: 'Driver updated successfully', type: 'success' });
            setTimeout(() => router.push('/drivers'), 1200);
        } catch (err) {
            setAlert({ visible: true, message: err instanceof Error ? err.message : 'Error updating driver', type: 'danger' });
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

    if (!driver) {
        return (
            <div className="container mx-auto p-6">
                <div className="panel">
                    <p className="text-center text-danger">Driver not found</p>
                    <div className="mt-4 text-center">
                        <Link href="/drivers" className="btn btn-primary">
                            Back to Drivers
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
                        <Link href="/drivers" className="text-primary hover:underline">
                            Drivers
                        </Link>
                    </li>
                    <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                        <span>Edit Driver</span>
                    </li>
                </ul>
            </div>

            <div className="panel">
                <div className="mb-5 flex items-center justify-between">
                    <h5 className="text-lg font-semibold dark:text-white-light">Edit Driver</h5>
                    <Link href={`/drivers/preview/${id}`} className="btn btn-outline-info">
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
                        <div>
                            <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-white">Driver Number (Optional)</label>
                            <input type="text" name="driver_number" value={form.driver_number} onChange={onChange} className="form-input" placeholder="D001" />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-white">Name *</label>
                            <input type="text" name="name" value={form.name} onChange={onChange} className="form-input" placeholder="Driver Name" required />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-white">Phone</label>
                            <input type="tel" name="phone" value={form.phone} onChange={onChange} className="form-input" placeholder="+1234567890" />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-white">Email</label>
                            <input type="email" name="email" value={form.email} onChange={onChange} className="form-input" placeholder="driver@example.com" />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-white">License Number</label>
                            <input type="text" name="license_number" value={form.license_number} onChange={onChange} className="form-input" placeholder="License Number" />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-white">License Expiry</label>
                            <input type="date" name="license_expiry" value={form.license_expiry} onChange={onChange} className="form-input" />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-white">Status</label>
                            <select name="status" value={form.status} onChange={onChange} className="form-select">
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="on_leave">On Leave</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-white">Notes (Optional)</label>
                            <textarea name="notes" value={form.notes} onChange={onChange} className="form-textarea" rows={4} placeholder="Notes" />
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-4">
                        <Link href="/drivers" className="btn btn-outline-danger">
                            {t('cancel')}
                        </Link>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Saving...' : 'Update Driver'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
