'use client';
import IconEdit from '@/components/icon/icon-edit';
import IconEye from '@/components/icon/icon-eye';
import IconPlus from '@/components/icon/icon-plus';
import IconTrashLines from '@/components/icon/icon-trash-lines';
import IconUser from '@/components/icon/icon-user';
import { sortBy } from 'lodash';
import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import ConfirmModal from '@/components/modals/confirm-modal';
import UsersFilters, { UsersFilters as UsersFiltersType } from '@/components/users-filters/users-filters';
import { getTranslation } from '@/i18n';

interface User {
    id: string;
    email: string;
    full_name: string | null;
    role: string;
    avatar_url: string | null;
    created_at: string;
    updated_at: string;
}

const UsersList = () => {
    const { t } = getTranslation();
    const [items, setItems] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState<User[]>([]);
    const [records, setRecords] = useState<User[]>([]);
    const [selectedRecords, setSelectedRecords] = useState<User[]>([]);

    const [filters, setFilters] = useState<UsersFiltersType>({ search: '', role: '', dateFrom: '', dateTo: '' });
    const [sortStatus, setSortStatus] = useState<{
        columnAccessor: keyof User | 'created_at';
        direction: 'asc' | 'desc';
    }>({
        columnAccessor: 'created_at',
        direction: 'desc',
    });

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });

            if (error) throw error;
            setItems((data || []) as User[]);
        } catch (error) {
            console.error('Error fetching users:', error);
            setAlert({ visible: true, message: 'Error loading users', type: 'danger' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        setPage(1);
    }, [pageSize]);

    useEffect(() => {
        setInitialRecords(() => {
            return items.filter((item) => {
                // role filter
                if (filters.role && filters.role !== 'all' && item.role !== filters.role) return false;

                const searchTerm = (filters.search || '').toLowerCase();
                if (searchTerm) {
                    if (!((item.full_name || '').toLowerCase().includes(searchTerm) || item.email.toLowerCase().includes(searchTerm) || item.role.toLowerCase().includes(searchTerm))) return false;
                }

                // date range
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

    const toggleRow = (row: User) => {
        setSelectedRecords((prev) => {
            const exists = prev.some((s) => s.id === row.id);
            if (exists) return prev.filter((s) => s.id !== row.id);
            return [...prev, row];
        });
    };

    const isAllPageSelected = useMemo(() => records.length > 0 && records.every((r) => selectedRecords.some((s) => s.id === r.id)), [records, selectedRecords]);

    const deleteRow = (id: string | null = null) => {
        if (id) {
            const user = items.find((u) => u.id === id);
            if (user) {
                setUserToDelete(user);
                setShowConfirmModal(true);
            }
        }
    };

    const confirmDeletion = async () => {
        if (!userToDelete) return;
        try {
            // Delete from profiles table
            const { error: profileError } = await supabase.from('profiles').delete().eq('id', userToDelete.id);

            if (profileError) throw profileError;

            // Call API to delete from auth
            const response = await fetch('/api/users/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userToDelete.id }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to delete user from auth');
            }

            const updatedItems = items.filter((u) => u.id !== userToDelete.id);
            setItems(updatedItems);
            setAlert({ visible: true, message: 'User deleted successfully', type: 'success' });
        } catch (error: any) {
            console.error('Deletion error:', error);
            setAlert({ visible: true, message: error.message || 'Error deleting user', type: 'danger' });
        } finally {
            setShowConfirmModal(false);
            setUserToDelete(null);
        }
    };

    const setSort = (columnAccessor: keyof User | 'created_at') => {
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
                        <Link href="/users/add" className="btn btn-primary gap-2">
                            <IconPlus />
                            Add New User
                        </Link>
                    </div>
                    <div className="flex-grow">
                        <UsersFilters onFilterChange={setFilters} onClearFilters={() => setFilters({ search: '', role: '', dateFrom: '', dateTo: '' })} />
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
                                    <th className="cursor-pointer select-none" onClick={() => setSort('full_name')}>
                                        Full Name {sortStatus.columnAccessor === 'full_name' && (sortStatus.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="cursor-pointer select-none" onClick={() => setSort('email')}>
                                        Email {sortStatus.columnAccessor === 'email' && (sortStatus.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="cursor-pointer select-none" onClick={() => setSort('role')}>
                                        Role {sortStatus.columnAccessor === 'role' && (sortStatus.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="cursor-pointer select-none" onClick={() => setSort('created_at')}>
                                        Created Date {sortStatus.columnAccessor === 'created_at' && (sortStatus.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Empty-state row removed - no placeholder shown when there are no records */}
                                {records.map((row) => (
                                    <tr key={row.id}>
                                        <td>
                                            <input type="checkbox" className="form-checkbox outline-primary" checked={selectedRecords.some((s) => s.id === row.id)} onChange={() => toggleRow(row)} />
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary">
                                                    {row.avatar_url ? (
                                                        <img src={row.avatar_url} alt={row.full_name || ''} className="h-full w-full rounded-full object-cover" />
                                                    ) : (
                                                        <IconUser className="h-4 w-4" />
                                                    )}
                                                </div>
                                                <span className="font-semibold">{row.full_name || '-'}</span>
                                            </div>
                                        </td>
                                        <td>{row.email}</td>
                                        <td>
                                            <span className={`badge ${row.role === 'admin' ? 'badge-outline-danger' : 'badge-outline-primary'}`}>{row.role}</span>
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
                                                <Link href={`/users/preview/${row.id}`} className="flex hover:text-info" title="View">
                                                    <IconEye className="h-4 w-4" />
                                                </Link>
                                                <Link href={`/users/edit/${row.id}`} className="flex hover:text-info">
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

                    {loading && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-sm dark:bg-black-dark-light/60">
                            <span className="inline-flex h-10 w-10 animate-spin rounded-full border-4 border-transparent border-l-primary align-middle"></span>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmModal
                isOpen={showConfirmModal}
                title="Confirm Deletion"
                message="Are you sure you want to delete this user? This will remove the user from authentication and all associated data."
                onCancel={() => {
                    setShowConfirmModal(false);
                    setUserToDelete(null);
                }}
                onConfirm={confirmDeletion}
                confirmLabel="Delete"
                cancelLabel="Cancel"
                size="sm"
            />
        </div>
    );
};

export default UsersList;
