'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { getTranslation } from '@/i18n';

export default function AddDriver() {
    const { t } = getTranslation();
    const router = useRouter();
    const [saving, setSaving] = useState(false);

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

    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string>('');

    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const onPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setPhotoFile(file);
        if (file) setPhotoPreview(URL.createObjectURL(file));
        else setPhotoPreview('');
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
                photo_url: null,
            };

            // Upload photo if provided
            if (photoFile) {
                const ext = photoFile.name.split('.').pop();
                const path = `drivers/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
                const { error: uploadError } = await (supabase as any).storage.from('drivers').upload(path, photoFile, { upsert: true });
                if (uploadError) throw uploadError;
                const { data: pub } = (supabase as any).storage.from('drivers').getPublicUrl(path);
                payload.photo_url = pub?.publicUrl || null;
            }

            const { error } = await (supabase as any).from('drivers').insert([payload]);
            if (error) throw error;
            setAlert({ visible: true, message: 'Driver added successfully', type: 'success' });
            setTimeout(() => router.push('/drivers'), 1200);
        } catch (err) {
            setAlert({ visible: true, message: err instanceof Error ? err.message : 'Error adding driver', type: 'danger' });
        } finally {
            setSaving(false);
        }
    };

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
                        <span>Add New Driver</span>
                    </li>
                </ul>
            </div>

            <div className="panel">
                <div className="mb-5 flex items-center justify-between">
                    <h5 className="text-lg font-semibold dark:text-white-light">Add New Driver</h5>
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
                            <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-white">Driver Photo</label>
                            <div className="flex items-center gap-4">
                                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                    {photoPreview ? (
                                        <img src={photoPreview} alt="preview" className="h-full w-full object-cover" />
                                    ) : (
                                        <img src={form.photo_url || '/assets/images/auth/user.png'} alt="placeholder" className="h-full w-full object-cover" />
                                    )}
                                </div>
                                <input type="file" accept="image/*" onChange={onPhotoChange} className="form-input file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-primary file:text-white" />
                            </div>
                            <p className="mt-1 text-xs text-gray-500">PNG, JPG, GIF up to 2MB</p>
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
                            {saving ? 'Saving...' : 'Create Driver'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
