import React, { useEffect, useState } from 'react';
import IconSearch from '@/components/icon/icon-search';
import IconFilter from '@/components/icon/icon-filter';
import IconX from '@/components/icon/icon-x';
import { getTranslation } from '@/i18n';
import StatusSelect from '@/components/selectors/StatusSelect';

export interface FleetFilters {
    search: string;
    status: string;
    capacityFrom: string;
    capacityTo: string;
    maintenanceFrom: string;
    maintenanceTo: string;
}

interface Props {
    onFilterChange: (f: FleetFilters) => void;
    onClearFilters: () => void;
    viewMode?: 'list' | 'grid';
    onViewModeChange?: (mode: 'list' | 'grid') => void;
}

const FleetFilters: React.FC<Props> = ({ onFilterChange, onClearFilters, viewMode = 'list', onViewModeChange }) => {
    const { t } = getTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [filters, setFilters] = useState<FleetFilters>({ search: '', status: '', capacityFrom: '', capacityTo: '', maintenanceFrom: '', maintenanceTo: '' });

    useEffect(() => {
        onFilterChange(filters);
    }, [filters, onFilterChange]);

    const clear = () => {
        setFilters({ search: '', status: '', capacityFrom: '', capacityTo: '', maintenanceFrom: '', maintenanceTo: '' });
        onClearFilters();
    };

    const hasActiveFilters = Object.values(filters).some((value) => value !== '');

    return (
        <div className="">
            <div className=" flex flex-col gap-5 md:flex-row md:items-center">
                <div className="flex items-center gap-2">
                    <button type="button" className="btn btn-secondary gap-2" onClick={() => setIsOpen((s) => !s)}>
                        <IconFilter className="w-4 h-4" /> {t('filters')}
                        {hasActiveFilters && <span className="badge bg-primary text-white rounded-full text-xs px-2">{Object.values(filters).filter((v) => v !== '').length}</span>}
                    </button>
                    {hasActiveFilters && (
                        <button type="button" className="btn btn-outline-danger gap-2" onClick={clear}>
                            <IconX className="w-4 h-4" /> {t('clear_filters')}
                        </button>
                    )}
                </div>

                {/* inline search inside the filters header */}
                <div className="ltr:ml-auto rtl:mr-auto relative flex items-center gap-2">
                    <IconSearch className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                    <input type="text" className="form-input w-60 pl-10" placeholder={t('search')} value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))} />
                    <div className="hidden items-center gap-1 sm:flex">
                        <button type="button" className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => onViewModeChange?.('list')}>
                            List
                        </button>
                        <button type="button" className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => onViewModeChange?.('grid')}>
                            Grid
                        </button>
                    </div>
                </div>
            </div>

            {isOpen && (
                <div className="panel border-white-light px-5 py-4 dark:border-[#1b2e4b]">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6 xl:grid-cols-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('status')}</label>
                            <StatusSelect
                                value={filters.status}
                                onChange={(val) => setFilters((p) => ({ ...p, status: val || '' }))}
                                options={[
                                    { label: 'Available', value: 'available' },
                                    { label: 'In Use', value: 'in_use' },
                                    { label: 'Maintenance', value: 'maintenance' },
                                    { label: 'Out of Service', value: 'out_of_service' },
                                ]}
                                placeholder={t('all')}
                                className="form-select"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('capacity_from')}</label>
                            <input type="number" className="form-input" value={filters.capacityFrom} onChange={(e) => setFilters((p) => ({ ...p, capacityFrom: e.target.value }))} />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('capacity_to')}</label>
                            <input type="number" className="form-input" value={filters.capacityTo} onChange={(e) => setFilters((p) => ({ ...p, capacityTo: e.target.value }))} />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('maintenance_from')}</label>
                            <input type="date" className="form-input" value={filters.maintenanceFrom} onChange={(e) => setFilters((p) => ({ ...p, maintenanceFrom: e.target.value }))} />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('maintenance_to')}</label>
                            <input type="date" className="form-input" value={filters.maintenanceTo} onChange={(e) => setFilters((p) => ({ ...p, maintenanceTo: e.target.value }))} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FleetFilters;
