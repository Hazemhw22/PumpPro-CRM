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
    date: string;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    amount: number;
    description: string;
}

interface Transaction {
    id: string;
    date: string;
    type: 'payment' | 'withdrawal';
    amount: number;
    description: string;
    status: 'completed' | 'pending' | 'failed';
}

const ContractorPreview = () => {
    const { t } = getTranslation();
    const params = useParams();
    const router = useRouter();
    const [contractor, setContractor] = useState<Contractor | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        
        const fetchData = async () => {
            try {
                const contractorId = Array.isArray(params.id) ? params.id[0] : params.id;
                
                // Fetch contractor data
                const { data: contractorData, error: contractorError } = await supabase
                    .from('contractors')
                    .select('*')
                    .eq('id', contractorId)
                    .single();
                
                if (contractorError) throw contractorError;
                if (!mounted) return;
                
                setContractor(contractorData);
                
                // Mock data for bookings
                const mockBookings: Booking[] = [
                    {
                        id: '1',
                        date: '2023-06-15',
                        status: 'pending',
                        amount: 1500,
                        description: 'Monthly service contract'
                    },
                    {
                        id: '2',
                        date: '2023-06-20',
                        status: 'confirmed',
                        amount: 2500,
                        description: 'Project delivery'
                    }
                ];
                
                // Mock data for transactions
                const mockTransactions: Transaction[] = [
                    {
                        id: '1',
                        date: '2023-06-10',
                        type: 'payment',
                        amount: 1500,
                        description: 'Service payment',
                        status: 'completed'
                    },
                    {
                        id: '2',
                        date: '2023-06-05',
                        type: 'withdrawal',
                        amount: 500,
                        description: 'Advance payment',
                        status: 'completed'
                    }
                ];
                
                setBookings(mockBookings);
                setTransactions(mockTransactions);
                
            } catch (err) {
                console.error('Error loading data:', err);
            } finally {
                if (mounted) setLoading(false);
            }
        };
        
        fetchData();
        
        return () => {
            mounted = false;
        };
    }, [params.id]);

    const handleConfirmBooking = async (bookingId: string) => {
        console.log('Confirming booking:', bookingId);
        setBookings(bookings.map(booking => 
            booking.id === bookingId 
                ? { ...booking, status: 'confirmed' as const } 
                : booking
        ));
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleString();
        } catch (e) {
            return '-';
        }
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
                    {contractor && (
                        <Link href={`/contractors/edit/${contractor.id}`} className="btn btn-primary">
                            <IconEdit className="ltr:mr-2 rtl:ml-2" />
                            Edit Contractor
                        </Link>
                    )}
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
                                <div className="text-2xl font-bold">₪{transactions.filter(t => t.type === 'payment').reduce((sum, t) => sum + (t.amount || 0), 0).toFixed(2)}</div>
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
                                <div className={`text-2xl font-bold ${(contractor?.balance || 0) > 0 ? 'text-success' : 'text-danger'}`}>
                                    ₪{(contractor?.balance || 0).toFixed(2)}
                                </div>
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
                                                    <th>Date</th>
                                                    <th>Description</th>
                                                    <th className="text-right">Amount</th>
                                                    <th className="text-center">Status</th>
                                                    <th className="text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {bookings.map((booking) => (
                                                    <tr key={booking.id}>
                                                        <td>{new Date(booking.date).toLocaleDateString()}</td>
                                                        <td>{booking.description}</td>
                                                        <td className="text-right">₪{booking.amount.toLocaleString()}</td>
                                                        <td className="text-center">
                                                            <span className={`badge ${
                                                                booking.status === 'confirmed' 
                                                                    ? 'badge-outline-success' 
                                                                    : booking.status === 'pending'
                                                                        ? 'badge-outline-warning'
                                                                        : 'badge-outline-info'
                                                            }`}>
                                                                {booking.status}
                                                            </span>
                                                        </td>
                                                        <td className="text-right">
                                                            {booking.status === 'pending' && (
                                                                <button
                                                                    onClick={() => handleConfirmBooking(booking.id)}
                                                                    className="btn btn-sm btn-success ltr:mr-2 rtl:ml-2"
                                                                    title="Confirm Booking"
                                                                >
                                                                    <IconCheck className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            <button className="btn btn-sm btn-danger" title="Cancel Booking">
                                                                <IconX className="w-4 h-4" />
                                                            </button>
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
                                    <h3 className="text-lg font-semibold">Transactions</h3>
                                </div>
                                <div className="table-responsive">
                                    <table className="table-hover">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Description</th>
                                                <th className="text-right">Amount</th>
                                                <th className="text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transactions.map((transaction) => (
                                                <tr key={transaction.id}>
                                                    <td>{new Date(transaction.date).toLocaleDateString()}</td>
                                                    <td>{transaction.description}</td>
                                                    <td className={`text-right font-medium ${
                                                        transaction.type === 'payment' ? 'text-success' : 'text-danger'
                                                    }`}>
                                                        {transaction.type === 'payment' ? '+' : '-'}₪{transaction.amount.toLocaleString()}
                                                    </td>
                                                    <td className="text-center">
                                                        <span className={`badge ${
                                                            transaction.status === 'completed' 
                                                                ? 'badge-outline-success' 
                                                                : transaction.status === 'pending'
                                                                    ? 'badge-outline-warning'
                                                                    : 'badge-outline-danger'
                                                        }`}>
                                                            {transaction.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {transactions.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="text-center text-gray-500">
                                                        No transactions found
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <h3 className="text-lg font-semibold mb-2">Current Balance</h3>
                                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                                        ₪{contractor.balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                    </p>
                                    <div className="mt-4 flex space-x-3">
                                        <button className="btn btn-primary">
                                            Record Payment
                                        </button>
                                        <button className="btn btn-outline-primary">
                                            Record Withdrawal
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Tab.Panel>
                    </Tab.Panels>
                </Tab.Group>
            </div>
        </div>
    );
};

export default ContractorPreview;
