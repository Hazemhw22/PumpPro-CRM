'use client';
import IconEdit from '@/components/icon/icon-edit';
import IconEye from '@/components/icon/icon-eye';
import IconPlus from '@/components/icon/icon-plus';
import IconTrashLines from '@/components/icon/icon-trash-lines';
import IconPdf from '@/components/icon/icon-pdf';
import IconCheck from '@/components/icon/icon-check';
import { sortBy } from 'lodash';
import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
/* eslint-disable react-hooks/exhaustive-deps */
import { supabase } from '@/lib/supabase/client';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import ConfirmModal from '@/components/modals/confirm-modal';
import { getTranslation } from '@/i18n';
import BookingsFilters, { BookingFilters as BookingFiltersType } from '@/components/bookings-filters/bookings-filters';
import { InvoiceDealPDFGenerator } from '@/components/pdf/invoice-deal-pdf';

interface Booking {
    id: string;
    created_at: string;
    booking_number: string;
    customer_name: string;
    customer_phone: string;
    service_address: string;
    scheduled_date: string;
    scheduled_time: string;
    status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
    service_type: string;
}

const BookingsList = () => {
    const { t } = getTranslation();
    const [items, setItems] = useState<Booking[]>([]);
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState<Booking[]>([]);
    const [records, setRecords] = useState<Booking[]>([]);
    const [selectedRecords, setSelectedRecords] = useState<Booking[]>([]);

    const [filters, setFilters] = useState<BookingFiltersType>({ search: '', status: '', serviceType: '', dateFrom: '', dateTo: '' });
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [sortStatus, setSortStatus] = useState<{ columnAccessor: keyof Booking | 'created_at'; direction: 'asc' | 'desc' }>({
        columnAccessor: 'created_at',
        direction: 'desc',
    });

    // Modal and alert states
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        const fetchBookings = async () => {
            try {
                // Determine role and related ids
                let role: string | null = null;
                let contractorId: string | null = null;
                let driverId: string | null = null;
                try {
                    const {
                        data: { user },
                    } = await supabase.auth.getUser();
                    if (user) {
                        // @ts-ignore
                        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
                        role = (profile as any)?.role || null;
                        setRole(role);
                        if (role === 'contractor') {
                            // @ts-ignore
                            let { data: c } = await supabase.from('contractors').select('id, email').eq('user_id', user.id).maybeSingle();
                            contractorId = (c as any)?.id || null;
                            // Fallback by email if user_id not linked
                            if (!contractorId && (user as any).email) {
                                // @ts-ignore
                                const { data: c2 } = await supabase
                                    .from('contractors')
                                    .select('id')
                                    .eq('email', (user as any).email)
                                    .maybeSingle();
                                contractorId = (c2 as any)?.id || null;
                            }
                        } else if (role === 'driver') {
                            // @ts-ignore
                            let { data: d } = await supabase.from('drivers').select('id, email').eq('user_id', user.id).maybeSingle();
                            driverId = (d as any)?.id || null;
                            if (!driverId && (user as any).email) {
                                // @ts-ignore
                                const { data: d2 } = await supabase
                                    .from('drivers')
                                    .select('id')
                                    .eq('email', (user as any).email)
                                    .maybeSingle();
                                driverId = (d2 as any)?.id || null;
                            }
                        }
                    }
                } catch (e) {
                    // ignore
                }

                // Enforce role-based filtering strictly
                if (role === 'contractor' && !contractorId) {
                    setItems([] as any);
                    setInitialRecords([] as any);
                    setLoading(false);
                    return;
                }
                if (role === 'driver' && !driverId) {
                    setItems([] as any);
                    setInitialRecords([] as any);
                    setLoading(false);
                    return;
                }

                // Fetch bookings with optional role filter
                let bookingsQuery: any = supabase.from('bookings').select('*');
                if (role === 'contractor') bookingsQuery = bookingsQuery.eq('contractor_id', contractorId);
                if (role === 'driver') bookingsQuery = bookingsQuery.eq('driver_id', driverId);

                const { data: bookingsData, error: bookingsError } = await bookingsQuery.order('created_at', { ascending: false });

                if (bookingsError) throw bookingsError;

                // Fetch related data separately
                const truckIds = Array.from(new Set(bookingsData?.map((b: any) => b.truck_id).filter(Boolean)));
                const driverIds = Array.from(new Set(bookingsData?.map((b: any) => b.driver_id).filter(Boolean)));
                const serviceIds = Array.from(new Set(bookingsData?.map((b: any) => b.service_type).filter(Boolean)));
                const contractorIds = Array.from(new Set(bookingsData?.map((b: any) => b.contractor_id).filter(Boolean)));

                const [trucksRes, driversRes, servicesRes, contractorsRes] = await Promise.all([
                    truckIds.length > 0 ? supabase.from('trucks').select('id, truck_number').in('id', truckIds) : { data: [] },
                    driverIds.length > 0 ? supabase.from('drivers').select('id, name').in('id', driverIds) : { data: [] },
                    serviceIds.length > 0 ? supabase.from('services').select('id, name').in('id', serviceIds) : { data: [] },
                    contractorIds.length > 0 ? supabase.from('contractors').select('id, name').in('id', contractorIds) : { data: [] },
                ]);

                // Map related data
                const trucksMap = new Map((trucksRes.data || []).map((t: any) => [t.id, t]));
                const driversMap = new Map((driversRes.data || []).map((d: any) => [d.id, d]));
                const servicesMap = new Map((servicesRes.data || []).map((s: any) => [s.id, s]));
                const contractorsMap = new Map((contractorsRes.data || []).map((c: any) => [c.id, c]));

                // Combine data
                const enrichedBookings = bookingsData?.map((booking: any) => ({
                    ...booking,
                    truck: booking.truck_id ? trucksMap.get(booking.truck_id) : null,
                    driver: booking.driver_id ? driversMap.get(booking.driver_id) : null,
                    service_name: booking.service_type ? servicesMap.get(booking.service_type)?.name : null,
                    contractor: booking.contractor_id ? contractorsMap.get(booking.contractor_id) : null,
                }));

                setItems((enrichedBookings || []) as Booking[]);
            } catch (error) {
                console.error('Error fetching bookings:', error);
                setAlert({ visible: true, message: t('error_loading_data'), type: 'danger' });
            } finally {
                setLoading(false);
            }
        };
        fetchBookings();
    }, []);

    useEffect(() => {
        setPage(1);
    }, [pageSize]);

    useEffect(() => {
        const data = sortBy(initialRecords, (x) => {
            const key = sortStatus.columnAccessor as string;
            if (key === 'created_at') return new Date((x as any)[key]).getTime();
            const v = (x as any)[key];
            return typeof v === 'string' ? v.toLowerCase() : v;
        });
        const sortedData = sortStatus.direction === 'desc' ? data.reverse() : data;
        const from = (page - 1) * pageSize;
        const to = from + pageSize;
        setRecords(sortedData.slice(from, to));
    }, [page, pageSize, sortStatus, initialRecords]);

    useEffect(() => {
        setInitialRecords(
            items.filter((item) => {
                // status filter
                if (filters.status && item.status !== filters.status) return false;

                // service type filter
                if (filters.serviceType && !(item.service_type || '').toLowerCase().includes(filters.serviceType.toLowerCase())) return false;

                // search filter
                const q = (filters.search || '').toLowerCase();
                if (q) {
                    const matches =
                        (item.booking_number || '').toLowerCase().includes(q) ||
                        (item.customer_name || '').toLowerCase().includes(q) ||
                        (item.customer_phone || '').toLowerCase().includes(q) ||
                        (item.service_address || '').toLowerCase().includes(q) ||
                        (item.service_type || '').toLowerCase().includes(q) ||
                        (item.status || '').toLowerCase().includes(q);
                    if (!matches) return false;
                }

                // date range filter (use scheduled_date if available)
                if (filters.dateFrom || filters.dateTo) {
                    const itemDate = item.scheduled_date ? new Date(item.scheduled_date) : new Date(item.created_at);
                    const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null;
                    const dateTo = filters.dateTo ? new Date(filters.dateTo) : null;
                    if (dateFrom && itemDate < dateFrom) return false;
                    if (dateTo && itemDate > dateTo) return false;
                }

                return true;
            }),
        );
    }, [items, filters]);

    useEffect(() => {
        setPage(1);
    }, [pageSize]);

    const toggleSelectAllOnPage = () => {
        const pageIds = new Set(records.map((r) => r.id));
        const allSelected = records.every((r) => selectedRecords.some((s) => s.id === r.id));
        if (allSelected) {
            setSelectedRecords((prev) => prev.filter((s) => !pageIds.has(s.id)));
        } else {
            const byId = new Set(selectedRecords.map((s) => s.id));
            const merged = [...selectedRecords];
            records.forEach((r) => {
                if (!byId.has(r.id)) merged.push(r);
            });
            setSelectedRecords(merged);
        }
    };

    const toggleRow = (row: Booking) => {
        setSelectedRecords((prev) => {
            const exists = prev.some((s) => s.id === row.id);
            if (exists) return prev.filter((s) => s.id !== row.id);
            return [...prev, row];
        });
    };

    const isAllPageSelected = useMemo(() => records.length > 0 && records.every((r) => selectedRecords.some((s) => s.id === r.id)), [records, selectedRecords]);

    const statusBadge = (status?: string) => {
        switch (status) {
            case 'confirmed':
                return 'badge-outline-success';
            case 'in_progress':
                return 'badge-outline-info';
            case 'completed':
                return 'badge-outline-primary';
            case 'cancelled':
                return 'badge-outline-danger';
            default:
                return 'badge-outline-warning';
        }
    };

    const deleteRow = (id: string | null = null) => {
        if (id) {
            const booking = items.find((b) => b.id === id);
            if (booking) {
                setBookingToDelete(booking);
                setShowConfirmModal(true);
            }
        }
    };

    const createInvoiceFromBooking = async (bookingId: string) => {
        try {
            // Check if invoice already exists
            const { data: existingInvoice } = await supabase.from('invoices').select('id').eq('booking_id', bookingId).maybeSingle();

            if (existingInvoice) {
                setAlert({ visible: true, message: t('invoice_already_exists'), type: 'danger' });
                return;
            }

            // Get booking details
            const booking = items.find((b) => b.id === bookingId);
            if (!booking) {
                setAlert({ visible: true, message: t('booking_not_found'), type: 'danger' });
                return;
            }

            // Create invoice
            const invoiceData = {
                booking_id: bookingId,
                customer_id: (booking as any).customer_id || null,
                customer_name: booking.customer_name,
                customer_phone: booking.customer_phone,
                service_name: (booking as any).service_name || booking.service_type,
                total_amount: (booking as any).price || 0,
                paid_amount: 0,
                remaining_amount: (booking as any).price || 0,
                status: 'pending',
                invoice_type: 'tax_invoice',
                invoice_date: new Date().toISOString().split('T')[0],
                due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
            };

            // @ts-ignore - supabase types are loose in this project
            const { data: newInvoice, error } = await supabase.from('invoices').insert([invoiceData]).select().single();

            if (error) throw error;

            setAlert({ visible: true, message: t('invoice_created_successfully'), type: 'success' });

            // Refresh the bookings list
            const updatedItems = items.map((item) => (item.id === bookingId ? { ...item, has_invoice: true } : item));
            setItems(updatedItems as any);
        } catch (error) {
            console.error('Error creating invoice:', error);
            setAlert({ visible: true, message: t('error_creating_invoice'), type: 'danger' });
        }
    };

    const confirmDeletion = async () => {
        if (!bookingToDelete) return;
        try {
            const { error } = await supabase.from('bookings').delete().eq('id', bookingToDelete.id);
            if (error) throw error;

            const updatedItems = items.filter((b) => b.id !== bookingToDelete.id);
            setItems(updatedItems);
            setAlert({ visible: true, message: t('booking_deleted_successfully'), type: 'success' });
        } catch (error) {
            console.error('Deletion error:', error);
            setAlert({ visible: true, message: t('error_deleting_booking'), type: 'danger' });
        } finally {
            setShowConfirmModal(false);
            setBookingToDelete(null);
        }
    };

    const handleDownloadBookingPdf = async (row: Booking) => {
        try {
            const language: 'en' | 'he' | 'ar' = 'en';

            const provider: any = (row as any).contractor || (row as any).driver || null;

            const data: any = {
                company: {
                    name: 'PumpPro CRM',
                    phone: '',
                    address: '',
                    tax_id: '',
                    logo_url: '/assets/images/logo.png',
                },
                invoice: null,
                booking: {
                    booking_number: (row as any).booking_number,
                    service_type: (row as any).service_type,
                    service_address: (row as any).service_address,
                    scheduled_date: (row as any).scheduled_date,
                    scheduled_time: (row as any).scheduled_time,
                    notes: (row as any).notes,
                    contractor_id: (row as any).contractor_id,
                    driver_id: (row as any).driver_id,
                },
                contractor: provider
                    ? {
                          name: provider.name,
                          phone: provider.phone || undefined,
                      }
                    : undefined,
                customer: {
                    name: (row as any).customer_name,
                    phone: (row as any).customer_phone,
                    address: (row as any).service_address,
                },
                service: {
                    name: (row as any).service_name || (row as any).service_type,
                },
                lang: language,
                no_price: true,
            };

            await InvoiceDealPDFGenerator.generatePDF(data, `booking-${(row as any).booking_number || row.id}.pdf`, 'invoice');
        } catch (error) {
            console.error('Error generating booking PDF:', error);
            setAlert({ visible: true, message: t('error_generating_pdf') || 'Error generating PDF', type: 'danger' });
        }
    };

    const handleConfirmBooking = async (row: Booking) => {
        if (row.status === 'confirmed') return;
        try {
            // @ts-ignore - relax supabase typing for bookings update
            const { error: updateError } = await (supabase as any)
                .from('bookings')
                .update({ status: 'confirmed' })
                .eq('id', row.id);
            if (updateError) throw updateError;

            // @ts-ignore
            const { error: trackError } = await supabase
                .from('booking_tracks')
                .insert([
                    {
                        booking_id: row.id,
                        old_status: (row as any).status,
                        new_status: 'confirmed',
                        created_at: new Date().toISOString(),
                    },
                ] as any);

            if (trackError) {
                console.error('Could not insert booking track:', trackError);
            }

            setItems((prev) => prev.map((b) => (b.id === row.id ? ({ ...b, status: 'confirmed' } as any) : b)) as any);
            setAlert({ visible: true, message: t('booking_confirmed') || 'Booking confirmed', type: 'success' });
        } catch (error) {
            console.error('Error confirming booking:', error);
            setAlert({ visible: true, message: t('error_confirming_booking') || 'Error confirming booking', type: 'danger' });
        }
    };

    const setSort = (columnAccessor: 'created_at' | 'booking_number' | 'customer_name' | 'service_address' | 'customer_phone') => {
        setSortStatus((curr) => {
            if (curr.columnAccessor === columnAccessor) {
                return { columnAccessor, direction: curr.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { columnAccessor, direction: 'asc' };
        });
    };

    const totalRecords = initialRecords.length;
    const from = totalRecords === 0 ? 0 : (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, totalRecords);

    return (
        <div className="panel border-white-light px-0 dark:border-[#1b2e4b]">
            {alert.visible && (
                <div className="mb-4 ml-4 max-w-96">
                    <Alert
                        type={alert.type}
                        title={alert.type === 'success' ? t('success') : t('error')}
                        message={alert.message}
                        onClose={() => setAlert({ visible: false, message: '', type: 'success' })}
                    />
                </div>
            )}
            <div className="invoice-table">
                <div className="mb-4.5 flex flex-col gap-5 px-5 md:flex-row md:items-center">
                    <div className="flex items-center gap-2">
                        {role === 'admin' && (
                            <>
                                <button type="button" className="btn btn-danger gap-2" disabled={selectedRecords.length === 0}>
                                    <IconTrashLines />
                                    {t('delete')}
                                </button>
                                <Link href="/bookings/add" className="btn btn-primary gap-2">
                                    <IconPlus />
                                    {t('add_new_booking')}
                                </Link>
                            </>
                        )}
                    </div>
                    <div className="flex-grow">
                        <BookingsFilters
                            onFilterChange={setFilters}
                            onClearFilters={() =>
                                setFilters({
                                    search: '',
                                    status: '',
                                    serviceType: '',
                                    dateFrom: '',
                                    dateTo: '',
                                })
                            }
                            viewMode={viewMode}
                            onViewModeChange={setViewMode}
                        />
                    </div>
                </div>

                <div className="relative px-5 pb-5">
                    <div className="overflow-x-auto overflow-y-hidden rounded-md">
                        <table className="table-hover whitespace-nowrap rtl-table-headers">
                            <thead>
                                <tr>
                                    <th className="w-10">
                                        <input type="checkbox" className="form-checkbox outline-primary" checked={isAllPageSelected} onChange={toggleSelectAllOnPage} />
                                    </th>
                                    <th className="cursor-pointer select-none" onClick={() => setSort('booking_number')}>
                                        Booking # {sortStatus.columnAccessor === 'booking_number' && (sortStatus.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="cursor-pointer select-none" onClick={() => setSort('customer_name')}>
                                        Customer {sortStatus.columnAccessor === 'customer_name' && (sortStatus.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th>Contractor</th>
                                    <th>Service</th>
                                    <th className="cursor-pointer select-none" onClick={() => setSort('service_address')}>
                                        Address {sortStatus.columnAccessor === 'service_address' && (sortStatus.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th>Date & Time</th>
                                    <th>Price</th>
                                    <th>Profit</th>
                                    <th>Payment</th>
                                    <th>Truck</th>
                                    <th>Driver</th>
                                    <th>Status</th>
                                    <th className="text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Empty-state row intentionally removed to avoid showing "No records" placeholder */}
                                {records.map((row) => (
                                    <tr key={row.id}>
                                        <td>
                                            <input type="checkbox" className="form-checkbox outline-primary" checked={selectedRecords.some((s) => s.id === row.id)} onChange={() => toggleRow(row)} />
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <strong className="text-info">#{row.booking_number || row.id}</strong>
                                                {role !== 'contractor' && role !== 'driver' && (
                                                    <Link href={`/bookings/preview/${row.id}`} className="flex hover:text-info" title={t('view')}>
                                                        <IconEye className="h-4 w-4" />
                                                    </Link>
                                                )}
                                            </div>
                                        </td>
                                        <td className="font-semibold">{row.customer_name}</td>
                                        <td>{(row as any).contractor?.name || '-'}</td>
                                        <td>{(row as any).service_name || (row as any).service_type || '-'}</td>
                                        <td className="max-w-xs truncate">{row.service_address || '-'}</td>
                                        <td>{row.scheduled_date && row.scheduled_time ? `${new Date(row.scheduled_date).toLocaleDateString('en-GB')} ${row.scheduled_time}` : '-'}</td>
                                        <td>${(row as any).price || 0}</td>
                                        <td>${(row as any).profit || 0}</td>
                                        <td>
                                            <span className="badge badge-outline-info">{(row as any).payment_status || 'Pending'}</span>
                                        </td>
                                        <td>{(row as any).truck?.truck_number || '-'}</td>
                                        <td>{(row as any).driver?.name || '-'}</td>
                                        <td>
                                            <span className={`badge ${statusBadge(row.status)}`}>{row.status?.replace('_', ' ') || 'pending'}</span>
                                        </td>
                                        <td>
                                            <div className="mx-auto flex w-max items-center gap-2">
                                                {role === 'admin' && (
                                                    <>
                                                        <Link href={`/bookings/edit/${row.id}`} className="flex hover:text-info">
                                                            <IconEdit className="h-4.5 w-4.5" />
                                                        </Link>
                                                        <button type="button" className="flex hover:text-danger" onClick={() => deleteRow(row.id)}>
                                                            <IconTrashLines />
                                                        </button>
                                                    </>
                                                )}
                                                {(role === 'contractor' || role === 'driver') && (
                                                    <>
                                                        <button type="button" className="flex hover:text-info" onClick={() => handleDownloadBookingPdf(row)}>
                                                            <IconPdf className="h-4.5 w-4.5" />
                                                        </button>
                                                        {row.status !== 'confirmed' && (
                                                            <button type="button" className="flex hover:text-success" onClick={() => handleConfirmBooking(row)}>
                                                                <IconCheck className="h-4.5 w-4.5" />
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-3 text-sm opacity-80">
                            <span>
                                {t('showing') || 'Showing'} {from} {t('to') || 'to'} {to} {t('of') || 'of'} {totalRecords} {t('entries') || 'entries'}
                            </span>
                            <select className="form-select w-20 py-1 text-sm" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                                {PAGE_SIZES.map((size) => (
                                    <option key={size} value={size}>
                                        {size}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <button type="button" className="btn btn-sm btn-outline-primary disabled:opacity-50" disabled={page === 1} onClick={() => setPage(page - 1)}>
                                Previous
                            </button>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: Math.ceil(totalRecords / pageSize) }, (_, i) => i + 1)
                                    .filter((p) => {
                                        if (Math.ceil(totalRecords / pageSize) <= 5) return true;
                                        if (p === 1 || p === Math.ceil(totalRecords / pageSize)) return true;
                                        if (p >= page - 1 && p <= page + 1) return true;
                                        return false;
                                    })
                                    .map((p, i, arr) => (
                                        <React.Fragment key={p}>
                                            {i > 0 && arr[i - 1] !== p - 1 && <span className="px-1">...</span>}
                                            <button type="button" className={`btn btn-sm ${page === p ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setPage(p)}>
                                                {p}
                                            </button>
                                        </React.Fragment>
                                    ))}
                            </div>
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-primary disabled:opacity-50"
                                disabled={page === Math.ceil(totalRecords / pageSize)}
                                onClick={() => setPage(page + 1)}
                            >
                                Next
                            </button>
                        </div>
                    </div>

                    {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-sm dark:bg-black-dark-light/60" />}
                </div>
            </div>

            <ConfirmModal
                isOpen={showConfirmModal}
                title={t('confirm_deletion')}
                message={t('confirm_delete_booking')}
                onCancel={() => {
                    setShowConfirmModal(false);
                    setBookingToDelete(null);
                }}
                onConfirm={confirmDeletion}
                confirmLabel={t('delete')}
                cancelLabel={t('cancel')}
                size="sm"
            />
        </div>
    );
};

export default BookingsList;
