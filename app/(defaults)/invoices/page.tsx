'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import IconEye from '@/components/icon/icon-eye';
import IconPlus from '@/components/icon/icon-plus';
import IconPrinter from '@/components/icon/icon-printer';
import IconPdf from '@/components/icon/icon-pdf';
import { InvoiceDealPDFGenerator } from '@/components/pdf/invoice-deal-pdf';
import StatusSelect from '@/components/selectors/StatusSelect';

interface Invoice {
    id: string;
    invoice_number: string;
    booking_id: string | null;
    customer_id: string | null;
    invoice_type?: string | null;
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
        phone?: string | null;
        address?: string | null;
        tax_id?: string | null;
    } | null;
    bookings?: {
        service_type: string;
        booking_number?: string;
        service_address?: string | null;
        scheduled_date?: string | null;
        scheduled_time?: string | null;
        notes?: string | null;
        contractor_id?: string | null;
        driver_id?: string | null;
    } | null;
}

interface Booking {
    id: string;
    booking_number: string;
    service_type: string;
    service_address?: string | null;
    scheduled_date?: string | null;
    scheduled_time?: string | null;
    notes?: string | null;
    contractor_id?: string | null;
    driver_id?: string | null;
}

interface Service {
    id: string;
    name: string;
}

const InvoicesPage = () => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [role, setRole] = useState<string | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');

    // Provider maps
    const [contractorsMap, setContractorsMap] = useState<Map<string, { id: string; name: string; phone?: string }>>(new Map());
    const [driversMap, setDriversMap] = useState<Map<string, { id: string; name: string; phone?: string }>>(new Map());

    // Statistics
    const [stats, setStats] = useState({
        totalInvoices: 0,
        paidRevenue: 0,
        pendingRevenue: 0,
        remainingAmount: 0,
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Determine role and related ids
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

                // Enforce role filtering strictly
                if (r === 'contractor' && !contractorId) {
                    setInvoices([] as any);
                    setLoading(false);
                    return;
                }

                // Build invoices query
                let invoicesQuery: any = supabase.from('invoices').select(`
                        *,
                        customers ( name, phone, address, tax_id ),
                        bookings ( service_type, booking_number, service_address, scheduled_date, scheduled_time, notes, contractor_id, driver_id )
                    `);
                if (r === 'contractor') invoicesQuery = invoicesQuery.eq('contractor_id', contractorId);

                // Try by invoices.contractor_id
                let { data: invoicesData, error: invoicesError } = await invoicesQuery.order('created_at', { ascending: false });

                // Fallback: filter client-side by booking.contractor_id if invoices lack contractor_id
                if (!invoicesError && invoicesData && r === 'contractor' && contractorId) {
                    invoicesData = (invoicesData as any[]).filter((inv: any) => (inv as any).contractor_id === contractorId || (inv as any)?.bookings?.contractor_id === contractorId);
                }

                if (!invoicesError && invoicesData) {
                    setInvoices(invoicesData as any);

                    // Calculate statistics
                    const totalInvoices = invoicesData.length;
                    const paidRevenue = invoicesData.filter((inv: any) => inv.status === 'paid').reduce((sum: number, inv: any) => sum + (inv.paid_amount || 0), 0);
                    const pendingRevenue = invoicesData.filter((inv: any) => inv.status !== 'paid').reduce((sum: number, inv: any) => sum + (inv.remaining_amount || 0), 0);
                    const remainingAmount = invoicesData.reduce((sum: number, inv: any) => sum + (inv.remaining_amount || 0), 0);

                    setStats({ totalInvoices, paidRevenue, pendingRevenue, remainingAmount });
                }

                // Fetch bookings (with provider ids and scheduling fields)
                // @ts-ignore
                let { data: bookingsData, error: bookingsError } = await supabase
                    .from('bookings')
                    .select('id, booking_number, service_type, service_address, scheduled_date, scheduled_time, notes, contractor_id, driver_id');
                if (r === 'contractor' && contractorId) {
                    // @ts-ignore
                    const res = await supabase
                        .from('bookings')
                        .select('id, booking_number, service_type, service_address, scheduled_date, scheduled_time, notes, contractor_id, driver_id')
                        .eq('contractor_id', contractorId);
                    bookingsData = res.data as any;
                }
                if (!bookingsError && bookingsData) {
                    setBookings(bookingsData as any);

                    // Build provider id sets
                    const contractorIds = Array.from(new Set((bookingsData as any[]).map((b: any) => b.contractor_id).filter(Boolean)));
                    const driverIds = Array.from(new Set((bookingsData as any[]).map((b: any) => b.driver_id).filter(Boolean)));

                    // Fetch contractors
                    if (contractorIds.length > 0) {
                        // @ts-ignore
                        const { data: cdata } = await supabase.from('contractors').select('id, name, phone').in('id', contractorIds);
                        if (cdata) {
                            const cmap = new Map<string, { id: string; name: string; phone?: string }>((cdata as any[]).map((c: any) => [c.id, { id: c.id, name: c.name, phone: c.phone }]));
                            setContractorsMap(cmap);
                        }
                    }

                    // Fetch drivers
                    if (driverIds.length > 0) {
                        // @ts-ignore
                        const { data: ddata } = await supabase.from('drivers').select('id, name, phone').in('id', driverIds);
                        if (ddata) {
                            const dmap = new Map<string, { id: string; name: string; phone?: string }>((ddata as any[]).map((d: any) => [d.id, { id: d.id, name: d.name, phone: d.phone }]));
                            setDriversMap(dmap);
                        }
                    }
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

        fetchData();
    }, []);

    // Helper function to get service name
    const getServiceName = (serviceType: string) => {
        const service = services.find((s) => s.id === serviceType);
        return service ? service.name : serviceType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    };

    // Render invoice_type as a colored badge
    const renderInvoiceTypeBadge = (type?: string | null) => {
        if (!type) return <span className="text-sm text-gray-500">-</span>;
        const key = String(type).toLowerCase();
        let label = 'receipt only';
        let classes = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium';

        if (key.includes('tax')) {
            classes += ' bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
            label = type.replace(/_/g, ' ');
        } else {
            classes += ' bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
        }

        return <span className={classes}>{label}</span>;
    };

    // Filter invoices
    const filteredInvoices = invoices.filter((invoice) => {
        const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
        const searchTerm = search.toLowerCase();
        const customerName = invoice.customers?.name || '';
        const matchesSearch = !searchTerm || invoice.invoice_number.toLowerCase().includes(searchTerm) || customerName.toLowerCase().includes(searchTerm);

        return matchesStatus && matchesSearch;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
        );
    }

    const handleDownloadInvoicePdf = async (invoice: Invoice) => {
        try {
            const booking = invoice.bookings || bookings.find((b) => b.id === invoice.booking_id);
            const provider = booking?.contractor_id ? contractorsMap.get(booking.contractor_id as string) : booking?.driver_id ? driversMap.get(booking.driver_id as string) : undefined;
            const data: any = {
                company: {
                    name: 'PumpPro CRM',
                    phone: '',
                    address: '',
                    tax_id: '',
                    logo_url: '/assets/images/logo.png',
                },
                invoice: {
                    id: invoice.id,
                    invoice_number: invoice.invoice_number,
                    total_amount: invoice.total_amount,
                    paid_amount: invoice.paid_amount,
                    remaining_amount: invoice.remaining_amount,
                    status: invoice.status,
                    created_at: invoice.created_at,
                    due_date: invoice.due_date,
                },
                booking: booking
                    ? {
                          booking_number: (booking as any).booking_number,
                          service_type: (booking as any).service_type,
                          service_address: (booking as any).service_address,
                          scheduled_date: (booking as any).scheduled_date,
                          scheduled_time: (booking as any).scheduled_time,
                          notes: (booking as any).notes,
                          contractor_id: (booking as any).contractor_id,
                          driver_id: (booking as any).driver_id,
                      }
                    : undefined,
                contractor: provider ? { name: provider.name, phone: provider.phone || undefined } : undefined,
                customer: invoice.customers
                    ? {
                          name: invoice.customers.name,
                          phone: (invoice.customers as any).phone,
                          address: (invoice.customers as any).address,
                          tax_id: (invoice.customers as any).tax_id,
                      }
                    : undefined,
                service: booking ? { name: getServiceName((booking as any).service_type) } : undefined,
            };

            await InvoiceDealPDFGenerator.generatePDF(data, `invoice-${invoice.invoice_number}.pdf`, 'invoice');
        } catch (e: any) {
            alert(e?.message || 'Error generating PDF');
        }
    };

    return (
        <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
                <div className="panel">
                    <div className="mb-2 text-sm font-semibold text-gray-500">Total Invoices</div>
                    <div className="text-3xl font-bold">{stats.totalInvoices}</div>
                </div>
                <div className="panel">
                    <div className="mb-2 text-sm font-semibold text-gray-500">Paid Revenue</div>
                    <div className="text-3xl font-bold text-success">₪{stats.paidRevenue.toFixed(2)}</div>
                </div>
                <div className="panel">
                    <div className="mb-2 text-sm font-semibold text-gray-500">Pending Revenue</div>
                    <div className="text-3xl font-bold text-warning">₪{stats.pendingRevenue.toFixed(2)}</div>
                </div>
                <div className="panel">
                    <div className="mb-2 text-sm font-semibold text-gray-500">Remaining Amount</div>
                    <div className="text-3xl font-bold text-danger">₪{stats.remainingAmount.toFixed(2)}</div>
                </div>
            </div>

            {/* Invoices Table */}
            <div className="panel border-white-light px-0 dark:border-[#1b2e4b]">
                <div className="invoice-table">
                    <div className="mb-4.5 flex flex-col gap-5 px-5 md:flex-row md:items-center">
                        <div className="flex items-center gap-3">
                            <Link href="/invoices/add" className="btn btn-primary gap-2">
                                <IconPlus />
                                Add New Invoice receipt only
                            </Link>
                        </div>
                        <div className="ltr:ml-auto rtl:mr-auto flex items-center gap-2">
                            <StatusSelect
                                value={statusFilter}
                                onChange={(val) => setStatusFilter(val as any)}
                                options={[
                                    { label: 'Paid', value: 'paid' },
                                    { label: 'Pending', value: 'pending' },
                                ]}
                                placeholder="All Statuses"
                                className="form-select w-36 py-1 text-sm"
                            />
                            <input type="text" className="form-input w-auto" placeholder="Search invoices..." value={search} onChange={(e) => setSearch(e.target.value)} />
                        </div>
                    </div>

                    <div className="relative px-5 pb-5">
                        {filteredInvoices.length === 0 ? (
                            <div className="text-center py-10">
                                <p className="text-gray-500">No invoices found</p>
                            </div>
                        ) : (
                            <div className="overflow-auto rounded-md">
                                <table className="table-hover whitespace-nowrap">
                                    <thead>
                                        <tr>
                                            <th>Invoice #</th>
                                            <th>Type</th>
                                            <th>Customer</th>
                                            <th>Service</th>
                                            <th>Issue Date</th>
                                            <th>Due Date</th>
                                            <th>Amount</th>
                                            <th>Remaining</th>
                                            <th>Status</th>
                                            <th className="text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredInvoices.map((invoice) => {
                                            const booking = invoice.bookings || bookings.find((b) => b.id === invoice.booking_id);
                                            return (
                                                <tr key={invoice.id}>
                                                    <td>
                                                        <strong className="text-primary">#{invoice.invoice_number}</strong>
                                                    </td>
                                                    <td>{renderInvoiceTypeBadge(invoice.invoice_type)}</td>
                                                    <td>{invoice.customers?.name || 'N/A'}</td>
                                                    <td>{booking ? getServiceName(booking.service_type) : 'N/A'}</td>
                                                    <td>{invoice.created_at ? new Date(invoice.created_at).toLocaleDateString('en-GB') : 'N/A'}</td>
                                                    <td>{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-GB') : 'N/A'}</td>
                                                    <td className="font-semibold">₪{Number(invoice.subtotal_amount ?? invoice.total_amount).toFixed(2)}</td>
                                                    <td className="font-bold text-danger">₪{invoice.remaining_amount?.toFixed(2) || '0.00'}</td>
                                                    <td>
                                                        <span
                                                            className={`badge ${
                                                                invoice.status === 'paid' ? 'badge-outline-success' : invoice.status === 'overdue' ? 'badge-outline-danger' : 'badge-outline-warning'
                                                            }`}
                                                        >
                                                            {invoice.status?.toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td className="text-center">
                                                        <div className="flex items-center justify-center gap-3">
                                                            <Link href={`/invoices/preview/${invoice.id}`} className="inline-flex hover:text-primary" title="View Invoice">
                                                                <IconEye className="h-5 w-5" />
                                                            </Link>
                                                        </div>
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
            </div>
        </div>
    );
};

export default InvoicesPage;
