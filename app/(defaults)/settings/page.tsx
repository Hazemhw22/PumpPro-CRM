'use client';
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getTranslation } from '@/i18n';
import { supabase } from '@/lib/supabase/client';
import IconUser from '@/components/icon/icon-user';
import IconMail from '@/components/icon/icon-mail';
import IconPhone from '@/components/icon/icon-phone';
import IconMapPin from '@/components/icon/icon-map-pin';
import IconCalendar from '@/components/icon/icon-calendar';
import IconSettings from '@/components/icon/icon-settings';
import IconEdit from '@/components/icon/icon-edit';
import IconSave from '@/components/icon/icon-save';
import IconEye from '@/components/icon/icon-eye';
import IconLock from '@/components/icon/icon-lock';
import IconHome from '@/components/icon/icon-home';
import IconChecks from '@/components/icon/icon-checks';

type UserProfile = {
    id: string;
    email: string;
    phone: string | null;
    full_name: string | null;
    birth_date?: string | null;
    address?: string | null;
    avatar_url: string | null;
    updated_at?: string | null;
    role?: string | null;
};

// Narrow type for the subset of columns we select from the profiles table
type ProfileRow = {
    id: string;
    email: string | null;
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
    role: string | null;
};

type PasswordChange = {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
};

export default function ProfilePage() {
    const { t } = getTranslation();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences'>('profile');
    const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});
    const [passwordChange, setPasswordChange] = useState<PasswordChange>({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
    const [preferences, setPreferences] = useState({ language: 'en', theme: 'system', notifications: { email: true, sms: false, trip_updates: true, payment_reminders: true } });

    useEffect(() => {
        const loadUser = async () => {
            try {
                const { data: { user: authUser } } = await supabase.auth.getUser();
                if (!authUser) { setLoading(false); return; }
                // Fetch the typed profile row
                const { data: profile }: { data: ProfileRow | null } = await supabase
                    .from('profiles')
                    .select('id, email, full_name, phone, avatar_url, role')
                    .eq('id', authUser.id)
                    .maybeSingle();
                const up: UserProfile = {
                    id: authUser.id,
                    email: authUser.email || profile?.email || '',
                    full_name: profile?.full_name || '',
                    phone: profile?.phone || '',
                    avatar_url: profile?.avatar_url || '',
                    role: profile?.role || null,
                };
                setUser(up);
                setEditedProfile(up);
            } catch (e) {
                // ignore
            } finally {
                setLoading(false);
            }
        };
        loadUser();
    }, []);

    const handleSaveProfile = async () => {
        if (!user?.id) return;
        try {
            setSaving(true);
            // @ts-ignore
            const { error } = await supabase.from('profiles').update({
                full_name: editedProfile.full_name,
                phone: editedProfile.phone,
                avatar_url: editedProfile.avatar_url,
                updated_at: new Date().toISOString(),
            }).eq('id', user.id);
            if (error) throw error;
            setUser({ ...user, ...editedProfile });
            setIsEditing(false);
        } catch (e) {
            console.error('Error updating profile:', e);
            alert('Error saving profile');
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (passwordChange.newPassword !== passwordChange.confirmPassword) {
            alert('Passwords do not match');
            return;
        }
        try {
            setSaving(true);
            const { error } = await supabase.auth.updateUser({ password: passwordChange.newPassword });
            if (error) throw error;
            setPasswordChange({ currentPassword: '', newPassword: '', confirmPassword: '' });
            alert('Password changed');
        } catch (e) {
            console.error('Error changing password:', e);
            alert('Error changing password');
        } finally {
            setSaving(false);
        }
    };

    const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.3, staggerChildren: 0.1 } } };
    const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.5 } } };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-t-4 border-purple-600"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl p-8 shadow-2xl">
                    <h2 className="text-2xl font-bold mb-2">{t('profile_not_found') || 'Profile Not Found'}</h2>
                    <p className="text-gray-600 dark:text-gray-400">{t('profile_not_found_description') || 'Unable to load your profile information.'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <motion.div variants={itemVariants} className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-600 via-violet-600 to-fuchsia-600 p-8 shadow-2xl">
                    <div className="absolute inset-0 bg-black/10"></div>
                    <div className="relative z-10 text-center">
                        <h1 className="text-3xl font-bold text-white mb-2">{t('my_profile') || 'My Profile'}</h1>
                        <p className="text-white/90">{t('manage_account_settings') || 'Manage your account settings and preferences'}</p>
                    </div>
                </motion.div>

                {/* Profile Header Card */}
                <motion.div variants={itemVariants} className="bg-white/70 dark:bg-gray-800/70 rounded-2xl border p-6 shadow">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        {/* Avatar */}
                        <div className="relative">
                            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500 via-violet-500 to-fuchsia-600 flex items-center justify-center">
                                {user.avatar_url ? (
                                    <img src={user.avatar_url} alt={user.full_name || user.email} className="w-full h-full rounded-2xl object-cover" />
                                ) : (
                                    <IconUser className="w-12 h-12 text-white" />
                                )}
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-emerald-600 rounded-full border-4 border-white dark:border-gray-800 flex items-center justify-center">
                                <IconChecks className="w-4 h-4 text-white" />
                            </div>
                        </div>

                        {/* User Info */}
                        <div className="flex-1 text-center md:text-left">
                            <h2 className="text-2xl font-bold">{user.full_name || user.email}</h2>
                            <div className="flex flex-col md:flex-row gap-4 text-sm mt-2">
                                <div className="flex items-center justify-center md:justify-start gap-2 text-gray-600 dark:text-gray-400">
                                    <IconMail className="w-4 h-4" />
                                    <span className="font-medium">{user.email}</span>
                                </div>
                                {user.role && (
                                    <div className="flex items-center justify-center md:justify-start gap-2 text-gray-600 dark:text-gray-400">
                                        <IconChecks className="w-4 h-4" />
                                        <span className="font-medium">{user.role}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Tabs */}
                <motion.div variants={itemVariants} className="bg-white/70 dark:bg-gray-800/70 rounded-2xl border p-2 shadow">
                    <div className="flex space-x-2">
                        {[
                            { id: 'profile', label: t('profile_info') || 'Profile Info', icon: IconUser },
                            { id: 'security', label: t('security') || 'Security', icon: IconLock },
                            { id: 'preferences', label: t('preferences') || 'Preferences', icon: IconSettings },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                                    activeTab === tab.id ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Content */}
                <motion.div variants={itemVariants} className="bg-white/70 dark:bg-gray-800/70 rounded-2xl border p-6 shadow">
                    {activeTab === 'profile' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-semibold">{t('personal_information') || 'Personal Information'}</h3>
                                <button onClick={() => (isEditing ? handleSaveProfile() : setIsEditing(true))} disabled={saving} className="btn btn-primary">
                                    {saving ? (t('saving') || 'Saving...') : isEditing ? <div className="flex items-center gap-2"><IconSave className="w-4 h-4" /> {t('save') || 'Save'}</div> : <div className="flex items-center gap-2"><IconEdit className="w-4 h-4" /> {t('edit') || 'Edit'}</div>}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium mb-2">{t('full_name') || 'Full Name'}</label>
                                    {isEditing ? (
                                        <input type="text" value={editedProfile.full_name || ''} onChange={(e) => setEditedProfile({ ...editedProfile, full_name: e.target.value })} className="form-input" />
                                    ) : (
                                        <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                                            <IconUser className="w-4 h-4" />
                                            <span>{user.full_name || t('not_set') || 'Not set'}</span>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">{t('email') || 'Email'}</label>
                                    <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                                        <IconMail className="w-4 h-4" />
                                        <span>{user.email}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">{t('phone') || 'Phone'}</label>
                                    {isEditing ? (
                                        <input type="tel" value={editedProfile.phone || ''} onChange={(e) => setEditedProfile({ ...editedProfile, phone: e.target.value })} className="form-input" />
                                    ) : (
                                        <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                                            <IconPhone className="w-4 h-4" />
                                            <span>{user.phone || t('not_set') || 'Not set'}</span>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">{t('address') || 'Address'}</label>
                                    {isEditing ? (
                                        <input type="text" value={editedProfile.address || ''} onChange={(e) => setEditedProfile({ ...editedProfile, address: e.target.value })} className="form-input" />
                                    ) : (
                                        <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                                            <IconMapPin className="w-4 h-4" />
                                            <span>{user.address || t('not_set') || 'Not set'}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-2">
                                <IconLock className="w-5 h-5" />
                                <h3 className="text-xl font-semibold">{t('change_password') || 'Change Password'}</h3>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">{t('current_password') || 'Current Password'}</label>
                                    <div className="relative">
                                        <input type={showPasswords.current ? 'text' : 'password'} value={passwordChange.currentPassword} onChange={(e) => setPasswordChange({ ...passwordChange, currentPassword: e.target.value })} className="form-input pr-10" />
                                        <button type="button" onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"><IconEye className="w-4 h-4" /></button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">{t('new_password') || 'New Password'}</label>
                                    <div className="relative">
                                        <input type={showPasswords.new ? 'text' : 'password'} value={passwordChange.newPassword} onChange={(e) => setPasswordChange({ ...passwordChange, newPassword: e.target.value })} className="form-input pr-10" />
                                        <button type="button" onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"><IconEye className="w-4 h-4" /></button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">{t('confirm_password') || 'Confirm Password'}</label>
                                    <div className="relative">
                                        <input type={showPasswords.confirm ? 'text' : 'password'} value={passwordChange.confirmPassword} onChange={(e) => setPasswordChange({ ...passwordChange, confirmPassword: e.target.value })} className="form-input pr-10" />
                                        <button type="button" onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"><IconEye className="w-4 h-4" /></button>
                                    </div>
                                </div>
                                <button onClick={handleChangePassword} disabled={saving || !passwordChange.currentPassword || !passwordChange.newPassword || !passwordChange.confirmPassword} className="btn btn-primary w-full">{saving ? (t('changing_password') || 'Changing Password...') : (t('change_password') || 'Change Password')}</button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'preferences' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-2">
                                <IconSettings className="w-5 h-5" />
                                <h3 className="text-xl font-semibold">{t('account_preferences') || 'Account Preferences'}</h3>
                            </div>
                            <div className="space-y-4">
                                {/* Example: Notification preferences only displayed locally */}
                                <div className="flex items-center justify-between p-4 rounded-xl border bg-gray-50 dark:bg-gray-700">
                                    <span>{t('email_notifications') || 'Email Notifications'}</span>
                                    <input type="checkbox" checked={preferences.notifications.email} onChange={(e)=> setPreferences(prev => ({ ...prev, notifications: { ...prev.notifications, email: e.target.checked } }))} />
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </div>
    );
}


