'use server';

import { z } from 'zod';
import { verifyAuth } from '@/lib/auth';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';

const AuditLogInputSchema = z.object({
  action: z.string(),
  details: z.string(),
  category: z.enum(['security', 'content', 'streaming', 'system', 'general']).default('general'),
  severity: z.enum(['info', 'warning', 'critical']).default('info'),
});

export type AuditLogInput = z.infer<typeof AuditLogInputSchema>;

export async function logAuditEvent(input: AuditLogInput) {
  try {
    const caller = await verifyAuth();
    
    const newLog = {
      id: crypto.randomBytes(12).toString('hex'),
      admin_id: caller?.userId || 'system',
      admin_name: caller?.name || 'System Auto',
      admin_email: caller?.email || 'system@moviepirates.com',
      action: input.action,
      details: input.details,
      category: input.category,
      severity: input.severity,
      timestamp: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from('audit_logs')
      .insert(newLog);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error logging audit event:", error);
    return { success: false, error };
  }
}

export async function getAuditLogs() {
  try {
    const caller = await verifyAuth();
    const isUserAdmin = caller?.role === 'Commander' || ['admin', 'Commander', 'Admin', 'Content Manager', 'Contributor'].includes(caller?.role || '');
    if (!caller || !isUserAdmin) {
      throw new Error("Unauthorized: Access to logs is restricted to administrators only.");
    }

    const { data: logs, error } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) throw error;

    return (logs || []).map(doc => ({
      id: doc.id,
      adminId: doc.admin_id,
      adminName: doc.admin_name,
      adminEmail: doc.admin_email,
      action: doc.action,
      details: doc.details,
      category: doc.category,
      severity: doc.severity,
      timestamp: new Date(doc.timestamp).toISOString(),
    }));
  } catch (error: any) {
    console.error("Error fetching audit logs:", error);
    throw new Error(error.message || "Failed to fetch audit logs.");
  }
}
