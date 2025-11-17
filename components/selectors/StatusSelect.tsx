'use client';
import React, { useState, useRef, useEffect } from 'react';
import IconCaretDown from '@/components/icon/icon-caret-down';

export type StatusSelectProps = {
    value?: string | null;
    onChange?: (value: string | null) => void;
    options?: Array<{ label: string; value: string }>;
    placeholder?: string;
    className?: string;
};

const defaultOptions = [
    { label: 'Pending', value: 'pending' },
    { label: 'Confirmed', value: 'confirmed' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' },
];

const getStatusColor = (value: string): string => {
    const colors: Record<string, string> = {
        pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
        confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
        in_progress: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
        completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
        cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
        active: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
        inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
        on_leave: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
        paid: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
        cash: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
        credit_card: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
        bank_transfer: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
        check: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
    };
    return colors[value] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
};

export default function StatusSelect({ value, onChange, options, placeholder = 'Select Status', className = '' }: StatusSelectProps) {
    const opts = options && options.length ? options : defaultOptions;
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const selectedOption = opts.find((o) => o.value === value);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionValue: string) => {
        onChange && onChange(optionValue || null);
        setIsOpen(false);
    };

    return (
        <div ref={wrapperRef} className="relative">
            <div
                className={`${className} cursor-pointer dark:bg-black dark:text-white-dark dark:border-[#374151] flex items-center justify-between min-h-[42px] ${selectedOption ? 'text-black dark:text-white' : 'text-gray-500'}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                {selectedOption ? (
                    <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(selectedOption.value)}`}>{selectedOption.label}</span>
                ) : (
                    <span className="px-3">{placeholder}</span>
                )}
                <IconCaretDown className={`w-4 h-4 transition-transform duration-200 mr-3 ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg dark:bg-black dark:border-[#374151] overflow-hidden">
                    {/* Clear option */}
                    {value && (
                        <div className="border-b border-gray-200 dark:border-[#374151]">
                            <button
                                onClick={() => handleSelect('')}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-600 dark:text-gray-400 transition-colors"
                            >
                                Clear Selection
                            </button>
                        </div>
                    )}

                    {/* Options List */}
                    <div className="max-h-60 overflow-y-auto">
                        {opts.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => handleSelect(option.value)}
                                className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors flex items-center gap-2 ${
                                    value === option.value ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                }`}
                            >
                                <span className={`px-3 py-1 rounded text-xs font-medium ${getStatusColor(option.value)}`}>{option.label}</span>
                                {value === option.value && <span className="ml-auto text-primary">✓</span>}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
