import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import { DEFAULT_PERMISSIONS, ROLE_HIERARCHY_LEVELS } from '@/lib/auth-constants';

const JWT_SECRET = "210eb87e922b9199cdfd62d166e553c025fbc57509a61e3a257384973fbf8286";

export const dynamic = 'force-dynamic';

async function verifyTokenFromRequest(request: NextRequest) {
  try {
    // Try cookie first
    const token = request.cookies.get('authToken')?.value;
    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    if (!decoded?.userId) return null;

    const { db } = await connectToDatabase();
    const userDoc = await db.collection('users').findOne({ _id: new ObjectId(decoded.userId) });
    if (!userDoc) return null;

    return userDoc;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const userDoc = await verifyTokenFromRequest(request);

    if (!userDoc) {
      return NextResponse.json({ error: 'Unauthorized: valid session required.' }, { status: 401 });
    }

    // Resolve role
    const isCommander = userDoc.email === 'rbaskeydomi2018@gmail.com';
    const resolvedRole = isCommander ? 'Commander' : (userDoc.role || 'User');
    const resolvedLevel = isCommander ? 100 : (userDoc.hierarchyLevel ?? (userDoc.role === 'admin' ? 80 : 0));

    // Only Commander and Admin (level >= 80) can list users
    if (!isCommander && resolvedLevel < 80) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to list users.' }, { status: 403 });
    }

    const { db } = await connectToDatabase();
    const usersFromDb = await db.collection('users')
      .find({}, { projection: { password: 0 } })
      .sort({ createdAt: -1 })
      .toArray();

    const usersForAdmin = usersFromDb.map((doc: any) => {
      const isCommanderEmail = doc.email === 'rbaskeydomi2018@gmail.com';
      const userResolvedRole = isCommanderEmail ? 'Commander' : (doc.role || 'User');
      const userResolvedLevel = isCommanderEmail ? 100 : (doc.hierarchyLevel ?? (doc.role === 'admin' ? 80 : 0));

      const defaultRolePerms = DEFAULT_PERMISSIONS[userResolvedRole] || DEFAULT_PERMISSIONS['User'];
      const userResolvedPermissions = isCommanderEmail
        ? DEFAULT_PERMISSIONS['Commander']
        : { ...defaultRolePerms, ...(doc.permissions || {}) };

      return {
        id: doc._id.toString(),
        name: doc.name || 'N/A',
        email: doc.email || 'N/A',
        avatarUrl: doc.avatarUrl || null,
        role: userResolvedRole,
        createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date(0).toISOString(),
        dataAiHint: doc.dataAiHint || null,
        customRole: doc.customRole || (userResolvedRole === 'User' ? 'Uploader' : userResolvedRole),
        lastIp: doc.lastIp || null,
        hierarchyLevel: userResolvedLevel,
        permissions: userResolvedPermissions,
        roleAssignedBy: doc.roleAssignedBy || null,
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
      };
    });

    return NextResponse.json({ users: usersForAdmin }, { status: 200 });

  } catch (error: any) {
    console.error('API /admin/users GET error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error.' }, { status: 500 });
  }
}
