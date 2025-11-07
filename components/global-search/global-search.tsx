'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useClickAway } from '@/hooks/useClickAway';
import IconSearch from '@/components/icon/icon-search';
import IconUser from '@/components/icon/icon-user';
import IconCar from '@/components/icon/icon-car';
import IconMenuInvoice from '@/components/icon/menu/icon-menu-invoice';
import IconTxtFile from '@/components/icon/icon-txt-file';
import IconXCircle from '@/components/icon/icon-x-circle';
import { supabase } from '@/lib/supabase/client';
import { getTranslation } from '@/i18n';
import type { Customer, Truck, Driver, Booking, Invoice } from '@/types/database.types';

interface SearchResult {
    id: string;
    type: 'customer' | 'truck' | 'driver' | 'booking' | 'invoice';
    title: string;
    subtitle: string;
    metadata: string;
    link: string;
}

const GlobalSearch = () => {
    const { t } = getTranslation();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const searchRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useClickAway(searchRef, () => {
        setIsOpen(false);
        setSelectedIndex(-1);
    });

    const debounce = (func: Function, delay: number) => {
        let timeoutId: NodeJS.Timeout;
        return (...args: any[]) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(null, args), delay);
        };
    };

    const performSearch = useCallback(async (query: string) => {
        if (!query.trim() || query.length < 2) {
            setSearchResults([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const results: SearchResult[] = [];

            // Search customers
            const { data: customers } = await supabase
                .from('customers')
                .select('id, name, phone, email, address, type, business_name')
                .or(`name.ilike.%${query}%, phone.ilike.%${query}%, email.ilike.%${query}%, business_name.ilike.%${query}%`)
                .limit(10);

            if (customers) {
                customers.forEach((customer: Customer) => {
                    results.push({
                        id: customer.id.toString(),
                        type: 'customer',
                        title: customer.name || 'Unnamed Customer',
                        subtitle: customer.phone || customer.email || '',
                        metadata: customer.type === 'business' ? customer.business_name || 'Business' : 'Private',
                        link: `/customers/${customer.id}`,
                    });
                });
            }

            // Search trucks
            const { data: trucks } = await supabase
                .from('trucks')
                .select('id, truck_number, license_plate, capacity_gallons, status')
                .or(`truck_number.ilike.%${query}%, license_plate.ilike.%${query}%`)
                .limit(10);

            if (trucks) {
                trucks.forEach((truck: Truck) => {
                    results.push({
                        id: truck.id.toString(),
                        type: 'truck',
                        title: `Truck ${truck.truck_number}`,
                        subtitle: truck.license_plate || '',
                        metadata: `${truck.capacity_gallons} gal • ${truck.status}`,
                        link: `/trucks/${truck.id}`,
                    });
                });
            }

            // Search drivers
            const { data: drivers } = await supabase
                .from('drivers')
                .select('id, first_name, last_name, phone, email, license_number, status')
                .or(`first_name.ilike.%${query}%, last_name.ilike.%${query}%, phone.ilike.%${query}%, email.ilike.%${query}%, license_number.ilike.%${query}%`)
                .limit(10);

            if (drivers) {
                drivers.forEach((driver: Driver) => {
                    results.push({
                        id: driver.id.toString(),
                        type: 'driver',
                        title: `${driver.first_name} ${driver.last_name}`,
                        subtitle: driver.phone || driver.email || '',
                        metadata: `${driver.status} • License: ${driver.license_number}`,
                        link: `/drivers/${driver.id}`,
                    });
                });
            }

            // Search bookings
            const { data: bookings } = await supabase
                .from('bookings')
                .select('id, booking_number, customer_name, customer_phone, service_address, scheduled_date, status, service_type')
                .or(`booking_number.ilike.%${query}%, customer_name.ilike.%${query}%, customer_phone.ilike.%${query}%, service_address.ilike.%${query}%`)
                .limit(10);

            if (bookings) {
                bookings.forEach((booking: Booking) => {
                    results.push({
                        id: booking.id.toString(),
                        type: 'booking',
                        title: `Booking ${booking.booking_number}`,
                        subtitle: booking.customer_name || '',
                        metadata: `${booking.service_type} • ${booking.status} • ${new Date(booking.scheduled_date).toLocaleDateString()}`,
                        link: `/bookings/${booking.id}`,
                    });
                });
            }

            // Search invoices
            const { data: invoices } = await supabase
                .from('invoices')
                .select(`
                    id, 
                    invoice_number, 
                    total_amount, 
                    status, 
                    created_at,
                    customers (
                        name
                    )
                `)
                .ilike('invoice_number', `%${query}%`)
                .limit(10);

            if (invoices) {
                invoices.forEach((invoice: any) => {
                    results.push({
                        id: invoice.id.toString(),
                        type: 'invoice',
                        title: `Invoice ${invoice.invoice_number}`,
                        subtitle: invoice.customers?.name || 'N/A',
                        metadata: `$${invoice.total_amount?.toLocaleString() || 0} • ${invoice.status} • ${new Date(invoice.created_at).toLocaleDateString()}`,
                        link: `/invoices/${invoice.id}`,
                    });
                });
            }

            // Sort results by relevance (exact matches first, then partial matches)
            const sortedResults = results.sort((a, b) => {
                const queryLower = query.toLowerCase();
                const aTitle = a.title.toLowerCase();
                const bTitle = b.title.toLowerCase();

                // Exact title matches first
                if (aTitle === queryLower && bTitle !== queryLower) return -1;
                if (bTitle === queryLower && aTitle !== queryLower) return 1;

                // Title starts with query
                if (aTitle.startsWith(queryLower) && !bTitle.startsWith(queryLower)) return -1;
                if (bTitle.startsWith(queryLower) && !aTitle.startsWith(queryLower)) return 1;

                // By type priority: customers first, then bookings, invoices, trucks, drivers
                const typeOrder: Record<string, number> = { customer: 1, booking: 2, invoice: 3, truck: 4, driver: 5 };
                return (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99);
            });

            setSearchResults(sortedResults.slice(0, 15)); // Limit to 15 results
        } catch (error) {
            console.error('Search error:', error);
            setSearchResults([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const debouncedSearch = useCallback(debounce(performSearch, 300), [performSearch]);

    useEffect(() => {
        if (searchQuery.trim()) {
            debouncedSearch(searchQuery);
            setIsOpen(true);
        } else {
            setSearchResults([]);
            setIsOpen(false);
        }
        setSelectedIndex(-1);
    }, [searchQuery, debouncedSearch]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen || searchResults.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1));
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
                    handleResultClick(searchResults[selectedIndex]);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                setSelectedIndex(-1);
                inputRef.current?.blur();
                break;
        }
    };

    const handleResultClick = (result: SearchResult) => {
        router.push(result.link);
        setIsOpen(false);
        setSearchQuery('');
        setSelectedIndex(-1);
    };

    const getResultIcon = (type: string) => {
        switch (type) {
            case 'customer':
                return <IconUser className="w-4 h-4 text-blue-500" />;
            case 'truck':
                return <IconCar className="w-4 h-4 text-green-500" />;
            case 'driver':
                return <IconUser className="w-4 h-4 text-purple-500" />;
            case 'booking':
                return <IconTxtFile className="w-4 h-4 text-orange-500" />;
            case 'invoice':
                return <IconMenuInvoice className="w-4 h-4 text-red-500" />;
            default:
                return <IconSearch className="w-4 h-4 text-gray-500" />;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'customer':
                return 'Customer';
            case 'truck':
                return 'Truck';
            case 'driver':
                return 'Driver';
            case 'booking':
                return 'Booking';
            case 'invoice':
                return 'Invoice';
            default:
                return '';
        }
    };

    const clearSearch = () => {
        setSearchQuery('');
        setSearchResults([]);
        setIsOpen(false);
        setSelectedIndex(-1);
    };

    return (
        <div ref={searchRef} className="relative w-full max-w-md">
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => searchQuery.trim() && setIsOpen(true)}
                    className="form-input w-full bg-gray-100 placeholder:tracking-widest ltr:pl-9 ltr:pr-9 rtl:pl-9 rtl:pr-9 sm:bg-transparent ltr:sm:pr-4 rtl:sm:pl-4"
                    placeholder={t('search')}
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none ltr:left-0 rtl:right-2">
                    <IconSearch className="w-4 h-4 text-gray-400" />
                </div>
                {searchQuery && (
                    <button type="button" onClick={clearSearch} className="absolute inset-y-0 right-0 flex items-center pr-3 rtl:right-auto rtl:left-2">
                        <IconXCircle className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                    </button>
                )}
            </div>

            {isOpen && searchQuery.trim() && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#0e1726] border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-4 gap-2">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">{t('searching')}...</span>
                        </div>
                    ) : searchResults.length > 0 ? (
                        <div className="py-2">
                            {searchResults.map((result, index) => (
                                <button
                                    key={`${result.type}-${result.id}`}
                                    onClick={() => handleResultClick(result)}
                                    className={`w-full border-b border-black/10 dark:border-gray-700 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${index === selectedIndex ? 'bg-gray-50 dark:bg-gray-700' : ''}`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 mt-0.5">{getResultIcon(result.type)}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{result.title}</p>
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                                    {getTypeLabel(result.type)}
                                                </span>
                                            </div>
                                            {result.subtitle && <p className="text-xs text-gray-600 dark:text-gray-400 truncate mb-1">{result.subtitle}</p>}
                                            {result.metadata && <p className="text-xs text-gray-500 dark:text-gray-500 truncate">{result.metadata}</p>}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="px-4 py-8 text-center">
                            <IconSearch className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600 dark:text-gray-400">{t('no_results_found')}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default GlobalSearch;
