import React from 'react';

interface TabItem {
    id: string;
    label: string;
}

interface TabsProps {
    items: TabItem[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
    className?: string;
}

export default function Tabs({ items, activeTab, onTabChange, className = '' }: TabsProps) {
    return (
        <div className={`border-b border-white-light dark:border-[#191e3a] ${className}`}>
            <nav className="-mb-px flex flex-wrap gap-2">
                {items.map((item) => {
                    const isActive = activeTab === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => onTabChange(item.id)}
                            className={`
                                px-4 py-3 font-medium text-sm transition-colors relative
                                ${isActive ? 'text-primary border-b-2 border-primary' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 border-b-2 border-transparent'}
                            `}
                        >
                            {item.label}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}
