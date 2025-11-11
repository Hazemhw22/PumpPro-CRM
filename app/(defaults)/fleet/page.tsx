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
import FleetFilters, { FleetFilters as FleetFiltersType } from '@/components/fleet-filters/fleet-filters';

interface Truck {
    id: string;
    created_at: string;
    truck_number?: string;
    license_plate?: string;
    capacity_gallons?: number;
    status?: 'available' | 'in_use' | 'maintenance' | 'out_of_service';
    purchase_date?: string;
    last_maintenance?: string;
    notes?: string;
    photo_url?: string;
    truck_photos?: string[];
    driver_id?: string;
    driver?: { name?: string; driver_number?: string };
    updated_at?: string;
}

export default function FleetList() {
    const [items, setItems] = useState<Truck[]>([]);
    const [loading, setLoading] = useState(true);

    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState<Truck[]>([]);
    const [records, setRecords] = useState<Truck[]>([]);
    const [selectedRecords, setSelectedRecords] = useState<Truck[]>([]);

    const [filters, setFilters] = useState<FleetFiltersType>({ search: '', status: '', capacityFrom: '', capacityTo: '', maintenanceFrom: '', maintenanceTo: '' });
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [sortStatus, setSortStatus] = useState<{ columnAccessor: keyof Truck | 'created_at'; direction: 'asc' | 'desc' }>({
        columnAccessor: 'created_at',
        direction: 'desc',
    });

    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        const fetchTrucks = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase.from('trucks').select('*, driver:drivers(name, driver_number)').order('created_at', { ascending: false });
                if (error) throw error;
                setItems(data || []);
                setInitialRecords(data || []);
            } catch (err) {
                console.error('Error fetching trucks:', err);
                setAlert({ visible: true, message: 'Failed to load trucks', type: 'danger' });
            } finally {
                setLoading(false);
            }
        };
        fetchTrucks();
    }, []);

    useEffect(() => setPage(1), [pageSize]);

    useEffect(() => {
        setInitialRecords(() => {
            return items.filter((t) => {
                // status filter
                if (filters.status && filters.status !== 'all' && (t.status || 'available') !== filters.status) return false;

                // search filter
                const q = (filters.search || '').toLowerCase();
                if (q) {
                    if (!((t.truck_number || '').toLowerCase().includes(q) || (t.license_plate || '').toLowerCase().includes(q))) return false;
                }

                // capacity range
                if (filters.capacityFrom || filters.capacityTo) {
                    const cap = Number(t.capacity_gallons || 0);
                    const from = filters.capacityFrom ? Number(filters.capacityFrom) : null;
                    const to = filters.capacityTo ? Number(filters.capacityTo) : null;
                    if (from !== null && cap < (from as number)) return false;
                    if (to !== null && cap > (to as number)) return false;
                }

                // maintenance date range
                if (filters.maintenanceFrom || filters.maintenanceTo) {
                    const maint = t.last_maintenance ? new Date(t.last_maintenance) : null;
                    if (!maint) return false;
                    const from = filters.maintenanceFrom ? new Date(filters.maintenanceFrom) : null;
                    const to = filters.maintenanceTo ? new Date(filters.maintenanceTo) : null;
                    if (from && maint < from) return false;
                    if (to && maint > to) return false;
                }

                return true;
            });
        });
    }, [items, filters]);

    useEffect(() => {
        const data = sortBy(initialRecords, (x) => {
            const key = sortStatus.columnAccessor as string;
            if (key === 'created_at') return new Date((x as any)[key] || 0).getTime();
            const v = (x as any)[key];
            return typeof v === 'string' ? v.toLowerCase() : v;
        });
        const sortedData = sortStatus.direction === 'desc' ? data.reverse() : data;
        const from = (page - 1) * pageSize;
        const to = from + pageSize;
        setRecords(sortedData.slice(from, to));
    }, [page, pageSize, sortStatus, initialRecords]);

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

    const toggleRow = (row: Truck) => {
        setSelectedRecords((prev) => {
            const exists = prev.some((s) => s.id === row.id);
            if (exists) return prev.filter((s) => s.id !== row.id);
            return [...prev, row];
        });
    };

    const isAllPageSelected = useMemo(() => records.length > 0 && records.every((r) => selectedRecords.some((s) => s.id === r.id)), [records, selectedRecords]);

    const setSort = (columnAccessor: 'truck_number' | 'license_plate' | 'capacity_gallons' | 'status' | 'created_at' | 'last_maintenance') => {
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

    const statusBadge = (s?: Truck['status']) => {
        switch (s) {
            case 'available':
                return 'badge-outline-success';
            case 'in_use':
                return 'badge-outline-info';
            case 'maintenance':
                return 'badge-outline-warning';
            case 'out_of_service':
                return 'badge-outline-danger';
            default:
                return 'badge-outline-secondary';
        }
    };

    return (
        <div className="panel border-white-light px-0 dark:border-[#1b2e4b]">
            {alert.visible && (
                <div className="mb-4 ml-4 max-w-96">
                    <Alert
                        type={alert.type}
                        title={alert.type === 'success' ? 'Success' : 'Error'}
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
                            Delete
                        </button>
                        <Link href="/fleet/add" className="btn btn-primary gap-2">
                            <IconPlus />
                            Add New Truck
                        </Link>
                    </div>
                    <div className="flex-grow">
                        <FleetFilters
                            onFilterChange={setFilters}
                            onClearFilters={() =>
                                setFilters({
                                    search: '',
                                    status: '',
                                    capacityFrom: '',
                                    capacityTo: '',
                                    maintenanceFrom: '',
                                    maintenanceTo: '',
                                })
                            }
                        />
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
                                        <th className="cursor-pointer select-none" onClick={() => setSort('truck_number')}>
                                            Truck Number {sortStatus.columnAccessor === 'truck_number' && (sortStatus.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th>Photo</th>
                                        <th className="cursor-pointer select-none" onClick={() => setSort('license_plate')}>
                                            License Plate {sortStatus.columnAccessor === 'license_plate' && (sortStatus.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="cursor-pointer select-none" onClick={() => setSort('status')}>
                                            Status {sortStatus.columnAccessor === 'status' && (sortStatus.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="cursor-pointer select-none" onClick={() => setSort('capacity_gallons')}>
                                            Capacity {sortStatus.columnAccessor === 'capacity_gallons' && (sortStatus.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="cursor-pointer select-none" onClick={() => setSort('last_maintenance')}>
                                            Last Maintenance {sortStatus.columnAccessor === 'last_maintenance' && (sortStatus.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th>Driver</th>
                                        <th>Notes</th>
                                        <th className="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Empty-state row removed - no placeholder when there are no records */}
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
                                                    <strong className="text-info">#{row.truck_number || row.id.slice(0, 8)}</strong>
                                                    <Link href={`/fleet/preview/${row.id}`} className="flex hover:text-info" title="View">
                                                        <IconEye className="h-4 w-4" />
                                                    </Link>
                                                </div>
                                            </td>
                                            <td>
                                                <img src={row.photo_url || '/assets/images/img-placeholder-fallback.webp'} alt="thumb" className="h-10 w-10 rounded-md object-cover" />
                                            </td>
                                            <td>{row.license_plate || '-'}</td>
                                            <td>
                                                <span className={`badge ${statusBadge(row.status)}`}>{(row.status || 'available').replace('_', ' ')}</span>
                                            </td>
                                            <td>{row.capacity_gallons ? `${row.capacity_gallons} gallons` : '-'}</td>
                                            <td>{row.last_maintenance ? new Date(row.last_maintenance).toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-'}</td>
                                            <td>{row.driver?.name || '-'}</td>
                                            <td className="max-w-52 truncate">{row.notes || 'N/A'}</td>
                                            <td>
                                                <div className="mx-auto flex w-max items-center gap-2">
                                                    <Link href={`/fleet/edit/${row.id}`} className="flex hover:text-info">
                                                        <IconEdit className="h-4.5 w-4.5" />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {/* Empty-state placeholder removed */}
                            {records.map((row) => (
                                <div key={row.id} className="rounded-md border border-white-light bg-white p-4 shadow dark:border-[#17263c] dark:bg-[#121e32]">
                                    <div className="flex items-start gap-3">
                                        <img src={row.photo_url || '/assets/images/img-placeholder-fallback.webp'} alt="thumb" className="h-12 w-12 rounded-md object-cover" />
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <div className="font-semibold">#{row.truck_number || row.license_plate || row.id.slice(0, 8)}</div>
                                                <span className={`badge ${statusBadge(row.status)}`}>{(row.status || 'available').replace('_', ' ')}</span>
                                            </div>
                                            <div className="mt-1 text-sm opacity-80">Plate: {row.license_plate || '-'}</div>
                                            <div className="text-sm opacity-80">Capacity: {row.capacity_gallons ? `${row.capacity_gallons} gallons` : '-'}</div>
                                            {row.driver?.name && <div className="text-sm opacity-80">Driver: {row.driver.name}</div>}
                                        </div>
                                    </div>
                                    <div className="mt-3 flex items-center justify-end gap-2">
                                        <Link href={`/fleet/preview/${row.id}`} className="flex hover:text-info" title="View">
                                            <IconEye className="h-4 w-4" />
                                        </Link>
                                        <Link href={`/fleet/edit/${row.id}`} className="flex hover:text-info">
                                            <IconEdit className="h-4.5 w-4.5" />
                                        </Link>
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
        </div>
    );
}
