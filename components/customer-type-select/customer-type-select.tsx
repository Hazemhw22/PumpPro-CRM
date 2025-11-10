import React, { useState, useRef, useEffect } from 'react';
import IconCaretDown from '@/components/icon/icon-caret-down';
import IconUser from '@/components/icon/icon-user';
import IconUsersGroup from '@/components/icon/icon-users-group';
import { getTranslation } from '@/i18n';

type CustomerType = 'private' | 'business';

interface TypeOption {
    value: CustomerType;
    label: string;
    color: string;
    icon: React.ReactNode;
    description: string;
}

interface CustomerTypeSelectProps {
    value: CustomerType;
    onChange: (value: CustomerType) => void;
    className?: string;
    required?: boolean;
}

const CustomerTypeSelect = ({ value, onChange, className = 'form-select', required = false }: CustomerTypeSelectProps) => {
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

    const typeOptions: TypeOption[] = [
        {
            value: 'private',
            label: t('private_customer') || 'Private Customer',
            color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
            icon: <IconUser className="w-5 h-5" />,
            description: 'Individual customer'
        },
        {
            value: 'business',
            label: t('business_customer') || 'Business Customer',
            color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
            icon: <IconUsersGroup className="w-5 h-5" />,
            description: 'Company or organization'
        },
    ];

    const selectedOption = typeOptions.find(opt => opt.value === value);

    const handleSelect = (optionValue: CustomerType) => {
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
                    <span>{t('select_customer_type') || 'Select Customer Type'}</span>
                )}
                <IconCaretDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg dark:bg-black dark:border-[#374151] overflow-hidden">
                    <div className="max-h-60 overflow-y-auto">
                        {typeOptions.map((option) => (
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

export default CustomerTypeSelect;
