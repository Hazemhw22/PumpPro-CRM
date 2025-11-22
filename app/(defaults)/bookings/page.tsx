'use client';
import IconPlus from '@/components/icon/icon-plus';
import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
/* eslint-disable react-hooks/exhaustive-deps */
import { supabase } from '@/lib/supabase/client';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import ConfirmModal from '@/components/modals/confirm-modal';
import { getTranslation } from '@/i18n';
import BookingsCard from '@/components/bookings/bookings-card';
import Tabs from '@/components/ui/tabs';

interface Booking {
    id: string;
    created_at: string;
    booking_number: string;
    customer_name: string;
    customer_phone: string;
    service_address: string;
    scheduled_date: string;
    scheduled_time: string;
    status: 'pending' | 'request' | 'awaiting_execution' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
    service_type: string;
    contractor_id?: string | null;
    driver_id?: string | null;
    contractor?: { id?: string; name?: string } | null;
    driver?: { id?: string; name?: string } | null;
    price?: number;
    profit?: number;
    payment_status?: string;
    truck?: { truck_number?: string } | null;
}

type TabType = 'pending' | 'request' | 'awaiting_execution' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

const BookingsList = () => {
    const { t } = getTranslation();
    const router = useRouter();
    const [items, setItems] = useState<Booking[]>([]);
    const [role, setRole] = useState<string | null>(null);
    const [currentDriverId, setCurrentDriverId] = useState<string | null>(null);
    const [currentContractorId, setCurrentContractorId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('request');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);
    const [searchTerm, setSearchTerm] = useState('');
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

                        setCurrentDriverId(driverId);
                        setCurrentContractorId(contractorId);
                    }
                } catch (e) {
                    // ignore
                }

                // Enforce role-based filtering strictly
                if (role === 'contractor' && !contractorId) {
                    setItems([] as any);
                    setLoading(false);
                    return;
                }
                if (role === 'driver' && !driverId) {
                    setItems([] as any);
                    setLoading(false);
                    return;
                }

                // Fetch bookings with optional role filter
                let bookingsQuery: any = supabase.from('bookings').select('*');
                if (role === 'contractor') bookingsQuery = bookingsQuery.eq('contractor_id', contractorId);
                if (role === 'driver') bookingsQuery = bookingsQuery.eq('driver_id', driverId);

                const { data: bookingsData, error: bookingsError } = await bookingsQuery.order('created_at', { ascending: false });

                if (bookingsError) throw bookingsError;

                // Fetch related data
                const truckIds = Array.from(new Set(bookingsData?.map((b: any) => b.truck_id).filter(Boolean)));
                const driverIds = Array.from(new Set(bookingsData?.map((b: any) => b.driver_id).filter(Boolean)));
                const serviceIds = Array.from(new Set(bookingsData?.map((b: any) => b.service_type).filter(Boolean)));
                const contractorIds = Array.from(new Set(bookingsData?.map((b: any) => b.contractor_id).filter(Boolean)));

                // Fetch invoices for these bookings
                const bookingIds = Array.from(new Set(bookingsData?.map((b: any) => b.id).filter(Boolean)));
                let invoiceBookingSet = new Set<string>();
                if (bookingIds.length > 0) {
                    try {
                        const { data: invoicesForBookings } = await supabase
                            .from('invoices')
                            .select('booking_id')
                            .in('booking_id', bookingIds as any);
                        if (invoicesForBookings) invoiceBookingSet = new Set((invoicesForBookings as any[]).map((i) => i.booking_id).filter(Boolean));
                    } catch (err) {
                        console.warn('Could not fetch invoices for bookings:', err);
                    }
                }

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
                    has_invoice: invoiceBookingSet.has(booking.id),
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

    const filteredBookings = useMemo(() => {
        let filtered = items;

        // Filter by status
        filtered = items.filter((booking) => booking.status === activeTab);

        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(
                (booking) =>
                    booking.booking_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    booking.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    booking.customer_phone?.includes(searchTerm),
            );
        }

        return filtered;
    }, [items, activeTab, searchTerm]);

    // Pagination logic
    const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedBookings = useMemo(() => filteredBookings.slice(startIndex, endIndex), [filteredBookings, startIndex, endIndex]);

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId as TabType);
        setCurrentPage(1);
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleDelete = (id: string) => {
        const booking = items.find((b) => b.id === id);
        if (booking) {
            setBookingToDelete(booking);
            setShowConfirmModal(true);
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

    const handleConfirmBooking = async (booking: Booking) => {
        if (booking.status === 'confirmed') return;
        try {
            // @ts-ignore
            const { error: updateError } = await (supabase as any).from('bookings').update({ status: 'confirmed' }).eq('id', booking.id);
            if (updateError) throw updateError;

            // @ts-ignore
            const { error: trackError } = await supabase.from('booking_tracks').insert([
                {
                    booking_id: booking.id,
                    old_status: booking.status,
                    new_status: 'confirmed',
                    created_at: new Date().toISOString(),
                },
            ] as any);

            if (trackError) {
                console.error('Could not insert booking track:', trackError);
            }

            setItems((prev) => prev.map((b) => (b.id === booking.id ? ({ ...b, status: 'confirmed' } as any) : b)) as any);
            setAlert({ visible: true, message: t('booking_confirmed') || 'Booking confirmed', type: 'success' });
        } catch (error) {
            console.error('Error confirming booking:', error);
            setAlert({ visible: true, message: t('error_confirming_booking') || 'Error confirming booking', type: 'danger' });
        }
    };

    // Tab items with counts
    const tabItems = [
        {
            id: 'request',
            label: `Request (${items.filter((o) => o.status === 'request').length})`,
        },
        {
            id: 'awaiting_execution',
            label: `Awaiting Execution (${items.filter((o) => o.status === 'awaiting_execution').length})`,
        },
        {
            id: 'confirmed',
            label: `Confirmed (${items.filter((o) => o.status === 'confirmed').length})`,
        },
    ] as any;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Alert */}
            {alert.visible && (
                <div className="max-w-96">
                    <Alert
                        type={alert.type}
                        title={alert.type === 'success' ? t('success') : t('error')}
                        message={alert.message}
                        onClose={() => setAlert({ visible: false, message: '', type: 'success' })}
                    />
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Bookings</h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage and track all your bookings</p>
                </div>
                {role === 'admin' && (
                    <Link href="/bookings/add" className="btn btn-primary gap-2">
                        <IconPlus className="h-4 w-4" />
                        Add New Booking
                    </Link>
                )}
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="panel bg-gradient-to-br from-blue-500/10 to-blue-600/10">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Total Bookings</p>
                            <p className="text-2xl font-bold text-primary mt-1">{items.length}</p>
                        </div>
                        <div className="text-3xl opacity-20">📋</div>
                    </div>
                </div>
                <div className="panel bg-gradient-to-br from-yellow-500/10 to-yellow-600/10">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Request</p>
                            <p className="text-2xl font-bold text-warning mt-1">{items.filter((o) => o.status === 'request').length}</p>
                        </div>
                        <div className="text-3xl opacity-20">📝</div>
                    </div>
                </div>
                <div className="panel bg-gradient-to-br from-orange-500/10 to-orange-600/10">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Awaiting Execution</p>
                            <p className="text-2xl font-bold text-orange-500 mt-1">{items.filter((o) => o.status === 'awaiting_execution').length}</p>
                        </div>
                        <div className="text-3xl opacity-20">⏳</div>
                    </div>
                </div>
                <div className="panel bg-gradient-to-br from-green-500/10 to-green-600/10">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Confirmed</p>
                            <p className="text-2xl font-bold text-success mt-1">{items.filter((o) => o.status === 'confirmed').length}</p>
                        </div>
                        <div className="text-3xl opacity-20">✅</div>
                    </div>
                </div>
            </div>

            {/* Main Content Panel */}
            <div className="panel">
                {/* Tab Navigation */}
                <div className="mb-6 border-b border-white-light dark:border-[#191e3a]">
                    <Tabs items={tabItems} activeTab={activeTab} onTabChange={handleTabChange} />
                </div>

                {/* Search Bar */}
                <div className="mb-6">
                    <input
                        type="text"
                        placeholder="Search by booking number, customer name, or phone..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="form-input w-full"
                    />
                </div>

                {/* Bookings Cards */}
                <div className="space-y-4 mb-6">
                    {paginatedBookings.length > 0 ? (
                        paginatedBookings.map((booking) => (
                            <BookingsCard
                                key={booking.id}
                                booking={booking}
                                userRole={role}
                                currentContractorId={currentContractorId}
                                currentDriverId={currentDriverId}
                                onDelete={handleDelete}
                                onConfirm={handleConfirmBooking}
                                hasInvoice={(booking as any).has_invoice}
                            />
                        ))
                    ) : (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <p>No {activeTab.replace(/_/g, ' ')} bookings found</p>
                            <p className="text-sm mt-2">{searchTerm ? 'Try adjusting your search terms' : 'Bookings will appear here when available'}</p>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-white-light dark:border-[#191e3a] pt-6">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            Showing {startIndex + 1} to {Math.min(endIndex, filteredBookings.length)} of {filteredBookings.length} bookings
                        </div>
                        <div className="flex items-center gap-2">
                            <button type="button" className="btn btn-sm btn-outline-primary disabled:opacity-50" disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)}>
                                Previous
                            </button>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter((p) => {
                                        if (totalPages <= 5) return true;
                                        if (p === 1 || p === totalPages) return true;
                                        if (p >= currentPage - 1 && p <= currentPage + 1) return true;
                                        return false;
                                    })
                                    .map((p, i, arr) => (
                                        <React.Fragment key={p}>
                                            {i > 0 && arr[i - 1] !== p - 1 && <span className="px-1">...</span>}
                                            <button type="button" className={`btn btn-sm ${currentPage === p ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => handlePageChange(p)}>
                                                {p}
                                            </button>
                                        </React.Fragment>
                                    ))}
                            </div>
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-primary disabled:opacity-50"
                                disabled={currentPage === totalPages}
                                onClick={() => handlePageChange(currentPage + 1)}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
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
