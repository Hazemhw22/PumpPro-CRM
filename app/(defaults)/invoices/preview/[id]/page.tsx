'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import IconArrowLeft from '@/components/icon/icon-arrow-left';
import IconPrinter from '@/components/icon/icon-printer';

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

interface Booking {
    id: string;
    booking_number: string;
    service_type: string;
    service_address: string;
    scheduled_date: string;
}

interface Service {
    id: string;
    name: string;
    description?: string;
}

const InvoicePreview = () => {
    const params = useParams();
    const router = useRouter();
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [booking, setBooking] = useState<Booking | null>(null);
    const [service, setService] = useState<Service | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInvoiceData = async () => {
            try {
                // Fetch invoice
                // @ts-ignore
                const { data: invoiceData, error: invoiceError } = await supabase
                    .from('invoices')
                    .select('*')
                    .eq('id', params?.id)
                    .single();

                if (invoiceError) throw invoiceError;
                setInvoice(invoiceData as any);

                // Fetch customer
                // @ts-ignore
                if (invoiceData?.customer_id) {
                    // @ts-ignore
                    const { data: customerData } = await supabase
                        .from('customers')
                        .select('*')
                        // @ts-ignore
                        .eq('id', invoiceData.customer_id)
                        .single();
                    
                    if (customerData) setCustomer(customerData as any);
                }

                // Fetch booking
                // @ts-ignore
                if (invoiceData?.booking_id) {
                    // @ts-ignore
                    const { data: bookingData } = await supabase
                        .from('bookings')
                        .select('*')
                        // @ts-ignore
                        .eq('id', invoiceData.booking_id)
                        .single();
                    
                    if (bookingData) {
                        setBooking(bookingData as any);

                        // Fetch service
                        // @ts-ignore
                        const { data: serviceData } = await supabase
                            .from('services')
                            .select('*')
                            // @ts-ignore
                            .eq('id', bookingData.service_type)
                            .single();
                        
                        if (serviceData) setService(serviceData as any);
                    }
                }
            } catch (error) {
                console.error('Error fetching invoice:', error);
            } finally {
                setLoading(false);
            }
        };

        if (params?.id) {
            fetchInvoiceData();
        }
    }, [params?.id]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!invoice) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Invoice Not Found</h2>
                    <button onClick={() => router.back()} className="btn btn-primary">
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Print Buttons - Hidden when printing */}
            <div className="mb-5 flex items-center justify-between print:hidden">
                <button onClick={() => router.back()} className="btn btn-outline-dark">
                    <IconArrowLeft className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                    Back
                </button>
                <button onClick={handlePrint} className="btn btn-primary">
                    <IconPrinter className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                    Print Invoice
                </button>
            </div>

            {/* Invoice Content */}
            <div className="panel">
                <div className="flex flex-wrap justify-between gap-4 px-4">
                    <div className="text-2xl font-semibold uppercase">Invoice</div>
                    <div className="shrink-0">
                        <img src="/assets/images/logo.svg" alt="Logo" className="w-14 ltr:ml-auto rtl:mr-auto" />
                    </div>
                </div>

                <hr className="my-6 border-[#e0e6ed] dark:border-[#1b2e4b]" />

                <div className="flex flex-col lg:flex-row justify-between gap-6 flex-wrap">
                    {/* Company Info */}
                    <div className="flex-1">
                        <div className="space-y-1 text-white-dark">
                            <div className="text-lg font-semibold text-black dark:text-white">PumpPro CRM</div>
                            <div>Water Tank Cleaning Services</div>
                            <div>Phone: +962 123456789</div>
                            <div>Email: info@pumppro.com</div>
                        </div>
                    </div>

                    {/* Customer Info */}
                    <div className="flex-1">
                        <div className="text-lg font-semibold text-black dark:text-white mb-2">Bill To:</div>
                        <div className="space-y-1 text-white-dark">
                            <div className="font-semibold text-black dark:text-white">
                                {customer?.type === 'business' ? customer?.business_name : customer?.name}
                            </div>
                            {customer?.address && <div>{customer.address}</div>}
                            <div>Phone: {customer?.phone}</div>
                            {customer?.email && <div>Email: {customer.email}</div>}
                        </div>
                    </div>

                    {/* Invoice Details */}
                    <div className="flex-1">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="font-semibold text-black dark:text-white">Invoice Number:</div>
                                <div className="text-primary">#{invoice.invoice_number}</div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="font-semibold text-black dark:text-white">Issue Date:</div>
                                <div>{new Date(invoice.created_at).toLocaleDateString('en-GB')}</div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="font-semibold text-black dark:text-white">Due Date:</div>
                                <div>{new Date(invoice.due_date).toLocaleDateString('en-GB')}</div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="font-semibold text-black dark:text-white">Status:</div>
                                <span className={`badge ${
                                    invoice.status === 'paid' ? 'badge-outline-success' :
                                    invoice.status === 'overdue' ? 'badge-outline-danger' :
                                    'badge-outline-warning'
                                }`}>
                                    {invoice.status?.toUpperCase()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <hr className="my-6 border-[#e0e6ed] dark:border-[#1b2e4b]" />

                {/* Service Details */}
                {booking && (
                    <div className="mb-6">
                        <div className="text-lg font-semibold text-black dark:text-white mb-3">Service Details:</div>
                        <div className="space-y-2 text-white-dark">
                            <div className="flex gap-2">
                                <span className="font-semibold">Booking Number:</span>
                                <span>{booking.booking_number}</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="font-semibold">Service:</span>
                                <span>{service?.name || booking.service_type}</span>
                            </div>
                            {service?.description && (
                                <div className="flex gap-2">
                                    <span className="font-semibold">Description:</span>
                                    <span>{service.description}</span>
                                </div>
                            )}
                            <div className="flex gap-2">
                                <span className="font-semibold">Service Address:</span>
                                <span>{booking.service_address}</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="font-semibold">Service Date:</span>
                                <span>{new Date(booking.scheduled_date).toLocaleDateString('en-GB')}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Invoice Items Table */}
                <div className="table-responsive">
                    <table className="table-striped">
                        <thead>
                            <tr>
                                <th>Description</th>
                                <th className="text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>{service?.name || 'Water Tank Cleaning Service'}</td>
                                <td className="text-right">${invoice.total_amount?.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <hr className="my-6 border-[#e0e6ed] dark:border-[#1b2e4b]" />

                {/* Totals */}
                <div className="grid sm:grid-cols-2 gap-6">
                    <div></div>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-lg font-semibold">
                            <div>Total Amount:</div>
                            <div>${invoice.total_amount?.toFixed(2)}</div>
                        </div>
                        <div className="flex justify-between items-center text-success">
                            <div>Paid Amount:</div>
                            <div>${invoice.paid_amount?.toFixed(2)}</div>
                        </div>
                        <div className="flex justify-between items-center text-danger font-bold text-xl">
                            <div>Remaining Balance:</div>
                            <div>${invoice.remaining_amount?.toFixed(2)}</div>
                        </div>
                    </div>
                </div>

                <hr className="my-6 border-[#e0e6ed] dark:border-[#1b2e4b]" />

                {/* Footer */}
                <div className="text-center text-sm text-white-dark">
                    <p>Thank you for your business!</p>
                    <p className="mt-2">For any questions, please contact us at info@pumppro.com</p>
                </div>
            </div>
        </div>
    );
};

export default InvoicePreview;
