'use client';
import { Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import IconCaretDown from '@/components/icon/icon-caret-down';

interface DriverStatusSelectProps {
    value: 'active' | 'inactive' | 'on_leave';
    onChange: (value: 'active' | 'inactive' | 'on_leave') => void;
    className?: string;
    required?: boolean;
}

const DriverStatusSelect = ({ value, onChange, className = '', required = false }: DriverStatusSelectProps) => {
    const statuses = [
        { value: 'active', label: 'Active', color: 'text-success' },
        { value: 'inactive', label: 'Inactive', color: 'text-danger' },
        { value: 'on_leave', label: 'On Leave', color: 'text-warning' },
    ];

    const selectedStatus = statuses.find((s) => s.value === value) || statuses[0];

    return (
        <div className="relative">
            <Listbox value={value} onChange={onChange}>
                <Listbox.Button className={`form-input flex items-center justify-between ${className}`}>
                    <span className={`flex items-center ${selectedStatus.color}`}>
                        <span className={`w-2 h-2 rounded-full mr-2 ${
                            value === 'active' ? 'bg-success' : 
                            value === 'inactive' ? 'bg-danger' : 
                            'bg-warning'
                        }`}></span>
                        {selectedStatus.label}
                    </span>
                    <IconCaretDown className="w-5 h-5" />
                </Listbox.Button>
                <Transition
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <Listbox.Options className="absolute z-10 mt-1 w-full bg-white dark:bg-[#1b2e4b] shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                        {statuses.map((status) => (
                            <Listbox.Option
                                key={status.value}
                                value={status.value}
                                className={({ active }) =>
                                    `${active ? 'bg-primary text-white' : 'text-gray-900 dark:text-white-dark'}
                                    cursor-pointer select-none relative py-2 pl-10 pr-4`
                                }
                            >
                                {({ selected, active }) => (
                                    <>
                                        <span className={`flex items-center ${selected ? 'font-medium' : 'font-normal'} ${!active && status.color}`}>
                                            <span className={`w-2 h-2 rounded-full mr-2 ${
                                                status.value === 'active' ? 'bg-success' : 
                                                status.value === 'inactive' ? 'bg-danger' : 
                                                'bg-warning'
                                            }`}></span>
                                            {status.label}
                                        </span>
                                        {selected && (
                                            <span className={`${active ? 'text-white' : 'text-primary'} absolute inset-y-0 left-0 flex items-center pl-3`}>
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            </span>
                                        )}
                                    </>
                                )}
                            </Listbox.Option>
                        ))}
                    </Listbox.Options>
                </Transition>
            </Listbox>
        </div>
    );
};

export default DriverStatusSelect;
