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
                // @ts-ignore
                const { data: bsData } = await supabase.from('booking_services').select('id, service_id, quantity, unit_price, description').eq('booking_id', booking.id);
                if (bsData && bsData.length > 0) {
                    const serviceIds = Array.from(new Set(bsData.map((s: any) => s.service_id).filter(Boolean)));
                    // @ts-ignore
                    const { data: svcData } = serviceIds.length > 0 ? await supabase.from('services').select('id, name, price_private, price_business').in('id', serviceIds) : { data: [] };
                    const svcMap = new Map((svcData || []).map((s: any) => [s.id, s]));
                    bookingServices = bsData.map((bsvc: any) => ({
                        id: bsvc.id,
                        service_id: bsvc.service_id,
                        name: svcMap.get(bsvc.service_id)?.name || bsvc.service_name || '-',
                        description: bsvc.description || null,
                        quantity: typeof bsvc.quantity === 'number' ? bsvc.quantity : Number(bsvc.qty || 1),
                        unit_price: typeof bsvc.unit_price === 'number' ? bsvc.unit_price : Number(svcMap.get(bsvc.service_id)?.price_private || svcMap.get(bsvc.service_id)?.price_business || 0),
                        total:
                            (typeof bsvc.unit_price === 'number' ? bsvc.unit_price : Number(svcMap.get(bsvc.service_id)?.price_private || svcMap.get(bsvc.service_id)?.price_business || 0)) *
                            (typeof bsvc.quantity === 'number' ? bsvc.quantity : Number(bsvc.qty || 1)),
                    }));
                }
            } catch (err) {
                console.warn('Could not fetch booking services for provider PDF', err);
            }

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
                    service_type: booking.service_type,
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
                    name: booking.service_name || booking.service_type,
                },
                // include booking services
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
        <button type="button" className={`flex hover:text-info ${loading ? 'opacity-60 pointer-events-none' : ''}`} onClick={handleClick} title="Print">
            <IconPdf className="h-4.5 w-4.5" />
        </button>
    );
}
