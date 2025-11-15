import React, { useEffect, useRef, useState } from 'react';
import IconCaretDown from '@/components/icon/icon-caret-down';

export type AddAssignMode = 'contractor' | 'driver';

interface Option {
    value: AddAssignMode;
    label: string;
}

interface AssignmentModeSelectAddProps {
    value: AddAssignMode;
    onChange: (value: AddAssignMode) => void;
    className?: string;
}

const AssignmentModeSelectAdd: React.FC<AssignmentModeSelectAddProps> = ({ value, onChange, className = 'form-select' }) => {
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

    const options: Option[] = [
        { value: 'contractor', label: 'By Contractor' },
        { value: 'driver', label: 'By Driver' },
    ];

    const selected = options.find((o) => o.value === value);

    return (
        <div ref={wrapperRef} className="relative">
            <div
                className={`${className} cursor-pointer dark:bg-black dark:text-white-dark dark:border-[#374151] flex items-center justify-between min-h-[42px] ${selected ? 'text-black dark:text-white' : 'text-gray-500'}`}
                onClick={() => setIsOpen((s) => !s)}
            >
                <span>{selected ? selected.label : 'Select Mode'}</span>
                <IconCaretDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg dark:bg-black dark:border-[#374151] overflow-hidden">
                    <div className="max-h-60 overflow-y-auto">
                        {options.map((opt) => (
                            <div
                                key={opt.value}
                                className={`cursor-pointer px-4 py-3 hover:bg-gray-100 dark:hover:bg-[#191e3a] border-b border-gray-100 dark:border-[#374151] last:border-b-0 ${opt.value === value ? 'bg-primary/5' : ''}`}
                                onClick={() => {
                                    onChange(opt.value);
                                    setIsOpen(false);
                                }}
                            >
                                <span className="text-sm font-medium">{opt.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssignmentModeSelectAdd;
