'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { getTranslation } from '@/i18n';
import IconDollarSign from '@/components/icon/icon-dollar-sign';
import IconUser from '@/components/icon/icon-user';
import IconMenuWidgets from '@/components/icon/menu/icon-menu-widgets';
import IconCalendar from '@/components/icon/icon-calendar';
// Using local/simple controls instead of custom components not present in this repo
import { MultiplePaymentForm } from '@/components/forms/multiple-payment-form';
import { logActivity, getCustomerIdByName, handleReceiptCreated } from '@/lib/utils/invoice-helpers';
import { Booking, BookingDetail } from '@/types/database.types';
import BillTypeSelect from '@/components/bill-type-select/bill-type-select';
import BookingSelect from '@/components/booking-select/booking-select';

const AddInvoice = () => {
    const { t } = getTranslation();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [saving, setSaving] = useState(false);
    const [bookings, setBookings] = useState<BookingDetail[]>([]);
    const [selectedBooking, setSelectedBooking] = useState<BookingDetail | null>(null);
    const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
    const [alert, setAlert] = useState<{ message: string; type: 'success' | 'danger' } | null>(null);

    // Billing form state matching database schema exactly
    const [billForm, setBillForm] = useState({
        bill_type: '',
        bill_direction: 'positive', // Default to positive
        status: 'pending',
        customer_name: '',
        phone: '',
        date: new Date().toISOString().split('T')[0],
        car_details: '',
        commission: '',
        free_text: '',
        total: '',
        tax_amount: '',
        total_with_tax: '',
        payment_type: '',
        // General bill fields
        bill_description: '',
        bill_amount: '',
        // Visa payment fields
        visa_amount: '',
        visa_installments: '',
        visa_card_type: '',
        visa_last_four: '',
        // Bank transfer fields
        bank_amount: '',
        bank_name: '',
        bank_branch: '',
        account_number: '',
        transfer_number: '',
        transfer_holder_name: '',
        transfer_amount: '',
        transfer_bank_name: '',
        transfer_branch: '',
        transfer_account_number: '',
        transfer_branch_number: '',
        // Check fields
        check_amount: '',
        check_bank_name: '',
        check_branch_number: '',
        check_account_number: '',
        check_number: '',
        check_holder_name: '',
        check_branch: '',
        // Cash fields
        cash_amount: '',
        // Approval number (common for various payment types)
        approval_number: '',
    });

    // New multiple payments state for receipts
    const [payments, setPayments] = useState<any[]>([
        {
            payment_type: 'cash',
            amount: 0,
            date: new Date().toISOString().split('T')[0],
        },
    ]);

    useEffect(() => {
        fetchBookings();
        // Handle pre-selected booking from URL parameter
        const bookingId = searchParams?.get('booking');
        if (bookingId && bookings.length > 0) {
            const booking = bookings.find((b) => b.id === bookingId);
            if (booking) {
                setSelectedBooking(booking);
                handleBookingSelect(booking);
            }
        }
    }, [searchParams]);
    
    useEffect(() => {
        // Handle booking selection when bookings are loaded
        const bookingId = searchParams?.get('booking');
        if (bookingId && bookings.length > 0 && !selectedBooking) {
            const booking = bookings.find((b) => b.id === bookingId);
            if (booking) {
                setSelectedBooking(booking);
                handleBookingSelect(booking);
            }
        }
    }, [bookings, searchParams]);
    // Auto-dismiss alert after 5 seconds
    useEffect(() => {
        if (alert) {
            const timer = setTimeout(() => {
                setAlert(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [alert]);

    // Compute VAT (18%) when total or bill type changes
    useEffect(() => {
        const total = parseFloat(billForm.total || '0') || 0;
        if (billForm.bill_type === 'tax_invoice') {
            const tax = +(total * 0.18);
            setBillForm((prev) => ({ ...prev, tax_amount: tax.toFixed(2), total_with_tax: (total + tax).toFixed(2) }));
        } else {
            setBillForm((prev) => ({ ...prev, tax_amount: '', total_with_tax: prev.total }));
        }
    }, [billForm.total, billForm.bill_type]);
    const fetchBookings = async () => {
        try {
            // Fetch bookings with all related data
            // First, fetch bookings
            const { data: bookingsData, error: bookingsError } = await supabase
                .from('bookings')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(200);

            if (bookingsError) throw bookingsError;

            if (!bookingsData || bookingsData.length === 0) {
                setBookings([]);
                return;
            }

            // Get unique IDs for related data
            const truckIds = Array.from(new Set(bookingsData.map((b: any) => b.truck_id).filter(Boolean)));
            const driverIds = Array.from(new Set(bookingsData.map((b: any) => b.driver_id).filter(Boolean)));
            // Try to fetch services - service_type might be an ID or a name
            // First, try to get all services to match by ID or name
            const { data: allServices, error: servicesError } = await supabase
                .from('services')
                .select('id, name, description, price_private, price_business')
                .eq('active', true);
            
            // Create a map of services by ID and by name for lookup
            const servicesByIdMap = new Map((allServices || []).map((s: any) => [s.id, s]));
            const servicesByNameMap = new Map((allServices || []).map((s: any) => [s.name.toLowerCase(), s]));

            // Fetch related data in parallel
            const [trucksRes, driversRes] = await Promise.all([
                truckIds.length > 0
                    ? supabase
                          .from('trucks')
                          .select('id, truck_number, license_plate, capacity_gallons')
                          .in('id', truckIds)
                    : { data: [] },
                driverIds.length > 0
                    ? supabase
                          .from('drivers')
                          .select('id, first_name, last_name, phone')
                          .in('id', driverIds)
                    : { data: [] },
            ]);

            // Create maps for quick lookup
            const trucksMap = new Map((trucksRes.data || []).map((t: any) => [t.id, t]));
            const driversMap = new Map(
                (driversRes.data || []).map((d: any) => [
                    d.id,
                    {
                        id: d.id,
                        name: `${d.first_name} ${d.last_name}`,
                        phone: d.phone,
                    },
                ]),
            );

            // Enrich bookings with related data to match BookingDetail type
            const enrichedBookings: BookingDetail[] = bookingsData.map((booking: any) => {
                // Try to find service by ID first, then by name
                const serviceById = servicesByIdMap.get(booking.service_type);
                const serviceByName = servicesByNameMap.get(booking.service_type?.toLowerCase());
                const service = serviceById || serviceByName;
                
                return {
                    ...booking,
                    truck_number: booking.truck_id ? trucksMap.get(booking.truck_id)?.truck_number || null : null,
                    license_plate: booking.truck_id ? trucksMap.get(booking.truck_id)?.license_plate || null : null,
                    driver_name: booking.driver_id ? driversMap.get(booking.driver_id)?.name || null : null,
                    driver_phone: booking.driver_id ? driversMap.get(booking.driver_id)?.phone || null : null,
                    capacity_gallons: booking.truck_id ? trucksMap.get(booking.truck_id)?.capacity_gallons || null : null,
                    created_by_name: null, // Could be fetched from profiles if needed
                    // Add service information if available
                    service_name: service?.name || booking.service_type,
                    service_description: service?.description || null,
                    service_price_private: service?.price_private || null,
                    service_price_business: service?.price_business || null,
                };
            });

            setBookings(enrichedBookings);
            console.log('Fetched bookings with related data:', enrichedBookings);
        } catch (error) {
            console.error('Error fetching bookings:', error);
            // Don't show alert for booking errors, just log them
            // setAlert({ message: t('error_loading_bookings') || 'Error loading bookings', type: 'danger' });
        }
    };
    const handleBookingSelect = (booking: BookingDetail) => {
        if (booking) {
            setSelectedBooking(booking);

            // Get service price if available
            const servicePrice =
                (booking as any).service_price_private ??
                (booking as any).service_price_business ??
                (booking as any).price ??
                null;

            // Auto-fill form with booking data
            setBillForm((prev) => {
                const amountString = servicePrice != null ? String(servicePrice) : prev.total || prev.bill_amount;
                return {
                    ...prev,
                    customer_name: booking.customer_name || '',
                    phone: booking.customer_phone || '',
                    date: billDate || new Date().toISOString().split('T')[0],
                    // Optionally pre-fill total with service price if available
                    total: amountString,
                    bill_amount: amountString,
                };
            });
        }
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setBillForm((prev) => {
            const updated = { ...prev, [name]: value };
            return updated;
        });
    };

    const validateForm = () => {
        if (!selectedBooking) {
            setAlert({ message: t('booking_required') || 'Please select a booking', type: 'danger' });
            return false;
        }

        if (!billForm.bill_type) {
            setAlert({ message: t('bill_type_required'), type: 'danger' });
            return false;
        }

        // For general bills, we need description and amount
        if (billForm.bill_type === 'general') {
            if (!billForm.bill_description.trim()) {
                setAlert({ message: t('bill_description') + ' ' + t('required'), type: 'danger' });
                return false;
            }
            if (!billForm.bill_amount || parseFloat(billForm.bill_amount) <= 0) {
                setAlert({ message: t('bill_amount') + ' ' + t('required'), type: 'danger' });
                return false;
            }
            return true;
        }

        // For tax_invoice and receipt_only, validate total amount
        if (
            billForm.bill_type === 'tax_invoice' ||
            billForm.bill_type === 'receipt_only' ||
            billForm.bill_type === 'tax_invoice_receipt'
        ) {
            if (!billForm.total || parseFloat(billForm.total) <= 0) {
                setAlert({ message: t('total_amount_required') || 'Total amount is required', type: 'danger' });
                return false;
            }
        }

        return true;
    };

    /**
     * Create invoice/receipt document in Tranzila
     */
    const createTranzilaDocument = async (invoiceId: string, invoiceData: any, payments: any[], booking?: BookingDetail | null) => {
        try {
            // Map bill type to Tranzila document type
            // Document types from Tranzila API:
            // - IR = Tax invoice / receipt (combined)
            // - IN = Tax invoice (only)
            // - RE = Receipt (only)
            const documentTypeMap: Record<string, string> = {
                general: 'IR', // Invoice+Receipt (default)
                tax_invoice: 'IN', // Tax Invoice only
                receipt_only: 'RE', // Receipt only
            };

            // Map payment type to Tranzila payment method
            // Payment methods from Tranzila API:
            // 1 = Credit Card, 3 = Cheque, 4 = Bank Transfer, 5 = Cash, 6 = PayPal, 10 = Other
            const paymentMethodMap: Record<string, number> = {
                visa: 1, // Credit Card
                cash: 5, // Cash
                check: 3, // Cheque
                bank_transfer: 4, // Bank Transfer
            };

            const documentType = documentTypeMap[invoiceData.invoice_type || invoiceData.bill_type] || 'IR';

            // TESTING MODE: Always use amount 1 to avoid actual billing
            const TEST_AMOUNT = 1;

            // Prepare items array from booking data
            const items = [];

            // If we have booking data, create line items from service
            if (booking) {
                items.push({
                    type: 'I',
                    code: null,
                    name: (booking as any).service_name || booking.service_type || invoiceData.service_name || invoiceData.bill_description || invoiceData.customer_name || 'Service Invoice',
                    price_type: 'G', // Gross (includes VAT)
                    unit_price: TEST_AMOUNT, // Always 1 for testing
                    units_number: 1,
                    unit_type: 1, // Unit
                    currency_code: 'ILS',
                    to_doc_currency_exchange_rate: 1,
                });
            } else {
                // Fallback: Single item if no booking data
                items.push({
                    type: 'I',
                    code: null,
                    name: invoiceData.service_name || invoiceData.bill_description || invoiceData.customer_name || 'Invoice Item',
                    price_type: 'G', // Gross (includes VAT)
                    unit_price: TEST_AMOUNT, // Always 1 for testing
                    units_number: 1,
                    unit_type: 1,
                    currency_code: 'ILS',
                    to_doc_currency_exchange_rate: 1,
                });
            }

            // Prepare payments array with all payment details
            const tranzilaPayments =
                payments.length > 0
                    ? payments.map((payment) => {
                          const basePayment = {
                              payment_method: paymentMethodMap[payment.payment_type] || 1,
                              payment_date: invoiceData.invoice_date || invoiceData.date || new Date().toISOString().split('T')[0],
                              amount: TEST_AMOUNT, // Always 1 for testing (override actual amount)
                              currency_code: 'ILS',
                              to_doc_currency_exchange_rate: 1,
                          };

                          // Add payment-type-specific fields
                          if (payment.payment_type === 'visa') {
                              return {
                                  ...basePayment,
                                  cc_last_4_digits: payment.visa_last_four || null,
                                  cc_installments_number: payment.visa_installments || 1,
                                  cc_type: payment.visa_card_type || null,
                                  approval_number: payment.approval_number || null,
                              };
                          } else if (payment.payment_type === 'check') {
                              return {
                                  ...basePayment,
                                  check_number: payment.check_number || null,
                                  check_bank_name: payment.check_bank_name || null,
                                  check_branch: payment.check_branch || null,
                                  check_account_number: payment.check_account_number || null,
                                  check_holder_name: payment.check_holder_name || null,
                              };
                          } else if (payment.payment_type === 'bank_transfer') {
                              return {
                                  ...basePayment,
                                  transfer_number: payment.transfer_number || null,
                                  transfer_bank_name: payment.transfer_bank_name || null,
                                  transfer_branch: payment.transfer_branch || null,
                                  transfer_account_number: payment.transfer_account_number || null,
                                  transfer_holder_name: payment.transfer_holder_name || null,
                              };
                          }

                          // Cash or other payment types
                          return basePayment;
                      })
                    : [
                          {
                              payment_method: 1, // Default to credit card
                              payment_date: invoiceData.invoice_date || invoiceData.date || new Date().toISOString().split('T')[0],
                              amount: TEST_AMOUNT, // Always 1 for testing
                              currency_code: 'ILS',
                              to_doc_currency_exchange_rate: 1,
                          },
                      ];

            // Get customer information from booking
            let customerId = ''; // Default fallback for missing ID
            let customerEmail = booking?.customer_email || ''; // Default fallback
            let customerPhone = booking?.customer_phone || '';

            // Try to get customer ID from database if customer exists
            if (booking?.customer_name) {
                try {
                    const customerIdFromName = await getCustomerIdByName(booking.customer_name);
                    if (customerIdFromName) {
                        customerId = customerIdFromName;
                    }
                } catch (error) {
                    console.error('Error fetching customer ID:', error);
                }
            }

            // Call Tranzila API
            const response = await fetch('/api/tranzila', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'create_document',
                    data: {
                        document_type: documentType,
                        document_date: invoiceData.invoice_date || invoiceData.date || new Date().toISOString().split('T')[0],
                        document_currency_code: 'ILS',
                        vat_percent: 18,
                        client_company: invoiceData.customer_name || 'Customer',
                        client_name: invoiceData.customer_name || 'Customer',
                        client_id: customerId,
                        client_email: customerEmail,
                        client_phone: customerPhone || undefined,
                        items,
                        payments: tranzilaPayments,
                        created_by_user: 'car-dash',
                        created_by_system: 'car-dash',
                    },
                }),
            });

            const result = await response.json();

            if (result.ok && result.response?.status_code === 0) {
                // Document created successfully, update bill record with Tranzila info
                const { error: updateError } = await (supabase as any)
                    .from('invoices')
                    .update({
                        tranzila_document_id: result.response.document.id,
                        tranzila_document_number: result.response.document.number,
                        tranzila_retrieval_key: result.response.document.retrieval_key,
                        tranzila_created_at: result.response.document.created_at,
                    })
                    .eq('id', invoiceId);

                if (updateError) {
                    console.error('Error updating bill with Tranzila data:', updateError);
                } else {
                    console.log('Tranzila document created successfully:', result.response.document.number);
                }
            } else {
                console.error('Tranzila API error:', result.response);
            }
        } catch (error) {
            console.error('Error calling Tranzila API:', error);
            throw error;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        // Additional validation for receipts with multiple payments
        if (billForm.bill_type === 'receipt_only') {
            const totalPaid = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
            const expectedTotal = parseFloat(billForm.total) || 0;

            // Allow payments to exceed the expected total (extra goes to customer balance)
            // Only validate that we have some payment amount
            if (totalPaid <= 0) {
                setAlert({
                    message: t('payment_amount_required'),
                    type: 'danger',
                });
                return;
            }

            // Show info message if payment exceeds selling price
            if (totalPaid > expectedTotal + 0.01) {
                const excessAmount = totalPaid - expectedTotal;
                setAlert({
                    message: `${t('payment_exceeds_selling_price')}: ₪${excessAmount.toFixed(0)} ${t('will_be_added_to_customer_balance')}`,
                    type: 'success',
                });
                // Don't return - allow the payment to proceed
            }

            // If this is a partial payment, show a success message but allow it
            if (totalPaid < expectedTotal - 0.01) {
                const remainingAmount = expectedTotal - totalPaid;
                setAlert({
                    message: `${t('partial_payment_notice')}: ${t('paid')} ₪${totalPaid.toFixed(0)}, ${t('remaining')} ₪${remainingAmount.toFixed(0)}`,
                    type: 'success',
                });
                // Don't return - allow the partial payment to proceed
            }
        }

        setSaving(true);
        try {
            // Get customer ID from booking or by name first
            let customerId: string | null = null;
            if (selectedBooking?.customer_name) {
                try {
                    customerId = await getCustomerIdByName(selectedBooking.customer_name);
                } catch (error) {
                    console.error('Error fetching customer ID:', error);
                }
            }

            // Automatically determine bill direction for specific bill types
            let finalBillDirection = billForm.bill_direction;

            if (billForm.bill_type === 'tax_invoice') {
                // Tax invoices are always negative
                finalBillDirection = 'negative';
            }

            // Prepare invoice data based on bill type
            // Note: The invoices table structure may need to be extended to support these fields
            // For now, we'll map to the available fields in the invoices table
            let totalAmount = 0;
            let taxAmount: number | null = null;
            let totalWithTax = 0;

            if (billForm.bill_type === 'general') {
                totalAmount = parseFloat(billForm.bill_amount) || 0;
                totalWithTax = totalAmount;
            } else if (billForm.bill_type === 'tax_invoice' || billForm.bill_type === 'tax_invoice_receipt') {
                totalAmount = parseFloat(billForm.total) || 0;
                taxAmount = parseFloat(billForm.tax_amount) || (totalAmount * 0.18);
                totalWithTax = parseFloat(billForm.total_with_tax) || (totalAmount + taxAmount);
            } else if (billForm.bill_type === 'receipt_only') {
                totalAmount = parseFloat(billForm.total) || 0;
                totalWithTax = totalAmount; // Receipt only doesn't include tax calculations
            }

            // Generate invoice number if not exists
            const generateInvoiceNumber = async () => {
                try {
                    const { data, error } = await supabase.rpc('generate_invoice_number');
                    if (error) throw error;
                    return data || `INV-${Date.now()}`;
                } catch (error) {
                    console.error('Error generating invoice number:', error);
                    return `INV-${Date.now()}`;
                }
            };

            const invoiceNumber = await generateInvoiceNumber();

            // Calculate paid amount from payments
            const paidAmount = billForm.bill_type === 'receipt_only' || billForm.bill_type === 'tax_invoice_receipt'
                ? payments.reduce((sum, payment) => sum + (payment.amount || 0), 0)
                : 0;

            // Calculate remaining amount
            const remainingAmount = totalWithTax - paidAmount;


            // Prepare invoice data matching the database schema
            const invoiceData = {
                invoice_number: invoiceNumber,
                booking_id: selectedBooking?.id || null,
                customer_id: customerId,
                total_amount: totalWithTax,
                paid_amount: paidAmount,
                remaining_amount: remainingAmount,
                status: billForm.status || 'pending',
                due_date: billForm.date || billDate || new Date().toISOString().split('T')[0],
                // New fields (will be added via migration)
                invoice_type: billForm.bill_type,
                invoice_direction: finalBillDirection,
                invoice_date: billForm.date || billDate || new Date().toISOString().split('T')[0],
                customer_name: billForm.customer_name || selectedBooking?.customer_name || '',
                customer_phone: billForm.phone || selectedBooking?.customer_phone || '',
                service_name: (selectedBooking as any)?.service_name || selectedBooking?.service_type || billForm.bill_description || null,
                service_description: (selectedBooking as any)?.service_description || null,
                tax_amount: taxAmount,
                subtotal_amount: totalAmount,
                notes: billForm.free_text || null,
                commission: parseFloat(billForm.commission) || null,
                bill_description: billForm.bill_description || null,
            };

            // Insert into invoices table
            let invoiceResult: any = null;
            try {
                const result = await supabase
                    .from('invoices')
                    .insert([invoiceData] as any)
                    .select('id')
                    .single();
                
                if (result.error) {
                    // Try inserting with only basic fields if extended fields fail
                    if (result.error.message?.includes('column') || result.error.message?.includes('does not exist')) {
                        console.warn('Extended invoice fields not available, using basic fields only. Please run the migration script.');
                        const basicInvoiceData = {
                            invoice_number: invoiceNumber,
                            booking_id: selectedBooking?.id || null,
                            customer_id: customerId,
                            total_amount: totalWithTax,
                            paid_amount: paidAmount,
                            remaining_amount: remainingAmount,
                            status: billForm.status || 'pending',
                            due_date: billForm.date || billDate || new Date().toISOString().split('T')[0],
                        };
                        const basicResult = await supabase
                            .from('invoices')
                            .insert([basicInvoiceData] as any)
                            .select('id')
                            .single();
                        if (basicResult.error) throw basicResult.error;
                        invoiceResult = basicResult.data;
                    } else {
                        throw result.error;
                    }
                } else {
                    invoiceResult = result.data;
                }
            } catch (error) {
                console.error('Invoice creation error:', error);
                throw error;
            }

            if (!invoiceResult) {
                throw new Error('Failed to create invoice');
            }

            // Insert multiple payments into payments table for receipts
            if ((billForm.bill_type === 'receipt_only' || billForm.bill_type === 'tax_invoice_receipt') && payments.length > 0 && invoiceResult) {
                const paymentDate = billForm.date || billDate || new Date().toISOString().split('T')[0];
                const paymentInserts = payments.map((payment) => ({
                    invoice_id: invoiceResult.id,
                    booking_id: selectedBooking?.id || null,
                    customer_id: customerId,
                    amount: Number(payment.amount) || 0,
                    payment_method: payment.payment_type || null,
                    transaction_id: null,
                    notes: null,
                    payment_date: payment.date || paymentDate,
                    created_by: null,
                }));

                const { error: paymentsError } = await supabase.from('payments').insert(paymentInserts as any);
                if (paymentsError) console.error('Error inserting payments:', paymentsError);
            }

            setAlert({ message: t('bill_created_successfully'), type: 'success' });

            // Log the activity with full invoice data
            const invoiceLogData = {
                ...invoiceData,
                id: invoiceResult.id,
                booking: selectedBooking,
            };

            await logActivity({ type: 'invoice_created', invoice: invoiceLogData });

            // Create document in Tranzila after successful invoice creation
            try {
                await createTranzilaDocument(invoiceResult.id, invoiceData, payments, selectedBooking);
            } catch (tranzilaError) {
                console.error('Tranzila document creation failed:', tranzilaError);
                // Don't fail the invoice creation, just log the error
            }

            // Update customer balance for invoices with payments
            if (customerId && (billForm.bill_type === 'receipt_only' || billForm.bill_type === 'tax_invoice_receipt')) {
                try {
                    const balanceUpdateSuccess = await handleReceiptCreated(
                        invoiceResult.id,
                        customerId,
                        invoiceData,
                        invoiceData.customer_name || 'Customer',
                        totalAmount,
                        payments
                    );
                    if (!balanceUpdateSuccess) {
                        console.warn('Failed to update customer balance for invoice:', invoiceResult.id);
                    }
                } catch (error) {
                    console.error('Error updating customer balance:', error);
                }
            } else if (invoiceData.customer_name && !customerId) {
                console.warn('Could not find customer for balance update:', invoiceData.customer_name);
            }

            // Redirect to bills list after a short delay
            setTimeout(() => {
                router.push('/invoices');
            }, 1500);
        } catch (error) {
            console.error(error);
            setAlert({
                message: t('error_creating_bill'),
                type: 'danger',
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="container mx-auto p-6 pb-24">
            <div className="flex items-center gap-5 mb-6">
                <div onClick={() => router.back()}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mb-4 cursor-pointer text-primary rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </div>
                {/* Breadcrumb Navigation */}
                <ul className="flex space-x-2 rtl:space-x-reverse mb-4">
                    <li>
                        <Link href="/" className="text-primary hover:underline">
                            {t('home')}
                        </Link>
                    </li>
                    <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                        <Link href="/" className="text-primary hover:underline">
                            {t('bills')}
                        </Link>
                    </li>
                    <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                        <span>{t('add_new_bill')}</span>
                    </li>
                </ul>
            </div>

            <div className="mb-6">
                <h1 className="text-2xl font-bold">{t('add_new_bill')}</h1>
                <p className="text-gray-500">{t('create_bill_description')}</p>
            </div>

            {alert && (
                <div className="fixed top-4 right-4 z-50 min-w-80 max-w-md">
                    <Alert type={alert.type} title={alert.type === 'success' ? t('success') : t('error')} message={alert.message} onClose={() => setAlert(null)} />
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Booking Selection */}
                <div className="panel bg-gradient-to-r from-primary/10 to-secondary/10 border-2 border-primary/20">
                    <div className="mb-5 flex items-center gap-3">
                        <IconMenuWidgets className="w-5 h-5 text-primary" />
                        <h5 className="text-xl font-bold text-primary dark:text-white-light">{t('select_booking') || t('booking')}</h5>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="form-label">{t('booking')} <span className="text-red-500">*</span></label>
                            <BookingSelect
                                bookings={bookings}
                                selectedBooking={selectedBooking}
                                onChange={(booking) => {
                                    if (!booking) {
                                        setSelectedBooking(null);
                                        setBillForm((prev) => ({
                                            ...prev,
                                            bill_type: '',
                                            customer_name: '',
                                            phone: '',
                                        }));
                                        return;
                                    }
                                    handleBookingSelect(booking);
                                }}
                                className="w-full"
                            />
                        </div>
                        {selectedBooking && (
                            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
                                <h6 className="font-semibold text-gray-800 dark:text-white mb-3">{t('booking_details') || 'Booking Details'}</h6>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('booking_number') || 'Booking Number'}:</label>
                                        <p className="text-sm text-gray-900 dark:text-white">{selectedBooking.booking_number}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('customer_name')}:</label>
                                        <p className="text-sm text-gray-900 dark:text-white">{selectedBooking.customer_name}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('phone')}:</label>
                                        <p className="text-sm text-gray-900 dark:text-white">{selectedBooking.customer_phone}</p>
                                    </div>
                                    {selectedBooking.customer_email && (
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('email')}:</label>
                                            <p className="text-sm text-gray-900 dark:text-white">{selectedBooking.customer_email}</p>
                                        </div>
                                    )}
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('service_type') || 'Service'}:</label>
                                        <p className="text-sm text-gray-900 dark:text-white">{selectedBooking.service_type}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('service_address') || 'Service Address'}:</label>
                                        <p className="text-sm text-gray-900 dark:text-white">{selectedBooking.service_address}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('scheduled_date') || 'Scheduled Date'}:</label>
                                        <p className="text-sm text-gray-900 dark:text-white">
                                            {selectedBooking.scheduled_date ? new Date(selectedBooking.scheduled_date).toLocaleDateString() : ''}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('scheduled_time') || 'Scheduled Time'}:</label>
                                        <p className="text-sm text-gray-900 dark:text-white">{selectedBooking.scheduled_time}</p>
                                    </div>
                                    {selectedBooking.truck_number && (
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('truck_number') || 'Truck'}:</label>
                                            <p className="text-sm text-gray-900 dark:text-white">{selectedBooking.truck_number}</p>
                                        </div>
                                    )}
                                    {selectedBooking.driver_name && (
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('driver')}:</label>
                                            <p className="text-sm text-gray-900 dark:text-white">{selectedBooking.driver_name}</p>
                                        </div>
                                    )}
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('status')}:</label>
                                        <p className="text-sm text-gray-900 dark:text-white">{t(`booking_status_${selectedBooking.status}`) || selectedBooking.status}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bill Type Selection - Show when booking is selected */}
                {selectedBooking && (
                    <div className="panel">
                        <div className="mb-5 flex items-center gap-3">
                            <IconDollarSign className="w-5 h-5 text-primary" />
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('bill_type')}</h5>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="form-label">{t('bill_type')} <span className="text-red-500">*</span></label>
                                <BillTypeSelect
                                    defaultValue={billForm.bill_type}
                                    onChange={(value) => {
                                        handleFormChange({ target: { name: 'bill_type', value } } as any);
                                    }}
                                    className="w-full"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Bill Date Selector - Show when booking is selected */}
                {selectedBooking && (
                    <div className="panel">
                        <div className="mb-5 flex items-center gap-3">
                            <IconCalendar className="w-5 h-5 text-primary" />
                            <div>
                                <h5 className="text-lg font-semibold dark:text-white-light">{t('bill_date')}</h5>
                                <p className="text-gray-600 dark:text-gray-400 mt-1">{t('select_bill_date_desc') || 'Select the date for this invoice'}</p>
                            </div>
                        </div>
                        <div className="relative">
                            <input
                                type="date"
                                value={billDate}
                                onChange={(e) => {
                                    const newDate = e.target.value;
                                    setBillDate(newDate);
                                    setBillForm((prev) => ({ ...prev, date: newDate }));
                                }}
                                className="form-input bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 text-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:w-5 [&::-webkit-calendar-picker-indicator]:h-5 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                                style={{ colorScheme: 'light' }}
                                required
                            />
                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                <IconCalendar className="w-5 h-5 text-gray-400" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Customer Information Display - Show when booking is selected */}
                {selectedBooking && (
                    <div className="panel">
                        <div className="mb-5 flex items-center gap-3">
                            <IconUser className="w-5 h-5 text-primary" />
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('customer_information')}</h5>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                            <h6 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">{t('customer_details')}</h6>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                                <div>
                                    <span className="text-blue-600 dark:text-blue-300 font-medium">{t('customer_name')}:</span>
                                    <p className="text-blue-800 dark:text-blue-100">{selectedBooking.customer_name}</p>
                                </div>
                                <div>
                                    <span className="text-blue-600 dark:text-blue-300 font-medium">{t('phone')}:</span>
                                    <p className="text-blue-800 dark:text-blue-100">{selectedBooking.customer_phone}</p>
                                </div>
                                {selectedBooking.customer_email && (
                                    <div>
                                        <span className="text-blue-600 dark:text-blue-300 font-medium">{t('email')}:</span>
                                        <p className="text-blue-800 dark:text-blue-100">{selectedBooking.customer_email}</p>
                                    </div>
                                )}
                                <div>
                                    <span className="text-blue-600 dark:text-blue-300 font-medium">{t('service_address') || 'Service Address'}:</span>
                                    <p className="text-blue-800 dark:text-blue-100">{selectedBooking.service_address}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Bill Direction Selector */}
                {billForm.bill_type && billForm.bill_type !== 'tax_invoice' && (
                    <div className="panel">
                        <div className="mb-5 flex items-center gap-3">
                            <IconDollarSign className="w-5 h-5 text-primary" />
                            <div>
                                <h5 className="text-lg font-semibold dark:text-white-light">{t('bill_direction')}</h5>
                                <p className="text-gray-600 dark:text-gray-400 mt-1">{t('select_bill_direction_desc')}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div
                                className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                                    billForm.bill_direction === 'positive'
                                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600'
                                }`}
                                onClick={() => handleFormChange({ target: { name: 'bill_direction', value: 'positive' } } as any)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-4 h-4 rounded-full border-2 ${billForm.bill_direction === 'positive' ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
                                        {billForm.bill_direction === 'positive' && <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>}
                                    </div>
                                    <div>
                                        <h6 className="font-semibold text-green-700 dark:text-green-300">+ {t('positive_bill')}</h6>
                                        <p className="text-sm text-green-600 dark:text-green-400">{t('positive_bill_desc')}</p>
                                    </div>
                                </div>
                            </div>
                            <div
                                className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                                    billForm.bill_direction === 'negative'
                                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-600'
                                }`}
                                onClick={() => handleFormChange({ target: { name: 'bill_direction', value: 'negative' } } as any)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-4 h-4 rounded-full border-2 ${billForm.bill_direction === 'negative' ? 'border-red-500 bg-red-500' : 'border-gray-300'}`}>
                                        {billForm.bill_direction === 'negative' && <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>}
                                    </div>
                                    <div>
                                        <h6 className="font-semibold text-red-700 dark:text-red-300">- {t('negative_bill')}</h6>
                                        <p className="text-sm text-red-600 dark:text-red-400">{t('negative_bill_desc')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {/* General Bill Section - Show when booking and general bill type are selected */}
                {selectedBooking && billForm.bill_type === 'general' && (
                    <div className="panel">
                        <div className="mb-5 flex items-center gap-3">
                            <IconDollarSign className="w-5 h-5 text-primary" />
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('general_bill_details')}</h5>
                        </div>
                        <div className="space-y-4">
                            {/* Bill Description */}
                            <div>
                                <label htmlFor="bill_description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('bill_description')} <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    id="bill_description"
                                    name="bill_description"
                                    rows={4}
                                    value={billForm.bill_description}
                                    onChange={handleFormChange}
                                    className="form-textarea"
                                    placeholder={t('enter_bill_description')}
                                    required
                                />
                            </div>
                            {/* Bill Amount */}
                            <div>
                                <label htmlFor="bill_amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('bill_amount')} <span className="text-red-500">*</span>
                                </label>
                                <div className="flex">
                                    <span className="inline-flex items-center px-3 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border border-r-0 border-gray-300 dark:border-gray-600 ltr:rounded-l-md rtl:rounded-r-md">
                                        ₪
                                    </span>
                                    <input
                                        type="number"
                                        id="bill_amount"
                                        name="bill_amount"
                                        step="0.01"
                                        min="0"
                                        value={billForm.bill_amount}
                                        onChange={handleFormChange}
                                        className="form-input ltr:rounded-l-none rtl:rounded-r-none"
                                        placeholder={t('enter_bill_amount')}
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {/* Tax Invoice Section - Show when bill type is tax_invoice */}
                {billForm.bill_type === 'tax_invoice' && selectedBooking && (
                    <>
                   

                        {/* Tax Invoice Details Table */}
                        <div className="panel">
                            <div className="mb-5 flex items-center gap-3">
                                <IconDollarSign className="w-5 h-5 text-primary" />
                                <h5 className="text-lg font-semibold dark:text-white-light">{t('tax_invoice_details') || 'Tax Invoice Details'}</h5>
                            </div>
                            <div className="bg-transparent rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                {/* Table Header */}
                                <div className="grid grid-cols-4 gap-4 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600">
                                    <div className="text-sm font-bold text-gray-700 dark:text-white text-right">{t('item') || 'Item'}</div>
                                    <div className="text-sm font-bold text-gray-700 dark:text-white text-center">{t('price') || 'Price'}</div>
                                    <div className="text-sm font-bold text-gray-700 dark:text-white text-center">{t('quantity') || 'Quantity'}</div>
                                    <div className="text-sm font-bold text-gray-700 dark:text-white text-center">{t('total') || 'Total'}</div>
                                </div>

                                {/* Row 1: Service Details */}
                                <div className="grid grid-cols-4 gap-4 mb-3 py-2">
                                    <div className="text-sm text-gray-700 dark:text-gray-300 text-right">
                                        <div className="font-medium">{t('service') || 'Service'}</div>
                                        <div className="text-xs text-gray-500">
                                            {(selectedBooking as any).service_name || selectedBooking.service_type || t('service')}
                                            {selectedBooking.service_address && ` - ${selectedBooking.service_address}`}
                                            {selectedBooking.booking_number && ` - #${selectedBooking.booking_number}`}
                                        </div>
                                        {(selectedBooking as any).service_description && (
                                            <div className="text-xs text-gray-400 mt-1">
                                                {(selectedBooking as any).service_description}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-center">-</div>
                                    <div className="text-center">-</div>
                                    <div className="text-center">-</div>
                                </div>

                                {/* Row 2: Service Price - Show only if total is set */}
                                {billForm.total && (
                                    <div className="grid grid-cols-4 gap-4 mb-4 py-2">
                                        <div className="text-sm text-gray-700 dark:text-gray-300 text-right">{t('service_price') || 'Service Price'}</div>
                                        <div className="text-center">
                                            <span className="text-sm text-gray-700 dark:text-gray-300">₪{parseFloat(billForm.total).toFixed(2)}</span>
                                        </div>
                                        <div className="text-center">
                                            <span className="text-sm text-gray-700 dark:text-gray-300">1</span>
                                        </div>
                                        <div className="text-center">
                                            <span className="text-sm text-gray-700 dark:text-gray-300">₪{parseFloat(billForm.total).toFixed(2)}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Separator */}
                                <div className="border-t border-gray-300 dark:border-gray-600 my-4"></div>

                                {/* Tax Calculations */}
                                {billForm.total && (
                                    <div className="space-y-3">
                                        {/* Price Before Tax */}
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('price_before_tax') || 'Price Before Tax'}:</span>
                                            <span className="text-sm text-gray-700 dark:text-gray-300">₪{billForm.total}</span>
                                        </div>

                                        {/* Tax - calculated as 18% of the price before tax */}
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('tax') || 'Tax'} 18%:</span>
                                            <span className="text-sm text-gray-700 dark:text-gray-300">₪{billForm.tax_amount || ((parseFloat(billForm.total) || 0) * 0.18).toFixed(2)}</span>
                                        </div>

                                        {/* Total Including Tax */}
                                        <div className="flex justify-between items-center pt-2 border-t border-gray-300 dark:border-gray-600">
                                            <span className="text-lg font-bold text-gray-700 dark:text-gray-300">{t('total_including_tax') || 'Total Including Tax'}:</span>
                                            <span className="text-lg font-bold text-primary">₪{billForm.total_with_tax || ((parseFloat(billForm.total) || 0) * 1.18).toFixed(2)}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Amount Input Section */}
                                <div className="mt-6 pt-6 border-t border-gray-300 dark:border-gray-600">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            {t('total_amount') || 'Total Amount'} <span className="text-red-500">*</span>
                                        </label>
                                        <div className="flex">
                                            <span className="inline-flex items-center px-3 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border border-r-0 border-gray-300 dark:border-gray-600 ltr:rounded-l-md rtl:rounded-r-md">
                                                ₪
                                            </span>
                                            <input
                                                type="number"
                                                name="total"
                                                step="0.01"
                                                min="0"
                                                value={billForm.total}
                                                onChange={handleFormChange}
                                                className="form-input ltr:rounded-l-none rtl:rounded-r-none"
                                                placeholder={t('enter_total_amount') || 'Enter total amount'}
                                                required
                                            />
                                        </div>
                                        {/* Show service price hint if available */}
                                        {(selectedBooking as any).service_price_private && !billForm.total && (
                                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                {t('suggested_price') || 'Suggested price'}: ₪{(selectedBooking as any).service_price_private} 
                                                {(selectedBooking as any).service_price_business && ` / ₪${(selectedBooking as any).service_price_business}`}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Notes Section */}
                        <div className="panel">
                            <div>
                                <label htmlFor="free_text" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('notes')}
                                </label>
                                <textarea
                                    id="free_text"
                                    name="free_text"
                                    rows={3}
                                    value={billForm.free_text || ''}
                                    onChange={handleFormChange}
                                    className="form-textarea"
                                    placeholder={t('enter_bill_notes') || 'Enter additional notes'}
                                />
                            </div>
                        </div>
                    </>
                )}
                {/* Receipt Section - Show when booking is selected and bill type is receipt_only */}
                {selectedBooking && billForm.bill_type === 'receipt_only' && (
                    <div className="panel">
                        <div className="mb-5 flex items-center gap-3">
                            <IconDollarSign className="w-5 h-5 text-primary" />
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('receipt_details') || 'Receipt Details'}</h5>
                        </div>
                        
                        {/* Service Information */}
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('service_type') || 'Service Type'}:</label>
                                <p className="text-lg text-gray-900 dark:text-white font-semibold">{selectedBooking.service_type}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('service_address') || 'Service Address'}:</label>
                                <p className="text-gray-900 dark:text-white">{selectedBooking.service_address}</p>
                            </div>
                        </div>

                        {/* Total Amount Input */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t('total_amount') || 'Total Amount'} <span className="text-red-500">*</span>
                            </label>
                            <div className="flex">
                                <span className="inline-flex items-center px-3 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border border-r-0 border-gray-300 dark:border-gray-600 ltr:rounded-l-md rtl:rounded-r-md">
                                    ₪
                                </span>
                                <input
                                    type="number"
                                    name="total"
                                    step="0.01"
                                    min="0"
                                    value={billForm.total}
                                    onChange={handleFormChange}
                                    className="form-input ltr:rounded-l-none rtl:rounded-r-none"
                                    placeholder={t('enter_total_amount') || 'Enter total amount'}
                                    required
                                />
                            </div>
                            {billForm.total && (
                                <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('total_amount') || 'Total Amount'}:</span>
                                        <span className="text-lg font-bold text-primary">₪{parseFloat(billForm.total) || 0}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Payment Form */}
                        <MultiplePaymentForm payments={payments} onPaymentsChange={setPayments} totalAmount={parseFloat(billForm.total) || 0} />
                    </div>
                )}
                {/* Submit Button */}
                {selectedBooking && billForm.bill_type && (
                    <div className="flex justify-end gap-4">
                        <button type="button" onClick={() => router.back()} className="btn btn-outline-danger">
                            {t('cancel')}
                        </button>
                        <button type="submit" className="btn btn-primary px-8" disabled={saving}>
                            {saving ? t('creating') || 'Creating...' : t('create_bill') || 'Create Invoice'}
                        </button>
                    </div>
                )}
            </form>
        </div>
    );
};

export default AddInvoice;
