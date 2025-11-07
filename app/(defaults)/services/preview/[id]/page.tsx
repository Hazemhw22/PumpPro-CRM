'use client';
import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { getTranslation } from '@/i18n';
import IconEdit from '@/components/icon/icon-edit';

interface Service {
    id: string;
    name?: string;
    description?: string;
    price_private?: number;
    price_business?: number;
    active?: boolean;
    created_at?: string;
    updated_at?: string;
}

export default function PreviewService() {
    const { t } = getTranslation();
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const [loading, setLoading] = useState(true);
    const [service, setService] = useState<Service | null>(null);

    useEffect(() => {
        if (id) fetchService();
    }, [id]);

    const fetchService = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('services').select('*').eq('id', id).single();
            if (error) throw error;
            setService(data as Service);
        } catch (err) {
            console.error('Error fetching service:', err);
        } finally {
            setLoading(false);
        }
    };

    const statusBadgeClass = (active?: boolean) => {
        return active !== false ? 'badge-outline-success' : 'badge-outline-danger';
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
        <div>
            {/* Header */}
            <div className="container mx-auto p-6">
                <div className="flex items-center gap-5 mb-6">
                    <div onClick={() => router.back()}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mb-4 cursor-pointer text-primary rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </div>
                    <ul className="flex space-x-2 rtl:space-x-reverse mb-4">
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
                            <span>Service Details</span>
                        </li>
                    </ul>
                </div>

                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Service Details</h1>
                        <p className="text-gray-500">{service.name}</p>
                    </div>
                    {service && (
                        <Link href={`/services/edit/${service.id}`} className="btn btn-primary">
                            <IconEdit className="ltr:mr-2 rtl:ml-2" />
                            Edit Service
                        </Link>
                    )}
                </div>
            </div>

            <div className="container mx-auto p-6">
                <div className="panel">
                    <div className="mb-5">
                        <h3 className="text-lg font-semibold">Service Information</h3>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <h2 className="text-2xl font-bold text-primary mb-2">{service.name || 'N/A'}</h2>
                            <span className={`badge ${statusBadgeClass(service.active)}`}>
                                {service.active !== false ? 'Active' : 'Inactive'}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-6">
                            <div className="rounded-md border border-white-light p-4 dark:border-[#17263c]">
                                <h6 className="mb-2 text-sm font-semibold text-gray-500 dark:text-gray-400">Price for Private Customers</h6>
                                <p className="text-base font-medium">
                                    {service.price_private ? `$${service.price_private.toFixed(2)}` : 'N/A'}
                                </p>
                            </div>
                            <div className="rounded-md border border-white-light p-4 dark:border-[#17263c]">
                                <h6 className="mb-2 text-sm font-semibold text-gray-500 dark:text-gray-400">Price for Business Customers</h6>
                                <p className="text-base font-medium">
                                    {service.price_business ? `$${service.price_business.toFixed(2)}` : 'N/A'}
                                </p>
                            </div>
                            <div className="rounded-md border border-white-light p-4 dark:border-[#17263c]">
                                <h6 className="mb-2 text-sm font-semibold text-gray-500 dark:text-gray-400">Created At</h6>
                                <p className="text-base font-medium">
                                    {service.created_at
                                        ? new Date(service.created_at).toLocaleDateString('en-GB', {
                                              year: 'numeric',
                                              month: '2-digit',
                                              day: '2-digit',
                                          })
                                        : 'N/A'}
                                </p>
                            </div>
                            <div className="rounded-md border border-white-light p-4 dark:border-[#17263c]">
                                <h6 className="mb-2 text-sm font-semibold text-gray-500 dark:text-gray-400">Last Updated</h6>
                                <p className="text-base font-medium">
                                    {service.updated_at
                                        ? new Date(service.updated_at).toLocaleDateString('en-GB', {
                                              year: 'numeric',
                                              month: '2-digit',
                                              day: '2-digit',
                                          })
                                        : 'N/A'}
                                </p>
                            </div>
                        </div>

                        {service.description && (
                            <div className="mt-4 rounded-md border border-white-light p-4 dark:border-[#17263c]">
                                <h6 className="mb-2 text-sm font-semibold text-gray-500 dark:text-gray-400">Description</h6>
                                <p className="text-base whitespace-pre-wrap">{service.description}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
