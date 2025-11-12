import React, { useState, useEffect, useRef } from 'react';
import IconCaretDown from '@/components/icon/icon-caret-down';
import IconPlus from '@/components/icon/icon-plus';
import IconUser from '@/components/icon/icon-user';
import { getTranslation } from '@/i18n';
import { supabase } from '@/lib/supabase/client';

interface Contractor {
    id: string;
    name: string;
    phone?: string;
    email?: string | null;
    balance?: number;
    status?: string;
}

interface ContractorSelectProps {
    selectedContractor?: Contractor | null;
    onContractorSelect: (contractor: Contractor | null) => void;
    onCreateNew: () => void;
    className?: string;
}

const ContractorSelect = ({ selectedContractor, onContractorSelect, onCreateNew, className = 'form-select' }: ContractorSelectProps) => {
    const { t } = getTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [contractors, setContractors] = useState<Contractor[]>([]);
    const [filtered, setFiltered] = useState<Contractor[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && contractors.length === 0) fetchContractors();
    }, [isOpen]);

    useEffect(() => {
        const filteredList = contractors.filter(
            (c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || (c.phone || '').includes(searchTerm) || (c.email || '').toLowerCase().includes(searchTerm.toLowerCase()),
        );
        setFiltered(filteredList);
    }, [contractors, searchTerm]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchContractors = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('contractors').select('id, name, phone, email, balance').order('name');
            if (error) throw error;
            setContractors(data || []);
            setFiltered(data || []);
        } catch (err) {
            console.error('Error fetching contractors:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (c: Contractor) => {
        onContractorSelect(c);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleCreate = () => {
        onCreateNew();
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div ref={wrapperRef} className="relative">
            <div
                className={`${className} cursor-pointer dark:bg-black dark:text-white-dark dark:border-[#374151] flex items-center justify-between min-h-[42px] ${selectedContractor ? 'text-black dark:text-white' : 'text-gray-500'}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                {selectedContractor ? (
                    <div className="flex items-center gap-3">
                        <IconUser className="w-4 h-4 text-primary" />
                        <div>
                            <div className="font-medium">{selectedContractor.name}</div>
                            <div className="text-xs text-gray-500">{selectedContractor.phone || selectedContractor.email || ''}</div>
                        </div>
                    </div>
                ) : (
                    <span>{t('select_contractor') || 'Select Contractor'}</span>
                )}
                <IconCaretDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg dark:bg-black dark:border-[#374151] overflow-hidden">
                    <div className="p-3 border-b border-gray-200 dark:border-[#374151]">
                        <input
                            type="text"
                            className="w-full rounded border border-gray-300 p-2 text-sm focus:border-primary focus:outline-none dark:bg-black dark:border-[#374151] dark:text-white-dark"
                            placeholder={t('search_contractors') || 'Search contractors...'}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="p-2 border-b border-gray-200 dark:border-[#374151]">
                        <button
                            onClick={handleCreate}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 transition-colors"
                        >
                            <IconPlus className="w-4 h-4" />
                            <span className="font-medium">{t('create_new_contractor') || 'Create New Contractor'}</span>
                        </button>
                    </div>

                    <div className="max-h-60 overflow-y-auto">
                        {loading ? (
                            <div className="p-4 text-center text-gray-500">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                                <p className="mt-2 text-sm">{t('loading') || 'Loading...'}</p>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                                <p className="text-sm">{searchTerm ? t('no_contractors_found') || 'No contractors found' : t('no_contractors_available') || 'No contractors available'}</p>
                            </div>
                        ) : (
                            filtered.map((c) => (
                                <div
                                    key={c.id}
                                    className="cursor-pointer px-4 py-3 hover:bg-gray-100 dark:hover:bg-[#191e3a] border-b border-gray-100 dark:border-[#374151] last:border-b-0"
                                    onClick={() => handleSelect(c)}
                                >
                                    <div className="flex items-center gap-3">
                                        <IconUser className="w-4 h-4 text-primary flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-black dark:text-white truncate">{c.name}</div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">{c.phone || c.email || ''}</div>
                                            <div className="text-sm text-gray-500 mt-1">Balance: ₪{c.balance?.toFixed(2) || '0.00'}</div>
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

export default ContractorSelect;
