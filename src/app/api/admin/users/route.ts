import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import * as jose from 'jose';
import { DEFAULT_PERMISSIONS } from '@/lib/auth-constants';

const JWT_SECRET_BYTES = new TextEncoder().encode(
  "210eb87e922b9199cdfd62d166e553c025fbc57509a61e3a257384973fbf8286"
);

export const dynamic = 'force-dynamic';

async function verifyTokenFromRequest(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) return null;

    // Use jose (ESM-compatible) instead of jsonwebtoken to avoid CJS/ESM conflicts
    const { payload } = await jose.jwtVerify(token, JWT_SECRET_BYTES);
    const userId = payload.userId as string;
    if (!userId) return null;

    const { db } = await connectToDatabase();
    const userDoc = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    return userDoc;
  } catch (err) {
    console.error('[API /admin/users] token verification error:', err);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const userDoc = await verifyTokenFromRequest(request);

    if (!userDoc) {
      return NextResponse.json(
        { error: 'Unauthorized: valid session required. Please log in again.' },
        { status: 401 }
      );
    }

    // Resolve caller role
    const isCommander = userDoc.email === 'rbaskeydomi2018@gmail.com';
    const resolvedRole = isCommander ? 'Commander' : (userDoc.role || 'User');
    const isUserAdmin = isCommander || ['admin', 'Commander', 'Admin', 'Content Manager', 'Contributor'].includes(resolvedRole);

    if (!isUserAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions to list users.' },
        { status: 403 }
      );
    }

    const { db } = await connectToDatabase();
    const usersFromDb = await db
      .collection('users')
      .find({}, { projection: { password: 0 } })
      .sort({ createdAt: -1 })
      .toArray();

    const usersForAdmin = usersFromDb.map((doc: any) => {
      const isCmd = doc.email === 'rbaskeydomi2018@gmail.com';
      const role = isCmd ? 'Commander' : (doc.role || 'User');
      const level = isCmd ? 100 : (doc.hierarchyLevel ?? (doc.role === 'admin' || doc.role === 'Admin' ? 80 : 0));
      const defaultPerms = DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS['User'];
      const permissions = isCmd
        ? DEFAULT_PERMISSIONS['Commander']
        : { ...defaultPerms, ...(doc.permissions || {}) };

      return {
        id: doc._id.toString(),
        name: doc.name || 'N/A',
        email: doc.email || 'N/A',
        avatarUrl: doc.avatarUrl || null,
        role,
        createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date(0).toISOString(),
        dataAiHint: doc.dataAiHint || null,
        customRole: doc.customRole || (role === 'User' ? 'Uploader' : role),
        lastIp: doc.lastIp || null,
        hierarchyLevel: level,
        permissions,
        roleAssignedBy: doc.roleAssignedBy || null,
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
      };
    });

    return NextResponse.json({ users: usersForAdmin }, { status: 200 });

  } catch (error: any) {
    console.error('[API /admin/users] unhandled error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error. Check Netlify function logs.' },
      { status: 500 }
    );
  }
}
