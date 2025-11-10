import React, { useState, useEffect, useRef } from 'react';
import IconCaretDown from '@/components/icon/icon-caret-down';
import IconPlus from '@/components/icon/icon-plus';
import { getTranslation } from '@/i18n';
import { supabase } from '@/lib/supabase/client';

interface Service {
    id: string;
    name: string;
    description: string | null;
    price_private: number;
    price_business: number;
    active: boolean;
}

interface ServiceSelectProps {
    selectedService?: Service | null;
    onServiceSelect: (service: Service | null) => void;
    onCreateNew: () => void;
    customerType?: 'private' | 'business';
    className?: string;
}

const ServiceSelect = ({ selectedService, onServiceSelect, onCreateNew, customerType = 'private', className = 'form-select' }: ServiceSelectProps) => {
    const { t } = getTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [services, setServices] = useState<Service[]>([]);
    const [filteredServices, setFilteredServices] = useState<Service[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && services.length === 0) {
            fetchServices();
        }
    }, [isOpen]);

    useEffect(() => {
        const filtered = services.filter((service) => 
            service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (service.description && service.description.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        setFilteredServices(filtered);
    }, [services, searchTerm]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchServices = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('services')
                .select('id, name, description, price_private, price_business, active')
                .eq('active', true)
                .order('name');

            if (error) throw error;
            setServices(data || []);
            setFilteredServices(data || []);
        } catch (error) {
            console.error('Error fetching services:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleServiceSelect = (service: Service) => {
        onServiceSelect(service);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleCreateNew = () => {
        onCreateNew();
        setIsOpen(false);
        setSearchTerm('');
    };

    const getPrice = (service: Service) => {
        return customerType === 'private' ? service.price_private : service.price_business;
    };

    return (
        <div ref={wrapperRef} className="relative">
            <div
                className={`${className} cursor-pointer dark:bg-black dark:text-white-dark dark:border-[#374151] flex items-center justify-between min-h-[42px] ${selectedService ? 'text-black dark:text-white' : 'text-gray-500'}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                {selectedService ? (
                    <div className="flex items-center gap-3">
                        <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <div>
                            <div className="font-medium">{selectedService.name}</div>
                            <div className="text-xs text-gray-500">${getPrice(selectedService)}</div>
                        </div>
                    </div>
                ) : (
                    <span>{t('select_service') || 'Select Service'}</span>
                )}
                <IconCaretDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg dark:bg-black dark:border-[#374151] overflow-hidden">
                    <div className="p-3 border-b border-gray-200 dark:border-[#374151]">
                        <input
                            type="text"
                            className="w-full rounded border border-gray-300 p-2 text-sm focus:border-primary focus:outline-none dark:bg-black dark:border-[#374151] dark:text-white-dark"
                            placeholder={t('search_services') || 'Search services...'}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="p-2 border-b border-gray-200 dark:border-[#374151]">
                        <button
                            onClick={handleCreateNew}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 transition-colors"
                        >
                            <IconPlus className="w-4 h-4" />
                            <span className="font-medium">{t('create_new_service') || 'Create New Service'}</span>
                        </button>
                    </div>

                    <div className="max-h-60 overflow-y-auto ">
                        {loading ? (
                            <div className="p-4 text-center text-gray-500">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                                <p className="mt-2 text-sm">{t('loading') || 'Loading...'}</p>
                            </div>
                        ) : filteredServices.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                                <p className="text-sm">{searchTerm ? t('no_services_found') || 'No services found' : t('no_services_available') || 'No services available'}</p>
                            </div>
                        ) : (
                            filteredServices.map((service) => (
                                <div
                                    key={service.id}
                                    className="cursor-pointer px-4 py-3 hover:bg-gray-100 dark:hover:bg-[#191e3a] border-b border-gray-100 dark:border-[#374151] last:border-b-0"
                                    onClick={() => handleServiceSelect(service)}
                                >
                                    <div className="flex items-center gap-3">
                                        <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-black dark:text-white truncate">{service.name}</div>
                                            {service.description && (
                                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{service.description}</div>
                                            )}
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-sm font-semibold text-primary">
                                                    ${getPrice(service)}
                                                </span>
                                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                                    Private: ${service.price_private} | Business: ${service.price_business}
                                                </span>
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

export default ServiceSelect;
