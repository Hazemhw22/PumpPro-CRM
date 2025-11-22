'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import IconEye from '@/components/icon/icon-eye';
import IconEdit from '@/components/icon/icon-edit';
import IconTrashLines from '@/components/icon/icon-trash-lines';
import IconCheck from '@/components/icon/icon-check';
import IconCaretDown from '@/components/icon/icon-caret-down';
import IconCaretUp from '@/components/icon/icon-carets-down';
import ProviderPdfButton from '@/components/pdf/provider-pdf-button';
import { supabase } from '@/lib/supabase/client';

interface BookingsCardProps {
    booking: any;
    userRole?: string | null;
    currentContractorId?: string | null;
    currentDriverId?: string | null;
    onDelete?: (id: string) => void;
    onConfirm?: (booking: any) => void;
    hasInvoice?: boolean;
}

export default function BookingsCard({ booking, userRole, currentContractorId, currentDriverId, onDelete, onConfirm, hasInvoice }: BookingsCardProps) {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [localServices, setLocalServices] = useState<any[]>([]);

    useEffect(() => {
        let mounted = true;
        const loadServices = async () => {
            try {
                // if booking already includes booking_services or services, skip fetch
                if ((booking?.booking_services && booking.booking_services.length > 0) || (booking?.services && booking.services.length > 0)) {
                    setLocalServices([]);
                    return;
                }

                if (!booking?.id) return;

                const { data, error } = await supabase.from('booking_services').select('id, service_id, quantity, unit_price, total_price, created_at').eq('booking_id', booking.id);

                if (!mounted) return;

                if (error) {
                    console.error('Error fetching booking_services for booking', booking?.id, error);
                    setLocalServices([]);
                    return;
                }

                if (data && Array.isArray(data) && data.length > 0) {
                    // resolve service names by fetching services table for service_ids
                    const rowsRaw = data as any[];
                    const uniqueServiceIds = Array.from(new Set(rowsRaw.map((r) => r.service_id).filter(Boolean)));
                    let servicesMap = new Map<string, any>();
                    if (uniqueServiceIds.length > 0) {
                        try {
                            const { data: svcList, error: svcError } = await supabase
                                .from('services')
                                .select('id, name')
                                .in('id', uniqueServiceIds as any);
                            if (!svcError && svcList) {
                                svcList.forEach((s: any) => servicesMap.set(s.id, s));
                            }
                        } catch (e) {
                            console.warn('Could not fetch services for booking_services mapping:', e);
                        }
                    }

                    const rows = rowsRaw.map((r) => ({
                        id: r.id,
                        name: (servicesMap.get(r.service_id) as any)?.name || r.service_name || r.name || '-',
                        service_id: r.service_id || null,
                        quantity: r.quantity || 1,
                        unit_price: r.unit_price || 0,
                        total_price: r.total_price ?? r.totalPrice ?? (r.unit_price || 0) * (r.quantity || 1),
                        description: r.description || null,
                        created_at: r.created_at || null,
                        scheduled_date: r.scheduled_date || null,
                        scheduled_time: r.scheduled_time || null,
                    }));
                    setLocalServices(rows);
                } else {
                    setLocalServices([]);
                }
            } catch (e) {
                console.warn('Could not load booking_services in BookingsCard:', e);
                setLocalServices([]);
            }
        };

        loadServices();
        return () => {
            mounted = false;
        };
    }, [booking?.id, booking?.booking_services, booking?.services]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed':
                return 'bg-success/10 border-success/20 text-success';
            case 'in_progress':
                return 'bg-info/10 border-info/20 text-info';
            case 'completed':
                return 'bg-primary/10 border-primary/20 text-primary';
            case 'cancelled':
                return 'bg-danger/10 border-danger/20 text-danger';
            default:
                return 'bg-warning/10 border-warning/20 text-warning';
        }
    };

    const getPaymentStatusColor = (status: string) => {
        return status === 'paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning';
    };

    const getStatusLabel = (status: string) => {
        return status?.replace(/_/g, ' ').toUpperCase() || 'PENDING';
    };

    return (
        <div
            className="panel bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setIsCollapsed(!isCollapsed)}
        >
            <div className="p-5">
                {/* Header Row - Booking # and Status */}
                <div className="mb-4">
                    {/* Top Row: Booking Number and Status Badge */}
                    <div className="flex items-start justify-between mb-4">
                        <h3 className="font-bold text-lg text-primary">#{booking.booking_number || booking.id.slice(0, 8)}</h3>
                        {/* Action Buttons Row - Always visible */}
                        <div className="flex items-center gap-2 flex-wrap mb-4">
                            <span className={`badge px-3 py-1 rounded-full font-semibold text-xs ${getStatusColor(booking.status)}`}>{getStatusLabel(booking.status)}</span>
                            <button
                                type="button"
                                className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium bg-gray-200/50 hover:bg-gray-300/50 dark:bg-gray-700/50 dark:hover:bg-gray-600/50 transition"
                                onClick={(e) => {
                                    e.stopPropagation();
                                }}
                                title="View"
                            >
                                <Link href={`/bookings/preview/${booking.id}`} className="flex items-center gap-1">
                                    <IconEye className="h-4 w-4" />
                                    Preview
                                </Link>
                            </button>

                            <button
                                type="button"
                                className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium bg-gray-200/50 hover:bg-gray-300/50 dark:bg-gray-700/50 dark:hover:bg-gray-600/50 transition"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsCollapsed(!isCollapsed);
                                }}
                            >
                                {isCollapsed ? (
                                    <>
                                        <IconCaretDown className="h-4 w-4" />
                                        Expand
                                    </>
                                ) : (
                                    <>
                                        <IconCaretUp className="h-4 w-4" />
                                        Collapse
                                    </>
                                )}
                            </button>

                            {userRole === 'admin' && !hasInvoice && booking.status !== 'confirmed' && (
                                <button
                                    type="button"
                                    className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium bg-gray-200/50 hover:bg-gray-300/50 dark:bg-gray-700/50 dark:hover:bg-gray-600/50 transition"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                    }}
                                    title="Edit"
                                >
                                    <Link href={`/bookings/edit/${booking.id}`} className="flex items-center gap-1">
                                        <IconEdit className="h-4 w-4" />
                                        Edit
                                    </Link>
                                </button>
                            )}

                            {userRole === 'admin' && (
                                <button
                                    type="button"
                                    className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium bg-danger/10 text-danger hover:bg-danger/20 dark:bg-danger/20 dark:hover:bg-danger/30 transition"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete?.(booking.id);
                                    }}
                                    title="Delete"
                                >
                                    <IconTrashLines className="h-4 w-4" />
                                    Delete
                                </button>
                            )}

                            {(userRole === 'contractor' || userRole === 'driver') && booking.status === 'awaiting_execution' && (
                                <button
                                    type="button"
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-success/10 text-success hover:bg-success/20 transition font-semibold text-xs"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onConfirm?.(booking);
                                    }}
                                    title="Confirm Booking"
                                >
                                    <IconCheck className="h-4 w-4" />
                                    Confirm Booking
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Info Grid - Service, Date, Time, Provider, Price, Balance - Hidden when expanded */}
                    {isCollapsed && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                            {/* Service Name Box */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded p-3">
                                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">Service</p>
                                {(() => {
                                    const services =
                                        booking?.booking_services && booking.booking_services.length > 0
                                            ? booking.booking_services
                                            : localServices && localServices.length > 0
                                              ? localServices
                                              : booking?.services && booking.services.length > 0
                                                ? booking.services
                                                : [{ name: booking.service_name || booking.service_type || '-' }];
                                    const names = services.map((s: any) => s.name || s.service_name || s.service_type || '-');
                                    const maxShown = 2;
                                    const full = names.join(', ');
                                    const shown = names.length <= maxShown ? names.join(', ') : `${names.slice(0, maxShown).join(', ')} +${names.length - maxShown} more`;
                                    return (
                                        <p title={full} className="font-bold text-xs text-gray-900 dark:text-white truncate">
                                            {shown}
                                        </p>
                                    );
                                })()}
                            </div>

                            {/* Service Date Box */}
                            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700/50 rounded p-3">
                                <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1">Date</p>
                                <p className="font-bold text-xs text-gray-900 dark:text-white">{booking.scheduled_date ? new Date(booking.scheduled_date).toLocaleDateString('en-GB') : '-'}</p>
                            </div>

                            {/* Service Time Box */}
                            <div className="bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-700/50 rounded p-3">
                                <p className="text-xs font-semibold text-pink-600 dark:text-pink-400 mb-1">Time</p>
                                <p className="font-bold text-xs text-gray-900 dark:text-white">{booking.scheduled_time || '-'}</p>
                            </div>

                            {/* Assigned Provider Box */}
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/50 rounded p-3">
                                <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">Provider</p>
                                <p className="font-bold text-xs text-gray-900 dark:text-white truncate">{booking.contractor?.name || booking.driver?.name || '-'}</p>
                            </div>

                            {/* Price Box */}
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded p-3">
                                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">Price</p>
                                <p className="font-bold text-xs text-amber-700 dark:text-amber-300">₪{booking.price || 0}</p>
                            </div>

                            {/* Balance Box */}
                            <div
                                className={`rounded p-3 border ${(() => {
                                    const balance = booking.remaining_amount !== undefined ? booking.remaining_amount : booking.price || 0;
                                    const isPaid = booking.payment_status === 'paid' || balance <= 0;
                                    return isPaid
                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700/50'
                                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/50';
                                })()}`}
                            >
                                <p
                                    className={`text-xs font-semibold mb-1 ${(() => {
                                        const balance = booking.remaining_amount !== undefined ? booking.remaining_amount : booking.price || 0;
                                        const isPaid = booking.payment_status === 'paid' || balance <= 0;
                                        return isPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
                                    })()}`}
                                >
                                    Balance
                                </p>
                                <p
                                    className={`font-bold text-xs ${(() => {
                                        const balance = booking.remaining_amount !== undefined ? booking.remaining_amount : booking.price || 0;
                                        const isPaid = booking.payment_status === 'paid' || balance <= 0;
                                        return isPaid ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300';
                                    })()}`}
                                >
                                    ₪
                                    {(() => {
                                        const balance = booking.remaining_amount !== undefined ? booking.remaining_amount : booking.price || 0;
                                        const isPaid = booking.payment_status === 'paid' || balance <= 0;
                                        return isPaid ? Math.abs(balance) : `-${Math.abs(balance)}`;
                                    })()}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Detailed Content - Only show when expanded */}
                {!isCollapsed && (
                    <>
                        {/* Top Info Row - Booking Date & Balance */}
                        <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-lg p-4">
                                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">Created Date</p>
                                <p className="font-bold text-sm text-gray-900 dark:text-white">{booking.created_at ? new Date(booking.created_at).toLocaleDateString('en-GB') : '-'}</p>
                            </div>
                            {(() => {
                                const balance = booking.remaining_amount !== undefined ? booking.remaining_amount : booking.price || 0;
                                const isPaid = booking.payment_status === 'paid' || balance <= 0;
                                const bgColor = isPaid
                                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700/50'
                                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/50';
                                const labelColor = isPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
                                const valueColor = isPaid ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300';

                                return (
                                    <div className={`border rounded-lg p-4 ${bgColor}`}>
                                        <p className={`text-xs font-semibold mb-1 ${labelColor}`}>Balance</p>
                                        <p className={`font-bold text-sm ${valueColor}`}>₪{isPaid ? Math.abs(balance) : `-${Math.abs(balance)}`}</p>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Customer Info - Card Box */}
                        <div className="mb-4 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/10 dark:to-blue-900/10 border border-cyan-200 dark:border-cyan-700/50 rounded-lg p-4">
                            <h4 className="text-sm font-bold text-cyan-900 dark:text-cyan-300 mb-4">👤 Customer Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white/60 dark:bg-slate-800/60 rounded p-3">
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Name</p>
                                    <p className="font-bold text-sm text-gray-900 dark:text-white">{booking.customer_name || '-'}</p>
                                </div>
                                <div className="bg-white/60 dark:bg-slate-800/60 rounded p-3">
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Phone</p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        <a href={`tel:${booking.customer_phone}`} className="hover:text-primary font-medium">
                                            {booking.customer_phone || '-'}
                                        </a>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Service & Location Info - Card Box */}
                        <div className="mb-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 border border-purple-200 dark:border-purple-700/50 rounded-lg p-4">
                            <h4 className="text-sm font-bold text-purple-900 dark:text-purple-300 mb-4">🔧 Service Details</h4>
                            <div className="space-y-3">
                                <div className="bg-white/60 dark:bg-slate-800/60 rounded p-3">
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Service Date</p>
                                    <p className="font-bold text-sm text-gray-900 dark:text-white">{booking.scheduled_date ? new Date(booking.scheduled_date).toLocaleDateString('en-GB') : '-'}</p>
                                </div>
                                <div className="bg-white/60 dark:bg-slate-800/60 rounded p-3">
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Service Time</p>
                                    <p className="font-bold text-sm text-gray-900 dark:text-white">{booking.scheduled_time || '-'}</p>
                                </div>
                                <div className="bg-white/60 dark:bg-slate-800/60 rounded p-3">
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Service Address</p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">{booking.service_address || '-'}</p>
                                </div>
                                {(booking.booking_services && booking.booking_services.length > 0) || (localServices && localServices.length > 0) ? (
                                    <div className="bg-white/60 dark:bg-slate-800/60 rounded p-3">
                                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Services</p>
                                        <div className="space-y-2">
                                            {(booking.booking_services && booking.booking_services.length > 0 ? booking.booking_services : localServices).map((service: any, idx: number) => {
                                                const qty = service.quantity || 1;
                                                const unit = service.unit_price ?? service.unitPrice ?? 0;
                                                const total = service.total_price ?? service.totalPrice ?? unit * qty;
                                                return (
                                                    <div key={idx} className="flex justify-between items-center text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-slate-700/50 rounded p-2">
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-medium">{service.name || service.service_name || '-'}</span>
                                                            <span className="text-gray-500">·</span>
                                                            <span className="text-gray-600 dark:text-gray-400">x{qty}</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="font-medium text-xs text-amber-700 dark:text-amber-300">₪{unit}</div>
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">₪{total}</div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white/60 dark:bg-slate-800/60 rounded p-3">
                                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Service Type</p>
                                        <p className="font-bold text-sm text-gray-900 dark:text-white">{booking.service_name || booking.service_type || '-'}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Price & Profit & Payment Status - Card Box */}
                        <div className="mb-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 border border-amber-200 dark:border-amber-700/50 rounded-lg p-4">
                            <h4 className="text-sm font-bold text-amber-900 dark:text-amber-300 mb-4">💰 Financial Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white/60 dark:bg-slate-800/60 rounded p-3">
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Price</p>
                                    <p className="font-bold text-base text-success">₪{booking.price || 0}</p>
                                </div>
                                <div className="bg-white/60 dark:bg-slate-800/60 rounded p-3">
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Profit</p>
                                    <p className="font-bold text-base text-primary">₪{booking.profit || 0}</p>
                                </div>
                                <div className="bg-white/60 dark:bg-slate-800/60 rounded p-3">
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Payment Status</p>
                                    <span className={`inline-block badge px-2 py-1 rounded text-xs font-semibold ${getPaymentStatusColor(booking.payment_status)}`}>
                                        {booking.payment_status?.toUpperCase() || 'PENDING'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Provider Info - Conditional based on provider type */}
                        {booking.contractor?.name ? (
                            <div className="mb-4 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/10 dark:to-rose-900/10 border border-red-200 dark:border-red-700/50 rounded-lg p-4">
                                <h4 className="text-sm font-bold text-red-900 dark:text-red-300 mb-4">🏗️ Assigned Provider</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-white/60 dark:bg-slate-800/60 rounded p-3">
                                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Contractor</p>
                                        <p className="font-bold text-sm text-gray-900 dark:text-white">{booking.contractor.name}</p>
                                    </div>
                                    <div className="bg-white/60 dark:bg-slate-800/60 rounded p-3">
                                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Contractor Price</p>
                                        <p className="font-bold text-sm text-red-600 dark:text-red-400">₪{booking.contractor_price || 0}</p>
                                    </div>
                                </div>
                            </div>
                        ) : booking.driver?.name ? (
                            <div className="mb-4 bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/10 dark:to-teal-900/10 border border-green-200 dark:border-green-700/50 rounded-lg p-4">
                                <h4 className="text-sm font-bold text-green-900 dark:text-green-300 mb-4">🚚 Assigned Providers</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-white/60 dark:bg-slate-800/60 rounded p-3">
                                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Driver</p>
                                        <p className="font-bold text-sm text-gray-900 dark:text-white">{booking.driver.name}</p>
                                    </div>
                                    <div className="bg-white/60 dark:bg-slate-800/60 rounded p-3">
                                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Truck Number</p>
                                        <p className="font-bold text-sm text-gray-900 dark:text-white">{booking.truck?.truck_number || '-'}</p>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        {/* Action Buttons */}
                        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-600 flex flex-wrap items-center gap-2">
                            {userRole === 'admin' && booking.status === 'confirmed' && <ProviderPdfButton booking={booking} provider={booking.contractor || booking.driver} role={userRole} />}

                            {(userRole === 'contractor' || userRole === 'driver') && (
                                <>
                                    {booking.status === 'awaiting_execution' && (
                                        <button
                                            type="button"
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-success/10 text-success hover:bg-success/20 transition font-semibold text-xs"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onConfirm?.(booking);
                                            }}
                                            title="Confirm Booking"
                                        >
                                            <IconCheck className="h-4 w-4" />
                                            Confirm Booking
                                        </button>
                                    )}

                                    {booking.status === 'confirmed' && <ProviderPdfButton booking={booking} provider={booking.contractor || booking.driver} role={userRole} />}
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
