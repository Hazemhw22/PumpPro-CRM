'use client';
import React from 'react';

export type RoleSelectProps = {
    value?: string | null;
    onChange?: (value: string | null) => void;
    options?: Array<{ label: string; value: string }>;
    placeholder?: string;
    className?: string;
};

const defaultOptions = [
    { label: 'Admin', value: 'admin' },
    { label: 'Driver', value: 'driver' },
];

export default function RoleSelect({ value, onChange, options, placeholder = 'All Roles', className = '' }: RoleSelectProps) {
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
