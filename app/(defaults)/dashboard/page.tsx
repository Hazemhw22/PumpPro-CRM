'use client';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { IRootState } from '@/store';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { getTranslation } from '@/i18n';

// Dynamically import ReactApexChart with SSR disabled
const ReactApexChart = dynamic(() => import('react-apexcharts'), {
    ssr: false,
    loading: () => (
        <div className="h-[200px] flex items-center justify-center animate-pulse bg-gray-200 dark:bg-gray-700 rounded">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-32 animate-pulse"></div>
        </div>
    ),
});

// Icons
import IconCar from '@/components/icon/icon-car';
import IconTrendingUp from '@/components/icon/icon-trending-up';
import IconTrendingDown from '@/components/icon/icon-trending-down';
import IconMenuInvoice from '@/components/icon/menu/icon-menu-invoice';
import IconUsersGroup from '@/components/icon/icon-users-group';
import IconEye from '@/components/icon/icon-eye';
import IconPlus from '@/components/icon/icon-plus';
import IconCash from '@/components/icon/icon-cash-banknotes';
import IconDollarSign from '@/components/icon/icon-dollar-sign';
import IconPdf from '@/components/icon/icon-pdf';


interface DashboardStats {
    totalTrucks: number;
    totalBookings: number;
    totalCustomers: number;
    totalDrivers: number;
    totalRevenue: number;
    monthlyRevenue: number;
    totalInvoices: number;
    trucksGrowth: number;
    bookingsGrowth: number;
    customersGrowth: number;
    revenueGrowth: number;
    loading: boolean;
    chartData: {
        months: string[];
        trucks: number[];
        bookings: number[];
        revenue: number[];
    };
    recentActivity: any[];
    bookingsByType: { [key: string]: number };
    trucksByStatus: { [key: string]: number };
    pendingBookings: number;
    confirmedBookings: number;
    totalDebts: number;
    paidInvoices: number;
    recentPayments: any[];
    recentInvoices: any[];
}

type TimeFilter = 'week' | 'month' | 'year' | 'all';

const HomePage = () => {
    const isDark = useSelector((state: IRootState) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);
    const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl';
    const [isMounted, setIsMounted] = useState(false);
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('month');
    const { t } = getTranslation();

    const [stats, setStats] = useState<DashboardStats>({
        totalTrucks: 0,
        totalBookings: 0,
        totalCustomers: 0,
        totalDrivers: 0,
        totalRevenue: 0,
        monthlyRevenue: 0,
        totalInvoices: 0,
        trucksGrowth: 0,
        bookingsGrowth: 0,
        customersGrowth: 0,
        revenueGrowth: 0,
        loading: true,
        chartData: {
            months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            trucks: [0, 0, 0, 0, 0, 0],
            bookings: [0, 0, 0, 0, 0, 0],
            revenue: [0, 0, 0, 0, 0, 0],
        },
        recentActivity: [],
        bookingsByType: {},
        trucksByStatus: {},
        pendingBookings: 0,
        confirmedBookings: 0,
        totalDebts: 0,
        paidInvoices: 0,
        recentPayments: [],
        recentInvoices: [],
    });
    const [role, setRole] = useState<string | null>(null);

    // Set is mounted for client-side rendering of charts
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Calculate growth percentage
    const calculateGrowth = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    };

    // Get date range based on filter
    const getDateRange = (filter: TimeFilter) => {
        const now = new Date();
        let startDate: Date;
        let previousStartDate: Date;
        let previousEndDate: Date;

        switch (filter) {
            case 'week':
                // Current week (Sunday to Saturday)
                const currentDayOfWeek = now.getDay();
                startDate = new Date(now);
                startDate.setDate(now.getDate() - currentDayOfWeek);
                startDate.setHours(0, 0, 0, 0);

                // Previous week
                previousStartDate = new Date(startDate);
                previousStartDate.setDate(startDate.getDate() - 7);
                previousEndDate = new Date(startDate);
                break;

            case 'month':
                // Current month
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);

                // Previous month
                previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                previousEndDate = new Date(startDate);
                break;

            case 'year':
                // Current year
                startDate = new Date(now.getFullYear(), 0, 1);

                // Previous year
                previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
                previousEndDate = new Date(startDate);
                break;

            case 'all':
            default:
                // All time - use a very old date
                startDate = new Date('2000-01-01');
                previousStartDate = new Date('2000-01-01');
                previousEndDate = new Date('2000-01-01');
                break;
        }

        return {
            currentStart: startDate,
            previousStart: previousStartDate,
            previousEnd: previousEndDate,
        };
    };

    useEffect(() => {
        const fetchDashboardStats = async () => {
            try {
                setStats((prev) => ({ ...prev, loading: true }));

                // Get date ranges based on current filter
                const { currentStart, previousStart, previousEnd } = getDateRange(timeFilter);

                // Consolidate all database queries into fewer parallel calls
                const sixMonthsAgo = new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1);

                // Resolve role and related ids
                let role: string | null = null;
                let contractorId: string | null = null;
                let driverId: string | null = null;
                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        // @ts-ignore
                        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
                        role = (profile as any)?.role || null;
                        setRole(role);
                        if (role === 'contractor') {
                            // @ts-ignore
                            let { data: c } = await supabase.from('contractors').select('id, email').eq('user_id', user.id).maybeSingle();
                            contractorId = (c as any)?.id || null;
                            if (!contractorId && (user as any).email) {
                                // @ts-ignore
                                const { data: c2 } = await supabase.from('contractors').select('id').eq('email', (user as any).email).maybeSingle();
                                contractorId = (c2 as any)?.id || null;
                            }
                        } else if (role === 'driver') {
                            // @ts-ignore
                            let { data: d } = await supabase.from('drivers').select('id, email').eq('user_id', user.id).maybeSingle();
                            driverId = (d as any)?.id || null;
                            if (!driverId && (user as any).email) {
                                // @ts-ignore
                                const { data: d2 } = await supabase.from('drivers').select('id').eq('email', (user as any).email).maybeSingle();
                                driverId = (d2 as any)?.id || null;
                            }
                        }
                    }
                } catch (e) { /* ignore */ }

                // If contractor: compute filtered stats and return early
                if (role === 'contractor') {
                    if (!contractorId) { setStats(prev => ({ ...prev, loading: false })); return; }
                    const [
                        invRes,
                        payRes,
                        bookingsCountRes,
                        recentInvRes,
                        recentBookingsRes
                    ] = await Promise.all([
                        supabase.from('invoices').select('total_amount, remaining_amount, status, created_at').eq('contractor_id', contractorId),
                        supabase.from('payments').select(`*, invoices ( invoice_number, customers ( name ) )`).eq('contractor_id', contractorId).order('payment_date', { ascending: false }).limit(5),
                        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('contractor_id', contractorId),
                        supabase.from('invoices').select('id, invoice_number, total_amount, status, created_at, customer_id, customers(name)').eq('contractor_id', contractorId).order('created_at', { ascending: false }).limit(5),
                        supabase.from('bookings').select('*').eq('contractor_id', contractorId).order('created_at', { ascending: false }).limit(10)
                    ]);

                    const invs: any[] = (invRes.data as any[]) || [];
                    const pays: any[] = (payRes.data as any[]) || [];
                    const totalPaid = pays.reduce((s, p) => s + (p.amount || 0), 0);
                    const totalRevenue = totalPaid;
                    const remainingAmount = invs.reduce((s, x) => s + (x.remaining_amount || 0), 0);
                    const paidInvoices = invs.filter((x) => x.status === 'paid').length;
                    const totalInvoices = invs.length;
                    const totalBookings = bookingsCountRes.count || 0;
                    const recentPayments = pays.map((p: any) => ({
                        customer_name: p.invoices?.customers?.name || 'Unknown',
                        amount: p.amount || 0,
                        payment_date: p.payment_date,
                        payment_method: p.payment_method || 'cash',
                        invoice_number: p.invoices?.invoice_number || 'N/A',
                    }));
                    const recentInvoices = (recentInvRes.data as any[] || []).map((inv: any) => ({
                        invoice_number: inv.invoice_number,
                        customer_name: inv.customers?.name || 'Unknown',
                        total_amount: inv.total_amount || 0,
                        status: inv.status,
                    }));

                    setStats(prev => ({
                        ...prev,
                        totalTrucks: 0,
                        totalBookings,
                        totalCustomers: 0,
                        totalDrivers: 0,
                        totalRevenue,
                        monthlyRevenue: totalRevenue,
                        totalInvoices,
                        trucksGrowth: 0,
                        bookingsGrowth: 0,
                        customersGrowth: 0,
                        revenueGrowth: 0,
                        loading: false,
                        chartData: { months: prev.chartData.months, trucks: [0,0,0,0,0,0], bookings: [0,0,0,0,0,0], revenue: [0,0,0,0,0,0] },
                        recentActivity: (recentBookingsRes.data as any[]) || [],
                        bookingsByType: {}, trucksByStatus: {},
                        pendingBookings: 0, confirmedBookings: 0,
                        totalDebts: remainingAmount,
                        paidInvoices,
                        recentPayments,
                        recentInvoices,
                    }));
                    return;
                }

                // If driver: show only own bookings KPIs and zero financials
                if (role === 'driver') {
                    if (!driverId) { setStats(prev => ({ ...prev, loading: false })); return; }
                    const [bookingsCountRes, recentBookingsRes] = await Promise.all([
                        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('driver_id', driverId),
                        supabase.from('bookings').select('*').eq('driver_id', driverId).order('created_at', { ascending: false }).limit(10),
                    ]);
                    setStats(prev => ({
                        ...prev,
                        totalTrucks: 0,
                        totalBookings: bookingsCountRes.count || 0,
                        totalCustomers: 0,
                        totalDrivers: 0,
                        totalRevenue: 0,
                        monthlyRevenue: 0,
                        totalInvoices: 0,
                        trucksGrowth: 0,
                        bookingsGrowth: 0,
                        customersGrowth: 0,
                        revenueGrowth: 0,
                        loading: false,
                        chartData: { months: prev.chartData.months, trucks: [0,0,0,0,0,0], bookings: [0,0,0,0,0,0], revenue: [0,0,0,0,0,0] },
                        recentActivity: (recentBookingsRes.data as any[]) || [],
                        bookingsByType: {}, trucksByStatus: {},
                        pendingBookings: 0, confirmedBookings: 0,
                        totalDebts: 0,
                        paidInvoices: 0,
                        recentPayments: [],
                        recentInvoices: [],
                    }));
                    return;
                }

                const [
                    // Current period counts
                    trucksResult,
                    bookingsResult,
                    customersResult,
                    driversResult,
                    // Previous period counts (for growth calculation)
                    previousTrucksResult,
                    previousBookingsResult,
                    previousCustomersResult,
                    previousDriversResult,
                    // Revenue data
                    { data: revenueData },
                    { data: previousRevenueData },
                    // Total invoices count
                    invoicesResult,
                    // Chart data (all in single queries)
                    { data: allBookingsForChart },
                    { data: allTrucksForChart },
                    { data: allRevenueForChart },
                    // Additional data
                    { data: bookingTypesData },
                    { data: allServicesData },
                    { data: truckStatusData },
                    { data: recentActivity },
                    // New data
                    pendingBookingsResult,
                    confirmedBookingsResult,
                    { data: overdueInvoicesData },
                    paidInvoicesResult,
                    { data: recentPaymentsData },
                    { data: recentInvoicesData },
                ] = await Promise.all([
                    // Current period queries
                    timeFilter === 'all'
                        ? supabase.from('trucks').select('*', { count: 'exact', head: true })
                        : supabase.from('trucks').select('*', { count: 'exact', head: true }).gte('created_at', currentStart.toISOString()),

                    timeFilter === 'all'
                        ? supabase.from('bookings').select('*', { count: 'exact', head: true })
                        : supabase.from('bookings').select('*', { count: 'exact', head: true }).gte('created_at', currentStart.toISOString()),

                    timeFilter === 'all'
                        ? supabase.from('customers').select('*', { count: 'exact', head: true })
                        : supabase.from('customers').select('*', { count: 'exact', head: true }).gte('created_at', currentStart.toISOString()),

                    timeFilter === 'all'
                        ? supabase.from('drivers').select('*', { count: 'exact', head: true })
                        : supabase.from('drivers').select('*', { count: 'exact', head: true }).gte('created_at', currentStart.toISOString()),

                    // Previous period queries (only if not 'all')
                    timeFilter === 'all'
                        ? Promise.resolve({ count: 0 })
                        : supabase.from('trucks').select('*', { count: 'exact', head: true }).gte('created_at', previousStart.toISOString()).lt('created_at', previousEnd.toISOString()),

                    timeFilter === 'all'
                        ? Promise.resolve({ count: 0 })
                        : supabase.from('bookings').select('*', { count: 'exact', head: true }).gte('created_at', previousStart.toISOString()).lt('created_at', previousEnd.toISOString()),

                    timeFilter === 'all'
                        ? Promise.resolve({ count: 0 })
                        : supabase.from('customers').select('*', { count: 'exact', head: true }).gte('created_at', previousStart.toISOString()).lt('created_at', previousEnd.toISOString()),

                    timeFilter === 'all'
                        ? Promise.resolve({ count: 0 })
                        : supabase.from('drivers').select('*', { count: 'exact', head: true }).gte('created_at', previousStart.toISOString()).lt('created_at', previousEnd.toISOString()),

                    // Revenue queries - using invoices table for revenue data
                    timeFilter === 'all'
                        ? supabase.from('invoices').select('total_amount, created_at').not('total_amount', 'is', null)
                        : supabase.from('invoices').select('total_amount, created_at').not('total_amount', 'is', null).gte('created_at', currentStart.toISOString()),

                    timeFilter === 'all'
                        ? Promise.resolve({ data: [] })
                        : supabase.from('invoices').select('total_amount').gte('created_at', previousStart.toISOString()).lt('created_at', previousEnd.toISOString()).not('total_amount', 'is', null),

                    // Total invoices count
                    timeFilter === 'all'
                        ? supabase.from('invoices').select('*', { count: 'exact', head: true })
                        : supabase.from('invoices').select('*', { count: 'exact', head: true }).gte('created_at', currentStart.toISOString()),

                    // Chart data queries (last 6 months)
                    supabase.from('bookings').select('created_at').gte('created_at', sixMonthsAgo.toISOString()),
                    supabase.from('trucks').select('created_at').gte('created_at', sixMonthsAgo.toISOString()),
                    supabase.from('invoices').select('total_amount, created_at').gte('created_at', sixMonthsAgo.toISOString()).not('total_amount', 'is', null),

                    // Bookings by service type with service names
                    timeFilter === 'all' 
                        ? supabase.from('bookings').select('service_type') 
                        : supabase.from('bookings').select('service_type').gte('created_at', currentStart.toISOString()),
                    
                    // Fetch all services for mapping
                    supabase.from('services').select('id, name'),

                    // Trucks by status
                    timeFilter === 'all' 
                        ? supabase.from('trucks').select('status') 
                        : supabase.from('trucks').select('status').gte('created_at', currentStart.toISOString()),

                    // Recent activity - using bookings for recent activity
                    supabase.from('bookings')
                        .select('*')
                        .order('created_at', { ascending: false })
                        .limit(10)
                        .eq('status', 'confirmed'),
                    
                    // New queries for additional dashboard data
                    // Pending bookings count
                    timeFilter === 'all'
                        ? supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending')
                        : supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending').gte('created_at', currentStart.toISOString()),
                    
                    // Confirmed bookings count
                    timeFilter === 'all'
                        ? supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'confirmed')
                        : supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'confirmed').gte('created_at', currentStart.toISOString()),
                    
                    // Total debts (overdue invoices)
                    timeFilter === 'all'
                        ? supabase.from('invoices').select('total_amount, amount_paid').eq('status', 'overdue')
                        : supabase.from('invoices').select('total_amount, amount_paid').eq('status', 'overdue').gte('created_at', currentStart.toISOString()),
                    
                    // Paid invoices count
                    timeFilter === 'all'
                        ? supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'paid')
                        : supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'paid').gte('created_at', currentStart.toISOString()),
                    
                    // Recent payments
                    supabase.from('payments')
                        .select(`
                            *,
                            invoices (
                                invoice_number,
                                customers (
                                    name
                                )
                            )
                        `)
                        .order('payment_date', { ascending: false })
                        .limit(5),
                    
                    // Recent invoices
                    supabase.from('invoices')
                        .select('id, invoice_number, total_amount, status, created_at, customer_id, customers(name)')
                        .order('created_at', { ascending: false })
                        .limit(5),
                ]);

                // Process results
                const totalTrucks = trucksResult.count || 0;
                const totalBookings = bookingsResult.count || 0;
                const totalCustomers = customersResult.count || 0;
                const totalDrivers = driversResult.count || 0;
                const totalInvoices = invoicesResult.count || 0;

                const previousTrucks = previousTrucksResult.count || 0;
                const previousBookings = previousBookingsResult.count || 0;
                const previousCustomers = previousCustomersResult.count || 0;
                const previousDrivers = previousDriversResult.count || 0;

                // Calculate revenue from invoices
                const totalRevenue = revenueData?.reduce((sum: number, invoice: { total_amount?: number }) => sum + (invoice.total_amount || 0), 0) || 0;
                const monthlyRevenue = totalRevenue;
                const previousMonthRevenue = previousRevenueData?.reduce((sum: number, invoice: { total_amount?: number }) => sum + (invoice.total_amount || 0), 0) || 0;

                // Calculate growth rates
                const trucksGrowth = timeFilter === 'all' ? 0 : calculateGrowth(totalTrucks, previousTrucks);
                const bookingsGrowth = timeFilter === 'all' ? 0 : calculateGrowth(totalBookings, previousBookings);
                const customersGrowth = timeFilter === 'all' ? 0 : calculateGrowth(totalCustomers, previousCustomers);
                const driversGrowth = timeFilter === 'all' ? 0 : calculateGrowth(totalDrivers, previousDrivers);
                const revenueGrowth = timeFilter === 'all' ? 0 : calculateGrowth(monthlyRevenue, previousMonthRevenue);

                // Process chart data efficiently in memory from already fetched data
                const now = new Date();
                const chartMonths: string[] = [];
                const chartTrucks: number[] = [];
                const chartBookings: number[] = [];
                const chartRevenue: number[] = [];

                for (let i = 5; i >= 0; i--) {
                    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

                    chartMonths.push(month.toLocaleDateString('en-US', { month: 'short' }));

                    // Count items for this month from already fetched data
                    const monthBookings = (allBookingsForChart || []).filter((booking: { created_at: string }) => {
                        const bookingDate = new Date(booking.created_at);
                        return bookingDate >= month && bookingDate < nextMonth;
                    }).length;

                    const monthTrucks = (allTrucksForChart || []).filter((truck: { created_at: string }) => {
                        const truckDate = new Date(truck.created_at);
                        return truckDate >= month && truckDate < nextMonth;
                    }).length;

                    // Calculate revenue for this month from invoices
                    const monthRevenue = (allRevenueForChart || []).reduce((sum: number, invoice: { created_at: string; total_amount?: number }) => {
                        const invoiceDate = new Date(invoice.created_at);
                        if (invoiceDate >= month && invoiceDate < nextMonth) {
                            return sum + (invoice.total_amount || 0);
                        }
                        return sum;
                    }, 0);

                    chartTrucks.push(monthTrucks);
                    chartBookings.push(monthBookings);
                    chartRevenue.push(monthRevenue);
                }

                // Create a map of service IDs to names
                const servicesMap: { [key: string]: string } = {};
                (allServicesData || []).forEach((service: any) => {
                    servicesMap[service.id] = service.name;
                });

                // Process bookings by service type
                const bookingsByType: { [key: string]: number } = {};
                (bookingTypesData || []).forEach((booking: any) => {
                    // Use service name from map if available, otherwise use service_type
                    const serviceName = servicesMap[booking.service_type] || booking.service_type || 'Unknown';
                    bookingsByType[serviceName] = (bookingsByType[serviceName] || 0) + 1;
                });

                // Process trucks by status
                const trucksByStatus: { [key: string]: number } = {};
                (truckStatusData || []).forEach((truck: any) => {
                    const status = truck.status || 'Unknown';
                    trucksByStatus[status] = (trucksByStatus[status] || 0) + 1;
                });

                // Process new data
                const pendingBookings = pendingBookingsResult.count || 0;
                const confirmedBookings = confirmedBookingsResult.count || 0;
                const paidInvoices = paidInvoicesResult.count || 0;
                
                // Calculate total debts from all invoices (same as accounting page)
                const { data: allInvoicesData, error: allInvoicesError } = await supabase
                    .from('invoices')
                    .select('*');

                const totalDebts = (allInvoicesData || []).reduce(
                    (sum: number, invoice: any) => sum + (invoice.remaining_amount || 0), 
                    0
                );

                // Process recent payments
                const recentPayments = (recentPaymentsData || []).map((payment: any) => ({
                    id: payment.id,
                    invoice_id: payment.invoice_id,
                    customer_name: payment.invoices?.customers?.name || 'Unknown',
                    amount: payment.amount || 0,
                    payment_date: payment.payment_date,
                    payment_method: payment.payment_method || 'cash',
                    invoice_number: payment.invoices?.invoice_number || 'N/A',
                }));

                // Process recent invoices
                const recentInvoices = (recentInvoicesData || []).map((invoice: any) => ({
                    id: invoice.id,
                    invoice_number: invoice.invoice_number,
                    customer_name: invoice.customers?.name || 'Unknown',
                    total_amount: invoice.total_amount || 0,
                    status: invoice.status,
                    created_at: invoice.created_at,
                }));

                // Update state with all the processed data
                setStats({
                    totalTrucks,
                    totalBookings,
                    totalCustomers,
                    totalDrivers,
                    totalRevenue,
                    monthlyRevenue,
                    totalInvoices,
                    trucksGrowth,
                    bookingsGrowth,
                    customersGrowth,
                    revenueGrowth,
                    loading: false,
                    chartData: {
                        months: chartMonths,
                        trucks: chartTrucks,
                        bookings: chartBookings,
                        revenue: chartRevenue,
                    },
                    recentActivity: recentActivity || [],
                    bookingsByType,
                    trucksByStatus,
                    pendingBookings,
                    confirmedBookings,
                    totalDebts,
                    paidInvoices,
                    recentPayments,
                    recentInvoices,
                });
            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
                setStats((prev) => ({ ...prev, loading: false }));
            }
        };

        fetchDashboardStats();
    }, [timeFilter]);

    const handleDownloadInvoicePdf = async (invoiceId: string) => {
        try {
            const { data: inv, error: invErr } = await supabase
                .from('invoices')
                .select('id, booking_id, invoice_number')
                .eq('id', invoiceId)
                .maybeSingle<any>();

            if (invErr || !inv) throw invErr || new Error('Invoice not found');
            if (!inv.booking_id) {
                alert('No booking linked to this invoice');
                return;
            }

            const { data: deal, error: dealErr } = await supabase
                .from('invoice_deals')
                .select('id, pdf_url')
                .eq('booking_id', inv.booking_id as any)
                .maybeSingle();

            if (dealErr) throw dealErr;

            const pdfUrl = (deal as any)?.pdf_url as string | null | undefined;
            if (pdfUrl) {
                window.open(pdfUrl, '_blank');
            } else {
                alert('DEAL PDF not found for this invoice. An existing invoice deal PDF was not found for this booking.');
            }
        } catch (e) {
            console.error('Failed to download DEAL PDF from dashboard', e);
            alert('Failed to download DEAL PDF');
        }
    };

    // Format currency
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'ILS',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    // Format large numbers
    const formatNumber = (value: number) => {
        if (value >= 1000000) {
            return (value / 1000000).toFixed(0) + 'M';
        } else if (value >= 1000) {
            return (value / 1000).toFixed(0) + 'K';
        }
        return value.toString();
    };

    // Get growth indicator
    const getGrowthIndicator = (growth: number) => {
        if (growth > 0) {
            return {
                icon: <IconTrendingUp className="w-4 h-4" />,
                color: 'text-success',
                bgColor: 'bg-success-light',
            };
        } else if (growth < 0) {
            return {
                icon: <IconTrendingDown className="w-4 h-4" />,
                color: 'text-danger',
                bgColor: 'bg-danger-light',
            };
        }
        return {
            icon: <IconTrendingUp className="w-4 h-4" />,
            color: 'text-secondary',
            bgColor: 'bg-secondary-light',
        };
    };

    // Chart configurations
    const salesChart = {
        series: [
            {
                name: t('trucks_added') || 'Trucks Added',
                data: stats.chartData.trucks,
            },
            {
                name: t('bookings_closed') || 'Bookings Closed',
                data: stats.chartData.bookings,
            },
        ],
        options: {
            chart: {
                height: 325,
                type: 'area' as const,
                fontFamily: 'Nunito, sans-serif',
                zoom: {
                    enabled: false,
                },
                toolbar: {
                    show: false,
                },
            },
            dataLabels: {
                enabled: false,
            },
            stroke: {
                show: true,
                curve: 'smooth' as const,
                width: 2,
                lineCap: 'square' as const,
            },
            dropShadow: {
                enabled: true,
                opacity: 0.2,
                blur: 10,
                left: -7,
                top: 22,
            },
            colors: isDark ? ['#2196F3', '#E7515A'] : ['#1B55E2', '#E7515A'],
            markers: {
                discrete: [
                    {
                        seriesIndex: 0,
                        dataPointIndex: 6,
                        fillColor: '#1B55E2',
                        strokeColor: 'transparent',
                        size: 7,
                    },
                    {
                        seriesIndex: 1,
                        dataPointIndex: 5,
                        fillColor: '#E7515A',
                        strokeColor: 'transparent',
                        size: 7,
                    },
                ],
            },
            labels: stats.chartData.months,
            xaxis: {
                axisBorder: {
                    show: false,
                },
                axisTicks: {
                    show: false,
                },
                crosshairs: {
                    show: true,
                },
                labels: {
                    offsetX: isRtl ? 2 : 0,
                    offsetY: 5,
                    style: {
                        fontSize: '12px',
                        cssClass: 'apexcharts-xaxis-title',
                    },
                },
            },
            yaxis: {
                tickAmount: 7,
                labels: {
                    formatter: (value: number) => {
                        return formatNumber(value);
                    },
                    offsetX: isRtl ? -30 : -10,
                    offsetY: 0,
                    style: {
                        fontSize: '12px',
                        cssClass: 'apexcharts-yaxis-title',
                    },
                },
                opposite: isRtl ? true : false,
            },
            grid: {
                borderColor: isDark ? '#191E3A' : '#E0E6ED',
                strokeDashArray: 5,
                xaxis: {
                    lines: {
                        show: true,
                    },
                },
                yaxis: {
                    lines: {
                        show: false,
                    },
                },
                padding: {
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                },
            },
            legend: {
                position: 'top' as const,
                horizontalAlign: 'right' as const,
                fontSize: '16px',
                markers: {
                    width: 10,
                    height: 10,
                    offsetX: -2,
                },
                itemMargin: {
                    horizontal: 10,
                    vertical: 5,
                },
            },
            tooltip: {
                marker: {
                    show: true,
                },
                x: {
                    show: false,
                },
            },
            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    inverseColors: !1,
                    opacityFrom: isDark ? 0.19 : 0.28,
                    opacityTo: 0.05,
                    stops: isDark ? [100, 100] : [45, 100],
                },
            },
        },
    };

    const revenueChart = {
        series: [
            {
                name: t('revenue'),
                data: stats.chartData.revenue,
            },
        ],
        options: {
            chart: {
                height: 300,
                type: 'line' as const,
                fontFamily: 'Nunito, sans-serif',
                toolbar: {
                    show: false,
                },
            },
            colors: ['#00AB55'],
            stroke: {
                curve: 'smooth' as const,
                width: 2,
            },
            xaxis: {
                categories: stats.chartData.months,
            },
            yaxis: {
                labels: {
                    formatter: (value: number) => formatCurrency(value),
                },
            },
            tooltip: {
                y: {
                    formatter: (value: number) => formatCurrency(value),
                },
            },
        },
    };

    const dealTypeChart = {
        series: Object.values(stats.bookingsByType),
        options: {
            chart: {
                height: 300,
                type: 'donut' as const,
                fontFamily: 'Almarai, sans-serif',
            },
            labels: Object.keys(stats.bookingsByType),
            colors: ['#4361EE', '#805DCA', '#00AB55', '#E7515A', '#E2A03F', '#2196F3'],
            responsive: [
                {
                    breakpoint: 480,
                    options: {
                        chart: {
                            width: 200,
                        },
                        legend: {
                            position: 'bottom' as const,
                        },
                    },
                },
            ],
            stroke: {
                show: false,
            },
            legend: {
                position: 'bottom' as const,
            },
        },
    };

    if (stats.loading) {
        return (
            <div className="pt-5 max-w-[1500px]">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-black dark:text-white">{t('dashboard')}</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('overview_analytics')}</p>
                    </div>
                    <div className="flex gap-2 bg-white dark:bg-[#1b2e4b] rounded-lg p-1 border border-gray-200 dark:border-gray-600">
                        {(['week', 'month', 'year', 'all'] as TimeFilter[]).map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setTimeFilter(filter)}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                                    timeFilter === filter ? 'bg-primary text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                            >
                                {t(`time_filter_${filter}`)}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="space-y-6">
                    {/* Loading skeleton for summary cards */}
                    <div className="mb-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="panel">
                                <div className="flex items-center justify-between mb-5">
                                    <div className="h-4 bg-gray-300/60 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
                                    <div className="h-5 bg-gray-300/60 dark:bg-gray-700 rounded w-12 animate-pulse"></div>
                                </div>
                                <div className="mb-5">
                                    <div className="h-7 bg-gray-400/60 dark:bg-gray-600 rounded w-16 animate-pulse"></div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 bg-gray-300/60 dark:bg-gray-700 rounded mr-2 animate-pulse"></div>
                                    <div className="h-3 bg-gray-300/60 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Loading skeleton for deals by type and quick actions */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        {/* Deals by type skeleton */}
                        <div className="panel">
                            <div className="mb-5">
                                <div className="h-5 bg-gray-300/60 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
                            </div>
                            <div className="flex justify-center">
                                <div className="h-64 w-64 bg-gray-300/60 dark:bg-gray-700 rounded-full animate-pulse"></div>
                            </div>
                        </div>

                        {/* Quick actions skeleton */}
                        <div className="panel lg:col-span-2">
                            <div className="mb-5">
                                <div className="h-5 bg-gray-300/60 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="flex flex-col items-center rounded-md border border-gray-200 dark:border-gray-600 p-4">
                                        <div className="h-12 w-12 bg-gray-300/60 dark:bg-gray-700 rounded-lg mb-3 animate-pulse"></div>
                                        <div className="h-4 bg-gray-300/60 dark:bg-gray-700 rounded w-16 mb-2 animate-pulse"></div>
                                        <div className="h-3 bg-gray-300/60 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="flex items-center rounded-md border border-gray-200 dark:border-gray-600 p-4 gap-2">
                                        <div className="h-12 w-12 bg-gray-300/60 dark:bg-gray-700 rounded-lg mr-4 animate-pulse"></div>
                                        <div className="flex-1">
                                            <div className="h-4 bg-gray-300/60 dark:bg-gray-700 rounded w-20 mb-2 animate-pulse"></div>
                                            <div className="h-3 bg-gray-300/60 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Loading skeleton for charts */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {[1, 2].map((i) => (
                            <div key={i} className="panel">
                                <div className="mb-5">
                                    <div className="h-5 bg-gray-300/60 dark:bg-gray-700 rounded w-28 animate-pulse"></div>
                                </div>
                                <div className="h-64 bg-gray-300/60 dark:bg-gray-700 rounded animate-pulse"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="pt-5 max-w-[1500px]">
                {/* Time Filter Buttons */}
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-black dark:text-white">{t('dashboard')}</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('overview_analytics')}</p>
                    </div>
                    <div className="flex gap-2 bg-white dark:bg-[#1b2e4b] rounded-lg p-1 border border-gray-200 dark:border-gray-600">
                        {(['week', 'month', 'year', 'all'] as TimeFilter[]).map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setTimeFilter(filter)}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                                    timeFilter === filter ? 'bg-primary text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                            >
                                {t(`time_filter_${filter}`)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="mb-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                    {/* Total Revenue */}
                    <div className="panel">
                        <div className="flex items-center justify-between dark:text-white-light">
                            <div className="text-md font-semibold ltr:mr-1 rtl:ml-1">
                                {role === 'contractor' || role === 'driver' ? (t('your_balance') || 'Your Balance') : t('total_revenue')}
                            </div>
                            <div className="dropdown">
                                <span className={`badge ${stats.revenueGrowth >= 0 ? 'badge-outline-success' : 'badge-outline-danger'}`}>
                                    {stats.revenueGrowth >= 0 ? '+' : ''}
                                    {stats.revenueGrowth.toFixed(0)}%
                                </span>
                            </div>
                        </div>
                        <div className="mt-5 flex items-center">
                            <div className="text-3xl font-bold ltr:mr-3 rtl:ml-3">{formatCurrency(stats.totalRevenue)}</div>
                        </div>
                        <div className="mt-5 flex items-center font-semibold">
                            <IconCash className="h-5 w-5 text-success ltr:mr-2 rtl:ml-2" />
                            <p className="text-xs text-success">
                                + {formatCurrency(stats.monthlyRevenue)} {t('this_month')}
                            </p>
                        </div>
                    </div>

                    {/* Total Trucks */}
                    <div className="panel">
                        <div className="flex items-center justify-between dark:text-white-light">
                            <div className="text-md font-semibold ltr:mr-1 rtl:ml-1">{t('total_trucks') || 'Total Trucks'}</div>
                            <div className="dropdown">
                                <span className={`badge ${stats.trucksGrowth >= 0 ? 'badge-outline-success' : 'badge-outline-danger'}`}>
                                    {stats.trucksGrowth >= 0 ? '+' : ''}
                                    {stats.trucksGrowth.toFixed(0)}%
                                </span>
                            </div>
                        </div>
                        <div className="mt-5 flex items-center">
                            <div className="text-3xl font-bold ltr:mr-3 rtl:ml-3">{formatNumber(stats.totalTrucks)}</div>
                        </div>
                        <div className="mt-5 flex items-center font-semibold">
                            <IconCar className="h-5 w-5 text-primary ltr:mr-2 rtl:ml-2" />
                            <p className="text-xs text-primary">{t('total_fleet') || 'Total Fleet'}</p>
                        </div>
                    </div>

                    {/* Total Bookings */}
                    <div className="panel">
                        <div className="flex items-center justify-between dark:text-white-light">
                            <div className="text-md font-semibold ltr:mr-1 rtl:ml-1">{t('total_bookings') || 'Total Bookings'}</div>
                            <div className="dropdown">
                                <span className={`badge ${stats.bookingsGrowth >= 0 ? 'badge-outline-success' : 'badge-outline-danger'}`}>
                                    {stats.bookingsGrowth >= 0 ? '+' : ''}
                                    {stats.bookingsGrowth.toFixed(0)}%
                                </span>
                            </div>
                        </div>
                        <div className="mt-5 flex items-center">
                            <div className="text-3xl font-bold ltr:mr-3 rtl:ml-3">{formatNumber(stats.totalBookings)}</div>
                        </div>
                        <div className="mt-5 flex items-center font-semibold">
                            <IconMenuInvoice className="h-5 w-5 text-warning ltr:mr-2 rtl:ml-2" />
                            <p className="text-xs text-warning">{t('total_services') || 'Total Services'}</p>
                        </div>
                    </div>

                    {/* Total Customers */}
                    <div className="panel">
                        <div className="flex items-center justify-between dark:text-white-light">
                            <div className="text-md font-semibold ltr:mr-1 rtl:ml-1">{t('total_customers')}</div>
                            <div className="dropdown">
                                <span className={`badge ${stats.customersGrowth >= 0 ? 'badge-outline-success' : 'badge-outline-danger'}`}>
                                    {stats.customersGrowth >= 0 ? '+' : ''}
                                    {stats.customersGrowth.toFixed(0)}%
                                </span>
                            </div>
                        </div>
                        <div className="mt-5 flex items-center">
                            <div className="text-3xl font-bold ltr:mr-3 rtl:ml-3">{formatNumber(stats.totalCustomers)}</div>
                        </div>
                        <div className="mt-5 flex items-center font-semibold">
                            <IconUsersGroup className="h-5 w-5 text-danger ltr:mr-2 rtl:ml-2" />
                            <p className="text-xs text-danger">{t('registered_customers')}</p>
                        </div>
                    </div>
                </div>

                {/* Bookings by Service Type & Quick Actions */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 my-6">
                    {/* Bookings by Service Type */}
                    <div className="panel">
                        <div className="mb-5 flex items-center justify-between">
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('bookings_by_type') || 'Bookings by Service Type'}</h5>
                        </div>
                        <div className="mb-5">
                            {isMounted && Object.keys(stats.bookingsByType).length > 0 && <ReactApexChart options={dealTypeChart.options} series={dealTypeChart.series} type="donut" height={350} />}
                            {Object.keys(stats.bookingsByType).length === 0 && (
                                <div className="flex h-72 items-center justify-center">
                                    <div className="text-lg text-gray-500">{t('no_bookings_data') || 'No bookings data'}</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="panel lg:col-span-2">
                        <div className="mb-5 flex items-center justify-between">
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('quick_actions')}</h5>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {/* Add New Truck */}
                            <Link href="/trucks/add" className="group">
                                <div className="flex flex-col items-center rounded-md border border-gray-200 p-4 transition-all duration-300 hover:border-primary hover:bg-primary/5 dark:border-[#191e3a] dark:hover:border-primary">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
                                        <IconPlus className="h-6 w-6" />
                                    </div>
                                    <div className="text-center">
                                        <h6 className="font-semibold text-[#515365] group-hover:text-primary dark:text-white-light text-sm">{t('add_new_truck') || 'Add New Truck'}</h6>
                                        <p className="text-xs text-white-dark mt-1">{t('create_new_truck') || 'Create new truck'}</p>
                                    </div>
                                </div>
                            </Link>

                            {/* Add New Booking */}
                            <Link href="/bookings/add" className="group">
                                <div className="flex flex-col items-center rounded-md border border-gray-200 p-4 transition-all duration-300 hover:border-warning hover:bg-warning/5 dark:border-[#191e3a] dark:hover:border-warning">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10 text-warning mb-3">
                                        <IconPlus className="h-6 w-6" />
                                    </div>
                                    <div className="text-center">
                                        <h6 className="font-semibold text-[#515365] group-hover:text-warning dark:text-white-light text-sm">{t('add_new_booking') || 'Add New Booking'}</h6>
                                        <p className="text-xs text-white-dark mt-1">{t('create_new_booking') || 'Create new booking'}</p>
                                    </div>
                                </div>
                            </Link>

                            {/* Add New Invoice */}
                            <Link href="/invoices/add" className="group">
                                <div className="flex flex-col items-center rounded-md border border-gray-200 p-4 transition-all duration-300 hover:border-info hover:bg-info/5 dark:border-[#191e3a] dark:hover:border-info">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-info/10 text-info mb-3">
                                        <IconPlus className="h-6 w-6" />
                                    </div>
                                    <div className="text-center">
                                        <h6 className="font-semibold text-[#515365] group-hover:text-info dark:text-white-light text-sm">{t('add_new_invoice') || 'Add New Invoice'}</h6>
                                        <p className="text-xs text-white-dark mt-1">{t('create_new_invoice') || 'Create new invoice'}</p>
                                    </div>
                                </div>
                            </Link>

                            {/* Add New Client */}
                            <Link href="/customers/add" className="group">
                                <div className="flex flex-col items-center rounded-md border border-gray-200 p-4 transition-all duration-300 hover:border-success hover:bg-success/5 dark:border-[#191e3a] dark:hover:border-success">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10 text-success mb-3">
                                        <IconPlus className="h-6 w-6" />
                                    </div>
                                    <div className="text-center">
                                        <h6 className="font-semibold text-[#515365] group-hover:text-success dark:text-white-light text-sm">{t('add_new_client')}</h6>
                                        <p className="text-xs text-white-dark mt-1">{t('create_new_client')}</p>
                                    </div>
                                </div>
                            </Link>
                        </div>

                        {/* Quick Management Links */}
                        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Link href="/trucks" className="group">
                                <div className="flex items-center rounded-md border border-gray-200 p-4 transition-all duration-300 hover:border-primary hover:bg-primary/5 dark:border-[#191e3a] dark:hover:border-primary">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                        <IconCar className="h-6 w-6" />
                                    </div>
                                    <div className="ltr:ml-4 rtl:mr-4">
                                        <h6 className="font-semibold text-[#515365] group-hover:text-primary dark:text-white-light">{t('manage_trucks') || 'Manage Trucks'}</h6>
                                        <p className="text-xs text-white-dark">{t('add_edit_trucks') || 'Add & edit trucks'}</p>
                                    </div>
                                </div>
                            </Link>

                            <Link href="/bookings" className="group">
                                <div className="flex items-center rounded-md border border-gray-200 p-4 transition-all duration-300 hover:border-warning hover:bg-warning/5 dark:border-[#191e3a] dark:hover:border-warning">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10 text-warning">
                                        <IconMenuInvoice className="h-6 w-6" />
                                    </div>
                                    <div className="ltr:ml-4 rtl:mr-4">
                                        <h6 className="font-semibold text-[#515365] group-hover:text-warning dark:text-white-light">{t('manage_bookings') || 'Manage Bookings'}</h6>
                                        <p className="text-xs text-white-dark">{t('create_track_bookings') || 'Create & track bookings'}</p>
                                    </div>
                                </div>
                            </Link>

                            <Link href="/customers" className="group">
                                <div className="flex items-center rounded-md border border-gray-200 p-4 transition-all duration-300 hover:border-success hover:bg-success/5 dark:border-[#191e3a] dark:hover:border-success">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10 text-success">
                                        <IconUsersGroup className="h-6 w-6" />
                                    </div>
                                    <div className="ltr:ml-4 rtl:mr-4">
                                        <h6 className="font-semibold text-[#515365] group-hover:text-success dark:text-white-light">{t('manage_customers')}</h6>
                                        <p className="text-xs text-white-dark">{t('view_customer_info')}</p>
                                    </div>
                                </div>
                            </Link>

                            <Link href="/accounting" className="group">
                                <div className="flex items-center rounded-md border border-gray-200 p-4 transition-all duration-300 hover:border-danger hover:bg-danger/5 dark:border-[#191e3a] dark:hover:border-danger">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-danger/10 text-danger">
                                        <IconEye className="h-6 w-6" />
                                    </div>
                                    <div className="ltr:ml-4 rtl:mr-4">
                                        <h6 className="font-semibold text-[#515365] group-hover:text-danger dark:text-white-light">{t('view_analytics')}</h6>
                                        <p className="text-xs text-white-dark">{t('detailed_reports')}</p>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* New Dashboard Sections */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4 mb-6">
                    {/* Pending Bookings */}
                    <div className="panel">
                        <div className="mb-5 flex items-center justify-between">
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('pending_bookings') || 'Pending Bookings'}</h5>
                            <Link href="/bookings?status=pending" className="text-primary hover:underline text-sm">
                                {t('view_all') || 'View All'}
                            </Link>
                        </div>
                        <div className="text-3xl font-bold text-warning">
                            {stats.pendingBookings || 0}
                        </div>
                        <p className="text-sm text-gray-500 mt-2">{t('awaiting_confirmation') || 'Awaiting confirmation'}</p>
                    </div>

                    {/* Recent Confirmed Bookings */}
                    <div className="panel">
                        <div className="mb-5 flex items-center justify-between">
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('confirmed_bookings') || 'Confirmed Bookings'}</h5>
                            <Link href="/bookings?status=confirmed" className="text-primary hover:underline text-sm">
                                {t('view_all') || 'View All'}
                            </Link>
                        </div>
                        <div className="text-3xl font-bold text-success">
                            {stats.confirmedBookings || 0}
                        </div>
                        <p className="text-sm text-gray-500 mt-2">{t('ready_for_delivery') || 'Ready for delivery'}</p>
                    </div>

                    {/* Total Debts */}
                    <div className="panel">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-sm font-semibold text-gray-500">💰 {t('total_debts') || 'Total Debts'}</div>
                            <IconDollarSign className="h-8 w-8 text-danger" />
                        </div>
                        <div className="text-4xl font-bold text-danger">₪{stats.totalDebts?.toFixed(2) || '0.00'}</div>
                        <div className="text-xs text-gray-500 mt-2">{t('remaining_amount_to_collect') || 'Remaining amount to collect'}</div>
                    </div>

                    {/* Paid Invoices */}
                    <div className="panel">
                        <div className="mb-5 flex items-center justify-between">
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('paid_invoices') || 'Paid Invoices'}</h5>
                            <Link href="/invoices?status=paid" className="text-primary hover:underline text-sm">
                                {t('view_all') || 'View All'}
                            </Link>
                        </div>
                        <div className="text-3xl font-bold text-success">
                            {stats.paidInvoices || 0}
                        </div>
                        <p className="text-sm text-gray-500 mt-2">{t('completed_payments') || 'Completed payments'}</p>
                    </div>
                </div>

                {/* Recent Activities Section */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
                    {/* Recent Payments */}
                    <div className="panel">
                        <div className="mb-5 flex items-center justify-between">
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('recent_payments') || 'Recent Payments'}</h5>
                            <Link href="/payments" className="text-primary hover:underline text-sm">
                                {t('view_all') || 'View All'}
                            </Link>
                        </div>
                        {stats.recentPayments && stats.recentPayments.length > 0 ? (
                            <div className="table-responsive">
                                <table className="table-bordered">
                                    <thead>
                                        <tr>
                                            <th>{t('customer') || 'Customer'}</th>
                                            <th>{t('invoice') || 'Invoice'}</th>
                                            <th>{t('amount') || 'Amount'}</th>
                                            <th>{t('payment_method') || 'Method'}</th>
                                            <th>{t('date') || 'Date'}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.recentPayments.slice(0, 5).map((payment: any, index: number) => (
                                            <tr key={payment.id || index}>
                                                <td>{payment.customer_name || 'N/A'}</td>
                                                <td>{payment.invoice_number || 'N/A'}</td>
                                                <td className="font-bold text-success">{formatCurrency(payment.amount)}</td>
                                                <td className="text-xs uppercase">{payment.payment_method}</td>
                                                <td>{new Date(payment.payment_date).toLocaleDateString('en-GB')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 py-8">
                                {t('no_recent_payments') || 'No recent payments'}
                            </div>
                        )}
                    </div>

                    {/* Recent Invoices (admin) or Recent Bookings (contractor/driver) */}
                    {role === 'contractor' || role === 'driver' ? (
                        <div className="panel">
                            <div className="mb-5 flex items-center justify-between">
                                <h5 className="text-lg font-semibold dark:text-white-light">{t('recent_bookings') || 'Recent Bookings'}</h5>
                                <Link href="/bookings" className="text-primary hover:underline text-sm">
                                    {t('view_all') || 'View All'}
                                </Link>
                            </div>
                            <div className="space-y-4">
                                {stats.recentActivity && (stats.recentActivity as any[]).length > 0 ? (
                                    (stats.recentActivity as any[]).slice(0, 5).map((booking: any, index: number) => (
                                        <div key={index} className="flex items-center justify-between border-b border-gray-200 dark:border-[#191e3a] pb-3 last:border-b-0">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10 text-warning">
                                                    <IconMenuInvoice className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-sm">#{booking.booking_number || booking.id}</p>
                                                    <p className="text-xs text-gray-500">{booking.customer_name || booking.service_address || 'N/A'}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-sm">
                                                    {booking.scheduled_date
                                                        ? new Date(booking.scheduled_date).toLocaleDateString('en-GB')
                                                        : new Date(booking.created_at).toLocaleDateString('en-GB')}
                                                </p>
                                                <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">
                                                    {booking.status || 'pending'}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center text-gray-500 py-8">
                                        {t('no_recent_bookings') || 'No recent bookings'}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="panel">
                            <div className="mb-5 flex items-center justify-between">
                                <h5 className="text-lg font-semibold dark:text-white-light">{t('recent_invoices') || 'Recent Invoices'}</h5>
                                <Link href="/invoices" className="text-primary hover:underline text-sm">
                                    {t('view_all') || 'View All'}
                                </Link>
                            </div>
                            {stats.recentInvoices && stats.recentInvoices.length > 0 ? (
                                <div className="table-responsive">
                                    <table className="table-bordered">
                                        <thead>
                                            <tr>
                                                <th>{t('invoice') || 'Invoice'}</th>
                                                <th>{t('customer') || 'Customer'}</th>
                                                <th>{t('amount') || 'Amount'}</th>
                                                <th>{t('status') || 'Status'}</th>
                                                <th>{t('date') || 'Date'}</th>
                                                <th>{t('actions') || 'Actions'}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stats.recentInvoices.slice(0, 5).map((invoice: any, index: number) => (
                                                <tr key={invoice.id || index}>
                                                    <td>#{invoice.invoice_number}</td>
                                                    <td>{invoice.customer_name || 'N/A'}</td>
                                                    <td className="font-bold">{formatCurrency(invoice.total_amount)}</td>
                                                    <td>
                                                        <span
                                                            className={`badge badge-sm ${
                                                                invoice.status === 'paid'
                                                                    ? 'badge-outline-success'
                                                                    : invoice.status === 'overdue'
                                                                    ? 'badge-outline-danger'
                                                                    : 'badge-outline-warning'
                                                            }`}
                                                        >
                                                            {invoice.status}
                                                        </span>
                                                    </td>
                                                    <td>{invoice.created_at ? new Date(invoice.created_at).toLocaleDateString('en-GB') : '-'}</td>
                                                    <td>
                                                        <button
                                                            onClick={() => handleDownloadInvoicePdf(invoice.id)}
                                                            className="inline-flex hover:text-primary"
                                                            title={t('print') || 'Print'}
                                                        >
                                                            <IconPdf className="h-5 w-5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center text-gray-500 py-8">
                                    {t('no_recent_invoices') || 'No recent invoices'}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Sales & Deals Chart */}
                    <div className="panel">
                        <div className="mb-5 flex items-center justify-between">
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('sales_deals_chart')}</h5>
                        </div>
                        <div className="mb-5">{isMounted && <ReactApexChart options={salesChart.options} series={salesChart.series} type="area" height={325} />}</div>
                    </div>

                    {/* Revenue Trend Chart */}
                    <div className="panel">
                        <div className="mb-5 flex items-center justify-between">
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('revenue_trend')}</h5>
                        </div>
                        <div className="mb-5">{isMounted && <ReactApexChart options={revenueChart.options} series={revenueChart.series} type="line" height={300} />}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomePage;