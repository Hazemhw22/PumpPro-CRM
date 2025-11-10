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
import CustomerTypeSelect from '@/components/customer-type-select/customer-type-select';
import type { CustomerUpdate, Database } from '@/types/database.types';

interface Customer {
    id: string;
    created_at: string;
    customer_number?: number;
    type: 'private' | 'business';
    name?: string;
    business_name?: string;
    phone: string;
    email?: string;
    address?: string;
    tax_id?: string;
    notes?: string;
    photo_url?: string;
}

const EditCustomer = () => {
    const { t } = getTranslation();
    const params = useParams();
    const router = useRouter();
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string>('');

    const [form, setForm] = useState({
        type: 'private' as 'private' | 'business',
        name: '',
        business_name: '',
        phone: '',
        email: '',
        address: '',
        tax_id: '',
        notes: '',
    });

    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        const fetchCustomer = async () => {
            try {
                // @ts-ignore
                const { data, error } = await supabase
                    .from('customers')
                    .select('*')
                    .eq('id', params?.id)
                    .single();

                if (error) throw error;

                if (data) {
                    const customerData = data as any;
                    setCustomer(customerData as Customer);
                    setForm({
                        type: customerData.type || 'private',
                        name: customerData.name || '',
                        business_name: customerData.business_name || '',
                        phone: customerData.phone || '',
                        email: customerData.email || '',
                        address: customerData.address || '',
                        tax_id: customerData.tax_id || '',
                        notes: customerData.notes || '',
                    });
                    if (customerData.photo_url) {
                        setPhotoPreview(customerData.photo_url);
                    }
                }
            } catch (error) {
                console.error('Error fetching customer:', error);
                setAlert({ visible: true, message: 'Error loading customer data', type: 'danger' });
            } finally {
                setLoading(false);
            }
        };

        if (params?.id) {
            fetchCustomer();
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
        if (!form.phone.trim()) {
            setAlert({ visible: true, message: 'Phone is required', type: 'danger' });
            return false;
        }

        if (form.type === 'private' && !form.name.trim()) {
            setAlert({ visible: true, message: 'Name is required for private customers', type: 'danger' });
            return false;
        }

        if (form.type === 'business' && !form.business_name.trim()) {
            setAlert({ visible: true, message: 'Business name is required for business customers', type: 'danger' });
            return false;
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setSaving(true);
        try {
            let photoUrl = customer?.photo_url;

            // Upload photo if changed
            if (photoFile) {
                const fileExt = photoFile.name.split('.').pop();
                const fileName = `${params?.id}-${Math.random()}.${fileExt}`;
                const filePath = `customers/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('customer-photos')
                    .upload(filePath, photoFile, { upsert: true });

                if (uploadError) {
                    console.error('Upload error:', uploadError);
                } else {
                    const { data: urlData } = supabase.storage
                        .from('customer-photos')
                        .getPublicUrl(filePath);
                    photoUrl = urlData.publicUrl;
                }
            }

            const customerData: CustomerUpdate = {
                type: form.type,
                phone: form.phone.trim(),
                email: form.email.trim() || null,
                address: form.address.trim() || null,
                tax_id: form.tax_id.trim() || null,
                notes: form.notes.trim() || null,
                photo_url: photoUrl || null,
            };

            if (form.type === 'private') {
                customerData.name = form.name.trim();
                customerData.business_name = null;
            } else {
                customerData.business_name = form.business_name.trim();
                customerData.name = null;
            }

            const { error } = await (supabase
                .from('customers')
                .update as any)(customerData)
                .eq('id', params?.id);

            if (error) throw error;

            setAlert({ visible: true, message: 'Customer updated successfully', type: 'success' });

            setTimeout(() => {
                router.push('/customers');
            }, 1500);
        } catch (error) {
            console.error(error);
            setAlert({
                visible: true,
                message: error instanceof Error ? error.message : 'Error updating customer',
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

    if (!customer) {
        return (
            <div className="panel">
                <div className="text-center py-10">
                    <h3 className="text-lg font-semibold text-danger">Customer not found</h3>
                    <Link href="/customers" className="btn btn-primary mt-4">
                        Back to Customers
                    </Link>
                </div>
            </div>
        );
    }

    const displayName = customer.type === 'private' ? customer.name : customer.business_name;

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
                            <Link href="/customers" className="text-primary hover:underline">
                                Customers
                            </Link>
                        </li>
                        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                            <span>Edit Customer</span>
                        </li>
                    </ul>
                </div>

                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Edit Customer</h1>
                    <p className="text-gray-500">Update customer information</p>
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
                                    Customer Photo
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
                                        {/* Customer Type */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                                Customer Type <span className="text-red-500">*</span>
                                            </label>
                                            <CustomerTypeSelect
                                                value={form.type}
                                                onChange={(value) => setForm(prev => ({ ...prev, type: value }))}
                                                className="form-select"
                                                required
                                            />
                                        </div>

                                        {/* Name or Business Name */}
                                        {form.type === 'private' ? (
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
                                        ) : (
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                                    Business Name <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    name="business_name"
                                                    value={form.business_name}
                                                    onChange={handleInputChange}
                                                    className="form-input"
                                                    placeholder="Enter business name"
                                                    required
                                                />
                                            </div>
                                        )}

                                        {/* Tax ID for business */}
                                        {form.type === 'business' && (
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                                    Tax ID
                                                </label>
                                                <input
                                                    type="text"
                                                    name="tax_id"
                                                    value={form.tax_id}
                                                    onChange={handleInputChange}
                                                    className="form-input"
                                                    placeholder="Enter tax ID"
                                                />
                                            </div>
                                        )}
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
                                            {saving ? 'Updating...' : 'Update Customer'}
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

                                    {/* Address */}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                            Address
                                        </label>
                                        <textarea
                                            name="address"
                                            value={form.address}
                                            onChange={handleInputChange}
                                            className="form-textarea"
                                            rows={3}
                                            placeholder="Enter address"
                                        />
                                    </div>

                                    {/* Submit Buttons */}
                                    <div className="flex justify-end gap-4 mt-8">
                                        <button type="button" onClick={() => router.back()} className="btn btn-outline-danger">
                                            Cancel
                                        </button>
                                        <button type="submit" className="btn btn-primary" disabled={saving}>
                                            {saving ? 'Updating...' : 'Update Customer'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </Tab.Panel>

                        {/* Customer Photo Tab */}
                        <Tab.Panel>
                            <div className="panel">
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div className="flex flex-col items-center">
                                        <div className="mb-5">
                                            <div className="w-40 h-40 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                                                {photoPreview ? (
                                                    <img src={photoPreview} alt={displayName} className="w-full h-full object-cover" />
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
                                            {saving ? 'Updating...' : 'Update Customer'}
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

export default EditCustomer;
