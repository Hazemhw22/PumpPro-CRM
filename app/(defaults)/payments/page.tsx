'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';

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
        id: string;
        invoice_number: string;
        booking_id: string | null;
        remaining_amount?: number;
        customers?: {
            name: string;
        } | null;
        bookings?: {
            service_type: string;
        } | null;
    } | null;
}

interface Invoice {
    id: string;
    invoice_number: string;
    booking_id: string | null;
    remaining_amount?: number;
    customers?: {
        name: string;
    } | null;
    bookings?: {
        service_type: string;
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

const PaymentsPage = () => {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [methodFilter, setMethodFilter] = useState<'all' | 'cash' | 'credit_card' | 'bank_transfer' | 'check'>('all');

    // Statistics
    const [stats, setStats] = useState({
        totalPayments: 0,
        totalReceived: 0,
        cash: 0,
        creditCard: 0,
        bankTransfer: 0,
        remainingAmount: 0,
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch payments with invoice, customer and booking data
                // @ts-ignore
                const { data: paymentsData, error: paymentsError } = await supabase
                    .from('payments')
                    .select(`
                        *,
                        invoices (
                            id,
                            invoice_number,
                            booking_id,
                            remaining_amount,
                            customers (
                                name
                            ),
                            bookings (
                                service_type
                            )
                        )
                    `)
                    .order('payment_date', { ascending: false });

                if (!paymentsError && paymentsData) {
                    setPayments(paymentsData as any);
                    
                    // Calculate statistics
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
                    
                    setStats({ totalPayments, totalReceived, cash, creditCard, bankTransfer, remainingAmount: 0 });
                }

                // Fetch invoices (for backward compatibility)
                // @ts-ignore
                const { data: invoicesData, error: invoicesError } = await supabase
                    .from('invoices')
                    .select(`
                        id,
                        invoice_number,
                        booking_id,
                        remaining_amount,
                        customers (
                            name
                        ),
                        bookings (
                            service_type
                        )
                    `);

                if (!invoicesError && invoicesData) {
                    setInvoices(invoicesData as any);
                    
                    // Calculate remaining amount from all invoices
                    const remainingAmount = invoicesData
                        .reduce((sum: number, inv: any) => sum + (inv.remaining_amount || 0), 0);
                    
                    setStats(prev => ({ ...prev, remainingAmount }));
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

    // Filter payments
    const filteredPayments = payments.filter((payment) => {
        const matchesMethod = methodFilter === 'all' || payment.payment_method === methodFilter;
        const searchTerm = search.toLowerCase();
        const invoice = payment.invoices || invoices.find(inv => inv.id === payment.invoice_id);
        const customerName = invoice?.customers?.name || '';
        const matchesSearch = !searchTerm ||
            (invoice?.invoice_number && invoice.invoice_number.toLowerCase().includes(searchTerm)) ||
            (customerName && customerName.toLowerCase().includes(searchTerm)) ||
            (payment.transaction_id && payment.transaction_id.toLowerCase().includes(searchTerm));
        
        return matchesMethod && matchesSearch;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-6">
                <div className="panel">
                    <div className="mb-2 text-sm font-semibold text-gray-500">Total Payments</div>
                    <div className="text-3xl font-bold">{stats.totalPayments}</div>
                </div>
                <div className="panel">
                    <div className="mb-2 text-sm font-semibold text-gray-500">Total Received</div>
                    <div className="text-3xl font-bold text-success">₪{stats.totalReceived.toFixed(2)}</div>
                </div>
                <div className="panel">
                    <div className="mb-2 text-sm font-semibold text-gray-500">Cash</div>
                    <div className="text-3xl font-bold">₪{stats.cash.toFixed(2)}</div>
                </div>
                <div className="panel">
                    <div className="mb-2 text-sm font-semibold text-gray-500">Credit Card</div>
                    <div className="text-3xl font-bold">₪{stats.creditCard.toFixed(2)}</div>
                </div>
                <div className="panel">
                    <div className="mb-2 text-sm font-semibold text-gray-500">Bank Transfer</div>
                    <div className="text-3xl font-bold">₪{stats.bankTransfer.toFixed(2)}</div>
                </div>
                <div className="panel">
                    <div className="mb-2 text-sm font-semibold text-gray-500">Remaining Amount</div>
                    <div className="text-3xl font-bold text-danger">₪{stats.remainingAmount.toFixed(2)}</div>
                </div>
            </div>

            {/* Payments Table */}
            <div className="panel border-white-light px-0 dark:border-[#1b2e4b]">
                <div className="invoice-table">
                    <div className="mb-4.5 flex flex-col gap-5 px-5 md:flex-row md:items-center">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-semibold">Payment History</h2>
                        </div>
                        <div className="ltr:ml-auto rtl:mr-auto flex items-center gap-2">
                            <select 
                                className="form-select w-36 py-1 text-sm" 
                                value={methodFilter} 
                                onChange={(e) => setMethodFilter(e.target.value as any)}
                            >
                                <option value="all">All Methods</option>
                                <option value="cash">Cash</option>
                                <option value="credit_card">Credit Card</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="check">Check</option>
                            </select>
                            <input
                                type="text"
                                className="form-input w-auto"
                                placeholder="Search payments..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="relative px-5 pb-5">
                        {filteredPayments.length === 0 ? (
                            <div className="text-center py-10">
                                <p className="text-gray-500">No payments found</p>
                            </div>
                        ) : (
                            <div className="overflow-auto rounded-md">
                                <table className="table-hover whitespace-nowrap">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Customer</th>
                                            <th>Invoice #</th>
                                            <th>Service</th>
                                            <th>Amount</th>
                                            <th>Remaining</th>
                                            <th>Method</th>
                                            <th>Transaction ID</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredPayments.map((payment) => {
                                            const invoice = payment.invoices || invoices.find(inv => inv.id === payment.invoice_id);
                                            const booking = invoice?.bookings || (invoice ? bookings.find(b => b.id === invoice.booking_id) : null);
                                            const customerName = invoice?.customers?.name;
                                            
                                            // Calculate remaining amount after this specific payment
                                            // Get all payments for this invoice that came AFTER this payment
                                            const laterPayments = payments.filter(p => 
                                                p.invoice_id === payment.invoice_id && 
                                                new Date(p.payment_date) > new Date(payment.payment_date)
                                            );
                                            const laterPaymentsTotal = laterPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
                                            const currentRemaining = invoice?.remaining_amount || 0;
                                            const remainingAfterThisPayment = currentRemaining + laterPaymentsTotal;
                                            
                                            return (
                                                <tr key={payment.id}>
                                                    <td>
                                                        {payment.payment_date ? 
                                                            new Date(payment.payment_date).toLocaleDateString('en-GB') : 
                                                            'N/A'
                                                        }
                                                    </td>
                                                    <td>{customerName || 'N/A'}</td>
                                                    <td>
                                                        {invoice ? (
                                                            <Link href={`/invoices/preview/${invoice.id}`} className="text-primary hover:underline">
                                                                <strong>#{invoice.invoice_number || 'N/A'}</strong>
                                                            </Link>
                                                        ) : 'N/A'}
                                                    </td>
                                                    <td>
                                                        {booking ? getServiceName(booking.service_type) : 'N/A'}
                                                    </td>
                                                    <td className="font-bold text-success">₪{payment.amount?.toFixed(2) || 0}</td>
                                                    <td className="font-bold text-danger">₪{remainingAfterThisPayment.toFixed(2)}</td>
                                                    <td>
                                                        <span className="badge badge-outline-info">
                                                            {payment.payment_method?.replace('_', ' ').toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td>{payment.transaction_id || '-'}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentsPage;
