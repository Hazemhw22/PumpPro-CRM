import React, { useState, useEffect, useRef } from 'react';
import IconCaretDown from '@/components/icon/icon-caret-down';
import { getTranslation } from '@/i18n';
import { BookingDetail } from '@/types/database.types';

interface BookingSelectProps {
    bookings: BookingDetail[];
    selectedBooking: BookingDetail | null;
    onChange: (booking: BookingDetail | null) => void;
    className?: string;
}

const BookingSelect = ({ bookings, selectedBooking, onChange, className = 'form-select text-white-dark' }: BookingSelectProps) => {
    const { t } = getTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredBookings = bookings.filter((booking) => {
        const search = searchTerm.toLowerCase();
        return (
            booking.booking_number.toLowerCase().includes(search) ||
            booking.customer_name.toLowerCase().includes(search) ||
            booking.service_type.toLowerCase().includes(search) ||
            booking.service_address.toLowerCase().includes(search)
        );
    });

    const handleBookingSelect = (booking: BookingDetail) => {
        onChange(booking);
        setIsOpen(false);
        setSearchTerm('');
    };

    const getSelectedLabel = () => {
        if (selectedBooking) {
            return (
                <div className="flex items-center gap-2">
                    <span className="font-medium">{selectedBooking.booking_number}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        — {selectedBooking.customer_name} — {selectedBooking.service_type}
                    </span>
                </div>
            );
        }
        return <span className="text-gray-500 dark:text-gray-400">{t('select_booking') || 'Select Booking'}</span>;
    };

    return (
        <div ref={wrapperRef} className="relative">
            <div
                className={`${className} cursor-pointer rounded-lg border border-gray-300 dark:border-[#374151] bg-white dark:bg-black hover:border-primary dark:hover:border-primary transition-all duration-200 min-h-[60px] flex items-center justify-between px-4`}
                onClick={() => setIsOpen(!isOpen)}
            >
                {getSelectedLabel()}
                <IconCaretDown className={`w-4 h-4 transition-transform duration-200 text-gray-500 dark:text-gray-400 ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            {isOpen && (
                <div className="absolute z-50 mt-2 w-full rounded-lg border border-gray-200 dark:border-[#374151] bg-white dark:bg-black shadow-lg shadow-black/10 dark:shadow-black/50">
                    {/* Search Input */}
                    <div className="p-3 border-b border-gray-200 dark:border-[#374151]">
                        <input
                            type="text"
                            className="w-full rounded border border-gray-300 p-2 text-sm focus:border-primary focus:outline-none dark:bg-black dark:border-[#374151] dark:text-white-dark"
                            placeholder={t('search_bookings') || 'Search bookings...'}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    <div className="max-h-60 overflow-y-auto p-2">
                        {filteredBookings.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                                <p className="text-sm">{t('no_bookings_found') || 'No bookings found'}</p>
                            </div>
                        ) : (
                            filteredBookings.map((booking) => (
                                <div
                                    key={booking.id}
                                    className={`cursor-pointer rounded-lg p-4 mb-1 last:mb-0 hover:bg-gray-50 dark:hover:bg-[#1a2238] transition-all duration-200 ${
                                        selectedBooking?.id === booking.id
                                            ? 'bg-primary/10 dark:bg-primary/20 border border-primary'
                                            : 'border border-transparent'
                                    }`}
                                    onClick={() => handleBookingSelect(booking)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900 dark:text-white mb-1">
                                                {booking.booking_number}
                                            </div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                                {booking.customer_name}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-500">
                                                {booking.service_type} • {booking.service_address}
                                            </div>
                                            {booking.scheduled_date && (
                                                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                                    {new Date(booking.scheduled_date).toLocaleDateString()} {booking.scheduled_time}
                                                </div>
                                            )}
                                        </div>
                                        <div className="ml-3">
                                            <span
                                                className={`px-2 py-1 text-xs rounded-full ${
                                                    booking.status === 'completed'
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                                        : booking.status === 'confirmed'
                                                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                                                          : booking.status === 'in_progress'
                                                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                                                            : booking.status === 'cancelled'
                                                              ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                                                }`}
                                            >
                                                {t(`booking_status_${booking.status}`) || booking.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BookingSelect;

