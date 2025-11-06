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

 interface Customer {
     id: string;
     created_at: string;
     customer_number?: number;
     type: 'private' | 'business';
     name?: string;
     business_name?: string;
     phone: string;
     email?: string;
     address?: string;
 }

 const CustomersList = () => {
     const { t } = getTranslation();
     const [items, setItems] = useState<Customer[]>([]);
     const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const PAGE_SIZES = [10, 20, 30, 50, 100];
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [initialRecords, setInitialRecords] = useState<Customer[]>([]);
  const [records, setRecords] = useState<Customer[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<Customer[]>([]);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'private' | 'business'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortStatus, setSortStatus] = useState<{ columnAccessor: keyof Customer | 'customer_number' | 'created_at'; direction: 'asc' | 'desc' }>({
    columnAccessor: 'customer_number',
    direction: 'desc',
  });

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
    visible: false,
    message: '',
    type: 'success',
  });

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        // @ts-ignore
        const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        setItems((data || []) as any);
      } catch (error) {
        console.error('Error fetching customers:', error);
        setAlert({ visible: true, message: 'Error loading data', type: 'danger' });
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  useEffect(() => {
    setInitialRecords(() => {
      return items.filter((item) => {
        const inType = typeFilter === 'all' || item.type === typeFilter;
        if (!inType) return false;
        const searchTerm = search.toLowerCase();
        const displayName = item.type === 'private' ? item.name : item.business_name;
        return (
          !searchTerm ||
          (displayName && displayName.toLowerCase().includes(searchTerm)) ||
          item.phone.toLowerCase().includes(searchTerm) ||
          (item.email && item.email.toLowerCase().includes(searchTerm)) ||
          (item.address && item.address.toLowerCase().includes(searchTerm))
        );
      });
    });
  }, [items, search, typeFilter]);

  useEffect(() => {
    const data = sortBy(initialRecords, (x) => {
      const key = sortStatus.columnAccessor as string;
      // Normalize for string dates
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
      // add missing
      const byId = new Set(selectedRecords.map((s) => s.id));
      const merged = [...selectedRecords];
      records.forEach((r) => {
        if (!byId.has(r.id)) merged.push(r);
      });
      setSelectedRecords(merged);
    }
  };

  const toggleRow = (row: Customer) => {
    setSelectedRecords((prev) => {
      const exists = prev.some((s) => s.id === row.id);
      if (exists) return prev.filter((s) => s.id !== row.id);
      return [...prev, row];
    });
  };

  const isAllPageSelected = useMemo(
    () => records.length > 0 && records.every((r) => selectedRecords.some((s) => s.id === r.id)),
    [records, selectedRecords]
  );

  const deleteRow = (id: string | null = null) => {
    if (id) {
      const customer = items.find((c) => c.id === id);
      if (customer) {
        setCustomerToDelete(customer);
        setShowConfirmModal(true);
      }
    }
  };

  const confirmDeletion = async () => {
    if (!customerToDelete) return;
    try {
      // @ts-ignore
      const { error } = await supabase.from('customers').delete().eq('id', customerToDelete.id);
      if (error) throw error;

      const updatedItems = items.filter((c) => c.id !== customerToDelete.id);
      setItems(updatedItems);
      setAlert({ visible: true, message: 'Customer deleted successfully', type: 'success' });
    } catch (error) {
      console.error('Deletion error:', error);
      setAlert({ visible: true, message: 'Error deleting customer', type: 'danger' });
    } finally {
      setShowConfirmModal(false);
      setCustomerToDelete(null);
    }
  };

  const getCustomerName = (c: Customer) => (c.type === 'private' ? c.name : c.business_name) || '-';

  const setSort = (columnAccessor: 'customer_number' | 'name' | 'business_name' | 'address' | 'phone' | 'created_at') => {
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
            <Link href="/customers/add" className="btn btn-primary gap-2">
              <IconPlus />
              Add New
            </Link>
            <div className="ml-2 hidden items-center gap-1 md:flex">
              <button
                type="button"
                className={`btn btn-sm ${typeFilter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setTypeFilter('all')}
              >
                All
              </button>
              <button
                type="button"
                className={`btn btn-sm ${typeFilter === 'private' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setTypeFilter('private')}
              >
                Private
              </button>
              <button
                type="button"
                className={`btn btn-sm ${typeFilter === 'business' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setTypeFilter('business')}
              >
                Business
              </button>
            </div>
          </div>
          <div className="ltr:ml-auto rtl:mr-auto flex items-center gap-2">
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
          </div>
        </div>

        <div className="relative px-5 pb-5">
          {viewMode === 'list' ? (
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
                    <th className="cursor-pointer select-none" onClick={() => setSort('customer_number')}>
                      ID {sortStatus.columnAccessor === 'customer_number' && (sortStatus.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="cursor-pointer select-none" onClick={() => setSort('name')}>
                      Customer Name {sortStatus.columnAccessor === 'name' && (sortStatus.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="cursor-pointer select-none" onClick={() => setSort('address')}>
                      Address {sortStatus.columnAccessor === 'address' && (sortStatus.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="cursor-pointer select-none" onClick={() => setSort('phone')}>
                      Phone Number {sortStatus.columnAccessor === 'phone' && (sortStatus.direction === 'asc' ? '↑' : '↓')}
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
                      <td colSpan={7} className="py-10 text-center text-sm opacity-70">
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
                          <strong className="text-info">#{row.customer_number || row.id.slice(0, 8)}</strong>
                          <Link href={`/customers/preview/${row.id}`} className="flex hover:text-info" title="View">
                            <IconEye className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                      <td className="font-semibold">{getCustomerName(row)}</td>
                      <td>{row.address || '-'}</td>
                      <td>{row.phone}</td>
                      <td>
                        {new Date(row.created_at).toLocaleDateString('en-GB', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                        })}
                      </td>
                      <td>
                        <div className="mx-auto flex w-max items-center gap-2">
                          <Link href={`/customers/edit/${row.id}`} className="flex hover:text-info">
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
              {records.length === 0 && (
                <div className="col-span-full py-10 text-center text-sm opacity-70">No records</div>
              )}
              {records.map((row) => (
                <div key={row.id} className="rounded-md border border-white-light bg-white p-4 shadow dark:border-[#17263c] dark:bg-[#121e32]">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-info/20 font-bold text-info">
                        {(getCustomerName(row) || '-').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold">{getCustomerName(row)}</div>
                        <div className="text-xs opacity-70">{row.type === 'private' ? 'Private' : 'Business'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/customers/preview/${row.id}`} className="flex hover:text-info" title="View">
                        <IconEye className="h-4 w-4" />
                      </Link>
                      <Link href={`/customers/edit/${row.id}`} className="flex hover:text-info">
                        <IconEdit className="h-4.5 w-4.5" />
                      </Link>
                      <button type="button" className="flex hover:text-danger" onClick={() => deleteRow(row.id)}>
                        <IconTrashLines />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1 text-sm opacity-90">
                    <div>{row.phone}</div>
                    <div>{row.email || '-'}</div>
                    <div>{row.address || '-'}</div>
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
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-info text-white">
                {page}
              </span>
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
                 title="Confirm Deletion"
                 message="Are you sure you want to delete this customer?"
                 onCancel={() => {
                     setShowConfirmModal(false);
                     setCustomerToDelete(null);
                 }}
                 onConfirm={confirmDeletion}
                 confirmLabel="Delete"
                 cancelLabel="Cancel"
                 size="sm"
             />
         </div>
     );
 };

 export default CustomersList;

