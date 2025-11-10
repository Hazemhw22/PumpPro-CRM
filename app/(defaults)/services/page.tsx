'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { sortBy } from 'lodash';
import { supabase } from '@/lib/supabase/client';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { getTranslation } from '@/i18n';
import IconPlus from '@/components/icon/icon-plus';
import IconTrashLines from '@/components/icon/icon-trash-lines';
import IconEdit from '@/components/icon/icon-edit';
import IconEye from '@/components/icon/icon-eye';

interface Service {
    id: string;
    created_at: string;
    name: string;
    description?: string;
    price_private?: number;
    price_business?: number;
    active?: boolean;
    updated_at?: string;
}

export default function ServicesList() {
    const { t } = getTranslation();
    const [items, setItems] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);

    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState<Service[]>([]);
    const [records, setRecords] = useState<Service[]>([]);
    const [selectedRecords, setSelectedRecords] = useState<Service[]>([]);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [sortStatus, setSortStatus] = useState<{ columnAccessor: keyof Service | 'created_at'; direction: 'asc' | 'desc' }>({
        columnAccessor: 'created_at',
        direction: 'desc',
    });

    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        fetchServices();
    }, []);

    const fetchServices = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('services')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setItems(data || []);
            setInitialRecords(data || []);
        } catch (err) {
            console.error('Error fetching services:', err);
            setAlert({ visible: true, message: 'Failed to load services', type: 'danger' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => setPage(1), [pageSize]);

    useEffect(() => {
        setInitialRecords(() => {
            return items.filter((s) => {
                const isActive = s.active !== false;
                const inStatus = statusFilter === 'all' || (statusFilter === 'active' && isActive) || (statusFilter === 'inactive' && !isActive);
                if (!inStatus) return false;
                const q = search.toLowerCase();
                return (
                    !q ||
                    (s.name || '').toLowerCase().includes(q) ||
                    (s.description || '').toLowerCase().includes(q)
                );
            });
        });
    }, [items, search, statusFilter]);

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

    const setSort = (columnAccessor: keyof Service | 'created_at') => {
        setSortStatus((curr) => {
            if (curr.columnAccessor === columnAccessor) {
                return { columnAccessor, direction: curr.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { columnAccessor, direction: 'asc' };
        });
    };

    const toggleRow = (row: Service) => {
        setSelectedRecords((prev) => (prev.some((s) => s.id === row.id) ? prev.filter((s) => s.id !== row.id) : [...prev, row]));
    };

    const isAllPageSelected = records.length > 0 && records.every((row) => selectedRecords.some((s) => s.id === row.id));

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

    const statusBadge = (active?: boolean) => {
        return active !== false ? 'badge-outline-success' : 'badge-outline-danger';
    };

    const totalRecords = initialRecords.length;
    const from = totalRecords === 0 ? 0 : (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, totalRecords);

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
                <div className="mb-4.5 flex flex-col gap-5 px-5 md:flex-row md:items-center">
                    <div className="flex items-center gap-2">
                        <button type="button" className="btn btn-danger gap-2" disabled={selectedRecords.length === 0}>
                            <IconTrashLines />
                            Delete
                        </button>
                        <Link href="/services/add" className="btn btn-primary gap-2">
                            <IconPlus />
                            Add New Service
                        </Link>
                    </div>
                    <div className="ltr:ml-auto rtl:mr-auto flex items-center gap-2">
                        <select className="form-select w-36 py-1 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                        <input type="text" className="form-input w-auto" placeholder="Search services..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                </div>

                <div className="relative px-5 pb-5">
                    <div className="overflow-auto rounded-md">
                            <table className="table-hover whitespace-nowrap rtl-table-headers">
                                <thead>
                                    <tr>
                                        <th className="w-10">
                                            <input type="checkbox" className="form-checkbox outline-primary" checked={isAllPageSelected} onChange={toggleSelectAllOnPage} />
                                        </th>
                                        <th className="cursor-pointer select-none" onClick={() => setSort('name')}>
                                            Service Name {sortStatus.columnAccessor === 'name' && (sortStatus.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th>Description</th>
                                        <th className="cursor-pointer select-none" onClick={() => setSort('price_private')}>
                                            Price Private {sortStatus.columnAccessor === 'price_private' && (sortStatus.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="cursor-pointer select-none" onClick={() => setSort('price_business')}>
                                            Price Business {sortStatus.columnAccessor === 'price_business' && (sortStatus.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="cursor-pointer select-none" onClick={() => setSort('active')}>
                                            Status {sortStatus.columnAccessor === 'active' && (sortStatus.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="cursor-pointer select-none" onClick={() => setSort('created_at')}>
                                            Created At {sortStatus.columnAccessor === 'created_at' && (sortStatus.direction === 'asc' ? '↑' : '↓')}
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
                                            <td className="font-semibold">{row.name || '-'}</td>
                                            <td className="max-w-xs truncate">{row.description || '-'}</td>
                                            <td>{row.price_private ? `$${row.price_private.toFixed(2)}` : '-'}</td>
                                            <td>{row.price_business ? `$${row.price_business.toFixed(2)}` : '-'}</td>
                                            <td>
                                                <span className={`badge ${statusBadge(row.active)}`}>{row.active !== false ? 'Active' : 'Inactive'}</span>
                                            </td>
                                            <td>
                                                {row.created_at
                                                    ? new Date(row.created_at).toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' })
                                                    : '-'}
                                            </td>
                                            <td>
                                                <div className="mx-auto flex w-max items-center gap-2">
                                                    <Link href={`/services/preview/${row.id}`} className="flex hover:text-primary" title="View">
                                                        <IconEye className="h-4.5 w-4.5" />
                                                    </Link>
                                                    <Link href={`/services/edit/${row.id}`} className="flex hover:text-info" title="Edit">
                                                        <IconEdit className="h-4.5 w-4.5" />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                    {/* Pagination */}
                    <div className="mt-5 flex flex-col items-center justify-between gap-4 sm:flex-row">
                        <div className="text-sm">
                            Showing {from} to {to} of {totalRecords} entries
                              <select className="form-select w-20 py-1 text-sm ml-2" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
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
                </div>
            </div>
        </div>
    );
}
