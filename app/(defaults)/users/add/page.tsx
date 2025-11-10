'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import RoleSelect from '@/components/role-select/role-select';
import { getTranslation } from '@/i18n';

const AddUser = () => {
    const { t } = getTranslation();
    const router = useRouter();
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        email: '',
        password: '',
        full_name: '',
        role: 'user',
    });

    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const validateForm = () => {
        if (!form.email.trim()) {
            setAlert({ visible: true, message: 'Email is required', type: 'danger' });
            return false;
        }
        
        if (!form.password.trim()) {
            setAlert({ visible: true, message: 'Password is required', type: 'danger' });
            return false;
        }

        if (form.password.length < 6) {
            setAlert({ visible: true, message: 'Password must be at least 6 characters', type: 'danger' });
            return false;
        }
        
        if (!form.full_name.trim()) {
            setAlert({ visible: true, message: 'Full name is required', type: 'danger' });
            return false;
        }
        
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setSaving(true);
        try {
            // Call API to create user
            const response = await fetch('/api/users/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(form),
            });

            const data = await response.json();

            if (!response.ok) {
                // Log detailed error information
                console.error('API Error Response:', data);
                
                // Build detailed error message
                let errorMessage = data.message || 'Failed to create user';
                if (data.error) errorMessage += `\nError: ${data.error}`;
                if (data.details) errorMessage += `\nDetails: ${data.details}`;
                if (data.hint) errorMessage += `\nHint: ${data.hint}`;
                
                throw new Error(errorMessage);
            }

            setAlert({ visible: true, message: 'User created successfully', type: 'success' });

            setTimeout(() => {
                router.push('/users');
            }, 1500);
        } catch (error) {
            console.error(error);
            setAlert({
                visible: true,
                message: error instanceof Error ? error.message : 'Error creating user',
                type: 'danger',
            });
        } finally {
            setSaving(false);
        }
    };

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
                        <span>Create User</span>
                    </li>
                </ul>
            </div>

            <div className="mb-6">
                <h1 className="text-2xl font-bold">Create User</h1>
                <p className="text-gray-500">Add a new user to your system</p>
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

            <div className="panel">
                <div className="mb-5">
                    <h5 className="text-lg font-semibold dark:text-white-light">User Information</h5>
                </div>

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

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                Password <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={form.password}
                                onChange={handleInputChange}
                                className="form-input"
                                placeholder="Enter password (min 6 characters)"
                                required
                                minLength={6}
                            />
                            <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters</p>
                        </div>

                        {/* Role */}
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
                                    Creating...
                                </>
                            ) : (
                                'Create User'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddUser;
