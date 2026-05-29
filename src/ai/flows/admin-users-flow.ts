'use server';

import { z } from 'zod';
import { verifyAuth } from '@/lib/auth';
import { ROLE_HIERARCHY_LEVELS, DEFAULT_PERMISSIONS } from '@/lib/auth-constants';
import { logAuditEvent } from './audit-log-flow';
import { supabaseAdmin, mapUserFromDb } from '@/lib/supabase';

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

    const { data: usersFromDb, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const usersForAdmin = (usersFromDb || []).map(raw => {
      const doc = mapUserFromDb(raw)!;
      const isCommanderEmail = doc.email === 'rbaskeydomi2018@gmail.com';
      const resolvedRole = isCommanderEmail ? 'Commander' : (doc.role || 'User');
      const resolvedLevel = isCommanderEmail ? 100 : (doc.hierarchyLevel ?? (doc.role === 'admin' ? 80 : 0));
      
      const defaultRolePerms = DEFAULT_PERMISSIONS[resolvedRole] || DEFAULT_PERMISSIONS['User'];
      const resolvedPermissions = isCommanderEmail ? DEFAULT_PERMISSIONS['Commander'] : { ...defaultRolePerms, ...(doc.permissions || {}) };

      return {
        id: doc.id,
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

    if (!userId) {
      return { success: false, message: 'Invalid User ID format.' };
    }

    const { data: rawTargetUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (fetchError || !rawTargetUser) {
      return { success: false, message: 'Target user not found.' };
    }
    const targetUser = mapUserFromDb(rawTargetUser)!;

    // Enforce Commander protections
    if (targetUser.email === 'rbaskeydomi2018@gmail.com') {
      return { success: false, message: 'Access Denied: Commander hierarchy is fixed and protected.' };
    }

    const targetHierarchy = targetUser.hierarchyLevel ?? ((targetUser.role as string) === 'admin' || targetUser.role === 'Admin' ? 80 : 0);
    if (caller.role !== 'Commander' && caller.hierarchyLevel <= targetHierarchy) {
      return { success: false, message: 'Access Denied: Cannot modify a user with equal or higher hierarchy level.' };
    }

    const updatePayload: any = {};
    if (updateData.name) updatePayload.name = updateData.name;
    if (updateData.email) updatePayload.email = updateData.email;
    if (updateData.avatarUrl !== undefined) updatePayload.avatar_url = updateData.avatarUrl ?? null;
    if (updateData.customRole !== undefined) updatePayload.custom_role = updateData.customRole;

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
      updatePayload.hierarchy_level = nextLevel;
      updatePayload.custom_role = nextRole;
      updatePayload.permissions = DEFAULT_PERMISSIONS[nextRole] || {};
      updatePayload.role_assigned_by = caller.name;
    }

    if (updateData.permissions) {
      const currentPermissions = targetUser.permissions || {};
      const newPermissions = { ...currentPermissions, ...updateData.permissions };
      updatePayload.permissions = newPermissions;
    }

    updatePayload.updated_at = new Date().toISOString();

    const { data: rawUpdatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update(updatePayload)
      .eq('id', userId)
      .select()
      .maybeSingle();

    if (updateError || !rawUpdatedUser) {
      return { success: false, message: updateError?.message || 'User not found or failed to update.' };
    }
    const doc = mapUserFromDb(rawUpdatedUser)!;

    const updatedUser: UserForAdminOutput = {
      id: doc.id,
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

    if (!userId) {
      return { success: false, message: 'Invalid User ID format.' };
    }

    const { data: rawTargetUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (fetchError || !rawTargetUser) {
      return { success: false, message: 'Target user not found.' };
    }
    const targetUser = mapUserFromDb(rawTargetUser)!;

    // Enforce Commander protections
    if (targetUser.email === 'rbaskeydomi2018@gmail.com') {
      return { success: false, message: 'Access Denied: Commander cannot be deleted.' };
    }

    const targetHierarchy = targetUser.hierarchyLevel ?? (targetUser.role === 'admin' ? 80 : 0);
    if (caller.role !== 'Commander' && caller.hierarchyLevel <= targetHierarchy) {
      return { success: false, message: 'Access Denied: Cannot delete a user with equal or higher hierarchy level.' };
    }

    const { error: deleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleteError) {
      return { success: false, message: deleteError.message };
    }

    await logAuditEvent({
      action: 'delete_users',
      details: `Deleted user ${targetUser.name} (${targetUser.email}) from database.`,
      category: 'security',
      severity: 'warning'
    });
    return { success: true, message: 'User deleted successfully.' };

  } catch (error: any) {
    console.error('Error deleting user by admin:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}
