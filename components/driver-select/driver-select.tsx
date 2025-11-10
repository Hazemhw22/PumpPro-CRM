import React, { useState, useEffect, useRef } from 'react';
import IconCaretDown from '@/components/icon/icon-caret-down';
import IconPlus from '@/components/icon/icon-plus';
import IconUser from '@/components/icon/icon-user';
import { getTranslation } from '@/i18n';
import { supabase } from '@/lib/supabase/client';

interface Driver {
    id: string;
    name: string;
    phone: string;
    license_number: string | null;
    status: 'active' | 'inactive' | 'on_leave';
}

interface DriverSelectProps {
    selectedDriver?: Driver | null;
    onDriverSelect: (driver: Driver | null) => void;
    onCreateNew: () => void;
    className?: string;
}

const DriverSelect = ({ selectedDriver, onDriverSelect, onCreateNew, className = 'form-select' }: DriverSelectProps) => {
    const { t } = getTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && drivers.length === 0) {
            fetchDrivers();
        }
    }, [isOpen]);

    useEffect(() => {
        const filtered = drivers.filter((driver) => 
            driver.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            driver.phone.includes(searchTerm) ||
            (driver.license_number && driver.license_number.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        setFilteredDrivers(filtered);
    }, [drivers, searchTerm]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchDrivers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('drivers')
                .select('id, name, phone, license_number, status')
                .order('name');

            if (error) throw error;
            setDrivers(data || []);
            setFilteredDrivers(data || []);
        } catch (error) {
            console.error('Error fetching drivers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDriverSelect = (driver: Driver) => {
        onDriverSelect(driver);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleCreateNew = () => {
        onCreateNew();
        setIsOpen(false);
        setSearchTerm('');
    };

    const getStatusBadge = (status: string) => {
        const badges = {
            active: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
            inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
            on_leave: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
        };
        return badges[status as keyof typeof badges] || badges.inactive;
    };

    return (
        <div ref={wrapperRef} className="relative">
            <div
                className={`${className} cursor-pointer dark:bg-black dark:text-white-dark dark:border-[#374151] flex items-center justify-between min-h-[42px] ${selectedDriver ? 'text-black dark:text-white' : 'text-gray-500'}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                {selectedDriver ? (
                    <div className="flex items-center gap-3">
                        <IconUser className="w-4 h-4 text-primary" />
                        <div>
                            <div className="font-medium">{selectedDriver.name}</div>
                            <div className="text-xs text-gray-500">{selectedDriver.phone}</div>
                        </div>
                    </div>
                ) : (
                    <span>{t('select_driver') || 'Select Driver'}</span>
                )}
                <IconCaretDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg dark:bg-black dark:border-[#374151] overflow-hidden">
                    {/* Search */}
                    <div className="p-3 border-b border-gray-200 dark:border-[#374151]">
                        <input
                            type="text"
                            className="w-full rounded border border-gray-300 p-2 text-sm focus:border-primary focus:outline-none dark:bg-black dark:border-[#374151] dark:text-white-dark"
                            placeholder={t('search_drivers') || 'Search drivers...'}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {/* Create New Button */}
                    <div className="p-2 border-b border-gray-200 dark:border-[#374151]">
                        <button
                            onClick={handleCreateNew}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 transition-colors"
                        >
                            <IconPlus className="w-4 h-4" />
                            <span className="font-medium">{t('create_new_driver') || 'Create New Driver'}</span>
                        </button>
                    </div>

                    {/* Drivers List */}
                    <div className="max-h-60 overflow-y-auto">
                        {loading ? (
                            <div className="p-4 text-center text-gray-500">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                                <p className="mt-2 text-sm">{t('loading') || 'Loading...'}</p>
                            </div>
                        ) : filteredDrivers.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                                <p className="text-sm">{searchTerm ? t('no_drivers_found') || 'No drivers found' : t('no_drivers_available') || 'No drivers available'}</p>
                            </div>
                        ) : (
                            filteredDrivers.map((driver) => (
                                <div
                                    key={driver.id}
                                    className="cursor-pointer px-4 py-3 hover:bg-gray-100 dark:hover:bg-[#191e3a] border-b border-gray-100 dark:border-[#374151] last:border-b-0"
                                    onClick={() => handleDriverSelect(driver)}
                                >
                                    <div className="flex items-center gap-3">
                                        <IconUser className="w-4 h-4 text-primary flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-black dark:text-white truncate">{driver.name}</div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">{driver.phone}</div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-xs px-2 py-0.5 rounded font-medium ${getStatusBadge(driver.status)}`}>
                                                    {driver.status.replace('_', ' ')}
                                                </span>
                                                {driver.license_number && (
                                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                                        License: {driver.license_number}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DriverSelect;
