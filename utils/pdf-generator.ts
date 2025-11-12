'use client';

export interface BillData {
    id: string;
    bill_type: string;
    customer_name: string;
    customer_phone?: string | null;
    created_at?: string;
    bill_amount?: number | null;
    bill_description?: string | null;
    total?: number | null;
    tax_amount?: number | null;
    total_with_tax?: number | null;
    commission?: number | null;
    car_details?: string | null;
    payment_type?: string | null;
    cash_amount?: number | null;
    visa_amount?: number | null;
    bank_amount?: number | null;
    check_amount?: number | null;
    deal?: {
        id?: string | number | null;
        deal_title?: string | null;
        deal_type?: string | null;
        loss_amount?: number | null;
        car?: {
            buy_price?: number | null;
            sale_price?: number | null;
            make?: string | null;
            model?: string | null;
            year?: number | null;
            license_plate?: string | null;
        };
        customer?: {
            name?: string | null;
            id_number?: string | null;
        };
        seller?: {
            name?: string | null;
            id_number?: string | null;
        };
        buyer?: {
            name?: string | null;
            id_number?: string | null;
        };
    };
}

interface GenerateBillPDFOptions {
    filename: string;
    language?: string;
}

export const generateBillPDF = async (_bill: BillData, _options: GenerateBillPDFOptions): Promise<void> => {
    if (typeof window !== 'undefined') {
        console.warn('[generateBillPDF] PDF generation is not implemented in this environment.');
    }
    return Promise.resolve();
};

