'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { getTranslation } from '@/i18n';
import IconDollarSign from '@/components/icon/icon-dollar-sign';
import IconPdf from '@/components/icon/icon-pdf';
import IconPrinter from '@/components/icon/icon-printer';
import { InvoiceDealPDFGenerator } from '@/components/pdf/invoice-deal-pdf';
import { generateBillPDF, BillData } from '@/utils/pdf-generator';
import { BillPayment } from '@/types/payment';

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
    tranzila_document_id?: string;
    tranzila_document_number?: string;
    tranzila_retrieval_key?: string;
    tranzila_created_at?: string;
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

interface Service {
    id: string;
    name: string;
    description?: string;
    price_private?: number;
    price_business?: number;
}

interface Customer {
    id: string;
    name: string;
    phone: string;
    email?: string;
    address?: string;
    business_name?: string;
    type: string;
}

// Helper function to convert Invoice to BillData format for PDF generation
const convertInvoiceToBillData = (invoice: Invoice, booking?: Booking | null, service?: Service | null): BillData => {
    const billType: BillData['bill_type'] =
        invoice.invoice_type === 'tax_invoice' ||
        invoice.invoice_type === 'receipt_only' ||
        invoice.invoice_type === 'tax_invoice_receipt' ||
        invoice.invoice_type === 'general'
            ? invoice.invoice_type
            : 'tax_invoice';

    return {
        id: invoice.id,
        bill_type: billType,
        customer_name: invoice.customer_name || booking?.customer_name || 'Customer',
        customer_phone: invoice.customer_phone || booking?.customer_phone || '',
        created_at: invoice.invoice_date || invoice.created_at,
        bill_amount: invoice.subtotal_amount || invoice.total_amount,
        bill_description: invoice.service_name || service?.name || invoice.bill_description || '',
        total: invoice.subtotal_amount || invoice.total_amount,
        tax_amount: invoice.tax_amount || 0,
        total_with_tax: invoice.total_amount,
        commission: invoice.commission || null,
        car_details: invoice.service_name || service?.name || '',
        payment_type: null,
        cash_amount: null,
        visa_amount: null,
        bank_amount: null,
        check_amount: null,
    };
};

const InvoicePreview = () => {
    const { t } = getTranslation();
    const router = useRouter();
    const params = useParams();
    const invoiceId = params?.id as string;
    const [loading, setLoading] = useState(true);
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [booking, setBooking] = useState<Booking | null>(null);
    const [service, setService] = useState<Service | null>(null);
    const [payments, setPayments] = useState<BillPayment[]>([]);
    const [downloadingPDF, setDownloadingPDF] = useState(false);

    useEffect(() => {
        fetchInvoice();
    }, [invoiceId]);

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

            // Fetch customer
            if (invoiceRecord?.customer_id) {
                const { data: customerData } = await supabase
                    .from('customers')
                    .select('*')
                    .eq('id', invoiceRecord.customer_id)
                    .single();
                
                if (customerData) setCustomer(customerData as any);
            }

            // Fetch booking
            if (invoiceRecord?.booking_id) {
                const { data: bookingData } = await supabase
                    .from('bookings')
                    .select('*')
                    .eq('id', invoiceRecord.booking_id)
                    .single();
                
                if (bookingData) {
                    const bookingRecord = bookingData as any;
                    setBooking(bookingRecord);

                    // Fetch service - try by ID first, then by name
                    const serviceType = bookingRecord.service_type;
                    if (serviceType) {
                        // Try to fetch by ID
                        const { data: serviceById } = await supabase
                            .from('services')
                            .select('*')
                            .eq('id', serviceType)
                            .single();
                        
                        if (serviceById) {
                            setService(serviceById as any);
                        } else {
                            // Try to fetch by name
                            const { data: serviceByName } = await supabase
                                .from('services')
                                .select('*')
                                .eq('name', serviceType)
                                .eq('active', true)
                                .single();
                            
                            if (serviceByName) {
                                setService(serviceByName as any);
                            }
                        }
                    }
                }
            }

            // Fetch payments
            const { data: paymentsData } = await supabase
                .from('payments')
                .select('*')
                .eq('invoice_id', invoiceId)
                .order('created_at', { ascending: false });
            
            if (paymentsData) {
                setPayments(paymentsData as any);
            }

            console.log('Fetched invoice:', invoiceRecord);
        } catch (error) {
            console.error('Error fetching invoice:', error);
        } finally {
            setLoading(false);
        }
    };

    const getInvoiceTypeLabel = (type?: string) => {
        if (!type) return t('invoice') || 'Invoice';
        switch (type) {
            case 'tax_invoice':
                return t('tax_invoice_only') || 'Tax Invoice Only';
            case 'receipt_only':
                return t('receipt_only') || 'Receipt Only';
            case 'general':
                return t('general_bill') || 'General Bill';
            default:
                return type;
        }
    };

    const handleDownloadPDF = async () => {
        if (!invoice) return;

        setDownloadingPDF(true);
        try {
            const currentLang = typeof window !== 'undefined'
                ? (localStorage.getItem('i18nextLng') || 'he')
                : 'he';
            const language = currentLang === 'ae' ? 'ar' : currentLang === 'he' ? 'he' : 'en';

            const pdfData: any = {
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
                    created_at: invoice.invoice_date || invoice.created_at,
                },
                booking: booking
                    ? {
                          booking_number: booking.booking_number,
                          service_type: booking.service_type,
                          service_address: booking.service_address,
                          scheduled_date: booking.scheduled_date,
                          scheduled_time: (booking as any).scheduled_time,
                          notes: (booking as any).notes,
                          contractor_id: (booking as any).contractor_id,
                          driver_id: (booking as any).driver_id,
                      }
                    : undefined,
                customer: customer
                    ? {
                          name: customer.name,
                          phone: customer.phone,
                          address: customer.address,
                          business_name: customer.business_name,
                      }
                    : undefined,
                service: service
                    ? {
                          name: service.name,
                      }
                    : undefined,
                lang: language as any,
            };

            await InvoiceDealPDFGenerator.generatePDF(
                pdfData,
                `invoice-${invoice.invoice_number}.pdf`,
                'invoice'
            );
        } catch (error) {
            console.error('Error generating PDF:', error);
        } finally {
            setDownloadingPDF(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!invoice) {
        return (
            <div className="container mx-auto p-6">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-600">{t('invoice_not_found') || 'Invoice Not Found'}</h1>
                    <Link href="/invoices" className="btn btn-primary mt-4">
                        {t('back_to_invoices') || 'Back to Invoices'}
                    </Link>
                </div>
            </div>
        );
    }

    const invoiceType = invoice.invoice_type || 'tax_invoice';
    const serviceName = invoice.service_name || service?.name || booking?.service_type || '';
    const servicePrice = invoice.subtotal_amount || invoice.total_amount;
    const taxAmount = invoice.tax_amount || ((servicePrice || 0) * 0.18);
    const totalWithTax = invoice.total_amount;

    return (
        <div className="container mx-auto p-6">
            {/* Header - Hide when printing */}
            <div className="print:hidden mb-6">
                <div className="flex items-center gap-5 mb-6">
                    <div onClick={() => router.back()}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mb-4 cursor-pointer text-primary rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </div>
                    {/* Breadcrumb Navigation */}
                    <ul className="flex space-x-2 rtl:space-x-reverse mb-4">
                        <li>
                            <Link href="/" className="text-primary hover:underline">
                                {t('home') || 'Home'}
                            </Link>
                        </li>
                        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                            <Link href="/invoices" className="text-primary hover:underline">
                                {t('invoices') || 'Invoices'}
                            </Link>
                        </li>
                        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                            <span>{t('invoice_preview') || 'Invoice Preview'}</span>
                        </li>
                    </ul>
                </div>

                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">{t('invoice_preview') || 'Invoice Preview'}</h1>
                        <p className="text-gray-500">{t('view_invoice_details') || 'View invoice details'}</p>
                    </div>
                    <div className="flex gap-3">
 
                        <button
                            type="button"
                            className="btn btn-primary gap-2"
                            onClick={handleDownloadPDF}
                            disabled={downloadingPDF}
                        >
                            <IconPdf className="h-5 w-5" />
                            {downloadingPDF ? (t('downloading') || 'Downloading...') : (t('download_pdf') || 'Download PDF')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Invoice Content */}
            <div className="space-y-6">
                {/* Invoice Header */}
                <div className="panel">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h2 className="text-xl font-bold text-primary mb-4">{t('invoice_information') || 'Invoice Information'}</h2>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">{t('invoice_number') || 'Invoice Number'}:</span>
                                    <span className="font-medium">#{invoice.invoice_number}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">{t('invoice_type') || 'Invoice Type'}:</span>
                                    <span className="badge badge-outline-info">{getInvoiceTypeLabel(invoiceType)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">{t('status') || 'Status'}:</span>
                                    <span className={`badge ${
                                        invoice.status === 'paid' ? 'badge-outline-success' :
                                        invoice.status === 'overdue' ? 'badge-outline-danger' :
                                        'badge-outline-warning'
                                    }`}>
                                        {invoice.status?.toUpperCase()}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">{t('created_at') || 'Created At'}:</span>
                                    <span className="font-medium">
                                        {new Date(invoice.invoice_date || invoice.created_at).toLocaleDateString('en-GB', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                        })}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">{t('due_date') || 'Due Date'}:</span>
                                    <span className="font-medium">
                                        {new Date(invoice.due_date).toLocaleDateString('en-GB', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                        })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-xl font-bold text-primary mb-4">{t('associated_booking') || 'Associated Booking'}</h2>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">{t('booking_number') || 'Booking Number'}:</span>
                                    <span className="font-medium">{booking?.booking_number || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">{t('customer') || 'Customer'}:</span>
                                    <span className="font-medium">{invoice.customer_name || booking?.customer_name || customer?.name || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">{t('service') || 'Service'}:</span>
                                    <span className="font-medium">{serviceName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">{t('service_address') || 'Service Address'}:</span>
                                    <span className="font-medium">{booking?.service_address || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">{t('scheduled_date') || 'Scheduled Date'}:</span>
                                    <span className="font-medium">
                                        {booking?.scheduled_date ? new Date(booking.scheduled_date).toLocaleDateString('en-GB') : 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tax Invoice Details Table - Show for tax_invoice type */}
                {invoiceType === 'tax_invoice' && booking && (
                    <div className="panel">
                        <div className="mb-5 flex items-center gap-3">
                            <IconDollarSign className="w-5 h-5 text-primary" />
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('tax_invoice_details') || 'Tax Invoice Details'}</h5>
                        </div>
                        <div className="bg-transparent rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                            {/* Table Header */}
                            <div className="grid grid-cols-4 gap-4 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600">
                                <div className="text-sm font-bold text-gray-700 dark:text-white text-right">{t('item') || 'Item'}</div>
                                <div className="text-sm font-bold text-gray-700 dark:text-white text-center">{t('price') || 'Price'}</div>
                                <div className="text-sm font-bold text-gray-700 dark:text-white text-center">{t('quantity') || 'Quantity'}</div>
                                <div className="text-sm font-bold text-gray-700 dark:text-white text-center">{t('total') || 'Total'}</div>
                            </div>

                            {/* Row 1: Service Details */}
                            <div className="grid grid-cols-4 gap-4 mb-3 py-2">
                                <div className="text-sm text-gray-700 dark:text-gray-300 text-right">
                                    <div className="font-medium">{t('service') || 'Service'}</div>
                                    <div className="text-xs text-gray-500">
                                        {serviceName}
                                        {booking.service_address && ` - ${booking.service_address}`}
                                        {booking.booking_number && ` - #${booking.booking_number}`}
                                    </div>
                                    {(invoice.service_description || service?.description) && (
                                        <div className="text-xs text-gray-400 mt-1">
                                            {invoice.service_description || service?.description}
                                        </div>
                                    )}
                                </div>
                                <div className="text-center">
                                    <span className="text-sm text-gray-700 dark:text-gray-300">₪{servicePrice.toFixed(2)}</span>
                                </div>
                                <div className="text-center"><span className="text-sm text-gray-700 dark:text-gray-300">1</span></div>
                                <div className="text-center"><span className="text-sm text-gray-700 dark:text-gray-300">₪{servicePrice.toFixed(2)}</span></div>
                            </div>

                            {/* Separator */}
                            <div className="border-t border-gray-300 dark:border-gray-600 my-4"></div>

                            {/* Tax Calculations */}
                            {servicePrice && (
                                <div className="space-y-3">
                                    {/* Price Before Tax */}
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('price_before_tax') || 'Price Before Tax'}:</span>
                                        <span className="text-sm text-gray-700 dark:text-gray-300">₪{servicePrice.toFixed(2)}</span>
                                    </div>

                                    {/* Tax - calculated as 18% of the price before tax */}
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('tax') || 'Tax'} 18%:</span>
                                        <span className="text-sm text-gray-700 dark:text-gray-300">₪{taxAmount.toFixed(2)}</span>
                                    </div>

                                    {/* Total Including Tax */}
                                    <div className="flex justify-between items-center pt-2 border-t border-gray-300 dark:border-gray-600">
                                        <span className="text-lg font-bold text-gray-700 dark:text-gray-300">{t('total_including_tax') || 'Total Including Tax'}:</span>
                                        <span className="text-lg font-bold text-primary">₪{totalWithTax.toFixed(2)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Receipt Details - Multiple Payments - Show for receipt_only type */}
                {(invoiceType === 'receipt_only' || payments.length > 0) && (
                    <div className="panel">
                        <div className="mb-5 flex items-center gap-3">
                            <IconDollarSign className="w-5 h-5 text-primary" />
                            <h2 className="text-xl font-bold text-primary">{t('receipt_details') || 'Receipt Details'}</h2>
                        </div>

                        {/* Display multiple payments if they exist */}
                        {payments.length > 0 ? (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                    {t('payments') || 'Payments'} ({payments.length})
                                </h3>
                                {payments.map((payment, index) => (
                                    <div key={payment.id || index} className="p-4 rounded-lg border">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-medium text-gray-900 dark:text-white">
                                                {t('payment') || 'Payment'} #{index + 1} - {t(payment.payment_type) || payment.payment_type}
                                            </h4>
                                            <span className="font-bold text-lg text-primary">₪{new Intl.NumberFormat('he-IL').format(payment.amount || 0)}</span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {payment.payment_type === 'visa' && (
                                                <>
                                                    {payment.visa_installments && (
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('visa_installments') || 'Installments'}</label>
                                                            <p className="text-sm text-gray-900 dark:text-white">{payment.visa_installments}</p>
                                                        </div>
                                                    )}
                                                    {payment.visa_card_type && (
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('visa_card_type') || 'Card Type'}</label>
                                                            <p className="text-sm text-gray-900 dark:text-white">{payment.visa_card_type}</p>
                                                        </div>
                                                    )}
                                                    {payment.visa_last_four && (
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('visa_last_four') || 'Last 4 Digits'}</label>
                                                            <p className="text-sm text-gray-900 dark:text-white">{payment.visa_last_four}</p>
                                                        </div>
                                                    )}
                                                    {payment.approval_number && (
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('approval_number') || 'Approval Number'}</label>
                                                            <p className="text-sm text-gray-900 dark:text-white">{payment.approval_number}</p>
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {payment.payment_type === 'bank_transfer' && (
                                                <>
                                                    {payment.transfer_bank_name && (
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('bank_name') || 'Bank Name'}</label>
                                                            <p className="text-sm text-gray-900 dark:text-white">{payment.transfer_bank_name}</p>
                                                        </div>
                                                    )}
                                                    {payment.transfer_branch && (
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('bank_branch') || 'Branch'}</label>
                                                            <p className="text-sm text-gray-900 dark:text-white">{payment.transfer_branch}</p>
                                                        </div>
                                                    )}
                                                    {payment.transfer_account_number && (
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('account_number') || 'Account Number'}</label>
                                                            <p className="text-sm text-gray-900 dark:text-white">{payment.transfer_account_number}</p>
                                                        </div>
                                                    )}
                                                    {payment.transfer_number && (
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('transfer_number') || 'Transfer Number'}</label>
                                                            <p className="text-sm text-gray-900 dark:text-white">{payment.transfer_number}</p>
                                                        </div>
                                                    )}
                                                    {payment.transfer_holder_name && (
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('transfer_holder_name') || 'Holder Name'}</label>
                                                            <p className="text-sm text-gray-900 dark:text-white">{payment.transfer_holder_name}</p>
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {payment.payment_type === 'check' && (
                                                <>
                                                    {payment.check_number && (
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('check_number') || 'Check Number'}</label>
                                                            <p className="text-sm text-gray-900 dark:text-white">{payment.check_number}</p>
                                                        </div>
                                                    )}
                                                    {payment.check_bank_name && (
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('check_bank_name') || 'Bank Name'}</label>
                                                            <p className="text-sm text-gray-900 dark:text-white">{payment.check_bank_name}</p>
                                                        </div>
                                                    )}
                                                    {payment.check_holder_name && (
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('check_holder_name') || 'Holder Name'}</label>
                                                            <p className="text-sm text-gray-900 dark:text-white">{payment.check_holder_name}</p>
                                                        </div>
                                                    )}
                                                    {payment.check_branch && (
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('check_branch') || 'Branch'}</label>
                                                            <p className="text-sm text-gray-900 dark:text-white">{payment.check_branch}</p>
                                                        </div>
                                                    )}
                                                    {payment.check_account_number && (
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('check_account_number') || 'Account Number'}</label>
                                                            <p className="text-sm text-gray-900 dark:text-white">{payment.check_account_number}</p>
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {payment.payment_type === 'cash' && (
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('payment_type') || 'Payment Type'}</label>
                                                    <p className="text-sm text-gray-900 dark:text-white">{t('cash') || 'Cash'}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {/* Total Payments Summary */}
                                <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium text-gray-900 dark:text-white">{t('total_payments') || 'Total Payments'}</span>
                                        <span className="font-bold text-lg text-primary">
                                            ₪{new Intl.NumberFormat('he-IL').format(payments.reduce((sum, payment) => sum + (payment.amount || 0), 0))}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-4 text-gray-500">
                                <p>{t('no_payments_found') || 'No payments found'}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Invoice Summary */}
                <div className="panel">
                    <h2 className="text-xl font-bold text-primary mb-4">{t('invoice_summary') || 'Invoice Summary'}</h2>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-lg font-semibold">
                            <div>{t('total_amount') || 'Total Amount'}:</div>
                            <div>₪{invoice.total_amount?.toFixed(2)}</div>
                        </div>
                        <div className="flex justify-between items-center text-success">
                            <div>{t('paid_amount') || 'Paid Amount'}:</div>
                            <div>₪{invoice.paid_amount?.toFixed(2)}</div>
                        </div>
                        <div className="flex justify-between items-center text-danger font-bold text-xl">
                            <div>{t('remaining_balance') || 'Remaining Balance'}:</div>
                            <div>₪{invoice.remaining_amount?.toFixed(2)}</div>
                        </div>
                    </div>
                </div>

                {/* Notes Section */}
                {invoice.notes && (
                    <div className="panel">
                        <h2 className="text-xl font-bold text-primary mb-4">{t('notes') || 'Notes'}</h2>
                        <p className="text-gray-700 dark:text-gray-300">{invoice.notes}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InvoicePreview;