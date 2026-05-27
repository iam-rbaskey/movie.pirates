"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { getUsers, updateUserByAdmin, type UserForAdminOutput } from '@/ai/flows/admin-users-flow';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, Users, Check, X, RefreshCw, Key, ShieldCheck, Lock, Unlock, ShieldAlert } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DEFAULT_PERMISSIONS, ROLE_HIERARCHY_LEVELS } from '@/lib/auth-constants';

interface RoleDefinition {
  name: string;
  level: number;
  description: string;
  glowClass: string;
  borderClass: string;
  color: string;
  badgeClass: string;
}

const PERMISSION_CATEGORIES = {
  content: {
    title: "Content Management",
    permissions: ["create_content", "edit_content", "delete_content", "publish_content", "archive_content", "manage_categories", "manage_media"]
  },
  users: {
    title: "User Management",
    permissions: ["view_users", "ban_users", "delete_users", "assign_roles", "edit_permissions"]
  },
  analytics: {
    title: "Analytics Intelligence",
    permissions: ["view_analytics", "export_analytics", "view_logs"]
  },
  system: {
    title: "System Management",
    permissions: ["manage_settings", "manage_streaming", "manage_storage", "manage_mirrors", "manage_platform"]
  }
};

const PERMISSION_DETAILS: Record<string, { label: string; description: string }> = {
  // Content Management
  create_content: { label: "Create Content", description: "Add new movies or series drafts" },
  edit_content: { label: "Edit Content", description: "Modify title, description, and metadata" },
  delete_content: { label: "Delete Content", description: "Soft-delete content (move to trash)" },
  publish_content: { label: "Publish Content", description: "Publish drafts or restore deleted items" },
  archive_content: { label: "Archive Content", description: "Archive legacy titles from active feed" },
  manage_categories: { label: "Manage Categories", description: "Create and edit genres or tags" },
  manage_media: { label: "Manage Media", description: "Upload video files, trailers, and subtitles" },
  // User Management
  view_users: { label: "View Users", description: "Access administrator list and user profiles" },
  ban_users: { label: "Ban Users", description: "Temporarily suspend user accounts" },
  delete_users: { label: "Delete Users", description: "Permanently delete user accounts" },
  assign_roles: { label: "Assign Roles", description: "Change user roles and hierarchy levels" },
  edit_permissions: { label: "Edit Permissions", description: "Customize individual permission overrides" },
  // Analytics
  view_analytics: { label: "View Analytics", description: "Access real-time dashboards and traffic charts" },
  export_analytics: { label: "Export Analytics", description: "Download CSV/Excel reports of operations" },
  view_logs: { label: "View Logs", description: "Access platform audit logs and activities" },
  // System Management
  manage_settings: { label: "Manage Settings", description: "Edit site branding and global parameters" },
  manage_streaming: { label: "Manage Streaming", description: "Configure CDNs, quality rules, and player options" },
  manage_storage: { label: "Manage Storage", description: "Configure S3 bucket keys and storage providers" },
  manage_mirrors: { label: "Manage Mirrors", description: "Add and sync playback mirrors" },
  manage_platform: { label: "Manage Platform", description: "Control maintenance modes and system updates" }
};

export default function RolesPermissionsPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserForAdminOutput[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  
  // Current logged in user info (detected from loaded user list matching localStorage email)
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const roleDefinitions: RoleDefinition[] = [
    { name: "Commander", level: 100, description: "Supreme system authority. Fixed assignment. Bypasses all permission gates.", glowClass: "hover:shadow-[0_0_30px_rgba(255,90,95,0.25)]", borderClass: "hover:border-[#FF5A5F]/30", color: "text-[#FF5A5F]", badgeClass: "bg-[#FF5A5F]/20 text-[#FF5A5F] border-[#FF5A5F]/30" },
    { name: "Admin", level: 80, description: "Full operational access. Can configure settings and manage subordinates.", glowClass: "hover:shadow-[0_0_30px_rgba(0,209,178,0.2)]", borderClass: "hover:border-[#00D1B2]/30", color: "text-[#00D1B2]", badgeClass: "bg-[#00D1B2]/20 text-[#00D1B2] border-[#00D1B2]/30" },
    { name: "Content Manager", level: 50, description: "Can modify titles, update metadata, structure media catalog, and edit assets.", glowClass: "hover:shadow-[0_0_30px_rgba(245,158,11,0.2)]", borderClass: "hover:border-[#F59E0B]/30", color: "text-[#F59E0B]", badgeClass: "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/30" },
    { name: "Contributor", level: 30, description: "Can upload drafts, suggest edits, and view general workspace analytics.", glowClass: "hover:shadow-[0_0_30px_rgba(168,85,247,0.2)]", borderClass: "hover:border-[#A855F7]/30", color: "text-[#A855F7]", badgeClass: "bg-[#A855F7]/20 text-[#A855F7] border-[#A855F7]/30" },
    { name: "User", level: 0, description: "Regular end-user account. Standard subscriber stream access, no admin capacities.", glowClass: "hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]", borderClass: "hover:border-white/10", color: "text-white/60", badgeClass: "bg-white/5 text-white/60 border-white/10" }
  ];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUserEmail(localStorage.getItem('userEmail') || "");
    }
  }, []);

  const fetchUsersList = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await getUsers();
      setUsers(list);
      
      // Auto-select first user if none is selected
      if (list.length > 0 && !selectedUserId) {
        // Prefer selecting the first non-Commander user, or first user if none
        const defaultUser = list.find(u => u.role !== 'Commander') || list[0];
        setSelectedUserId(defaultUser.id);
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Sync Failed", description: e.message || "Failed to load user accounts." });
    } finally {
      setIsLoading(false);
    }
  }, [selectedUserId, toast]);

  useEffect(() => {
    fetchUsersList();
  }, [fetchUsersList]);

  // Find the selected user details
  const selectedUser = users.find(u => u.id === selectedUserId) || null;
  // Find the logged-in user details to evaluate hierarchy guards
  const activeOperator = users.find(u => u.email === currentUserEmail) || null;

  // Determine if the logged-in user can modify the target user
  const checkCanModify = (target: UserForAdminOutput | null): boolean => {
    if (!activeOperator || !target) return false;
    if (activeOperator.role === 'Commander') return true; // Commander has absolute override
    if (target.email === 'rbaskeydomi2018@gmail.com') return false; // Nobody can modify the Commander user
    
    // Admins can only modify users with strictly lower hierarchy level
    return activeOperator.hierarchyLevel > target.hierarchyLevel;
  };

  const handleRoleChange = async (userId: string, nextRole: string) => {
    setIsUpdating(userId);
    try {
      const target = users.find(u => u.id === userId);
      if (!target) return;

      if (!checkCanModify(target)) {
        toast({ variant: "destructive", title: "Hierarchy Guard Violation", description: "You cannot change the role of an operator with equal or higher hierarchy level." });
        return;
      }

      // Base role translation to legacy format
      const isLegacyAdmin = ['Commander', 'Admin', 'Content Manager', 'Contributor'].includes(nextRole);
      const baseRole = isLegacyAdmin ? 'admin' : 'user';

      const res = await updateUserByAdmin({
        userId,
        role: nextRole,
        customRole: nextRole
      });

      if (res.success && res.user) {
        toast({ title: "Role Changed", description: `Successfully promoted ${res.user.name} to ${nextRole}.` });
        
        // Update user state locally
        setUsers(prev => prev.map(u => u.id === userId ? {
          ...u,
          role: res.user!.role,
          customRole: res.user!.customRole,
          hierarchyLevel: res.user!.hierarchyLevel,
          permissions: res.user!.permissions,
          roleAssignedBy: res.user!.roleAssignedBy,
          updatedAt: res.user!.updatedAt
        } : u));
      } else {
        toast({ variant: "destructive", title: "Failed", description: res.message });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message || "Failed to update role." });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleTogglePermission = async (permissionKey: string, currentValue: boolean) => {
    if (!selectedUser) return;
    
    if (!checkCanModify(selectedUser)) {
      toast({ variant: "destructive", title: "Access Denied", description: "You are not authorized to override permissions for this user level." });
      return;
    }

    setIsUpdating(selectedUser.id);
    try {
      const nextPermissions = { [permissionKey]: !currentValue };
      const res = await updateUserByAdmin({
        userId: selectedUser.id,
        permissions: nextPermissions
      });

      if (res.success && res.user) {
        toast({ title: "Permission Updated", description: `Toggled "${PERMISSION_DETAILS[permissionKey]?.label || permissionKey}" override.` });
        setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, permissions: res.user!.permissions, updatedAt: res.user!.updatedAt } : u));
      } else {
        toast({ variant: "destructive", title: "Update Failed", description: res.message });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message || "Failed to save permission." });
    } finally {
      setIsUpdating(null);
    }
  };

  const applyPresetTemplate = async (presetRole: string) => {
    if (!selectedUser) return;
    
    if (!checkCanModify(selectedUser)) {
      toast({ variant: "destructive", title: "Access Denied", description: "You are not authorized to reset permissions for this user level." });
      return;
    }

    setIsUpdating(selectedUser.id);
    try {
      const presetPermissions = DEFAULT_PERMISSIONS[presetRole] || {};
      
      const res = await updateUserByAdmin({
        userId: selectedUser.id,
        permissions: presetPermissions
      });

      if (res.success && res.user) {
        toast({ title: "Preset Applied", description: `Applied standard ${presetRole} template overrides to ${selectedUser.name}.` });
        setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, permissions: res.user!.permissions, updatedAt: res.user!.updatedAt } : u));
      } else {
        toast({ variant: "destructive", title: "Update Failed", description: res.message });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message || "Failed to apply preset." });
    } finally {
      setIsUpdating(null);
    }
  };

  const isEditable = checkCanModify(selectedUser);

  const isCommander = currentUserEmail === 'rbaskeydomi2018@gmail.com';

  if (currentUserEmail && !isCommander) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] animate-fade-in">
        <div className="bg-[#0D0D0D]/40 border border-[#EF4444]/20 backdrop-blur-[24px] rounded-[32px] p-8 md:p-12 max-w-lg w-full text-center space-y-6 shadow-[0_15px_50px_rgba(239,68,68,0.15)]">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/20 flex items-center justify-center text-[#EF4444] animate-bounce shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl md:text-2xl font-black font-headline text-white uppercase tracking-wider">Access Restrained</h1>
            <p className="text-xs md:text-sm text-[#A1A1A1] leading-relaxed font-medium">
              Only the Supreme Commander is permitted to view and manage access control matrices. Your current clearance level does not authorize access to this terminal.
            </p>
          </div>
          <div className="pt-2 border-t border-white/5 flex justify-center">
            <Button
              onClick={() => window.location.href = '/admin'}
              className="bg-[#EF4444]/20 hover:bg-[#EF4444]/30 text-white border border-[#EF4444]/30 rounded-xl text-xs font-bold uppercase tracking-wider px-6 h-11"
            >
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading && users.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-[#FF5A5F]" />
          <p className="text-sm font-semibold tracking-widest text-[#A1A1A1] uppercase animate-pulse">Syncing RBAC infrastructure...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold font-headline flex items-center text-white uppercase tracking-wider">
            <Key className="mr-3 h-8 w-8 text-[#FF5A5F]" /> Roles & Access Matrix
          </h1>
          <p className="text-xs md:text-sm text-[#A1A1A1] font-medium mt-1">
            Configure permission matrices, map operational roles, and enforce strict database guard security rules.
          </p>
        </div>

        <Button onClick={fetchUsersList} variant="outline" className="bg-white/5 border-white/10 text-white rounded-xl h-11 text-xs font-bold uppercase tracking-wider hover:bg-white/10">
          <RefreshCw className="w-4 h-4 mr-2" /> Reload Database
        </Button>
      </div>

      {/* Role Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {roleDefinitions.map((role) => (
          <div 
            key={role.name}
            className={cn(
              "bg-[#0D0D0D]/40 border border-white/5 rounded-3xl p-5 shadow-lg backdrop-blur-md transition-all duration-500 transform hover:-translate-y-1 flex flex-col justify-between min-h-[160px]",
              role.glowClass,
              role.borderClass
            )}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Shield className={cn("w-4 h-4", role.color)} />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">{role.name}</h4>
                </div>
                <Badge className={cn("text-[8px] font-extrabold px-1.5 py-0.5 border uppercase tracking-wider", role.badgeClass)}>
                  LVL {role.level}
                </Badge>
              </div>
              <p className="text-[10px] text-[#A1A1A1] leading-relaxed font-medium">{role.description}</p>
            </div>
            
            <div className="flex items-center justify-between text-[8px] text-[#666666] font-mono border-t border-white/5 pt-3 mt-2">
              <span>HIERARCHY {role.level >= 80 ? "HIGH" : "OPERATIONAL"}</span>
              <span>{Object.values(DEFAULT_PERMISSIONS[role.name] || {}).filter(Boolean).length} / 20 PERMS</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Split Layout: Operator List & Permission Override Panel */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        
        {/* Left Col: Operator List Table (7 columns span) */}
        <div className="lg:col-span-7 bg-[#0D0D0D]/40 border border-white/5 backdrop-blur-[24px] rounded-[28px] p-6 shadow-lg space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b border-white/5">
            <Users className="w-5 h-5 text-[#FF5A5F]" />
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-headline">Operator Role Assignments</h3>
              <p className="text-[9px] text-[#A1A1A1] font-medium mt-0.5">Assign access roles to user accounts. Higher levels govern lower levels.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-left text-[#666666] text-[10px] font-bold uppercase tracking-wider w-[50px]">User</TableHead>
                  <TableHead className="text-left text-[#666666] text-[10px] font-bold uppercase tracking-wider">Name & Email</TableHead>
                  <TableHead className="text-left text-[#666666] text-[10px] font-bold uppercase tracking-wider w-[140px]">Access Role</TableHead>
                  <TableHead className="text-right text-[#666666] text-[10px] font-bold uppercase tracking-wider w-[90px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const isUserSelected = selectedUserId === user.id;
                  const canEditThisUser = checkCanModify(user);
                  const isCommanderUser = user.email === 'rbaskeydomi2018@gmail.com';
                  
                  return (
                    <TableRow 
                      key={user.id} 
                      className={cn(
                        "border-white/5 hover:bg-white/[0.01] transition-colors cursor-pointer",
                        isUserSelected && "bg-[#FF5A5F]/5 border-[#FF5A5F]/20"
                      )}
                      onClick={() => setSelectedUserId(user.id)}
                    >
                      {/* Avatar */}
                      <TableCell className="py-3">
                        <Avatar className="h-8 w-8 border border-white/10 shadow-sm">
                          <AvatarImage src={user.avatarUrl ?? undefined} alt={user.name} />
                          <AvatarFallback className="text-xs bg-white/5 text-white">{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      
                      {/* Name & Email */}
                      <TableCell className="py-3 max-w-[200px]">
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-xs text-white truncate">{user.name}</span>
                          <span className="text-[9px] text-[#A1A1A1] font-mono truncate">{user.email}</span>
                        </div>
                      </TableCell>
                      
                      {/* Dropdown Role Select */}
                      <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>
                        {isUpdating === user.id ? (
                          <div className="flex items-center gap-1.5 text-[10px] text-[#666666]">
                            <Loader2 className="w-3 h-3 animate-spin text-[#FF5A5F]" />
                            <span>Updating...</span>
                          </div>
                        ) : isCommanderUser ? (
                          <Badge className="bg-[#FF5A5F]/15 border-[#FF5A5F]/30 text-[#FF5A5F] text-[8px] font-extrabold uppercase tracking-widest px-2 py-0.5">
                            Commander
                          </Badge>
                        ) : !canEditThisUser ? (
                          <Badge className="bg-white/5 border-white/10 text-[#A1A1A1] text-[8px] font-bold uppercase tracking-widest px-2 py-0.5">
                            {user.role} (Locked)
                          </Badge>
                        ) : (
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                            className="bg-white/[0.02] border border-white/10 rounded-lg h-8 px-2 text-[10px] text-white focus:outline-none focus:border-[#FF5A5F]/40 cursor-pointer uppercase font-bold tracking-wider w-full"
                          >
                            <option value="Admin" className="bg-[#050505] text-white" disabled={activeOperator?.role !== 'Commander'}>Admin</option>
                            <option value="Content Manager" className="bg-[#050505] text-white">Content Manager</option>
                            <option value="Contributor" className="bg-[#050505] text-white">Contributor</option>
                            <option value="User" className="bg-[#050505] text-white">User</option>
                          </select>
                        )}
                      </TableCell>

                      {/* Config Button */}
                      <TableCell className="py-3 text-right">
                        <Button 
                          size="sm"
                          variant="ghost"
                          className={cn(
                            "h-7 text-[9px] font-extrabold uppercase tracking-wider rounded-lg px-2.5",
                            isUserSelected ? "bg-[#FF5A5F] text-white hover:bg-[#FF5A5F]/90" : "bg-white/5 text-white/80 hover:bg-white/10"
                          )}
                          onClick={() => setSelectedUserId(user.id)}
                        >
                          Configure
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Right Col: Permissions Switch Matrix (5 columns span) */}
        <div className="lg:col-span-5 bg-[#0D0D0D]/40 border border-white/5 backdrop-blur-[24px] rounded-[28px] p-6 shadow-lg space-y-6">
          {selectedUser ? (
            <>
              {/* Operator Info Header */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-11 w-11 border border-white/10 shadow-lg">
                    <AvatarImage src={selectedUser.avatarUrl ?? undefined} />
                    <AvatarFallback className="bg-[#FF5A5F]/15 text-[#FF5A5F] font-bold text-sm">
                      {selectedUser.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-sm text-white tracking-wide truncate">{selectedUser.name}</h3>
                      <Badge className="bg-[#FF5A5F]/10 border border-[#FF5A5F]/20 text-[#FF5A5F] text-[7px] font-extrabold tracking-widest px-1.5 uppercase">
                        LVL {selectedUser.hierarchyLevel}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-[#A1A1A1] font-mono truncate">{selectedUser.email}</p>
                  </div>
                </div>

                {/* Safety / Locked Warning Panel */}
                {!isEditable ? (
                  <div className="bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl p-3 flex gap-2.5 items-start">
                    <ShieldAlert className="w-4 h-4 text-[#EF4444] mt-0.5 flex-shrink-0" />
                    <div className="space-y-0.5">
                      <h5 className="text-[10px] font-bold text-white uppercase tracking-wider">Immutable Security Lock</h5>
                      <p className="text-[9px] text-[#A1A1A1] leading-relaxed">
                        {selectedUser.role === 'Commander' 
                          ? "This operator holds Supreme Commander status. Permissions are hardcoded and cannot be modified."
                          : "You cannot override permissions for users with equal or higher role hierarchy levels."
                        }
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex gap-2.5 items-start">
                    <Unlock className="w-4 h-4 text-[#00D1B2] mt-0.5 flex-shrink-0" />
                    <div className="space-y-0.5">
                      <h5 className="text-[10px] font-bold text-white uppercase tracking-wider">Custom Overrides Unlocked</h5>
                      <p className="text-[9px] text-[#A1A1A1] leading-relaxed">
                        You have permission to toggle granular database capabilities. Customizations are merged dynamically.
                      </p>
                    </div>
                  </div>
                )}

                {/* Preset Actions Grid */}
                {isEditable && (
                  <div className="space-y-2 border-t border-white/5 pt-4">
                    <h5 className="text-[9px] font-bold text-[#666666] uppercase tracking-widest">Apply Preset Templates</h5>
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="bg-white/3 border-white/5 hover:bg-white/5 text-[9px] font-bold uppercase tracking-wider h-8 text-white"
                        onClick={() => applyPresetTemplate('Content Manager')}
                        disabled={isUpdating === selectedUser.id}
                      >
                        Content Manager
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="bg-white/3 border-white/5 hover:bg-white/5 text-[9px] font-bold uppercase tracking-wider h-8 text-white"
                        onClick={() => applyPresetTemplate('Contributor')}
                        disabled={isUpdating === selectedUser.id}
                      >
                        Contributor
                      </Button>
                      {activeOperator?.role === 'Commander' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="bg-white/3 border-white/5 hover:bg-white/5 text-[9px] font-bold uppercase tracking-wider h-8 text-white"
                          onClick={() => applyPresetTemplate('Admin')}
                          disabled={isUpdating === selectedUser.id}
                        >
                          Full Admin
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="bg-white/3 border-white/5 hover:bg-white/5 text-[9px] font-bold uppercase tracking-wider h-8 text-white"
                        onClick={() => applyPresetTemplate('User')}
                        disabled={isUpdating === selectedUser.id}
                      >
                        Clear Overrides
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Categorized Permissions Grid */}
              <div className="border-t border-white/5 pt-4 space-y-5 max-h-[480px] overflow-y-auto pr-2 scrollbar-thin">
                {Object.entries(PERMISSION_CATEGORIES).map(([catKey, category]) => (
                  <div key={catKey} className="space-y-2.5">
                    <h4 className="text-[10px] font-extrabold text-white uppercase tracking-wider border-l-2 border-l-[#FF5A5F] pl-2">
                      {category.title}
                    </h4>
                    <div className="bg-white/[0.01] border border-white/5 rounded-2xl divide-y divide-white/5 overflow-hidden">
                      {category.permissions.map((permKey) => {
                        const hasPermission = selectedUser.permissions[permKey] === true;
                        
                        return (
                          <div key={permKey} className="p-3 flex items-center justify-between gap-4">
                            <div className="space-y-0.5 pr-2">
                              <span className="text-[10.5px] font-bold text-white leading-none">
                                {PERMISSION_DETAILS[permKey]?.label || permKey}
                              </span>
                              <p className="text-[9px] text-[#A1A1A1] font-medium leading-tight">
                                {PERMISSION_DETAILS[permKey]?.description || "No description available"}
                              </p>
                            </div>
                            <Switch
                              checked={hasPermission}
                              onCheckedChange={() => handleTogglePermission(permKey, hasPermission)}
                              disabled={!isEditable || isUpdating === selectedUser.id}
                              className="data-[state=checked]:bg-[#FF5A5F] data-[state=unchecked]:bg-white/5 scale-90"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-6 space-y-3">
              <Lock className="w-12 h-12 text-[#666666] stroke-1" />
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Select an Operator</h4>
                <p className="text-[10px] text-[#A1A1A1] font-medium mt-1 leading-normal">Select an account from the left pane to configure database guards and view permission details.</p>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

