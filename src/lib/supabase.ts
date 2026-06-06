import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl) {
  console.warn('Warning: NEXT_PUBLIC_SUPABASE_URL is not defined in environment variables.');
}

// Service role client bypasses RLS, used securely only in server environments (Server Actions, API routes)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey || 'placeholder', {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

// Regular client (uses anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey || supabaseServiceKey || 'placeholder');

export function mapUserFromDb(doc: any) {
  if (!doc) return null;
  return {
    id: doc.id,
    name: doc.name,
    email: doc.email,
    password: doc.password,
    role: doc.role,
    hierarchyLevel: doc.hierarchy_level ?? 0,
    permissions: doc.permissions || {},
    watchlist: doc.watchlist || [],
    reviews: doc.reviews || [],
    ratingHistory: doc.rating_history || [],
    roleAssignedBy: doc.role_assigned_by || null,
    avatarUrl: doc.avatar_url || null,
    dataAiHint: doc.data_ai_hint || null,
    createdAt: doc.created_at ? new Date(doc.created_at).toISOString() : null,
    updatedAt: doc.updated_at ? new Date(doc.updated_at).toISOString() : null,
    lastSeen: doc.last_seen ? new Date(doc.last_seen).toISOString() : null,
    lastIp: doc.last_ip || null,
    customRole: doc.custom_role || null,
  };
}



