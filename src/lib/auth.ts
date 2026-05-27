import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const JWT_SECRET = "210eb87e922b9199cdfd62d166e553c025fbc57509a61e3a257384973fbf8286";

import { DEFAULT_PERMISSIONS, ROLE_HIERARCHY_LEVELS } from './auth-constants';

export interface AuthUser {
  userId: string;
  name: string;
  email: string;
  role: 'Commander' | 'Admin' | 'Content Manager' | 'Contributor' | 'User';
  hierarchyLevel: number;
  permissions: Record<string, boolean>;
}

export async function verifyAuth(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('authToken')?.value;
    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    if (!decoded || !decoded.userId) return null;

    const { db } = await connectToDatabase();
    const userDoc = await db.collection('users').findOne({ _id: new ObjectId(decoded.userId) });
    if (!userDoc) return null;

    // Enforce Commander dynamic logic for fixed email
    if (userDoc.email === 'rbaskeydomi2018@gmail.com') {
      return {
        userId: userDoc._id.toString(),
        name: userDoc.name,
        email: userDoc.email,
        role: 'Commander',
        hierarchyLevel: 100,
        permissions: DEFAULT_PERMISSIONS['Commander'],
      };
    }

    // Resolve user role & database back-compat
    let role: AuthUser['role'] = 'User';
    if (userDoc.role === 'Commander') role = 'Commander';
    else if (userDoc.role === 'Admin' || userDoc.role === 'admin') role = 'Admin';
    else if (userDoc.role === 'Content Manager') role = 'Content Manager';
    else if (userDoc.role === 'Contributor') role = 'Contributor';
    else if (userDoc.role === 'User') role = 'User';
    else {
      // Fallback for custom role or base database role mapping
      const customRole = userDoc.customRole;
      if (customRole === 'Super Admin' || customRole === 'Admin') role = 'Admin';
      else if (customRole === 'Content Manager') role = 'Content Manager';
      else if (customRole === 'Moderator') role = 'Contributor'; // map legacy Moderator to Contributor
      else if (customRole === 'Uploader') role = 'Contributor';
      else if (userDoc.role === 'admin') role = 'Admin';
    }

    const hierarchyLevel = ROLE_HIERARCHY_LEVELS[role] || 0;
    
    // Resolve user permissions
    const dbPermissions = userDoc.permissions || {};
    const defaultRolePerms = DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS['User'];
    
    // Merge database permissions with defaults for security fallbacks
    const permissions = { ...defaultRolePerms, ...dbPermissions };

    return {
      userId: userDoc._id.toString(),
      name: userDoc.name,
      email: userDoc.email,
      role,
      hierarchyLevel,
      permissions,
    };
  } catch (error) {
    console.error("Error verifying authentication:", error);
    return null;
  }
}

export async function requirePermission(permission: string): Promise<AuthUser> {
  const user = await verifyAuth();
  if (!user) {
    throw new Error("Unauthorized: Active session required.");
  }

  // Commander bypasses all checks
  if (user.role === 'Commander') {
    return user;
  }

  if (user.permissions[permission] === true) {
    return user;
  }

  throw new Error(`Forbidden: Access denied. Missing permission [${permission}].`);
}

export async function requireHierarchy(minLevel: number): Promise<AuthUser> {
  const user = await verifyAuth();
  if (!user) {
    throw new Error("Unauthorized: Active session required.");
  }

  if (user.role === 'Commander') {
    return user;
  }

  if (user.hierarchyLevel >= minLevel) {
    return user;
  }

  throw new Error(`Forbidden: Access denied. Required hierarchy level is ${minLevel}.`);
}
