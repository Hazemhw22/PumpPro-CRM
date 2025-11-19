'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { getTranslation } from '@/i18n';
import MethodsSelect from '@/components/selectors/MethodsSelect';
import IconArrowLeft from '@/components/icon/icon-arrow-left';
import IconCreditCard from '@/components/icon/icon-credit-card';
import IconUser from '@/components/icon/icon-user';

interface ContractorOption {
    id: string;
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    balance?: number | null;
}

interface BookingLite {
    id: string;
    booking_number: string;
    contractor_price?: number | null;
    price?: number | null;
    status: string;
}

const formatCurrency = (value?: number | null) => {
    const amount = Number(value || 0);
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 2 }).format(amount);
};

const AddContractorPaymentPage = () => {
    const router = useRouter();
    const { t } = getTranslation();

    const [step, setStep] = useState(1);
    const [contractor, setContractor] = useState<ContractorOption | null>(null);
    const [contractors, setContractors] = useState<ContractorOption[]>([]);
    const [bookings, setBookings] = useState<BookingLite[]>([]);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        amount: '',
        payment_method: 'bank_transfer' as 'cash' | 'credit_card' | 'bank_transfer' | 'check',
        payment_date: new Date().toISOString().split('T')[0],
        booking_id: '',
        reference_number: '',
        notes: '',
    });

    useEffect(() => {
        const loadContractors = async () => {
            try {
                const { data, error } = await supabase.from('contractors').select('id,name,phone,email,balance').order('name');
                if (error) throw error;
                setContractors((data as any) || []);
            } catch (err) {
                console.error('Error loading contractors', err);
            }
        };
        loadContractors();
    }, []);

    useEffect(() => {
        const loadBookings = async () => {
            if (!contractor) {
                setBookings([]);
                return;
            }
            try {
                const { data, error } = await supabase
                    .from('bookings')
                    .select('id, booking_number, contractor_price, price, status')
                    .eq('contractor_id', contractor.id)
                    .order('created_at', { ascending: false });
                if (error) throw error;
                setBookings((data as any) || []);
            } catch (err) {
                console.error('Error loading contractor bookings', err);
            }
        };
        loadBookings();
    }, [contractor]);

    const defaultAmount = useMemo(() => {
        if (!contractor?.balance) return '';
        if ((contractor.balance || 0) < 0) {
            return Math.abs(contractor.balance || 0).toFixed(2);
        }
        return '';
    }, [contractor]);

    useEffect(() => {
        if (defaultAmount) {
            setForm((prev) => ({ ...prev, amount: defaultAmount }));
        }
    }, [defaultAmount]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!contractor) {
            alert(t('select_contractor') || 'Please select a contractor');
            return;
        }

        const amount = parseFloat(form.amount);
        if (Number.isNaN(amount) || amount <= 0) {
            alert(t('amount_must_be_greater_than_zero') || 'Amount must be greater than zero');
            return;
        }

        try {
            setLoading(true);
            const { error: insertError } = await (supabase.from('contractor_payments') as any).insert({
                contractor_id: contractor.id,
                booking_id: form.booking_id || null,
                amount,
                payment_method: form.payment_method,
                payment_date: form.payment_date,
                reference_number: form.reference_number || null,
                notes: form.notes || null,
            });
            if (insertError) throw insertError;

            const { error: balanceError } = await (supabase
                .from('contractors') as any)
                .update({ balance: (contractor.balance || 0) + amount, updated_at: new Date().toISOString() })
                .eq('id', contractor.id);
            if (balanceError) throw balanceError;

            router.push('/payments');
        } catch (err) {
            console.error('Error recording payment', err);
            alert(t('error_creating_payment') || 'Error recording payment');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto max-w-5xl space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <button onClick={() => router.back()} className="mb-2 flex items-center gap-2 text-primary">
                        <IconArrowLeft className="h-5 w-5" />
                        {t('back') || 'Back'}
                    </button>
                    <h1 className="text-3xl font-bold">{t('add_payment') || 'Add Contractor Payment'}</h1>
                    <p className="text-gray-500">{t('contractor_payment_description') || 'Select a contractor with an outstanding balance and record a payout.'}</p>
                </div>
                <IconCreditCard className="h-12 w-12 text-primary" />
            </div>

            <div className="flex items-center justify-center gap-4">
                {[1, 2].map((value) => (
                    <div key={value} className="flex items-center gap-2">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold ${step >= value ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
                            {value}
                        </div>
                        {value < 2 && <div className={`h-1 w-16 rounded ${step > value ? 'bg-primary' : 'bg-gray-200'}`} />}
                    </div>
                ))}
            </div>

            {step === 1 && (
                <div className="panel space-y-4">
                    <h2 className="text-xl font-semibold">{t('select_contractor') || 'Select Contractor'}</h2>
                    <p className="text-sm text-gray-500">
                        {t('select_contractor_help') || 'Choose a contractor with a negative balance to begin recording a payment.'}
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                        {contractors.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setContractor(item);
                                    setStep(2);
                                }}
                                className={`rounded-xl border p-4 text-left transition hover:border-primary ${
                                    contractor?.id === item.id ? 'border-primary shadow-lg' : 'border-gray-200'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <IconUser className="h-6 w-6 text-primary" />
                                    <div>
                                        <p className="text-lg font-semibold">{item.name || '—'}</p>
                                        <p className="text-sm text-gray-500">{item.phone || item.email || '—'}</p>
                                    </div>
                                </div>
                                <div className="mt-3 text-sm font-semibold">
                                    {t('balance') || 'Balance'}: <span className={((item.balance || 0) < 0 ? 'text-danger' : 'text-success')}>{formatCurrency(item.balance || 0)}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {step === 2 && contractor && (
                <div className="panel space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">{t('paying') || 'Paying'}</p>
                            <h2 className="text-2xl font-bold">{contractor.name}</h2>
                            <p className="text-sm text-gray-500">
                                {t('current_balance') || 'Current Balance'}: <span className="font-semibold">{formatCurrency(contractor.balance || 0)}</span>
                            </p>
                        </div>
                        <button className="btn btn-outline-primary" onClick={() => setStep(1)}>
                            {t('change_contractor') || 'Change Contractor'}
                        </button>
                    </div>

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div>
                            <label className=" mb-1 block font-semibold">{t('booking_optional') || 'Booking (optional)'}</label>
                            <select
                                className="form-select"
                                value={form.booking_id}
                                onChange={(e) => setForm((prev) => ({ ...prev, booking_id: e.target.value }))}
                            >
                                <option value="">{t('no_booking_selected') || 'No booking selected'}</option>
                                {bookings.map((booking) => (
                                    <option key={booking.id} value={booking.id}>
                                        #{booking.booking_number} · {formatCurrency(booking.contractor_price ?? booking.price ?? 0)} ({booking.status})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-1 block font-semibold">
                                {t('amount')} <span className="text-danger">*</span>
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                className="form-input"
                                value={form.amount}
                                onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                                required
                            />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-1 block font-semibold">{t('payment_method') || 'Payment Method'}</label>
                                <MethodsSelect
                                    value={form.payment_method}
                                    onChange={(val) => setForm((prev) => ({ ...prev, payment_method: (val as any) || 'cash' }))}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block font-semibold">{t('payment_date') || 'Payment Date'}</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={form.payment_date}
                                    onChange={(e) => setForm((prev) => ({ ...prev, payment_date: e.target.value }))}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="mb-1 block font-semibold">{t('reference_number') || 'Reference'}</label>
                            <input
                                type="text"
                                className="form-input"
                                value={form.reference_number}
                                onChange={(e) => setForm((prev) => ({ ...prev, reference_number: e.target.value }))}
                            />
                        </div>

                        <div>
                            <label className="mb-1 block font-semibold">{t('notes') || 'Notes'}</label>
                            <textarea
                                className="form-textarea"
                                rows={3}
                                value={form.notes}
                                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                            />
                        </div>

                        <div className="flex items-center justify-end gap-3">
                            <Link href="/payments" className="btn btn-outline-danger">
                                {t('cancel') || 'Cancel'}
                            </Link>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? t('processing') || 'Processing...' : t('save_payment') || 'Save Payment'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default AddContractorPaymentPage;

