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
import { supabase } from '@/lib/supabase/client';
import { getTranslation } from '@/i18n';
import Link from 'next/link';
import { Tab } from '@headlessui/react';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import MethodsSelect from '@/components/selectors/MethodsSelect';

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
    status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
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
}

interface BookingTrack {
    id: string;
    booking_id: string;
    old_status?: string;
    new_status?: string;
    notes?: string | null;
    created_at?: string;
}

const BookingPreview = () => {
    const { t } = getTranslation();
    const params = useParams();
    const router = useRouter();
    const [booking, setBooking] = useState<Booking | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [invoiceDeals, setInvoiceDeals] = useState<InvoiceDeal[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [bookingServices, setBookingServices] = useState<{ name: string; quantity: number; unit_price: number; total: number }[]>([]);
    const [bookingTracks, setBookingTracks] = useState<BookingTrack[]>([]);
    const [selectedContractor, setSelectedContractor] = useState<{ id: string; name: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [creatingInvoice, setCreatingInvoice] = useState(false);
    const [creatingInvoiceDeal, setCreatingInvoiceDeal] = useState(false);
    const [contractorPaid, setContractorPaid] = useState<number>(0);
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
                try {
                    const { data: bookingServicesData, error: bookingServicesError } = await supabase.from('booking_services').select('service_id, quantity, unit_price').eq('booking_id', params?.id);

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

                        const detailed = rows.map((r: any) => {
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
                                name: resolvedName || booking.service_type || '-',
                                description: (svc && svc.description) || (serviceRecord && r.service_id === booking.service_type ? serviceRecord.description : null) || null,
                                quantity,
                                unit_price: unitPrice || 0,
                                total,
                            };
                        });

                        // compute total for all booking services
                        servicesTotal = detailed.reduce((sum, it) => sum + (it.total || 0), 0);

                        setBookingServices(detailed);
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
                // parse contractor_price from notes if present
                try {
                    const notesText = (enrichedBooking as any)?.notes || '';
                    const m = /contractor_price:([0-9]+(?:\.[0-9]+)?)/.exec(notesText);
                    setContractorPaid(m ? parseFloat(m[1]) : 0);
                } catch (e) {
                    setContractorPaid(0);
                }
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
            router.push('/invoices');
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
                    if (invoiceDeal.pdf_url) window.open(invoiceDeal.pdf_url, '_blank');
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

    // selected status for editing
    const [selectedStatus, setSelectedStatus] = useState<string>('');

    useEffect(() => {
        if (booking?.status) setSelectedStatus(booking.status);
    }, [booking?.status]);

    const handleUpdateStatus = async () => {
        if (!booking) return;
        if (!selectedStatus || selectedStatus === booking.status) return;

        try {
            // Update booking status
            const { error: updateError } = await (supabase.from('bookings').update as any)({ status: selectedStatus }).eq('id', booking.id);

            if (updateError) throw updateError;

            // Insert a booking track entry
            const { data: insertedTrack, error: insertTrackError } = await supabase
                .from('booking_tracks')
                .insert([
                    {
                        booking_id: booking.id,
                        old_status: booking.status,
                        new_status: selectedStatus,
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

    const handleContractorAssign = async (contractor: { id: string; name: string } | null) => {
        if (!booking) return;
        setSelectedContractor(contractor);
        try {
            if (contractor) {
                // persist contractor_id on booking
                // @ts-ignore - supabase typing
                const { error } = await supabase.from('bookings').update({ contractor_id: contractor.id }).eq('id', booking.id);
                if (error) throw error;
                setBooking((prev) => (prev ? ({ ...prev, contractor_id: contractor.id, contractor: { id: contractor.id, name: contractor.name } } as any) : prev));
                setAlert({ visible: true, message: 'Contractor assigned', type: 'success' });
            } else {
                // remove contractor
                // @ts-ignore
                const { error } = await supabase.from('bookings').update({ contractor_id: null }).eq('id', booking.id);
                if (error) throw error;
                setBooking((prev) => (prev ? ({ ...prev, contractor_id: null, contractor: null } as any) : prev));
                setAlert({ visible: true, message: 'Contractor removed', type: 'success' });
            }
        } catch (err) {
            console.error('Error assigning contractor:', err);
            setAlert({ visible: true, message: 'Could not assign contractor', type: 'danger' });
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
        const taxAmount = +(subtotalAmount * 0.18);
        const totalWithTax = subtotalAmount + taxAmount;

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
            tax_amount: taxAmount,
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
            const { error: updateError } = await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', booking.id);
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
                    tax_amount: invoiceData.tax_amount,
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
            setAlert({ visible: true, message: 'Booking confirmed', type: 'success' });
        } catch (err) {
            console.error('Error confirming booking:', err);
            setAlert({ visible: true, message: 'Error confirming booking', type: 'danger' });
        }
    };

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'pending':
                return 'badge-outline-warning';
            case 'confirmed':
                return 'badge-outline-info';
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
                                        <IconClipboardText className="w-5 h-5" />
                                        <span className="text-sm font-medium">History</span>
                                    </div>
                                </button>
                            )}
                        </Tab>
                    </Tab.List>
                    <Tab.Panels className="mt-5">
                        {/* Basic Information Tab */}
                        <Tab.Panel>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Customer Information */}
                                <div className="space-y-6">
                                    {/* Basic Info */}
                                    <div className="panel">
                                        <div className="mb-5">
                                            <h3 className="text-lg font-semibold">Basic Information</h3>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <h2 className="text-2xl font-bold text-primary mb-2">{booking.customer_name}</h2>
                                                <div className="flex items-center gap-3">
                                                    <span className={`badge ${getStatusBadgeClass(booking.status)}`}>{t(booking.status) || booking.status}</span>
                                                    {booking.status !== 'confirmed' && (
                                                        <button onClick={confirmBooking} className="btn btn-primary">
                                                            Confirm Booking
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex items-center">
                                                    <IconUser className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                                    <span className="text-sm text-gray-600 ltr:mr-2 rtl:ml-2">Booking Number:</span>
                                                    <span className="font-medium">#{booking.booking_number}</span>
                                                </div>

                                                <div className="flex items-center">
                                                    <IconUser className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                                    <span className="text-sm text-gray-600 ltr:mr-2 rtl:ml-2">Customer Name:</span>
                                                    <span className="font-medium">{booking.customer_name}</span>
                                                </div>

                                                <div className="flex items-center">
                                                    <IconPhone className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                                    <span className="text-sm text-gray-600 ltr:mr-2 rtl:ml-2">Phone:</span>
                                                    <span className="font-medium">
                                                        <a href={`tel:${booking.customer_phone}`} className="text-primary hover:underline">
                                                            {booking.customer_phone}
                                                        </a>
                                                    </span>
                                                </div>

                                                <div className="flex items-center">
                                                    <IconMapPin className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                                    <span className="text-sm text-gray-600 ltr:mr-2 rtl:ml-2">Service Address:</span>
                                                    <span className="font-medium">{booking.service_address}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Schedule Information */}
                                    <div className="panel">
                                        <div className="mb-5">
                                            <h3 className="text-lg font-semibold">Schedule Information</h3>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                <div className="flex items-center">
                                                    <IconCalendar className="w-5 h-5 text-gray-400 ltr:mr-2 rtl:ml-2" />
                                                    <span className="text-sm text-gray-600">Scheduled Date:</span>
                                                </div>
                                                <span className="font-semibold text-gray-700 dark:text-gray-300">
                                                    {new Date(booking.scheduled_date).toLocaleDateString('en-GB', {
                                                        year: 'numeric',
                                                        month: '2-digit',
                                                        day: '2-digit',
                                                    })}
                                                </span>
                                            </div>

                                            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                <div className="flex items-center">
                                                    <IconClock className="w-5 h-5 text-gray-400 ltr:mr-2 rtl:ml-2" />
                                                    <span className="text-sm text-gray-600">Scheduled Time:</span>
                                                </div>
                                                <span className="font-semibold text-gray-700 dark:text-gray-300">{booking.scheduled_time}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Services - one panel per service */}
                                    {bookingServices && bookingServices.length > 0 && (
                                        <>
                                            {bookingServices.map((svc, idx) => (
                                                <div key={idx} className="panel mb-4">
                                                    <div className="mb-3">
                                                        <h3 className="text-lg font-semibold">{svc.name}</h3>
                                                    </div>
                                                    {(svc as any).description && <p className="text-sm text-gray-600 mb-3 whitespace-pre-wrap">{(svc as any).description}</p>}
                                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                            <div className="text-gray-600">Quantity</div>
                                                            <div className="font-medium">{svc.quantity || 1}</div>
                                                        </div>
                                                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-right">
                                                            <div className="text-gray-600">Unit Price</div>
                                                            <div className="font-medium">₪{(svc.unit_price || 0).toFixed(2)}</div>
                                                        </div>
                                                        <div className="col-span-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-right">
                                                            <div className="text-gray-600">Line Total</div>
                                                            <div className="font-semibold">₪{(svc.total || 0).toFixed(2)}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                            <div className="panel">
                                                <div className="mb-3">
                                                    <h3 className="text-lg font-semibold">Services Total</h3>
                                                </div>
                                                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-right">
                                                    <div className="text-sm text-gray-600">Total</div>
                                                    <div className="text-2xl font-bold">₪{getServicesTotal().toFixed(2)}</div>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {/* Notes (moved here so notes have their own panel) */}
                                    {booking?.notes && (
                                        <div className="panel mt-4">
                                            <div className="mb-3">
                                                <h3 className="text-lg font-semibold">Notes</h3>
                                            </div>
                                            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                <p className="text-sm whitespace-pre-wrap">{booking.notes}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Additional Information */}
                                <div className="space-y-6">
                                    {/* Assignment Information */}
                                    <div className="panel">
                                        <div className="mb-5">
                                            <h3 className="text-lg font-semibold">Assignment</h3>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                <span className="text-sm text-gray-600">Truck:</span>
                                                <span className="font-medium">{booking.truck?.truck_number || 'Not Assigned'}</span>
                                            </div>
                                            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                <span className="text-sm text-gray-600">Driver:</span>
                                                {booking.driver ? (
                                                    <div className="text-right">
                                                        <div className="font-medium">{booking.driver.name}</div>
                                                        {(booking.driver as any).driver_number && (
                                                            <div className="text-sm text-gray-500">
                                                                <a href={`tel:${(booking.driver as any).driver_number}`} className="text-primary hover:underline">
                                                                    {(booking.driver as any).driver_number}
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="font-medium">Not Assigned</span>
                                                )}
                                            </div>
                                            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                <span className="text-sm text-gray-600">Contractor:</span>
                                                <span className="font-medium">{booking.contractor?.name || 'Not Assigned'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Additional Information */}
                                    <div className="space-y-6"></div>
                                    {/* Additional Details */}
                                    <div className="panel">
                                        <div className="mb-5">
                                            <h3 className="text-lg font-semibold">Additional Information</h3>
                                        </div>

                                        <div className="space-y-3 text-sm">
                                            {booking.customer_email && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Email:</span>
                                                    <span className="font-medium">{booking.customer_email}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Status:</span>
                                                <span className={`badge ${getStatusBadgeClass(booking.status)}`}>{t(booking.status) || booking.status}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Created At:</span>
                                                <span className="font-medium">
                                                    {new Date(booking.created_at).toLocaleDateString('en-GB', {
                                                        year: 'numeric',
                                                        month: '2-digit',
                                                        day: '2-digit',
                                                    })}
                                                </span>
                                            </div>
                                            {/* Notes moved to its own panel in the left column */}
                                        </div>
                                    </div>

                                    {/* Contact Card */}
                                    <div className="panel bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                                        <div className="mb-3">
                                            <h3 className="text-lg font-semibold">Quick Contact</h3>
                                        </div>
                                        <div className="space-y-2">
                                            <a href={`tel:${booking.customer_phone}`} className="flex items-center p-3 bg-white/20 rounded-lg hover:bg-white/30 transition">
                                                <IconPhone className="w-5 h-5 ltr:mr-3 rtl:ml-3" />
                                                <span className="font-medium">Call Customer</span>
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Tab.Panel>

                        {/* ACCOUNTING Tab (summary + Invoice DEAL) */}
                        <Tab.Panel>
                            {(() => {
                                const totalReceipts = (payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
                                const totalInvoiceDeal = (invoiceDeals || []).reduce((sum, deal) => sum + (deal.total_amount || 0), 0);
                                const totalRevenue = totalReceipts - totalInvoiceDeal;
                                return (
                                    <div className="grid grid-cols-1 gap-5 md:grid-cols-3 mb-6">
                                        <div className="panel bg-gradient-to-br from-green-500/10 to-green-600/10">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/20">
                                                    <IconDollarSign className="h-6 w-6 text-success" />
                                                </div>
                                                <div>
                                                    <div className="text-2xl font-bold text-success">₪{totalRevenue.toFixed(2)}</div>
                                                    <div className="text-xs text-gray-500">Balance</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="panel bg-gradient-to-br from-blue-500/10 to-blue-600/10">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                                                    <IconCreditCard className="h-6 w-6 text-primary" />
                                                </div>
                                                <div>
                                                    <div className="text-2xl font-bold">₪{totalReceipts.toFixed(2)}</div>
                                                    <div className="text-xs text-gray-500">Total Receipt</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="panel bg-gradient-to-br from-red-500/10 to-red-600/10">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/20">
                                                    <IconClipboardText className="h-6 w-6 text-danger" />
                                                </div>
                                                <div>
                                                    <div className="text-2xl font-bold text-danger">₪{totalInvoiceDeal.toFixed(2)}</div>
                                                    <div className="text-xs text-gray-500">Total Invoice DEAL</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Invoice DEAL details for this booking */}
                            <div className="panel mt-6">
                                <div className="mb-5">
                                    <h3 className="text-lg font-semibold">Invoice DEAL</h3>
                                </div>
                                {invoiceDeals.length === 0 ? (
                                    <div className="text-center py-4 text-gray-500 text-sm">No invoice deals for this booking</div>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="table-bordered">
                                            <thead>
                                                <tr>
                                                    <th>ID</th>
                                                    <th>Customer</th>
                                                    <th>Service</th>
                                                    <th>Amount</th>
                                                    <th>Remaining</th>
                                                    <th>Status</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {invoiceDeals.map((deal) => {
                                                    const relatedInvoice = invoices.find((inv) => inv.booking_id === booking.id);
                                                    return (
                                                        <tr key={deal.id}>
                                                            <td>
                                                                <strong className="text-primary">{deal.invoice_number}</strong>
                                                            </td>
                                                            <td>{booking.customer_name || 'N/A'}</td>
                                                            <td>{getServicesDisplay()}</td>
                                                            <td>₪{(deal.total_amount || 0).toFixed(2)}</td>
                                                            <td className="text-danger">₪{(deal.remaining_amount || 0).toFixed(2)}</td>
                                                            <td>
                                                                <span className="badge badge-outline-info">{deal.status?.toUpperCase()}</span>
                                                            </td>
                                                            <td className="text-blue-500">
                                                                <div className="flex items-center gap-3">
                                                                    {relatedInvoice ? (
                                                                        <Link href={`/invoices/preview/${relatedInvoice.id}`} className="inline-flex hover:text-primary" title="View Invoice">
                                                                            <IconEye className="h-5 w-5" />
                                                                        </Link>
                                                                    ) : (
                                                                        <span className="text-xs text-gray-500">No Invoice</span>
                                                                    )}
                                                                    {deal.pdf_url ? (
                                                                        <button
                                                                            onClick={() => window.open(deal.pdf_url as string, '_blank')}
                                                                            className="inline-flex hover:text-primary"
                                                                            title="Open Deal PDF"
                                                                        >
                                                                            <IconPdf className="h-5 w-5" />
                                                                        </button>
                                                                    ) : (
                                                                        <span className="text-xs text-gray-500">No PDF</span>
                                                                    )}
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
