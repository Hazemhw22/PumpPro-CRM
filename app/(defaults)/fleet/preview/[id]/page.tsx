'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import IconArrowLeft from '@/components/icon/icon-arrow-left';
import IconEdit from '@/components/icon/icon-edit';
import IconCalendar from '@/components/icon/icon-calendar';
import IconClipboardText from '@/components/icon/icon-clipboard-text';
import IconCreditCard from '@/components/icon/icon-credit-card';
import IconCamera from '@/components/icon/icon-camera';
import { supabase } from '@/lib/supabase/client';
import { getTranslation } from '@/i18n';
import { Tab } from '@headlessui/react';

interface Truck {
    id: string;
    created_at: string;
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
    driver?: { name?: string; driver_number?: string };
    updated_at?: string;
}

const FleetPreview = () => {
    const { t } = getTranslation();
    const params = useParams();
    const router = useRouter();
    const [truck, setTruck] = useState<Truck | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTruck = async () => {
            try {
                const { data, error } = await (supabase as any)
                    .from('trucks')
                    .select('*, driver:drivers(name, driver_number)')
                    .eq('id', params?.id)
                    .single();
                if (error) throw error;
                setTruck(data as Truck);
            } catch (error) {
                console.error('Error fetching truck:', error);
            } finally {
                setLoading(false);
            }
        };

        if (params?.id) fetchTruck();
    }, [params?.id]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!truck) {
        return (
            <div className="panel">
                <div className="py-10 text-center">
                    <h3 className="text-lg font-semibold text-danger">Truck not found</h3>
                    <Link href="/fleet" className="btn btn-primary mt-4">
                        <IconArrowLeft className="ltr:mr-2 rtl:ml-2" />
                        Back to Fleet
                    </Link>
                </div>
            </div>
        );
    }

    const title = `Truck #${truck.truck_number || truck.license_plate || truck.id.slice(0, 8)}`;
    const statusBadge = (s?: Truck['status']) => {
        switch (s) {
            case 'available':
                return 'badge-outline-success';
            case 'in_use':
                return 'badge-outline-info';
            case 'maintenance':
                return 'badge-outline-warning';
            case 'out_of_service':
                return 'badge-outline-danger';
            default:
                return 'badge-outline-secondary';
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="container mx-auto p-6">
                <div className="mb-6 flex items-center gap-5">
                    <div onClick={() => router.back()}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="mb-4 h-7 w-7 cursor-pointer text-primary rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </div>
                    <ul className="mb-4 flex space-x-2 rtl:space-x-reverse">
                        <li>
                            <Link href="/" className="text-primary hover:underline">{t('home')}</Link>
                        </li>
                        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                            <Link href="/fleet" className="text-primary hover:underline">Fleet</Link>
                        </li>
                        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                            <span>Truck Details</span>
                        </li>
                    </ul>
                </div>

                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">{title}</h1>
                        <p className="text-gray-500">Plate: {truck.license_plate || '-'}</p>
                    </div>
                    <Link href={`/fleet/edit/${truck.id}`} className="btn btn-primary">
                        <IconEdit className="ltr:mr-2 rtl:ml-2" />
                        Edit Truck
                    </Link>
                </div>
            </div>

            <div className="container mx-auto p-6">
                <Tab.Group>
                    <Tab.List className="mt-3 flex flex-wrap border-b border-white-light dark:border-[#191e3a]">
                        <Tab as="div" className="flex-1">
                            {({ selected }) => (
                                <button className={`${selected ? 'text-primary !outline-none before:!w-full' : ''} relative -mb-[1px] flex w-full items-center justify-center border-b border-transparent p-5 py-3 before:absolute before:bottom-0 before:left-0 before:right-0 before:m-auto before:inline-block before:h-[1px] before:w-0 before:bg-primary before:transition-all before:duration-700 hover:text-primary hover:before:w-full`}>
                                    <IconCalendar className="ltr:mr-2 rtl:ml-2" />
                                    Details
                                </button>
                            )}
                        </Tab>
                        <Tab as="div" className="flex-1">
                            {({ selected }) => (
                                <button className={`${selected ? 'text-primary !outline-none before:!w-full' : ''} relative -mb-[1px] flex w-full items-center justify-center border-b border-transparent p-5 py-3 before:absolute before:bottom-0 before:left-0 before:right-0 before:m-auto before:inline-block before:h-[1px] before:w-0 before:bg-primary before:transition-all before:duration-700 hover:text-primary hover:before:w-full`}>
                                    <IconClipboardText className="ltr:mr-2 rtl:ml-2" />
                                    Maintenance
                                </button>
                            )}
                        </Tab>
                        <Tab as="div" className="flex-1">
                            {({ selected }) => (
                                <button className={`${selected ? 'text-primary !outline-none before:!w-full' : ''} relative -mb-[1px] flex w-full items-center justify-center border-b border-transparent p-5 py-3 before:absolute before:bottom-0 before:left-0 before:right-0 before:m-auto before:inline-block before:h-[1px] before:w-0 before:bg-primary before:transition-all before:duration-700 hover:text-primary hover:before:w-full`}>
                                    <IconCreditCard className="ltr:mr-2 rtl:ml-2" />
                                    Expenses
                                </button>
                            )}
                        </Tab>
                    </Tab.List>
                    <Tab.Panels className="mt-5">
                        <Tab.Panel>
                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                                {/* Truck Information */}
                                <div className="space-y-6">
                                    <div className="panel">
                                        <div className="mb-5">
                                            <h3 className="text-lg font-semibold">Basic Information</h3>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <img src={truck.photo_url || '/assets/images/img-placeholder-fallback.webp'} alt="thumb" className="h-20 w-20 rounded-md object-cover" />
                                            <div>
                                                <div className="text-2xl font-bold text-primary mb-2">{title}</div>
                                                <span className={`badge ${statusBadge(truck.status)}`}>{(truck.status || 'available').replace('_', ' ')}</span>
                                            </div>
                                        </div>
                                        <div className="mt-4 space-y-3">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">License Plate:</span>
                                                <span className="font-medium">{truck.license_plate || '-'}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Capacity:</span>
                                                <span className="font-medium">{truck.capacity_gallons ? `${truck.capacity_gallons} gallons` : '-'}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Purchase Date:</span>
                                                <span className="font-medium">{truck.purchase_date ? new Date(truck.purchase_date).toLocaleDateString('en-GB') : '-'}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Last Maintenance:</span>
                                                <span className="font-medium">{truck.last_maintenance ? new Date(truck.last_maintenance).toLocaleDateString('en-GB') : '-'}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Assigned Driver:</span>
                                                <span className="font-medium">{truck.driver?.name || '-'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    {truck.notes && (
                                        <div className="panel">
                                            <div className="mb-5">
                                                <h3 className="text-lg font-semibold">Notes</h3>
                                            </div>
                                            <p className="whitespace-pre-wrap text-gray-600">{truck.notes}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Additional Information */}
                                <div className="space-y-6">
                                    <div className="panel">
                                        <div className="mb-5">
                                            <h3 className="text-lg font-semibold">Additional Information</h3>
                                        </div>
                                        <div className="space-y-3 text-sm">
                                            <div className="flex justify-between"><span className="text-gray-600">Truck ID:</span><span className="font-mono text-xs">{truck.id}</span></div>
                                            <div className="flex justify-between"><span className="text-gray-600">Created At:</span><span className="font-medium">{new Date(truck.created_at).toLocaleDateString('en-GB')}</span></div>
                                        </div>
                                    </div>

                                    {/* Photo */}
                                    <div className="panel">
                                        <div className="mb-5">
                                            <h3 className="text-lg font-semibold">Truck Photo</h3>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <div className="mb-5">
                                                <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-md bg-gray-200 dark:bg-gray-700">
                                                    <img src={truck.photo_url || '/assets/images/img-placeholder-fallback.webp'} alt={title} className="h-full w-full object-cover" />
                                                </div>
                                            </div>
                                            <button className="btn btn-primary gap-2" type="button">
                                                <IconCamera /> Upload a photo
                                            </button>
                                            <p className="mt-2 text-xs text-gray-500">JPG, PNG or GIF (MAX. 800x400px)</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Tab.Panel>

                        {/* Maintenance */}
                        <Tab.Panel>
                            <div className="panel">
                                <div className="mb-5">
                                    <h3 className="text-lg font-semibold">Maintenance</h3>
                                </div>
                                <div className="py-10 text-center text-gray-500">No maintenance records</div>
                            </div>
                        </Tab.Panel>

                        {/* Expenses */}
                        <Tab.Panel>
                            <div className="panel">
                                <div className="mb-5">
                                    <h3 className="text-lg font-semibold">Expenses</h3>
                                </div>
                                <div className="py-10 text-center text-gray-500">No expenses recorded</div>
                            </div>
                        </Tab.Panel>
                    </Tab.Panels>
                </Tab.Group>
            </div>
        </div>
    );
};

export default FleetPreview;

