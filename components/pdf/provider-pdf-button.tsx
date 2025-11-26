'use client';
import React, { useState } from 'react';
import IconPdf from '@/components/icon/icon-pdf';
import { supabase } from '@/lib/supabase/client';
import { InvoiceDealPDFGenerator } from './invoice-deal-pdf';

type Props = {
    booking: any;
    provider?: any; // contractor or driver object
    role?: string | null;
};

export default function ProviderPdfButton({ booking, provider, role }: Props) {
    const [loading, setLoading] = useState(false);

    const handleClick = async () => {
        try {
            setLoading(true);

            // Fetch booking services
            let bookingServices: any[] = [];
            try {
                // Fetch booking services including created_at so we can show date/time
                // @ts-ignore
                const { data: bsData } = await supabase.from('booking_services').select('id, service_id, quantity, unit_price, description, created_at').eq('booking_id', booking.id);
                if (bsData && bsData.length > 0) {
                    const serviceIds = Array.from(new Set(bsData.map((s: any) => s.service_id).filter(Boolean)));
                    // @ts-ignore
                    const { data: svcData } = serviceIds.length > 0 ? await supabase.from('services').select('id, name').in('id', serviceIds) : { data: [] };
                    const svcMap = new Map((svcData || []).map((s: any) => [s.id, s]));

                    // Map booking services to include only name, date/time, and quantity (no prices)
                    bookingServices = bsData.map((bsvc: any) => {
                        const name = svcMap.get(bsvc.service_id)?.name || bsvc.service_name || '-';
                        const quantity = typeof bsvc.quantity === 'number' ? bsvc.quantity : Number(bsvc.qty || 1);
                        return {
                            id: bsvc.id,
                            service_id: bsvc.service_id,
                            name,
                            description: bsvc.description || null,
                            quantity,
                            // include created_at for per-service date/time display
                            created_at: bsvc.created_at || null,
                            // also include the booking scheduled date/time for reference
                            scheduled_date: booking.scheduled_date,
                            scheduled_time: booking.scheduled_time,
                            // omit price fields (explicitly set to undefined)
                            unit_price: undefined,
                            total: undefined,
                        };
                    });
                }
            } catch (err) {
                console.warn('Could not fetch booking services for provider PDF', err);
            }

            // Build a combined service names string from bookingServices (if any)
            const allServiceNames = bookingServices && bookingServices.length > 0 ? bookingServices.map((s) => s.name).join(', ') : booking.service_name || booking.service_type || '-';

            const providerContractor = booking.contractor || null;
            const providerDriver = booking.driver || null;
            const providerName = providerContractor?.name || providerDriver?.name || provider?.name || provider?.driver_name || undefined;

            const data: any = {
                company: {
                    name: 'PumpPro CRM',
                    phone: '',
                    address: '',
                    tax_id: '',
                    logo_url: '/favicon.png',
                },
                invoice: null,
                booking: {
                    booking_number: booking.booking_number,
                    // show all service names from booking_services instead of the raw service_type
                    service_type: allServiceNames,
                    service_address: booking.service_address,
                    scheduled_date: booking.scheduled_date,
                    scheduled_time: booking.scheduled_time,
                    notes: booking.notes,
                    contractor_id: booking.contractor_id,
                    driver_id: booking.driver_id,
                },
                contractor: providerContractor
                    ? {
                          name: providerContractor.name || providerName || undefined,
                          phone: providerContractor.phone || undefined,
                      }
                    : undefined,
                driver: providerDriver
                    ? {
                          name: providerDriver.name || providerName || undefined,
                          driver_number: providerDriver.driver_number || providerDriver.phone || undefined,
                      }
                    : undefined,
                customer: {
                    name: booking.customer_name,
                    phone: booking.customer_phone,
                    address: booking.service_address,
                },
                service: {
                    // present consolidated service names to the PDF generator
                    name: allServiceNames,
                },
                // include booking services (ALL services, not just the main one)
                booking_services: bookingServices.length > 0 ? bookingServices : undefined,
                services: bookingServices.length > 0 ? bookingServices : undefined,
                lang: 'en',
                no_price: true,
            };

            await InvoiceDealPDFGenerator.generatePDF(data, `booking-${booking.booking_number || booking.id}-provider.pdf`, 'invoice');
        } catch (e: any) {
            console.error('Provider PDF error', e);
            window.alert((e && e.message) || 'Error generating PDF');
        } finally {
            setLoading(false);
        }
    };

    return (
        <button type="button" className="inline-flex hover:text-primary" onClick={handleClick} title="Download PDF">
            <IconPdf className="h-4 w-4" />
        </button>
    );
}
