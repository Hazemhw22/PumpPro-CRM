'use client';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import IconEye from '@/components/icon/icon-eye';
import IconEdit from '@/components/icon/icon-edit';
import IconTrashLines from '@/components/icon/icon-trash-lines';
import IconCheck from '@/components/icon/icon-check';
import IconCaretDown from '@/components/icon/icon-caret-down';
import IconCaretUp from '@/components/icon/icon-carets-down';
import IconBox from '@/components/icon/icon-box';
import IconHorizontalDots from '@/components/icon/icon-horizontal-dots';
import ProviderPdfButton from '@/components/pdf/provider-pdf-button';
import { supabase } from '@/lib/supabase/client';
import { getTranslation } from '@/i18n';

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
    const { t } = getTranslation();
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [localServices, setLocalServices] = useState<any[]>([]);
    const [customerPhoto, setCustomerPhoto] = useState<string | null>(null);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const mobileMenuRef = useRef<HTMLDivElement>(null);

    // Close mobile menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
                setShowMobileMenu(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

                const { data, error } = await supabase.from('booking_services').select('id, booking_id, service_id, quantity, unit_price, total_price, created_at').eq('booking_id', booking.id);

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

    // Fetch customer photo if customer_id exists
    useEffect(() => {
        let mounted = true;
        const loadCustomerPhoto = async () => {
            if (!booking?.customer_id) {
                setCustomerPhoto(null);
                return;
            }
            try {
                const { data: customerData } = await supabase.from('customers').select('photo_url').eq('id', booking.customer_id).maybeSingle();
                if (mounted && customerData && (customerData as any).photo_url) {
                    setCustomerPhoto((customerData as any).photo_url);
                } else if (mounted) {
                    setCustomerPhoto(null);
                }
            } catch (e) {
                console.warn('Could not load customer photo:', e);
                if (mounted) setCustomerPhoto(null);
            }
        };
        loadCustomerPhoto();
        return () => {
            mounted = false;
        };
    }, [booking?.customer_id]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed':
                return 'success';
            case 'in_progress':
                return 'info';
            case 'completed':
                return 'primary';
            case 'cancelled':
                return 'error';
            case 'request':
                return 'warning';
            case 'awaiting_execution':
                return 'warning';
            default:
                return 'warning';
        }
    };

    const getStatusBadgeColor = (status: string) => {
        const color = getStatusColor(status);
        const colorMap: { [key: string]: string } = {
            success: 'bg-success/10 text-success dark:bg-success/20 dark:text-success',
            info: 'bg-info/10 text-info dark:bg-info/20 dark:text-info',
            primary: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary',
            error: 'bg-danger/10 text-danger dark:bg-danger/20 dark:text-danger',
            warning: 'bg-warning/10 text-warning dark:bg-warning/20 dark:text-warning',
        };
        return colorMap[color] || colorMap.warning;
    };

    const getPaymentStatusColor = (status: string) => {
        return status === 'paid' ? 'bg-success/10 text-success dark:bg-success/20 dark:text-success' : 'bg-warning/10 text-warning dark:bg-warning/20 dark:text-warning';
    };

    const getStatusLabel = (status: string) => {
        const statusMap: { [key: string]: string } = {
            confirmed: t('confirmed_status') || 'Confirmed',
            request: t('request_status') || 'Request',
            awaiting_execution: t('awaiting_execution_status') || 'Awaiting Execution',
            in_progress: t('in_progress') || 'In Progress',
            completed: t('completed') || 'Completed',
            cancelled: t('cancelled') || 'Cancelled',
        };
        return statusMap[status] || status?.replace(/_/g, ' ').toUpperCase() || 'PENDING';
    };

    return (
        <div
            className="rounded-lg border border-gray-200 bg-white text-gray-950 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setIsCollapsed(!isCollapsed)}
        >
            <div className="p-6">
                {/* Header Row - Booking # and Status */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">#{booking.booking_number || booking.id.slice(0, 8)}</h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 justify-center gap-1 rounded-full font-medium text-sm ${getStatusBadgeColor(booking.status)}`}>
                                {getStatusLabel(booking.status)}
                            </span>
                        </div>
                        {isCollapsed && <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">₪{booking.price || 0}</p>}
                    </div>

                    {/* Action Buttons Row - Always visible */}
                    <div className="flex items-center gap-2">
                        {/* Preview Button - Hidden on mobile (shown in menu) */}
                        <button
                            type="button"
                            className="hidden md:inline-flex items-center justify-center font-medium gap-2 rounded-lg transition px-4 py-3 text-sm bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300"
                            onClick={(e) => {
                                e.stopPropagation();
                            }}
                            title="View"
                        >
                            <Link href={`/bookings/preview/${booking.id}`} className="flex items-center gap-1">
                                <IconEye className="h-4 w-4" />
                                <span className="hidden sm:inline">{t('preview') || 'Preview'}</span>
                            </Link>
                        </button>

                        {/* Collapse/Expand Button - Always visible */}
                        <button
                            type="button"
                            className="inline-flex items-center justify-center font-medium gap-2 rounded-lg transition px-4 py-3 text-sm bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsCollapsed(!isCollapsed);
                            }}
                        >
                            {isCollapsed ? (
                                <>
                                    <IconCaretDown className="h-4 w-4" />
                                    <span className="hidden sm:inline">{t('expand') || 'Expand'}</span>
                                </>
                            ) : (
                                <>
                                    <IconCaretUp className="h-4 w-4" />
                                    <span className="hidden sm:inline">{t('collapse') || 'Collapse'}</span>
                                </>
                            )}
                        </button>

                        {/* Desktop: Edit and Delete buttons */}
                        {userRole === 'admin' && !hasInvoice && booking.status !== 'confirmed' && (
                            <button
                                type="button"
                                className="hidden md:inline-flex items-center justify-center font-medium gap-2 rounded-lg transition px-4 py-3 text-sm bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300"
                                onClick={(e) => {
                                    e.stopPropagation();
                                }}
                                title={t('edit') || 'Edit'}
                            >
                                <Link href={`/bookings/edit/${booking.id}`} className="flex items-center gap-1">
                                    <IconEdit className="h-4 w-4" />
                                    <span className="hidden sm:inline">{t('edit') || 'Edit'}</span>
                                </Link>
                            </button>
                        )}

                        {userRole === 'admin' && (
                            <button
                                type="button"
                                className="hidden md:inline-flex items-center justify-center font-medium gap-2 rounded-lg transition px-4 py-3 text-sm bg-white text-red-600 ring-1 ring-inset ring-red-300 hover:bg-red-50 dark:bg-gray-800 dark:text-red-400 dark:ring-red-700 dark:hover:bg-red-900/20"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete?.(booking.id);
                                }}
                                title={t('delete') || 'Delete'}
                            >
                                <IconTrashLines className="h-4 w-4" />
                                <span className="hidden sm:inline">{t('delete') || 'Delete'}</span>
                            </button>
                        )}

                        {/* Mobile: 3-dot menu - Show if admin has actions OR always show for mobile optimization */}
                        <div ref={mobileMenuRef} className="relative md:hidden">
                            <button
                                type="button"
                                className="inline-flex items-center justify-center rounded-lg transition p-2 text-sm bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMobileMenu(!showMobileMenu);
                                }}
                                title="More options"
                            >
                                <IconHorizontalDots className="h-5 w-5" />
                            </button>

                            {/* Mobile Menu Dropdown */}
                            {showMobileMenu && (
                                <div className="absolute right-0 mt-2 w-48 rounded-md border border-gray-200 bg-white shadow-lg dark:bg-gray-800 dark:border-gray-700 z-50">
                                    <div className="py-1">
                                        <Link
                                            href={`/bookings/preview/${booking.id}`}
                                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowMobileMenu(false);
                                            }}
                                        >
                                            <IconEye className="h-4 w-4" />
                                            {t('preview_button') || 'Preview'}
                                        </Link>
                                        {userRole === 'admin' && !hasInvoice && booking.status !== 'confirmed' && (
                                            <Link
                                                href={`/bookings/edit/${booking.id}`}
                                                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowMobileMenu(false);
                                                }}
                                            >
                                                <IconEdit className="h-4 w-4" />
                                                {t('edit') || 'Edit'}
                                            </Link>
                                        )}
                                        {userRole === 'admin' && (
                                            <button
                                                type="button"
                                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowMobileMenu(false);
                                                    onDelete?.(booking.id);
                                                }}
                                            >
                                                <IconTrashLines className="h-4 w-4" />
                                                {t('delete') || 'Delete'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Collapsed View - Show key info */}
                {isCollapsed && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        {booking.scheduled_date && (
                            <p>
                                {new Date(booking.scheduled_date).toLocaleDateString('en-GB')} {booking.scheduled_time ? `${t('at_time') || 'at'} ${booking.scheduled_time}` : ''}
                            </p>
                        )}
                    </div>
                )}

                {/* Detailed Content - Only show when expanded */}
                {!isCollapsed && (
                    <>
                        {/* Customer Information */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            {/* Customer Info */}
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">{t('customer_info') || 'Customer Info'}</h4>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                                            {customerPhoto ? (
                                                <img src={customerPhoto} alt={booking.customer_name || 'Customer'} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-xs font-medium text-gray-400">{(booking.customer_name || 'C').charAt(0).toUpperCase()}</span>
                                            )}
                                        </div>
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">{booking.customer_name || '-'}</span>
                                    </div>
                                    {booking.customer_phone && (
                                        <div>
                                            <a href={`tel:${booking.customer_phone}`} className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary">
                                                {booking.customer_phone}
                                            </a>
                                        </div>
                                    )}
                                    {booking.service_address && (
                                        <div>
                                            <span className="text-sm text-gray-600 dark:text-gray-400">{booking.service_address}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Booking Info */}
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">{t('booking_info') || 'Booking Info'}</h4>
                                <div className="space-y-1">
                                    {booking.scheduled_date && (
                                        <div>
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                {t('date_label') || 'Date'}: {new Date(booking.scheduled_date).toLocaleDateString('en-GB')}
                                            </span>
                                        </div>
                                    )}
                                    {booking.scheduled_time && (
                                        <div>
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                {t('time_label') || 'Time'}: {booking.scheduled_time}
                                            </span>
                                        </div>
                                    )}
                                    {booking.created_at && (
                                        <div>
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                {t('created_label') || 'Created'}: {new Date(booking.created_at).toLocaleDateString('en-GB')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Provider Info */}
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                                    {booking.contractor?.name ? t('contractor_label') || 'Contractor' : booking.driver?.name ? t('driver_label') || 'Driver' : t('provider_label') || 'Provider'}
                                </h4>
                                <div className="space-y-1">
                                    {booking.contractor?.name ? (
                                        <>
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                                                    <span className="text-xs font-medium text-gray-400">{booking.contractor.name.charAt(0).toUpperCase()}</span>
                                                </div>
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">{booking.contractor.name}</span>
                                            </div>
                                            {booking.contractor_price && (
                                                <div>
                                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                                        {t('price_label') || 'Price'}: ₪{booking.contractor_price}
                                                    </span>
                                                </div>
                                            )}
                                        </>
                                    ) : booking.driver?.name ? (
                                        <>
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                                                    <span className="text-xs font-medium text-gray-400">{booking.driver.name.charAt(0).toUpperCase()}</span>
                                                </div>
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">{booking.driver.name}</span>
                                            </div>
                                            {booking.truck?.truck_number && (
                                                <div>
                                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                                        {t('truck_label') || 'Truck'}: {booking.truck.truck_number}
                                                    </span>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div>
                                            <span className="text-sm text-gray-500 dark:text-gray-400">{t('not_assigned') || 'Not assigned'}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Services List */}
                        {(() => {
                            // Get all services from different possible sources
                            const allServices =
                                booking.booking_services && booking.booking_services.length > 0
                                    ? booking.booking_services
                                    : localServices && localServices.length > 0
                                      ? localServices
                                      : booking.services && booking.services.length > 0
                                        ? booking.services
                                        : [];

                            return allServices.length > 0 ? (
                                <div className="mb-4">
                                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                                        {t('services_label') || 'Services'} ({allServices.length})
                                    </h4>
                                    <div className="space-y-2">
                                        {allServices.slice(0, 3).map((service: any, idx: number) => {
                                            const qty = service.quantity || 1;
                                            const unit = service.unit_price ?? service.unitPrice ?? 0;
                                            const total = service.total_price ?? service.totalPrice ?? unit * qty;
                                            const serviceName = service.name || service.service_name || service.service_type || '-';
                                            return (
                                                <div key={idx} className="flex items-center gap-3 text-sm">
                                                    <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                                                        <IconBox className="h-4 w-4 text-gray-400" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-gray-900 dark:text-white font-medium">{serviceName}</div>
                                                        <div className="text-gray-500 text-xs">×{qty}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="font-medium text-gray-900 dark:text-white block">₪{total}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {allServices.length > 3 && (
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                +{allServices.length - 3} {t('more_services') || 'more services'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="mb-4">
                                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">{t('services_label') || 'Services'}</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{booking.service_name || booking.service_type || '-'}</p>
                                </div>
                            );
                        })()}

                        {/* Pricing Summary */}
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600 dark:text-gray-400">{t('price_label') || 'Price'}:</span>
                                <span className="font-medium">₪{booking.price || 0}</span>
                            </div>
                            {booking.profit !== undefined && booking.profit > 0 && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">{t('profit_label') || 'Profit'}:</span>
                                    <span className="font-medium text-primary">₪{booking.profit}</span>
                                </div>
                            )}
                            {(() => {
                                const balance = booking.remaining_amount !== undefined ? booking.remaining_amount : booking.price || 0;
                                const isPaid = booking.payment_status === 'paid' || balance <= 0;
                                return (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">{t('balance_label') || 'Balance'}:</span>
                                        <span className={`font-medium ${isPaid ? 'text-success dark:text-success' : 'text-danger dark:text-danger'}`}>
                                            ₪{isPaid ? Math.abs(balance) : `-${Math.abs(balance)}`}
                                        </span>
                                    </div>
                                );
                            })()}
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600 dark:text-gray-400">{t('payment_status_label') || 'Payment Status'}:</span>
                                <span className={`inline-flex items-center px-2.5 py-0.5 justify-center gap-1 rounded-full font-medium text-sm ${getPaymentStatusColor(booking.payment_status)}`}>
                                    {booking.payment_status === 'paid' ? t('paid_status') || 'Paid' : t('pending_status') || 'Pending'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-base font-semibold border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                                <span>{t('total_label') || 'Total'}:</span>
                                <span>₪{booking.price || 0}</span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                            {(userRole === 'contractor' || userRole === 'driver') && booking.status === 'awaiting_execution' && (
                                <button
                                    type="button"
                                    className="inline-flex items-center justify-center font-medium gap-2 rounded-lg transition px-4 py-3 text-sm bg-success text-white hover:bg-success/90"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onConfirm?.(booking);
                                    }}
                                >
                                    <IconCheck className="h-4 w-4" />
                                    {t('confirm_booking_button') || 'Confirm Booking'}
                                </button>
                            )}

                            {userRole === 'admin' && booking.status === 'confirmed' && (
                                <div onClick={(e) => e.stopPropagation()}>
                                    <ProviderPdfButton booking={booking} provider={booking.contractor || booking.driver} role={userRole} />
                                </div>
                            )}

                            {(userRole === 'contractor' || userRole === 'driver') && booking.status === 'confirmed' && (
                                <div onClick={(e) => e.stopPropagation()}>
                                    <ProviderPdfButton booking={booking} provider={booking.contractor || booking.driver} role={userRole} />
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
