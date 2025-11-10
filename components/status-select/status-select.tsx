import React, { useState, useRef, useEffect } from 'react';
import IconCaretDown from '@/components/icon/icon-caret-down';
import { getTranslation } from '@/i18n';

type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
type TruckStatus = 'available' | 'in_use' | 'maintenance' | 'out_of_service';
type DriverStatus = 'active' | 'inactive' | 'on_leave';
type InvoiceStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';

type StatusType = BookingStatus | TruckStatus | DriverStatus | InvoiceStatus;

interface StatusOption {
    value: string;
    label: string;
    color: string;
    icon?: string;
}

interface StatusSelectProps {
    value: string;
    onChange: (value: string) => void;
    type: 'booking' | 'truck' | 'driver' | 'invoice';
    className?: string;
    required?: boolean;
}

const StatusSelect = ({ value, onChange, type, className = 'form-select', required = false }: StatusSelectProps) => {
    const { t } = getTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getStatusOptions = (): StatusOption[] => {
        switch (type) {
            case 'booking':
                return [
                    { value: 'pending', label: t('pending') || 'Pending', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400', icon: '⏳' },
                    { value: 'confirmed', label: t('confirmed') || 'Confirmed', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400', icon: '✓' },
                    { value: 'in_progress', label: t('in_progress') || 'In Progress', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400', icon: '🔄' },
                    { value: 'completed', label: t('completed') || 'Completed', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400', icon: '✅' },
                    { value: 'cancelled', label: t('cancelled') || 'Cancelled', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400', icon: '❌' },
                ];
            case 'truck':
                return [
                    { value: 'available', label: t('available') || 'Available', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400', icon: '✅' },
                    { value: 'in_use', label: t('in_use') || 'In Use', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400', icon: '🚛' },
                    { value: 'maintenance', label: t('maintenance') || 'Maintenance', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400', icon: '🔧' },
                    { value: 'out_of_service', label: t('out_of_service') || 'Out of Service', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400', icon: '🚫' },
                ];
            case 'driver':
                return [
                    { value: 'active', label: t('active') || 'Active', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400', icon: '✅' },
                    { value: 'inactive', label: t('inactive') || 'Inactive', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400', icon: '⏸' },
                    { value: 'on_leave', label: t('on_leave') || 'On Leave', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400', icon: '🏖' },
                ];
            case 'invoice':
                return [
                    { value: 'pending', label: t('pending') || 'Pending', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400', icon: '⏳' },
                    { value: 'paid', label: t('paid') || 'Paid', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400', icon: '✅' },
                    { value: 'overdue', label: t('overdue') || 'Overdue', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400', icon: '⚠️' },
                    { value: 'cancelled', label: t('cancelled') || 'Cancelled', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400', icon: '❌' },
                ];
            default:
                return [];
        }
    };

    const statusOptions = getStatusOptions();
    const selectedOption = statusOptions.find(opt => opt.value === value);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    return (
        <div ref={wrapperRef} className="relative">
            <div
                className={`${className} cursor-pointer dark:bg-black dark:text-white-dark dark:border-[#374151] flex items-center justify-between min-h-[42px] ${selectedOption ? 'text-black dark:text-white' : 'text-gray-500'}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                {selectedOption ? (
                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-md text-sm font-medium ${selectedOption.color}`}>
                            {selectedOption.icon && <span className="mr-1">{selectedOption.icon}</span>}
                            {selectedOption.label}
                        </span>
                    </div>
                ) : (
                    <span>{t('select_status') || 'Select Status'}</span>
                )}
                <IconCaretDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg dark:bg-black dark:border-[#374151] overflow-hidden">
                    <div className="max-h-60 overflow-y-auto ">
                        {statusOptions.map((option) => (
                            <div
                                key={option.value}
                                className="cursor-pointer px-4 py-3 hover:bg-gray-100 dark:hover:bg-[#191e3a] border-b border-gray-100 dark:border-[#374151] last:border-b-0"
                                onClick={() => handleSelect(option.value)}
                            >
                                <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1 rounded-md text-sm font-medium ${option.color}`}>
                                        {option.icon && <span className="mr-1">{option.icon}</span>}
                                        {option.label}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StatusSelect;
