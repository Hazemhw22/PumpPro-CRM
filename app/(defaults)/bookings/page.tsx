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
                const { data, error } = await supabase
                    .from('bookings')
                    .select('*')
                    .order('created_at', { ascending: false });
                if (error) throw error;
                setItems((data || []) as Booking[]);
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
                                        {t('id')} {sortStatus.columnAccessor === 'booking_number' && (sortStatus.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="cursor-pointer select-none" onClick={() => setSort('customer_name')}>
                                        {t('customer_name')} {sortStatus.columnAccessor === 'customer_name' && (sortStatus.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="cursor-pointer select-none" onClick={() => setSort('service_address')}>
                                        {t('service_address')} {sortStatus.columnAccessor === 'service_address' && (sortStatus.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="cursor-pointer select-none" onClick={() => setSort('customer_phone')}>
                                        {t('phone')} {sortStatus.columnAccessor === 'customer_phone' && (sortStatus.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="cursor-pointer select-none" onClick={() => setSort('created_at')}>
                                        {t('created_at')} {sortStatus.columnAccessor === 'created_at' && (sortStatus.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="text-center">{t('actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="py-10 text-center text-sm opacity-70">
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
                                        <td>{row.service_address || '-'}</td>
                                        <td>{row.customer_phone}</td>
                                        <td>
                                            {new Date(row.created_at).toLocaleDateString('en-GB', {
                                                year: 'numeric',
                                                month: '2-digit',
                                                day: '2-digit',
                                            })}
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
                            <select
                                className="form-select w-16 py-1 text-center text-sm"
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setPage(1);
                                }}
                            >
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
                                className="rounded-full border border-white-light p-2 text-sm opacity-80 hover:opacity-100 dark:border-[#17263c]"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                aria-label="Previous"
                            >
                                ‹
                            </button>
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-info text-white">{page}</span>
                            <button
                                type="button"
                                className="rounded-full border border-white-light p-2 text-sm opacity-80 hover:opacity-100 dark:border-[#17263c]"
                                onClick={() => setPage((p) => (to < totalRecords ? p + 1 : p))}
                                disabled={to >= totalRecords}
                                aria-label="Next"
                            >
                                ›
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