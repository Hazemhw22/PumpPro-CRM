'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import IconArrowLeft from '@/components/icon/icon-arrow-left';
import IconEdit from '@/components/icon/icon-edit';
import IconUser from '@/components/icon/icon-user';
import IconMapPin from '@/components/icon/icon-map-pin';
import IconPhone from '@/components/icon/icon-phone';
import IconPdf from '@/components/icon/icon-pdf';
import IconCalendar from '@/components/icon/icon-calendar';
import IconClock from '@/components/icon/icon-clock';
import IconClipboardText from '@/components/icon/icon-clipboard-text';
import IconCreditCard from '@/components/icon/icon-credit-card';
import IconEye from '@/components/icon/icon-eye';
import IconDollarSign from '@/components/icon/icon-dollar-sign';
import { InvoiceDealPDFGenerator } from '@/components/pdf/invoice-deal-pdf';
import ProviderPdfButton from '@/components/pdf/provider-pdf-button';
import { supabase } from '@/lib/supabase/client';
import { getTranslation } from '@/i18n';
import Link from 'next/link';
import { Tab } from '@headlessui/react';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import MethodsSelect from '@/components/selectors/MethodsSelect';
import TruckSelect from '@/components/truck-select/truck-select';
import DriverSelect from '@/components/driver-select/driver-select';
import ContractorSelect from '@/components/contractor-select/contractor-select';
import AssignmentModeSelectAdd from '@/components/assignment-mode-select/assignment-mode-select-add';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Booking {
    id: string;
    created_at: string;
    booking_number: string;
    customer_type: 'private' | 'business';
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    customer_id?: string;
    service_address: string;
    scheduled_date: string;
    scheduled_time: string;
    status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'awaiting_execution';
    service_type: string;
    price?: number;
    profit?: number;
    payment_status?: string;
    truck_id?: string;
    driver_id?: string;
    truck?: { truck_number?: string };
    driver?: { name?: string };
    contractor_id?: string | null;
    contractor?: { id?: string; name?: string } | null;
    contractor_price?: number | null;
    contractor_name?: string | null;
    notes?: string;
}

interface Invoice {
    id: string;
    invoice_number: string;
    booking_id: string;
    total_amount: number;
    paid_amount: number;
    remaining_amount: number;
    status: string;
    due_date: string;
    created_at: string;
    customer_name?: string | null;
    subtotal_amount?: number | null;
}

interface InvoiceDeal {
    id: string;
    invoice_number: string;
    booking_id: string | null;
    total_amount: number;
    paid_amount: number;
    remaining_amount: number;
    status: string;
    pdf_url?: string | null;
    created_at: string;
    metadata?: any;
}

interface Payment {
    id: string;
    invoice_id: string;
    booking_id: string;
    amount: number;
    payment_method: string;
    transaction_id?: string;
    notes?: string;
    payment_date: string;
    invoices?: {
        customers?: {
            name?: string | null;
        } | null;
    } | null;
}

interface BookingTrack {
    id: string;
    booking_id: string;
    old_status?: string;
    new_status?: string;
    notes?: string | null;
    created_at?: string;
}

type ContractorOption = {
    id: string;
    name?: string | null;
};

const BookingPreview = () => {
    const { t } = getTranslation();
    const params = useParams();
    const router = useRouter();
    const [booking, setBooking] = useState<Booking | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [invoiceDeals, setInvoiceDeals] = useState<InvoiceDeal[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [bookingServices, setBookingServices] = useState<
        {
            id?: string;
            name: string;
            service_id?: string | null;
            description?: string | null;
            quantity: number;
            unit_price: number;
            total: number;
            created_at?: string | null;
            scheduled_date?: string | null;
            scheduled_time?: string | null;
        }[]
    >([]);
    const [bookingTracks, setBookingTracks] = useState<BookingTrack[]>([]);
    const [selectedContractor, setSelectedContractor] = useState<ContractorOption | null>(null);
    const [assignMode, setAssignMode] = useState<'driver' | 'contractor'>('driver');
    const [selectedTruckAssign, setSelectedTruckAssign] = useState<{ id: string; truck_number?: string } | null>(null);
    const [selectedDriverAssign, setSelectedDriverAssign] = useState<{ id: string; name?: string } | null>(null);
    const [selectedContractorAssign, setSelectedContractorAssign] = useState<ContractorOption | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [currentDriverId, setCurrentDriverId] = useState<string | null>(null);
    const [currentContractorId, setCurrentContractorId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [creatingInvoice, setCreatingInvoice] = useState(false);
    const [creatingInvoiceDeal, setCreatingInvoiceDeal] = useState(false);
    const [generatingConfirmation, setGeneratingConfirmation] = useState<string | null>(null);
    const [contractorPaid, setContractorPaid] = useState<number>(0);
    const [contractorPriceAssign, setContractorPriceAssign] = useState<string>('');
    const [assigningContractor, setAssigningContractor] = useState(false);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' }>({
        visible: false,
        message: '',
        type: 'success',
    });
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentForm, setPaymentForm] = useState({
        amount: '',
        payment_method: 'cash' as 'cash' | 'credit_card' | 'bank_transfer' | 'check',
        transaction_id: '',
        notes: '',
    });

    const wantsContractorAssignment = assignMode === 'contractor' && Boolean(selectedContractorAssign);
    const contractorPriceInvalid = wantsContractorAssignment && (!contractorPriceAssign || Number(contractorPriceAssign) <= 0);

    // determine current user's role and linked driver/contractor id so we can
    // show Confirm only to the assigned driver/contractor (admin shouldn't confirm)
    useEffect(() => {
        const loadCurrentUser = async () => {
            try {
                // @ts-ignore
                const {
                    data: { user },
                } = await supabase.auth.getUser();
                if (!user) return;
                // @ts-ignore
                const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
                const r = (profile as any)?.role || null;
                setRole(r);

                if (r === 'contractor') {
                    // try to find contractor by user_id or email
                    // @ts-ignore
                    const { data: c } = await supabase.from('contractors').select('id').eq('user_id', user.id).maybeSingle();
                    if (c && (c as any).id) {
                        setCurrentContractorId((c as any).id);
                    } else if ((user as any).email) {
                        // fallback by email
                        // @ts-ignore
                        const { data: c2 } = await supabase
                            .from('contractors')
                            .select('id')
                            .eq('email', (user as any).email)
                            .maybeSingle();
                        setCurrentContractorId((c2 as any)?.id || null);
                    }
                } else if (r === 'driver') {
                    // try to find driver by user_id or email
                    // @ts-ignore
                    const { data: d } = await supabase.from('drivers').select('id').eq('user_id', user.id).maybeSingle();
                    if (d && (d as any).id) {
                        setCurrentDriverId((d as any).id);
                    } else if ((user as any).email) {
                        // fallback by email
                        // @ts-ignore
                        const { data: d2 } = await supabase
                            .from('drivers')
                            .select('id')
                            .eq('email', (user as any).email)
                            .maybeSingle();
                        setCurrentDriverId((d2 as any)?.id || null);
                    }
                }
            } catch (e) {
                console.warn('Could not resolve current user role or ids', e);
            }
        };
        loadCurrentUser();
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch booking
                const { data: bookingData, error: bookingError } = await supabase.from('bookings').select('*').eq('id', params?.id).single();

                if (bookingError) throw bookingError;

                // Fetch related data
                const booking = bookingData as any;
                const [truckRes, driverRes, serviceRes] = await Promise.all([
                    booking.truck_id ? supabase.from('trucks').select('truck_number, license_plate').eq('id', booking.truck_id).single() : { data: null },
                    booking.driver_id ? supabase.from('drivers').select('name, driver_number').eq('id', booking.driver_id).single() : { data: null },
                    booking.service_type ? supabase.from('services').select('name, price_private, price_business, description').eq('id', booking.service_type).single() : { data: null },
                ]);

                const serviceRecord = serviceRes.data as any;

                // Fetch all booking services (main + extras) and resolve names & prices
                // we'll compute a servicesTotal and prefer it as the booking price when available
                let servicesTotal = 0;
                let detailedServices: any[] = [];
                try {
                    const { data: bookingServicesData, error: bookingServicesError } = await supabase
                        .from('booking_services')
                        .select('id, service_id, quantity, unit_price, total_price, created_at')
                        .eq('booking_id', params?.id);

                    if (!bookingServicesError && bookingServicesData && bookingServicesData.length > 0) {
                        const rows = bookingServicesData as any[];
                        const uniqueServiceIds = Array.from(new Set(rows.map((r) => r.service_id).filter(Boolean)));

                        let servicesMap = new Map<string, any>();
                        if (uniqueServiceIds.length > 0) {
                            const { data: svcList, error: svcError } = await supabase
                                .from('services')
                                .select('id, name, price_private, price_business, description')
                                .in('id', uniqueServiceIds as any);

                            if (!svcError && svcList) {
                                servicesMap = new Map<string, any>((svcList as any[]).map((s) => [s.id, s]));
                            }
                        }

                        const customerType = (booking as any).customer_type || 'private';

                        detailedServices = rows.map((r: any) => {
                            const svc = servicesMap.get(r.service_id) as any | undefined;
                            const resolvedName = (svc && svc.name) || (r.service_id === booking.service_type ? serviceRecord?.name : null);

                            let unitPrice: number = typeof r.unit_price === 'number' ? r.unit_price : 0;
                            if (!unitPrice && svc) {
                                unitPrice = customerType === 'business' ? (svc.price_business as number) : (svc.price_private as number);
                            }
                            if (!unitPrice && serviceRecord && r.service_id === booking.service_type) {
                                unitPrice = customerType === 'business' ? (serviceRecord.price_business as number) : (serviceRecord.price_private as number);
                            }

                            const quantity = r.quantity || 1;
                            const total = (unitPrice || 0) * quantity;

                            return {
                                id: r.id,
                                name: resolvedName || r.service_name || booking.service_type || '-',
                                service_id: r.service_id,
                                description: (svc && svc.description) || (serviceRecord && r.service_id === booking.service_type ? serviceRecord.description : null) || r.description || null,
                                quantity,
                                unit_price: unitPrice || 0,
                                total,
                                created_at: r.created_at || null,
                                scheduled_date: r.scheduled_date || null,
                                scheduled_time: r.scheduled_time || null,
                            };
                        });

                        // compute total for all booking services
                        servicesTotal = detailedServices.reduce((sum, it) => sum + (it.total || 0), 0);

                        setBookingServices(detailedServices);
                    } else {
                        setBookingServices([]);
                    }
                } catch (e) {
                    console.error('Error loading booking_services for preview:', e);
                    setBookingServices([]);
                }

                // Fetch invoices for this booking
                const { data: invoicesData, error: invoicesError } = await supabase.from('invoices').select('*').eq('booking_id', params?.id).order('created_at', { ascending: false });

                // Fetch payments for this booking
                const { data: paymentsData, error: paymentsError } = await supabase.from('payments').select('*').eq('booking_id', params?.id).order('payment_date', { ascending: false });

                // Fetch invoice deals for this booking
                const { data: invoiceDealsData, error: invoiceDealsError } = await supabase.from('invoice_deals').select('*').eq('booking_id', params?.id).order('created_at', { ascending: false });

                // Fetch booking tracks (status change history) - newest first
                const { data: tracksData, error: tracksError } = await supabase.from('booking_tracks').select('*').eq('booking_id', params?.id).order('created_at', { ascending: false });

                // Combine data
                const enrichedBooking: any = {
                    ...booking,
                    truck: truckRes.data,
                    driver: driverRes.data,
                    service_name: serviceRecord?.name,
                    booking_services: detailedServices && detailedServices.length > 0 ? detailedServices : undefined,
                };

                // If booking has booking_services rows, prefer their summed total as the booking price.
                // Otherwise, if booking has no explicit price, derive it from the main service pricing.
                if (servicesTotal && servicesTotal > 0) {
                    enrichedBooking.price = servicesTotal;
                } else if (!enrichedBooking.price && serviceRecord) {
                    const customerType = enrichedBooking.customer_type || 'private';
                    const basePrice = customerType === 'business' ? serviceRecord.price_business : serviceRecord.price_private;
                    enrichedBooking.price = basePrice || 0;
                }

                // attach contractor helper if contractor_id present
                if ((enrichedBooking as any).contractor_id) {
                    enrichedBooking.contractor = { id: (enrichedBooking as any).contractor_id, name: (enrichedBooking as any).contractor_name || '' };
                }

                setBooking(enrichedBooking as any);
                setSelectedContractor(enrichedBooking.contractor || null);
                setSelectedContractorAssign(enrichedBooking.contractor || null);
                setContractorPriceAssign(typeof enrichedBooking.contractor_price === 'number' && !Number.isNaN(enrichedBooking.contractor_price) ? String(enrichedBooking.contractor_price) : '');

                setContractorPaid(0);
                if (!invoicesError && invoicesData) {
                    setInvoices(invoicesData as any);
                }
                if (!paymentsError && paymentsData) {
                    setPayments(paymentsData as any);
                }
                if (!invoiceDealsError && invoiceDealsData) {
                    setInvoiceDeals(invoiceDealsData as any);
                }
                if (!tracksError && tracksData) {
                    setBookingTracks(tracksData as any);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        if (params?.id) {
            fetchData();
        }
    }, [params?.id]);

    const handleCreateInvoice = async () => {
        if (!booking || creatingInvoice) return;
        try {
            setCreatingInvoice(true);
            const { data: existingInvoice } = await supabase.from('invoices').select('*').eq('booking_id', booking.id).maybeSingle();
            if (existingInvoice) {
                setAlert({ visible: true, message: 'Invoice already exists for this booking.', type: 'info' });
                setCreatingInvoice(false);
                return;
            }
            const invoiceData = await createInvoiceForBooking(booking as any);

            // Try full insert with extended fields first
            // @ts-ignore
            const fullResult = await supabase
                .from('invoices')
                .insert([invoiceData] as any)
                .select()
                .single();

            let newInvoice: any = fullResult.data;
            if (fullResult.error) {
                console.warn('Full invoice insert failed from booking preview, trying basic fields only:', fullResult.error);

                const basicInvoiceData = {
                    invoice_number: invoiceData.invoice_number,
                    booking_id: invoiceData.booking_id,
                    customer_id: invoiceData.customer_id,
                    total_amount: invoiceData.total_amount,
                    paid_amount: invoiceData.paid_amount,
                    remaining_amount: invoiceData.remaining_amount,
                    status: invoiceData.status,
                    due_date: invoiceData.due_date,
                };

                const basicResult = await supabase
                    .from('invoices')
                    .insert([basicInvoiceData] as any)
                    .select()
                    .single();

                if (basicResult.error) throw basicResult.error;
                newInvoice = basicResult.data;
            }

            setAlert({ visible: true, message: 'Invoice DEAL created successfully', type: 'success' });
            setInvoices((prev) => (newInvoice ? [newInvoice as any, ...prev] : prev));
            router.push('/app/(defaults)/bookings/preview/' + booking.id + '?tab=accounting');
        } catch (err) {
            console.error('Error creating invoice:', err);
            setAlert({ visible: true, message: 'Error creating Invoice DEAL', type: 'danger' });
        } finally {
            setCreatingInvoice(false);
        }
    };

    const getServicesDisplay = () => {
        if (bookingServices && bookingServices.length > 0) {
            return bookingServices.map((s) => `${s.name}${s.quantity && s.quantity !== 1 ? ` x${s.quantity}` : ''}`).join(', ');
        }
        if (booking) {
            return (booking as any).service_name || booking.service_type || '-';
        }
        return '-';
    };
    const getServicesTotal = () => {
        if (!bookingServices || bookingServices.length === 0) return 0;
        return bookingServices.reduce((sum, s) => sum + (s.total || 0), 0);
    };
    const handleCreateInvoiceDeal = async () => {
        if (!booking || creatingInvoiceDeal) return;
        try {
            setCreatingInvoiceDeal(true);

            const res = await fetch('/api/invoice-deals/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ booking_id: booking.id }),
            });

            const body = await res.json();
            if (!res.ok) {
                console.error('Invoice DEAL creation failed', body);
                setAlert({ visible: true, message: (body && body.message) || 'Failed to create Invoice DEAL', type: 'danger' });
                return;
            }

            const invoiceDeal = (body && body.invoice_deal) || null;
            if (invoiceDeal) {
                // mark booking locally as locked
                setBooking((prev) => (prev ? ({ ...prev, invoice_deal_id: invoiceDeal.id } as any) : prev));
                setAlert({ visible: true, message: 'Invoice DEAL created', type: 'success' });
                // open PDF if available
                try {
                    // Prefer generating a client-side invoice-deal PDF that includes booking services/prices
                    try {
                        await handleOpenInvoiceDeal(invoiceDeal);
                    } catch (genErr) {
                        // fallback to stored pdf_url if generation fails
                        if (invoiceDeal.pdf_url) window.open(invoiceDeal.pdf_url, '_blank');
                        else throw genErr;
                    }
                } catch (e) {
                    // ignore popup blockers
                }
            } else {
                setAlert({ visible: true, message: 'Invoice DEAL created (no details returned)', type: 'success' });
            }
        } catch (err) {
            console.error('Error creating Invoice DEAL:', err);
            setAlert({ visible: true, message: 'Error creating Invoice DEAL', type: 'danger' });
        } finally {
            setCreatingInvoiceDeal(false);
        }
    };

    const handleOpenConfirmation = async (deal: any) => {
        if (!booking || !deal) return;
        try {
            const data: any = {
                invoice: deal,
                booking: booking,
                booking_services: bookingServices || [],
                services: bookingServices || [],
                contractor: (booking as any).contractor || null,
                driver: (booking as any).driver || null,
                customer: {
                    name: booking.customer_name,
                    phone: booking.customer_phone,
                    address: booking.service_address,
                    business_name: booking.customer_name,
                },
                service: { name: (booking as any).service_name || booking.service_type },
                lang: 'en',
                no_price: true,
                companyInfo: { logo_url: '/.favicon.png' },
            };

            await InvoiceDealPDFGenerator.generatePDF(data, `confirmation-${deal.invoice_number || deal.id}.pdf`, 'invoice');
        } catch (e) {
            console.error('Error generating/opening confirmation PDF:', e);
            window.alert('Failed to generate Confirmation PDF');
        }
    };

    const handleGenerateConfirmationPdf = async (invoiceId: string) => {
        if (!booking) return;
        try {
            setGeneratingConfirmation(invoiceId);

            const inv = invoices.find((i) => i.id === invoiceId);
            if (!inv) throw new Error('Invoice not found');

            const data: any = {
                invoice: inv,
                booking: booking,
                booking_services: bookingServices || [],
                services: bookingServices || [],
                contractor: (booking as any).contractor || null,
                driver: (booking as any).driver || null,
                customer: {
                    name: booking.customer_name,
                    phone: booking.customer_phone,
                    address: booking.service_address,
                    business_name: booking.customer_name,
                },
                service: { name: (booking as any).service_name || booking.service_type },
                lang: 'en',
                no_price: true,
                companyInfo: { logo_url: '/.favicon.png' },
            };

            await InvoiceDealPDFGenerator.generatePDF(data, `confirmation-${inv.invoice_number || inv.id}.pdf`, 'invoice');
        } catch (e: any) {
            console.error('Error generating confirmation PDF:', e);
            window.alert(e?.message || 'Failed to generate confirmation PDF');
        } finally {
            setGeneratingConfirmation(null);
        }
    };

    // Helpers to identify deal types (some records store type on root or inside metadata)
    const isInvoiceDealType = (deal: any) => {
        if (!deal) return false;
        if ((deal as any).type === 'invoice_deal') return true;
        if (deal.metadata && (deal.metadata as any).type === 'invoice_deal') return true;
        return false;
    };

    const isConfirmationType = (deal: any) => {
        if (!deal) return false;
        if ((deal as any).type === 'confirmation') return true;
        if (deal.metadata && (deal.metadata as any).type === 'confirmation') return true;
        return false;
    };

    const handleOpenInvoiceDeal = async (deal: any) => {
        if (!booking || !deal) return;
        try {
            // Build data payload for invoice-deal PDF generator, include prices
            const data: any = {
                invoice: deal,
                booking: booking,
                booking_services: bookingServices || [],
                services: bookingServices || [],
                contractor: (booking as any).contractor || null,
                driver: (booking as any).driver || null,
                customer: {
                    name: booking.customer_name,
                    phone: booking.customer_phone,
                    address: booking.service_address,
                    business_name: booking.customer_name,
                },
                service: { name: (booking as any).service_name || booking.service_type },
                lang: 'en',
                no_price: false,
                companyInfo: { logo_url: '/favicon.png' },
            };

            await InvoiceDealPDFGenerator.generatePDF(data, `invoice-deal-${deal.invoice_number || deal.id}.pdf`, 'invoice');
        } catch (e) {
            console.error('Error generating/opening invoice-deal PDF:', e);
            window.alert('Failed to generate Invoice Deal PDF');
        }
    };

    // Request a generated PDF blob for a deal from the server (same payload used by InvoiceDealPDFGenerator)
    const fetchInvoiceDealPdfBlob = async (deal: any) => {
        if (!booking || !deal) throw new Error('Missing booking or deal');
        const data: any = {
            invoice: deal,
            booking: booking,
            booking_services: bookingServices || [],
            services: bookingServices || [],
            contractor: (booking as any).contractor || null,
            driver: (booking as any).driver || null,
            customer: {
                name: booking.customer_name,
                phone: booking.customer_phone,
                address: booking.service_address,
                business_name: booking.customer_name,
            },
            service: { name: (booking as any).service_name || booking.service_type },
            lang: 'en',
            no_price: false,
            companyInfo: { logo_url: '/favicon.png' },
        };

        const pdfData: any = {
            invoice: data.invoice || {
                id: data?.invoice_id || '',
                invoice_number: data?.invoice_number || '',
                total_amount: Number(data?.total_amount || data?.amount || 0),
                paid_amount: Number(data?.paid_amount || data?.amount || 0),
                remaining_amount: Number(data?.remaining_amount || 0),
                status: String(data?.status || 'pending'),
                created_at: String(data?.created_at || data?.date || new Date().toISOString()),
            },
            booking: data.booking || {},
            contractor: data.contractor || null,
            customer: data.customer || null,
            service: data.service || null,
            doc_type: 'invoice',
            companyInfo: data.companyInfo || {},
            lang: data.lang || 'en',
            payment_method: data.payment_method || null,
            payment_type: data.payment_type || null,
            no_price: data.no_price || false,
        };

        const res = await fetch('/api/generate-contract-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pdfData, docType: 'invoice', filename: `invoice-deal-${deal.invoice_number || deal.id}.pdf` }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err?.error || 'Failed to generate PDF');
        }

        return await res.blob();
    };

    const openBlobAndPrint = (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;
        document.body.appendChild(iframe);
        iframe.onload = () => {
            try {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
            } catch (e) {
                console.error('Print failed', e);
            }
            setTimeout(() => {
                document.body.removeChild(iframe);
                window.URL.revokeObjectURL(url);
            }, 5000);
        };
    };

    // dedicated fetch for booking tracks so we can re-use after inserts/updates
    const fetchBookingTracks = async () => {
        if (!params?.id) return;
        try {
            const { data, error } = await supabase.from('booking_tracks').select('*').eq('booking_id', params?.id).order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching booking tracks:', error);
                return;
            }
            setBookingTracks((data as any) || []);
        } catch (err) {
            console.error('Error fetching booking tracks:', err);
        }
    };

    // real-time subscription so new tracks appear immediately for this booking
    useEffect(() => {
        if (!params?.id) return;

        try {
            const channelName = `booking_tracks_${params.id}`;
            const channel = supabase
                .channel(channelName)
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'booking_tracks', filter: `booking_id=eq.${params.id}` }, (payload) => {
                    try {
                        const newRow = (payload as any).new as BookingTrack;
                        setBookingTracks((prev) => [newRow, ...(prev || [])]);
                    } catch (e) {
                        console.error('Error handling realtime payload for booking_tracks:', e);
                    }
                })
                .subscribe();

            return () => {
                try {
                    supabase.removeChannel(channel);
                } catch (e) {
                    // best-effort cleanup
                    console.warn('Could not remove realtime channel', e);
                }
            };
        } catch (e) {
            console.warn('Realtime subscription not available:', e);
        }
    }, [params?.id]);

    useEffect(() => {
        if (booking?.price) {
            setPaymentForm((prev) => ({
                ...prev,
                amount: String(booking.price),
            }));
        }
    }, [booking?.price]);

    useEffect(() => {
        if (!booking) return;
        setContractorPriceAssign(typeof booking.contractor_price === 'number' && !Number.isNaN(booking.contractor_price) ? String(booking.contractor_price) : '');
    }, [booking]);

    // selected status for editing
    const [selectedStatus, setSelectedStatus] = useState<string>('');

    useEffect(() => {
        if (booking?.status) setSelectedStatus(booking.status);
    }, [booking?.status]);

    const handleUpdateStatus = async () => {
        if (!booking) return;
        if (!selectedStatus || selectedStatus === booking.status) return;

        try {
            // Map legacy/ui-only status values to DB enum values
            const statusToSave = selectedStatus === 'pending' ? 'request' : selectedStatus;

            // Update booking status
            const { error: updateError } = await (supabase.from('bookings').update as any)({ status: statusToSave }).eq('id', booking.id);

            if (updateError) throw updateError;

            // Insert a booking track entry
            const { data: insertedTrack, error: insertTrackError } = await supabase
                .from('booking_tracks')
                .insert([
                    {
                        booking_id: booking.id,
                        old_status: booking.status,
                        new_status: statusToSave,
                        created_at: new Date().toISOString(),
                    },
                ] as any)
                .select()
                .maybeSingle();

            if (insertTrackError) {
                // Surface the error so devs/users can see why insert failed (likely missing table / RLS)
                console.error('Could not insert booking track:', insertTrackError);
                try {
                    const msg = (insertTrackError as any)?.message || JSON.stringify(insertTrackError);
                    setAlert({ visible: true, message: 'Could not record booking track: ' + msg, type: 'danger' });
                } catch (e) {
                    // ignore failures
                }
            }

            // Update local booking status first
            setBooking((prev) => (prev ? ({ ...prev, status: selectedStatus } as any) : prev));

            // Re-fetch tracks from server to ensure persisted records are shown (prevents disappearing when page reloads)
            try {
                await fetchBookingTracks();
            } catch (e) {
                // fallback: still append a local track so user sees immediate feedback
                setBookingTracks((prev) => [
                    ...prev,
                    { id: Date.now().toString(), booking_id: booking.id, old_status: booking.status, new_status: selectedStatus, created_at: new Date().toISOString() },
                ]);
            }

            setAlert({ visible: true, message: 'Status updated', type: 'success' });
        } catch (err) {
            console.error('Error updating status:', err);
            setAlert({ visible: true, message: 'Error updating status', type: 'danger' });
        }
    };

    const handleContractorAssign = async (contractor: ContractorOption | null) => {
        if (!booking) return;

        if (!contractor) {
            try {
                setAssigningContractor(true);
                const { error } = await (supabase.from('bookings') as any).update({ contractor_id: null, contractor_name: null, contractor_price: null }).eq('id', booking.id);
                if (error) throw error;
                setBooking((prev) => (prev ? ({ ...prev, contractor_id: null, contractor: null, contractor_price: null } as any) : prev));
                setSelectedContractor(null);
                setSelectedContractorAssign(null);
                setContractorPriceAssign('');
                setAlert({ visible: true, message: 'Contractor removed', type: 'success' });
            } catch (err) {
                console.error('Error removing contractor:', err);
                setAlert({ visible: true, message: 'Could not remove contractor', type: 'danger' });
            } finally {
                setAssigningContractor(false);
            }
            return;
        }

        const parsedPrice = Number(contractorPriceAssign);
        if (!parsedPrice || parsedPrice <= 0) {
            setAlert({ visible: true, message: 'Contractor price must be a positive number', type: 'danger' });
            return;
        }

        try {
            // Update booking directly: set contractor_id/name/price and move to awaiting_execution
            setAssigningContractor(true);

            const updatePayload: any = {
                contractor_id: contractor.id,
                contractor_name: contractor.name || null,
                contractor_price: parsedPrice,
                status: 'awaiting_execution',
            };

            // @ts-ignore
            const { error: updateError } = await supabase.from('bookings').update(updatePayload).eq('id', booking.id);
            if (updateError) throw updateError;

            // Insert booking track for assignment
            try {
                await supabase.from('booking_tracks').insert([
                    {
                        booking_id: booking.id,
                        old_status: booking.status,
                        new_status: 'awaiting_execution',
                        notes: `Assigned contractor ${(contractor && contractor.name) || contractor.id}`,
                        created_at: new Date().toISOString(),
                    },
                ] as any);
            } catch (e) {
                console.warn('Could not insert booking track for contractor assignment', e);
            }

            // Update local UI state (do NOT touch the contractors table/balance here)
            const contractorName = contractor.name || '';
            setBooking((prev) =>
                prev ? ({ ...prev, contractor_id: contractor.id, contractor: { id: contractor.id, name: contractorName }, status: 'awaiting_execution', contractor_price: parsedPrice } as any) : prev,
            );
            setSelectedContractor({ id: contractor.id, name: contractorName });
            setSelectedContractorAssign({ id: contractor.id, name: contractorName });
            setContractorPriceAssign(String(parsedPrice));
            setAlert({ visible: true, message: 'Contractor assigned and booking moved to Awaiting Execution', type: 'success' });
        } catch (err) {
            console.error('Error assigning contractor:', err);
            setAlert({ visible: true, message: (err as Error).message || 'Could not assign contractor', type: 'danger' });
        } finally {
            setAssigningContractor(false);
        }
    };

    const handleDriverAssign = async (driver: { id: string; name: string } | null, truckId?: string | null) => {
        if (!booking) return;
        try {
            if (driver) {
                const payload: any = { driver_id: driver.id, status: 'awaiting_execution' };
                if (truckId) payload.truck_id = truckId;
                const { error } = await (supabase.from('bookings').update as any)(payload).eq('id', booking.id);
                if (error) throw error;

                await supabase
                    .from('booking_tracks')
                    .insert([
                        { booking_id: booking.id, old_status: booking.status, new_status: 'awaiting_execution', notes: `Assigned driver ${driver.name}`, created_at: new Date().toISOString() },
                    ] as any);

                setBooking((prev) => (prev ? ({ ...prev, driver_id: driver.id, driver: { name: driver.name }, status: 'awaiting_execution', truck_id: truckId || prev?.truck_id } as any) : prev));
                setAlert({ visible: true, message: 'Driver assigned and booking moved to Awaiting Execution', type: 'success' });
            } else {
                const { error } = await (supabase.from('bookings').update as any)({ driver_id: null }).eq('id', booking.id);
                if (error) throw error;
                setBooking((prev) => (prev ? ({ ...prev, driver_id: null, driver: null } as any) : prev));
                setAlert({ visible: true, message: 'Driver removed', type: 'success' });
            }
        } catch (err) {
            console.error('Error assigning driver:', err);
            setAlert({ visible: true, message: 'Could not assign driver', type: 'danger' });
        }
    };

    const handleTruckAssign = async (truck: { id: string; truck_number?: string } | null) => {
        if (!booking) return;
        try {
            if (truck) {
                const { error } = await (supabase.from('bookings').update as any)({ truck_id: truck.id, status: 'awaiting_execution' }).eq('id', booking.id);
                if (error) throw error;

                await supabase.from('booking_tracks').insert([
                    {
                        booking_id: booking.id,
                        old_status: booking.status,
                        new_status: 'awaiting_execution',
                        notes: `Assigned truck ${truck.truck_number || truck.id}`,
                        created_at: new Date().toISOString(),
                    },
                ] as any);

                setBooking((prev) => (prev ? ({ ...prev, truck_id: truck.id, truck: { truck_number: truck.truck_number }, status: 'awaiting_execution' } as any) : prev));
                setAlert({ visible: true, message: 'Truck assigned and booking moved to Awaiting Execution', type: 'success' });
            } else {
                const { error } = await (supabase.from('bookings').update as any)({ truck_id: null }).eq('id', booking.id);
                if (error) throw error;
                setBooking((prev) => (prev ? ({ ...prev, truck_id: null, truck: null } as any) : prev));
                setAlert({ visible: true, message: 'Truck removed', type: 'success' });
            }
        } catch (err) {
            console.error('Error assigning truck:', err);
            setAlert({ visible: true, message: 'Could not assign truck', type: 'danger' });
        }
    };

    const createInvoiceForBooking = async (currentBooking: Booking) => {
        const generateInvoiceNumber = async () => {
            try {
                const { data, error } = await supabase.rpc('generate_invoice_number');
                if (error) throw error;
                return (data as any) || `INV-${Date.now()}`;
            } catch (error) {
                console.error('Error generating invoice number:', error);
                return `INV-${Date.now()}`;
            }
        };

        const rawInvoiceNumber = await generateInvoiceNumber();
        const randomSuffix = Math.random().toString(36).substring(2, 7);
        const invoiceNumber = `${rawInvoiceNumber}-${randomSuffix}`;

        const basePrice = currentBooking.price || 0;
        const subtotalAmount = basePrice;
        const totalWithTax = subtotalAmount;

        const today = new Date();
        const invoiceDate = today.toISOString().split('T')[0];
        const dueDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        return {
            invoice_number: invoiceNumber,
            booking_id: currentBooking.id,
            customer_id: currentBooking.customer_id || null,
            contractor_id: currentBooking.contractor_id || null,
            total_amount: totalWithTax,
            paid_amount: 0,
            remaining_amount: totalWithTax,
            status: 'pending',
            due_date: dueDate,
            invoice_type: 'tax_invoice',
            invoice_direction: 'negative',
            invoice_date: invoiceDate,
            customer_name: currentBooking.customer_name,
            customer_phone: currentBooking.customer_phone,
            service_name: (currentBooking as any).service_name || currentBooking.service_type,
            service_description: null,
            subtotal_amount: subtotalAmount,
            notes: currentBooking.notes || null,
            commission: currentBooking.profit ?? null,
            bill_description: (currentBooking as any).service_name || currentBooking.service_type || null,
        };
    };

    const confirmBooking = async () => {
        if (!booking) return;
        if (booking.status === 'confirmed') return;

        try {
            // Update status to confirmed
            // @ts-ignore
            const { error: updateError } = await (supabase.from('bookings') as any).update({ status: 'confirmed' }).eq('id', booking.id);
            if (updateError) throw updateError;

            // Insert booking track
            // @ts-ignore
            const { data: insertedTrack, error: insertTrackError } = await supabase
                .from('booking_tracks')
                .insert([
                    {
                        booking_id: booking.id,
                        old_status: booking.status,
                        new_status: 'confirmed',
                        created_at: new Date().toISOString(),
                    },
                ] as any)
                .select()
                .maybeSingle();

            if (insertTrackError) console.error('Could not insert booking track:', insertTrackError);

            // Generate Confirmation PDF (NO prices) when contractor confirms
            try {
                const confirmationData: any = {
                    invoice: { id: booking.id, invoice_number: booking.booking_number, total_amount: booking.price },
                    booking: booking,
                    booking_services: bookingServices || [],
                    services: bookingServices || [],
                    contractor: (booking as any).contractor || null,
                    driver: (booking as any).driver || null,
                    customer: {
                        name: booking.customer_name,
                        phone: booking.customer_phone,
                        address: booking.service_address,
                        business_name: booking.customer_name,
                    },
                    service: { name: (booking as any).service_name || booking.service_type },
                    lang: 'en',
                    no_price: true, // CONFIRMATION hides prices
                    companyInfo: { logo_url: '/.favicon.png' },
                };

                await InvoiceDealPDFGenerator.generatePDF(confirmationData, `confirmation-${booking.booking_number || booking.id}.pdf`, 'invoice');

                // Insert Confirmation record into invoice_deals table
                const confirmationRecord = {
                    invoice_number: `CONF-${booking.booking_number}`,
                    booking_id: booking.id,
                    total_amount: 0,
                    paid_amount: 0,
                    remaining_amount: 0,
                    status: 'generated',
                    pdf_url: `/api/bookings/${booking.id}/download?type=confirmation`,
                    type: 'confirmation',
                    created_at: new Date().toISOString(),
                };

                // @ts-ignore
                const { error: insertConfError } = await supabase.from('invoice_deals').insert([confirmationRecord]);
                if (insertConfError) console.warn('Could not insert confirmation record:', insertConfError);
            } catch (e) {
                console.warn('Error generating confirmation PDF on confirm:', e);
            }

            // Create or enrich invoice with full details for this booking
            // @ts-ignore
            const { data: existingInvoice, error: invoiceCheckError } = await supabase.from('invoices').select('*').eq('booking_id', booking.id).maybeSingle();
            if (invoiceCheckError) console.error('Invoice check error:', invoiceCheckError);

            if (!existingInvoice) {
                // No invoice yet -> insert one with full details
                const invoiceData = await createInvoiceForBooking(booking);

                // Try full insert with extended fields first
                // @ts-ignore
                const fullResult = await supabase
                    .from('invoices')
                    .insert([invoiceData] as any)
                    .select()
                    .single();

                let newInvoice: any = fullResult.data;
                if (fullResult.error) {
                    console.warn('Full invoice insert failed on confirm booking, trying basic fields only:', fullResult.error);

                    const basicInvoiceData = {
                        invoice_number: invoiceData.invoice_number,
                        booking_id: invoiceData.booking_id,
                        customer_id: invoiceData.customer_id,
                        total_amount: invoiceData.total_amount,
                        paid_amount: invoiceData.paid_amount,
                        remaining_amount: invoiceData.remaining_amount,
                        status: invoiceData.status,
                        due_date: invoiceData.due_date,
                    };

                    const basicResult = await supabase
                        .from('invoices')
                        .insert([basicInvoiceData] as any)
                        .select()
                        .single();

                    if (basicResult.error) {
                        console.error('Basic invoice insert also failed:', basicResult.error);
                        throw basicResult.error;
                    }
                    newInvoice = basicResult.data;
                }

                if (newInvoice) {
                    console.log('Invoice created', newInvoice.id);
                    setInvoices((prev) => (newInvoice ? [newInvoice as any, ...prev] : prev));
                }
            } else {
                // Invoice already exists -> enrich it with extended fields from the booking
                const invoiceData = await createInvoiceForBooking(booking);

                const updatePayload: any = {
                    invoice_type: invoiceData.invoice_type,
                    invoice_direction: invoiceData.invoice_direction,
                    invoice_date: invoiceData.invoice_date,
                    customer_name: invoiceData.customer_name,
                    customer_phone: invoiceData.customer_phone,
                    service_name: invoiceData.service_name,
                    service_description: invoiceData.service_description,
                    subtotal_amount: invoiceData.subtotal_amount,
                    notes: invoiceData.notes,
                    commission: invoiceData.commission,
                    bill_description: invoiceData.bill_description,
                };

                // Only set contractor_id if it was missing and booking has one
                if (!(existingInvoice as any).contractor_id && invoiceData.contractor_id) {
                    updatePayload.contractor_id = invoiceData.contractor_id;
                }

                // @ts-ignore - relax supabase typing for invoices update
                const { error: updateInvoiceError } = await (supabase as any)
                    .from('invoices')
                    .update(updatePayload)
                    .eq('id', (existingInvoice as any).id);

                if (updateInvoiceError) {
                    console.error('Invoice update error on confirm booking:', updateInvoiceError);
                } else {
                    console.log('Invoice updated with booking details', (existingInvoice as any).id);
                }
            }

            setBooking((prev) => (prev ? ({ ...prev, status: 'confirmed' } as any) : prev));
            await fetchBookingTracks();
            setAlert({ visible: true, message: 'Booking confirmed and PDFs generated', type: 'success' });

            // Refresh invoice deals to show new records
            try {
                const { data: updatedDeals } = await supabase.from('invoice_deals').select('*').eq('booking_id', booking.id).order('created_at', { ascending: false });
                if (updatedDeals) setInvoiceDeals(updatedDeals as any);
            } catch (e) {
                console.warn('Could not refresh invoice deals:', e);
            }

            // redirect assigned contractor/driver to accounting
            if ((role === 'driver' && booking.driver_id === currentDriverId) || (role === 'contractor' && booking.contractor_id === currentContractorId)) {
                router.push('/accounting');
            }
        } catch (err) {
            console.error('Error confirming booking:', err);
            setAlert({ visible: true, message: 'Error confirming booking', type: 'danger' });
        }
    };

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'request':
                return 'bg-warning/10 text-warning dark:bg-warning/20 dark:text-warning border border-warning/20';
            case 'awaiting_execution':
                return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 border border-orange-200 dark:border-orange-800';
            case 'confirmed':
                return 'bg-success/10 text-success dark:bg-success/20 dark:text-success border border-success/20';
            case 'pending':
                return 'badge-outline-warning';
            case 'in_progress':
                return 'badge-outline-primary';
            case 'completed':
                return 'badge-outline-success';
            case 'cancelled':
                return 'badge-outline-danger';
            default:
                return 'badge-outline-secondary';
        }
    };

    const getStatusLabel = (status: string) => {
        const labels: { [key: string]: string } = {
            request: 'Request',
            awaiting_execution: 'Awaiting Execution',
            confirmed: 'Confirmed',
            pending: 'Pending',
            in_progress: 'In Progress',
            completed: 'Completed',
            cancelled: 'Cancelled',
        };
        return labels[status] || status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!booking) {
        return (
            <div className="panel">
                <div className="text-center py-10">
                    <h3 className="text-lg font-semibold text-danger">{t('booking_not_found') || 'Booking not found'}</h3>
                    <Link href="/bookings" className="btn btn-primary mt-4">
                        <IconArrowLeft className="ltr:mr-2 rtl:ml-2" />
                        {t('back_to_bookings') || 'Back to Bookings'}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="container mx-auto p-6">
                {alert.visible && <Alert type={alert.type} message={alert.message} onClose={() => setAlert({ visible: false, message: '', type: 'success' })} />}
                <div className="flex items-center gap-5 mb-6">
                    <div onClick={() => router.back()}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mb-4 cursor-pointer text-primary rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </div>
                    <ul className="flex space-x-2 rtl:space-x-reverse mb-4">
                        <li>
                            <Link href="/" className="text-primary hover:underline">
                                {t('home')}
                            </Link>
                        </li>
                        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                            <Link href="/bookings" className="text-primary hover:underline">
                                {t('bookings') || 'Bookings'}
                            </Link>
                        </li>
                        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                            <span>{t('booking_details') || 'Booking Details'}</span>
                        </li>
                    </ul>
                </div>

                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">{t('booking_details') || 'Booking Details'}</h1>
                        <p className="text-gray-500">{booking ? `#${booking.booking_number}` : t('loading')}</p>
                    </div>
                    {booking && invoices.length === 0 && !(booking as any)?.invoice_deal_id && (
                        <Link href={`/bookings/edit/${booking.id}`} className="btn btn-primary">
                            <IconEdit className="ltr:mr-2 rtl:ml-2" />
                            {t('edit_booking') || 'Edit Booking'}
                        </Link>
                    )}
                </div>
            </div>

            <div className="container mx-auto p-6">
                <Tab.Group>
                    <Tab.List className="mt-3 flex border-b border-white-light dark:border-[#191e3a] w-full">
                        <Tab as="div" className="flex-1">
                            {({ selected }) => (
                                <button
                                    className={`${
                                        selected ? 'text-primary !outline-none before:!w-full' : ''
                                    } relative -mb-[1px] flex w-full items-center justify-center border-b-2 border-transparent p-4 before:absolute before:bottom-0 before:left-0 before:right-0 before:m-auto before:inline-block before:h-[2px] before:w-0 before:bg-primary before:transition-all before:duration-300 hover:text-primary hover:before:w-full h-16`}
                                >
                                    <div className="flex items-center justify-center space-x-2">
                                        <IconUser className="w-5 h-5" />
                                        <span className="text-sm font-medium">Basic Information</span>
                                    </div>
                                </button>
                            )}
                        </Tab>
                        <Tab as="div" className="flex-1">
                            {({ selected }) => (
                                <button
                                    className={`${
                                        selected ? 'text-primary !outline-none before:!w-full' : ''
                                    } relative -mb-[1px] flex w-full items-center justify-center border-b-2 border-transparent p-4 before:absolute before:bottom-0 before:left-0 before:right-0 before:m-auto before:inline-block before:h-[2px] before:w-0 before:bg-primary before:transition-all before:duration-300 hover:text-primary hover:before:w-full h-16`}
                                >
                                    <div className="flex items-center justify-center space-x-2">
                                        <IconDollarSign className="w-5 h-5" />
                                        <span className="text-sm font-medium">Accounting</span>
                                    </div>
                                </button>
                            )}
                        </Tab>
                        <Tab as="div" className="flex-1">
                            {({ selected }) => (
                                <button
                                    className={`${
                                        selected ? 'text-primary !outline-none before:!w-full' : ''
                                    } relative -mb-[1px] flex w-full items-center justify-center border-b-2 border-transparent p-4 before:absolute before:bottom-0 before:left-0 before:right-0 before:m-auto before:inline-block before:h-[2px] before:w-0 before:bg-primary before:transition-all before:duration-300 hover:text-primary hover:before:w-full h-16`}
                                >
                                    <div className="flex items-center justify-center space-x-2">
                                        <IconCreditCard className="w-5 h-5" />
                                        <span className="text-sm font-medium">Tax & Rec Invoices</span>
                                    </div>
                                </button>
                            )}
                        </Tab>
                        <Tab as="div" className="flex-1">
                            {({ selected }) => (
                                <button
                                    className={`${
                                        selected ? 'text-primary !outline-none before:!w-full' : ''
                                    } relative -mb-[1px] flex w-full items-center justify-center border-b-2 border-transparent p-4 before:absolute before:bottom-0 before:left-0 before:right-0 before:m-auto before:inline-block before:h-[2px] before:w-0 before:bg-primary before:transition-all before:duration-300 hover:text-primary hover:before:w-full h-16`}
                                >
                                    <div className="flex items-center justify-center space-x-2">
                                        <IconPdf className="w-5 h-5" />
                                        <span className="text-sm font-medium">Confirmation</span>
                                    </div>
                                </button>
                            )}
                        </Tab>

                        <Tab as="div" className="flex-1">
                            {({ selected }) => (
                                <button
                                    className={`${
                                        selected ? 'text-primary !outline-none before:!w-full' : ''
                                    } relative -mb-[1px] flex w-full items-center justify-center border-b-2 border-transparent p-4 before:absolute before:bottom-0 before:left-0 before:right-0 before:m-auto before:inline-block before:h-[2px] before:w-0 before:bg-primary before:transition-all before:duration-300 hover:text-primary hover:before:w-full h-16`}
                                >
                                    <div className="flex items-center justify-center space-x-2">
                                        <IconCalendar className="w-5 h-5" />
                                        <span className="text-sm font-medium">History</span>
                                    </div>
                                </button>
                            )}
                        </Tab>
                    </Tab.List>
                    <Tab.Panels className="mt-5">
                        {/* Basic Information Tab */}
                        <Tab.Panel>
                            <div className="space-y-6">
                                {/* Booking Header */}
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <CardTitle className="text-2xl font-bold">Booking #{booking.booking_number}</CardTitle>
                                                <p className="text-gray-600 dark:text-gray-400 mt-1">
                                                    Created on{' '}
                                                    {new Date(booking.created_at).toLocaleDateString('en-GB', {
                                                        year: 'numeric',
                                                        month: '2-digit',
                                                        day: '2-digit',
                                                    })}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${getStatusBadgeClass(booking.status)}`}>
                                                    {getStatusLabel(booking.status)}
                                                </div>
                                                <div className="flex items-center gap-3 mt-3 justify-end">
                                                    {booking.status === 'awaiting_execution' &&
                                                        ((role === 'driver' && booking.driver_id === currentDriverId) || (role === 'contractor' && booking.contractor_id === currentContractorId)) && (
                                                            <button onClick={confirmBooking} className="btn btn-primary">
                                                                Confirm Booking
                                                            </button>
                                                        )}
                                                    {booking.status === 'confirmed' && role === 'admin' && (
                                                        <ProviderPdfButton booking={booking} provider={(booking as any).contractor || (booking as any).driver} role={role} />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>
                                </Card>

                                {/* Customer Information */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <IconUser className="w-5 h-5" />
                                            Customer Information
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</label>
                                                <p className="text-gray-900 dark:text-gray-100">{booking.customer_name}</p>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</label>
                                                <p className="text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                                    <IconPhone className="w-4 h-4" />
                                                    <a href={`tel:${booking.customer_phone}`} className="text-primary hover:underline">
                                                        {booking.customer_phone}
                                                    </a>
                                                </p>
                                            </div>
                                            {booking.customer_email && (
                                                <div>
                                                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
                                                    <p className="text-gray-900 dark:text-gray-100">{booking.customer_email}</p>
                                                </div>
                                            )}
                                            <div>
                                                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Service Address</label>
                                                <p className="text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                                    <IconMapPin className="w-4 h-4" />
                                                    {booking.service_address}
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Schedule Information */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <IconCalendar className="w-5 h-5" />
                                            Schedule Information
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <IconCalendar className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Date:</span>
                                                <span className="text-sm text-gray-900 dark:text-gray-100">
                                                    {new Date(booking.scheduled_date).toLocaleDateString('en-GB', {
                                                        year: 'numeric',
                                                        month: '2-digit',
                                                        day: '2-digit',
                                                    })}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <IconClock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Time:</span>
                                                <span className="text-sm text-gray-900 dark:text-gray-100">{booking.scheduled_time}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Services */}
                                {bookingServices && bookingServices.length > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <IconClipboardText className="w-5 h-5" />
                                                Services
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-4">
                                                {/* Services List */}
                                                <div className="border-t border-b border-white-light dark:border-[#191e3a]">
                                                    {bookingServices.map((svc, idx) => (
                                                        <div key={idx} className="py-4 border-b border-white-light dark:border-[#191e3a] last:border-b-0">
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex-1">
                                                                    <h4 className="font-medium text-gray-900 dark:text-gray-100">{svc.name}</h4>
                                                                    {(svc as any).description && (
                                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-wrap">{(svc as any).description}</p>
                                                                    )}
                                                                    <div className="mt-2 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                                                        <span>Quantity: {svc.quantity || 1}</span>
                                                                        <span>Unit Price: ₪{(svc.unit_price || 0).toFixed(2)}</span>
                                                                    </div>
                                                                </div>
<<<<<<< Updated upstream
                                                            )}

                                                            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                                <label className="block text-sm text-gray-600 mb-2 font-medium">Assign Mode</label>
                                                                <AssignmentModeSelectAdd
                                                                    value={assignMode}
                                                                    onChange={(v) => {
                                                                        setAssignMode(v);
                                                                        if (v === 'driver') {
                                                                            setSelectedContractorAssign(null);
                                                                            setContractorPriceAssign('');
                                                                        } else {
                                                                            setSelectedDriverAssign(null);
                                                                            setSelectedTruckAssign(null);
                                                                        }
                                                                    }}
                                                                    className="w-full"
                                                                />

                                                                {assignMode === 'driver' && (
                                                                    <div className="mt-4">
                                                                        <label className="block text-sm text-gray-600 mb-2">Driver</label>
                                                                        <DriverSelect
                                                                            selectedDriver={selectedDriverAssign as any}
                                                                            onDriverSelect={(d) => setSelectedDriverAssign(d as any)}
                                                                            onCreateNew={() => router.push('/drivers/add')}
                                                                            className="w-full"
                                                                        />
                                                                    </div>
                                                                )}

                                                                {assignMode === 'contractor' && (
                                                                    <div className="mt-4">
                                                                        <label className="block text-sm text-gray-600 mb-2">Contractor</label>
                                                                        <ContractorSelect
                                                                            selectedContractor={selectedContractorAssign as any}
                                                                            onContractorSelect={(c) => {
                                                                                setSelectedContractorAssign(c as any);
                                                                                if (c && booking?.contractor_id === (c as any).id && booking.contractor_price) {
                                                                                    setContractorPriceAssign(String(booking.contractor_price));
                                                                                } else {
                                                                                    setContractorPriceAssign('');
                                                                                }
                                                                            }}
                                                                            onCreateNew={() => router.push('/contractors/add')}
                                                                            className="w-full"
                                                                        />
                                                                        {selectedContractorAssign && (
                                                                            <div className="mt-3">
                                                                                <label className="block text-sm text-gray-600 mb-2">Contractor Price</label>
                                                                                <input
                                                                                    type="number"
                                                                                    min={0}
                                                                                    className="form-input"
                                                                                    value={contractorPriceAssign}
                                                                                    onChange={(e) => setContractorPriceAssign(e.target.value)}
                                                                                    placeholder="Enter contractor price"
                                                                                />
                                                                                <p className="text-xs text-gray-500 mt-1">
                                                                                    This amount will be saved to the booking (bookings.contractor_price) only and will NOT modify the contractor balance
                                                                                    (contractors.balance).
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                <div className="mt-4 flex items-center justify-end gap-3">
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-outline-danger"
                                                                        onClick={() => {
                                                                            // reset local selections to current persisted values
                                                                            setSelectedTruckAssign(
                                                                                booking.truck_id ? { id: booking.truck_id as string, truck_number: booking.truck?.truck_number } : null,
                                                                            );
                                                                            setSelectedDriverAssign(booking.driver_id ? { id: booking.driver_id as string, name: booking.driver?.name } : null);
                                                                            setSelectedContractorAssign(
                                                                                booking.contractor_id ? { id: booking.contractor_id as string, name: booking.contractor?.name } : null,
                                                                            );
                                                                            setContractorPriceAssign(typeof booking.contractor_price === 'number' ? String(booking.contractor_price) : '');
                                                                        }}
                                                                    >
                                                                        Reset
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-primary"
                                                                        onClick={async () => {
                                                                            try {
                                                                                if (assignMode === 'driver' && selectedTruckAssign) {
                                                                                    await handleTruckAssign(selectedTruckAssign as any);
                                                                                }
                                                                                if (assignMode === 'driver' && selectedDriverAssign) {
                                                                                    await handleDriverAssign(
                                                                                        selectedDriverAssign as any,
                                                                                        (selectedTruckAssign && selectedTruckAssign.id) || booking.truck_id || null,
                                                                                    );
                                                                                }
                                                                                if (assignMode === 'contractor' && selectedContractorAssign) {
                                                                                    if (contractorPriceInvalid) {
                                                                                        setAlert({
                                                                                            visible: true,
                                                                                            message: 'Enter a positive contractor price before assigning.',
                                                                                            type: 'danger',
                                                                                        });
                                                                                        return;
                                                                                    }
                                                                                    await handleContractorAssign(selectedContractorAssign as any);
                                                                                }
                                                                            } catch (e) {
                                                                                console.error('Error applying assignment', e);
                                                                                setAlert({ visible: true, message: 'Could not apply assignment', type: 'danger' });
                                                                            }
                                                                        }}
                                                                        disabled={
                                                                            assigningContractor ||
                                                                            (assignMode === 'driver'
                                                                                ? !selectedDriverAssign && !selectedTruckAssign
                                                                                : !selectedContractorAssign || contractorPriceInvalid)
                                                                        }
                                                                    >
                                                                        {assigningContractor ? 'Assigning...' : 'Apply Assignment'}
                                                                    </button>
=======
                                                                <div className="text-right">
                                                                    <p className="font-medium text-gray-900 dark:text-gray-100">₪{(svc.total || 0).toFixed(2)}</p>
>>>>>>> Stashed changes
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Services Total */}
                                                <div className="space-y-2 pt-4">
                                                    <div className="border-t border-white-light dark:border-[#191e3a] pt-2">
                                                        <div className="flex justify-between text-lg font-semibold">
                                                            <span className="text-gray-900 dark:text-gray-100">Total:</span>
                                                            <span className="text-gray-900 dark:text-gray-100">₪{getServicesTotal().toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Assignment Information */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <IconUser className="w-5 h-5" />
                                            Assignment
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {role === 'admin' ? (
                                            booking && (booking.truck_id || booking.driver_id || booking.contractor_id) ? (
                                                <>
                                                    {booking.truck && (
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                                                                <IconClipboardText className="w-4 h-4 text-gray-400" />
                                                            </div>
                                                            <div>
                                                                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Truck</label>
                                                                <p className="text-gray-900 dark:text-gray-100">{booking.truck?.truck_number || 'Not Assigned'}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {booking.driver && (
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                                                                <IconUser className="w-4 h-4 text-gray-400" />
                                                            </div>
                                                            <div>
                                                                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Driver</label>
                                                                <p className="text-gray-900 dark:text-gray-100">{booking.driver.name}</p>
                                                                {(booking.driver as any).driver_number && (
                                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                        <a href={`tel:${(booking.driver as any).driver_number}`} className="text-primary hover:underline">
                                                                            {(booking.driver as any).driver_number}
                                                                        </a>
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {booking.contractor && (
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                                                                <IconUser className="w-4 h-4 text-gray-400" />
                                                            </div>
                                                            <div>
                                                                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Contractor</label>
                                                                <p className="text-gray-900 dark:text-gray-100">
                                                                    {booking.contractor.name}
                                                                    {typeof booking.contractor_price === 'number' ? ` • ₪${booking.contractor_price.toFixed(2)}` : ''}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="space-y-4">
                                                    {/* Assign Mode Selection */}
                                                    <div className="panel">
                                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Assignment Mode</label>
                                                        <AssignmentModeSelectAdd
                                                            value={assignMode}
                                                            onChange={(v) => {
                                                                setAssignMode(v);
                                                                if (v === 'driver') {
                                                                    setSelectedContractorAssign(null);
                                                                    setContractorPriceAssign('');
                                                                } else {
                                                                    setSelectedDriverAssign(null);
                                                                    setSelectedTruckAssign(null);
                                                                }
                                                            }}
                                                            className="form-select w-full border border-white-light dark:border-[#191e3a]"
                                                        />
                                                    </div>

                                                    {/* Driver Assignment Section */}
                                                    {assignMode === 'driver' && (
                                                        <>
                                                            <div className="panel">
                                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Truck</label>
                                                                <TruckSelect
                                                                    selectedTruck={(selectedTruckAssign as any) || (booking.truck as any)}
                                                                    onTruckSelect={(t) => setSelectedTruckAssign(t as any)}
                                                                    onCreateNew={() => router.push('/fleet/add')}
                                                                    className="form-select w-full border border-white-light dark:border-[#191e3a]"
                                                                />
                                                                <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                                                    <span>
                                                                        Current: <span className="font-medium text-gray-700 dark:text-gray-300">{booking.truck?.truck_number || 'Not Assigned'}</span>
                                                                    </span>
                                                                    {selectedTruckAssign && (
                                                                        <span>
                                                                            Selected: <span className="font-medium text-primary">{selectedTruckAssign?.truck_number}</span>
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="panel">
                                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Driver</label>
                                                                <DriverSelect
                                                                    selectedDriver={selectedDriverAssign as any}
                                                                    onDriverSelect={(d) => setSelectedDriverAssign(d as any)}
                                                                    onCreateNew={() => router.push('/drivers/add')}
                                                                    className="form-select w-full border border-white-light dark:border-[#191e3a]"
                                                                />
                                                                <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                                                    <span>
                                                                        Current: <span className="font-medium text-gray-700 dark:text-gray-300">{booking.driver?.name || 'Not Assigned'}</span>
                                                                    </span>
                                                                    {selectedDriverAssign && (
                                                                        <span>
                                                                            Selected: <span className="font-medium text-primary">{selectedDriverAssign?.name}</span>
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}

                                                    {/* Contractor Assignment Section */}
                                                    {assignMode === 'contractor' && (
                                                        <>
                                                            <div className="panel">
                                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Contractor</label>
                                                                <ContractorSelect
                                                                    selectedContractor={selectedContractorAssign as any}
                                                                    onContractorSelect={(c) => {
                                                                        setSelectedContractorAssign(c as any);
                                                                        if (c && booking?.contractor_id === (c as any).id && booking.contractor_price) {
                                                                            setContractorPriceAssign(String(booking.contractor_price));
                                                                        } else {
                                                                            setContractorPriceAssign('');
                                                                        }
                                                                    }}
                                                                    onCreateNew={() => router.push('/contractors/add')}
                                                                    className="form-select w-full border border-white-light dark:border-[#191e3a]"
                                                                />
                                                                <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                                                    <span>
                                                                        Current: <span className="font-medium text-gray-700 dark:text-gray-300">{booking.contractor?.name || 'Not Assigned'}</span>
                                                                    </span>
                                                                    {selectedContractorAssign && (
                                                                        <span>
                                                                            Selected: <span className="font-medium text-primary">{selectedContractorAssign?.name}</span>
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {selectedContractorAssign && (
                                                                <div className="panel">
                                                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                                                        Contractor Price <span className="text-danger">*</span>
                                                                    </label>
                                                                    <input
                                                                        type="number"
                                                                        min={0}
                                                                        step="0.01"
                                                                        className="form-input w-full"
                                                                        value={contractorPriceAssign}
                                                                        onChange={(e) => setContractorPriceAssign(e.target.value)}
                                                                        placeholder="Enter contractor price"
                                                                    />
                                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                                                        This amount will be saved to the booking and deducted from the contractor balance.
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}

                                                    {/* Action Buttons */}
                                                    <div className="panel">
                                                        <div className="flex items-center justify-end gap-3">
                                                            <button
                                                                type="button"
                                                                className="btn btn-outline-danger"
                                                                onClick={() => {
                                                                    // reset local selections to current persisted values
                                                                    setSelectedTruckAssign(booking.truck_id ? { id: booking.truck_id as string, truck_number: booking.truck?.truck_number } : null);
                                                                    setSelectedDriverAssign(booking.driver_id ? { id: booking.driver_id as string, name: booking.driver?.name } : null);
                                                                    setSelectedContractorAssign(booking.contractor_id ? { id: booking.contractor_id as string, name: booking.contractor?.name } : null);
                                                                    setContractorPriceAssign(typeof booking.contractor_price === 'number' ? String(booking.contractor_price) : '');
                                                                }}
                                                            >
                                                                Reset
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="btn btn-primary"
                                                                onClick={async () => {
                                                                    try {
                                                                        if (assignMode === 'driver' && selectedTruckAssign) {
                                                                            await handleTruckAssign(selectedTruckAssign as any);
                                                                        }
                                                                        if (assignMode === 'driver' && selectedDriverAssign) {
                                                                            await handleDriverAssign(
                                                                                selectedDriverAssign as any,
                                                                                (selectedTruckAssign && selectedTruckAssign.id) || booking.truck_id || null,
                                                                            );
                                                                        }
                                                                        if (assignMode === 'contractor' && selectedContractorAssign) {
                                                                            if (contractorPriceInvalid) {
                                                                                setAlert({
                                                                                    visible: true,
                                                                                    message: 'Enter a positive contractor price before assigning.',
                                                                                    type: 'danger',
                                                                                });
                                                                                return;
                                                                            }
                                                                            await handleContractorAssign(selectedContractorAssign as any);
                                                                        }
                                                                    } catch (e) {
                                                                        console.error('Error applying assignment', e);
                                                                        setAlert({ visible: true, message: 'Could not apply assignment', type: 'danger' });
                                                                    }
                                                                }}
                                                                disabled={
                                                                    assigningContractor ||
                                                                    (assignMode === 'driver' ? !selectedDriverAssign && !selectedTruckAssign : !selectedContractorAssign || contractorPriceInvalid)
                                                                }
                                                            >
                                                                {assigningContractor ? 'Assigning...' : 'Apply Assignment'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        ) : (
                                            <>
                                                {booking.truck && (
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                                                            <IconClipboardText className="w-4 h-4 text-gray-400" />
                                                        </div>
                                                        <div>
                                                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Truck</label>
                                                            <p className="text-gray-900 dark:text-gray-100">{booking.truck?.truck_number || 'Not Assigned'}</p>
                                                        </div>
                                                    </div>
                                                )}
                                                {booking.driver && (
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                                                            <IconUser className="w-4 h-4 text-gray-400" />
                                                        </div>
                                                        <div>
                                                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Driver</label>
                                                            <p className="text-gray-900 dark:text-gray-100">{booking.driver.name}</p>
                                                            {(booking.driver as any).driver_number && (
                                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                    <a href={`tel:${(booking.driver as any).driver_number}`} className="text-primary hover:underline">
                                                                        {(booking.driver as any).driver_number}
                                                                    </a>
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                                {booking.contractor && (
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                                                            <IconUser className="w-4 h-4 text-gray-400" />
                                                        </div>
                                                        <div>
                                                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Contractor</label>
                                                            <p className="text-gray-900 dark:text-gray-100">
                                                                {booking.contractor.name}
                                                                {typeof booking.contractor_price === 'number' ? ` • ₪${booking.contractor_price.toFixed(2)}` : ''}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Notes */}
                                {booking?.notes && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <IconClipboardText className="w-5 h-5" />
                                                Notes
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">{booking.notes}</p>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Quick Contact */}
                                <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-white">
                                            <IconPhone className="w-5 h-5" />
                                            Quick Contact
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <a href={`tel:${booking.customer_phone}`} className="flex items-center p-3 bg-white/20 rounded-lg hover:bg-white/30 transition">
                                            <IconPhone className="w-5 h-5 ltr:mr-3 rtl:ml-3" />
                                            <span className="font-medium">Call Customer</span>
                                        </a>
                                    </CardContent>
                                </Card>
                            </div>
                        </Tab.Panel>

                        {/* ACCOUNTING Tab (summary + Invoice DEAL) */}
                        <Tab.Panel>
                            {(() => {
                                const totalReceipts = (payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
                                const totalInvoiceDeal = (invoiceDeals || []).filter(isInvoiceDealType).reduce((sum, deal) => sum + (deal.total_amount || 0), 0);
                                const balance = totalReceipts - totalInvoiceDeal;
                                const balanceColor = balance < 0 ? 'text-danger' : balance === 0 ? 'text-gray-500' : 'text-success';
                                const bookingCount = bookingServices?.length || 0;
                                return (
                                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 mb-6">
                                        <div className="panel bg-gradient-to-br from-blue-500/10 to-blue-600/10">
                                            <div className="flex items-center gap-3">
                                                <div className={`flex h-12 w-12 items-center justify-center rounded-full ${balance < 0 ? 'bg-danger/20' : 'bg-success/20'}`}>
                                                    <IconDollarSign className={`h-6 w-6 ${balanceColor}`} />
                                                </div>
                                                <div>
                                                    <div className={`text-2xl font-bold ${balanceColor}`}>₪{balance.toFixed(2)}</div>
                                                    <div className="text-xs text-gray-500">Balance</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="panel bg-gradient-to-br from-purple-500/10 to-purple-600/10">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/20">
                                                    <IconCreditCard className="h-6 w-6 text-warning" />
                                                </div>
                                                <div>
                                                    <div className="text-2xl font-bold text-warning">₪{totalReceipts.toFixed(2)}</div>
                                                    <div className="text-xs text-gray-500">Total Receipt</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Recent Transactions panel removed per request */}

                            {/* Invoice DEAL details for this booking */}
                            <div className="panel mt-6">
                                <div className="mb-5">
                                    <h3 className="text-lg font-semibold">Invoice DEAL & Receipts</h3>
                                </div>

                                {(() => {
                                    // combine invoiceDeals (type: Invoice DEAL) and payments (type: Receipt) for this booking
                                    const dealRows: any[] = (invoiceDeals || []).filter(isInvoiceDealType).map((d) => ({
                                        id: d.id,
                                        type: 'Invoice DEAL',
                                        reference: d.invoice_number,
                                        customer: booking.customer_name || 'N/A',
                                        service: getServicesDisplay(),
                                        amount: d.total_amount || 0,
                                        remaining: d.remaining_amount || 0,
                                        status: d.status || '-',
                                        pdf_url: d.pdf_url || undefined,
                                        raw: d,
                                    }));

                                    const paymentRows: any[] = (payments || [])
                                        .filter((p) => p.booking_id === booking.id)
                                        .map((p) => ({
                                            id: p.id,
                                            type: 'Receipt',
                                            reference: `${(p.payment_method || '').replace('_', ' ')}${p.transaction_id ? ' • ' + p.transaction_id : ''}`,
                                            customer: (p.invoices && p.invoices.customers && p.invoices.customers.name) || booking.customer_name || 'N/A',
                                            service: getServicesDisplay(),
                                            amount: p.amount || 0,
                                            remaining: 0,
                                            status: 'completed',
                                            pdf_url: undefined,
                                            raw: p,
                                        }));

                                    const rows = [...dealRows, ...paymentRows].sort((a, b) => {
                                        const da = new Date((a.raw && a.raw.created_at) || (a.raw && a.raw.payment_date) || '').getTime() || 0;
                                        const db = new Date((b.raw && b.raw.created_at) || (b.raw && b.raw.payment_date) || '').getTime() || 0;
                                        return db - da;
                                    });

                                    if (!rows || rows.length === 0) {
                                        return <div className="text-center py-4 text-gray-500 text-sm">No invoice deals or receipts for this booking</div>;
                                    }

                                    return (
                                        <div className="table-responsive">
                                            <table className="table-bordered">
                                                <thead>
                                                    <tr>
                                                        <th>ID / Ref</th>
                                                        <th>Type</th>
                                                        <th>Customer</th>
                                                        <th>Service</th>
                                                        <th>Amount</th>
                                                        <th>Remaining</th>
                                                        <th>Status</th>
                                                        <th>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {rows.map((r) => (
                                                        <tr key={r.id}>
                                                            <td>
                                                                <strong className="text-primary">{r.reference || r.id}</strong>
                                                            </td>
                                                            <td>
                                                                <span className={`badge ${r.type === 'Invoice DEAL' ? 'badge-outline-warning' : 'badge-outline-success'}`}>{r.type}</span>
                                                            </td>
                                                            <td>{r.customer}</td>
                                                            <td>{r.service}</td>
                                                            <td>₪{(r.amount || 0).toFixed(2)}</td>
                                                            <td className="text-danger">{r.type === 'Invoice DEAL' ? `₪${(r.remaining || 0).toFixed(2)}` : '—'}</td>
                                                            <td>
                                                                <span className="badge badge-outline-info">{(r.status || '').toString().toUpperCase()}</span>
                                                            </td>
                                                            <td className="text-blue-500">
                                                                <div className="flex items-center gap-3">
                                                                    {r.type === 'Invoice DEAL' ? (
                                                                        <>
                                                                            <button
                                                                                onClick={async () => {
                                                                                    try {
                                                                                        // Download PDF directly
                                                                                        const blob = await fetchInvoiceDealPdfBlob(r.raw);
                                                                                        const url = window.URL.createObjectURL(blob);
                                                                                        const a = document.createElement('a');
                                                                                        a.href = url;
                                                                                        a.download = `invoice-deal-${r.raw?.invoice_number || r.raw?.id}.pdf`;
                                                                                        document.body.appendChild(a);
                                                                                        a.click();
                                                                                        document.body.removeChild(a);
                                                                                        window.URL.revokeObjectURL(url);
                                                                                    } catch (err) {
                                                                                        console.error('Download PDF failed', err);
                                                                                        window.alert('Failed to download Invoice Deal PDF');
                                                                                    }
                                                                                }}
                                                                                className="inline-flex hover:text-primary"
                                                                                title="Download Deal PDF"
                                                                            >
                                                                                <IconPdf className="h-5 w-5" />
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        <span className="text-xs text-gray-500">Receipt</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                })()}
                            </div>
                        </Tab.Panel>

                        <Tab.Panel>
                            <div className="panel ">
                                <div className="mb-5 flex items-center justify-between">
                                    <h3 className="text-lg font-semibold">Tax & Receipt Invoices</h3>
                                    <div className="flex items-center gap-3">
                                        <button onClick={handleCreateInvoice} className="btn btn-outline-primary" disabled={creatingInvoice}>
                                            {creatingInvoice ? 'Creating Invoice...' : 'Add New Invoice'}
                                        </button>
                                        <button onClick={() => setShowPaymentModal(true)} className="btn btn-primary">
                                            Record New Receipt
                                        </button>
                                    </div>
                                </div>
                                {(() => {
                                    const transactions = [
                                        ...invoices.map((inv) => ({
                                            id: inv.id,
                                            date: inv.created_at,
                                            type: 'Invoice' as const,
                                            reference: `#${inv.invoice_number}`,
                                            amount: (inv as any).subtotal_amount || inv.total_amount || 0,
                                            status: inv.status,
                                            isInvoice: true as const,
                                        })),
                                        ...payments.map((pay) => ({
                                            id: pay.id,
                                            date: pay.payment_date,
                                            type: 'Receipt' as const,
                                            reference: (pay.payment_method || '').replace('_', ' '),
                                            amount: pay.amount,
                                            status: 'completed' as const,
                                            isInvoice: false as const,
                                        })),
                                    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                                    if (transactions.length === 0) {
                                        return <div className="text-center text-gray-500 py-4">No invoices or receipts for this booking</div>;
                                    }

                                    return (
                                        <div className="table-responsive">
                                            <table className="table-bordered">
                                                <thead>
                                                    <tr>
                                                        <th>Reference</th>
                                                        <th>Type</th>
                                                        <th>Amount</th>
                                                        <th>Status</th>
                                                        <th>Date</th>
                                                        <th>Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {transactions.map((tx) => (
                                                        <tr key={tx.id}>
                                                            <td className="font-semibold">{tx.reference}</td>
                                                            <td>
                                                                <span className={`badge ${tx.isInvoice ? 'badge-outline-primary' : 'badge-outline-success'}`}>{tx.type}</span>
                                                            </td>
                                                            <td className={tx.isInvoice ? 'font-bold' : 'font-bold text-success'}>₪{tx.amount?.toFixed(2) || 0}</td>
                                                            <td>
                                                                <span
                                                                    className={`badge badge-sm ${
                                                                        tx.status === 'paid' || tx.status === 'completed'
                                                                            ? 'badge-outline-success'
                                                                            : tx.status === 'overdue'
                                                                              ? 'badge-outline-danger'
                                                                              : 'badge-outline-warning'
                                                                    }`}
                                                                >
                                                                    {tx.status}
                                                                </span>
                                                            </td>
                                                            <td>{new Date(tx.date).toLocaleDateString('en-GB')}</td>
                                                            <td>
                                                                {tx.isInvoice ? (
                                                                    <Link href={`/invoices/preview/${tx.id}`} className="inline-flex hover:text-primary" title="View Invoice">
                                                                        <IconEye className="h-5 w-5" />
                                                                    </Link>
                                                                ) : (
                                                                    <span className="text-xs text-gray-400">-</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                })()}
                            </div>
                        </Tab.Panel>

                        {/* CONFIRMATION Tab */}
                        <Tab.Panel>
                            {booking.status === 'confirmed' ? (
                                <div className="panel">
                                    <h3 className="text-lg font-semibold mb-5">Confirmation Documents</h3>
                                    <div className="table-responsive">
                                        <table className="table-bordered">
                                            <thead>
                                                <tr>
                                                    <th>ID</th>
                                                    <th>Type</th>
                                                    <th>Customer</th>
                                                    <th>Service</th>
                                                    <th>Amount</th>
                                                    <th>Status</th>
                                                    <th>Date</th>
                                                    <th>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(() => {
                                                    const confirmationItems = (invoiceDeals || []).filter(isConfirmationType);
                                                    if (confirmationItems && confirmationItems.length > 0) {
                                                        return confirmationItems.map((deal) => (
                                                            <tr key={deal.id}>
                                                                <td>
                                                                    <a href="#" className="text-primary hover:underline font-semibold">
                                                                        {deal.invoice_number}
                                                                    </a>
                                                                </td>
                                                                <td>
                                                                    <span className="badge badge-outline-primary">Confirmation</span>
                                                                </td>
                                                                <td>{booking.customer_name}</td>
                                                                <td>{(booking as any).service_name || booking.service_type}</td>
                                                                <td>₪0.00</td>
                                                                <td>
                                                                    <span className="badge badge-outline-success">{deal.status}</span>
                                                                </td>
                                                                <td>{new Date(deal.created_at).toLocaleDateString('en-GB')}</td>
                                                                <td>
                                                                    {booking.status === 'confirmed' && role === 'admin' && (
                                                                        <ProviderPdfButton booking={booking} provider={(booking as any).contractor || (booking as any).driver} role={role} />
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ));
                                                    }

                                                    return (
                                                        <tr>
                                                            <td colSpan={8} className="text-center text-gray-500 py-6">
                                                                No confirmation documents yet
                                                            </td>
                                                        </tr>
                                                    );
                                                })()}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="panel">
                                    <div className="text-center py-10">
                                        <div className="text-5xl mb-4">⏳</div>
                                        <h3 className="text-lg font-semibold text-gray-600 mb-2">Booking Not Confirmed Yet</h3>
                                        <p className="text-sm text-gray-500">Confirmation details will appear here once the booking is confirmed.</p>
                                        <p className="text-xs text-gray-400 mt-4">
                                            Current Status: <span className="badge badge-outline-warning">{booking.status}</span>
                                        </p>
                                    </div>
                                </div>
                            )}
                        </Tab.Panel>

                        {/* History Tab */}
                        <Tab.Panel>
                            <div className="space-y-6">
                                <div className="panel">
                                    <h5 className="font-semibold mb-4">Booking History</h5>
                                    <p className="text-sm text-gray-600">No history available yet</p>
                                </div>
                            </div>
                        </Tab.Panel>

                        {/* السجل Tab */}
                        <Tab.Panel>
                            <div className="space-y-6">
                                {/* Booking History */}
                                <div className="panel">
                                    <div className="mb-5">
                                        <h3 className="text-lg font-semibold">Booking History</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                            <span className="font-medium">Booking Created:</span>
                                            <span className="font-medium">
                                                {new Date(booking.created_at).toLocaleDateString('en-GB', {
                                                    year: 'numeric',
                                                    month: '2-digit',
                                                    day: '2-digit',
                                                })}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                            <span className="font-medium">Scheduled Date:</span>
                                            <span className="font-medium">
                                                {new Date(booking.scheduled_date).toLocaleDateString('en-GB', {
                                                    year: 'numeric',
                                                    month: '2-digit',
                                                    day: '2-digit',
                                                })}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                            <span className="font-medium">Service:</span>
                                            <span className="font-medium">{getServicesDisplay()}</span>
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                            <span className="font-medium">Status Changes:</span>
                                            <span className={`badge ${getStatusBadgeClass(booking.status)}`}>{booking.status}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Booking Track */}
                                <div className="panel">
                                    <div className="mb-5">
                                        <h3 className="text-lg font-semibold">Booking Track</h3>
                                    </div>

                                    <div className="space-y-3">
                                        {/* Booking Created */}
                                        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                            <div>
                                                <div className="font-medium">Booking Created</div>
                                                <div className="text-xs text-gray-500">Created at</div>
                                            </div>
                                            <div className="text-sm text-gray-600">{booking.created_at ? new Date(booking.created_at).toLocaleDateString('en-GB') : '-'}</div>
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                            <span className="font-medium">Invoice Date (Latest):</span>
                                            <span className="font-medium">
                                                {invoices && invoices.length > 0 ? (invoices[0].created_at ? new Date(invoices[0].created_at).toLocaleDateString('en-GB') : '-') : '-'}
                                            </span>
                                        </div>
                                        {/* Payments (recent/payments with date & amount) */}
                                        {payments && payments.length > 0 ? (
                                            payments.map((p) => (
                                                <div key={p.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                    <div>
                                                        <div className="font-medium">Receipt</div>
                                                        <div className="text-xs text-gray-500">{p.payment_method ? p.payment_method.replace('_', ' ').toUpperCase() : ''}</div>
                                                    </div>
                                                    <div className="text-sm text-gray-600">
                                                        <div>{p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-GB') : '-'}</div>
                                                        <div className="text-success font-bold">₪{p.amount?.toFixed(2) || '0.00'}</div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center text-gray-500 py-2">No payments recorded</div>
                                        )}

                                        {/* Status changes */}
                                        {bookingTracks && bookingTracks.length > 0 ? (
                                            bookingTracks.map((track) => (
                                                <div key={track.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                    <div>
                                                        <div className="font-medium">{track.old_status ? `${track.old_status} → ${track.new_status}` : track.new_status}</div>
                                                        <div className="text-xs text-gray-500">{track.notes || ''}</div>
                                                    </div>
                                                    <div className="text-sm text-gray-600">{track.created_at ? new Date(track.created_at).toLocaleDateString('en-GB') : '-'}</div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center text-gray-500 py-2">No status changes recorded for this booking.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Tab.Panel>
                    </Tab.Panels>
                </Tab.Group>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="panel w-full max-w-lg mx-4">
                        <div className="mb-5 flex items-center justify-between">
                            <h5 className="text-lg font-semibold">Record New Payment</h5>
                            <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        </div>

                        <form
                            onSubmit={async (e) => {
                                e.preventDefault();

                                try {
                                    // Create invoice if not exists
                                    // @ts-ignore
                                    const { data: existingInvoice, error: invoiceCheckError } = await supabase.from('invoices').select('*').eq('booking_id', params?.id).maybeSingle();

                                    if (invoiceCheckError) {
                                        console.error('Error checking invoice:', invoiceCheckError);
                                        throw invoiceCheckError;
                                    }

                                    // @ts-ignore
                                    let invoiceId = existingInvoice?.id;

                                    if (!existingInvoice) {
                                        console.log('Creating new invoice...');
                                        // Generate invoice number
                                        const invoiceNumber = `INV-${Date.now()}`;

                                        const { data: newInvoice, error: invoiceError } = await supabase
                                            .from('invoices')
                                            // @ts-ignore
                                            .insert({
                                                invoice_number: invoiceNumber,
                                                booking_id: params?.id,
                                                customer_id: booking?.customer_id,
                                                total_amount: parseFloat(paymentForm.amount),
                                                paid_amount: 0,
                                                remaining_amount: parseFloat(paymentForm.amount),
                                                status: 'pending',
                                                due_date: new Date().toISOString().split('T')[0],
                                            })
                                            .select()
                                            .single();

                                        if (invoiceError) {
                                            console.error('Invoice creation error:', invoiceError);
                                            throw invoiceError;
                                        }
                                        // @ts-ignore
                                        invoiceId = newInvoice?.id;
                                        console.log('Invoice created:', invoiceId);
                                    }

                                    // Create payment
                                    console.log('Creating payment...');
                                    const { error: paymentError } = await supabase
                                        .from('payments')
                                        // @ts-ignore
                                        .insert({
                                            invoice_id: invoiceId,
                                            booking_id: params?.id,
                                            customer_id: booking?.customer_id,
                                            amount: parseFloat(paymentForm.amount),
                                            payment_method: paymentForm.payment_method,
                                            transaction_id: paymentForm.transaction_id || null,
                                            notes: paymentForm.notes || null,
                                            payment_date: new Date().toISOString(),
                                        });

                                    if (paymentError) {
                                        console.error('Payment creation error:', paymentError);
                                        throw paymentError;
                                    }

                                    console.log('Payment recorded successfully');
                                    setAlert({ visible: true, message: 'Payment recorded successfully!', type: 'success' });
                                    setShowPaymentModal(false);
                                    window.location.reload();
                                } catch (error: any) {
                                    console.error('Error recording payment:', error);
                                    setAlert({ visible: true, message: `Error recording payment: ${error.message || 'Unknown error'}`, type: 'danger' });
                                }
                            }}
                        >
                            <div className="space-y-4">
                                {/* Amount */}
                                <div>
                                    <label className="block text-sm font-bold mb-2">Amount (₪) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={paymentForm.amount}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                        className="form-input"
                                        placeholder={`Enter amount (Service Price: ₪${booking?.price || 0})`}
                                        required
                                    />
                                </div>

                                {/* Payment Method */}
                                <div>
                                    <label className="block text-sm font-bold mb-2">Payment Method *</label>
                                    <MethodsSelect
                                        value={paymentForm.payment_method}
                                        onChange={(val) => {
                                            const newMethod = (val || 'cash') as 'cash' | 'credit_card' | 'bank_transfer' | 'check';
                                            setPaymentForm({ ...paymentForm, payment_method: newMethod });
                                        }}
                                        className="form-select"
                                    />
                                </div>

                                {/* Transaction ID */}
                                <div>
                                    <label className="block text-sm font-bold mb-2">Transaction ID (Optional)</label>
                                    <input
                                        type="text"
                                        value={paymentForm.transaction_id}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, transaction_id: e.target.value })}
                                        className="form-input"
                                        placeholder="Enter transaction ID"
                                    />
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className="block text-sm font-bold mb-2">Notes (Optional)</label>
                                    <textarea
                                        value={paymentForm.notes}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                                        className="form-textarea"
                                        rows={3}
                                        placeholder="Enter payment notes"
                                    />
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowPaymentModal(false)} className="btn btn-outline-danger">
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Record Payment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BookingPreview;
