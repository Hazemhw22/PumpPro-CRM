'use client';
import Link from 'next/link';
import { useState } from 'react';
import IconEye from '@/components/icon/icon-eye';
import IconEdit from '@/components/icon/icon-edit';
import IconTrashLines from '@/components/icon/icon-trash-lines';
import IconCheck from '@/components/icon/icon-check';
import IconCaretDown from '@/components/icon/icon-caret-down';
import IconCaretUp from '@/components/icon/icon-carets-down';
import ProviderPdfButton from '@/components/pdf/provider-pdf-button';

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
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-lg text-primary">#{booking.booking_number || booking.id.slice(0, 8)}</h3>
                            <span className={`badge px-3 py-1 rounded-full font-semibold text-xs ${getStatusColor(booking.status)}`}>{getStatusLabel(booking.status)}</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(booking.scheduled_date).toLocaleDateString('en-GB')} at {booking.scheduled_time || 'TBD'}
                        </p>
                        {isCollapsed && <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">₪{booking.price || 0}</p>}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap justify-end">
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

                        {userRole === 'admin' && !hasInvoice && (
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
                    </div>
                </div>

                {/* Detailed Content - Only show when expanded */}
                {!isCollapsed && (
                    <>
                        {/* Customer Info */}
                        <div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-600">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Customer Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Name</p>
                                    <p className="font-medium text-sm">{booking.customer_name}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Phone</p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        <a href={`tel:${booking.customer_phone}`} className="hover:text-primary">
                                            {booking.customer_phone}
                                        </a>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Service & Location Info */}
                        <div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-600">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Service Details</h4>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Service Type</p>
                                    <p className="font-medium text-sm">{booking.service_name || booking.service_type}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Service Address</p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">{booking.service_address || '-'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Price & Profit & Payment Status */}
                        <div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-600">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Financial Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Price</p>
                                    <p className="font-bold text-base text-success">₪{booking.price || 0}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Profit</p>
                                    <p className="font-bold text-base text-primary">₪{booking.profit || 0}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Payment Status</p>
                                    <span className={`inline-block badge px-2 py-1 rounded text-xs font-semibold ${getPaymentStatusColor(booking.payment_status)}`}>
                                        {booking.payment_status?.toUpperCase() || 'PENDING'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Provider Info - Conditional based on provider type */}
                        {booking.contractor?.name ? (
                            <div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-600">
                                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Assigned Provider</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Contractor</p>
                                        <p className="font-medium text-sm">{booking.contractor.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Contractor Price</p>
                                        <p className="font-bold text-sm text-primary">₪{booking.contractor_price || 0}</p>
                                    </div>
                                </div>
                            </div>
                        ) : booking.driver?.name ? (
                            <>
                                {/* Driver & Truck Info */}
                                <div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-600">
                                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Assigned Providers</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Driver</p>
                                            <p className="font-medium text-sm">{booking.driver.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Truck Number</p>
                                            <p className="font-medium text-sm">{booking.truck?.truck_number || '-'}</p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : null}

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2">
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
