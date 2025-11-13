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
import ContractorFilters, { ContractorFilters as ContractorFiltersType } from '@/components/contractor-filters/contractor-filters';
import { getTranslation } from '@/i18n';

interface Contractor {
    id: string;
    contractor_number?: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    balance?: number;
    status?: 'active' | 'inactive';
    notes?: string;
    created_at: string;
    updated_at?: string;
}

const ContractorsList = () => {
    const { t } = getTranslation();
    const [items, setItems] = useState<Contractor[]>([]);
    const [loading, setLoading] = useState(true);

    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState<Contractor[]>([]);
    const [records, setRecords] = useState<Contractor[]>([]);
    const [selectedRecords, setSelectedRecords] = useState<Contractor[]>([]);

    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [filters, setFilters] = useState<ContractorFiltersType>({
        search: '',
        status: '',
        balanceFrom: '',
        balanceTo: '',
        dateFrom: '',
        dateTo: '',
    });
    const [sortStatus, setSortStatus] = useState<{ columnAccessor: keyof Contractor | 'contractor_number' | 'created_at' | 'balance'; direction: 'asc' | 'desc' }>({
        columnAccessor: 'created_at',
        direction: 'desc',
    });

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [contractorToDelete, setContractorToDelete] = useState<Contractor | null>(null);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        const fetchContractors = async () => {
            try {
                // @ts-ignore
                const { data, error } = await supabase.from('contractors').select('*').order('created_at', { ascending: false });
                if (error) throw error;
                setItems((data || []) as any);
            } catch (error) {
                console.error('Error fetching contractors:', error);
                setAlert({ visible: true, message: 'Error loading data', type: 'danger' });
            } finally {
                setLoading(false);
            }
        };
        fetchContractors();
    }, []);

    useEffect(() => {
        setPage(1);
    }, [pageSize]);

    useEffect(() => {
        setInitialRecords(() => {
            return items.filter((item) => {
                // Filter by status
                const status = filters.status || 'all';
                const inStatus = status === 'all' || item.status === status;
                if (!inStatus) return false;

                // Filter by search term
                const searchTerm = filters.search.toLowerCase();
                const matchesSearch =
                    !searchTerm ||
                    (item.name && item.name.toLowerCase().includes(searchTerm)) ||
                    (item.phone && item.phone.toLowerCase().includes(searchTerm)) ||
                    (item.email && item.email.toLowerCase().includes(searchTerm)) ||
                    (item.contractor_number && item.contractor_number.toLowerCase().includes(searchTerm));

                if (!matchesSearch) return false;

                // Filter by balance range
                const balance = item.balance || 0;
                const balanceFrom = filters.balanceFrom ? Number(filters.balanceFrom) : null;
                const balanceTo = filters.balanceTo ? Number(filters.balanceTo) : null;

                if (balanceFrom !== null && balance < balanceFrom) return false;
                if (balanceTo !== null && balance > balanceTo) return false;

                // Filter by date range
                if (filters.dateFrom || filters.dateTo) {
                    const itemDate = new Date(item.created_at);
                    const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null;
                    const dateTo = filters.dateTo ? new Date(filters.dateTo) : null;

                    if (dateFrom && itemDate < dateFrom) return false;
                    if (dateTo && itemDate > dateTo) return false;
                }

                return true;
            });
        });
    }, [items, filters]);

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

    const toggleRow = (row: Contractor) => {
        setSelectedRecords((prev) => {
            const exists = prev.some((s) => s.id === row.id);
            if (exists) return prev.filter((s) => s.id !== row.id);
            return [...prev, row];
        });
    };

    const isAllPageSelected = useMemo(() => records.length > 0 && records.every((r) => selectedRecords.some((s) => s.id === r.id)), [records, selectedRecords]);

    const deleteRow = (id: string | null = null) => {
        if (id) {
            const contractor = items.find((c) => c.id === id);
            if (contractor) {
                setContractorToDelete(contractor);
                setShowConfirmModal(true);
            }
        }
    };

    const confirmDeletion = async () => {
        if (!contractorToDelete) return;
        try {
            // @ts-ignore
            const { error } = await supabase.from('contractors').delete().eq('id', contractorToDelete.id);
            if (error) throw error;

            const updatedItems = items.filter((c) => c.id !== contractorToDelete.id);
            setItems(updatedItems);
            setAlert({ visible: true, message: 'Contractor deleted successfully', type: 'success' });
        } catch (error) {
            console.error('Deletion error:', error);
            setAlert({ visible: true, message: 'Error deleting contractor', type: 'danger' });
        } finally {
            setShowConfirmModal(false);
            setContractorToDelete(null);
        }
    };

    const setSort = (columnAccessor: 'contractor_number' | 'name' | 'phone' | 'balance' | 'status' | 'created_at') => {
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
                            Delete
                        </button>
                        <Link href="/contractors/add" className="btn btn-primary gap-2">
                            <IconPlus />
                            Add New Contractor
                        </Link>
                    </div>
                    <div className="flex-grow">
                        <ContractorFilters
                            onFilterChange={setFilters}
                            onClearFilters={() =>
                                setFilters({
                                    search: '',
                                    status: '',
                                    balanceFrom: '',
                                    balanceTo: '',
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
                    {viewMode === 'list' ? (
                        <div className="overflow-auto rounded-md">
                            <table className="table-hover whitespace-nowrap rtl-table-headers">
                                <thead>
                                    <tr>
                                        <th className="w-10">
                                            <input type="checkbox" className="form-checkbox outline-primary" checked={isAllPageSelected} onChange={toggleSelectAllOnPage} />
                                        </th>
                                        <th className="cursor-pointer select-none" onClick={() => setSort('contractor_number')}>
                                            ID {sortStatus.columnAccessor === 'contractor_number' && (sortStatus.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="cursor-pointer select-none" onClick={() => setSort('name')}>
                                            Contractor Name {sortStatus.columnAccessor === 'name' && (sortStatus.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="cursor-pointer select-none" onClick={() => setSort('phone')}>
                                            Phone Number {sortStatus.columnAccessor === 'phone' && (sortStatus.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th>Email</th>
                                        <th className="cursor-pointer select-none" onClick={() => setSort('status')}>
                                            Status {sortStatus.columnAccessor === 'status' && (sortStatus.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="cursor-pointer select-none" onClick={() => setSort('balance')}>
                                            Balance {sortStatus.columnAccessor === 'balance' && (sortStatus.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="cursor-pointer select-none" onClick={() => setSort('created_at')}>
                                            Created Date {sortStatus.columnAccessor === 'created_at' && (sortStatus.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {records.length === 0 && (
                                        <tr>
                                            <td colSpan={9} className="py-10 text-center text-sm opacity-70">
                                                No records
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
                                                    <strong className="text-info">#{row.contractor_number || row.id.slice(0, 8)}</strong>
                                                    <Link href={`/contractors/preview/${row.id}`} className="flex hover:text-info" title="View">
                                                        <IconEye className="h-4 w-4" />
                                                    </Link>
                                                </div>
                                            </td>
                                            <td className="font-semibold">{row.name}</td>
                                            <td>{row.phone || '-'}</td>
                                            <td>{row.email || '-'}</td>
                                            <td>
                                                <span className={`badge ${row.status === 'active' ? 'badge-outline-success' : 'badge-outline-danger'}`}>
                                                    {row.status === 'active' ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`font-bold ${(row.balance || 0) > 0 ? 'text-success' : 'text-danger'}`}>₪{(row.balance || 0).toFixed(2)}</span>
                                            </td>
                                            <td>
                                                {new Date(row.created_at).toLocaleDateString('en-GB', {
                                                    year: 'numeric',
                                                    month: '2-digit',
                                                    day: '2-digit',
                                                })}
                                            </td>
                                            <td>
                                                <div className="mx-auto flex w-max items-center gap-2">
                                                    <Link href={`/contractors/edit/${row.id}`} className="flex hover:text-info">
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
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                            {records.length === 0 && <div className="col-span-full py-10 text-center text-sm opacity-70">No records</div>}
                            {records.map((row) => (
                                <div key={row.id} className="rounded-md border border-white-light bg-white p-4 shadow dark:border-[#17263c] dark:bg-[#121e32]">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-info/20 font-bold text-info">
                                                {(row.name || '-').charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-semibold">{row.name}</div>
                                                <div className="text-xs opacity-70">{row.status === 'active' ? 'Active' : 'Inactive'}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Link href={`/contractors/preview/${row.id}`} className="flex hover:text-info" title="View">
                                                <IconEye className="h-4 w-4" />
                                            </Link>
                                            <Link href={`/contractors/edit/${row.id}`} className="flex hover:text-info">
                                                <IconEdit className="h-4.5 w-4.5" />
                                            </Link>
                                            <button type="button" className="flex hover:text-danger" onClick={() => deleteRow(row.id)}>
                                                <IconTrashLines />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-3 space-y-1 text-sm opacity-90">
                                        <div>{row.phone || '-'}</div>
                                        <div>{row.email || '-'}</div>
                                        <div className="font-bold">₪{(row.balance || 0).toFixed(2)}</div>
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

            <ConfirmModal
                isOpen={showConfirmModal}
                title="Confirm Deletion"
                message="Are you sure you want to delete this contractor?"
                onCancel={() => {
                    setShowConfirmModal(false);
                    setContractorToDelete(null);
                }}
                onConfirm={confirmDeletion}
                confirmLabel="Delete"
                cancelLabel="Cancel"
                size="sm"
            />
        </div>
    );
};

export default ContractorsList;
