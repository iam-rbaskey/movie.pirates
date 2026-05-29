'use server';

import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongodb';
import bcryptjs from 'bcryptjs';
import * as jose from 'jose';
import { type UserProfile } from '@/types';
import { cookies } from 'next/headers';

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
    const { db } = await connectToDatabase();
    const usersCollection = db.collection<Omit<UserProfile, 'id' | '_id'>>('users');

    const existingUser = await usersCollection.findOne({ email: input.email });
    if (existingUser) {
      return { success: false, message: 'User already exists with this email.' };
    }

    const hashedPassword = await bcryptjs.hash(input.password, 10);

    const newUser = {
      name: input.name,
      email: input.email,
      password: hashedPassword as string,
      createdAt: new Date(),
      updatedAt: new Date(),
      watchlist: [],
      reviews: [],
      ratingHistory: [],
      role: 'User',
      hierarchyLevel: 0,
      permissions: {},
      roleAssignedBy: null,
      avatarUrl: `https://placehold.co/150x150.png?text=${input.name.charAt(0)}`,
      dataAiHint: 'placeholder avatar',
    };

    const result = await usersCollection.insertOne(newUser as any);

    if (result.insertedId) {
      return { success: true, message: 'User registered successfully!', userId: result.insertedId.toString() };
    }
    return { success: false, message: 'Failed to register user due to a database error.' };

  } catch (error: any) {
    console.error('Registration error:', error);
    return { success: false, message: error.message || 'An unexpected error occurred during registration.' };
  }
}

export async function loginUser(input: UserLoginInput): Promise<UserLoginOutput> {
  try {
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ email: input.email });
    if (!user) {
      return { success: false, message: 'User not found with this email.' };
    }

    if (typeof user.password !== 'string') {
      return { success: false, message: 'User account is not properly configured (missing password hash).' };
    }

    const isPasswordMatch = await bcryptjs.compare(input.password, user.password);
    if (!isPasswordMatch) {
      return { success: false, message: 'Invalid password.' };
    }

    const tokenPayload = {
      userId: user._id.toString(),
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
      userId: user._id.toString(),
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
