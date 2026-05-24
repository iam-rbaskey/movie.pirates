"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { getUsers, updateUserByAdmin, type UserForAdminOutput } from '@/ai/flows/admin-users-flow';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, Users, Check, X, RefreshCw, Key, ShieldCheck } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface RoleDefinition {
  name: string;
  description: string;
  glowClass: string;
  borderClass: string;
  color: string;
}

export default function RolesPermissionsPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserForAdminOutput[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // Permission Matrix state for role tiers
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({
    "Super Admin": {
      "manage content": true,
      "publish content": true,
      "delete content": true,
      "view analytics": true,
      "manage users": true,
      "manage settings": true,
      "manage assets": true
    },
    "Content Manager": {
      "manage content": true,
      "publish content": true,
      "delete content": false,
      "view analytics": true,
      "manage users": false,
      "manage settings": false,
      "manage assets": true
    },
    "Moderator": {
      "manage content": false,
      "publish content": false,
      "delete content": false,
      "view analytics": true,
      "manage users": false,
      "manage settings": false,
      "manage assets": false
    },
    "Analytics Viewer": {
      "manage content": false,
      "publish content": false,
      "delete content": false,
      "view analytics": true,
      "manage users": false,
      "manage settings": false,
      "manage assets": false
    },
    "Uploader": {
      "manage content": true,
      "publish content": false,
      "delete content": false,
      "view analytics": false,
      "manage users": false,
      "manage settings": false,
      "manage assets": true
    }
  });

  const fetchUsersList = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await getUsers();
      setUsers(list);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Sync Failed", description: e.message || "Failed to load user accounts." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsersList();
  }, [fetchUsersList]);

  // Handle custom role assignment
  const handleRoleChange = async (userId: string, nextCustomRole: string) => {
    setIsUpdating(userId);
    try {
      // Synchronize database role checks:
      // If custom role is Super Admin, Content Manager, or Moderator, set base role to 'admin'
      // If custom role is Analytics Viewer or Uploader, set base role to 'user'
      const isAdminRole = ['Super Admin', 'Content Manager', 'Moderator'].includes(nextCustomRole);
      const baseRole = isAdminRole ? 'admin' : 'user';

      const res = await updateUserByAdmin({
        userId,
        customRole: nextCustomRole,
        role: baseRole
      });

      if (res.success) {
        toast({ title: "Role Updated", description: `Assigned role "${nextCustomRole}" to ${res.user?.name}.` });
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, customRole: nextCustomRole, role: baseRole } : u));
      } else {
        toast({ variant: "destructive", title: "Failed", description: res.message });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message || "Failed to save role settings." });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleTogglePermission = (role: string, permission: string) => {
    setPermissions(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [permission]: !prev[role][permission]
      }
    }));
    toast({ title: "Matrix Updated", description: `Toggled permission "${permission}" for ${role}.` });
  };

  const roleDefinitions: RoleDefinition[] = [
    { name: "Super Admin", description: "Full operational access, account management, and database deletion permissions.", glowClass: "hover:shadow-[0_0_30px_rgba(255,90,95,0.25)]", borderClass: "hover:border-[#FF5A5F]/30", color: "text-[#FF5A5F]" },
    { name: "Content Manager", description: "Can modify titles, update metadata, structure cast lists, and manage subtitles.", glowClass: "hover:shadow-[0_0_30px_rgba(0,209,178,0.25)]", borderClass: "hover:border-[#00D1B2]/30", color: "text-[#00D1B2]" },
    { name: "Moderator", description: "Can moderate user reviews, comment histories, and view dashboard analytics.", glowClass: "hover:shadow-[0_0_30px_rgba(245,158,11,0.25)]", borderClass: "hover:border-[#F59E0B]/30", color: "text-[#F59E0B]" },
    { name: "Analytics Viewer", description: "Read-only access to streaming telemetries, charts, and query logs.", glowClass: "hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]", borderClass: "hover:border-white/10", color: "text-white/80" },
    { name: "Uploader", description: "Can add new video links, posters, banners, and update episode references.", glowClass: "hover:shadow-[0_0_30px_rgba(255,90,95,0.25)]", borderClass: "hover:border-[#FF5A5F]/30", color: "text-[#FF5A5F]" }
  ];

  const permissionList = [
    "manage content",
    "publish content",
    "delete content",
    "view analytics",
    "manage users",
    "manage settings",
    "manage assets"
  ];

  if (isLoading && users.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-[#FF5A5F]" />
          <p className="text-sm font-semibold tracking-widest text-[#A1A1A1] uppercase animate-pulse">Syncing permissions matrix...</p>
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
            Configure permission matrices and edit administrative access hierarchies.
          </p>
        </div>

        <Button onClick={fetchUsersList} variant="outline" className="bg-white/5 border-white/10 text-white rounded-xl h-11 text-xs font-bold uppercase tracking-wider">
          <RefreshCw className="w-4 h-4 mr-2" /> Reload Matrix
        </Button>
      </div>

      {/* Role Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {roleDefinitions.map((role) => (
          <div 
            key={role.name}
            className={cn(
              "bg-[#0D0D0D]/40 border border-white/5 rounded-3xl p-6 shadow-lg backdrop-blur-md transition-all duration-500 transform hover:-translate-y-1 flex flex-col justify-between",
              role.glowClass,
              role.borderClass
            )}
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield className={cn("w-4.5 h-4.5", role.color)} />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">{role.name}</h4>
              </div>
              <p className="text-[10px] text-[#A1A1A1] leading-relaxed font-medium">{role.description}</p>
            </div>
            <Badge className="bg-white/5 border border-white/10 text-[8px] font-bold uppercase tracking-wider mt-4 w-max">
              Role Tier
            </Badge>
          </div>
        ))}
      </div>

      {/* Permissions Matrix Table */}
      <div className="bg-[#0D0D0D]/40 border border-white/5 backdrop-blur-[24px] rounded-[28px] p-6 shadow-lg">
        <div className="pb-6">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-headline flex items-center gap-2">
            <ShieldCheck className="w-4.5 h-4.5 text-[#FF5A5F]" /> Permission Grid Matrix
          </h3>
          <p className="text-[9px] text-[#A1A1A1] font-medium mt-0.5">Toggle administrative capacities assigned to specific role levels.</p>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="text-left text-[#666666] text-[10px] font-bold uppercase tracking-wider w-[180px]">Role Hierarchy</TableHead>
                {permissionList.map((perm) => (
                  <TableHead key={perm} className="text-center text-[#666666] text-[10px] font-bold uppercase tracking-wider">
                    {perm}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {roleDefinitions.map((role) => (
                <TableRow key={role.name} className="border-white/5 hover:bg-white/[0.01] transition-colors">
                  <TableCell className="font-bold text-xs text-white uppercase tracking-wide py-4">{role.name}</TableCell>
                  {permissionList.map((perm) => {
                    const hasPerm = permissions[role.name]?.[perm] ?? false;
                    return (
                      <TableCell key={perm} className="text-center py-4">
                        <div className="flex items-center justify-center">
                          <Switch
                            checked={hasPerm}
                            onCheckedChange={() => handleTogglePermission(role.name, perm)}
                            className="data-[state=checked]:bg-[#FF5A5F] data-[state=unchecked]:bg-white/5 border-white/5 scale-90"
                          />
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* User Role Assignment list */}
      <div className="bg-[#0D0D0D]/40 border border-white/5 backdrop-blur-[24px] rounded-[28px] p-6 shadow-lg">
        <div className="pb-6 flex items-center gap-2">
          <Users className="w-5 h-5 text-[#FF5A5F]" />
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-headline">Operator Role Assignments</h3>
            <p className="text-[9px] text-[#A1A1A1] font-medium mt-0.5">Assign custom operational access roles to user accounts in real-time.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="text-left text-[#666666] text-[10px] font-bold uppercase tracking-wider w-[80px]">Avatar</TableHead>
                <TableHead className="text-left text-[#666666] text-[10px] font-bold uppercase tracking-wider">Name</TableHead>
                <TableHead className="text-left text-[#666666] text-[10px] font-bold uppercase tracking-wider">Email</TableHead>
                <TableHead className="text-left text-[#666666] text-[10px] font-bold uppercase tracking-wider">Custom Role</TableHead>
                <TableHead className="text-center text-[#666666] text-[10px] font-bold uppercase tracking-wider w-[120px]">Database Guard</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} className="border-white/5 hover:bg-white/[0.01]">
                  <TableCell className="py-3">
                    <Avatar className="h-9 w-9 border border-white/10 shadow-sm">
                      <AvatarImage src={user.avatarUrl ?? undefined} alt={user.name} />
                      <AvatarFallback className="text-xs bg-white/5 text-white">{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-semibold text-xs text-white py-3">{user.name}</TableCell>
                  <TableCell className="text-xs text-[#A1A1A1] font-mono py-3">{user.email}</TableCell>
                  
                  {/* Dropdown for role assignment */}
                  <TableCell className="py-3">
                    <div className="relative w-[180px]">
                      {isUpdating === user.id ? (
                        <div className="flex items-center gap-2 text-xs text-[#A1A1A1]">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FF5A5F]" />
                          <span>Saving...</span>
                        </div>
                      ) : (
                        <select
                          value={user.customRole || (user.role === 'admin' ? 'Super Admin' : 'Uploader')}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className="w-full bg-white/[0.02] border border-white/8 rounded-xl h-10 px-3 text-xs text-white focus:outline-none focus:border-[#FF5A5F]/40 cursor-pointer appearance-none uppercase font-bold tracking-wider"
                        >
                          <option value="Super Admin" className="bg-[#0D0D0D] text-white">Super Admin</option>
                          <option value="Content Manager" className="bg-[#0D0D0D] text-white">Content Manager</option>
                          <option value="Moderator" className="bg-[#0D0D0D] text-white">Moderator</option>
                          <option value="Analytics Viewer" className="bg-[#0D0D0D] text-white">Analytics Viewer</option>
                          <option value="Uploader" className="bg-[#0D0D0D] text-white">Uploader</option>
                        </select>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-center py-3">
                    <Badge className={cn(
                      "text-[8px] font-bold uppercase tracking-widest px-2 py-0.5",
                      user.role === 'admin' ? 'bg-[#FF5A5F]/15 border-[#FF5A5F]/20 text-[#FF5A5F]' : 'bg-white/5 border-white/10 text-[#666666]'
                    )}>
                      {user.role}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
