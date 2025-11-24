'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import IconArrowLeft from '@/components/icon/icon-arrow-left';
import IconEdit from '@/components/icon/icon-edit';
import IconUser from '@/components/icon/icon-user';
import IconDollarSign from '@/components/icon/icon-dollar-sign';
import IconPhone from '@/components/icon/icon-phone';
import IconMail from '@/components/icon/icon-mail';
import IconCalendar from '@/components/icon/icon-calendar';
import IconClipboardText from '@/components/icon/icon-clipboard-text';
import IconCreditCard from '@/components/icon/icon-credit-card';
import IconCamera from '@/components/icon/icon-camera';
import IconCheck from '@/components/icon/icon-check';
import IconX from '@/components/icon/icon-x';
import { supabase } from '@/lib/supabase/client';
import { getTranslation } from '@/i18n';
import Link from 'next/link';
import { Tab } from '@headlessui/react';
import MethodsSelect from '@/components/selectors/MethodsSelect';

interface Contractor {
    id: string;
    contractor_number?: string;
    name?: string;
    phone?: string;
    email?: string;
    balance?: number;
    status?: 'active' | 'inactive';
    notes?: string;
    photo_url?: string;
    created_at?: string;
    updated_at?: string;
}

interface Booking {
    id: string;
    booking_number: string;
    service_type: string;
    service_address: string;
    scheduled_date: string;
    price: number;
    contractor_price?: number | null;
    status: string;
    payment_status: string;
    contractor_id?: string;
}

interface ContractorPayment {
    id: string;
    contractor_id: string;
    booking_id?: string | null;
    amount: number;
    payment_method: string;
    payment_date: string;
    reference_number?: string | null;
    notes?: string | null;
    bookings?: {
        id: string;
        booking_number?: string;
    } | null;
}

const getContractorAmount = (booking?: Booking | null) => {
    if (!booking) return 0;
    return Number(booking.contractor_price ?? booking.price ?? 0);
};

const ContractorPreview = () => {
    const { t } = getTranslation();
    const params = useParams();
    const router = useRouter();
    const [contractor, setContractor] = useState<Contractor | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [payments, setPayments] = useState<ContractorPayment[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentForm, setPaymentForm] = useState({
        booking_id: '',
        amount: '',
        payment_method: 'cash' as 'cash' | 'credit_card' | 'bank_transfer' | 'check',
        reference_number: '',
        notes: '',
    });

    useEffect(() => {
        let mounted = true;

        const fetchData = async () => {
            try {
                const contractorId = Array.isArray(params.id) ? params.id[0] : params.id;

                // Fetch contractor data (with fresh balance from database)
                const { data: contractorData, error: contractorError } = await supabase.from('contractors').select('*').eq('id', contractorId).single();

                if (contractorError) throw contractorError;
                if (!mounted) return;

                setContractor(contractorData);

                // Fetch bookings for this contractor
                // @ts-ignore
                const { data: bookingsData, error: bookingsError } = await supabase.from('bookings').select('*').eq('contractor_id', contractorId).order('scheduled_date', { ascending: false });

                if (bookingsError) {
                    console.error('Error fetching bookings:', bookingsError);
                } else {
                    setBookings(bookingsData || []);
                }

                // Fetch payments for this contractor
                const { data: paymentsData, error: paymentsError } = await supabase
                    .from('contractor_payments')
                    .select('*, bookings:bookings!contractor_payments_booking_id_fkey (id, booking_number)')
                    .eq('contractor_id', contractorId)
                    .order('payment_date', { ascending: false });

                if (paymentsError) {
                    console.error('Error fetching contractor payments:', paymentsError);
                } else {
                    setPayments((paymentsData as any) || []);
                }

                // Fetch active services so we can show human-readable names
                // @ts-ignore
                const { data: servicesData, error: servicesError } = await supabase.from('services').select('*').eq('active', true);
                if (!servicesError && servicesData) {
                    setServices(servicesData as any);
                }
            } catch (err) {
                console.error('Error loading data:', err);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchData();

        // Refresh data when page becomes visible (user returns to tab)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && mounted) {
                fetchData();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            mounted = false;
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [params.id]);

    const handleConfirmBooking = async (bookingId: string) => {
        try {
            // @ts-ignore
            const { error } = await (supabase.from('bookings') as any).update({ status: 'confirmed' }).eq('id', bookingId);

            if (error) throw error;

            // NOTE: Do NOT modify the `contractors` table or its `balance` from this flow.
            // The contractor's owed amount is recorded on the booking via `contractor_price`.
            // If you need to display an owed amount here, compute it from the booking record
            // but do not write to `contractors.balance`.
            // const confirmed = bookings.find((b) => b.id === bookingId);
            // const owedAmount = confirmed ? Math.abs(getContractorAmount(confirmed) || 0) : 0;

            // Create Invoice Deal and Confirmation records for this booking
            try {
                const bookingRec = bookings.find((b) => b.id === bookingId) as Booking | undefined;
                const totalAmount = bookingRec ? Number(bookingRec.price || 0) : 0;

                const invoiceDealRecord = {
                    invoice_number: `DEAL-${bookingRec?.booking_number || bookingId}`,
                    booking_id: bookingId,
                    total_amount: totalAmount,
                    paid_amount: 0,
                    remaining_amount: totalAmount,
                    status: 'generated',
                    pdf_url: `/api/bookings/${bookingId}/download?type=invoice_deal`,
                    metadata: { type: 'invoice_deal' },
                    created_at: new Date().toISOString(),
                } as any;

                const confirmationRecord = {
                    invoice_number: `CONF-${bookingRec?.booking_number || bookingId}`,
                    booking_id: bookingId,
                    total_amount: 0,
                    paid_amount: 0,
                    remaining_amount: 0,
                    status: 'generated',
                    pdf_url: `/api/bookings/${bookingId}/download?type=confirmation`,
                    metadata: { type: 'confirmation' },
                    created_at: new Date().toISOString(),
                } as any;

                const { data: dealData, error: dealError } = await (supabase as any).from('invoice_deals').insert([invoiceDealRecord]).select().maybeSingle();
                if (dealError) console.error('Error inserting invoice_deal (contractor confirm):', dealError);

                const { data: confData, error: confError } = await (supabase as any).from('invoice_deals').insert([confirmationRecord]).select().maybeSingle();
                if (confError) console.error('Error inserting confirmation (contractor confirm):', confError);
            } catch (e) {
                console.error('Error creating invoice_deals on contractor confirm:', e);
            }

            // Update UI
            setBookings(bookings.map((booking) => (booking.id === bookingId ? { ...booking, status: 'confirmed' } : booking)));

            alert('Booking confirmed successfully!');
        } catch (error) {
            console.error('Error confirming booking:', error);
            alert('Error confirming booking');
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleString();
        } catch (e) {
            return '-';
        }
    };

    const getServiceName = (serviceType?: string) => {
        if (!serviceType) return '-';
        const svc = services.find((s) => s.id === serviceType);
        if (svc && svc.name) return svc.name;
        return String(serviceType)
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (l) => l.toUpperCase());
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!contractor) {
        return (
            <div className="panel">
                <div className="text-center py-10">
                    <h3 className="text-lg font-semibold text-danger">Contractor not found</h3>
                    <Link href="/contractors" className="btn btn-primary mt-4">
                        <IconArrowLeft className="ltr:mr-2 rtl:ml-2" />
                        Back to Contractors
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
                            <Link href="/contractors" className="text-primary hover:underline">
                                Contractors
                            </Link>
                        </li>
                        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                            <span>Contractor Details</span>
                        </li>
                    </ul>
                </div>

                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Contractor Details</h1>
                        <p className="text-gray-500">{contractor.name}</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => window.location.reload()} className="btn btn-outline-primary" title="Refresh data to see latest balance">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                            </svg>
                            Refresh
                        </button>
                        {contractor && (
                            <Link href={`/contractors/edit/${contractor.id}`} className="btn btn-primary">
                                <IconEdit className="ltr:mr-2 rtl:ml-2" />
                                Edit Contractor
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            <div className="container mx-auto p-6">
                {/* Financial Summary Cards */}
                <div className="grid grid-cols-1 gap-5 md:grid-cols-4 mb-6">
                    <div className="panel bg-gradient-to-br from-blue-500/10 to-blue-600/10">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                                <IconCalendar className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{bookings.length}</div>
                                <div className="text-xs text-gray-500">Total Bookings</div>
                            </div>
                        </div>
                    </div>
                    <div className="panel bg-gradient-to-br from-green-500/10 to-green-600/10">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/20">
                                <IconCreditCard className="h-6 w-6 text-success" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">₪{payments.reduce((sum, p) => sum + (p.amount || 0), 0).toFixed(2)}</div>
                                <div className="text-xs text-gray-500">Total Payments</div>
                            </div>
                        </div>
                    </div>
                    <div className="panel bg-gradient-to-br from-purple-500/10 to-purple-600/10">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/20">
                                <IconDollarSign className="h-6 w-6 text-purple-500" />
                            </div>
                            <div>
                                <div className={`text-2xl font-bold ${(contractor?.balance || 0) > 0 ? 'text-success' : 'text-danger'}`}>₪{(contractor?.balance || 0).toFixed(2)}</div>
                                <div className="text-xs text-gray-500">Current Balance</div>
                            </div>
                        </div>
                    </div>
                    <div className="panel bg-gradient-to-br from-orange-500/10 to-orange-600/10">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/20">
                                <IconClipboardText className="h-6 w-6 text-orange-500" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{contractor.status === 'active' ? 'Active' : 'Inactive'}</div>
                                <div className="text-xs text-gray-500">Status</div>
                            </div>
                        </div>
                    </div>
                </div>

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
                                    Bookings
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
                                    <IconCreditCard className="ltr:mr-2 rtl:ml-2" />
                                    Accounting
                                </button>
                            )}
                        </Tab>
                    </Tab.List>
                    <Tab.Panels className="mt-5">
                        {/* Details Tab */}
                        <Tab.Panel>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Contractor Information */}
                                <div className="space-y-6">
                                    {/* Basic Info */}
                                    <div className="panel">
                                        <div className="mb-5">
                                            <h3 className="text-lg font-semibold">Basic Information</h3>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <h2 className="text-2xl font-bold text-primary mb-2">{contractor.name}</h2>
                                                <span className={`badge ${contractor.status === 'active' ? 'badge-outline-success' : 'badge-outline-danger'}`}>
                                                    {contractor.status === 'active' ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex items-center">
                                                    <IconUser className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                                    <span className="text-sm text-gray-600 ltr:mr-2 rtl:ml-2">Name:</span>
                                                    <span className="font-medium">{contractor.name}</span>
                                                </div>

                                                <div className="flex items-center">
                                                    <IconPhone className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                                    <span className="text-sm text-gray-600 ltr:mr-2 rtl:ml-2">Phone:</span>
                                                    <span className="font-medium">
                                                        <a href={`tel:${contractor.phone}`} className="text-primary hover:underline">
                                                            {contractor.phone}
                                                        </a>
                                                    </span>
                                                </div>

                                                {contractor.email && (
                                                    <div className="flex items-center">
                                                        <IconMail className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                                        <span className="text-sm text-gray-600 ltr:mr-2 rtl:ml-2">Email:</span>
                                                        <span className="font-medium">
                                                            <a href={`mailto:${contractor.email}`} className="text-primary hover:underline">
                                                                {contractor.email}
                                                            </a>
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Contact Information */}
                                    <div className="panel">
                                        <div className="mb-5">
                                            <h3 className="text-lg font-semibold">Contact Information</h3>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                <div className="flex items-center">
                                                    <IconPhone className="w-5 h-5 text-gray-400 ltr:mr-2 rtl:ml-2" />
                                                    <span className="text-sm text-gray-600">Phone:</span>
                                                </div>
                                                <a href={`tel:${contractor.phone}`} className="font-semibold text-primary hover:underline">
                                                    {contractor.phone}
                                                </a>
                                            </div>

                                            {contractor.email && (
                                                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                    <div className="flex items-center">
                                                        <IconMail className="w-5 h-5 text-gray-400 ltr:mr-2 rtl:ml-2" />
                                                        <span className="text-sm text-gray-600">Email:</span>
                                                    </div>
                                                    <a href={`mailto:${contractor.email}`} className="font-semibold text-primary hover:underline">
                                                        {contractor.email}
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Additional Information */}
                                <div className="space-y-6">
                                    <div className="panel">
                                        <div className="mb-5">
                                            <h3 className="text-lg font-semibold">Additional Information</h3>
                                        </div>

                                        <div className="space-y-3 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Contractor Number:</span>
                                                <span className="font-medium">#{contractor.contractor_number || contractor.id.slice(0, 8)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Contractor ID:</span>
                                                <span className="font-medium font-mono text-xs">{contractor.id}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Status:</span>
                                                <span className={`badge ${contractor.status === 'active' ? 'badge-outline-success' : 'badge-outline-danger'}`}>
                                                    {contractor.status === 'active' ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Created At:</span>
                                                <span className="font-medium">
                                                    {new Date(contractor.created_at || '').toLocaleDateString('en-GB', {
                                                        year: 'numeric',
                                                        month: '2-digit',
                                                        day: '2-digit',
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    {contractor.notes && (
                                        <div className="panel">
                                            <div className="mb-5">
                                                <h3 className="text-lg font-semibold">Notes</h3>
                                            </div>
                                            <p className="text-gray-600 whitespace-pre-wrap">{contractor.notes}</p>
                                        </div>
                                    )}

                                    {/* Contact Card */}
                                    <div className="panel bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                                        <div className="mb-3">
                                            <h3 className="text-lg font-semibold">Quick Contact</h3>
                                        </div>
                                        <div className="space-y-2">
                                            <a href={`tel:${contractor.phone}`} className="flex items-center p-3 bg-white/20 rounded-lg hover:bg-white/30 transition">
                                                <IconPhone className="w-5 h-5 ltr:mr-3 rtl:ml-3" />
                                                <span className="font-medium">Call Contractor</span>
                                            </a>
                                            {contractor.email && (
                                                <a href={`mailto:${contractor.email}`} className="flex items-center p-3 bg-white/20 rounded-lg hover:bg-white/30 transition">
                                                    <IconMail className="w-5 h-5 ltr:mr-3 rtl:ml-3" />
                                                    <span className="font-medium">Send Email</span>
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Contractor Photo */}
                                <div className="panel">
                                    <div className="mb-5">
                                        <h3 className="text-lg font-semibold">Contractor Photo</h3>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <div className="mb-5">
                                            <div className="w-32 h-32 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                                                {contractor.photo_url ? (
                                                    <img src={contractor.photo_url} alt={contractor.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <IconUser className="w-16 h-16 text-gray-400" />
                                                )}
                                            </div>
                                        </div>
                                        <button className="btn btn-primary gap-2">
                                            <IconCamera />
                                            Upload a photo
                                        </button>
                                        <p className="text-xs text-gray-500 mt-2">JPG, PNG or GIF (MAX. 800x400px)</p>
                                    </div>
                                </div>
                            </div>
                        </Tab.Panel>

                        {/* Bookings Tab */}
                        <Tab.Panel>
                            <div className="panel">
                                <div className="mb-5">
                                    <h3 className="text-lg font-semibold">Contractor Bookings</h3>
                                </div>
                                {bookings.length === 0 ? (
                                    <div className="text-center py-10">
                                        <p className="text-gray-500">No bookings found for this contractor</p>
                                    </div>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="table-hover">
                                            <thead>
                                                <tr>
                                                    <th>Booking #</th>
                                                    <th>Service</th>
                                                    <th>Date</th>
                                                    <th className="text-right">Price</th>
                                                    <th className="text-center">Status</th>
                                                    <th className="text-center">Payment</th>
                                                    <th className="text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {bookings.map((booking) => (
                                                    <tr key={booking.id}>
                                                        <td className="font-semibold text-primary">#{booking.booking_number}</td>
                                                        <td>{getServiceName(booking.service_type)}</td>
                                                        <td>{new Date(booking.scheduled_date).toLocaleDateString()}</td>
                                                        <td className="text-right font-bold">₪{getContractorAmount(booking).toLocaleString()}</td>
                                                        <td className="text-center">
                                                            <span
                                                                className={`badge ${
                                                                    booking.status === 'confirmed'
                                                                        ? 'badge-outline-success'
                                                                        : booking.status === 'awaiting_execution'
                                                                          ? 'badge-outline-warning'
                                                                          : booking.status === 'completed'
                                                                            ? 'badge-outline-info'
                                                                            : 'badge-outline-danger'
                                                                }`}
                                                            >
                                                                {booking.status}
                                                            </span>
                                                        </td>
                                                        <td className="text-center">
                                                            <span
                                                                className={`badge ${
                                                                    booking.payment_status === 'paid'
                                                                        ? 'badge-outline-success'
                                                                        : booking.payment_status === 'partial'
                                                                          ? 'badge-outline-warning'
                                                                          : 'badge-outline-danger'
                                                                }`}
                                                            >
                                                                {booking.payment_status}
                                                            </span>
                                                        </td>
                                                        <td className="text-center">
                                                            {booking.status === 'awaiting_execution' && (
                                                                <button onClick={() => handleConfirmBooking(booking.id)} className="btn btn-sm btn-success ltr:mr-2 rtl:ml-2" title="Confirm Booking">
                                                                    <IconCheck className="w-4 h-4" />
                                                                    Confirm
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </Tab.Panel>

                        {/* Accounting Tab */}
                        <Tab.Panel>
                            <div className="panel">
                                <div className="mb-5 flex items-center justify-between">
                                    <h3 className="text-lg font-semibold">Payments History</h3>
                                    <button onClick={() => setShowPaymentModal(true)} className="btn btn-primary gap-2">
                                        <IconCreditCard className="w-4 h-4" />
                                        Record Payment
                                    </button>
                                </div>
                                <div className="table-responsive">
                                    <table className="table-hover">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Type</th>
                                                <th>Booking #</th>
                                                <th>Method</th>
                                                <th className="text-right">Amount</th>
                                                <th>Notes</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(
                                                [
                                                    // bookings as negative rows
                                                    ...(bookings || []).map((b) => ({
                                                        id: `booking-${b.id}`,
                                                        date: b.scheduled_date,
                                                        type: 'Booking',
                                                        booking_number: b.booking_number,
                                                        service: getServiceName(b.service_type),
                                                        method: null,
                                                        amount: -getContractorAmount(b),
                                                        notes: b.status,
                                                    })),
                                                    // payments as positive rows
                                                    ...(payments || []).map((p) => ({
                                                        id: `payment-${p.id}`,
                                                        date: p.payment_date,
                                                        type: 'Payment',
                                                        booking_number: (bookings.find((b) => b.id === p.booking_id) || { booking_number: '-' }).booking_number,
                                                        service: getServiceName((bookings.find((b) => b.id === p.booking_id) || { service_type: '-' }).service_type),
                                                        method: p.payment_method,
                                                        amount: p.amount,
                                                        notes: p.notes || '-',
                                                    })),
                                                ] as any
                                            )
                                                .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                                .map((row: any) => (
                                                    <tr key={row.id}>
                                                        <td>{row.date ? new Date(row.date).toLocaleDateString('en-GB') : '-'}</td>
                                                        <td>
                                                            <span className={`badge ${row.type === 'Booking' ? 'badge-outline-warning' : 'badge-outline-success'}`}>{row.type}</span>
                                                        </td>
                                                        <td className="font-semibold text-primary">{row.booking_number || '-'}</td>
                                                        <td>{row.method ? <span className="badge badge-outline-info">{row.method}</span> : '-'}</td>
                                                        <td className={`text-right font-bold ${row.type === 'Booking' ? 'text-danger' : 'text-success'}`}>
                                                            {row.type === 'Booking' ? `-₪${Math.abs(row.amount || 0).toFixed(2)}` : `+₪${(row.amount || 0).toLocaleString()}`}
                                                        </td>
                                                        <td className="text-sm text-gray-600">{row.notes || '-'}</td>
                                                    </tr>
                                                ))}
                                            {(bookings && bookings.length) || (payments && payments.length) ? null : (
                                                <tr>
                                                    <td colSpan={6} className="text-center text-gray-500 py-10">
                                                        No bookings or payments recorded yet
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <h3 className="text-lg font-semibold mb-2">Current Balance</h3>
                                    <p className={`text-3xl font-bold ${(contractor.balance || 0) > 0 ? 'text-success' : 'text-danger'}`}>
                                        ₪{contractor.balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                    </p>
                                    <p className="text-sm text-gray-500 mt-2">
                                        Total Bookings: ₪{bookings.reduce((sum, b) => sum + getContractorAmount(b), 0).toFixed(2)} | Total Payments: ₪
                                        {payments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
                                    </p>
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
                                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        </div>

                        <form
                            onSubmit={async (e) => {
                                e.preventDefault();

                                if (!paymentForm.booking_id || !contractor) {
                                    alert('Please select a booking');
                                    return;
                                }

                                try {
                                    const paymentAmount = parseFloat(paymentForm.amount);

                                    // Create contractor payment record
                                    const { error: paymentError } = await (supabase.from('contractor_payments') as any).insert({
                                        booking_id: paymentForm.booking_id,
                                        contractor_id: contractor?.id || '',
                                        amount: paymentAmount,
                                        payment_method: paymentForm.payment_method,
                                        payment_date: new Date().toISOString(),
                                        reference_number: paymentForm.reference_number || null,
                                        notes: paymentForm.notes || null,
                                    });

                                    if (paymentError) {
                                        console.error('Payment creation error:', paymentError);
                                        throw paymentError;
                                    }

                                    // Deduct payment from contractor balance as requested
                                    if (contractor?.id) {
                                        const newBalance = (contractor.balance || 0) + paymentAmount;
                                        // @ts-ignore
                                        const { error: contractorUpdateError } = await (supabase.from('contractors') as any)
                                            .update({ balance: newBalance, updated_at: new Date().toISOString() })
                                            .eq('id', contractor.id);
                                        if (contractorUpdateError) throw contractorUpdateError;
                                        setContractor({ ...contractor, balance: newBalance });
                                    }

                                    alert('Payment recorded successfully!');
                                    setShowPaymentModal(false);
                                    window.location.reload();
                                } catch (error: any) {
                                    console.error('Error recording payment:', error);
                                    alert(`Error recording payment: ${error.message || 'Unknown error'}`);
                                }
                            }}
                        >
                            <div className="space-y-4">
                                {/* Select Booking */}
                                <div>
                                    <label className="block text-sm font-bold mb-2">Select Booking *</label>
                                    <select
                                        value={paymentForm.booking_id}
                                        onChange={(e) => {
                                            const booking = bookings.find((b) => b.id === e.target.value);
                                            setPaymentForm({
                                                ...paymentForm,
                                                booking_id: e.target.value,
                                                amount: String(getContractorAmount(booking || undefined)),
                                            });
                                        }}
                                        className="form-select"
                                        required
                                    >
                                        <option value="">-- Select Booking --</option>
                                        {bookings
                                            .filter((b) => b.payment_status !== 'paid')
                                            .map((booking) => (
                                                <option key={booking.id} value={booking.id}>
                                                    #{booking.booking_number} - ₪{getContractorAmount(booking)}
                                                </option>
                                            ))}
                                    </select>
                                </div>

                                {/* Amount */}
                                <div>
                                    <label className="block text-sm font-bold mb-2">Amount (₪) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={paymentForm.amount}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                        className="form-input"
                                        required
                                    />
                                </div>

                                {/* Payment Method */}
                                <div>
                                    <label className="block text-sm font-bold mb-2">Payment Method *</label>
                                    <MethodsSelect
                                        value={paymentForm.payment_method}
                                        onChange={(val) => {
                                            const newMethod = (val || 'cash') as 'cash' | 'credit_card' | 'bank_transfer' | 'check';
                                            setPaymentForm({ ...paymentForm, payment_method: newMethod });
                                        }}
                                        className="form-select"
                                    />
                                </div>

                                {/* Reference Number */}
                                <div>
                                    <label className="block text-sm font-bold mb-2">Reference (Optional)</label>
                                    <input
                                        type="text"
                                        value={paymentForm.reference_number}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
                                        className="form-input"
                                    />
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className="block text-sm font-bold mb-2">Notes (Optional)</label>
                                    <textarea value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} className="form-textarea" rows={3} />
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

export default ContractorPreview;
