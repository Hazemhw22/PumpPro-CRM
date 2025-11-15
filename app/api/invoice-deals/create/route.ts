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
        const { data: bookingRaw, error: bookingError } = await supabaseAdmin
            .from('bookings')
            .select('*')
            .eq('id', booking_id)
            .single();

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
            const { data: existingDeal, error: existingErr } = await supabaseAdmin
                .from('invoice_deals')
                .select('*')
                .eq('id', booking.invoice_deal_id)
                .maybeSingle();

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

        // 3) Fetch related data: service, customer, contractor
        const [serviceRes, customerRes, contractorRes] = await Promise.all([
            supabaseAdmin
                .from('services')
                .select('*')
                .eq('id', booking.service_type)
                .maybeSingle(),
            booking.customer_id
                ? supabaseAdmin
                      .from('customers')
                      .select('*')
                      .eq('id', booking.customer_id)
                      .maybeSingle()
                : Promise.resolve({ data: null, error: null } as any),
            booking.contractor_id
                ? supabaseAdmin
                      .from('contractors')
                      .select('*')
                      .eq('id', booking.contractor_id)
                      .maybeSingle()
                : Promise.resolve({ data: null, error: null } as any),
        ]);

        const service = serviceRes.data as Tables<'services'> | null;
        const serviceError = serviceRes.error;
        if (serviceError || !service) {
            console.error('invoice-deals/create: service fetch error', serviceError);
            return NextResponse.json({ message: 'Failed to fetch service details for pricing' }, { status: 500 });
        }

        const customer = customerRes.data as Tables<'customers'> | null;
        const customerError = customerRes.error;
        if (booking.customer_id && (customerError || !customer)) {
            console.error('invoice-deals/create: customer fetch error', customerError);
            return NextResponse.json({ message: 'Failed to fetch customer details' }, { status: 500 });
        }

        const contractor = contractorRes.data as Tables<'contractors'> | null;

        // 4) Calculate total amount based on customer type & service pricing
        const customerType = (customer as any)?.type || 'private';
        const basePrice =
            customerType === 'business' ? (service as any).price_business : (service as any).price_private;

        const totalAmount = Number(basePrice || (booking as any).price || 0);
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

        const { data: newDeal, error: insertError } = await supabaseAdmin
            .from('invoice_deals')
            .insert(insertPayload)
            .select('*')
            .single();

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

        const { error: updateBookingError } = await (supabaseAdmin as any)
            .from('bookings')
            .update(bookingUpdatePayload)
            .eq('id', booking_id);

        if (updateBookingError) {
            console.error('invoice-deals/create: update booking.invoice_deal_id error', updateBookingError);
        }

        const { data: linkedInvoice, error: fetchInvoiceError } = await supabaseAdmin
            .from('invoices')
            .select('id')
            .eq('booking_id', booking_id)
            .maybeSingle();

        if (fetchInvoiceError) {
            console.error('invoice-deals/create: fetch invoice by booking_id error', fetchInvoiceError);
        } else if (linkedInvoice) {
            const { error: updateInvoiceError } = await (supabaseAdmin as any)
                .from('invoices')
                .update({ status: 'paid', updated_at: nowIso } as any)
                .eq('id', (linkedInvoice as any).id);

            if (updateInvoiceError) {
                console.error('invoice-deals/create: update invoice.status error', updateInvoiceError);
            }
        }

        // 7) Build PDF data and generate HTML
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
            customer: customer
                ? {
                      name: customer.name,
                      phone: customer.phone,
                      address: customer.address,
                      business_name: customer.business_name,
                  }
                : null,
            service: {
                name: service.name,
                price_private: service.price_private,
                price_business: service.price_business,
            },
            companyInfo: null,
            doc_type: 'invoice' as const,
            lang: 'en' as const,
        };

        let pdfUrl: string | null = null;
        try {
            const html = await InvoiceDealPDFGenerator.generateHTML(pdfData as any);
            const pdfBuffer = await PDFService.getInstance().generateContractPDF({ contractHtml: html });

            const path = `invoice-deals/${deal?.invoice_number}-${deal?.id}.pdf`;
            const { error: uploadError } = await supabaseAdmin.storage
                .from('invoices')
                .upload(path, pdfBuffer, { upsert: true, contentType: 'application/pdf' } as any);

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

