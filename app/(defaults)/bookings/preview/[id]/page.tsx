'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import IconArrowLeft from '@/components/icon/icon-arrow-left';
import IconEdit from '@/components/icon/icon-edit';
import IconUser from '@/components/icon/icon-user';
import IconMapPin from '@/components/icon/icon-map-pin';
import IconPhone from '@/components/icon/icon-phone';
import IconCalendar from '@/components/icon/icon-calendar';
import IconClock from '@/components/icon/icon-clock';
import { supabase } from '@/lib/supabase/client';
import { getTranslation } from '@/i18n';
import Link from 'next/link';

interface Booking {
    id: string;
    created_at: string;
    booking_number: string;
    customer_type: 'private' | 'business';
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    service_address: string;
    scheduled_date: string;
    scheduled_time: string;
    status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
    service_type: string;
    price?: number;
    profit?: number;
    payment_status?: string;
    truck_id?: string;
    driver_id?: string;
    truck?: { truck_number?: string };
    driver?: { name?: string };
    notes?: string;
}

const BookingPreview = () => {
    const { t } = getTranslation();
    const params = useParams();
    const router = useRouter();
    const [booking, setBooking] = useState<Booking | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBooking = async () => {
            try {
                // Fetch booking
                const { data: bookingData, error } = await supabase
                    .from('bookings')
                    .select('*')
                    .eq('id', params?.id)
                    .single();

                if (error) throw error;

                // Fetch related data
                const booking = bookingData as any;
                const [truckRes, driverRes, serviceRes] = await Promise.all([
                    booking.truck_id ? supabase.from('trucks').select('truck_number, license_plate').eq('id', booking.truck_id).single() : { data: null },
                    booking.driver_id ? supabase.from('drivers').select('name, driver_number').eq('id', booking.driver_id).single() : { data: null },
                    booking.service_type ? supabase.from('services').select('name').eq('id', booking.service_type).single() : { data: null },
                ]);

                // Combine data
                const enrichedBooking = {
                    ...booking,
                    truck: truckRes.data,
                    driver: driverRes.data,
                    service_name: (serviceRes.data as any)?.name,
                };

                setBooking(enrichedBooking as any);
            } catch (error) {
                console.error('Error fetching booking:', error);
            } finally {
                setLoading(false);
            }
        };

        if (params?.id) {
            fetchBooking();
        }
    }, [params?.id]);

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'pending':
                return 'badge-outline-warning';
            case 'confirmed':
                return 'badge-outline-info';
            case 'in_progress':
                return 'badge-outline-primary';
            case 'completed':
                return 'badge-outline-success';
            case 'cancelled':
                return 'badge-outline-danger';
            default:
                return 'badge-outline-secondary';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!booking) {
        return (
            <div className="panel">
                <div className="text-center py-10">
                    <h3 className="text-lg font-semibold text-danger">{t('booking_not_found') || 'Booking not found'}</h3>
                    <Link href="/bookings" className="btn btn-primary mt-4">
                        <IconArrowLeft className="ltr:mr-2 rtl:ml-2" />
                        {t('back_to_bookings') || 'Back to Bookings'}
                    </Link>
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
                            <Link href="/bookings" className="text-primary hover:underline">
                                {t('bookings') || 'Bookings'}
                            </Link>
                        </li>
                        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                            <span>{t('booking_details') || 'Booking Details'}</span>
                        </li>
                    </ul>
                </div>

                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">{t('booking_details') || 'Booking Details'}</h1>
                        <p className="text-gray-500">{booking ? `#${booking.booking_number}` : t('loading')}</p>
                    </div>
                    {booking && (
                        <Link href={`/bookings/edit/${booking.id}`} className="btn btn-primary">
                            <IconEdit className="ltr:mr-2 rtl:ml-2" />
                            {t('edit_booking') || 'Edit Booking'}
                        </Link>
                    )}
                </div>
            </div>

            <div className="container mx-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Booking Information */}
                    <div className="space-y-6">
                        {/* Basic Info */}
                        <div className="panel">
                            <div className="mb-5">
                                <h3 className="text-lg font-semibold">{t('basic_information') || 'Basic Information'}</h3>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-primary mb-2">{booking.customer_name}</h2>
                                    <span className={`badge ${getStatusBadgeClass(booking.status)}`}>{t(booking.status) || booking.status}</span>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center">
                                        <IconUser className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                        <span className="text-sm text-gray-600 ltr:mr-2 rtl:ml-2">{t('booking_number') || 'Booking Number'}:</span>
                                        <span className="font-medium">#{booking.booking_number}</span>
                                    </div>

                                    <div className="flex items-center">
                                        <IconUser className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                        <span className="text-sm text-gray-600 ltr:mr-2 rtl:ml-2">{t('customer_name') || 'Customer Name'}:</span>
                                        <span className="font-medium">{booking.customer_name}</span>
                                    </div>

                                    <div className="flex items-center">
                                        <IconPhone className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                        <span className="text-sm text-gray-600 ltr:mr-2 rtl:ml-2">{t('phone') || 'Phone'}:</span>
                                        <span className="font-medium">
                                            <a href={`tel:${booking.customer_phone}`} className="text-primary hover:underline">
                                                {booking.customer_phone}
                                            </a>
                                        </span>
                                    </div>

                                    <div className="flex items-center">
                                        <IconMapPin className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                        <span className="text-sm text-gray-600 ltr:mr-2 rtl:ml-2">{t('service_address') || 'Service Address'}:</span>
                                        <span className="font-medium">{booking.service_address}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Schedule Information */}
                        <div className="panel">
                            <div className="mb-5">
                                <h3 className="text-lg font-semibold">{t('schedule_information') || 'Schedule Information'}</h3>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div className="flex items-center">
                                        <IconCalendar className="w-5 h-5 text-gray-400 ltr:mr-2 rtl:ml-2" />
                                        <span className="text-sm text-gray-600">{t('scheduled_date') || 'Scheduled Date'}:</span>
                                    </div>
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                                        {new Date(booking.scheduled_date).toLocaleDateString('en-GB', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                        })}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div className="flex items-center">
                                        <IconClock className="w-5 h-5 text-gray-400 ltr:mr-2 rtl:ml-2" />
                                        <span className="text-sm text-gray-600">{t('scheduled_time') || 'Scheduled Time'}:</span>
                                    </div>
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">{booking.scheduled_time}</span>
                                </div>

                                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div className="flex items-center">
                                        <IconUser className="w-5 h-5 text-gray-400 ltr:mr-2 rtl:ml-2" />
                                        <span className="text-sm text-gray-600">{t('service_type') || 'Service Type'}:</span>
                                    </div>
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                                        {(booking as any).service_name || booking.service_type || '-'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Additional Information */}
                    <div className="space-y-6">
                        {/* Financial Information */}
                        <div className="panel">
                            <div className="mb-5">
                                <h3 className="text-lg font-semibold">Financial Information</h3>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <span className="text-sm text-gray-600">Price:</span>
                                    <span className="text-lg font-bold text-primary">${booking.price || 0}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <span className="text-sm text-gray-600">Profit:</span>
                                    <span className="text-lg font-bold text-success">${booking.profit || 0}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <span className="text-sm text-gray-600">Payment Status:</span>
                                    <span className="badge badge-outline-info">{booking.payment_status || 'Pending'}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <span className="text-sm text-gray-600">Customer Type:</span>
                                    <span className="badge badge-outline-primary">{booking.customer_type === 'private' ? 'Private' : 'Business'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Assignment Information */}
                        <div className="panel">
                            <div className="mb-5">
                                <h3 className="text-lg font-semibold">Assignment</h3>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <span className="text-sm text-gray-600">Truck:</span>
                                    <span className="font-medium">{booking.truck?.truck_number || 'Not Assigned'}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <span className="text-sm text-gray-600">Driver:</span>
                                    <span className="font-medium">{booking.driver?.name || 'Not Assigned'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Additional Details */}
                        <div className="panel">
                            <div className="mb-5">
                                <h3 className="text-lg font-semibold">{t('additional_information') || 'Additional Information'}</h3>
                            </div>

                            <div className="space-y-3 text-sm">
                                {booking.customer_email && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Email:</span>
                                        <span className="font-medium">{booking.customer_email}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-gray-600">{t('status') || 'Status'}:</span>
                                    <span className={`badge ${getStatusBadgeClass(booking.status)}`}>{t(booking.status) || booking.status}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">{t('created_at') || 'Created At'}:</span>
                                    <span className="font-medium">
                                        {new Date(booking.created_at).toLocaleDateString('en-GB', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                        })}
                                    </span>
                                </div>
                                {booking.notes && (
                                    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <span className="text-sm text-gray-600 block mb-2">Notes:</span>
                                        <p className="text-sm whitespace-pre-wrap">{booking.notes}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Booking Summary */}
                        <div className="panel">
                            <div className="mb-5">
                                <h3 className="text-lg font-semibold">{t('booking_summary') || 'Booking Summary'}</h3>
                            </div>

                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">{t('booking_number') || 'Booking Number'}:</span>
                                    <span className="font-medium">#{booking.booking_number}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">{t('customer') || 'Customer'}:</span>
                                    <span className="font-medium">{booking.customer_name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">{t('contact') || 'Contact'}:</span>
                                    <span className="font-medium">{booking.customer_phone}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">{t('service') || 'Service'}:</span>
                                    <span className="font-medium">{booking.service_type}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">{t('location') || 'Location'}:</span>
                                    <span className="font-medium">{booking.service_address}</span>
                                </div>
                            </div>
                        </div>

                        {/* Contact Card */}
                        <div className="panel bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                            <div className="mb-3">
                                <h3 className="text-lg font-semibold">{t('quick_contact') || 'Quick Contact'}</h3>
                            </div>
                            <div className="space-y-2">
                                <a href={`tel:${booking.customer_phone}`} className="flex items-center p-3 bg-white/20 rounded-lg hover:bg-white/30 transition">
                                    <IconPhone className="w-5 h-5 ltr:mr-3 rtl:ml-3" />
                                    <span className="font-medium">{t('call_customer') || 'Call Customer'}</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookingPreview;
