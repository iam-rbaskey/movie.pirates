import { z } from 'zod';

export const SettingsSchema = z.object({
  apiEndpoint: z.string().url("Invalid API gateway URL format"),
  cacheTTL: z.number().int().nonnegative("Cache TTL must be a positive integer"),
  maintenanceMode: z.boolean(),
  jwtSecret: z.string().min(16, "JWT Secret must be at least 16 characters long"),
  streamingResolution: z.enum(['4K', '1080p', '720p', 'Auto']),
  defaultSubtitleLang: z.enum(['English', 'Spanish', 'French', 'None']),
  siteTitle: z.string().min(3, "Site title must be at least 3 characters long"),
  siteMetaDesc: z.string().min(10, "Meta description must be at least 10 characters long"),
  brandTheme: z.enum(['red', 'cyan', 'green', 'violet']),
  maxReviewsPerUser: z.number().int().nonnegative("Max reviews per user must be a non-negative number"),
  antiSpamLimit: z.number().int().nonnegative("Anti-spam rate limit must be a non-negative number"),
});

export type GlobalSettingsInput = z.infer<typeof SettingsSchema>;
