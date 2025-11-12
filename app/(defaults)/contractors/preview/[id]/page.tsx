'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import IconEdit from '@/components/icon/icon-edit';

export default function ContractorPreview() {
    const params = useParams();
    const router = useRouter();
    const id = (params as any)?.id as string;
    const [loading, setLoading] = useState(true);
    const [contractor, setContractor] = useState<any>(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const { data, error } = await supabase.from('contractors').select('*').eq('id', id).single();
                if (error) throw error;
                if (!mounted) return;
                setContractor(data);
            } catch (err) {
                console.error('Failed to load contractor', err);
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [id]);

    if (loading)
        return (
            <div className="flex items-center justify-center min-h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );

    if (!contractor) return <div className="p-6">Contractor not found</div>;

    return (
        <div className="space-y-6">
            <div className="panel">
                <div className="mb-4.5 flex items-center justify-between px-5">
                    <h3 className="text-lg font-semibold">Contractor Preview</h3>
                    <div className="flex items-center gap-2">
                        <Link href={`/contractors/edit/${contractor.id}`} className="btn btn-outline-primary flex items-center gap-2">
                            <IconEdit /> Edit
                        </Link>
                    </div>
                </div>

                <div className="p-5">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <div className="text-sm text-gray-500">Name</div>
                            <div className="font-semibold text-lg">{contractor.name}</div>
                        </div>

                        <div>
                            <div className="text-sm text-gray-500">Email</div>
                            <div className="font-medium">{contractor.email || '-'}</div>
                        </div>

                        <div>
                            <div className="text-sm text-gray-500">Phone</div>
                            <div className="font-medium">{contractor.phone || '-'}</div>
                        </div>

                        <div>
                            <div className="text-sm text-gray-500">Balance</div>
                            <div className="font-medium">₪{Number(contractor.balance || 0).toFixed(2)}</div>
                        </div>

                        <div>
                            <div className="text-sm text-gray-500">Created</div>
                            <div className="font-medium">{contractor.created_at ? new Date(contractor.created_at).toLocaleString() : '-'}</div>
                        </div>

                        <div>
                            <div className="text-sm text-gray-500">Updated</div>
                            <div className="font-medium">{contractor.updated_at ? new Date(contractor.updated_at).toLocaleString() : '-'}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
