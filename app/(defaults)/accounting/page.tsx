'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import IconDollarSign from '@/components/icon/icon-dollar-sign';
import IconCreditCard from '@/components/icon/icon-credit-card';
import IconClipboardText from '@/components/icon/icon-clipboard-text';
import IconTrendingUp from '@/components/icon/icon-trending-up';
import IconBox from '@/components/icon/icon-box';
import IconPdf from '@/components/icon/icon-pdf';
import IconEye from '@/components/icon/icon-eye';
import IconPlus from '@/components/icon/icon-plus';
import { InvoiceDealPDFGenerator } from '@/components/pdf/invoice-deal-pdf-generator';
import { Tables } from '@/types/database.types';

interface Invoice {
    id: string;
    invoice_number: string;
    booking_id: string | null;
    customer_id: string | null;
    total_amount: number;
    subtotal_amount?: number;
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
    status?: string;
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
    const [dealsByBookingId, setDealsByBookingId] = useState<Record<string, string | null>>({});
    const [creatingDeal, setCreatingDeal] = useState<string | null>(null); // To track which deal is being created

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

    const handleGenerateDealPdf = async (invoiceId: string) => {
        try {
            // Fetch minimal invoice fields
            const invRes: any = await supabase.from('invoices').select('id, invoice_number, booking_id').eq('id', invoiceId).maybeSingle();
            const inv: any = invRes?.data;
            const invErr: any = invRes?.error;
            if (invErr || !inv) throw invErr || new Error('Invoice not found');

            if (!(inv as any).booking_id) {
                alert('No booking linked to this invoice');
                return;
            }

            // Create invoice DEAL once via API
            const resp = await fetch('/api/invoice-deals/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ booking_id: inv.booking_id }),
            });

            if (!resp.ok) {
                const msg = await resp.json().catch(() => ({ message: 'Failed to create invoice deal' }));
                alert(msg.message || 'Failed to create invoice deal');
                return;
            }

            const payload = await resp.json();
            const created = (payload as any)?.invoice_deal;
            const pdfUrl: string | null = created?.pdf_url || null;

            // Update local map so the Generate button disappears
            setDealsByBookingId((prev) => ({ ...prev, [inv.booking_id as string]: created?.id || 'created' }));

            // Open the generated PDF if available
            if (pdfUrl) {
                window.open(pdfUrl, '_blank');
            }
        } catch (e) {
            console.error('Failed to generate DEAL PDF', e);
            alert('Failed to generate DEAL PDF');
        }
    };

    const fetchAll = async () => {
        try {
            // Determine role and contractor id
            let r: string | null = null;
            let contractorId: string | null = null;
            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser();
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
                            const { data: c2 } = await supabase
                                .from('contractors')
                                .select('id')
                                .eq('email', (user as any).email)
                                .maybeSingle();
                            contractorId = (c2 as any)?.id || null;
                        }
                    }
                }
            } catch (e) {
                /* ignore */
            }

            // Enforce: driver sees zeros; contractor without id sees zeros
            if (r === 'driver') {
                setInvoices([] as any);
                setPayments([] as any);
                setBookings([] as any);
                setInvoiceStats({ totalInvoices: 0, paidRevenue: 0, pendingRevenue: 0, remainingAmount: 0 });
                setPaymentStats({ totalPayments: 0, totalReceived: 0, cash: 0, creditCard: 0, bankTransfer: 0 });
                setBookingStats({ totalBookings: 0 });
                setLoading(false);
                return;
            }
            if (r === 'contractor' && !contractorId) {
                setInvoices([] as any);
                setPayments([] as any);
                setBookings([] as any);
                setInvoiceStats({ totalInvoices: 0, paidRevenue: 0, pendingRevenue: 0, remainingAmount: 0 });
                setPaymentStats({ totalPayments: 0, totalReceived: 0, cash: 0, creditCard: 0, bankTransfer: 0 });
                setBookingStats({ totalBookings: 0 });
                setLoading(false);
                return;
            }

            // Fetch invoices with customer data
            // @ts-ignore
            let invoicesQuery: any = supabase.from('invoices').select(`
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
                const paidRevenue = invoicesData.filter((inv: any) => inv.status === 'paid').reduce((sum: number, inv: any) => sum + (inv.paid_amount || 0), 0);
                const pendingRevenue = invoicesData.filter((inv: any) => inv.status !== 'paid').reduce((sum: number, inv: any) => sum + (inv.remaining_amount || 0), 0);
                const remainingAmount = invoicesData.reduce((sum: number, inv: any) => sum + (inv.remaining_amount || 0), 0);

                setInvoiceStats({ totalInvoices, paidRevenue, pendingRevenue, remainingAmount });
            }

            // Fetch payments with invoice and customer data
            // @ts-ignore
            let paymentsQuery: any = supabase
                .from('payments')
                .select(
                    `
                        *,
                        invoices (
                            customers ( name )
                        )
                    `,
                )
                .order('payment_date', { ascending: false });
            if (r === 'contractor') paymentsQuery = paymentsQuery.eq('contractor_id', contractorId);
            const { data: paymentsData, error: paymentsError } = await paymentsQuery;

            if (!paymentsError && paymentsData) {
                setPayments(paymentsData as any);

                // Calculate payment statistics
                const totalPayments = paymentsData.length;
                const totalReceived = paymentsData.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
                const cash = paymentsData.filter((p: any) => p.payment_method === 'cash').reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
                const creditCard = paymentsData.filter((p: any) => p.payment_method === 'credit_card').reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
                const bankTransfer = paymentsData.filter((p: any) => p.payment_method === 'bank_transfer').reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

                setPaymentStats({ totalPayments, totalReceived, cash, creditCard, bankTransfer });
            }

            // Fetch bookings
            // @ts-ignore
            let bookingsQuery: any = supabase.from('bookings').select('id, booking_number, service_type, status, invoice_deal_id');
            if (r === 'contractor') bookingsQuery = bookingsQuery.eq('contractor_id', contractorId);
            const { data: bookingsData, error: bookingsError } = await bookingsQuery;

            if (!bookingsError && bookingsData) {
                setBookings(bookingsData as any);

                // Map booking_id to existing invoice_deal_id
                const map: Record<string, string | null> = {};
                (bookingsData as any[]).forEach((b: any) => {
                    map[b.id] = b.invoice_deal_id || null;
                });
                setDealsByBookingId(map);

                // Calculate booking statistics
                const totalBookings = bookingsData.length;
                setBookingStats({ totalBookings });
            }

            // Fetch services
            // @ts-ignore
            const { data: servicesData, error: servicesError } = await supabase.from('services').select('id, name').eq('active', true);

            if (!servicesError && servicesData) {
                setServices(servicesData as any);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, []);

    useEffect(() => {
        let channel: any;
        try {
            channel = supabase
                .channel('accounting_realtime')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
                    fetchAll();
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
                    fetchAll();
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
                    fetchAll();
                })
                .subscribe();
        } catch (e) {
            console.warn('Realtime not available for accounting:', e);
        }

        const onFocus = () => {
            fetchAll();
        };
        try {
            window.addEventListener('focus', onFocus);
        } catch (e) {
            /* ignore */
        }

        return () => {
            try {
                if (channel) supabase.removeChannel(channel);
            } catch (e) {
                /* ignore */
            }
            try {
                window.removeEventListener('focus', onFocus);
            } catch (e) {
                /* ignore */
            }
        };
    }, []);

    // Helper function to get service name
    const getServiceName = (serviceType: string) => {
        const service = services.find((s) => s.id === serviceType);
        return service ? service.name : serviceType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    };

    // Helper: check if invoice already has a DEAL via booking_id
    const hasDealForInvoice = (invoiceId: string) => {
        const inv = invoices.find((i) => i.id === invoiceId);
        if (!inv || !inv.booking_id) return false;
        const bookingId = inv.booking_id as string;
        return Boolean(dealsByBookingId[bookingId]);
    };

    // Download existing DEAL PDF via public URL
    const handleCreateInvoiceDeal = async (invoiceId: string) => {
        const inv = invoices.find((i) => i.id === invoiceId);
        if (!inv || !inv.booking_id) {
            alert('No booking linked to this invoice');
            return;
        }

        setCreatingDeal(invoiceId);
        try {
            const resp = await fetch('/api/invoice-deals/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ booking_id: inv.booking_id }),
            });

            if (!resp.ok) {
                const msg = await resp.json().catch(() => ({ message: 'Failed to create invoice deal' }));
                throw new Error(msg.message || 'Failed to create invoice deal');
            }

            const payload = await resp.json();
            const created = (payload as any)?.invoice_deal;

            // Update local map so the button disappears
            setDealsByBookingId((prev) => ({ ...prev, [inv.booking_id as string]: created?.id || 'created' }));

            // Redirect to the invoices page
            window.location.href = '/accounting';
        } catch (e: any) {
            console.error('Failed to create invoice deal', e);
            alert(`Failed to create invoice deal: ${e.message}`);
        } finally {
            setCreatingDeal(null);
        }
    };

    const handleDownloadInvoicePdf = async (invoiceId: string) => {
        try {
            const { data: inv, error: invErr } = await supabase
                .from('invoices')
                .select('id, booking_id, invoice_number')
                .eq('id', invoiceId)
                .maybeSingle<Pick<Tables<'invoices'>, 'id' | 'booking_id' | 'invoice_number'>>();
            if (invErr || !inv) throw invErr || new Error('Invoice not found');
            if (!inv.booking_id) {
                alert('No booking linked to this invoice');
                return;
            }

            const { data: deal, error: dealErr } = await supabase.from('invoice_deals').select('id, pdf_url').eq('booking_id', inv.booking_id).maybeSingle();
            if (dealErr) throw dealErr;

            const pdfUrl = (deal as any)?.pdf_url as string | null | undefined;
            if (pdfUrl) {
                window.open(pdfUrl, '_blank');
            } else {
                alert('DEAL PDF not found for this invoice. An existing invoice deal PDF was not found for this booking.');
            }
        } catch (e) {
            console.error('Failed to download DEAL PDF', e);
            alert('Failed to download DEAL PDF');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
        );
    }

    const totalInvoiceDeal = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const totalRevenue = paymentStats.totalReceived - totalInvoiceDeal;

    // Pending revenue: start with invoice-based pending amount
    // plus any bookings in 'pending' status that don't have an invoice yet (use booking.price if available)
    const bookingPendingFromNoInvoice = bookings
        .filter((b) => String(b.status || '').toLowerCase() === 'pending')
        .filter((b) => !invoices.find((inv) => inv.booking_id === b.id))
        .reduce((sum, b) => sum + (Number((b as any).price) || 0), 0);

    const pendingRevenue = (invoiceStats.pendingRevenue || 0) + bookingPendingFromNoInvoice;

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
                    <div className="text-xs text-gray-500 mt-2">Receipts minus Invoice DEAL</div>
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
                            <div className="text-xs text-gray-500">Total Receipts</div>
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
                            <h3 className="text-lg font-semibold mb-2">View All Receipts</h3>
                            <p className="text-sm text-gray-500">Track receipts history</p>
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
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    ...invoices.slice(0, 5).map((inv) => {
                                        const booking = bookings.find((b) => b.id === (inv.booking_id as any));
                                        return {
                                            id: inv.id,
                                            date: inv.created_at,
                                            type: 'Invoice',
                                            customer: inv.customers?.name || 'N/A',
                                            reference: `#${inv.invoice_number}`,
                                            amount: inv.subtotal_amount || inv.total_amount,
                                            status: inv.status,
                                            isInvoice: true,
                                            bookingStatus: booking?.status || null,
                                        };
                                    }),
                                    ...payments.slice(0, 5).map((pay) => {
                                        const invoice = invoices.find((inv) => inv.id === pay.invoice_id);
                                        const customerName = pay.invoices?.customers?.name || invoice?.customers?.name;
                                        return {
                                            id: pay.id,
                                            date: pay.payment_date,
                                            type: 'Receipt',
                                            customer: customerName || 'N/A',
                                            reference: pay.payment_method?.replace('_', ' '),
                                            amount: pay.amount,
                                            status: 'completed',
                                            isInvoice: false,
                                            bookingStatus: null,
                                        };
                                    }),
                                ]
                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                    .slice(0, 10)
                                    .map((transaction) => (
                                        <tr key={transaction.id}>
                                            <td className="font-semibold">{transaction.reference}</td>
                                            <td>{transaction.customer}</td>
                                            <td>
                                                <span className={`badge ${transaction.isInvoice ? 'badge-outline-primary' : 'badge-outline-success'}`}>{transaction.type}</span>
                                            </td>
                                            <td className={transaction.isInvoice ? 'font-bold' : 'font-bold text-success'}>₪{transaction.amount?.toFixed(2) || 0}</td>
                                            <td>
                                                <span
                                                    className={`badge badge-sm ${
                                                        transaction.status === 'paid' || transaction.status === 'completed'
                                                            ? 'badge-outline-success'
                                                            : transaction.status === 'overdue'
                                                              ? 'badge-outline-danger'
                                                              : 'badge-outline-warning'
                                                    }`}
                                                >
                                                    {transaction.status}
                                                </span>
                                            </td>
                                            <td className="flex items-center gap-2">
                                                <span>{new Date(transaction.date).toLocaleDateString('en-GB')}</span>{' '}
                                            </td>
                                            <td>
                                                {transaction.isInvoice && (
                                                    <Link href={`/invoices/preview/${transaction.id}`} className="inline-flex hover:text-primary mr-2" title="View">
                                                        <IconEye className="h-5 w-5" />
                                                    </Link>
                                                )}
                                                {transaction.isInvoice &&
                                                    transaction.bookingStatus === 'confirmed' &&
                                                    (hasDealForInvoice(transaction.id) ? (
                                                        <button onClick={() => handleDownloadInvoicePdf(transaction.id)} className="inline-flex hover:text-primary" title="Download PDF">
                                                            <IconPdf className="h-5 w-5" />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleCreateInvoiceDeal(transaction.id)}
                                                            disabled={creatingDeal === transaction.id}
                                                            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-primary/20 hover:bg-primary/30 rounded text-primary disabled:opacity-50 transition"
                                                            title="Create Invoice Deal"
                                                        >
                                                            {creatingDeal === transaction.id ? (
                                                                <>
                                                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                                                                    <span>Creating...</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <span>Create Deal</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    ))}
                                            </td>
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
