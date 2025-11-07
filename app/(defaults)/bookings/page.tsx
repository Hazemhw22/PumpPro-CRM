'use client';
import IconEdit from '@/components/icon/icon-edit';
import IconEye from '@/components/icon/icon-eye';
import IconPlus from '@/components/icon/icon-plus';
import IconTrashLines from '@/components/icon/icon-trash-lines';
import { sortBy } from 'lodash';
import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import ConfirmModal from '@/components/modals/confirm-modal';
import { getTranslation } from '@/i18n';

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
    const [loading, setLoading] = useState(true);

    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState<Booking[]>([]);
    const [records, setRecords] = useState<Booking[]>([]);
    const [selectedRecords, setSelectedRecords] = useState<Booking[]>([]);

    const [search, setSearch] = useState('');
    const [sortStatus, setSortStatus] = useState<{ columnAccessor: keyof Booking | 'created_at'; direction: 'asc' | 'desc' }>(
        {
            columnAccessor: 'created_at',
            direction: 'desc',
        },
    );

    // Modal and alert states
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                // Fetch bookings
                const { data: bookingsData, error: bookingsError } = await supabase
                    .from('bookings')
                    .select('*')
                    .order('created_at', { ascending: false });
                
                if (bookingsError) throw bookingsError;

                // Fetch related data separately
                const truckIds = Array.from(new Set(bookingsData?.map((b: any) => b.truck_id).filter(Boolean)));
                const driverIds = Array.from(new Set(bookingsData?.map((b: any) => b.driver_id).filter(Boolean)));
                const serviceIds = Array.from(new Set(bookingsData?.map((b: any) => b.service_type).filter(Boolean)));

                const [trucksRes, driversRes, servicesRes] = await Promise.all([
                    truckIds.length > 0 ? supabase.from('trucks').select('id, truck_number').in('id', truckIds) : { data: [] },
                    driverIds.length > 0 ? supabase.from('drivers').select('id, name').in('id', driverIds) : { data: [] },
                    serviceIds.length > 0 ? supabase.from('services').select('id, name').in('id', serviceIds) : { data: [] },
                ]);

                // Map related data
                const trucksMap = new Map((trucksRes.data || []).map((t: any) => [t.id, t]));
                const driversMap = new Map((driversRes.data || []).map((d: any) => [d.id, d]));
                const servicesMap = new Map((servicesRes.data || []).map((s: any) => [s.id, s]));

                // Combine data
                const enrichedBookings = bookingsData?.map((booking: any) => ({
                    ...booking,
                    truck: booking.truck_id ? trucksMap.get(booking.truck_id) : null,
                    driver: booking.driver_id ? driversMap.get(booking.driver_id) : null,
                    service_name: booking.service_type ? servicesMap.get(booking.service_type)?.name : null,
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
                const q = search.toLowerCase();
                return (
                    !q ||
                    item.booking_number.toLowerCase().includes(q) ||
                    item.customer_name.toLowerCase().includes(q) ||
                    item.customer_phone.toLowerCase().includes(q) ||
                    item.service_address.toLowerCase().includes(q) ||
                    item.service_type.toLowerCase().includes(q) ||
                    item.status.toLowerCase().includes(q)
                );
            }),
        );
    }, [items, search]);

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

    const isAllPageSelected = useMemo(
        () => records.length > 0 && records.every((r) => selectedRecords.some((s) => s.id === r.id)),
        [records, selectedRecords],
    );

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

    const setSort = (
        columnAccessor:
            | 'created_at'
            | 'booking_number'
            | 'customer_name'
            | 'service_address'
            | 'customer_phone',
    ) => {
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
                        <button type="button" className="btn btn-danger gap-2" disabled={selectedRecords.length === 0}>
                            <IconTrashLines />
                            {t('delete')}
                        </button>
                        <Link href="/bookings/add" className="btn btn-primary gap-2">
                            <IconPlus />
                            {t('add_new_booking')}
                        </Link>
                    </div>
                    <div className="ltr:ml-auto rtl:mr-auto">
                        <input
                            type="text"
                            className="form-input w-auto"
                            placeholder={t('search')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="relative px-5 pb-5">
                    <div className="overflow-auto rounded-md">
                        <table className="table-hover whitespace-nowrap rtl-table-headers">
                            <thead>
                                <tr>
                                    <th className="w-10">
                                        <input
                                            type="checkbox"
                                            className="form-checkbox outline-primary"
                                            checked={isAllPageSelected}
                                            onChange={toggleSelectAllOnPage}
                                        />
                                    </th>
                                    <th className="cursor-pointer select-none" onClick={() => setSort('booking_number')}>
                                        Booking # {sortStatus.columnAccessor === 'booking_number' && (sortStatus.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="cursor-pointer select-none" onClick={() => setSort('customer_name')}>
                                        Customer {sortStatus.columnAccessor === 'customer_name' && (sortStatus.direction === 'asc' ? '↑' : '↓')}
                                    </th>
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
                                {records.length === 0 && (
                                    <tr>
                                        <td colSpan={13} className="py-10 text-center text-sm opacity-70">
                                            {t('no_records') || 'No records'}
                                        </td>
                                    </tr>
                                )}
                                {records.map((row) => (
                                    <tr key={row.id}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                className="form-checkbox outline-primary"
                                                checked={selectedRecords.some((s) => s.id === row.id)}
                                                onChange={() => toggleRow(row)}
                                            />
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <strong className="text-info">#{row.booking_number || row.id}</strong>
                                                <Link href={`/bookings/preview/${row.id}`} className="flex hover:text-info" title={t('view')}>
                                                    <IconEye className="h-4 w-4" />
                                                </Link>
                                            </div>
                                        </td>
                                        <td className="font-semibold">{row.customer_name}</td>
                                        <td>
                                            {(row as any).service_name || (row as any).service_type || '-'}
                                        </td>
                                        <td className="max-w-xs truncate">{row.service_address || '-'}</td>
                                        <td>
                                            {row.scheduled_date && row.scheduled_time
                                                ? `${new Date(row.scheduled_date).toLocaleDateString('en-GB')} ${row.scheduled_time}`
                                                : '-'}
                                        </td>
                                        <td>${(row as any).price || 0}</td>
                                        <td>${(row as any).profit || 0}</td>
                                        <td>
                                            <span className="badge badge-outline-info">{(row as any).payment_status || 'Pending'}</span>
                                        </td>
                                        <td>{(row as any).truck?.truck_number || '-'}</td>
                                        <td>{(row as any).driver?.name || '-'}</td>
                                        <td>
                                            <span className={`badge ${statusBadge(row.status)}`}>
                                                {row.status?.replace('_', ' ') || 'pending'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="mx-auto flex w-max items-center gap-2">
                                                <Link href={`/bookings/edit/${row.id}`} className="flex hover:text-info">
                                                    <IconEdit className="h-4.5 w-4.5" />
                                                </Link>
                                                <button type="button" className="flex hover:text-danger" onClick={() => deleteRow(row.id)}>
                                                    <IconTrashLines />
                                                </button>
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
                                                   <button
                                                       type="button"
                                                       className="btn btn-sm btn-outline-primary disabled:opacity-50"
                                                       disabled={page === 1}
                                                       onClick={() => setPage(page - 1)}
                                                   >
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
                                                                   <button
                                                                       type="button"
                                                                       className={`btn btn-sm ${page === p ? 'btn-primary' : 'btn-outline-primary'}`}
                                                                       onClick={() => setPage(p)}
                                                                   >
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

                    {loading && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-sm dark:bg-black-dark-light/60" />
                    )}
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