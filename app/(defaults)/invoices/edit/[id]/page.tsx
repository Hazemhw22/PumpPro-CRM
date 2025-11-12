'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { getTranslation } from '@/i18n';
import IconArrowLeft from '@/components/icon/icon-arrow-left';
import IconDollarSign from '@/components/icon/icon-dollar-sign';
import { BillPayment } from '@/types/payment';
import { MultiplePaymentForm } from '@/components/forms/multiple-payment-form';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';

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
    // Extended fields (from migration)
    invoice_type?: string;
    invoice_direction?: string;
    invoice_date?: string;
    customer_name?: string;
    customer_phone?: string;
    service_name?: string;
    service_description?: string;
    tax_amount?: number;
    subtotal_amount?: number;
    notes?: string;
    commission?: number;
    bill_description?: string;
}

interface Booking {
    id: string;
    booking_number: string;
    service_type: string;
    service_address: string;
    scheduled_date: string;
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
}

const EditInvoice = () => {
    const { t } = getTranslation();
    const router = useRouter();
    const params = useParams();
    const invoiceId = params?.id as string;
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [booking, setBooking] = useState<Booking | null>(null);
    const [payments, setPayments] = useState<BillPayment[]>([]);
    const [alert, setAlert] = useState<{ message: string; type: 'success' | 'danger' } | null>(null);

    useEffect(() => {
        fetchInvoice();
    }, [invoiceId]);

    useEffect(() => {
        if (payments.length > 0) {
            // Payments are managed by MultiplePaymentForm
            // This effect is for any side effects if needed
        }
    }, [payments]);

    const fetchInvoice = async () => {
        try {
            // Fetch invoice with extended fields
            const { data: invoiceData, error: invoiceError } = await supabase
                .from('invoices')
                .select('*')
                .eq('id', invoiceId)
                .single();

            if (invoiceError) throw invoiceError;
            const invoiceRecord = invoiceData as any;
            setInvoice(invoiceRecord);

            // Fetch booking
            if (invoiceRecord?.booking_id) {
                const { data: bookingData } = await supabase
                    .from('bookings')
                    .select('*')
                    .eq('id', invoiceRecord.booking_id)
                    .single();
                
                if (bookingData) {
                    setBooking(bookingData as any);
                }
            }

            // Fetch payments for this invoice
            const { data: paymentsData, error: paymentsError } = await supabase
                .from('payments')
                .select('*')
                .eq('invoice_id', invoiceId)
                .order('created_at', { ascending: false });

            if (paymentsError) throw paymentsError;

            // Convert payments from database format to BillPayment format
            if (paymentsData && paymentsData.length > 0) {
                const convertedPayments: BillPayment[] = paymentsData.map((payment: any) => {
                    // Map payment_method to payment_type
                    let paymentType: 'cash' | 'visa' | 'bank_transfer' | 'check' = 'cash';
                    if (payment.payment_method === 'credit_card') {
                        paymentType = 'visa'; // Map credit_card to visa for BillPayment
                    } else if (payment.payment_method === 'cash') {
                        paymentType = 'cash';
                    } else if (payment.payment_method === 'bank_transfer') {
                        paymentType = 'bank_transfer';
                    } else if (payment.payment_method === 'check') {
                        paymentType = 'check';
                    }

                    // Create BillPayment from database payment
                    const billPayment: BillPayment = {
                        id: payment.id,
                        payment_type: paymentType,
                        amount: payment.amount || 0,
                        // Map additional fields if they exist in a JSON field or separate fields
                        // Note: The payments table might not have all these fields
                        // Additional payment details might be stored in a JSON field or notes
                        // For now, we'll set what we can from the payment record
                        created_at: payment.created_at,
                        updated_at: payment.updated_at,
                    };

                    // If payment has additional fields stored in notes or JSON, parse them here
                    // This might need adjustment based on your actual database structure
                    return billPayment;
                });
                setPayments(convertedPayments);
            } else {
                // Initialize with empty payments array
                setPayments([]);
            }
        } catch (error) {
            console.error('Error fetching invoice:', error);
            setAlert({ message: t('error_loading_data') || 'Error loading data', type: 'danger' });
        } finally {
            setLoading(false);
        }
    };

    const handleSavePayments = async () => {
        if (!invoice) return;

        // Validation - ensure we have some payment amount
        const totalPaid = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
        const invoiceTotal = invoice.total_amount || 0;

        // Only validate that we have some payment amount
        if (totalPaid <= 0 && payments.length > 0) {
            setAlert({
                message: t('payment_amount_required') || 'Payment amount is required',
                type: 'danger',
            });
            return;
        }

        // Show info message if payment exceeds invoice total (extra goes to customer balance)
        if (totalPaid > invoiceTotal + 0.01) {
            const excessAmount = totalPaid - invoiceTotal;
            setAlert({
                message: `${t('payment_exceeds_selling_price') || 'Payment exceeds invoice total'}: ₪${excessAmount.toFixed(0)} ${t('will_be_added_to_customer_balance') || 'will be added to customer balance'}`,
                type: 'success',
            });
            // Don't return - allow the payment to proceed
        }

        setSaving(true);
        try {
            // Delete all existing payments for this invoice
            const { error: deleteError } = await supabase
                .from('payments')
                .delete()
                .eq('invoice_id', invoice.id);

            if (deleteError) throw deleteError;

            // Insert new payments
            if (payments.length > 0) {
                const paymentDate = invoice.invoice_date || invoice.created_at || new Date().toISOString().split('T')[0];
                
                const paymentInserts = payments.map((payment) => {
                    // Map payment_type to payment_method
                    let paymentMethod: 'cash' | 'credit_card' | 'bank_transfer' | 'check' = 'cash';
                    if (payment.payment_type === 'visa') {
                        paymentMethod = 'credit_card'; // Map visa to credit_card for PaymentMethod enum
                    } else if (payment.payment_type === 'cash') {
                        paymentMethod = 'cash';
                    } else if (payment.payment_type === 'bank_transfer') {
                        paymentMethod = 'bank_transfer';
                    } else if (payment.payment_type === 'check') {
                        paymentMethod = 'check';
                    }

                    // Create payment record for database
                    // Note: The payments table stores basic fields only
                    // Additional payment details (visa_installments, etc.) are not stored in the payments table
                    // If you need to store them, you might need to use a JSON field in notes or extend the payments table
                    const paymentRecord: any = {
                        invoice_id: invoice.id,
                        booking_id: invoice.booking_id,
                        customer_id: invoice.customer_id,
                        amount: payment.amount || 0,
                        payment_method: paymentMethod,
                        payment_date: paymentDate,
                        transaction_id: null,
                        notes: payment.approval_number || payment.transfer_number || payment.check_number || null, // Store key info in notes
                        created_by: null,
                    };

                    return paymentRecord;
                });

                const { error: insertError } = await supabase
                    .from('payments')
                    .insert(paymentInserts as any);

                if (insertError) throw insertError;
            }

            // Update invoice paid_amount and remaining_amount
            const totalPaidAmount = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
            const remainingAmount = invoice.total_amount - totalPaidAmount;
            const newStatus = remainingAmount <= 0.01 ? 'paid' : invoice.status === 'paid' ? 'pending' : invoice.status;

            const updatePayload = {
                paid_amount: totalPaidAmount,
                remaining_amount: remainingAmount,
                status: newStatus,
            };

            // @ts-ignore - Supabase type inference issue with Database types
            // The fields are valid according to database schema (paid_amount, remaining_amount, status exist in invoices table)
            const { error: updateError } = await (supabase
                .from('invoices') as any)
                .update(updatePayload)
                .eq('id', invoice.id);

            if (updateError) throw updateError;

            if (remainingAmount <= 0.01) {
                setAlert({
                    message: t('payments_updated_fully_paid') || 'Payments updated - Invoice fully paid',
                    type: 'success',
                });
            } else {
                setAlert({
                    message: t('payments_updated') || 'Payments updated successfully',
                    type: 'success',
                });
            }

            // Refresh invoice data
            await fetchInvoice();

            // Redirect to preview after a short delay
            setTimeout(() => {
                router.push(`/invoices/preview/${invoice.id}`);
            }, 1500);
        } catch (error) {
            console.error('Error updating payments:', error);
            setAlert({ 
                message: t('error_saving_data') || 'Error saving data', 
                type: 'danger' 
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!invoice) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('invoice_not_found') || 'Invoice Not Found'}</h2>
                    <Link href="/invoices" className="btn btn-primary">
                        {t('back_to_invoices') || 'Back to Invoices'}
                    </Link>
                </div>
            </div>
        );
    }

    // Only allow editing payments for receipt types
    const invoiceType = invoice.invoice_type || 'tax_invoice';
    if (invoiceType !== 'receipt_only' && invoiceType !== 'tax_invoice_receipt') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('payment_editing_not_supported') || 'Payment Editing Not Supported'}</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">{t('only_receipts_can_edit_payments') || 'Only receipts can have their payments edited'}</p>
                    <Link href="/invoices" className="btn btn-primary">
                        {t('back_to_invoices') || 'Back to Invoices'}
                    </Link>
                </div>
            </div>
        );
    }

    const currentTotal = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const invoiceTotal = invoice.total_amount || 0;
    const remainingAmount = invoiceTotal - currentTotal;

    return (
        <div className="space-y-8 pt-5">
            {/* Fixed Position Alert */}
            {alert && (
                <div className="fixed top-4 right-4 z-50 min-w-80 max-w-md">
                    <Alert 
                        type={alert.type} 
                        title={alert.type === 'success' ? t('success') || 'Success' : t('error') || 'Error'} 
                        message={alert.message} 
                        onClose={() => setAlert(null)} 
                    />
                </div>
            )}

            {/* Header */}
            <div className="panel !border-white-light/10">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/invoices"
                            className="flex items-center justify-center w-10 h-10 rounded-lg bg-white-light/40 hover:bg-white-light/60 dark:bg-[#191e3a] dark:hover:bg-[#191e3a]/80 transition-all duration-300"
                        >
                            <IconArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('edit_invoice_payments') || 'Edit Invoice Payments'}</h5>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {t('invoice_number') || 'Invoice Number'}: #{invoice.invoice_number} - {invoice.customer_name || booking?.customer_name || 'Customer'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Invoice Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="border border-primary-light p-4 rounded-lg">
                        <div className="text-sm text-primary">{t('invoice_total') || 'Invoice Total'}</div>
                        <div className="text-xl font-bold text-primary">₪{invoiceTotal.toFixed(0)}</div>
                    </div>
                    <div className="border border-success-light p-4 rounded-lg">
                        <div className="text-sm text-success">{t('paid_amount') || 'Paid Amount'}</div>
                        <div className="text-xl font-bold text-success">₪{currentTotal.toFixed(0)}</div>
                    </div>
                    <div className={`p-4 rounded-lg ${remainingAmount > 0.01 ? 'border border-warning-light' : 'border border-success-light'}`}>
                        <div className={`text-sm ${remainingAmount > 0.01 ? 'text-warning' : 'text-success'}`}>
                            {remainingAmount > 0.01 ? t('remaining_amount') || 'Remaining Amount' : t('fully_paid') || 'Fully Paid'}
                        </div>
                        <div className={`text-xl font-bold ${remainingAmount > 0.01 ? 'text-warning' : 'text-success'}`}>
                            ₪{Math.abs(remainingAmount).toFixed(0)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Payments Form */}
            <div className="panel">
                <div className="mb-5 flex items-center gap-3">
                    <IconDollarSign className="w-5 h-5 text-primary" />
                    <h5 className="text-lg font-semibold dark:text-white-light">{t('manage_payments') || 'Manage Payments'}</h5>
                </div>

                <MultiplePaymentForm 
                    payments={payments} 
                    onPaymentsChange={setPayments} 
                    totalAmount={invoiceTotal} 
                />

                <div className="flex justify-end gap-4 mt-6">
                    <button 
                        type="button" 
                        onClick={() => router.back()} 
                        className="btn btn-outline-danger"
                    >
                        {t('cancel') || 'Cancel'}
                    </button>
                    <button 
                        type="button" 
                        onClick={handleSavePayments} 
                        className="btn btn-primary" 
                        disabled={saving}
                    >
                        {saving ? t('saving') || 'Saving...' : t('save_payments') || 'Save Payments'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditInvoice;
