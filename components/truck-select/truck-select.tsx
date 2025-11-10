import React, { useState, useEffect, useRef } from 'react';
import IconCaretDown from '@/components/icon/icon-caret-down';
import IconPlus from '@/components/icon/icon-plus';
import IconMenuCar from '@/components/icon/menu/icon-menu-car';
import { getTranslation } from '@/i18n';
import { supabase } from '@/lib/supabase/client';

interface Truck {
    id: string;
    truck_number: string;
    license_plate: string;
    capacity_gallons: number;
    status: 'available' | 'in_use' | 'maintenance' | 'out_of_service' | 'active' | 'inactive' | 'retired';
    driver_id: string | null;
}

interface TruckSelectProps {
    selectedTruck?: Truck | null;
    onTruckSelect: (truck: Truck | null) => void;
    onCreateNew: () => void;
    className?: string;
}

const TruckSelect = ({ selectedTruck, onTruckSelect, onCreateNew, className = 'form-select' }: TruckSelectProps) => {
    const { t } = getTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [trucks, setTrucks] = useState<Truck[]>([]);
    const [filteredTrucks, setFilteredTrucks] = useState<Truck[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && trucks.length === 0) {
            fetchTrucks();
        }
    }, [isOpen]);

    useEffect(() => {
        const filtered = trucks.filter((truck) => 
            truck.truck_number.toLowerCase().includes(searchTerm.toLowerCase()) || 
            truck.license_plate.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredTrucks(filtered);
    }, [trucks, searchTerm]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchTrucks = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('trucks')
                .select('id, truck_number, license_plate, capacity_gallons, status, driver_id')
                .order('truck_number');

            if (error) throw error;
            setTrucks(data || []);
            setFilteredTrucks(data || []);
        } catch (error) {
            console.error('Error fetching trucks:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTruckSelect = (truck: Truck) => {
        onTruckSelect(truck);
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
            available: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
            in_use: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
            maintenance: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
            out_of_service: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
            active: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
            inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
            retired: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
        };
        return badges[status as keyof typeof badges] || badges.inactive;
    };

    return (
        <div ref={wrapperRef} className="relative">
            <div
                className={`${className} cursor-pointer dark:bg-black dark:text-white-dark dark:border-[#374151] flex items-center justify-between min-h-[42px] ${selectedTruck ? 'text-black dark:text-white' : 'text-gray-500'}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                {selectedTruck ? (
                    <div className="flex items-center gap-3">
                        <IconMenuCar className="w-4 h-4 text-primary flex-shrink-0" />
                        <div>
                            <div className="font-medium">{selectedTruck.truck_number}</div>
                            <div className="text-xs text-gray-500">{selectedTruck.license_plate}</div>
                        </div>
                    </div>
                ) : (
                    <span>{t('select_truck') || 'Select Truck'}</span>
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
                            placeholder={t('search_trucks') || 'Search trucks...'}
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
                            <span className="font-medium">{t('create_new_truck') || 'Create New Truck'}</span>
                        </button>
                    </div>

                    {/* Trucks List */}
                    <div className="max-h-60 overflow-y-auto ">
                        {loading ? (
                            <div className="p-4 text-center text-gray-500">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                                <p className="mt-2 text-sm">{t('loading') || 'Loading...'}</p>
                            </div>
                        ) : filteredTrucks.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                                <p className="text-sm">{searchTerm ? t('no_trucks_found') || 'No trucks found' : t('no_trucks_available') || 'No trucks available'}</p>
                            </div>
                        ) : (
                            filteredTrucks.map((truck) => (
                                <div
                                    key={truck.id}
                                    className="cursor-pointer px-4 py-3 hover:bg-gray-100 dark:hover:bg-[#191e3a] border-b border-gray-100 dark:border-[#374151] last:border-b-0"
                                    onClick={() => handleTruckSelect(truck)}
                                >
                                    <div className="flex items-center gap-3">
                                        <IconMenuCar className="w-4 h-4 text-primary flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-black dark:text-white truncate">{truck.truck_number}</div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">{truck.license_plate}</div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-xs px-2 py-0.5 rounded font-medium ${getStatusBadge(truck.status)}`}>
                                                    {truck.status.replace('_', ' ')}
                                                </span>
                                                {truck.capacity_gallons && (
                                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                                        {truck.capacity_gallons} gal
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

export default TruckSelect;
