'use client';
import PerfectScrollbar from 'react-perfect-scrollbar';
import { useDispatch, useSelector } from 'react-redux';
import Link from 'next/link';
import { toggleSidebar } from '@/store/themeConfigSlice';
import AnimateHeight from 'react-animate-height';
import { IRootState } from '@/store';
import { useState, useEffect } from 'react';
import IconCaretsDown from '@/components/icon/icon-carets-down';
import IconMenuDashboard from '@/components/icon/menu/icon-menu-dashboard';
import IconMinus from '@/components/icon/icon-minus';
import IconMenuCar from '@/components/icon/menu/icon-menu-car';
import IconMenuBooking from '@/components/icon/menu/icon-menu-booking';
import IconUser from '@/components/icon/icon-user';
import IconMenuService from '@/components/icon/menu/icon-menu-service';
import IconCalendar from '@/components/icon/icon-calendar';
import IconMenuUsers from '@/components/icon/menu/icon-menu-users';
import IconMenuInvoice from '@/components/icon/menu/icon-menu-invoice';
import IconCreditCard from '@/components/icon/icon-credit-card';
import IconClipboardText from '@/components/icon/icon-clipboard-text';
import { usePathname } from 'next/navigation';
import { getTranslation } from '@/i18n';

const Sidebar = () => {
    const dispatch = useDispatch();
    const { t } = getTranslation();
    const pathname = usePathname();
    const [currentMenu, setCurrentMenu] = useState<string>('');
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const semidark = useSelector((state: IRootState) => state.themeConfig.semidark);
    
    const toggleMenu = (value: string) => {
        setCurrentMenu((oldValue) => {
            return oldValue === value ? '' : value;
        });
    };

    useEffect(() => {
        const selector = document.querySelector('.sidebar ul a[href="' + window.location.pathname + '"]');
        if (selector) {
            selector.classList.add('active');
            const ul: any = selector.closest('ul.sub-menu');
            if (ul) {
                let ele: any = ul.closest('li.menu').querySelectorAll('.nav-link') || [];
                if (ele.length) {
                    ele = ele[0];
                    setTimeout(() => {
                        ele.click();
                    });
                }
            }
        }
    }, []);

    useEffect(() => {
        setActiveRoute();
        if (window.innerWidth < 1024 && themeConfig.sidebar) {
            dispatch(toggleSidebar());
        }
    }, [pathname]);

    const setActiveRoute = () => {
        let allLinks = document.querySelectorAll('.sidebar ul a.active');
        for (let i = 0; i < allLinks.length; i++) {
            const element = allLinks[i];
            element?.classList.remove('active');
        }
        const selector = document.querySelector('.sidebar ul a[href="' + window.location.pathname + '"]');
        selector?.classList.add('active');
    };

    return (
        <div className={semidark ? 'dark' : ''}>
            <nav
                className={`sidebar fixed bottom-0 top-0 z-50 h-full min-h-screen w-[260px] shadow-[5px_0_25px_0_rgba(94,92,154,0.1)] transition-all duration-300 ${semidark ? 'text-white-dark' : ''}`}
            >
                <div className="h-full bg-white dark:bg-black">
                    <div className="flex items-center justify-between px-4 py-3">
                        <Link href="/dashboard" className="main-logo flex shrink-0 items-center">
                            <img className="ml-[5px] w-8 flex-none" src="/assets/images/logo.svg" alt="logo" />
                            <span className="align-middle text-2xl font-semibold ltr:ml-1.5 rtl:mr-1.5 dark:text-white-light lg:inline">PumpPro</span>
                        </Link>

                        <button
                            type="button"
                            className="collapse-icon flex h-8 w-8 items-center rounded-full transition duration-300 hover:bg-gray-500/10 rtl:rotate-180 dark:text-white-light dark:hover:bg-dark-light/10"
                            onClick={() => dispatch(toggleSidebar())}
                        >
                            <IconCaretsDown className="m-auto rotate-90" />
                        </button>
                    </div>
                    <PerfectScrollbar className="relative h-[calc(100vh-80px)]">
                        <ul className="relative space-y-0.5 p-4 py-0 font-semibold">
                            {/* Management Section */}
                            <h2 className="-mx-4 mb-1 flex items-center bg-white-light/30 px-7 py-3 text-base font-extrabold uppercase dark:bg-dark dark:bg-opacity-[0.08]">
                                <IconMinus className="hidden h-5 w-4 flex-none" />
                                <span>Management</span>
                            </h2>

                            {/* Dashboard */}
                            <li className="nav-item">
                                <Link href="/" className="group">
                                    <div className="flex items-center">
                                        <IconMenuDashboard className="h-5 w-5 shrink-0 group-hover:!text-primary" />
                                        <span className="text-base font-bold text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Dashboard</span>
                                    </div>
                                </Link>
                            </li>

                            {/* Bookings */}
                            <li className="nav-item">
                                <Link href="/bookings" className="group">
                                    <div className="flex items-center">
                                        <IconCalendar className="h-5 w-5 shrink-0 group-hover:!text-primary" />
                                        <span className="text-base font-bold text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Bookings</span>
                                    </div>
                                </Link>
                            </li>

                            {/* Fleet */}
                            <li className="nav-item">
                                <Link href="/fleet" className="group">
                                    <div className="flex items-center">
                                        <IconMenuCar className="h-5 w-5 shrink-0 group-hover:!text-primary" />
                                        <span className="text-base font-bold text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Fleet</span>
                                    </div>
                                </Link>
                            </li>

                            {/* Drivers */}
                            <li className="nav-item">
                                <Link href="/drivers" className="group">
                                    <div className="flex items-center">
                                        <IconUser className="h-5 w-5 shrink-0 group-hover:!text-primary" />
                                        <span className="text-base font-bold text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Drivers</span>
                                    </div>
                                </Link>
                            </li>

                            {/* Customers */}
                            <li className="nav-item">
                                <Link href="/customers" className="group">
                                    <div className="flex items-center">
                                        <IconMenuUsers className="h-5 w-5 shrink-0 group-hover:!text-primary" />
                                        <span className="text-base font-bold text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Customers</span>
                                    </div>
                                </Link>
                            </li>

                            {/* Services */}
                            <li className="nav-item">
                                <Link href="/services" className="group">
                                    <div className="flex items-center">
                                        <IconMenuService className="h-5 w-5 shrink-0 group-hover:!text-primary" />
                                        <span className="text-base font-bold text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Services</span>
                                    </div>
                                </Link>
                            </li>

                            {/* Users */}
                            <li className="nav-item">
                                <Link href="/users" className="group">
                                    <div className="flex items-center">
                                        <IconMenuUsers className="h-5 w-5 shrink-0 group-hover:!text-primary" />
                                        <span className="text-base font-bold text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Users</span>
                                    </div>
                                </Link>
                            </li>

                            {/* Accounting Section */}
                            <h2 className="-mx-4 mb-1 mt-4 flex items-center bg-white-light/30 px-7 py-3 text-base font-extrabold uppercase dark:bg-dark dark:bg-opacity-[0.08]">
                                <IconMinus className="hidden h-5 w-4 flex-none" />
                                <span>Accounting</span>
                            </h2>

                            {/* Accounting Dashboard */}
                            <li className="nav-item">
                                <Link href="/accounting" className="group">
                                    <div className="flex items-center">
                                        <IconMenuInvoice className="h-5 w-5 shrink-0 group-hover:!text-primary" />
                                        <span className="text-base font-bold text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Accounting</span>
                                    </div>
                                </Link>
                            </li>

                            {/* Invoices */}
                            <li className="nav-item">
                                <Link href="/invoices" className="group">
                                    <div className="flex items-center">
                                        <IconClipboardText className="h-5 w-5 shrink-0 group-hover:!text-primary" />
                                        <span className="text-base font-bold text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Invoices</span>
                                    </div>
                                </Link>
                            </li>

                            {/* Payments */}
                            <li className="nav-item">
                                <Link href="/payments" className="group">
                                    <div className="flex items-center">
                                        <IconCreditCard className="h-5 w-5 shrink-0 group-hover:!text-primary" />
                                        <span className="text-base font-bold text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Payments</span>
                                    </div>
                                </Link>
                            </li>
                        </ul>
                    </PerfectScrollbar>
                </div>
            </nav>
        </div>
    );
};

export default Sidebar;
