'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';

const TrackVisitorInputSchema = z.object({
  visitorId: z.string().min(1, "Visitor ID is required"),
});
export type TrackVisitorInput = z.infer<typeof TrackVisitorInputSchema>;

async function getClientIp(): Promise<string> {
  try {
    const headerList = await headers();
    const forwardedFor = headerList.get('x-forwarded-for');
    if (forwardedFor) {
      const ips = forwardedFor.split(',');
      return ips[0].trim();
    }
    const realIp = headerList.get('x-real-ip');
    if (realIp) return realIp.trim();
    return '127.0.0.1';
  } catch (e) {
    console.error("Failed to parse headers for visitor IP:", e);
    return '127.0.0.1';
  }
}

export async function trackAnonymousVisitor(input: TrackVisitorInput): Promise<{ success: boolean }> {
  const { visitorId } = input;
  try {
    const ip = await getClientIp();

    // Check if visitor already exists to avoid duplicate entries
    const { data: existingVisitor, error: fetchError } = await supabaseAdmin
      .from('visitors')
      .select('*')
      .eq('visitor_id', visitorId)
      .maybeSingle();

    if (existingVisitor) {
      await supabaseAdmin
        .from('visitors')
        .update({
          last_seen: new Date().toISOString(),
          ip,
        })
        .eq('visitor_id', visitorId);
      return { success: true };
    }
    
    // Insert new visitor
    const { error: insertError } = await supabaseAdmin
      .from('visitors')
      .insert({
        id: crypto.randomBytes(12).toString('hex'),
        visitor_id: visitorId,
        ip,
        created_at: new Date().toISOString(),
        last_seen: new Date().toISOString(),
      });

    if (insertError) throw insertError;
    return { success: true };
  } catch (error) {
    console.error('Error tracking anonymous visitor:', error);
    return { success: false };
  }
}
