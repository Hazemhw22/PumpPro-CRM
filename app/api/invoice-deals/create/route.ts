import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { Tables, Updates } from '@/types/database.types';
import { InvoiceDealPDFGenerator } from '@/components/pdf/invoice-deal-pdf';
import { PDFService } from '@/components/pdf/pdf-service';

export const runtime = 'nodejs';

type BookingRow = Tables<'bookings'> & { customer_id?: string | null };

export async function POST(req: NextRequest) {
    try {
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.error('invoice-deals/create: Missing SUPABASE_SERVICE_ROLE_KEY');
            return NextResponse.json({ message: 'Server misconfiguration' }, { status: 500 });
        }

        const body = await req.json().catch(() => null);
        const booking_id: string | undefined = body?.booking_id;

        if (!booking_id) {
            return NextResponse.json({ message: 'booking_id is required' }, { status: 400 });
        }

        // 1) Fetch booking
        const { data: bookingRaw, error: bookingError } = await supabaseAdmin.from('bookings').select('*').eq('id', booking_id).single();

        if (bookingError) {
            console.error('invoice-deals/create: booking fetch error', bookingError);
            return NextResponse.json({ message: 'Failed to fetch booking' }, { status: 500 });
        }
        if (!bookingRaw) {
            return NextResponse.json({ message: 'Booking not found' }, { status: 404 });
        }

        const booking = bookingRaw as BookingRow;

        // 2) Idempotency: if booking already linked to invoice_deal, return it
        if (booking.invoice_deal_id) {
            const { data: existingDeal, error: existingErr } = await supabaseAdmin.from('invoice_deals').select('*').eq('id', booking.invoice_deal_id).maybeSingle();

            if (existingErr) {
                console.error('invoice-deals/create: fetch existing invoice_deal error', existingErr);
            }

            if (existingDeal) {
                return NextResponse.json(
                    {
                        message: 'Invoice DEAL already exists for this booking',
                        invoice_deal: existingDeal,
                    },
                    { status: 200 },
                );
            }
        }

        // 3) Fetch related data: services (all), customer, contractor, driver
        const [bookingServicesRes, customerRes, contractorRes, driverRes] = await Promise.all([
            supabaseAdmin.from('booking_services').select('*').eq('booking_id', booking_id),
            booking.customer_id ? supabaseAdmin.from('customers').select('*').eq('id', booking.customer_id).maybeSingle() : Promise.resolve({ data: null, error: null } as any),
            booking.contractor_id ? supabaseAdmin.from('contractors').select('*').eq('id', booking.contractor_id).maybeSingle() : Promise.resolve({ data: null, error: null } as any),
            booking.driver_id ? supabaseAdmin.from('drivers').select('*').eq('id', booking.driver_id).maybeSingle() : Promise.resolve({ data: null, error: null } as any),
        ]);

        const bookingServices = bookingServicesRes.data as Array<{ service_id: string; quantity: number; unit_price: number }> | null;
        const bookingServicesError = bookingServicesRes.error;
        if (bookingServicesError || !bookingServices || bookingServices.length === 0) {
            console.error('invoice-deals/create: booking_services fetch error', bookingServicesError);
            return NextResponse.json({ message: 'Failed to fetch booking services' }, { status: 500 });
        }

        // Fetch all service details
        const serviceIds = bookingServices.map((bs: any) => bs.service_id);
        const { data: allServices, error: servicesError } = await supabaseAdmin.from('services').select('*').in('id', serviceIds);

        if (servicesError || !allServices || allServices.length === 0) {
            console.error('invoice-deals/create: services fetch error', servicesError);
            return NextResponse.json({ message: 'Failed to fetch service details' }, { status: 500 });
        }

        const customer = customerRes.data as Tables<'customers'> | null;
        const customerError = customerRes.error;
        if (booking.customer_id && (customerError || !customer)) {
            console.error('invoice-deals/create: customer fetch error', customerError);
            return NextResponse.json({ message: 'Failed to fetch customer details' }, { status: 500 });
        }

        const contractor = contractorRes.data as Tables<'contractors'> | null;
        const driver = driverRes.data as Tables<'drivers'> | null;

        // 4) Calculate total amount based on all services
        const customerType = (customer as any)?.type || 'private';
        let totalAmount = 0;
        (bookingServices as any[]).forEach((bs: any) => {
            totalAmount += Number(bs.unit_price || 0);
        });
        const nowIso = new Date().toISOString();
        const invoiceNumber = `ID-${Date.now()}`;

        // 5) Insert invoice_deals row
        const insertPayload = {
            invoice_number: invoiceNumber,
            booking_id,
            booking_snapshot: booking as any,
            contractor_id: booking.contractor_id || null,
            total_amount: totalAmount,
            paid_amount: 0,
            remaining_amount: totalAmount,
            status: 'issued',
            created_at: nowIso,
            updated_at: nowIso,
        } as any;

        const { data: newDeal, error: insertError } = await supabaseAdmin.from('invoice_deals').insert(insertPayload).select('*').single();

        const deal = newDeal as any;

        if (insertError || !newDeal) {
            console.error('invoice-deals/create: insert invoice_deals error', insertError);
            return NextResponse.json(
                {
                    message: 'Failed to create invoice deal in database',
                    details: insertError?.message || insertError,
                },
                { status: 500 },
            );
        }

        // 6) Update booking with invoice_deal_id (lock booking to this deal)
        const bookingUpdatePayload: Updates<'bookings'> = {
            invoice_deal_id: deal?.id ?? null,
        };

        const { error: updateBookingError } = await (supabaseAdmin as any).from('bookings').update(bookingUpdatePayload).eq('id', booking_id);

        if (updateBookingError) {
            console.error('invoice-deals/create: update booking.invoice_deal_id error', updateBookingError);
        }

        const { data: linkedInvoice, error: fetchInvoiceError } = await supabaseAdmin.from('invoices').select('id').eq('booking_id', booking_id).maybeSingle();

        if (fetchInvoiceError) {
            console.error('invoice-deals/create: fetch invoice by booking_id error', fetchInvoiceError);
        } else if (linkedInvoice) {
            const { error: updateInvoiceError } = await (supabaseAdmin as any)
                .from('invoices')
                .update({ status: 'pending', updated_at: nowIso } as any)
                .eq('id', (linkedInvoice as any).id);

            if (updateInvoiceError) {
                console.error('invoice-deals/create: update invoice.status error', updateInvoiceError);
            }
        }

        // 7) Build PDF data and generate HTML
        const servicesForPdf = (bookingServices as any[]).map((bs: any) => {
            const svc = (allServices as any[]).find((s: any) => s.id === bs.service_id);
            return {
                name: svc?.name || '-',
                description: svc?.description || null,
                quantity: bs.quantity || 1,
                unit_price: bs.unit_price || 0,
                total: (bs.unit_price || 0) * (bs.quantity || 1),
            };
        });

        console.log('DEBUG: driver data', driver);
        console.log('DEBUG: contractor data', contractor);

        const pdfData = {
            invoice: {
                id: deal?.id,
                invoice_number: deal?.invoice_number,
                total_amount: deal?.total_amount,
                paid_amount: deal?.paid_amount,
                remaining_amount: deal?.remaining_amount,
                status: deal?.status,
                created_at: deal?.created_at,
            },
            booking: {
                booking_number: booking.booking_number,
                service_type: booking.service_type,
                service_address: (booking as any).service_address,
                scheduled_date: booking.scheduled_date,
                scheduled_time: booking.scheduled_time,
                notes: booking.notes,
                contractor_id: booking.contractor_id,
                driver_id: booking.driver_id,
            },
            contractor: contractor
                ? {
                      name: contractor.name,
                      phone: contractor.phone,
                  }
                : null,
            driver: driver
                ? {
                      name: `${driver.first_name || ''} ${driver.last_name || ''}`.trim() || driver.email || driver.phone || '-',
                      driver_number: driver.phone,
                  }
                : null,
            customer: customer
                ? {
                      name: customer.name,
                      phone: customer.phone,
                      address: customer.address,
                      business_name: customer.business_name,
                  }
                : null,
            services: servicesForPdf,
            companyInfo: null,
            doc_type: 'invoice' as const,
            lang: 'en' as const,
        };

        let pdfUrl: string | null = null;
        try {
            const html = await InvoiceDealPDFGenerator.generateHTML(pdfData as any);
            const pdfBuffer = await PDFService.getInstance().generateContractPDF({ contractHtml: html });

            const path = `invoice-deals/${deal?.invoice_number}-${deal?.id}.pdf`;
            const { error: uploadError } = await supabaseAdmin.storage.from('invoices').upload(path, pdfBuffer, { upsert: true, contentType: 'application/pdf' } as any);

            if (uploadError) {
                console.error('invoice-deals/create: upload PDF error', uploadError);
            } else {
                const { data } = supabaseAdmin.storage.from('invoices').getPublicUrl(path);
                pdfUrl = data.publicUrl || null;

                if (pdfUrl) {
                    const { error: updatePdfError } = await (supabaseAdmin as any)
                        .from('invoice_deals')
                        .update({ pdf_url: pdfUrl, updated_at: new Date().toISOString() } as any)
                        .eq('id', deal?.id);

                    if (updatePdfError) {
                        console.error('invoice-deals/create: update pdf_url error', updatePdfError);
                    }
                }
            }
        } catch (pdfErr) {
            console.error('invoice-deals/create: PDF generation pipeline failed', pdfErr);
        }

        const responseDeal = {
            ...(deal || {}),
            pdf_url: pdfUrl ?? (deal as any)?.pdf_url ?? null,
        };

        return NextResponse.json(
            {
                message: 'Invoice DEAL created successfully',
                invoice_deal: responseDeal,
            },
            { status: 201 },
        );
    } catch (err: any) {
        console.error('invoice-deals/create: unhandled error', err);
        return NextResponse.json({ message: 'Internal server error', error: err?.message || String(err) }, { status: 500 });
    }
}
