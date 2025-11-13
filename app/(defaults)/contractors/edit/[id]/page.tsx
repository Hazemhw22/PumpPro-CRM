'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import IconUser from '@/components/icon/icon-user';
import IconPhone from '@/components/icon/icon-phone';
import IconMail from '@/components/icon/icon-mail';
import IconCamera from '@/components/icon/icon-camera';
import { supabase } from '@/lib/supabase/client';
import { getTranslation } from '@/i18n';
import Link from 'next/link';
import { Tab } from '@headlessui/react';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';

interface Contractor {
    id: string;
    created_at: string;
    contractor_number?: string;
    name?: string;
    phone?: string;
    email?: string;
    balance?: number;
    status?: 'active' | 'inactive';
    notes?: string;
    photo_url?: string;
}

const EditContractor = () => {
    const { t } = getTranslation();
    const params = useParams();
    const router = useRouter();
    const [contractor, setContractor] = useState<Contractor | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string>('');

    const [form, setForm] = useState({
        contractor_number: '',
        name: '',
        phone: '',
        email: '',
        balance: '0',
        status: 'active' as 'active' | 'inactive',
        notes: '',
    });

    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        const fetchContractor = async () => {
            try {
                const { data, error } = await supabase
                    .from('contractors')
                    .select('*')
                    .eq('id', params?.id)
                    .single();

                if (error) throw error;

                if (data) {
                    const contractorData = data as any;
                    setContractor(contractorData as Contractor);
                    setForm({
                        contractor_number: contractorData.contractor_number || '',
                        name: contractorData.name || '',
                        phone: contractorData.phone || '',
                        email: contractorData.email || '',
                        balance: contractorData.balance?.toString() || '0',
                        status: contractorData.status || 'active',
                        notes: contractorData.notes || '',
                    });
                    if (contractorData.photo_url) {
                        setPhotoPreview(contractorData.photo_url);
                    }
                }
            } catch (error) {
                console.error('Error fetching contractor:', error);
                setAlert({ visible: true, message: 'Error loading contractor data', type: 'danger' });
            } finally {
                setLoading(false);
            }
        };

        if (params?.id) {
            fetchContractor();
        }
    }, [params?.id]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const validateForm = () => {
        if (!form.name.trim()) {
            setAlert({ visible: true, message: 'Name is required', type: 'danger' });
            return false;
        }

        if (!form.phone.trim()) {
            setAlert({ visible: true, message: 'Phone is required', type: 'danger' });
            return false;
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setSaving(true);
        try {
            let photoUrl = contractor?.photo_url;

            // Upload photo if changed
            if (photoFile) {
                const fileExt = photoFile.name.split('.').pop();
                const fileName = `${params?.id}-${Math.random()}.${fileExt}`;
                const filePath = `contractors/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('contractors')
                    .upload(filePath, photoFile, { upsert: true });

                if (uploadError) {
                    console.error('Upload error:', uploadError);
                } else {
                    const { data: urlData } = supabase.storage
                        .from('contractors')
                        .getPublicUrl(filePath);
                    photoUrl = urlData.publicUrl;
                }
            }

            const contractorData = {
                contractor_number: form.contractor_number.trim() || null,
                name: form.name.trim(),
                phone: form.phone.trim(),
                email: form.email.trim() || null,
                balance: parseFloat(form.balance) || 0,
                status: form.status,
                notes: form.notes.trim() || null,
                photo_url: photoUrl || null,
                updated_at: new Date().toISOString(),
            };

            const { error } = await supabase
                .from('contractors')
                // @ts-ignore
                .update(contractorData)
                .eq('id', params?.id);

            if (error) throw error;

            setAlert({ visible: true, message: 'Contractor updated successfully', type: 'success' });

            setTimeout(() => {
                router.push('/contractors');
            }, 1500);
        } catch (error) {
            console.error(error);
            setAlert({
                visible: true,
                message: error instanceof Error ? error.message : 'Error updating contractor',
                type: 'danger',
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!contractor) {
        return (
            <div className="panel">
                <div className="text-center py-10">
                    <h3 className="text-lg font-semibold text-danger">Contractor not found</h3>
                    <Link href="/contractors" className="btn btn-primary mt-4">
                        Back to Contractors
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div>
            {alert.visible && (
                <div className="mb-6">
                    <Alert
                        type={alert.type}
                        title={alert.type === 'success' ? 'Success' : 'Error'}
                        message={alert.message}
                        onClose={() => setAlert({ visible: false, message: '', type: 'success' })}
                    />
                </div>
            )}

            {/* Header */}
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
                            <Link href="/contractors" className="text-primary hover:underline">
                                Contractors
                            </Link>
                        </li>
                        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                            <span>Edit Contractor</span>
                        </li>
                    </ul>
                </div>

                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Edit Contractor</h1>
                    <p className="text-gray-500">Update contractor information</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="container mx-auto p-6">
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
                                    <IconPhone className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                                    Contact Information
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
                                    <IconCamera className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                                    Contractor Photo
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
                                        {/* Contractor Number */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                                Contractor Number
                                            </label>
                                            <input
                                                type="text"
                                                name="contractor_number"
                                                value={form.contractor_number}
                                                onChange={handleInputChange}
                                                className="form-input"
                                                placeholder="Enter contractor number"
                                            />
                                        </div>

                                        {/* Name */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                                Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="name"
                                                value={form.name}
                                                onChange={handleInputChange}
                                                className="form-input"
                                                placeholder="Enter name"
                                                required
                                            />
                                        </div>

                                        {/* Balance */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                                Balance
                                            </label>
                                            <input
                                                type="number"
                                                name="balance"
                                                value={form.balance}
                                                onChange={handleInputChange}
                                                className="form-input"
                                                placeholder="Enter balance"
                                                step="0.01"
                                            />
                                        </div>

                                        {/* Status */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                                Status <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                name="status"
                                                value={form.status}
                                                onChange={handleInputChange}
                                                className="form-select"
                                                required
                                            >
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                            Notes
                                        </label>
                                        <textarea
                                            name="notes"
                                            value={form.notes}
                                            onChange={handleInputChange}
                                            className="form-textarea"
                                            rows={4}
                                            placeholder="Enter additional notes"
                                        />
                                    </div>

                                    {/* Submit Buttons */}
                                    <div className="flex justify-end gap-4 mt-8">
                                        <button type="button" onClick={() => router.back()} className="btn btn-outline-danger">
                                            Cancel
                                        </button>
                                        <button type="submit" className="btn btn-primary" disabled={saving}>
                                            {saving ? 'Updating...' : 'Update Contractor'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </Tab.Panel>

                        {/* Contact Information Tab */}
                        <Tab.Panel>
                            <div className="panel">
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {/* Phone */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                                Phone <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={form.phone}
                                                onChange={handleInputChange}
                                                className="form-input"
                                                placeholder="Enter phone number"
                                                required
                                            />
                                        </div>

                                        {/* Email */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                                Email
                                            </label>
                                            <input
                                                type="email"
                                                name="email"
                                                value={form.email}
                                                onChange={handleInputChange}
                                                className="form-input"
                                                placeholder="Enter email address"
                                            />
                                        </div>
                                    </div>

                                    {/* Submit Buttons */}
                                    <div className="flex justify-end gap-4 mt-8">
                                        <button type="button" onClick={() => router.back()} className="btn btn-outline-danger">
                                            Cancel
                                        </button>
                                        <button type="submit" className="btn btn-primary" disabled={saving}>
                                            {saving ? 'Updating...' : 'Update Contractor'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </Tab.Panel>

                        {/* Contractor Photo Tab */}
                        <Tab.Panel>
                            <div className="panel">
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div className="flex flex-col items-center">
                                        <div className="mb-5">
                                            <div className="w-40 h-40 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                                                {photoPreview ? (
                                                    <img src={photoPreview} alt={contractor.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <IconUser className="w-20 h-20 text-gray-400" />
                                                )}
                                            </div>
                                        </div>
                                        
                                        <input
                                            type="file"
                                            id="photo-upload"
                                            accept="image/*"
                                            onChange={handlePhotoChange}
                                            className="hidden"
                                        />
                                        
                                        <label htmlFor="photo-upload" className="btn btn-primary gap-2 cursor-pointer">
                                            <IconCamera />
                                            Upload Photo
                                        </label>
                                        
                                        <p className="text-xs text-gray-500 mt-2">JPG, PNG or GIF (MAX. 800x400px)</p>
                                    </div>

                                    {/* Submit Buttons */}
                                    <div className="flex justify-end gap-4 mt-8">
                                        <button type="button" onClick={() => router.back()} className="btn btn-outline-danger">
                                            Cancel
                                        </button>
                                        <button type="submit" className="btn btn-primary" disabled={saving}>
                                            {saving ? 'Updating...' : 'Update Contractor'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </Tab.Panel>
                    </Tab.Panels>
                </Tab.Group>
            </div>
        </div>
    );
};

export default EditContractor;
