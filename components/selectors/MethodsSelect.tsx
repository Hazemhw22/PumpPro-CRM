'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import IconCaretDown from '@/components/icon/icon-caret-down';

export type MethodsSelectProps = {
    value?: string | null;
    onChange?: (value: string | null) => void;
    options?: Array<{ label: string; value: string }>;
    placeholder?: string;
    className?: string;
    showClearOption?: boolean;
};

const defaultOptions = [
    { label: 'Cash', value: 'cash' },
    { label: 'Credit Card', value: 'credit_card' },
    { label: 'Bank Transfer', value: 'bank_transfer' },
    { label: 'Check', value: 'check' },
];

export default function MethodsSelect({
    value,
    onChange,
    options,
    placeholder = 'All Methods',
    className = '',
    showClearOption = true,
}: MethodsSelectProps) {
    const opts = useMemo(() => (options && options.length ? options : defaultOptions), [options]);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClick = (event: MouseEvent) => {
            if (!wrapperRef.current || wrapperRef.current.contains(event.target as Node)) return;
            setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const selectedOption = opts.find((o) => o.value === value);
    const displayLabel = selectedOption ? selectedOption.label : placeholder;

    const handleSelect = (val: string | null) => {
        onChange?.(val);
        setIsOpen(false);
    };

    return (
        <div ref={wrapperRef} className={`relative ${className}`}>
            <button
                type="button"
                className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-primary dark:border-[#374151] dark:bg-[#0e1726] dark:text-white"
                onClick={() => setIsOpen((prev) => !prev)}
            >
                <span>{displayLabel}</span>
                <IconCaretDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-[#374151] dark:bg-[#0e1726]">
                    <div className="max-h-60 overflow-y-auto text-sm">
                        {showClearOption && (
                            <button
                                type="button"
                                className={`flex w-full items-center justify-between px-4 py-3 text-left ${
                                    value === null || value === '' ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-gray-100 dark:hover:bg-[#191e3a]'
                                }`}
                                onClick={() => handleSelect(null)}
                            >
                                {placeholder}
                            </button>
                        )}
                        {opts.map((opt) => {
                            const isSelected = value === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    className={`flex w-full items-center justify-between px-4 py-3 text-left ${
                                        isSelected ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-gray-100 dark:hover:bg-[#191e3a]'
                                    }`}
                                    onClick={() => handleSelect(opt.value)}
                                >
                                    <span>{opt.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
