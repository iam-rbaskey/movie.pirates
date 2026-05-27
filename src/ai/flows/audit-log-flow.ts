'use server';

import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongodb';
import { verifyAuth } from '@/lib/auth';

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
    const { db } = await connectToDatabase();
    
    const newLog = {
      adminId: caller?.userId || 'system',
      adminName: caller?.name || 'System Auto',
      adminEmail: caller?.email || 'system@moviepirates.com',
      action: input.action,
      details: input.details,
      category: input.category,
      severity: input.severity,
      timestamp: new Date(),
    };

    await db.collection('audit_logs').insertOne(newLog);
    return { success: true };
  } catch (error) {
    console.error("Error logging audit event:", error);
    return { success: false, error };
  }
}

export async function getAuditLogs() {
  try {
    const caller = await verifyAuth();
    if (!caller || (caller.role !== 'Commander' && caller.hierarchyLevel < 80)) {
      throw new Error("Unauthorized: Access to logs is restricted.");
    }

    const { db } = await connectToDatabase();
    const logs = await db.collection('audit_logs')
      .find({})
      .sort({ timestamp: -1 })
      .toArray();

    return logs.map(doc => ({
      id: doc._id.toString(),
      adminId: doc.adminId,
      adminName: doc.adminName,
      adminEmail: doc.adminEmail,
      action: doc.action,
      details: doc.details,
      category: doc.category,
      severity: doc.severity,
      timestamp: doc.timestamp instanceof Date ? doc.timestamp.toISOString() : new Date(doc.timestamp).toISOString(),
    }));
  } catch (error: any) {
    console.error("Error fetching audit logs:", error);
    throw new Error(error.message || "Failed to fetch audit logs.");
  }
}
