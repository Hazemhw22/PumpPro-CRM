'use client';
import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Tab } from '@headlessui/react';
import { supabase } from '@/lib/supabase/client';
import { getTranslation } from '@/i18n';
import IconUser from '@/components/icon/icon-user';
import IconPhone from '@/components/icon/icon-phone';
import IconMail from '@/components/icon/icon-mail';
import IconCalendar from '@/components/icon/icon-calendar';
import IconCreditCard from '@/components/icon/icon-credit-card';
import IconClipboardText from '@/components/icon/icon-clipboard-text';
import IconEdit from '@/components/icon/icon-edit';

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
    created_at?: string;
    updated_at?: string;
}

export default function PreviewDriver() {
    const { t } = getTranslation();
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const [loading, setLoading] = useState(true);
    const [driver, setDriver] = useState<Driver | null>(null);

    useEffect(() => {
        if (id) fetchDriver();
    }, [id]);

    const fetchDriver = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('drivers').select('*').eq('id', id).single();
            if (error) throw error;
            setDriver(data);
        } catch (err) {
            console.error('Error fetching driver:', err);
        } finally {
            setLoading(false);
        }
    };

    const statusBadge = (status?: string) => {
        switch (status) {
            case 'active':
                return 'badge-outline-success';
            case 'inactive':
                return 'badge-outline-danger';
            case 'on_leave':
                return 'badge-outline-warning';
            default:
                return 'badge-outline-secondary';
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

    const statusBadgeClass = (status?: string) => {
        switch (status) {
            case 'active':
                return 'badge-outline-success';
            case 'inactive':
                return 'badge-outline-danger';
            case 'on_leave':
                return 'badge-outline-warning';
            default:
                return 'badge-outline-secondary';
        }
    };

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
                            <Link href="/drivers" className="text-primary hover:underline">
                                Drivers
                            </Link>
                        </li>
                        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                            <span>Driver Details</span>
                        </li>
                    </ul>
                </div>

                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Driver Details</h1>
                        <p className="text-gray-500">{driver.name}</p>
                    </div>
                    {driver && (
                        <Link href={`/drivers/edit/${driver.id}`} className="btn btn-primary">
                            <IconEdit className="ltr:mr-2 rtl:ml-2" />
                            Edit Driver
                        </Link>
                    )}
                </div>
            </div>

            <div className="container mx-auto p-6">

                <Tab.Group>
                    <Tab.List className="mt-3 flex flex-wrap border-b border-white-light dark:border-[#191e3a]">
                        <Tab as="div" className="flex-1">
                            {({ selected }) => (
                                <button
                                    className={`${
                                        selected ? 'text-primary !outline-none before:!w-full' : ''
                                    } relative -mb-[1px] flex w-full items-center justify-center border-b border-transparent p-5 py-3 before:absolute before:bottom-0 before:left-0 before:right-0 before:m-auto before:inline-block before:h-[1px] before:w-0 before:bg-primary before:transition-all before:duration-700 hover:text-primary hover:before:w-full`}
                                >
                                    <IconUser className="ltr:mr-2 rtl:ml-2" />
                                    Details
                                </button>
                            )}
                        </Tab>
                        <Tab as="div" className="flex-1">
                            {({ selected }) => (
                                <button
                                    className={`${
                                        selected ? 'text-primary !outline-none before:!w-full' : ''
                                    } relative -mb-[1px] flex w-full items-center justify-center border-b border-transparent p-5 py-3 before:absolute before:bottom-0 before:left-0 before:right-0 before:m-auto before:inline-block before:h-[1px] before:w-0 before:bg-primary before:transition-all before:duration-700 hover:text-primary hover:before:w-full`}
                                >
                                    <IconCalendar className="ltr:mr-2 rtl:ml-2" />
                                    Trips
                                </button>
                            )}
                        </Tab>
                        <Tab as="div" className="flex-1">
                            {({ selected }) => (
                                <button
                                    className={`${
                                        selected ? 'text-primary !outline-none before:!w-full' : ''
                                    } relative -mb-[1px] flex w-full items-center justify-center border-b border-transparent p-5 py-3 before:absolute before:bottom-0 before:left-0 before:right-0 before:m-auto before:inline-block before:h-[1px] before:w-0 before:bg-primary before:transition-all before:duration-700 hover:text-primary hover:before:w-full`}
                                >
                                    <IconClipboardText className="ltr:mr-2 rtl:ml-2" />
                                    Documents
                                </button>
                            )}
                        </Tab>
                    </Tab.List>
                    <Tab.Panels className="mt-5">
                        {/* Details Tab */}
                        <Tab.Panel>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Driver Information */}
                                <div className="space-y-6">
                                    {/* Basic Info */}
                                    <div className="panel">
                                        <div className="mb-5">
                                            <h3 className="text-lg font-semibold">Basic Information</h3>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <h2 className="text-2xl font-bold text-primary mb-2">{driver.name || 'N/A'}</h2>
                                                <span className={`badge ${statusBadgeClass(driver.status)}`}>
                                                    {(driver.status || 'active').replace('_', ' ')}
                                                </span>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex items-center">
                                                    <IconUser className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                                    <span className="text-sm text-gray-600 ltr:mr-2 rtl:ml-2">Driver #:</span>
                                                    <span className="font-medium">#{driver.driver_number || driver.id.slice(0, 8)}</span>
                                                </div>

                                                <div className="flex items-center">
                                                    <IconPhone className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                                    <span className="text-sm text-gray-600 ltr:mr-2 rtl:ml-2">Phone:</span>
                                                    <span className="font-medium">
                                                        <a href={`tel:${driver.phone}`} className="text-primary hover:underline">
                                                            {driver.phone || 'N/A'}
                                                        </a>
                                                    </span>
                                                </div>

                                                {driver.email && (
                                                    <div className="flex items-center">
                                                        <IconMail className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                                        <span className="text-sm text-gray-600 ltr:mr-2 rtl:ml-2">Email:</span>
                                                        <span className="font-medium">
                                                            <a href={`mailto:${driver.email}`} className="text-primary hover:underline">
                                                                {driver.email}
                                                            </a>
                                                        </span>
                                                    </div>
                                                )}

                                                <div className="flex items-center">
                                                    <IconCreditCard className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                                    <span className="text-sm text-gray-600 ltr:mr-2 rtl:ml-2">License:</span>
                                                    <span className="font-medium">{driver.license_number || 'N/A'}</span>
                                                </div>

                                                {driver.license_expiry && (
                                                    <div className="flex items-center">
                                                        <IconCalendar className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                                        <span className="text-sm text-gray-600 ltr:mr-2 rtl:ml-2">License Expiry:</span>
                                                        <span className="font-medium">
                                                            {new Date(driver.license_expiry).toLocaleDateString('en-GB', {
                                                                year: 'numeric',
                                                                month: '2-digit',
                                                                day: '2-digit',
                                                            })}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {driver.notes && (
                                        <div className="panel">
                                            <div className="mb-3">
                                                <h3 className="text-lg font-semibold">Notes</h3>
                                            </div>
                                            <p className="text-gray-600">{driver.notes}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Driver Photo */}
                                <div className="lg:col-span-2">
                                    <div className="panel">
                                        <div className="mb-5">
                                            <h3 className="text-lg font-semibold">Driver Photo</h3>
                                        </div>
                                        <div className="flex justify-center">
                                            <img
                                                src={driver.photo_url || '/assets/images/user-profile.jpeg'}
                                                alt="driver"
                                                className="h-64 w-64 rounded-lg object-cover shadow-lg"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Tab.Panel>
                        <Tab.Panel>
                            <div className="panel">
                                <p className="text-center text-gray-500 py-10">No trips recorded yet.</p>
                            </div>
                        </Tab.Panel>
                        <Tab.Panel>
                            <div className="panel">
                                <p className="text-center text-gray-500 py-10">No documents uploaded yet.</p>
                            </div>
                        </Tab.Panel>
                    </Tab.Panels>
                </Tab.Group>
            </div>
        </div>
    );
}
