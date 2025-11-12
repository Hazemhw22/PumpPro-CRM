'use client';
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import IconPlus from '@/components/icon/icon-plus';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';

export default function AddContractor() {
    const router = useRouter();
    const [form, setForm] = useState({ name: '', email: '', phone: '', balance: '0', password: '' });
    const [saving, setSaving] = useState(false);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({ visible: false, message: '', type: 'success' });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload: any = {
                name: form.name.trim(),
                email: form.email.trim() || null,
                phone: form.phone.trim() || null,
                balance: parseFloat(form.balance) || 0,
            };
            if (form.password && form.password.trim() !== '') payload.password = form.password;

            const { data, error } = await supabase.from('contractors').insert(payload).select().single();
            if (error) throw error;
            setAlert({ visible: true, message: 'Contractor created', type: 'success' });
            // redirect to contractors list
            router.push('/contractors');
        } catch (err: any) {
            console.error(err);
            setAlert({ visible: true, message: err.message || 'Failed to create contractor', type: 'danger' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {alert.visible && <Alert type={alert.type} message={alert.message} onClose={() => setAlert({ ...alert, visible: false })} />}

            <div className="panel">
                <div className="mb-4.5 flex items-center justify-between px-5">
                    <h3 className="text-lg font-semibold">Add New Contractor</h3>
                </div>

                <div className="p-5">
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="block text-sm font-semibold mb-2">
                                Name <span className="text-red-500">*</span>
                            </label>
                            <input name="name" value={form.name} onChange={handleChange} required className="form-input" />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-2">Email</label>
                            <input name="email" value={form.email} onChange={handleChange} className="form-input" />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-2">Phone</label>
                            <input name="phone" value={form.phone} onChange={handleChange} className="form-input" />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-2">Password</label>
                            <input name="password" value={form.password} onChange={handleChange} className="form-input" type="password" placeholder="Set a password (optional)" />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-2">Balance</label>
                            <input name="balance" value={form.balance} onChange={handleChange} className="form-input" type="number" step="0.01" />
                        </div>

                        <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                            <button type="button" onClick={() => router.back()} className="btn btn-outline-danger">
                                Cancel
                            </button>
                            <button type="submit" disabled={saving} className="btn btn-primary">
                                {saving ? (
                                    'Saving...'
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <IconPlus /> Create
                                    </span>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
