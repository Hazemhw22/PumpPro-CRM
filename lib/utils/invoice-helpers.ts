import { supabase } from '@/lib/supabase/client';

interface Deal {
    id: number | string;
    deal_type: string;
    customer_id?: number | string;
    seller_id?: number | string;
    buyer_id?: number | string;
    customer?: {
        id: number | string;
    };
    seller?: {
        id: number | string;
    };
    buyer?: {
        id: number | string;
    };
}

/**
 * Get customer ID from a deal based on deal type
 * Returns the customer ID as a string (as per database schema)
 */
export const getCustomerIdFromDeal = (deal: Deal | null): string | null => {
    if (!deal) return null;

    // allow null initial value
    let customerId: number | string | null | undefined = null;

    if (deal.deal_type === 'intermediary') {
        // For intermediary deals, prefer seller, then buyer
        customerId = deal.seller_id || deal.buyer_id || deal.seller?.id || deal.buyer?.id;
    } else {
        // For regular deals, use customer
        customerId = deal.customer_id || deal.customer?.id;
    }

    // Convert to string if it exists
    return customerId ? String(customerId) : null;
};

/**
 * Get customer ID by name
 * Returns the customer ID as a string (as per database schema)
 */
export const getCustomerIdByName = async (customerName: string): Promise<string | null> => {
    try {
        // Search by name (case-insensitive, partial match)
        const { data, error } = await (supabase as any).from('customers').select('id').ilike('name', `%${customerName}%`).limit(1).single();

        if (error) {
            // If single() fails, try with maybeSingle() and get first result
            const { data: dataArray, error: arrayError } = await (supabase as any).from('customers').select('id').ilike('name', `%${customerName}%`).limit(1);

            if (arrayError || !dataArray || dataArray.length === 0) {
                console.error('Error fetching customer by name:', arrayError);
                return null;
            }

            return String(dataArray[0].id);
        }

        return (data as any)?.id ? String((data as any).id) : null;
    } catch (error) {
        console.error('Error in getCustomerIdByName:', error);
        return null;
    }
};

/**
 * Log activity (placeholder - can be extended to log to database)
 */
export const logActivity = async (data: { type: string; invoice?: any; [key: string]: any }): Promise<void> => {
    try {
        console.log('Activity logged:', data);
        // TODO: If you have an activity_logs table, uncomment and implement:
        // await supabase.from('activity_logs').insert([{
        //     activity_type: data.type,
        //     data: data,
        //     created_at: new Date().toISOString()
        // }]);
    } catch (error) {
        console.error('Error logging activity:', error);
    }
};

/**
 * Handle receipt created and update customer balance
 */
export const handleReceiptCreated = async (invoiceId: number | string, customerId: string, billData: any, customerName: string, dealSellingPrice: number = 0, payments?: any[]): Promise<boolean> => {
    try {
        // Get current customer balance
        const { data: customer, error: customerError } = await (supabase as any).from('customers').select('balance, id').eq('id', customerId).single();

        if (customerError || !customer) {
            console.error('Error fetching customer:', customerError);
            return false;
        }

        let balanceChange = 0;

        // Calculate balance change based on bill type and direction
        if (billData.bill_type === 'general') {
            // For general bills, use bill_amount
            const amount = parseFloat(billData.bill_amount || '0');
            balanceChange = billData.bill_direction === 'positive' ? amount : -amount;
        } else if (billData.bill_type === 'tax_invoice') {
            // Tax invoices are always negative (money owed)
            const amount = parseFloat(billData.total_with_tax || '0');
            balanceChange = -amount;
        } else if (billData.bill_type === 'receipt_only' || billData.bill_type === 'tax_invoice_receipt') {
            // For receipts, calculate from payments
            if (payments && payments.length > 0) {
                const totalPaid = payments.reduce((sum, payment) => sum + (parseFloat(payment.amount?.toString() || '0') || 0), 0);

                if (billData.bill_direction === 'positive') {
                    // Positive receipt: payment received (reduces customer debt or adds credit)
                    balanceChange = totalPaid;
                } else {
                    // Negative receipt: refund given (increases customer debt)
                    balanceChange = -totalPaid;
                }
            } else {
                // Fallback to total_with_tax if no payments
                const amount = parseFloat(billData.total_with_tax || '0');
                balanceChange = billData.bill_direction === 'positive' ? amount : -amount;
            }
        } else {
            // Default: use total_with_tax
            const amount = parseFloat(billData.total_with_tax || '0');
            balanceChange = billData.bill_direction === 'positive' ? amount : -amount;
        }

        // Update customer balance
        const c: any = customer;
        const newBalance = (c.balance || 0) + balanceChange;

        const { error: updateError } = await (supabase as any).from('customers').update({ balance: newBalance }).eq('id', customerId);

        if (updateError) {
            console.error('Error updating customer balance:', updateError);
            return false;
        }

        console.log(`Customer ${customerName} balance updated: ${c.balance} -> ${newBalance} (change: ${balanceChange > 0 ? '+' : ''}${balanceChange})`);
        return true;
    } catch (error) {
        console.error('Error in handleReceiptCreated:', error);
        return false;
    }
};
