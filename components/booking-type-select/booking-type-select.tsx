import React, { useState, useEffect, useRef } from 'react';
import IconCaretDown from '@/components/icon/icon-caret-down';
import { getTranslation } from '@/i18n';

interface BookingTypeSelectProps {
    id?: string;
    name?: string;
    defaultValue?: string;
    className?: string;
    onChange?: (value: string) => void;
}

const BookingTypeSelect = ({ defaultValue, className = 'form-select text-white-dark', onChange, name = 'booking_status', id }: BookingTypeSelectProps) => {
    const { t } = getTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedType, setSelectedType] = useState(defaultValue);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Update selectedType when defaultValue changes
    useEffect(() => {
        setSelectedType(defaultValue);
    }, [defaultValue]);
    
    const bookingStatuses = [
        { value: 'pending', label: t('booking_status_pending') || 'Pending' },
        { value: 'confirmed', label: t('booking_status_confirmed') || 'Confirmed' },
        { value: 'in_progress', label: t('booking_status_in_progress') || 'In Progress' },
        { value: 'completed', label: t('booking_status_completed') || 'Completed' },
        { value: 'cancelled', label: t('booking_status_cancelled') || 'Cancelled' },
    ];

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleTypeSelect = (type: string) => {
        setSelectedType(type);
        setIsOpen(false);
        if (onChange) {
            onChange(type);
        }
    };

    const getSelectedLabel = () => {
        const selected = bookingStatuses.find((type) => type.value === selectedType);
        return selected ? selected.label : t('select_booking_status') || 'Select Booking Status';
    };

    return (
        <div ref={wrapperRef} className="relative">
            <div className={`${className} cursor-pointer dark:bg-black dark:text-white-dark dark:border-[#374151] flex items-center justify-between`} onClick={() => setIsOpen(!isOpen)}>
                <span>{getSelectedLabel()}</span>
                <IconCaretDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            {isOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg dark:bg-black dark:border-[#374151]">
                    <div className="max-h-60 overflow-y-auto">
                        {bookingStatuses.map((type) => (
                            <div
                                key={type.value}
                                className={`cursor-pointer px-4 py-3 hover:bg-gray-100 dark:text-white-dark dark:hover:bg-[#191e3a] border-b border-gray-100 dark:border-[#374151] last:border-b-0 ${
                                    selectedType === type.value ? 'bg-primary/10 dark:bg-primary/20' : ''
                                }`}
                                onClick={() => handleTypeSelect(type.value)}
                            >
                                <div className="font-medium">{type.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BookingTypeSelect;

