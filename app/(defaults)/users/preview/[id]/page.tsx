'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import IconArrowLeft from '@/components/icon/icon-arrow-left';
import IconEdit from '@/components/icon/icon-edit';
import IconUser from '@/components/icon/icon-user';
import IconMail from '@/components/icon/icon-mail';
import IconCalendar from '@/components/icon/icon-calendar';
import { supabase } from '@/lib/supabase/client';
import { getTranslation } from '@/i18n';
import Link from 'next/link';

interface User {
    id: string;
    email: string;
    full_name: string | null;
    role: string;
    avatar_url: string | null;
    created_at: string;
    updated_at: string;
}

const UserPreview = () => {
    const { t } = getTranslation();
    const params = useParams();
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [userNumber, setUserNumber] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const userId = params?.id as string;

                // Fetch user profile
                const { data: userData, error: userError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (userError) throw userError;

                const typedUserData = userData as User;

                // Get user number (count of users created before this one + 1)
                const { count } = await supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .lte('created_at', typedUserData.created_at);

                setUser(typedUserData);
                setUserNumber(count || 0);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        if (params?.id) {
            fetchData();
        }
    }, [params?.id]);

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
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="flex items-center gap-2 text-primary hover:text-primary/80">
                        <IconArrowLeft className="h-5 w-5 rtl:rotate-180" />
                        <span>Back</span>
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold">{user.full_name || 'User Details'}</h1>
                        <p className="text-sm text-gray-500">View user information</p>
                    </div>
                </div>
                <Link href={`/users/edit/${user.id}`} className="btn btn-primary gap-2">
                    <IconEdit className="h-4 w-4" />
                    Edit User
                </Link>
            </div>

            {/* User Info Card */}
            <div className="panel mb-6">
                <div className="mb-5 flex items-center justify-between">
                    <h5 className="text-lg font-semibold dark:text-white-light">User Information</h5>
                    <span className={`badge ${user.role === 'admin' ? 'badge-outline-danger' : 'badge-outline-primary'}`}>
                        {user.role.toUpperCase()}
                    </span>
                </div>

                <div className="flex flex-col items-center justify-center py-8">
                    {/* Avatar */}
                    <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
                        {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.full_name || ''} className="h-full w-full rounded-full object-cover" />
                        ) : (
                            <IconUser className="h-12 w-12 text-primary" />
                        )}
                    </div>

                    {/* Name */}
                    <h3 className="mb-2 text-2xl font-bold">{user.full_name || 'N/A'}</h3>

                    {/* Email */}
                    <div className="mb-4 flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <IconMail className="h-4 w-4" />
                        <span>{user.email}</span>
                    </div>

                    {/* Role Badge */}
                    <div className="flex items-center gap-2">
                        <IconUser className="h-5 w-5 text-primary" />
                        <span className="font-semibold">{user.role === 'admin' ? 'Administrator' : 'User'}</span>
                    </div>
                </div>

                <div className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700">
                    <div className="flex flex-col gap-6 sm:flex-row">
                        {/* User Number - Left */}
                        <div className="flex-1">
                            <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-white">User Number</label>
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                <span className="text-xl font-bold text-primary">#{userNumber}</span>
                            </div>
                        </div>

                        {/* Created Date - Center */}
                        <div className="flex-1 sm:text-center">
                            <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-white">Created Date</label>
                            <div className="flex items-center justify-start gap-2 text-gray-600 dark:text-gray-400 sm:justify-center">
                                <IconCalendar className="h-4 w-4" />
                                <span>
                                    {new Date(user.created_at).toLocaleDateString('en-GB', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </span>
                            </div>
                        </div>

                        {/* Last Updated - Right */}
                        <div className="flex-1 sm:text-right">
                            <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-white">Last Updated</label>
                            <div className="flex items-center justify-start gap-2 text-gray-600 dark:text-gray-400 sm:justify-end">
                                <IconCalendar className="h-4 w-4" />
                                <span>
                                    {new Date(user.updated_at).toLocaleDateString('en-GB', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Account Details */}
            <div className="panel">
                <div className="mb-5">
                    <h5 className="text-lg font-semibold dark:text-white-light">Account Details</h5>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                        <div>
                            <p className="font-semibold">Email Address</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                        <span className="badge badge-outline-success">Verified</span>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                        <div>
                            <p className="font-semibold">Account Role</p>
                            <p className="text-sm text-gray-500">
                                {user.role === 'admin' ? 'Full system access' : 'Limited access'}
                            </p>
                        </div>
                        <span className={`badge ${user.role === 'admin' ? 'badge-outline-danger' : 'badge-outline-primary'}`}>
                            {user.role.toUpperCase()}
                        </span>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                        <div>
                            <p className="font-semibold">Account Status</p>
                            <p className="text-sm text-gray-500">Account is active and in good standing</p>
                        </div>
                        <span className="badge badge-outline-success">Active</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserPreview;
