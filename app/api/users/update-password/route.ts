import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, password } = body;

        if (!userId || !password) {
            return NextResponse.json(
                { message: 'User ID and password are required' },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { message: 'Password must be at least 6 characters' },
                { status: 400 }
            );
        }

        // Update user password using Admin API
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: password,
        });

        if (error) {
            console.error('Password update error:', error);
            return NextResponse.json(
                { message: error.message || 'Failed to update password' },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { message: 'Password updated successfully' },
            { status: 200 }
        );
    } catch (error: any) {
        console.error('Error updating password:', error);
        return NextResponse.json(
            { message: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
