'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { getTranslation } from '@/i18n';

export default function AddTruck() {
    const { t } = getTranslation();
    const router = useRouter();
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        truck_number: '',
        license_plate: '',
        capacity_gallons: '',
        status: 'available' as 'available' | 'in_use' | 'maintenance' | 'out_of_service',
        purchase_date: '',
        last_maintenance: '',
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
        if (!form.truck_number.trim() || !form.license_plate.trim()) {
            setAlert({ visible: true, message: 'Truck number and license plate are required', type: 'danger' });
            return;
        }
        setSaving(true);
        try {
            const payload: any = {
                truck_number: form.truck_number.trim(),
                license_plate: form.license_plate.trim(),
                capacity_gallons: form.capacity_gallons ? Number(form.capacity_gallons) : null,
                status: form.status,
                purchase_date: form.purchase_date || null,
                last_maintenance: form.last_maintenance || null,
                notes: form.notes || null,
                photo_url: null,
            };

            // Upload photo if provided
            if (photoFile) {
                const ext = photoFile.name.split('.').pop();
                const path = `photos/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
                const { error: uploadError } = await (supabase as any).storage.from('trucks').upload(path, photoFile, { upsert: true });
                if (uploadError) throw uploadError;
                const { data: pub } = (supabase as any).storage.from('trucks').getPublicUrl(path);
                payload.photo_url = pub?.publicUrl || null;
            }

            const { error } = await (supabase as any).from('trucks').insert([payload]);
            if (error) throw error;
            setAlert({ visible: true, message: 'Truck added successfully', type: 'success' });
            setTimeout(() => router.push('/fleet'), 1200);
        } catch (err) {
            setAlert({ visible: true, message: err instanceof Error ? err.message : 'Error adding truck', type: 'danger' });
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
                        <Link href="/fleet" className="text-primary hover:underline">
                            Fleet
                        </Link>
                    </li>
                    <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                        <span>Add Truck</span>
                    </li>
                </ul>
            </div>

            <div className="mb-6">
                <h1 className="text-2xl font-bold">Add New Truck</h1>
                <p className="text-gray-500">Create a new fleet vehicle</p>
            </div>

            {alert.visible && (
                <div className="mb-6">
                    <Alert type={alert.type} title={alert.type === 'success' ? t('success') : t('error')} message={alert.message} onClose={() => setAlert({ visible: false, message: '', type: 'success' })} />
                </div>
            )}

            <div className="panel">
                <div className="mb-5">
                    <h5 className="text-lg font-semibold dark:text-white-light">Truck Information</h5>
                </div>

                <form onSubmit={onSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-white">Truck Number *</label>
                            <input name="truck_number" value={form.truck_number} onChange={onChange} className="form-input" placeholder="e.g. 123456" required />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-white">License Plate *</label>
                            <input name="license_plate" value={form.license_plate} onChange={onChange} className="form-input" placeholder="e.g. 85-222-22" required />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-white">Capacity (Gallons)</label>
                            <input name="capacity_gallons" value={form.capacity_gallons} onChange={onChange} className="form-input" placeholder="e.g. 500" />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-white">Status</label>
                            <select name="status" value={form.status} onChange={onChange} className="form-select">
                                <option value="available">Available</option>
                                <option value="in_use">In Use</option>
                                <option value="maintenance">Maintenance</option>
                                <option value="out_of_service">Out of Service</option>
                            </select>
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-white">Purchase Date</label>
                            <input type="date" name="purchase_date" value={form.purchase_date} onChange={onChange} className="form-input" />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-white">Last Maintenance</label>
                            <input type="date" name="last_maintenance" value={form.last_maintenance} onChange={onChange} className="form-input" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-white">Truck Photo</label>
                            <div className="flex items-center gap-4">
                                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md bg-gray-200 dark:bg-gray-700">
                                    {photoPreview ? (
                                        <img src={photoPreview} alt="preview" className="h-full w-full object-cover" />
                                    ) : (
                                        <img src={form.photo_url || '/assets/images/img-placeholder-fallback.webp'} alt="placeholder" className="h-full w-full object-cover" />
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
                        <Link href="/fleet" className="btn btn-outline-danger">
                            {t('cancel')}
                        </Link>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Saving...' : 'Create Truck'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
