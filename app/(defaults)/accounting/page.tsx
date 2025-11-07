'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import IconDollarSign from '@/components/icon/icon-dollar-sign';
import IconCreditCard from '@/components/icon/icon-credit-card';
import IconClipboardText from '@/components/icon/icon-clipboard-text';
import IconTrendingUp from '@/components/icon/icon-trending-up';

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
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch invoices with customer data
                // @ts-ignore
                const { data: invoicesData, error: invoicesError } = await supabase
                    .from('invoices')
                    .select(`
                        *,
                        customers (
                            name
                        )
                    `)
                    .order('created_at', { ascending: false });

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
                const { data: paymentsData, error: paymentsError } = await supabase
                    .from('payments')
                    .select(`
                        *,
                        invoices (
                            customers (
                                name
                            )
                        )
                    `)
                    .order('payment_date', { ascending: false });

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
                    
                    setPaymentStats({ totalPayments, totalReceived, cash, creditCard });
                }

                // Fetch bookings
                // @ts-ignore
                const { data: bookingsData, error: bookingsError } = await supabase
                    .from('bookings')
                    .select('id, booking_number, service_type');

                if (!bookingsError && bookingsData) {
                    setBookings(bookingsData as any);
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
                        <div className="text-sm font-semibold text-gray-500">💰 Remaining Amount</div>
                        <IconDollarSign className="h-8 w-8 text-danger" />
                    </div>
                    <div className="text-4xl font-bold text-danger">₪{invoiceStats.remainingAmount.toFixed(2)}</div>
                    <div className="text-xs text-gray-500 mt-2">Total remaining to collect</div>
                </div>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
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

            {/* Recent Activity */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {/* Recent Invoices */}
                <div className="panel">
                    <div className="mb-5 flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Recent Invoices</h3>
                        <Link href="/invoices" className="text-primary hover:underline text-sm">
                            View All
                        </Link>
                    </div>
                    {invoices.slice(0, 5).length === 0 ? (
                        <div className="text-center py-5">
                            <p className="text-gray-500 text-sm">No invoices yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {invoices.slice(0, 5).map((invoice) => (
                                <div key={invoice.id} className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3">
                                    <div>
                                        <div className="font-semibold text-sm">#{invoice.invoice_number || 'N/A'}</div>
                                        <div className="text-xs text-gray-500">{invoice.customers?.name || 'N/A'}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-sm">₪{invoice.total_amount?.toFixed(2) || 0}</div>
                                        <span className={`badge badge-sm ${
                                            invoice.status === 'paid' ? 'badge-outline-success' :
                                            invoice.status === 'overdue' ? 'badge-outline-danger' :
                                            'badge-outline-warning'
                                        }`}>
                                            {invoice.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Payments */}
                <div className="panel">
                    <div className="mb-5 flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Recent Payments</h3>
                        <Link href="/payments" className="text-primary hover:underline text-sm">
                            View All
                        </Link>
                    </div>
                    {payments.slice(0, 5).length === 0 ? (
                        <div className="text-center py-5">
                            <p className="text-gray-500 text-sm">No payments yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {payments.slice(0, 5).map((payment) => {
                                const invoice = invoices.find(inv => inv.id === payment.invoice_id);
                                const customerName = payment.invoices?.customers?.name || invoice?.customers?.name;
                                return (
                                    <div key={payment.id} className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3">
                                        <div>
                                            <div className="font-semibold text-sm">{customerName || 'N/A'}</div>
                                            <div className="text-xs text-gray-500">
                                                {payment.payment_date ? 
                                                    new Date(payment.payment_date).toLocaleDateString('en-GB') : 
                                                    'N/A'
                                                }
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-sm text-success">₪{payment.amount?.toFixed(2)}</div>
                                            <span className="badge badge-sm badge-outline-info">
                                                {payment.payment_method?.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AccountingPage;
