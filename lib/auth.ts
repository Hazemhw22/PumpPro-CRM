import { supabase } from './supabase/client';

export async function signIn(email: string, password: string) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { data, error };
    } catch (error) {
        return { data: null, error };
    }
}

export async function signUp(email: string, password: string, metadata?: any) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: metadata,
            },
        });
        return { data, error };
    } catch (error) {
        return { data: null, error };
    }
}

export async function signOut() {
    try {
        const { error } = await supabase.auth.signOut();
        return { error };
    } catch (error) {
        return { error };
    }
}

export async function getCurrentUser() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        return { user, error };
    } catch (error) {
        return { user: null, error };
    }
}

export async function resetPassword(email: string) {
    try {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });
        return { data, error };
    } catch (error) {
        return { data: null, error };
    }
}

export async function updatePassword(newPassword: string) {
    try {
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword,
        });
        return { data, error };
    } catch (error) {
        return { data: null, error };
    }
}
