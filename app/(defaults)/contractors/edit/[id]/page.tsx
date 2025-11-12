'use client';
import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';

export default function EditContractorPage() {
    const router = useRouter();
    const params = useParams();
    const id = (params as any)?.id as string;
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', phone: '', balance: '0', password: '' });
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({ visible: false, message: '', type: 'success' });

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const { data, error } = await (supabase as any).from('contractors').select('*').eq('id', id).single();
                if (error) throw error;
                if (!mounted) return;
                const d: any = data;
                setForm({ name: d.name || '', email: d.email || '', phone: d.phone || '', balance: String(d.balance || 0), password: '' });
            } catch (err) {
                console.error('Failed to load contractor', err);
                setAlert({ visible: true, message: 'Failed to load contractor', type: 'danger' });
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload: any = { name: form.name.trim(), email: form.email.trim() || null, phone: form.phone.trim() || null, balance: parseFloat(form.balance) || 0 };
            if (form.password && form.password.trim() !== '') payload.password = form.password;
            const { error } = await (supabase as any).from('contractors').update(payload).eq('id', id);
            if (error) throw error;
            setAlert({ visible: true, message: 'Contractor updated', type: 'success' });
            router.push('/contractors');
        } catch (err: any) {
            console.error(err);
            setAlert({ visible: true, message: err.message || 'Failed to update contractor', type: 'danger' });
        } finally {
            setSaving(false);
        }
    };

    if (loading)
        return (
            <div className="flex items-center justify-center min-h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );

    return (
        <div className="space-y-6">
            {alert.visible && <Alert type={alert.type} message={alert.message} onClose={() => setAlert({ ...alert, visible: false })} />}

            <div className="panel">
                <div className="mb-4.5 flex items-center justify-between px-5">
                    <h3 className="text-lg font-semibold">Edit Contractor</h3>
                </div>
                <div className="p-5">
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="block text-sm font-semibold mb-2">Name</label>
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
                            <input name="password" value={form.password} onChange={handleChange} className="form-input" type="password" placeholder="Set a new password (optional)" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">Balance</label>
                            <input name="balance" value={form.balance} onChange={handleChange} type="number" step="0.01" className="form-input" />
                        </div>

                        <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                            <button type="button" onClick={() => router.back()} className="btn btn-outline-danger">
                                Cancel
                            </button>
                            <button type="submit" disabled={saving} className="btn btn-primary">
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
