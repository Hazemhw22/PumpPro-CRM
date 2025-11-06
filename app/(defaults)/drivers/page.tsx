'use client';
import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import { sortBy } from 'lodash';
import IconPlus from '@/components/icon/icon-plus';
import IconEdit from '@/components/icon/icon-edit';
import IconTrashLines from '@/components/icon/icon-trash-lines';
import IconEye from '@/components/icon/icon-eye';
import { supabase } from '@/lib/supabase/client';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';

interface Driver {
    id: string;
    created_at: string;
    driver_number?: string;
    name?: string;
    phone?: string;
    email?: string;
    license_number?: string;
    license_expiry?: string;
    status?: 'active' | 'inactive' | 'on_leave';
    notes?: string;
    photo_url?: string;
    updated_at?: string;
}

export default function DriversList() {
    const [items, setItems] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);

    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState<Driver[]>([]);
    const [records, setRecords] = useState<Driver[]>([]);
    const [selectedRecords, setSelectedRecords] = useState<Driver[]>([]);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'on_leave'>('all');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [sortStatus, setSortStatus] = useState<{ columnAccessor: keyof Driver | 'created_at'; direction: 'asc' | 'desc' }>({
        columnAccessor: 'created_at',
        direction: 'desc',
    });

    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        fetchDrivers();
    }, []);

    const fetchDrivers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('drivers').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setItems(data || []);
            setInitialRecords(data || []);
        } catch (err) {
            console.error('Error fetching drivers:', err);
            setAlert({ visible: true, message: 'Failed to load drivers', type: 'danger' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let filtered = [...initialRecords];
        if (statusFilter !== 'all') {
            filtered = filtered.filter((d) => d.status === statusFilter);
        }
        if (search) {
            filtered = filtered.filter((d) => {
                return (
                    d.name?.toLowerCase().includes(search.toLowerCase()) ||
                    d.driver_number?.toLowerCase().includes(search.toLowerCase()) ||
                    d.phone?.toLowerCase().includes(search.toLowerCase()) ||
                    d.license_number?.toLowerCase().includes(search.toLowerCase())
                );
            });
        }
        setItems(filtered);
        setPage(1);
    }, [search, statusFilter, initialRecords]);

    useEffect(() => {
        const from = (page - 1) * pageSize;
        const to = from + pageSize;
        setRecords(items.slice(from, to));
    }, [page, pageSize, items]);

    useEffect(() => {
        const sorted = sortBy(items, sortStatus.columnAccessor);
        setItems(sortStatus.direction === 'asc' ? sorted : sorted.reverse());
    }, [sortStatus]);

    const setSort = (col: keyof Driver | 'created_at') => {
        setSortStatus((prev) => ({
            columnAccessor: col,
            direction: prev.columnAccessor === col && prev.direction === 'asc' ? 'desc' : 'asc',
        }));
    };

    const deleteRow = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this driver?')) {
            try {
                const { error } = await (supabase as any).from('drivers').delete().eq('id', id);
                if (error) throw error;
                setAlert({ visible: true, message: 'Driver deleted successfully', type: 'success' });
                fetchDrivers();
            } catch (err) {
                setAlert({ visible: true, message: 'Failed to delete driver', type: 'danger' });
            }
        }
    };

    const toggleRow = (row: Driver) => {
        setSelectedRecords((prev) => (prev.some((s) => s.id === row.id) ? prev.filter((s) => s.id !== row.id) : [...prev, row]));
    };

    const isAllPageSelected = useMemo(() => {
        return records.length > 0 && records.every((row) => selectedRecords.some((s) => s.id === row.id));
    }, [records, selectedRecords]);

    const toggleSelectAllOnPage = () => {
        if (isAllPageSelected) {
            setSelectedRecords((prev) => prev.filter((s) => !records.some((r) => r.id === s.id)));
        } else {
            setSelectedRecords((prev) => {
                const newSelections = records.filter((r) => !prev.some((s) => s.id === r.id));
                return [...prev, ...newSelections];
            });
        }
    };

    const statusBadge = (status?: string) => {
        switch (status) {
            case 'active':
                return 'badge-outline-success';
            case 'inactive':
                return 'badge-outline-danger';
            case 'on_leave':
                return 'badge-outline-warning';
            default:
                return 'badge-outline-secondary';
        }
    };

    const totalRecords = items.length;
    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, totalRecords);
    const totalPages = Math.ceil(totalRecords / pageSize);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <span className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-primary border-l-transparent"></span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {alert.visible && (
                <Alert type={alert.type} message={alert.message} onClose={() => setAlert({ ...alert, visible: false })} />
            )}

            <div className="panel">
                <div className="mb-5 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                    <h5 className="text-lg font-semibold dark:text-white-light">Drivers</h5>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            className={`btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setStatusFilter('all')}
                        >
                            All
                        </button>
                        <button
                            type="button"
                            className={`btn btn-sm ${statusFilter === 'active' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setStatusFilter('active')}
                        >
                            Active
                        </button>
                        <button
                            type="button"
                            className={`btn btn-sm ${statusFilter === 'inactive' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setStatusFilter('inactive')}
                        >
                            Inactive
                        </button>
                        <button
                            type="button"
                            className={`btn btn-sm ${statusFilter === 'on_leave' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setStatusFilter('on_leave')}
                        >
                            On Leave
                        </button>
                    </div>
                    <div className="flex items-center gap-2 ltr:ml-auto rtl:mr-auto">
                        <div className="hidden items-center gap-1 sm:flex">
                            <button
                                type="button"
                                className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-outline-primary'}`}
                                onClick={() => setViewMode('list')}
                            >
                                List
                            </button>
                            <button
                                type="button"
                                className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline-primary'}`}
                                onClick={() => setViewMode('grid')}
                            >
                                Grid
                            </button>
                        </div>
                        <input
                            type="text"
                            className="form-input w-auto"
                            placeholder="Search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <Link href="/drivers/add" className="btn btn-primary gap-2">
                            <IconPlus />
                            Add New
                        </Link>
                    </div>
                </div>

                <div className="relative px-5 pb-5">
                    {viewMode === 'list' ? (
                        <div className="overflow-auto rounded-md">
                            <table className="table-hover whitespace-nowrap rtl-table-headers">
                                <thead>
                                    <tr>
                                        <th className="w-10">
                                            <input type="checkbox" className="form-checkbox outline-primary" checked={isAllPageSelected} onChange={toggleSelectAllOnPage} />
                                        </th>
                                        <th className="cursor-pointer select-none" onClick={() => setSort('driver_number')}>
                                            Driver Number {sortStatus.columnAccessor === 'driver_number' && (sortStatus.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th>Photo</th>
                                        <th className="cursor-pointer select-none" onClick={() => setSort('name')}>
                                            Name {sortStatus.columnAccessor === 'name' && (sortStatus.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="cursor-pointer select-none" onClick={() => setSort('phone')}>
                                            Phone {sortStatus.columnAccessor === 'phone' && (sortStatus.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="cursor-pointer select-none" onClick={() => setSort('license_number')}>
                                            License {sortStatus.columnAccessor === 'license_number' && (sortStatus.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="cursor-pointer select-none" onClick={() => setSort('status')}>
                                            Status {sortStatus.columnAccessor === 'status' && (sortStatus.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {records.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="py-10 text-center text-sm opacity-70">
                                                No records
                                            </td>
                                        </tr>
                                    )}
                                    {records.map((row) => (
                                        <tr key={row.id}>
                                            <td>
                                                <input type="checkbox" className="form-checkbox outline-primary" checked={selectedRecords.some((s) => s.id === row.id)} onChange={() => toggleRow(row)} />
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <strong className="text-info">#{row.driver_number || row.id.slice(0, 8)}</strong>
                                                    <Link href={`/drivers/preview/${row.id}`} className="flex hover:text-info" title="View">
                                                        <IconEye className="h-4 w-4" />
                                                    </Link>
                                                </div>
                                            </td>
                                            <td>
                                                <img src={row.photo_url || '/assets/images/user-profile.jpeg'} alt="photo" className="h-10 w-10 rounded-full object-cover" />
                                            </td>
                                            <td className="font-semibold">{row.name || '-'}</td>
                                            <td>{row.phone || '-'}</td>
                                            <td>{row.license_number || '-'}</td>
                                            <td>
                                                <span className={`badge ${statusBadge(row.status)}`}>{(row.status || 'active').replace('_', ' ')}</span>
                                            </td>
                                            <td>
                                                <div className="mx-auto flex w-max items-center gap-2">
                                                    <Link href={`/drivers/edit/${row.id}`} className="flex hover:text-info">
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
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {records.length === 0 && <div className="col-span-full py-10 text-center text-sm opacity-70">No records</div>}
                            {records.map((row) => (
                                <div key={row.id} className="rounded-md border border-white-light bg-white p-4 shadow dark:border-[#17263c] dark:bg-[#121e32]">
                                    <div className="flex items-start gap-3">
                                        <img src={row.photo_url || '/assets/images/user-profile.jpeg'} alt="photo" className="h-12 w-12 rounded-full object-cover" />
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <div className="font-semibold">#{row.driver_number || row.id.slice(0, 8)}</div>
                                                <span className={`badge ${statusBadge(row.status)}`}>{(row.status || 'active').replace('_', ' ')}</span>
                                            </div>
                                            <div className="mt-1 font-medium">{row.name || '-'}</div>
                                            <div className="text-sm opacity-80">Phone: {row.phone || '-'}</div>
                                            <div className="text-sm opacity-80">License: {row.license_number || '-'}</div>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex items-center justify-end gap-2">
                                        <Link href={`/drivers/preview/${row.id}`} className="flex hover:text-info" title="View">
                                            <IconEye className="h-4 w-4" />
                                        </Link>
                                        <Link href={`/drivers/edit/${row.id}`} className="flex hover:text-info">
                                            <IconEdit className="h-4.5 w-4.5" />
                                        </Link>
                                        <button type="button" className="flex hover:text-danger" onClick={() => deleteRow(row.id)}>
                                            <IconTrashLines />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-3 text-sm opacity-80">
                            <span>
                                Showing {from} to {to} of {totalRecords} entries
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
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                className="rounded-md bg-[#f4f4f4] p-1 enabled:hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white-dark/20 enabled:dark:hover:bg-white-dark/30 ltr:mr-3 rtl:ml-3"
                                disabled={page === 1}
                                onClick={() => setPage(1)}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 rtl:rotate-180">
                                    <path d="M13 19L7 12L13 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    <path opacity="0.5" d="M16.9998 19L10.9998 12L16.9998 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                className="rounded-md bg-[#f4f4f4] p-1 enabled:hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white-dark/20 enabled:dark:hover:bg-white-dark/30"
                                disabled={page === 1}
                                onClick={() => setPage(page - 1)}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 rtl:rotate-180">
                                    <path d="M15 5L9 12L15 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                            <button type="button" className="rounded-md bg-primary px-3 py-1 text-white dark:bg-primary">
                                {page}
                            </button>
                            <button
                                type="button"
                                className="rounded-md bg-[#f4f4f4] p-1 enabled:hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white-dark/20 enabled:dark:hover:bg-white-dark/30"
                                disabled={page === totalPages}
                                onClick={() => setPage(page + 1)}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 rtl:rotate-180">
                                    <path d="M9 5L15 12L9 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                className="rounded-md bg-[#f4f4f4] p-1 enabled:hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white-dark/20 enabled:dark:hover:bg-white-dark/30 ltr:ml-3 rtl:mr-3"
                                disabled={page === totalPages}
                                onClick={() => setPage(totalPages)}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 rtl:rotate-180">
                                    <path d="M11 19L17 12L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    <path opacity="0.5" d="M6.99976 19L12.9998 12L6.99976 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
