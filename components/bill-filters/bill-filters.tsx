'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { getTranslation } from '@/i18n';
import IconSearch from '@/components/icon/icon-search';
import IconFilter from '@/components/icon/icon-filter';
import IconXCircle from '@/components/icon/icon-x-circle';

export interface BillFilters {
    search: string;
    billType: string;
    paymentType: string;
    customerName: string;
    amountFrom: string;
    amountTo: string;
    dateFrom: string;
    dateTo: string;
}

interface BillFiltersProps {
    onFilterChange: (filters: BillFilters) => void;
    onClearFilters: () => void;
}

const BillFilters: React.FC<BillFiltersProps> = ({ onFilterChange, onClearFilters }) => {
    const { t } = getTranslation();
    const [filters, setFilters] = useState<BillFilters>({
        search: '',
        billType: '',
        paymentType: '',
        customerName: '',
        amountFrom: '',
        amountTo: '',
        dateFrom: '',
        dateTo: '',
    });

    const hasActiveFilters = useMemo(() => Object.values(filters).some((value) => value !== ''), [filters]);

    useEffect(() => {
        onFilterChange(filters);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);

    const handleInputChange = (field: keyof BillFilters, value: string) => {
        setFilters((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleClearFilters = () => {
        setFilters({
            search: '',
            billType: '',
            paymentType: '',
            customerName: '',
            amountFrom: '',
            amountTo: '',
            dateFrom: '',
            dateTo: '',
        });
        onClearFilters();
    };

    return (
        <div className="panel mb-5">
            <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-lg font-semibold text-black dark:text-white">
                    <IconFilter className="h-5 w-5 text-primary" />
                    {t('filters') || 'Filters'}
                    {hasActiveFilters && <span className="badge bg-primary text-white text-xs px-2 py-1">{Object.values(filters).filter((v) => v !== '').length}</span>}
                </div>
                {hasActiveFilters && (
                    <button type="button" className="btn btn-outline-danger gap-2" onClick={handleClearFilters}>
                        <IconXCircle className="h-4 w-4" />
                        {t('clear_filters') || 'Clear'}
                    </button>
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="relative">
                    <IconSearch className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        className="form-input w-full pl-9"
                        placeholder={t('search') || 'Search'}
                        value={filters.search}
                        onChange={(e) => handleInputChange('search', e.target.value)}
                    />
                </div>

                <div>
                    <select className="form-select" value={filters.billType} onChange={(e) => handleInputChange('billType', e.target.value)}>
                        <option value="">{t('all_bill_types') || 'All Bill Types'}</option>
                        <option value="tax_invoice">{t('tax_invoice_only') || 'Tax Invoice Only'}</option>
                        <option value="receipt_only">{t('receipt_only') || 'Receipt Only'}</option>
                        <option value="tax_invoice_receipt">{t('tax_invoice_and_receipt') || 'Tax Invoice & Receipt'}</option>
                        <option value="general">{t('general_bill') || 'General Bill'}</option>
                    </select>
                </div>

                <div>
                    <select className="form-select" value={filters.paymentType} onChange={(e) => handleInputChange('paymentType', e.target.value)}>
                        <option value="">{t('all_payment_methods') || 'All Payment Methods'}</option>
                        <option value="cash">{t('cash') || 'Cash'}</option>
                        <option value="visa">{t('visa') || 'Visa'}</option>
                        <option value="bank_transfer">{t('bank_transfer') || 'Bank Transfer'}</option>
                        <option value="check">{t('check') || 'Check'}</option>
                    </select>
                </div>

                <div>
                    <input
                        type="text"
                        className="form-input"
                        placeholder={t('customer_name') || 'Customer Name'}
                        value={filters.customerName}
                        onChange={(e) => handleInputChange('customerName', e.target.value)}
                    />
                </div>

                <div>
                    <input
                        type="number"
                        min={0}
                        className="form-input"
                        placeholder={t('amount_from') || 'Amount From'}
                        value={filters.amountFrom}
                        onChange={(e) => handleInputChange('amountFrom', e.target.value)}
                    />
                </div>

                <div>
                    <input
                        type="number"
                        min={0}
                        className="form-input"
                        placeholder={t('amount_to') || 'Amount To'}
                        value={filters.amountTo}
                        onChange={(e) => handleInputChange('amountTo', e.target.value)}
                    />
                </div>

                <div>
                    <label className="form-label mb-1 text-xs text-gray-500">{t('date_from') || 'Date From'}</label>
                    <input type="date" className="form-input" value={filters.dateFrom} onChange={(e) => handleInputChange('dateFrom', e.target.value)} />
                </div>

                <div>
                    <label className="form-label mb-1 text-xs text-gray-500">{t('date_to') || 'Date To'}</label>
                    <input type="date" className="form-input" value={filters.dateTo} onChange={(e) => handleInputChange('dateTo', e.target.value)} />
                </div>
            </div>
        </div>
    );
};

export default BillFilters;
