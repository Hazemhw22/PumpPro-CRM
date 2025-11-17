'use client';
import React from 'react';

export type MethodsSelectProps = {
    value?: string | null;
    onChange?: (value: string | null) => void;
    options?: Array<{ label: string; value: string }>;
    placeholder?: string;
    className?: string;
};

const defaultOptions = [
    { label: 'Cash', value: 'cash' },
    { label: 'Credit Card', value: 'credit_card' },
    { label: 'Bank Transfer', value: 'bank_transfer' },
    { label: 'Check', value: 'check' },
];

export default function MethodsSelect({ value, onChange, options, placeholder = 'All Methods', className = '' }: MethodsSelectProps) {
    const opts = options && options.length ? options : defaultOptions;

    return (
        <select value={value ?? ''} onChange={(e) => onChange && onChange(e.target.value || null)} className={`border rounded px-2 py-1 text-sm ${className}`}>
            <option value="">{placeholder}</option>
            {opts.map((o) => (
                <option key={o.value} value={o.value}>
                    {o.label}
                </option>
            ))}
        </select>
    );
}
