'use server';

import { z } from 'zod';
import bcryptjs from 'bcryptjs';
import * as jose from 'jose';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { supabaseAdmin, mapUserFromDb } from '@/lib/supabase';

const JWT_SECRET = "210eb87e922b9199cdfd62d166e553c025fbc57509a61e3a257384973fbf8286";
const JWT_SECRET_BYTES = new TextEncoder().encode(JWT_SECRET);


// Schemas for Registration
const UserRegisterInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});
export type UserRegisterInput = z.infer<typeof UserRegisterInputSchema>;

const UserRegisterOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  userId: z.string().optional(),
});
export type UserRegisterOutput = z.infer<typeof UserRegisterOutputSchema>;

// Schemas for Login
const UserLoginInputSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});
export type UserLoginInput = z.infer<typeof UserLoginInputSchema>;

const UserLoginOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  userId: z.string().optional(),
  name: z.string().optional(),
  email: z.string().optional(),
  role: z.enum(['user', 'admin']).optional(),
  token: z.string().optional(),
  avatarUrl: z.string().url().optional().nullable(),
});
export type UserLoginOutput = z.infer<typeof UserLoginOutputSchema>;

export async function registerUser(input: UserRegisterInput): Promise<UserRegisterOutput> {
  try {
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('email', input.email)
      .maybeSingle();

    if (existingUser) {
      return { success: false, message: 'User already exists with this email.' };
    }

    const hashedPassword = await bcryptjs.hash(input.password, 10);
    const userId = crypto.randomBytes(12).toString('hex');

    const { error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        name: input.name,
        email: input.email,
        password: hashedPassword,
        role: 'User',
        hierarchy_level: 0,
        permissions: {},
        watchlist: [],
        reviews: [],
        rating_history: [],
        role_assigned_by: null,
        avatar_url: `https://placehold.co/150x150.png?text=${input.name.charAt(0)}`,
        data_ai_hint: 'placeholder avatar',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_seen: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Registration database error:', insertError);
      return { success: false, message: 'Failed to register user due to a database error.' };
    }

    return { success: true, message: 'User registered successfully!', userId };

  } catch (error: any) {
    console.error('Registration error:', error);
    return { success: false, message: error.message || 'An unexpected error occurred during registration.' };
  }
}

export async function loginUser(input: UserLoginInput): Promise<UserLoginOutput> {
  try {
    const { data: rawUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', input.email)
      .maybeSingle();

    if (fetchError || !rawUser) {
      return { success: false, message: 'User not found with this email.' };
    }

    const user = mapUserFromDb(rawUser);
    if (!user) {
      return { success: false, message: 'User account is not properly configured.' };
    }

    if (typeof user.password !== 'string') {
      return { success: false, message: 'User account is not properly configured (missing password hash).' };
    }

    const isPasswordMatch = await bcryptjs.compare(input.password, user.password);
    if (!isPasswordMatch) {
      return { success: false, message: 'Invalid password.' };
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'user' | 'admin',
    };
    const token = await new jose.SignJWT(tokenPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(JWT_SECRET_BYTES);

    // Set cookies for server-side auth checking & Next.js middleware routing
    const cookieStore = await cookies();
    cookieStore.set('authToken', token, {
      httpOnly: false, // Make it readable by client check
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60, // 1 hour
      path: '/',
    });

    const isUserAdmin = user.email === 'rbaskeydomi2018@gmail.com' || ['admin', 'Commander', 'Admin', 'Content Manager', 'Contributor'].includes(user.role);
    const legacyRole = isUserAdmin ? 'admin' : 'user';
    cookieStore.set('userRole', legacyRole, { path: '/' });

    return {
      success: true,
      message: 'Login successful!',
      userId: user.id,
      name: user.name,
      email: user.email,
      role: legacyRole as 'user' | 'admin',
      token: token,
      avatarUrl: user.avatarUrl,
    };

  } catch (error: any) {
    console.error('Login error:', error);
    return { success: false, message: error.message || 'An unexpected error occurred during login.' };
  }
}
