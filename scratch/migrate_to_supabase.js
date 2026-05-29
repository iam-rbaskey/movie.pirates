const { MongoClient } = require('mongodb');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const MONGODB_URI = "mongodb://rbaskeyofficial:rbaskeyofficial@cluster0-shard-00-00.lnstw.mongodb.net:27017,cluster0-shard-00-01.lnstw.mongodb.net:27017,cluster0-shard-00-02.lnstw.mongodb.net:27017/movie1?ssl=true&replicaSet=atlas-90223m-shard-0&authSource=admin&retryWrites=true&w=majority";
const MONGODB_DB_NAME = "movie1";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("\x1b[31mError: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables.\x1b[0m");
  console.error("Please run the script as follows:");
  console.error("  NEXT_PUBLIC_SUPABASE_URL=your_url SUPABASE_SERVICE_ROLE_KEY=your_key node scratch/migrate_to_supabase.js");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

const DEFAULT_PERMISSIONS = {
  "Commander": {
    "create_content": true, "edit_content": true, "delete_content": true, "publish_content": true, "archive_content": true, "manage_categories": true, "manage_media": true,
    "view_users": true, "ban_users": true, "delete_users": true, "assign_roles": true, "edit_permissions": true,
    "view_analytics": true, "export_analytics": true, "view_logs": true,
    "manage_settings": true, "manage_streaming": true, "manage_storage": true, "manage_mirrors": true, "manage_platform": true
  },
  "Admin": {
    "create_content": true, "edit_content": true, "delete_content": true, "publish_content": true, "archive_content": true, "manage_categories": true, "manage_media": true,
    "view_users": true, "ban_users": true, "delete_users": true, "assign_roles": true, "edit_permissions": true,
    "view_analytics": true, "export_analytics": true, "view_logs": true,
    "manage_settings": true, "manage_streaming": true, "manage_storage": true, "manage_mirrors": true, "manage_platform": true
  },
  "Content Manager": {
    "create_content": true, "edit_content": true, "delete_content": false, "publish_content": true, "archive_content": true, "manage_categories": true, "manage_media": true,
    "view_users": false, "ban_users": false, "delete_users": false, "assign_roles": false, "edit_permissions": false,
    "view_analytics": true, "export_analytics": false, "view_logs": false,
    "manage_settings": false, "manage_streaming": false, "manage_storage": false, "manage_mirrors": false, "manage_platform": false
  },
  "Contributor": {
    "create_content": true, "edit_content": true, "delete_content": false, "publish_content": false, "archive_content": false, "manage_categories": false, "manage_media": false,
    "view_users": false, "ban_users": false, "delete_users": false, "assign_roles": false, "edit_permissions": false,
    "view_analytics": true, "export_analytics": false, "view_logs": false,
    "manage_settings": false, "manage_streaming": false, "manage_storage": false, "manage_mirrors": false, "manage_platform": false
  },
  "User": {
    "create_content": false, "edit_content": false, "delete_content": false, "publish_content": false, "archive_content": false, "manage_categories": false, "manage_media": false,
    "view_users": false, "ban_users": false, "delete_users": false, "assign_roles": false, "edit_permissions": false,
    "view_analytics": false, "export_analytics": false, "view_logs": false,
    "manage_settings": false, "manage_streaming": false, "manage_storage": false, "manage_mirrors": false, "manage_platform": false
  }
};

async function migrateTable(name, mongoDocs, mapper, supabaseTable) {
  console.log(`\n\x1b[36mMigrating ${name}... (Total: ${mongoDocs.length} records)\x1b[0m`);
  
  if (mongoDocs.length === 0) {
    console.log(`No records found for ${name}. Skipping.`);
    return;
  }

  const mappedRows = [];
  for (let doc of mongoDocs) {
    try {
      mappedRows.push(mapper(doc));
    } catch (err) {
      console.warn(`\x1b[33mWarning mapping document ${doc._id || 'unknown'}: ${err.message}\x1b[0m`);
    }
  }

  const BATCH_SIZE = 100;
  let successCount = 0;

  for (let i = 0; i < mappedRows.length; i += BATCH_SIZE) {
    const batch = mappedRows.slice(i, i + BATCH_SIZE);
    
    // We use upsert so the script can be rerun without constraint violations
    const { error } = await supabase
      .from(supabaseTable)
      .upsert(batch, { onConflict: 'id' });

    if (error) {
      console.error(`\x1b[31mError upserting batch ${i} to ${i + batch.length} into ${supabaseTable}:\x1b[0m`, error);
    } else {
      successCount += batch.length;
      process.stdout.write(`  Upserted ${successCount}/${mappedRows.length} rows...\r`);
    }
  }
  console.log(`\n\x1b[32mCompleted migration for ${name}! Successfully upserted ${successCount} rows.\x1b[0m`);
}

async function main() {
  console.log("\x1b[1m\x1b[35m=== Starting Database Migration: MongoDB -> Supabase Postgres ===\x1b[0m");
  
  const client = new MongoClient(MONGODB_URI, {
    connectTimeoutMS: 10000,
    serverSelectionTimeoutMS: 10000,
  });

  try {
    console.log("Connecting to MongoDB...");
    await client.connect();
    const db = client.db(MONGODB_DB_NAME);
    console.log("\x1b[32mConnected successfully to MongoDB.\x1b[0m");

    // 1. Migrate Users (Dependencies must be first)
    const mongoUsers = await db.collection('users').find({}).toArray();
    await migrateTable("Users", mongoUsers, (doc) => {
      const isCmd = doc.email === 'rbaskeydomi2018@gmail.com';
      const role = isCmd ? 'Commander' : (doc.role || 'User');
      const level = isCmd ? 100 : (doc.hierarchyLevel ?? (doc.role === 'admin' || doc.role === 'Admin' ? 80 : 0));
      const defaultRolePerms = DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS['User'];
      const permissions = isCmd ? DEFAULT_PERMISSIONS['Commander'] : { ...defaultRolePerms, ...(doc.permissions || {}) };

      return {
        id: doc._id.toString(),
        name: doc.name || 'N/A',
        email: doc.email || 'N/A',
        password: doc.password || '',
        role: role,
        hierarchy_level: level,
        permissions: permissions,
        watchlist: doc.watchlist || [],
        reviews: doc.reviews || [],
        rating_history: doc.ratingHistory || [],
        role_assigned_by: doc.roleAssignedBy || null,
        avatar_url: doc.avatarUrl || null,
        data_ai_hint: doc.dataAiHint || null,
        created_at: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
        updated_at: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
        last_seen: doc.lastSeen ? new Date(doc.lastSeen).toISOString() : new Date().toISOString(),
        last_ip: doc.lastIp || null,
        custom_role: doc.customRole || (role === 'User' ? 'Uploader' : role)
      };
    }, 'users');

    // 2. Migrate Visitors
    const mongoVisitors = await db.collection('visitors').find({}).toArray();
    await migrateTable("Visitors", mongoVisitors, (doc) => {
      return {
        id: doc._id.toString(),
        visitor_id: doc.visitorId,
        ip: doc.ip || null,
        created_at: doc.firstSeen ? new Date(doc.firstSeen).toISOString() : (doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString()),
        last_seen: doc.lastSeen ? new Date(doc.lastSeen).toISOString() : new Date().toISOString()
      };
    }, 'visitors');

    // Fetch list of migrated user IDs so we don't violate foreign keys for orphaned records
    const { data: activeUsers, error: userFetchError } = await supabase
      .from('users')
      .select('id');
    if (userFetchError) throw userFetchError;
    const userIdsSet = new Set((activeUsers || []).map(u => u.id));

    // 3. Migrate Suggestions
    const mongoSuggestions = await db.collection('suggestions').find({}).toArray();
    await migrateTable("Suggestions", mongoSuggestions, (doc) => {
      const userId = doc.userId || null;
      // If user doesn't exist in Supabase users table, we skip or nullify to avoid foreign key violations
      const validUserId = (userId && userIdsSet.has(userId)) ? userId : null;
      return {
        id: doc._id.toString(),
        text: doc.text || '',
        user_id: validUserId,
        user_name: doc.userName || 'Unknown',
        user_avatar_url: doc.userAvatarUrl || null,
        data_ai_hint_user: doc.dataAiHintUser || null,
        created_at: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString()
      };
    }, 'suggestions');

    // 4. Migrate Audit Logs
    const mongoAuditLogs = await db.collection('audit_logs').find({}).toArray();
    await migrateTable("Audit Logs", mongoAuditLogs, (doc) => {
      const adminId = doc.adminId || null;
      const validAdminId = (adminId && userIdsSet.has(adminId)) ? adminId : null;
      return {
        id: doc._id.toString(),
        admin_id: validAdminId,
        admin_name: doc.adminName || 'System Auto',
        admin_email: doc.adminEmail || 'system@moviepirates.com',
        action: doc.action || 'unknown',
        details: doc.details || '',
        category: doc.category || 'general',
        severity: doc.severity || 'info',
        timestamp: doc.timestamp ? new Date(doc.timestamp).toISOString() : new Date().toISOString()
      };
    }, 'audit_logs');

    // 5. Migrate Stream Activities
    const mongoStreamActivities = await db.collection('stream_activities').find({}).toArray();
    await migrateTable("Stream Activities", mongoStreamActivities, (doc) => {
      const userId = doc.userId || null;
      const validUserId = (userId && userIdsSet.has(userId)) ? userId : null;
      return {
        id: doc._id.toString(),
        movie_id: doc.movieId || null,
        movie_title: doc.movieTitle || 'Unknown',
        movie_type: doc.movieType || 'movie',
        action: doc.action || 'play',
        device: doc.device || 'desktop',
        visitor_id: doc.visitorId || 'anonymous',
        user_id: validUserId,
        ip: doc.ip || null,
        timestamp: doc.timestamp ? new Date(doc.timestamp).toISOString() : new Date().toISOString()
      };
    }, 'stream_activities');

    console.log("\n\x1b[1m\x1b[32m=== All Data Successfully Migrated to Supabase Postgres! ===\x1b[0m");

  } catch (error) {
    console.error("\x1b[31mFatal Error during migration:\x1b[0m", error);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
