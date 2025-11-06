'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';

interface Truck {
    id: string;
    truck_number?: string;
    license_plate?: string;
    capacity_gallons?: number;
    status?: 'available' | 'in_use' | 'maintenance' | 'out_of_service';
    purchase_date?: string;
    last_maintenance?: string;
    notes?: string;
    photo_url?: string;
    truck_photos?: string[];
    updated_at?: string;
}

export default function EditTruck() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [truck, setTruck] = useState<Truck | null>(null);

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

    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        const fetchTruck = async () => {
            try {
                const { data, error } = await (supabase as any).from('trucks').select('*').eq('id', id).single();
                if (error) throw error;
                const t = data as Truck;
                setTruck(t);
                setForm({
                    truck_number: t.truck_number || '',
                    license_plate: t.license_plate || '',
                    capacity_gallons: t.capacity_gallons ? String(t.capacity_gallons) : '',
                    status: (t.status as any) || 'available',
                    purchase_date: t.purchase_date || '',
                    last_maintenance: t.last_maintenance || '',
                    notes: t.notes || '',
                    photo_url: t.photo_url || '',
                });
            } catch (e) {
                setAlert({ visible: true, message: 'Error loading truck', type: 'danger' });
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchTruck();
    }, [id]);

    const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload: any = {
                truck_number: form.truck_number.trim() || null,
                license_plate: form.license_plate.trim() || null,
                capacity_gallons: form.capacity_gallons ? Number(form.capacity_gallons) : null,
                status: form.status,
                purchase_date: form.purchase_date || null,
                last_maintenance: form.last_maintenance || null,
                notes: form.notes || null,
                photo_url: form.photo_url || null,
            };
            const { error } = await (supabase as any).from('trucks').update(payload).eq('id', id);
            if (error) throw error;
            setAlert({ visible: true, message: 'Truck updated successfully', type: 'success' });
            setTimeout(() => router.push('/fleet'), 1200);
        } catch (err) {
            setAlert({ visible: true, message: err instanceof Error ? err.message : 'Error updating truck', type: 'danger' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-80 items-center justify-center">
                <div className="h-16 w-16 animate-spin rounded-full border-t-4 border-blue-500"></div>
                <span className="ml-3">Loading...</span>
            </div>
        );
    }

    if (!truck) {
        return (
            <div className="flex h-80 flex-col items-center justify-center">
                <p className="mb-2 text-xl font-bold">Truck not found</p>
                <button onClick={() => router.push('/fleet')} className="btn btn-primary mt-4">
                    Back to Fleet
                </button>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-5">
                    <div onClick={() => router.back()}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="mb-4 h-7 w-7 cursor-pointer text-primary rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </div>
                    <ul className="mb-4 flex space-x-2 rtl:space-x-reverse">
                        <li>
                            <Link href="/" className="text-primary hover:underline">Home</Link>
                        </li>
                        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                            <Link href="/fleet" className="text-primary hover:underline">Fleet</Link>
                        </li>
                        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                            <span>Edit Truck</span>
                        </li>
                    </ul>
                </div>
                <div className="flex items-center gap-2">
                    <Link href={`/fleet/preview/${id}`} className="btn btn-outline-info">Preview</Link>
                    <Link href="/fleet" className="btn btn-outline-primary">Back to list</Link>
                </div>
            </div>

            {alert.visible && (
                <div className="mb-6">
                    <Alert type={alert.type} title={alert.type === 'success' ? 'Success' : 'Error'} message={alert.message} onClose={() => setAlert({ visible: false, message: '', type: 'success' })} />
                </div>
            )}

            <div className="panel">
                <div className="mb-5">
                    <h5 className="text-lg font-semibold dark:text-white-light">Truck Information</h5>
                </div>

                <form onSubmit={onSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-white">Truck Number</label>
                            <input name="truck_number" value={form.truck_number} onChange={onChange} className="form-input" placeholder="e.g. 123456" />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-white">License Plate</label>
                            <input name="license_plate" value={form.license_plate} onChange={onChange} className="form-input" placeholder="e.g. 85-222-22" />
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
                            <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-white">Photo URL</label>
                            <input name="photo_url" value={form.photo_url} onChange={onChange} className="form-input" placeholder="https://..." />
                        </div>
                        <div className="md:col-span-2">
                            <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-white">Notes (Optional)</label>
                            <textarea name="notes" value={form.notes} onChange={onChange} className="form-textarea" rows={4} placeholder="Notes" />
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-4">
                        <Link href="/fleet" className="btn btn-outline-danger">Cancel</Link>
                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Update Truck'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
