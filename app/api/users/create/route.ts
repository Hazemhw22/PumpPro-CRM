import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { Database } from '@/types/database.types';

export async function POST(request: NextRequest) {
    try {
        // Check if admin client is properly configured
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.error('SUPABASE_SERVICE_ROLE_KEY is not configured');
            return NextResponse.json(
                { message: 'Server configuration error: Missing service role key' },
                { status: 500 }
            );
        }

        const body = await request.json();
        const { email, password, full_name, role } = body;

        // Validate required fields
        if (!email || !password || !full_name) {
            return NextResponse.json(
                { message: 'Email, password, and full name are required' },
                { status: 400 }
            );
        }

        // Validate password length
        if (password.length < 6) {
            return NextResponse.json(
                { message: 'Password must be at least 6 characters' },
                { status: 400 }
            );
        }

        // Create user in Supabase Auth using Admin API
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm email
            user_metadata: {
                full_name,
                role: role || 'user',
            },
        });

        if (authError) {
            console.error('Auth error:', authError);
            return NextResponse.json(
                { message: authError.message || 'Failed to create user in authentication' },
                { status: 400 }
            );
        }

        if (!authData.user) {
            return NextResponse.json(
                { message: 'Failed to create user - no user data returned' },
                { status: 500 }
            );
        }

        // Check if profile already exists (might be created by trigger)
        const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();

        let profileData;
        let profileError;

        if (existingProfile) {
            // Profile already exists (created by trigger), just update it
            console.log('Profile already exists, updating it...');
            const updateResult = await supabaseAdmin
                .from('profiles')
                // @ts-ignore - Supabase client type inference issue
                .update({
                    email: email,
                    full_name: full_name,
                    role: role || 'user',
                })
                .eq('id', authData.user.id)
                .select()
                .single();
            
            profileData = updateResult.data;
            profileError = updateResult.error;
        } else {
            // Profile doesn't exist, create it
            console.log('Creating new profile...');
            const profileInsertData: Database['public']['Tables']['profiles']['Insert'] = {
                id: authData.user.id,
                email: email,
                full_name: full_name,
                role: role || 'user',
                avatar_url: null,
            };

            const insertResult = await supabaseAdmin
                .from('profiles')
                // @ts-ignore - Supabase client type inference issue
                .insert(profileInsertData)
                .select()
                .single();
            
            profileData = insertResult.data;
            profileError = insertResult.error;
        }

        if (profileError) {
            console.error('Profile creation error:', profileError);
            console.error('Profile error details:', {
                message: profileError.message,
                details: profileError.details,
                hint: profileError.hint,
                code: profileError.code,
            });
            
            // Rollback: Delete the auth user if profile creation fails
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            
            return NextResponse.json(
                { 
                    message: 'Failed to create user profile. User creation rolled back.',
                    error: profileError.message,
                    details: profileError.details,
                    hint: profileError.hint,
                },
                { status: 500 }
            );
        }

        return NextResponse.json(
            {
                message: 'User created successfully',
                user: {
                    id: authData.user.id,
                    email: authData.user.email,
                    full_name: (profileData as any)?.full_name,
                    role: (profileData as any)?.role,
                },
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Error creating user:', error);
        return NextResponse.json(
            { message: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
