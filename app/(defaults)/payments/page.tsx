'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { getTranslation } from '@/i18n';
import IconCashBanknotes from '@/components/icon/icon-cash-banknotes';
import IconCreditCard from '@/components/icon/icon-credit-card';
import IconCalendar from '@/components/icon/icon-calendar';
import IconSearch from '@/components/icon/icon-search';
import IconPlus from '@/components/icon/icon-plus';
import IconDownload from '@/components/icon/icon-download';
import MethodsSelect from '@/components/selectors/MethodsSelect';

type ContractorSummary = {
    id: string;
    name: string | null;
    balance: number | null;
};

type ContractorPaymentRecord = {
    id: string;
    contractor_id: string;
    booking_id?: string | null;
    amount: number;
    payment_method: string;
    payment_date: string;
    reference_number?: string | null;
    notes?: string | null;
    created_at?: string;
    contractors?: {
        id: string;
        name?: string | null;
        balance?: number | null;
    } | null;
    bookings?: {
        id: string;
        booking_number?: string | null;
        service_type?: string | null;
    } | null;
};

const formatCurrency = (value: number) => new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 2 }).format(value);

const PaymentsPage = () => {
    const { t } = getTranslation();
    const [payments, setPayments] = useState<ContractorPaymentRecord[]>([]);
    const [negativeBalances, setNegativeBalances] = useState<ContractorSummary[]>([]);
    const [search, setSearch] = useState('');
    const [method, setMethod] = useState<'cash' | 'credit_card' | 'bank_transfer' | 'check' | ''>('');
    const [serviceFilter, setServiceFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<'all' | 'payment' | 'booking'>('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const { data, error } = await supabase
                    .from('contractor_payments')
                    .select(
                        '*, contractors:contractors!contractor_payments_contractor_id_fkey(id,name,balance), bookings:bookings!contractor_payments_booking_id_fkey(id, booking_number, service_type)',
                    )
                    .order('payment_date', { ascending: false });
                if (error) throw error;
                setPayments((data as any) || []);
            } catch (err) {
                console.error('Error loading contractor payments', err);
            } finally {
                setLoading(false);
            }
        };
        const loadBalances = async () => {
            try {
                // Under new convention a POSITIVE balance means the contractor is owed money.
                const { data } = await supabase.from('contractors').select('id,name,balance').gt('balance', 0).order('balance');
                setNegativeBalances((data as any) || []);
            } catch (err) {
                console.error('Error loading contractor balances', err);
            }
        };
        loadData();
        loadBalances();
    }, []);

    const serviceOptions = useMemo(() => {
        const unique = new Set<string>();
        payments.forEach((p) => {
            if (p.bookings?.service_type) unique.add(p.bookings.service_type);
        });
        return Array.from(unique);
    }, [payments]);

    const filteredPayments = useMemo(() => {
        return payments.filter((payment) => {
            const paymentType = payment.booking_id ? 'booking' : 'payment';
            const matchesMethod = method ? payment.payment_method === method : true;
            const matchesService = serviceFilter === 'all' || payment.bookings?.service_type === serviceFilter;
            const matchesType = typeFilter === 'all' || paymentType === typeFilter;
            const matchesSearch =
                !search ||
                payment.contractors?.name?.toLowerCase().includes(search.toLowerCase()) ||
                payment.reference_number?.toLowerCase().includes(search.toLowerCase()) ||
                payment.payment_method.toLowerCase().includes(search.toLowerCase()) ||
                payment.bookings?.booking_number?.toLowerCase().includes(search.toLowerCase());
            return matchesMethod && matchesService && matchesType && matchesSearch;
        });
    }, [payments, method, serviceFilter, typeFilter, search]);

    const totals = useMemo(() => {
        const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        // Sum positive balances (contractors owed money).
        const outstanding = negativeBalances.reduce((sum, contractor) => sum + (contractor.balance || 0), 0);
        return { totalPaid, outstanding, count: payments.length };
    }, [payments, negativeBalances]);

    return (
        <div className="space-y-6">
            <div className="panel">
                {/* Header */}
                <div className="mb-5 flex flex-col gap-5 px-5 md:items-start">
                    <div className="flex items-center gap-2">
                        <IconCashBanknotes className="h-6 w-6 text-primary" />
                        <h2 className="text-xl font-bold dark:text-white">{t('payouts') || 'Payouts'}</h2>
                    </div>

                    <div className="flex gap-3">
                        <button
                            className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
                            onClick={() => window.print()}
                        >
                            <IconDownload className="mr-2 h-4 w-4 text-white/80" />
                            {t('export') || 'Export'}
                        </button>
                        <Link
                            href="/payments/add"
                            className="inline-flex items-center rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-900/40"
                        >
                            <IconPlus className="mr-2 h-4 w-4" />
                            {t('add_payment') || 'Create Payout'}
                        </Link>
                    </div>
                </div>
                {/* Summary Stats (updated to match provided design) */}
                <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-lg border border-white-light bg-white p-4 dark:border-[#1b2e4b] dark:bg-[#0e1726]">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">{t('total_owed_to_providers') || 'Total Owed to Providers'}</div>
                                <div className="mt-1 text-xl font-bold text-danger">{formatCurrency(totals.outstanding)}</div>
                            </div>
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-danger-light dark:bg-danger">
                                <IconCashBanknotes className="h-6 w-6 text-danger dark:text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg border border-white-light bg-white p-4 dark:border-[#1b2e4b] dark:bg-[#0e1726]">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">{t('total_payouts') || 'Total Payouts'}</div>
                                <div className="mt-1 text-xl font-bold text-info">{totals.count}</div>
                            </div>
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-info-light dark:bg-info">
                                <IconCashBanknotes className="h-6 w-6 text-info dark:text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg border border-white-light bg-white p-4 dark:border-[#1b2e4b] dark:bg-[#0e1726]">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">{t('total_paid_out') || 'Total Paid Out'}</div>
                                <div className="mt-1 text-xl font-bold text-success">{formatCurrency(totals.totalPaid)}</div>
                            </div>
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-success-light dark:bg-success">
                                <IconCashBanknotes className="h-6 w-6 text-success dark:text-white" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <section className="panel">
                <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="relative flex-1">
                        <IconSearch className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                        <input
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-10 py-3 text-sm text-white placeholder:text-white/40 focus:border-blue-500 focus:outline-none"
                            placeholder={t('search') || 'Search payments'}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    {(search || method || serviceFilter !== 'all' || typeFilter !== 'all') && (
                        <button
                            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
                            onClick={() => {
                                setSearch('');
                                setMethod('');
                                setServiceFilter('all');
                                setTypeFilter('all');
                            }}
                        >
                            {t('clear_filters') || 'Clear Filters'}
                        </button>
                    )}
                </div>

                <div className="mb-6 grid gap-3 md:grid-cols-4">
                    <div>
                        <p className="mb-1 text-xs uppercase tracking-[0.3em] text-white/40">{t('service_type') || 'Service Type'}</p>
                        <MethodsSelect
                            value={serviceFilter === 'all' ? '' : serviceFilter}
                            onChange={(val) => setServiceFilter(val || 'all')}
                            placeholder={t('all_service_type') || 'All Service Types'}
                            className="w-full"
                            options={[...serviceOptions.map((opt) => ({ label: opt, value: opt }))]}
                        />
                    </div>
                    <div>
                        <p className="mb-1 text-xs uppercase tracking-[0.3em] text-white/40">{t('payment_method') || 'Payment Method'}</p>
                        <MethodsSelect value={method || undefined} onChange={(val) => setMethod((val as any) || '')} className="w-full" placeholder={t('all_payment_method') || 'All Methods'} />
                    </div>
                    <div>
                        <p className="mb-1 text-xs uppercase tracking-[0.3em] text-white/40">{t('type') || 'Type'}</p>
                        <MethodsSelect
                            value={typeFilter === 'all' ? '' : typeFilter}
                            onChange={(val) => setTypeFilter((val as 'payment' | 'booking') || 'all')}
                            className="w-full"
                            placeholder={t('all_type') || 'All Type'}
                            options={[
                                { label: t('payment') || 'Payment', value: 'payment' },
                                { label: t('booking') || 'Booking', value: 'booking' },
                            ]}
                        />
                    </div>
                    <div>
                        <p className="mb-1 text-xs uppercase tracking-[0.3em] text-white/40">{t('status') || 'Status'}</p>
                        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">{t('paid') || 'Paid'}</div>
                    </div>
                </div>

                <div className="panel">
                    <div className="table-responsive">
                        <table className="table-bordered">
                            <thead className="bg-white/5 text-xs uppercase tracking-wider text-white/60">
                                <tr>
                                    <th className="px-4 py-3">{t('payment_date') || 'Payment Date'}</th>
                                    <th className="px-4 py-3">{t('type') || 'Type'}</th>
                                    <th className="px-4 py-3">{t('status') || 'Status'}</th>
                                    <th className="px-4 py-3">{t('service_type') || 'Service Type'}</th>
                                    <th className="px-4 py-3">{t('contractor') || 'Contractor'}</th>
                                    <th className="px-4 py-3 text-right">{t('amount') || 'Amount'}</th>
                                    <th className="px-4 py-3">{t('payment_method') || 'Payment Method'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-10 text-center text-white/50">
                                            {t('loading') || 'Loading...'}
                                        </td>
                                    </tr>
                                ) : filteredPayments.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-10 text-center text-white/50">
                                            {t('no_records_found') || 'No records found'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredPayments.map((payment) => {
                                        const paymentType = payment.booking_id ? 'booking' : 'payment';
                                        return (
                                            <tr key={payment.id} className="border-t border-white/5 bg-white/5/5 hover:bg-white/5">
                                                <td className="px-4 py-4 text-white">{new Date(payment.payment_date).toLocaleDateString()}</td>
                                                <td className="px-4 py-4">
                                                    <span
                                                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                                            paymentType === 'payment' ? 'bg-green-500/10 text-green-300' : 'bg-amber-500/10 text-amber-300'
                                                        }`}
                                                    >
                                                        {paymentType === 'payment' ? t('payment') || 'Payment' : t('booking') || 'Booking'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-200">{t('paid') || 'Paid'}</span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    {payment.bookings?.service_type ? (
                                                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70">{payment.bookings.service_type}</span>
                                                    ) : (
                                                        <span className="text-white/40">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="font-semibold text-white">{payment.contractors?.name || '—'}</div>
                                                </td>
                                                <td className="px-4 py-4 text-right text-green-300">{formatCurrency(payment.amount)}</td>
                                                <td className="px-4 py-4">{payment.payment_method || '—'}</td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default PaymentsPage;
