'use client';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import IconPlus from '@/components/icon/icon-plus';
import IconEdit from '@/components/icon/icon-edit';
import IconTrashLines from '@/components/icon/icon-trash-lines';
import IconEye from '@/components/icon/icon-eye';
import { supabase } from '@/lib/supabase/client';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';

interface Contractor {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    balance?: number;
    created_at?: string;
}

export default function ContractorsList() {
    const [items, setItems] = useState<Contractor[]>([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({ visible: false, message: '', type: 'success' });

    useEffect(() => {
        fetchContractors();
    }, []);

    const fetchContractors = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('contractors').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setItems(data || []);
        } catch (err) {
            console.error('Error fetching contractors:', err);
            setAlert({ visible: true, message: 'Failed to load contractors', type: 'danger' });
        } finally {
            setLoading(false);
        }
    };

    const deleteRow = async (id: string) => {
        if (!confirm('Are you sure you want to delete this contractor?')) return;
        try {
            const { error } = await supabase.from('contractors').delete().eq('id', id);
            if (error) throw error;
            setAlert({ visible: true, message: 'Contractor deleted', type: 'success' });
            fetchContractors();
        } catch (err) {
            console.error(err);
            setAlert({ visible: true, message: 'Failed to delete contractor', type: 'danger' });
        }
    };

    if (loading)
        return (
            <div className="flex h-screen items-center justify-center">
                <span className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-primary border-l-transparent"></span>
            </div>
        );

    return (
        <div className="space-y-6">
            {alert.visible && <Alert type={alert.type} message={alert.message} onClose={() => setAlert({ ...alert, visible: false })} />}

            <div className="panel">
                <div className="mb-4.5 flex flex-col gap-5 px-5 md:flex-row md:items-center">
                    <div className="flex items-center gap-2">
                        <Link href="/contractors/add" className="btn btn-primary gap-2">
                            <IconPlus />
                            Add New Contractor
                        </Link>
                    </div>
                </div>

                <div className="relative px-5 pb-5">
                    <div className="overflow-auto rounded-md">
                        <table className="table-hover whitespace-nowrap rtl-table-headers">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Balance</th>
                                    <th>Created</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((c) => (
                                    <tr key={c.id}>
                                        <td className="font-semibold">{c.name}</td>
                                        <td>{c.email || '-'}</td>
                                        <td>{c.phone || '-'}</td>
                                        <td>₪{(c.balance || 0).toFixed(2)}</td>
                                        <td>{c.created_at ? new Date(c.created_at).toLocaleDateString('en-GB') : '-'}</td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <Link href={`/contractors/preview/${c.id}`} className="flex hover:text-info">
                                                    <IconEye />
                                                </Link>
                                                <Link href={`/contractors/edit/${c.id}`} className="flex hover:text-info">
                                                    <IconEdit />
                                                </Link>
                                                <button onClick={() => deleteRow(c.id)} className="flex hover:text-danger">
                                                    <IconTrashLines />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
