import React, { useState, useRef, useEffect } from 'react';
import IconCaretDown from '@/components/icon/icon-caret-down';
import { getTranslation } from '@/i18n';

type UserRole = 'admin' | 'driver';

interface RoleOption {
    value: string;
    label: string;
    color: string;
    icon?: string;
    description?: string;
}

interface RoleSelectProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
    required?: boolean;
}

const RoleSelect = ({ value, onChange, className = 'form-select', required = false }: RoleSelectProps) => {
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

    const roleOptions: RoleOption[] = [
        { 
            value: 'admin', 
            label: t('admin') || 'Admin', 
            color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400', 
            icon: '👑',
            description: 'Full system access'
        },
        { 
            value: 'driver', 
            label: t('driver') || 'Driver', 
            color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400', 
            icon: '🚛',
            description: 'Driver access'
        },
    ];

    const selectedOption = roleOptions.find(opt => opt.value === value);

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
                    <span>{t('select_role') || 'Select Role'}</span>
                )}
                <IconCaretDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg dark:bg-black dark:border-[#374151] overflow-hidden">
                    <div className="max-h-60 overflow-y-auto">
                        {roleOptions.map((option) => (
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
                                {option.description && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-1">
                                        {option.description}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoleSelect;
