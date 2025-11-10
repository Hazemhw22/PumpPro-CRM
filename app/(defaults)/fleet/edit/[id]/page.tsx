'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import StatusSelect from '@/components/status-select/status-select';
import DriverSelect from '@/components/driver-select/driver-select';
import { Tab } from '@headlessui/react';
import IconBox from '@/components/icon/icon-box';
import IconUser from '@/components/icon/icon-user';
import IconCamera from '@/components/icon/icon-camera';

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
    driver_id?: string;
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
        driver_id: '',
    });

    const [drivers, setDrivers] = useState<any[]>([]);
    const [selectedDriver, setSelectedDriver] = useState<any>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string>('');

    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                // Fetch drivers first
                const { data: driversData, error: driversError } = await supabase.from('drivers').select('id, name, driver_number, status').order('name');
                if (driversError) throw driversError;
                setDrivers(driversData || []);

                // Fetch truck
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
                    driver_id: t.driver_id || '',
                });

                // Set selected driver if exists
                if (t.driver_id && driversData) {
                    const driver = driversData.find((d: any) => d.id === t.driver_id);
                    setSelectedDriver(driver || null);
                }
            } catch (e) {
                setAlert({ visible: true, message: 'Error loading truck', type: 'danger' });
            } finally {
                setLoading(false);
            }
        };
        if (id) loadData();
    }, [id]);

    const fetchDrivers = async () => {
        try {
            const { data, error } = await supabase.from('drivers').select('id, name, driver_number, status').order('name');
            if (error) throw error;
            setDrivers(data || []);
        } catch (err) {
            console.error('Error fetching drivers:', err);
        }
    };

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
                driver_id: form.driver_id || null,
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

            <div className="mb-6">
                <h1 className="text-2xl font-bold">Edit Truck</h1>
                <p className="text-gray-500">Update truck information</p>
            </div>

            {alert.visible && (
                <div className="mb-6">
                    <Alert type={alert.type} title={alert.type === 'success' ? 'Success' : 'Error'} message={alert.message} onClose={() => setAlert({ visible: false, message: '', type: 'success' })} />
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
                                <IconUser className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                                Assignment & Status
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
                                <IconCamera className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                                Photo & Notes
                            </button>
                        )}
                    </Tab>
                </Tab.List>

                <Tab.Panels className="mt-5">
                    {/* Basic Information Tab */}
                    <Tab.Panel>
                        <div className="panel">
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
                                        <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-white">Purchase Date</label>
                                        <input type="date" name="purchase_date" value={form.purchase_date} onChange={onChange} className="form-input" />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-white">Last Maintenance</label>
                                        <input type="date" name="last_maintenance" value={form.last_maintenance} onChange={onChange} className="form-input" />
                                    </div>
                                </div>

                                <div className="mt-8 flex justify-end gap-4">
                                    <Link href="/fleet" className="btn btn-outline-danger">Cancel</Link>
                                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Update Truck'}</button>
                                </div>
                            </form>
                        </div>
                    </Tab.Panel>

                    {/* Assignment & Status Tab */}
                    <Tab.Panel>
                        <div className="panel">
                            <form onSubmit={onSubmit} className="space-y-5">
                                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-white">Status</label>
                                        <StatusSelect
                                            value={form.status}
                                            onChange={(value) => setForm(prev => ({ ...prev, status: value as any }))}
                                            type="truck"
                                            className="form-select"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-white">Assigned Driver</label>
                                        <DriverSelect
                                            selectedDriver={selectedDriver}
                                            onDriverSelect={(driver) => {
                                                setSelectedDriver(driver);
                                                if (driver) {
                                                    setForm(prev => ({ ...prev, driver_id: driver.id }));
                                                } else {
                                                    setForm(prev => ({ ...prev, driver_id: '' }));
                                                }
                                            }}
                                            onCreateNew={() => router.push('/drivers/add')}
                                            className="form-select"
                                        />
                                    </div>
                                </div>

                                <div className="mt-8 flex justify-end gap-4">
                                    <Link href="/fleet" className="btn btn-outline-danger">Cancel</Link>
                                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Update Truck'}</button>
                                </div>
                            </form>
                        </div>
                    </Tab.Panel>

                    {/* Photo & Notes Tab */}
                    <Tab.Panel>
                        <div className="panel">
                            <form onSubmit={onSubmit} className="space-y-5">
                                <div>
                                    <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-white">Truck Photo</label>
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-md bg-gray-200 dark:bg-gray-700">
                                            {photoPreview ? (
                                                <img src={photoPreview} alt="preview" className="h-full w-full object-cover" />
                                            ) : (
                                                <img src={form.photo_url || '/assets/images/img-placeholder-fallback.webp'} alt="current" className="h-full w-full object-cover" />
                                            )}
                                        </div>
                                        <div>
                                            <input type="file" accept="image/*" onChange={onPhotoChange} className="form-input file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-primary file:text-white" />
                                            <p className="mt-1 text-xs text-gray-500">PNG, JPG, GIF up to 2MB</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-white">Notes</label>
                                    <textarea name="notes" value={form.notes} onChange={onChange} className="form-textarea" rows={6} placeholder="Enter notes about this truck" />
                                </div>

                                <div className="mt-8 flex justify-end gap-4">
                                    <Link href="/fleet" className="btn btn-outline-danger">Cancel</Link>
                                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Update Truck'}</button>
                                </div>
                            </form>
                        </div>
                    </Tab.Panel>
                </Tab.Panels>
            </Tab.Group>
        </div>
    );
}