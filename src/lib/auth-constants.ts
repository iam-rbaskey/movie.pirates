export const DEFAULT_PERMISSIONS: Record<string, Record<string, boolean>> = {
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

export const ROLE_HIERARCHY_LEVELS: Record<string, number> = {
  "Commander": 100,
  "Admin": 80,
  "Content Manager": 50,
  "Contributor": 30,
  "User": 0
};
