'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import IconArrowLeft from '@/components/icon/icon-arrow-left';
import IconEdit from '@/components/icon/icon-edit';
import IconUser from '@/components/icon/icon-user';
import IconDollarSign from '@/components/icon/icon-dollar-sign';
import IconMapPin from '@/components/icon/icon-map-pin';
import IconPhone from '@/components/icon/icon-phone';
import IconMail from '@/components/icon/icon-mail';
import IconCalendar from '@/components/icon/icon-calendar';
import IconClipboardText from '@/components/icon/icon-clipboard-text';
import IconCreditCard from '@/components/icon/icon-credit-card';
import IconCamera from '@/components/icon/icon-camera';
import IconPrinter from '@/components/icon/icon-printer';
import IconPdf from '@/components/icon/icon-pdf';
import { supabase } from '@/lib/supabase/client';
import { getTranslation } from '@/i18n';
import Link from 'next/link';
import Image from 'next/image';
import { Tab } from '@headlessui/react';
import MethodsSelect from '@/components/selectors/MethodsSelect';

interface Customer {
    id: string;
    created_at: string;
    customer_number?: number;
    type: 'private' | 'business';
    name?: string;
    business_name?: string;
    phone: string;
    email?: string;
    address?: string;
    tax_id?: string;
    notes?: string;
    photo_url?: string;
    balance?: number;
}

interface Booking {
    id: string;
    booking_number: string;
    service_type: string;
    service_address: string;
    scheduled_date: string;
    price: number;
    status: string;
    payment_status: string;
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

interface InvoiceDeal {
    id: string;
    invoice_number: string;
    booking_id: string | null;
    total_amount: number;
    paid_amount: number;
    remaining_amount: number;
    status: string;
    pdf_url?: string | null;
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

interface Service {
    id: string;
    name: string;
    description?: string;
    price_private: number;
    price_business: number;
    active: boolean;
}

const CustomerPreview = () => {
    const { t } = getTranslation();
    const params = useParams();
    const router = useRouter();
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [invoiceDeals, setInvoiceDeals] = useState<InvoiceDeal[]>([]);
    const [loading, setLoading] = useState(true);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [paymentForm, setPaymentForm] = useState({
        booking_id: '',
        amount: '',
        payment_method: 'cash' as 'cash' | 'credit_card' | 'bank_transfer' | 'check',
        transaction_id: '',
        notes: '',
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch customer
                // @ts-ignore
                const { data: customerData, error: customerError } = await supabase.from('customers').select('*').eq('id', params?.id).single();

                if (customerError) throw customerError;
                setCustomer(customerData as any);

                // Fetch customer bookings
                // @ts-ignore
                const { data: bookingsData, error: bookingsError } = await supabase.from('bookings').select('*').eq('customer_id', params?.id).order('created_at', { ascending: false });

                if (!bookingsError && bookingsData) {
                    setBookings(bookingsData as any);
                }

                // Fetch customer invoices
                // @ts-ignore
                const { data: invoicesData, error: invoicesError } = await supabase.from('invoices').select('*').eq('customer_id', params?.id).order('created_at', { ascending: false });

                if (!invoicesError && invoicesData) {
                    setInvoices(invoicesData as any);
                }

                // Fetch customer payments
                // @ts-ignore
                const { data: paymentsData, error: paymentsError } = await supabase.from('payments').select('*').eq('customer_id', params?.id).order('payment_date', { ascending: false });

                if (!paymentsError && paymentsData) {
                    setPayments(paymentsData as any);
                }

                // Fetch services
                // @ts-ignore
                const { data: servicesData, error: servicesError } = await supabase.from('services').select('*').eq('active', true);

                if (!servicesError && servicesData) {
                    setServices(servicesData as any);
                }

                const bookingIds = (bookingsData || []).map((b: any) => b.id).filter(Boolean);
                if (bookingIds.length > 0) {
                    const { data: dealsData, error: dealsError } = await (supabase as any).from('invoice_deals').select('*').in('booking_id', bookingIds);

                    if (!dealsError && dealsData) {
                        setInvoiceDeals(dealsData as any);
                    }
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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!customer) {
        return (
            <div className="panel">
                <div className="text-center py-10">
                    <h3 className="text-lg font-semibold text-danger">Customer not found</h3>
                    <Link href="/customers" className="btn btn-primary mt-4">
                        <IconArrowLeft className="ltr:mr-2 rtl:ml-2" />
                        Back to Customers
                    </Link>
                </div>
            </div>
        );
    }

    const displayName = customer.type === 'private' ? customer.name : customer.business_name;
    const customerTypeBadge = customer.type === 'private' ? 'badge-outline-success' : 'badge-outline-primary';

    // Helper function to get service name
    const getServiceName = (serviceType: string) => {
        const service = services.find((s) => s.id === serviceType);
        return service ? service.name : serviceType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    };

    // Calculate customer balance: UNPAID bookings = negative, payments = positive
    const calculateBalance = () => {
        // Sum of UNPAID bookings (negative balance = debt)
        const unpaidDebt = bookings.filter((b) => b.payment_status === 'unpaid').reduce((sum, b) => sum + (b.price || 0), 0);

        // Sum of payments (positive balance = credits)
        const totalPayments = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

        // Balance = payments - debt (negative if customer owes, positive if overpaid)
        return totalPayments - unpaidDebt;
    };

    const balanceAmount = calculateBalance();

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
                            <Link href="/customers" className="text-primary hover:underline">
                                Customers
                            </Link>
                        </li>
                        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                            <span>Customer Details</span>
                        </li>
                    </ul>
                </div>

                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Customer Details</h1>
                        <p className="text-gray-500">{displayName}</p>
                    </div>
                    {customer && (
                        <Link href={`/customers/edit/${customer.id}`} className="btn btn-primary">
                            <IconEdit className="ltr:mr-2 rtl:ml-2" />
                            Edit Customer
                        </Link>
                    )}
                </div>
            </div>

            <div className="container mx-auto p-6">
                {/* Financial Summary Cards */}
                <div className="grid grid-cols-1 gap-5 md:grid-cols-3 mb-6">
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
                    <div className="panel bg-gradient-to-br from-purple-500/10 to-purple-600/10">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/20">
                                <IconDollarSign className="h-6 w-6 text-purple-500" />
                            </div>
                            <div>
                                <div className={`text-2xl font-bold ${balanceAmount >= 0 ? 'text-success' : 'text-danger'}`}>
                                    {balanceAmount < 0 ? '-' : ''}₪{Math.abs(balanceAmount).toFixed(2)}
                                </div>
                                <div className="text-xs text-gray-500">Balance</div>
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
                                    Basic Info
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
                                    <IconClipboardText className="ltr:mr-2 rtl:ml-2" />
                                    Invoices & Confirmation
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
                                {/* Customer Information */}
                                <div className="space-y-6">
                                    {/* Basic Info */}
                                    <div className="panel">
                                        <div className="mb-5">
                                            <h3 className="text-lg font-semibold">Basic Information</h3>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <h2 className="text-2xl font-bold text-primary mb-2">{displayName}</h2>
                                                <span className={`badge ${customerTypeBadge}`}>{customer.type === 'private' ? 'Private Customer' : 'Business Customer'}</span>
                                            </div>
                                            <div className="space-y-3">
                                                {customer.type === 'private' ? (
                                                    <div className="flex items-center">
                                                        <IconUser className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                                        <span className="text-sm text-gray-600 ltr:mr-2 rtl:ml-2">Name:</span>
                                                        <span className="font-medium">{customer.name}</span>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="flex items-center">
                                                            <IconUser className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                                            <span className="text-sm text-gray-600 ltr:mr-2 rtl:ml-2">Business Name:</span>
                                                            <span className="font-medium">{customer.business_name}</span>
                                                        </div>
                                                        {customer.tax_id && (
                                                            <div className="flex items-center">
                                                                <IconUser className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                                                <span className="text-sm text-gray-600 ltr:mr-2 rtl:ml-2">Tax ID:</span>
                                                                <span className="font-medium">{customer.tax_id}</span>
                                                            </div>
                                                        )}
                                                    </>
                                                )}

                                                <div className="flex items-center">
                                                    <IconPhone className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                                    <span className="text-sm text-gray-600 ltr:mr-2 rtl:ml-2">Phone:</span>
                                                    <span className="font-medium">
                                                        <a href={`tel:${customer.phone}`} className="text-primary hover:underline">
                                                            {customer.phone}
                                                        </a>
                                                    </span>
                                                </div>

                                                {customer.email && (
                                                    <div className="flex items-center">
                                                        <IconMail className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                                        <span className="text-sm text-gray-600 ltr:mr-2 rtl:ml-2">Email:</span>
                                                        <span className="font-medium">
                                                            <a href={`mailto:${customer.email}`} className="text-primary hover:underline">
                                                                {customer.email}
                                                            </a>
                                                        </span>
                                                    </div>
                                                )}

                                                {customer.address && (
                                                    <div className="flex items-center">
                                                        <IconMapPin className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                                        <span className="text-sm text-gray-600 ltr:mr-2 rtl:ml-2">Address:</span>
                                                        <span className="font-medium">{customer.address}</span>
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
                                                <a href={`tel:${customer.phone}`} className="font-semibold text-primary hover:underline">
                                                    {customer.phone}
                                                </a>
                                            </div>

                                            {customer.email && (
                                                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                    <div className="flex items-center">
                                                        <IconMail className="w-5 h-5 text-gray-400 ltr:mr-2 rtl:ml-2" />
                                                        <span className="text-sm text-gray-600">Email:</span>
                                                    </div>
                                                    <a href={`mailto:${customer.email}`} className="font-semibold text-primary hover:underline">
                                                        {customer.email}
                                                    </a>
                                                </div>
                                            )}

                                            {customer.address && (
                                                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                    <div className="flex items-center">
                                                        <IconMapPin className="w-5 h-5 text-gray-400 ltr:mr-2 rtl:ml-2" />
                                                        <span className="text-sm text-gray-600">Address:</span>
                                                    </div>
                                                    <span className="font-semibold text-gray-700 dark:text-gray-300">{customer.address}</span>
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
                                                <span className="text-gray-600">Customer Number:</span>
                                                <span className="font-medium">#{customer.customer_number || customer.id.slice(0, 8)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Customer ID:</span>
                                                <span className="font-medium font-mono text-xs">{customer.id}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Customer Type:</span>
                                                <span className={`badge ${customerTypeBadge}`}>{customer.type === 'private' ? 'Private' : 'Business'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Created At:</span>
                                                <span className="font-medium">
                                                    {new Date(customer.created_at).toLocaleDateString('en-GB', {
                                                        year: 'numeric',
                                                        month: '2-digit',
                                                        day: '2-digit',
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    {customer.notes && (
                                        <div className="panel">
                                            <div className="mb-5">
                                                <h3 className="text-lg font-semibold">Notes</h3>
                                            </div>
                                            <p className="text-gray-600 whitespace-pre-wrap">{customer.notes}</p>
                                        </div>
                                    )}

                                    {/* Customer Summary */}
                                    <div className="panel">
                                        <div className="mb-5">
                                            <h3 className="text-lg font-semibold">Customer Summary</h3>
                                        </div>

                                        <div className="space-y-3 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Name:</span>
                                                <span className="font-medium">{displayName}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Contact:</span>
                                                <span className="font-medium">{customer.phone}</span>
                                            </div>
                                            {customer.email && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Email:</span>
                                                    <span className="font-medium">{customer.email}</span>
                                                </div>
                                            )}
                                            {customer.address && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Location:</span>
                                                    <span className="font-medium">{customer.address}</span>
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
                                            <a href={`tel:${customer.phone}`} className="flex items-center p-3 bg-white/20 rounded-lg hover:bg-white/30 transition">
                                                <IconPhone className="w-5 h-5 ltr:mr-3 rtl:ml-3" />
                                                <span className="font-medium">Call Customer</span>
                                            </a>
                                            {customer.email && (
                                                <a href={`mailto:${customer.email}`} className="flex items-center p-3 bg-white/20 rounded-lg hover:bg-white/30 transition">
                                                    <IconMail className="w-5 h-5 ltr:mr-3 rtl:ml-3" />
                                                    <span className="font-medium">Send Email</span>
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Customer Photo Upload */}
                                <div className="panel">
                                    <div className="mb-5">
                                        <h3 className="text-lg font-semibold">Customer Photo</h3>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <div className="mb-5">
                                            <div className="w-32 h-32 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                                                {customer.photo_url && (
                                                    // @ts-ignore
                                                    <Image src={customer.photo_url} alt={displayName} width={128} height={128} className="w-full h-full object-cover" unoptimized />
                                                )}
                                                {!customer.photo_url && <IconUser className="w-16 h-16 text-gray-400" />}
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
                                    <h3 className="text-lg font-semibold">Customer Bookings</h3>
                                </div>
                                {bookings.length === 0 ? (
                                    <div className="text-center py-10">
                                        <p className="text-gray-500">No bookings found for this customer</p>
                                    </div>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="table-bordered">
                                            <thead>
                                                <tr>
                                                    <th>Booking #</th>
                                                    <th>Service</th>
                                                    <th>Date</th>
                                                    <th>Price</th>
                                                    <th>Payment Status</th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {bookings.map((booking) => (
                                                    <tr key={booking.id}>
                                                        <td>
                                                            <Link href={`/bookings/preview/${booking.id}`} className="text-primary hover:underline">
                                                                #{booking.booking_number}
                                                            </Link>
                                                        </td>
                                                        <td>{getServiceName(booking.service_type)}</td>
                                                        <td>{new Date(booking.scheduled_date).toLocaleDateString('en-GB')}</td>
                                                        <td>₪{booking.price || 0}</td>
                                                        <td>
                                                            <span className={`badge ${booking.payment_status === 'paid' ? 'badge-outline-success' : 'badge-outline-warning'}`}>
                                                                {booking.payment_status === 'paid' ? 'PAID' : 'UNPAID'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span className={`badge badge-outline-info`}>{booking.status}</span>
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
                                <div className="mb-5">
                                    <h3 className="text-lg font-semibold mb-3">Invoice Deals</h3>
                                    {invoiceDeals.length === 0 ? (
                                        <p className="text-gray-500 text-sm">No invoice deals found for this customer&apos;s bookings.</p>
                                    ) : (
                                        <div className="table-responsive">
                                            <table className="table-bordered">
                                                <thead>
                                                    <tr>
                                                        <th>Deal #</th>
                                                        <th>Booking #</th>
                                                        <th>Amount</th>
                                                        <th>Remaining</th>
                                                        <th>Status</th>
                                                        <th>PDF</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {invoiceDeals.map((deal) => {
                                                        const booking = bookings.find((b) => b.id === deal.booking_id);
                                                        return (
                                                            <tr key={deal.id}>
                                                                <td>
                                                                    <strong className="text-primary">#{deal.invoice_number}</strong>
                                                                </td>
                                                                <td>
                                                                    {booking ? (
                                                                        <Link href={`/bookings/preview/${booking.id}`} className="text-info hover:underline">
                                                                            #{booking.booking_number}
                                                                        </Link>
                                                                    ) : (
                                                                        'N/A'
                                                                    )}
                                                                </td>
                                                                <td>₪{deal.total_amount?.toFixed(2) || 0}</td>
                                                                <td className="text-danger">₪{deal.remaining_amount?.toFixed(2) || 0}</td>
                                                                <td>
                                                                    <span className="badge badge-outline-info">{deal.status?.toUpperCase()}</span>
                                                                </td>
                                                                <td className="text-center">
                                                                    {deal.pdf_url ? (
                                                                        <button
                                                                            onClick={() => window.open(deal.pdf_url as string, '_blank')}
                                                                            className="inline-flex hover:text-primary"
                                                                            title="Open Deal PDF"
                                                                        >
                                                                            <IconPdf className="h-5 w-5" />
                                                                        </button>
                                                                    ) : (
                                                                        <span className="text-xs text-gray-500">No PDF</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Tab.Panel>

                        {/* Payments Tab */}
                        <Tab.Panel>
                            <div className="panel">
                                <div className="mb-5 flex items-center justify-between">
                                    <h3 className="text-lg font-semibold">Customer Payments</h3>
                                    <button onClick={() => setShowPaymentModal(true)} className="btn btn-primary">
                                        Record New Payment
                                    </button>
                                </div>
                                {payments.length === 0 ? (
                                    <div className="text-center py-10">
                                        <p className="text-gray-500">No payments found for this customer</p>
                                    </div>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="table-bordered">
                                            <thead>
                                                <tr>
                                                    <th>Payment Date</th>
                                                    <th>Booking #</th>
                                                    <th>Invoice #</th>
                                                    <th>Amount</th>
                                                    <th>Payment Method</th>
                                                    <th>Transaction ID</th>
                                                    <th>Notes</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {payments.map((payment) => {
                                                    const booking = bookings.find((b) => b.id === payment.booking_id);
                                                    const invoice = invoices.find((inv) => inv.id === payment.invoice_id);
                                                    return (
                                                        <tr key={payment.id}>
                                                            <td>{new Date(payment.payment_date).toLocaleDateString('en-GB')}</td>
                                                            <td>
                                                                {booking ? (
                                                                    <Link href={`/bookings/preview/${booking.id}`} className="text-info hover:underline">
                                                                        #{booking.booking_number}
                                                                    </Link>
                                                                ) : (
                                                                    '-'
                                                                )}
                                                            </td>
                                                            <td>{invoice ? <strong className="text-primary">#{invoice.invoice_number}</strong> : '-'}</td>
                                                            <td className="text-success font-bold">₪{payment.amount?.toFixed(2) || 0}</td>
                                                            <td>
                                                                <span className="badge badge-outline-info">{payment.payment_method?.replace('_', ' ').toUpperCase()}</span>
                                                            </td>
                                                            <td>{payment.transaction_id || '-'}</td>
                                                            <td className="max-w-xs truncate">{payment.notes || '-'}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
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

                                if (!paymentForm.booking_id) {
                                    alert('Please select a booking');
                                    return;
                                }

                                try {
                                    // Create invoice if not exists
                                    // @ts-ignore
                                    const { data: existingInvoice, error: invoiceCheckError } = await supabase.from('invoices').select('*').eq('booking_id', paymentForm.booking_id).maybeSingle();

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
                                                booking_id: paymentForm.booking_id,
                                                customer_id: customer?.id,
                                                total_amount: parseFloat(paymentForm.amount),
                                                paid_amount: 0,
                                                remaining_amount: parseFloat(paymentForm.amount),
                                                status: 'pending',
                                                due_date: new Date().toISOString().split('T')[0],
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
                                    const paymentAmount = parseFloat(paymentForm.amount);

                                    const { error: paymentError } = await supabase
                                        .from('payments')
                                        // @ts-ignore
                                        .insert({
                                            invoice_id: invoiceId,
                                            booking_id: paymentForm.booking_id,
                                            customer_id: customer?.id,
                                            amount: paymentAmount,
                                            payment_method: paymentForm.payment_method,
                                            transaction_id: paymentForm.transaction_id || null,
                                            notes: paymentForm.notes || null,
                                            payment_date: new Date().toISOString(),
                                        });

                                    if (paymentError) {
                                        console.error('Payment creation error:', paymentError);
                                        throw paymentError;
                                    }

                                    // Get the booking to check if fully paid
                                    const selectedBookingData = bookings.find((b) => b.id === paymentForm.booking_id);
                                    if (selectedBookingData) {
                                        const bookingPrice = selectedBookingData.price || 0;
                                        const newPaymentStatus = paymentAmount >= bookingPrice ? 'paid' : 'unpaid';

                                        // Update booking payment status if fully paid
                                        if (newPaymentStatus === 'paid') {
                                            const { error: updateError } = await supabase
                                                .from('bookings')
                                                // @ts-ignore
                                                .update({ payment_status: 'paid' })
                                                .eq('id', paymentForm.booking_id);

                                            if (updateError) {
                                                console.warn('Could not update booking payment status:', updateError);
                                            }
                                        }
                                    }

                                    console.log('Payment recorded successfully');
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
                                    <label className="block text-sm font-bold mb-2">Select Invoice/Booking *</label>
                                    <select
                                        value={paymentForm.booking_id}
                                        onChange={(e) => {
                                            const booking = bookings.find((b) => b.id === e.target.value);
                                            setPaymentForm({
                                                ...paymentForm,
                                                booking_id: e.target.value,
                                                amount: String(booking?.price || 0),
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
                                                    #{booking.booking_number} - ${booking.price}
                                                </option>
                                            ))}
                                    </select>
                                </div>

                                {/* Amount */}
                                <div>
                                    <label className="block text-sm font-bold mb-2">Amount ($) *</label>
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

                                {/* Transaction ID */}
                                <div>
                                    <label className="block text-sm font-bold mb-2">Transaction ID (Optional)</label>
                                    <input type="text" value={paymentForm.transaction_id} onChange={(e) => setPaymentForm({ ...paymentForm, transaction_id: e.target.value })} className="form-input" />
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

export default CustomerPreview;
