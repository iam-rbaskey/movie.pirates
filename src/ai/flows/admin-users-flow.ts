'use server';

import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongodb';
import { type UserProfile as DBUserProfileType } from '@/types';
import { ObjectId } from 'mongodb';
import { verifyAuth } from '@/lib/auth';
import { ROLE_HIERARCHY_LEVELS, DEFAULT_PERMISSIONS } from '@/lib/auth-constants';
import { logAuditEvent } from './audit-log-flow';

// Schema for user data returned to admin panel (subset of UserProfile)
const UserForAdminOutputSchema = z.object({
  id: z.string().describe("User's unique identifier."),
  name: z.string().describe("User's full name."),
  email: z.string().email().describe("User's email address."),
  avatarUrl: z.string().url().optional().nullable().describe("URL of the user's avatar image."),
  role: z.string().describe("User's role in the system."),
  createdAt: z.string().datetime().describe("Date and time when the user registered (ISO 8601 format)."),
  dataAiHint: z.string().optional().nullable().describe("AI hint for the avatar image placeholder."),
  customRole: z.string().optional().nullable().describe("User's extended enterprise role."),
  lastIp: z.string().optional().nullable().describe("Last logged IP address of the user."),
  hierarchyLevel: z.number().default(0),
  permissions: z.record(z.boolean()).default({}),
  roleAssignedBy: z.string().optional().nullable(),
  updatedAt: z.string().datetime().optional().nullable(),
});
export type UserForAdminOutput = z.infer<typeof UserForAdminOutputSchema>;

const GetUsersOutputSchema = z.array(UserForAdminOutputSchema);
export type GetUsersOutput = z.infer<typeof GetUsersOutputSchema>;

// --- Schemas for Update ---
const UpdateUserByAdminInputSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  name: z.string().min(1, "Name is required").optional(),
  email: z.string().email("Invalid email address").optional(),
  role: z.string().optional(),
  avatarUrl: z.string().url("Invalid URL for avatar").optional().nullable(),
  customRole: z.string().optional().nullable(),
  hierarchyLevel: z.number().optional(),
  permissions: z.record(z.boolean()).optional(),
});
export type UpdateUserByAdminInput = z.infer<typeof UpdateUserByAdminInputSchema>;

const UpdateUserByAdminOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  user: UserForAdminOutputSchema.optional().nullable(),
});
export type UpdateUserByAdminOutput = z.infer<typeof UpdateUserByAdminOutputSchema>;

// --- Schemas for Delete ---
const DeleteUserByAdminInputSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});
export type DeleteUserByAdminInput = z.infer<typeof DeleteUserByAdminInputSchema>;

const DeleteUserByAdminOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type DeleteUserByAdminOutput = z.infer<typeof DeleteUserByAdminOutputSchema>;

export async function getUsers(): Promise<GetUsersOutput | { error: string }> {
  try {
    const caller = await verifyAuth();
    const isUserAdmin = caller?.role === 'Commander' || ['admin', 'Commander', 'Admin', 'Content Manager', 'Contributor'].includes(caller?.role || '');
    if (!caller || !isUserAdmin) {
      console.warn("Unauthorized user listing attempt by:", caller?.email);
      return [];
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection<Omit<DBUserProfileType, 'password'>>('users');

    const usersFromDb = await usersCollection
      .find({}, { projection: { password: 0 } })
      .sort({ createdAt: -1 })
      .toArray();

    const usersForAdmin = usersFromDb.map(userDoc => {
      const doc = userDoc as any;
      const isCommanderEmail = doc.email === 'rbaskeydomi2018@gmail.com';
      const resolvedRole = isCommanderEmail ? 'Commander' : (doc.role || 'User');
      const resolvedLevel = isCommanderEmail ? 100 : (doc.hierarchyLevel ?? (doc.role === 'admin' ? 80 : 0));
      
      const defaultRolePerms = DEFAULT_PERMISSIONS[resolvedRole] || DEFAULT_PERMISSIONS['User'];
      const resolvedPermissions = isCommanderEmail ? DEFAULT_PERMISSIONS['Commander'] : { ...defaultRolePerms, ...(doc.permissions || {}) };

      return {
        id: doc._id.toString(),
        name: doc.name || 'N/A',
        email: doc.email || 'N/A',
        avatarUrl: doc.avatarUrl || null,
        role: resolvedRole,
        createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date(0).toISOString(),
        dataAiHint: doc.dataAiHint || null,
        customRole: doc.customRole || (resolvedRole === 'User' ? 'Uploader' : resolvedRole),
        lastIp: doc.lastIp || null,
        hierarchyLevel: resolvedLevel,
        permissions: resolvedPermissions,
        roleAssignedBy: doc.roleAssignedBy || null,
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
      };
    });

    return usersForAdmin;
  } catch (error: any) {
    console.error("Error fetching users for admin panel:", error);
    return { error: error.message || String(error) };
  }
}

export async function updateUserByAdmin(input: UpdateUserByAdminInput): Promise<UpdateUserByAdminOutput> {
  const { userId, ...updateData } = input;
  try {
    const caller = await verifyAuth();
    const isUserAdmin = caller?.role === 'Commander' || ['admin', 'Commander', 'Admin', 'Content Manager', 'Contributor'].includes(caller?.role || '');
    if (!caller || !isUserAdmin) {
      return { success: false, message: 'Unauthorized: Administrator privileges required.' };
    }

    if (!ObjectId.isValid(userId)) {
      return { success: false, message: 'Invalid User ID format.' };
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection<DBUserProfileType>('users');

    const targetUser = await usersCollection.findOne({ _id: new ObjectId(userId) as any });
    if (!targetUser) {
      return { success: false, message: 'Target user not found.' };
    }

    // Enforce Commander protections
    if (targetUser.email === 'rbaskeydomi2018@gmail.com') {
      return { success: false, message: 'Access Denied: Commander hierarchy is fixed and protected.' };
    }

    const targetHierarchy = (targetUser as any).hierarchyLevel ?? ((targetUser.role as string) === 'admin' || targetUser.role === 'Admin' ? 80 : 0);
    if (caller.role !== 'Commander' && caller.hierarchyLevel <= targetHierarchy) {
      return { success: false, message: 'Access Denied: Cannot modify a user with equal or higher hierarchy level.' };
    }

    const updatePayload: any = {};
    if (updateData.name) updatePayload.name = updateData.name;
    if (updateData.email) updatePayload.email = updateData.email;
    if (updateData.avatarUrl !== undefined) updatePayload.avatarUrl = updateData.avatarUrl ?? undefined;
    if (updateData.customRole !== undefined) updatePayload.customRole = updateData.customRole;

    // Role & Hierarchy checks
    if (updateData.role) {
      const nextRole = updateData.role;
      const nextLevel = ROLE_HIERARCHY_LEVELS[nextRole] ?? 0;

      // Restrictions on non-commanders
      if (caller.role !== 'Commander') {
        if (nextRole === 'Commander' || nextLevel > caller.hierarchyLevel) {
          return { success: false, message: 'Access Denied: Cannot elevate roles above Admin.' };
        }
      }

      updatePayload.role = nextRole;
      updatePayload.hierarchyLevel = nextLevel;
      updatePayload.customRole = nextRole;
      updatePayload.permissions = DEFAULT_PERMISSIONS[nextRole] || {};
      updatePayload.roleAssignedBy = caller.name;
    }

    if (updateData.permissions) {
      const currentPermissions = (targetUser as any).permissions || {};
      const newPermissions = { ...currentPermissions, ...updateData.permissions };
      updatePayload.permissions = newPermissions;
    }

    updatePayload.updatedAt = new Date();

    const result = await usersCollection.findOneAndUpdate(
      { _id: new ObjectId(userId) as any },
      { $set: updatePayload as any },
      { returnDocument: 'after', projection: { password: 0 } }
    );

    if (result) {
      const doc = result as any;
      const updatedUser: UserForAdminOutput = {
        id: doc._id.toString(),
        name: doc.name || 'N/A',
        email: doc.email || 'N/A',
        avatarUrl: doc.avatarUrl || null,
        role: doc.role || 'User',
        createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date(0).toISOString(),
        dataAiHint: doc.dataAiHint || null,
        customRole: doc.customRole || doc.role,
        lastIp: doc.lastIp || null,
        hierarchyLevel: doc.hierarchyLevel ?? 0,
        permissions: doc.permissions || {},
        roleAssignedBy: doc.roleAssignedBy || null,
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
      };

      // Log in Audit Trail
      await logAuditEvent({
        action: 'role assignment',
        details: `Updated role/permissions of user ${doc.name} (${doc.email}) to role: ${doc.role}.`,
        category: 'security',
        severity: doc.role === 'Admin' ? 'warning' : 'info'
      });

      return { success: true, message: 'User updated successfully.', user: updatedUser };
    }
    return { success: false, message: 'User not found or failed to update.' };

  } catch (error: any) {
    console.error('Error updating user by admin:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

export async function deleteUserByAdmin(input: DeleteUserByAdminInput): Promise<DeleteUserByAdminOutput> {
  const { userId } = input;
  try {
    const caller = await verifyAuth();
    const isUserAdmin = caller?.role === 'Commander' || ['admin', 'Commander', 'Admin', 'Content Manager', 'Contributor'].includes(caller?.role || '');
    if (!caller || !isUserAdmin) {
      return { success: false, message: 'Unauthorized: Administrator privileges required.' };
    }

    if (!ObjectId.isValid(userId)) {
      return { success: false, message: 'Invalid User ID format.' };
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    const targetUser = await usersCollection.findOne({ _id: new ObjectId(userId) });
    if (!targetUser) {
      return { success: false, message: 'Target user not found.' };
    }

    // Enforce Commander protections
    if (targetUser.email === 'rbaskeydomi2018@gmail.com') {
      return { success: false, message: 'Access Denied: Commander cannot be deleted.' };
    }

    const targetHierarchy = (targetUser as any).hierarchyLevel ?? (targetUser.role === 'admin' ? 80 : 0);
    if (caller.role !== 'Commander' && caller.hierarchyLevel <= targetHierarchy) {
      return { success: false, message: 'Access Denied: Cannot delete a user with equal or higher hierarchy level.' };
    }

    const result = await usersCollection.deleteOne({ _id: new ObjectId(userId) as any });

    if (result.deletedCount === 1) {
      await logAuditEvent({
        action: 'delete_users',
        details: `Deleted user ${targetUser.name} (${targetUser.email}) from database.`,
        category: 'security',
        severity: 'warning'
      });
      return { success: true, message: 'User deleted successfully.' };
    }
    return { success: false, message: 'User not found or already deleted.' };

  } catch (error: any) {
    console.error('Error deleting user by admin:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}
