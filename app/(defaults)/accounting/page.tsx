'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import IconDollarSign from '@/components/icon/icon-dollar-sign';
import IconCreditCard from '@/components/icon/icon-credit-card';
import IconClipboardText from '@/components/icon/icon-clipboard-text';
import IconTrendingUp from '@/components/icon/icon-trending-up';
import IconBox from '@/components/icon/icon-box';

interface Invoice {
    id: string;
    invoice_number: string;
    booking_id: string | null;
    customer_id: string | null;
    total_amount: number;
    paid_amount: number;
    remaining_amount: number;
    status: string;
    due_date: string;
    created_at: string;
    updated_at: string;
    customers?: {
        name: string;
    } | null;
}

interface Payment {
    id: string;
    invoice_id: string;
    booking_id: string | null;
    customer_id: string | null;
    amount: number;
    payment_method: string;
    transaction_id: string | null;
    notes: string | null;
    payment_date: string;
    created_by: string | null;
    created_at: string;
    invoices?: {
        customers?: {
            name: string;
        } | null;
    } | null;
}

interface Booking {
    id: string;
    booking_number: string;
    service_type: string;
}

interface Service {
    id: string;
    name: string;
}

const AccountingPage = () => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [role, setRole] = useState<string | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);

    // Statistics
    const [invoiceStats, setInvoiceStats] = useState({
        totalInvoices: 0,
        paidRevenue: 0,
        pendingRevenue: 0,
        remainingAmount: 0,
    });

    const [paymentStats, setPaymentStats] = useState({
        totalPayments: 0,
        totalReceived: 0,
        cash: 0,
        creditCard: 0,
        bankTransfer: 0,
    });

    const [bookingStats, setBookingStats] = useState({
        totalBookings: 0,
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Determine role and contractor id
                let r: string | null = null;
                let contractorId: string | null = null;
                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        // @ts-ignore
                        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
                        r = (profile as any)?.role || null;
                        setRole(r);
                        if (r === 'contractor') {
                            // @ts-ignore
                            let { data: c } = await supabase.from('contractors').select('id, email').eq('user_id', user.id).maybeSingle();
                            contractorId = (c as any)?.id || null;
                            if (!contractorId && (user as any).email) {
                                // @ts-ignore
                                const { data: c2 } = await supabase.from('contractors').select('id').eq('email', (user as any).email).maybeSingle();
                                contractorId = (c2 as any)?.id || null;
                            }
                        }
                    }
                } catch (e) { /* ignore */ }

                // Enforce: driver sees zeros; contractor without id sees zeros
                if (r === 'driver') {
                    setInvoices([] as any); setPayments([] as any); setBookings([] as any);
                    setInvoiceStats({ totalInvoices: 0, paidRevenue: 0, pendingRevenue: 0, remainingAmount: 0 });
                    setPaymentStats({ totalPayments: 0, totalReceived: 0, cash: 0, creditCard: 0, bankTransfer: 0 });
                    setBookingStats({ totalBookings: 0 });
                    setLoading(false);
                    return;
                }
                if (r === 'contractor' && !contractorId) {
                    setInvoices([] as any); setPayments([] as any); setBookings([] as any);
                    setInvoiceStats({ totalInvoices: 0, paidRevenue: 0, pendingRevenue: 0, remainingAmount: 0 });
                    setPaymentStats({ totalPayments: 0, totalReceived: 0, cash: 0, creditCard: 0, bankTransfer: 0 });
                    setBookingStats({ totalBookings: 0 });
                    setLoading(false);
                    return;
                }

                // Fetch invoices with customer data
                // @ts-ignore
                let invoicesQuery: any = supabase
                    .from('invoices')
                    .select(`
                        *,
                        customers (
                            name
                        )
                    `);
                if (r === 'contractor') invoicesQuery = invoicesQuery.eq('contractor_id', contractorId);
                const { data: invoicesData, error: invoicesError } = await invoicesQuery.order('created_at', { ascending: false });

                if (!invoicesError && invoicesData) {
                    setInvoices(invoicesData as any);
                    
                    // Calculate invoice statistics
                    const totalInvoices = invoicesData.length;
                    const paidRevenue = invoicesData
                        .filter((inv: any) => inv.status === 'paid')
                        .reduce((sum: number, inv: any) => sum + (inv.paid_amount || 0), 0);
                    const pendingRevenue = invoicesData
                        .filter((inv: any) => inv.status !== 'paid')
                        .reduce((sum: number, inv: any) => sum + (inv.remaining_amount || 0), 0);
                    const remainingAmount = invoicesData
                        .reduce((sum: number, inv: any) => sum + (inv.remaining_amount || 0), 0);
                    
                    setInvoiceStats({ totalInvoices, paidRevenue, pendingRevenue, remainingAmount });
                }

                // Fetch payments with invoice and customer data
                // @ts-ignore
                let paymentsQuery: any = supabase
                    .from('payments')
                    .select(`
                        *,
                        invoices (
                            customers ( name )
                        )
                    `)
                    .order('payment_date', { ascending: false });
                if (r === 'contractor') paymentsQuery = paymentsQuery.eq('contractor_id', contractorId);
                const { data: paymentsData, error: paymentsError } = await paymentsQuery;

                if (!paymentsError && paymentsData) {
                    setPayments(paymentsData as any);
                    
                    // Calculate payment statistics
                    const totalPayments = paymentsData.length;
                    const totalReceived = paymentsData.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
                    const cash = paymentsData
                        .filter((p: any) => p.payment_method === 'cash')
                        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
                    const creditCard = paymentsData
                        .filter((p: any) => p.payment_method === 'credit_card')
                        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
                    const bankTransfer = paymentsData
                        .filter((p: any) => p.payment_method === 'bank_transfer')
                        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
                    
                    setPaymentStats({ totalPayments, totalReceived, cash, creditCard, bankTransfer });
                }

                // Fetch bookings
                // @ts-ignore
                let bookingsQuery: any = supabase
                    .from('bookings')
                    .select('id, booking_number, service_type');
                if (r === 'contractor') bookingsQuery = bookingsQuery.eq('contractor_id', contractorId);
                const { data: bookingsData, error: bookingsError } = await bookingsQuery;

                if (!bookingsError && bookingsData) {
                    setBookings(bookingsData as any);
                    
                    // Calculate booking statistics
                    const totalBookings = bookingsData.length;
                    setBookingStats({ totalBookings });
                }

                // Fetch services
                // @ts-ignore
                const { data: servicesData, error: servicesError } = await supabase
                    .from('services')
                    .select('id, name')
                    .eq('active', true);

                if (!servicesError && servicesData) {
                    setServices(servicesData as any);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Helper function to get service name
    const getServiceName = (serviceType: string) => {
        const service = services.find(s => s.id === serviceType);
        return service ? service.name : serviceType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
        );
    }

    const totalRevenue = invoiceStats.paidRevenue;
    const pendingRevenue = invoiceStats.pendingRevenue;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="panel">
                <div className="flex items-center justify-between mb-5">
                    <h1 className="text-2xl font-bold">Accounting Dashboard</h1>
                </div>
            </div>

            {/* Main Revenue Cards */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <div className="panel">
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-semibold text-gray-500">💵 Total Revenue</div>
                        <IconTrendingUp className="h-8 w-8 text-success" />
                    </div>
                    <div className="text-4xl font-bold text-success">₪{totalRevenue.toFixed(2)}</div>
                    <div className="text-xs text-gray-500 mt-2">From paid invoices</div>
                </div>
                <div className="panel">
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-semibold text-gray-500">⚠️ Pending Revenue</div>
                        <IconClipboardText className="h-8 w-8 text-warning" />
                    </div>
                    <div className="text-4xl font-bold text-warning">₪{pendingRevenue.toFixed(2)}</div>
                    <div className="text-xs text-gray-500 mt-2">From unpaid invoices</div>
                </div>
                <div className="panel">
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-semibold text-gray-500">💰 Total Debts</div>
                        <IconDollarSign className="h-8 w-8 text-danger" />
                    </div>
                    <div className="text-4xl font-bold text-danger">₪{invoiceStats.remainingAmount.toFixed(2)}</div>
                    <div className="text-xs text-gray-500 mt-2">Remaining amount to collect</div>
                </div>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-6">
                <div className="panel bg-gradient-to-br from-blue-500/10 to-blue-600/10">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                            <IconClipboardText className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{invoiceStats.totalInvoices}</div>
                            <div className="text-xs text-gray-500">Total Invoices</div>
                        </div>
                    </div>
                </div>
                <div className="panel bg-gradient-to-br from-green-500/10 to-green-600/10">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/20">
                            <IconDollarSign className="h-6 w-6 text-success" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{paymentStats.totalPayments}</div>
                            <div className="text-xs text-gray-500">Total Payments</div>
                        </div>
                    </div>
                </div>
                <div className="panel bg-gradient-to-br from-indigo-500/10 to-indigo-600/10">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/20">
                            <IconBox className="h-6 w-6 text-indigo-500" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{bookingStats.totalBookings}</div>
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
                            <div className="text-2xl font-bold">₪{paymentStats.cash.toFixed(0)}</div>
                            <div className="text-xs text-gray-500">Cash Payments</div>
                        </div>
                    </div>
                </div>
                <div className="panel bg-gradient-to-br from-orange-500/10 to-orange-600/10">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/20">
                            <IconCreditCard className="h-6 w-6 text-orange-500" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">₪{paymentStats.creditCard.toFixed(0)}</div>
                            <div className="text-xs text-gray-500">Card Payments</div>
                        </div>
                    </div>
                </div>
                <div className="panel bg-gradient-to-br from-cyan-500/10 to-cyan-600/10">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/20">
                            <IconCreditCard className="h-6 w-6 text-cyan-500" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">₪{paymentStats.bankTransfer.toFixed(0)}</div>
                            <div className="text-xs text-gray-500">Bank Transfer</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Link href="/invoices" className="panel hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold mb-2">View All Invoices</h3>
                            <p className="text-sm text-gray-500">Manage and track all invoices</p>
                        </div>
                        <IconClipboardText className="h-10 w-10 text-primary" />
                    </div>
                </Link>
                <Link href="/payments" className="panel hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold mb-2">View All Payments</h3>
                            <p className="text-sm text-gray-500">Track payment history</p>
                        </div>
                        <IconDollarSign className="h-10 w-10 text-success" />
                    </div>
                </Link>
            </div>

            {/* Recent Transactions - Combined Invoices & Payments */}
            <div className="panel">
                <div className="mb-5">
                    <h3 className="text-lg font-semibold">Recent Transactions</h3>
                </div>
                {invoices.length === 0 && payments.length === 0 ? (
                    <div className="text-center py-10">
                        <p className="text-gray-500 text-sm">No transactions yet</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="table-bordered">
                            <thead>
                                <tr>
                                    <th>Reference</th>
                                    <th>Customer</th>
                                    <th>Type</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    ...invoices.slice(0, 5).map(inv => ({
                                        id: inv.id,
                                        date: inv.created_at,
                                        type: 'Invoice',
                                        customer: inv.customers?.name || 'N/A',
                                        reference: `#${inv.invoice_number}`,
                                        amount: inv.total_amount,
                                        status: inv.status,
                                        isInvoice: true
                                    })),
                                    ...payments.slice(0, 5).map(pay => {
                                        const invoice = invoices.find(inv => inv.id === pay.invoice_id);
                                        const customerName = pay.invoices?.customers?.name || invoice?.customers?.name;
                                        return {
                                            id: pay.id,
                                            date: pay.payment_date,
                                            type: 'Payment',
                                            customer: customerName || 'N/A',
                                            reference: pay.payment_method?.replace('_', ' '),
                                            amount: pay.amount,
                                            status: 'completed',
                                            isInvoice: false
                                        };
                                    })
                                ]
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .slice(0, 10)
                                .map((transaction) => (
                                    <tr key={transaction.id}>
                                        <td className="font-semibold">{transaction.reference}</td>
                                        <td>{transaction.customer}</td>
                                        <td>
                                            <span className={`badge ${transaction.isInvoice ? 'badge-outline-primary' : 'badge-outline-success'}`}>
                                                {transaction.type}
                                            </span>
                                        </td>
                                        <td className={transaction.isInvoice ? 'font-bold' : 'font-bold text-success'}>
                                            ₪{transaction.amount?.toFixed(2) || 0}
                                        </td>
                                        <td>
                                            <span className={`badge badge-sm ${
                                                transaction.status === 'paid' || transaction.status === 'completed' ? 'badge-outline-success' :
                                                transaction.status === 'overdue' ? 'badge-outline-danger' :
                                                'badge-outline-warning'
                                            }`}>
                                                {transaction.status}
                                            </span>
                                        </td>
                                        <td>{new Date(transaction.date).toLocaleDateString('en-GB')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AccountingPage;
