'use client';
import { useState, useEffect } from 'react';
import IconSearch from '@/components/icon/icon-search';
import IconLayoutGrid from '@/components/icon/icon-layout-grid';
import IconListCheck from '@/components/icon/icon-list-check';
import IconFilter from '@/components/icon/icon-filter';
import IconX from '@/components/icon/icon-x';

export interface ContractorFilters {
    search: string;
    status: string;
    balanceFrom: string;
    balanceTo: string;
    dateFrom: string;
    dateTo: string;
}

interface ContractorFiltersProps {
    onFilterChange: (filters: ContractorFilters) => void;
    onClearFilters: () => void;
    viewMode: 'list' | 'grid';
    onViewModeChange: (mode: 'list' | 'grid') => void;
}

const ContractorFiltersComponent = ({ onFilterChange, onClearFilters, viewMode, onViewModeChange }: ContractorFiltersProps) => {
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState<ContractorFilters>({
        search: '',
        status: '',
        balanceFrom: '',
        balanceTo: '',
        dateFrom: '',
        dateTo: '',
    });

    useEffect(() => {
        onFilterChange(filters);
    }, [filters, onFilterChange]);

    const handleInputChange = (field: keyof ContractorFilters, value: string) => {
        setFilters((prev) => ({ ...prev, [field]: value }));
    };

    const handleClearFilters = () => {
        setFilters({
            search: '',
            status: '',
            balanceFrom: '',
            balanceTo: '',
            dateFrom: '',
            dateTo: '',
        });
        onClearFilters();
    };

    const hasActiveFilters = filters.status || filters.balanceFrom || filters.balanceTo || filters.dateFrom || filters.dateTo;

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
                {/* Search Input */}
                <div className="relative flex-1 min-w-[200px]">
                    <input
                        type="text"
                        placeholder="Search contractors..."
                        className="form-input ltr:pl-9 rtl:pr-9"
                        value={filters.search}
                        onChange={(e) => handleInputChange('search', e.target.value)}
                    />
                    <div className="absolute top-1/2 -translate-y-1/2 ltr:left-3 rtl:right-3">
                        <IconSearch className="h-4 w-4 opacity-70" />
                    </div>
                </div>

                {/* Filter Toggle Button */}
                <button
                    type="button"
                    className={`btn ${hasActiveFilters ? 'btn-primary' : 'btn-outline-primary'} gap-2`}
                    onClick={() => setShowFilters(!showFilters)}
                >
                    <IconFilter className="h-4 w-4" />
                    Filters
                    {hasActiveFilters && <span className="badge bg-white text-primary">Active</span>}
                </button>

                {/* Clear Filters Button */}
                {hasActiveFilters && (
                    <button type="button" className="btn btn-outline-danger gap-2" onClick={handleClearFilters}>
                        <IconX className="h-4 w-4" />
                        Clear
                    </button>
                )}

                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 border border-white-light dark:border-[#191e3a] rounded-md p-1">
                    <button
                        type="button"
                        className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-outline-primary border-0'}`}
                        onClick={() => onViewModeChange('list')}
                        title="List View"
                    >
                        <IconListCheck className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline-primary border-0'}`}
                        onClick={() => onViewModeChange('grid')}
                        title="Grid View"
                    >
                        <IconLayoutGrid className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Advanced Filters Panel */}
            {showFilters && (
                <div className="rounded-md border border-white-light bg-white p-4 dark:border-[#191e3a] dark:bg-[#0e1726]">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {/* Status Filter */}
                        <div>
                            <label className="mb-2 block text-sm font-medium">Status</label>
                            <select
                                className="form-select"
                                value={filters.status}
                                onChange={(e) => handleInputChange('status', e.target.value)}
                            >
                                <option value="">All Status</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>

                        {/* Balance From */}
                        <div>
                            <label className="mb-2 block text-sm font-medium">Balance From</label>
                            <input
                                type="number"
                                placeholder="Min balance"
                                className="form-input"
                                value={filters.balanceFrom}
                                onChange={(e) => handleInputChange('balanceFrom', e.target.value)}
                                step="0.01"
                            />
                        </div>

                        {/* Balance To */}
                        <div>
                            <label className="mb-2 block text-sm font-medium">Balance To</label>
                            <input
                                type="number"
                                placeholder="Max balance"
                                className="form-input"
                                value={filters.balanceTo}
                                onChange={(e) => handleInputChange('balanceTo', e.target.value)}
                                step="0.01"
                            />
                        </div>

                        {/* Date From */}
                        <div>
                            <label className="mb-2 block text-sm font-medium">Created From</label>
                            <input
                                type="date"
                                className="form-input"
                                value={filters.dateFrom}
                                onChange={(e) => handleInputChange('dateFrom', e.target.value)}
                            />
                        </div>

                        {/* Date To */}
                        <div>
                            <label className="mb-2 block text-sm font-medium">Created To</label>
                            <input
                                type="date"
                                className="form-input"
                                value={filters.dateTo}
                                onChange={(e) => handleInputChange('dateTo', e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContractorFiltersComponent;
