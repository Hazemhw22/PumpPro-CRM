'use client';

import React, { useState, useRef, useEffect } from 'react';
import IconCaretDown from '@/components/icon/icon-caret-down';
import IconCircleCheck from '@/components/icon/icon-circle-check';
import IconXCircle from '@/components/icon/icon-x-circle';
import IconClock from '@/components/icon/icon-clock';

interface StatusOption {
    value: 'active' | 'inactive' | 'on_leave';
    label: string;
    color: string;
    icon: React.ReactNode;
    description: string;
}

interface DriverStatusSelectProps {
    value: 'active' | 'inactive' | 'on_leave';
    onChange: (value: 'active' | 'inactive' | 'on_leave') => void;
    className?: string;
    required?: boolean;
}

const DriverStatusSelect = ({ value, onChange, className = 'form-select', required = false }: DriverStatusSelectProps) => {
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

    const statusOptions: StatusOption[] = [
        {
            value: 'active',
            label: 'Active',
            color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400',
            icon: <IconCircleCheck className="w-5 h-5" />,
            description: 'Driver is currently active and available for assignments'
        },
        {
            value: 'inactive',
            label: 'Inactive',
            color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
            icon: <IconXCircle className="w-5 h-5" />,
            description: 'Driver is not active and not available for work'
        },
        {
            value: 'on_leave',
            label: 'On Leave',
            color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
            icon: <IconClock className="w-5 h-5" />,
            description: 'Driver is temporarily on leave and will return'
        },
    ];

    const selectedOption = statusOptions.find(opt => opt.value === value);

    const handleSelect = (optionValue: 'active' | 'inactive' | 'on_leave') => {
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
                    <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${selectedOption.color}`}>
                            {selectedOption.icon}
                        </div>
                        <span className="font-medium">{selectedOption.label}</span>
                    </div>
                ) : (
                    <span>Select Status</span>
                )}
                <IconCaretDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg dark:bg-black dark:border-[#374151] overflow-hidden">
                    <div className="max-h-60 overflow-y-auto">
                        {statusOptions.map((option) => (
                            <div
                                key={option.value}
                                className="cursor-pointer px-4 py-3 hover:bg-gray-100 dark:hover:bg-[#191e3a] border-b border-gray-100 dark:border-[#374151] last:border-b-0"
                                onClick={() => handleSelect(option.value)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`flex items-center justify-center w-10 h-10 rounded-full ${option.color}`}>
                                        {option.icon}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-sm">{option.label}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{option.description}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DriverStatusSelect;