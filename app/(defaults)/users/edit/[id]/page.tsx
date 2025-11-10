'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseClient } from '@/lib/supabase/client';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import RoleSelect from '@/components/role-select/role-select';
import { getTranslation } from '@/i18n';
import type { Database } from '@/types/database.types';
import { Tab } from '@headlessui/react';
import IconUser from '@/components/icon/icon-user';
import IconLockDots from '@/components/icon/icon-lock-dots';
import IconSettings from '@/components/icon/icon-settings';

interface User {
    id: string;
    email: string;
    full_name: string | null;
    role: string;
    avatar_url: string | null;
    created_at: string;
    updated_at: string;
}

const EditUser = () => {
    const { t } = getTranslation();
    const router = useRouter();
    const params = useParams();
    const userId = params?.id as string;
    const supabase = createSupabaseClient();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [user, setUser] = useState<User | null>(null);

    const [form, setForm] = useState({
        email: '',
        full_name: '',
        role: 'user',
        password: '', // Optional - only if changing password
    });

    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (error) throw error;

                if (data) {
                    const userData = data as User;
                    setUser(userData);
                    setForm({
                        email: userData.email || '',
                        full_name: userData.full_name || '',
                        role: userData.role || 'user',
                        password: '',
                    });
                }
            } catch (error) {
                console.error('Error fetching user:', error);
                setAlert({ visible: true, message: 'Error loading user data', type: 'danger' });
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            fetchUser();
        }
    }, [userId]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const validateForm = () => {
        if (!form.email.trim()) {
            setAlert({ visible: true, message: 'Email is required', type: 'danger' });
            return false;
        }
        
        if (!form.full_name.trim()) {
            setAlert({ visible: true, message: 'Full name is required', type: 'danger' });
            return false;
        }

        if (form.password && form.password.length < 6) {
            setAlert({ visible: true, message: 'Password must be at least 6 characters', type: 'danger' });
            return false;
        }
        
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setSaving(true);
        try {
            // Update profile in database
            const updateData: Database['public']['Tables']['profiles']['Update'] = {
                email: form.email.trim(),
                full_name: form.full_name.trim(),
                role: form.role,
                updated_at: new Date().toISOString(),
            };

            const { error: profileError } = await supabase
                .from('profiles')
                // @ts-ignore - Supabase client type inference issue
                .update(updateData)
                .eq('id', userId);

            if (profileError) throw profileError;

            // If password is provided, update it via API
            if (form.password) {
                const response = await fetch('/api/users/update-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        userId: userId,
                        password: form.password,
                    }),
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.message || 'Failed to update password');
                }
            }

            setAlert({ visible: true, message: 'User updated successfully', type: 'success' });

            setTimeout(() => {
                router.push('/users');
            }, 1500);
        } catch (error) {
            console.error(error);
            setAlert({
                visible: true,
                message: error instanceof Error ? error.message : 'Error updating user',
                type: 'danger',
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <span className="inline-flex h-10 w-10 animate-spin rounded-full border-4 border-transparent border-l-primary align-middle"></span>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="container mx-auto p-6">
                <div className="panel">
                    <p className="text-center text-danger">User not found</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
            <div className="flex items-center gap-5 mb-6">
                <div onClick={() => router.back()}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mb-4 cursor-pointer text-primary rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </div>
                <ul className="flex space-x-2 rtl:space-x-reverse mb-4">
                    <li>
                        <Link href="/" className="text-primary hover:underline">
                            {t('home')}
                        </Link>
                    </li>
                    <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                        <Link href="/users" className="text-primary hover:underline">
                            Users
                        </Link>
                    </li>
                    <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                        <span>Edit User</span>
                    </li>
                </ul>
            </div>

            <div className="mb-6">
                <h1 className="text-2xl font-bold">Edit User</h1>
                <p className="text-gray-500">Update user information</p>
            </div>

            {alert.visible && (
                <div className="mb-6">
                    <Alert
                        type={alert.type}
                        title={alert.type === 'success' ? t('success') : t('error')}
                        message={alert.message}
                        onClose={() => setAlert({ visible: false, message: '', type: 'success' })}
                    />
                </div>
            )}

            <Tab.Group>
                <Tab.List className="mt-3 flex flex-wrap border-b border-white-light dark:border-[#191e3a]">
                    <Tab as="div" className="flex-1">
                        {({ selected }) => (
                            <button
                                type="button"
                                className={`${
                                    selected ? 'text-primary !outline-none before:!w-full' : ''
                                } relative -mb-[1px] flex w-full items-center justify-center border-b border-transparent p-5 py-3 before:absolute before:bottom-0 before:left-0 before:right-0 before:m-auto before:inline-block before:h-[1px] before:w-0 before:bg-primary before:transition-all before:duration-700 hover:text-primary hover:before:w-full`}
                            >
                                <IconUser className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                                Basic Information
                            </button>
                        )}
                    </Tab>
                    <Tab as="div" className="flex-1">
                        {({ selected }) => (
                            <button
                                type="button"
                                className={`${
                                    selected ? 'text-primary !outline-none before:!w-full' : ''
                                } relative -mb-[1px] flex w-full items-center justify-center border-b border-transparent p-5 py-3 before:absolute before:bottom-0 before:left-0 before:right-0 before:m-auto before:inline-block before:h-[1px] before:w-0 before:bg-primary before:transition-all before:duration-700 hover:text-primary hover:before:w-full`}
                            >
                                <IconSettings className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                                Role & Permissions
                            </button>
                        )}
                    </Tab>
                    <Tab as="div" className="flex-1">
                        {({ selected }) => (
                            <button
                                type="button"
                                className={`${
                                    selected ? 'text-primary !outline-none before:!w-full' : ''
                                } relative -mb-[1px] flex w-full items-center justify-center border-b border-transparent p-5 py-3 before:absolute before:bottom-0 before:left-0 before:right-0 before:m-auto before:inline-block before:h-[1px] before:w-0 before:bg-primary before:transition-all before:duration-700 hover:text-primary hover:before:w-full`}
                            >
                                <IconLockDots className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                                Security
                            </button>
                        )}
                    </Tab>
                </Tab.List>

                <Tab.Panels className="mt-5">
                    {/* Basic Information Tab */}
                    <Tab.Panel>
                        <div className="panel">
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {/* Full Name */}
                                    <div>
                                        <label htmlFor="full_name" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                            Full Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="full_name"
                                            name="full_name"
                                            value={form.full_name}
                                            onChange={handleInputChange}
                                            className="form-input"
                                            placeholder="Enter full name"
                                            required
                                        />
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                            Email <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            value={form.email}
                                            onChange={handleInputChange}
                                            className="form-input"
                                            placeholder="Enter email address"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <div className="flex justify-end gap-4 mt-8">
                                    <button type="button" onClick={() => router.back()} className="btn btn-outline-danger">
                                        {t('cancel')}
                                    </button>
                                    <button type="submit" className="btn btn-primary" disabled={saving}>
                                        {saving ? (
                                            <>
                                                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-l-transparent align-middle ltr:mr-2 rtl:ml-2"></span>
                                                Updating...
                                            </>
                                        ) : (
                                            'Update User'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </Tab.Panel>

                    {/* Role & Permissions Tab */}
                    <Tab.Panel>
                        <div className="panel">
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                        Role <span className="text-red-500">*</span>
                                    </label>
                                    <RoleSelect
                                        value={form.role}
                                        onChange={(value) => setForm(prev => ({ ...prev, role: value }))}
                                        className="form-select"
                                        required
                                    />
                                </div>

                                <div className="flex justify-end gap-4 mt-8">
                                    <button type="button" onClick={() => router.back()} className="btn btn-outline-danger">
                                        {t('cancel')}
                                    </button>
                                    <button type="submit" className="btn btn-primary" disabled={saving}>
                                        {saving ? (
                                            <>
                                                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-l-transparent align-middle ltr:mr-2 rtl:ml-2"></span>
                                                Updating...
                                            </>
                                        ) : (
                                            'Update User'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </Tab.Panel>

                    {/* Security Tab */}
                    <Tab.Panel>
                        <div className="panel">
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label htmlFor="password" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                        New Password
                                    </label>
                                    <input
                                        type="password"
                                        id="password"
                                        name="password"
                                        value={form.password}
                                        onChange={handleInputChange}
                                        className="form-input"
                                        placeholder="Enter new password"
                                        minLength={6}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Leave blank to keep current password. Minimum 6 characters.</p>
                                </div>

                                <div className="flex justify-end gap-4 mt-8">
                                    <button type="button" onClick={() => router.back()} className="btn btn-outline-danger">
                                        {t('cancel')}
                                    </button>
                                    <button type="submit" className="btn btn-primary" disabled={saving}>
                                        {saving ? (
                                            <>
                                                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-l-transparent align-middle ltr:mr-2 rtl:ml-2"></span>
                                                Updating...
                                            </>
                                        ) : (
                                            'Update User'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </Tab.Panel>
                </Tab.Panels>
            </Tab.Group>
        </div>
    );
};

export default EditUser;
