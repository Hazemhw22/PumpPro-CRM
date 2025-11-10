'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import IconArrowLeft from '@/components/icon/icon-arrow-left';
import IconEdit from '@/components/icon/icon-edit';
import IconUser from '@/components/icon/icon-user';
import IconMapPin from '@/components/icon/icon-map-pin';
import IconPhone from '@/components/icon/icon-phone';
import IconMail from '@/components/icon/icon-mail';
import IconCalendar from '@/components/icon/icon-calendar';
import IconClock from '@/components/icon/icon-clock';
import IconClipboardText from '@/components/icon/icon-clipboard-text';
import IconCreditCard from '@/components/icon/icon-credit-card';
import IconPrinter from '@/components/icon/icon-printer';
import IconDollarSign from '@/components/icon/icon-dollar-sign';
import { supabase } from '@/lib/supabase/client';
import { getTranslation } from '@/i18n';
import Link from 'next/link';
import { Tab } from '@headlessui/react';

interface Booking {
    id: string;
    created_at: string;
    booking_number: string;
    customer_type: 'private' | 'business';
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    customer_id?: string;
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

interface Invoice {
    id: string;
    invoice_number: string;
    booking_id: string;
    total_amount: number;
    paid_amount: number;
    remaining_amount: number;
    status: string;
    due_date: string;
    created_at: string;
}

interface Payment {
    id: string;
    invoice_id: string;
    booking_id: string;
    amount: number;
    payment_method: string;
    transaction_id?: string;
    notes?: string;
    payment_date: string;
}

const BookingPreview = () => {
    const { t } = getTranslation();
    const params = useParams();
    const router = useRouter();
    const [booking, setBooking] = useState<Booking | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentForm, setPaymentForm] = useState({
        amount: '',
        payment_method: 'cash' as 'cash' | 'credit_card' | 'bank_transfer' | 'check',
        transaction_id: '',
        notes: '',
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch booking
                const { data: bookingData, error: bookingError } = await supabase
                    .from('bookings')
                    .select('*')
                    .eq('id', params?.id)
                    .single();

                if (bookingError) throw bookingError;

                // Fetch related data
                const booking = bookingData as any;
                const [truckRes, driverRes, serviceRes] = await Promise.all([
                    booking.truck_id ? supabase.from('trucks').select('truck_number, license_plate').eq('id', booking.truck_id).single() : { data: null },
                    booking.driver_id ? supabase.from('drivers').select('name, driver_number').eq('id', booking.driver_id).single() : { data: null },
                    booking.service_type ? supabase.from('services').select('name').eq('id', booking.service_type).single() : { data: null },
                ]);

                // Fetch invoices for this booking
                const { data: invoicesData, error: invoicesError } = await supabase
                    .from('invoices')
                    .select('*')
                    .eq('booking_id', params?.id)
                    .order('created_at', { ascending: false });

                // Fetch payments for this booking
                const { data: paymentsData, error: paymentsError } = await supabase
                    .from('payments')
                    .select('*')
                    .eq('booking_id', params?.id)
                    .order('payment_date', { ascending: false });

                // Combine data
                const enrichedBooking = {
                    ...booking,
                    truck: truckRes.data,
                    driver: driverRes.data,
                    service_name: (serviceRes.data as any)?.name,
                };

                setBooking(enrichedBooking as any);
                if (!invoicesError && invoicesData) {
                    setInvoices(invoicesData as any);
                }
                if (!paymentsError && paymentsData) {
                    setPayments(paymentsData as any);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        if (params?.id) {
            fetchData();
        }
    }, [params?.id]);

    useEffect(() => {
        if (booking?.price) {
            setPaymentForm(prev => ({
                ...prev,
                amount: String(booking.price)
            }));
        }
    }, [booking?.price]);

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
                <Tab.Group>
                    <Tab.List className="mt-3 flex border-b border-white-light dark:border-[#191e3a] w-full">
                        <Tab as="div" className="flex-1">
                            {({ selected }) => (
                                <button
                                    className={`${
                                        selected ? 'text-primary !outline-none before:!w-full' : ''
                                    } relative -mb-[1px] flex w-full items-center justify-center border-b-2 border-transparent p-4 before:absolute before:bottom-0 before:left-0 before:right-0 before:m-auto before:inline-block before:h-[2px] before:w-0 before:bg-primary before:transition-all before:duration-300 hover:text-primary hover:before:w-full h-16 flex items-center justify-center`}
                                >
                                    <div className="flex items-center justify-center space-x-2">
                                        <IconUser className="w-5 h-5" />
                                        <span className="text-sm font-medium">Basic Information</span>
                                    </div>
                                </button>
                            )}
                        </Tab>
                        <Tab as="div" className="flex-1">
                            {({ selected }) => (
                                <button
                                    className={`${
                                        selected ? 'text-primary !outline-none before:!w-full' : ''
                                    } relative -mb-[1px] flex w-full items-center justify-center border-b-2 border-transparent p-4 before:absolute before:bottom-0 before:left-0 before:right-0 before:m-auto before:inline-block before:h-[2px] before:w-0 before:bg-primary before:transition-all before:duration-300 hover:text-primary hover:before:w-full h-16 flex items-center justify-center`}
                                >
                                    <div className="flex items-center justify-center space-x-2">
                                        <IconDollarSign className="w-5 h-5" />
                                        <span className="text-sm font-medium">Accounting</span>
                                    </div>
                                </button>
                            )}
                        </Tab>
                        <Tab as="div" className="flex-1">
                            {({ selected }) => (
                                <button
                                    className={`${
                                        selected ? 'text-primary !outline-none before:!w-full' : ''
                                    } relative -mb-[1px] flex w-full items-center justify-center border-b-2 border-transparent p-4 before:absolute before:bottom-0 before:left-0 before:right-0 before:m-auto before:inline-block before:h-[2px] before:w-0 before:bg-primary before:transition-all before:duration-300 hover:text-primary hover:before:w-full h-16 flex items-center justify-center`}
                                >
                                    <div className="flex items-center justify-center space-x-2">
                                        <IconClipboardText className="w-5 h-5" />
                                        <span className="text-sm font-medium">History</span>
                                    </div>
                                </button>
                            )}
                        </Tab>
                    </Tab.List>
                    <Tab.Panels className="mt-5">
                        {/* Basic Information Tab */}
                        <Tab.Panel>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Customer Information */}
                                <div className="space-y-6">
                                    {/* Basic Info */}
                                    <div className="panel">
                                        <div className="mb-5">
                                            <h3 className="text-lg font-semibold">Basic Information</h3>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <h2 className="text-2xl font-bold text-primary mb-2">{booking.customer_name}</h2>
                                                <span className={`badge ${getStatusBadgeClass(booking.status)}`}>{t(booking.status) || booking.status}</span>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex items-center">
                                                    <IconUser className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                                    <span className="text-sm text-gray-600 ltr:mr-2 rtl:ml-2">Booking Number:</span>
                                                    <span className="font-medium">#{booking.booking_number}</span>
                                                </div>

                                                <div className="flex items-center">
                                                    <IconUser className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                                    <span className="text-sm text-gray-600 ltr:mr-2 rtl:ml-2">Customer Name:</span>
                                                    <span className="font-medium">{booking.customer_name}</span>
                                                </div>

                                                <div className="flex items-center">
                                                    <IconPhone className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                                    <span className="text-sm text-gray-600 ltr:mr-2 rtl:ml-2">Phone:</span>
                                                    <span className="font-medium">
                                                        <a href={`tel:${booking.customer_phone}`} className="text-primary hover:underline">
                                                            {booking.customer_phone}
                                                        </a>
                                                    </span>
                                                </div>

                                                <div className="flex items-center">
                                                    <IconMapPin className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                                    <span className="text-sm text-gray-600 ltr:mr-2 rtl:ml-2">Service Address:</span>
                                                    <span className="font-medium">{booking.service_address}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Schedule Information */}
                                    <div className="panel">
                                        <div className="mb-5">
                                            <h3 className="text-lg font-semibold">Schedule Information</h3>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                <div className="flex items-center">
                                                    <IconCalendar className="w-5 h-5 text-gray-400 ltr:mr-2 rtl:ml-2" />
                                                    <span className="text-sm text-gray-600">Scheduled Date:</span>
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
                                                    <span className="text-sm text-gray-600">Scheduled Time:</span>
                                                </div>
                                                <span className="font-semibold text-gray-700 dark:text-gray-300">{booking.scheduled_time}</span>
                                            </div>

                                            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                <div className="flex items-center">
                                                    <IconUser className="w-5 h-5 text-gray-400 ltr:mr-2 rtl:ml-2" />
                                                    <span className="text-sm text-gray-600">Service Type:</span>
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
                                            <h3 className="text-lg font-semibold">Additional Information</h3>
                                        </div>

                                        <div className="space-y-3 text-sm">
                                            {booking.customer_email && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Email:</span>
                                                    <span className="font-medium">{booking.customer_email}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Status:</span>
                                                <span className={`badge ${getStatusBadgeClass(booking.status)}`}>{t(booking.status) || booking.status}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Created At:</span>
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

                                    {/* Contact Card */}
                                    <div className="panel bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                                        <div className="mb-3">
                                            <h3 className="text-lg font-semibold">Quick Contact</h3>
                                        </div>
                                        <div className="space-y-2">
                                            <a href={`tel:${booking.customer_phone}`} className="flex items-center p-3 bg-white/20 rounded-lg hover:bg-white/30 transition">
                                                <IconPhone className="w-5 h-5 ltr:mr-3 rtl:ml-3" />
                                                <span className="font-medium">Call Customer</span>
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Tab.Panel>

                        {/* ACCOUNTING Tab */}
                        <Tab.Panel>
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-3 mb-6">
                                <div className="panel bg-gradient-to-br from-green-500/10 to-green-600/10">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/20">
                                            <IconDollarSign className="h-6 w-6 text-success" />
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold text-success">₪{booking.price || 0}</div>
                                            <div className="text-xs text-gray-500">Service Price</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="panel bg-gradient-to-br from-blue-500/10 to-blue-600/10">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                                            <IconCreditCard className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold">₪{payments.reduce((sum, p) => sum + (p.amount || 0), 0).toFixed(2)}</div>
                                            <div className="text-xs text-gray-500">Total Payments</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="panel bg-gradient-to-br from-red-500/10 to-red-600/10">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/20">
                                            <IconClipboardText className="h-6 w-6 text-danger" />
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold text-danger">₪{invoices.reduce((sum, inv) => sum + (inv.remaining_amount || 0), 0).toFixed(2)}</div>
                                            <div className="text-xs text-gray-500">Balance Due</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="panel">
                                <div className="mb-5 flex items-center justify-between">
                                    <h3 className="text-lg font-semibold">Add Payment</h3>
                                    <button
                                        onClick={() => setShowPaymentModal(true)}
                                        className="btn btn-primary"
                                    >
                                        Record New Payment
                                    </button>
                                </div>

                                {payments.length === 0 ? (
                                    <div className="text-center py-10">
                                        <p className="text-gray-500">No payments found for this booking. Click "Record New Payment" to add a payment.</p>
                                    </div>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="table-bordered">
                                            <thead>
                                                <tr>
                                                    <th>Payment Date</th>
                                                    <th>Customer</th>
                                                    <th>Amount</th>
                                                    <th>Payment Method</th>
                                                    <th>Transaction ID</th>
                                                    <th>Notes</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {payments.map((payment) => (
                                                    <tr key={payment.id}>
                                                        <td>{new Date(payment.payment_date).toLocaleDateString('en-GB')}</td>
                                                        <td>{booking?.customer_name || '-'}</td>
                                                        <td className="text-success font-bold">₪{payment.amount?.toFixed(2) || '0.00'}</td>
                                                        <td>
                                                            <span className="badge badge-outline-info">
                                                                {payment.payment_method?.replace('_', ' ').toUpperCase()}
                                                            </span>
                                                        </td>
                                                        <td>{payment.transaction_id || '-'}</td>
                                                        <td className="max-w-xs truncate">{payment.notes || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </Tab.Panel>

                        {/* السجل Tab */}
                        <Tab.Panel>
                            <div className="space-y-6">
                                {/* Booking History */}
                                <div className="panel">
                                    <div className="mb-5">
                                        <h3 className="text-lg font-semibold">Booking History</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                            <span className="text-sm text-gray-600">Booking Created:</span>
                                            <span className="font-medium">
                                                {new Date(booking.created_at).toLocaleDateString('en-GB', {
                                                    year: 'numeric',
                                                    month: '2-digit',
                                                    day: '2-digit',
                                                })}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                            <span className="text-sm text-gray-600">Scheduled Date:</span>
                                            <span className="font-medium">
                                                {new Date(booking.scheduled_date).toLocaleDateString('en-GB', {
                                                    year: 'numeric',
                                                    month: '2-digit',
                                                    day: '2-digit',
                                                })}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                            <span className="text-sm text-gray-600">Status Changes:</span>
                                            <span className={`badge ${getStatusBadgeClass(booking.status)}`}>{booking.status}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Invoices */}
                                <div className="panel">
                                    <div className="mb-5">
                                        <h3 className="text-lg font-semibold">Invoices</h3>
                                    </div>
                                    {invoices.length === 0 ? (
                                        <div className="text-center py-10">
                                            <p className="text-gray-500">No invoices found for this booking</p>
                                        </div>
                                    ) : (
                                        <div className="table-responsive">
                                            <table className="table-bordered">
                                                <thead>
                                                    <tr>
                                                        <th>Invoice #</th>
                                                        <th>Total Amount</th>
                                                        <th>Paid Amount</th>
                                                        <th>Remaining</th>
                                                        <th>Status</th>
                                                        <th>Due Date</th>
                                                        <th>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {invoices.map((invoice) => (
                                                        <tr key={invoice.id}>
                                                            <td>
                                                                <strong className="text-primary">#{invoice.invoice_number}</strong>
                                                            </td>
                                                            <td>₪{invoice.total_amount?.toFixed(2) || 0}</td>
                                                            <td className="text-success">₪{invoice.paid_amount?.toFixed(2) || 0}</td>
                                                            <td className="text-danger">₪{invoice.remaining_amount?.toFixed(2) || 0}</td>
                                                            <td>
                                                                <span className={`badge ${
                                                                    invoice.status === 'paid' ? 'badge-outline-success' :
                                                                    invoice.status === 'partial' ? 'badge-outline-warning' :
                                                                    invoice.status === 'overdue' ? 'badge-outline-danger' :
                                                                    'badge-outline-info'
                                                                }`}>
                                                                    {invoice.status?.toUpperCase()}
                                                                </span>
                                                            </td>
                                                            <td>{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-GB') : '-'}</td>
                                                            <td className="text-center">
                                                                <button
                                                                    onClick={() => {
                                                                        window.open(`/invoices/preview/${invoice.id}?print=true`, '_blank');
                                                                    }}
                                                                    className="inline-flex hover:text-primary"
                                                                    title="Print Invoice"
                                                                >
                                                                    <IconPrinter className="h-5 w-5" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>

                                {/* Payments */}
                                <div className="panel">
                                    <div className="mb-5">
                                        <h3 className="text-lg font-semibold">Payment History</h3>
                                    </div>
                                    {payments.length === 0 ? (
                                        <div className="text-center py-10">
                                            <p className="text-gray-500">No payments found for this booking</p>
                                        </div>
                                    ) : (
                                        <div className="table-responsive">
                                            <table className="table-bordered">
                                                <thead>
                                                    <tr>
                                                        <th>Payment Date</th>
                                                        <th>Customer</th>
                                                        <th>Amount</th>
                                                        <th>Payment Method</th>
                                                        <th>Transaction ID</th>
                                                        <th>Notes</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {payments.map((payment) => (
                                                        <tr key={payment.id}>
                                                            <td>{new Date(payment.payment_date).toLocaleDateString('en-GB')}</td>
                                                            <td>{booking?.customer_name || '-'}</td>
                                                            <td className="text-success font-bold">₪{payment.amount?.toFixed(2) || 0}</td>
                                                            <td>
                                                                <span className="badge badge-outline-info">
                                                                    {payment.payment_method?.replace('_', ' ').toUpperCase()}
                                                                </span>
                                                            </td>
                                                            <td>{payment.transaction_id || '-'}</td>
                                                            <td className="max-w-xs truncate">{payment.notes || '-'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Tab.Panel>
                    </Tab.Panels>
                </Tab.Group>
            </div>
            
          

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="panel w-full max-w-lg mx-4">
                        <div className="mb-5 flex items-center justify-between">
                            <h5 className="text-lg font-semibold">Record New Payment</h5>
                            <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                        </div>

                    <form onSubmit={async (e) => {
                        e.preventDefault();

                        try {
                            // Create invoice if not exists
                            // @ts-ignore
                            const { data: existingInvoice, error: invoiceCheckError } = await supabase
                                .from('invoices')
                                .select('*')
                                .eq('booking_id', params?.id)
                                .maybeSingle();

                            if (invoiceCheckError) {
                                console.error('Error checking invoice:', invoiceCheckError);
                                throw invoiceCheckError;
                            }

                            // @ts-ignore
                            let invoiceId = existingInvoice?.id;

                            if (!existingInvoice) {
                                console.log('Creating new invoice...');
                                // Generate invoice number
                                const invoiceNumber = `INV-${Date.now()}`;

                                const { data: newInvoice, error: invoiceError } = await supabase
                                    .from('invoices')
                                    // @ts-ignore
                                    .insert({
                                        invoice_number: invoiceNumber,
                                        booking_id: params?.id,
                                        customer_id: booking?.customer_id,
                                        total_amount: parseFloat(paymentForm.amount),
                                        paid_amount: 0,
                                        remaining_amount: parseFloat(paymentForm.amount),
                                        status: 'pending',
                                        due_date: new Date().toISOString().split('T')[0]
                                    })
                                    .select()
                                    .single();

                                if (invoiceError) {
                                    console.error('Invoice creation error:', invoiceError);
                                    throw invoiceError;
                                }
                                // @ts-ignore
                                invoiceId = newInvoice?.id;
                                console.log('Invoice created:', invoiceId);
                            }

                            // Create payment
                            console.log('Creating payment...');
                            const { error: paymentError } = await supabase
                                .from('payments')
                                // @ts-ignore
                                .insert({
                                    invoice_id: invoiceId,
                                    booking_id: params?.id,
                                    customer_id: booking?.customer_id,
                                    amount: parseFloat(paymentForm.amount),
                                    payment_method: paymentForm.payment_method,
                                    transaction_id: paymentForm.transaction_id || null,
                                    notes: paymentForm.notes || null,
                                    payment_date: new Date().toISOString()
                                });

                            if (paymentError) {
                                console.error('Payment creation error:', paymentError);
                                throw paymentError;
                            }

                            console.log('Payment recorded successfully');
                            alert('Payment recorded successfully!');
                            setShowPaymentModal(false);
                            window.location.reload();
                        } catch (error: any) {
                            console.error('Error recording payment:', error);
                            alert(`Error recording payment: ${error.message || 'Unknown error'}`);
                        }
                    }}>
                        <div className="space-y-4">
                            {/* Amount */}
                            <div>
                                <label className="block text-sm font-bold mb-2">Amount (₪) *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={paymentForm.amount}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                    className="form-input"
                                    placeholder={`Enter amount (Service Price: ₪${booking?.price || 0})`}
                                    required
                                />
                            </div>

                            {/* Payment Method */}
                            <div>
                                <label className="block text-sm font-bold mb-2">Payment Method *</label>
                                <select
                                    value={paymentForm.payment_method}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value as any })}
                                    className="form-select"
                                    required
                                >
                                    <option value="cash">Cash</option>
                                    <option value="credit_card">Credit Card</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="check">Check</option>
                                </select>
                            </div>

                            {/* Transaction ID */}
                            <div>
                                <label className="block text-sm font-bold mb-2">Transaction ID (Optional)</label>
                                <input
                                    type="text"
                                    value={paymentForm.transaction_id}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, transaction_id: e.target.value })}
                                    className="form-input"
                                    placeholder="Enter transaction ID"
                                />
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-bold mb-2">Notes (Optional)</label>
                                <textarea
                                    value={paymentForm.notes}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                                    className="form-textarea"
                                    rows={3}
                                    placeholder="Enter payment notes"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button type="button" onClick={() => setShowPaymentModal(false)} className="btn btn-outline-danger">
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary">
                                Record Payment
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
        </div>
    );
};

export default BookingPreview;
