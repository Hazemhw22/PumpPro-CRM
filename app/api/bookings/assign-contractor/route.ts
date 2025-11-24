import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { Tables } from '@/types/database.types';

type AssignContractorPayload = {
    bookingId?: string;
    contractorId?: string;
    contractorPrice?: number;
};

const normalizeNumber = (value: number) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return NaN;
    return Math.round(num * 100) / 100;
};

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as AssignContractorPayload;
        const bookingId = body.bookingId?.trim();
        const contractorId = body.contractorId?.trim();
        const contractorPrice = normalizeNumber(body.contractorPrice as number);

        if (!bookingId || !contractorId) {
            return NextResponse.json({ message: 'bookingId and contractorId are required' }, { status: 400 });
        }

        if (!contractorPrice || contractorPrice <= 0) {
            return NextResponse.json({ message: 'Contractor price must be a positive number' }, { status: 400 });
        }

        // Fetch booking
        const { data: bookingRow, error: bookingError } = await supabaseAdmin.from('bookings').select('id,status,contractor_id,contractor_name,contractor_price').eq('id', bookingId).single();

        if (bookingError || !bookingRow) {
            return NextResponse.json({ message: 'Booking not found' }, { status: 404 });
        }

        // Fetch new contractor
        const { data: contractorRow, error: contractorError } = await supabaseAdmin.from('contractors').select('id,name,phone,email,balance').eq('id', contractorId).single();

        if (contractorError || !contractorRow) {
            return NextResponse.json({ message: 'Contractor not found' }, { status: 404 });
        }

        // Do NOT modify contractor balances from this API.
        // We only update the booking row to set contractor assignment and price.
        const originalBookingState = {
            contractor_id: (bookingRow as any).contractor_id,
            contractor_name: (bookingRow as any).contractor_name,
            contractor_price: (bookingRow as any).contractor_price,
            status: (bookingRow as any).status,
        };

        const { data: updatedBooking, error: bookingUpdateError } = (await (supabaseAdmin.from('bookings') as any)
            .update({
                contractor_id: contractorId,
                contractor_name: (contractorRow as any).name || null,
                contractor_price: contractorPrice,
                status: 'awaiting_execution',
                updated_at: new Date().toISOString(),
            })
            .eq('id', bookingId)
            .select()
            .single()) as any;

        if (bookingUpdateError || !updatedBooking) {
            return NextResponse.json({ message: 'Failed to update booking' }, { status: 500 });
        }

        // Do not touch contractors.balance. Return the fetched contractor info (unchanged).
        const updatedContractor = contractorRow;

        await (supabaseAdmin.from('booking_tracks') as any).insert([
            {
                booking_id: bookingId,
                old_status: (bookingRow as any).status,
                new_status: 'awaiting_execution',
                notes: `Assigned contractor ${(contractorRow as any).name || contractorId}`,
                created_at: new Date().toISOString(),
            },
        ]);

        return NextResponse.json({ booking: updatedBooking, contractor: updatedContractor }, { status: 200 });
    } catch (err: any) {
        console.error('assign-contractor route error', err);
        return NextResponse.json({ message: err?.message || 'Unexpected error' }, { status: 500 });
    }
}
