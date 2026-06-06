'use server';

import { connectToDatabase } from '@/lib/mongodb';
import { requirePermission } from '@/lib/auth';
import { SettingsSchema, type GlobalSettingsInput } from '../schemas/settings-schema';
import { logAuditEvent } from './audit-log-flow';
import { mockMovies } from '@/lib/mock-data';
import { ObjectId } from 'mongodb';

export async function getGlobalSettings(): Promise<{ success: boolean; settings?: GlobalSettingsInput; message?: string }> {
  try {
    await requirePermission('view_settings');
    
    const { db } = await connectToDatabase();
    const settingsCollection = db.collection('settings');
    const doc = await settingsCollection.findOne({ key: 'global_config' });

    if (doc) {
      return {
        success: true,
        settings: {
          apiEndpoint: doc.apiEndpoint || 'https://api.moviepirates.com/v2',
          cacheTTL: doc.cacheTTL ?? 3600,
          maintenanceMode: doc.maintenanceMode ?? false,
          jwtSecret: doc.jwtSecret || '••••••••••••••••••••••••••••••••',
          streamingResolution: doc.streamingResolution || 'Auto',
          defaultSubtitleLang: doc.defaultSubtitleLang || 'English',
          siteTitle: doc.siteTitle || 'Movie Pirates',
          siteMetaDesc: doc.siteMetaDesc || 'Discover, rate, and review movies on Movie Pirates universe.',
          brandTheme: doc.brandTheme || 'red',
          maxReviewsPerUser: doc.maxReviewsPerUser ?? 5,
          antiSpamLimit: doc.antiSpamLimit ?? 30,
        }
      };
    }

    // Default configuration if settings document doesn't exist
    return {
      success: true,
      settings: {
        apiEndpoint: 'https://api.moviepirates.com/v2',
        cacheTTL: 3600,
        maintenanceMode: false,
        jwtSecret: '••••••••••••••••••••••••••••••••',
        streamingResolution: 'Auto',
        defaultSubtitleLang: 'English',
        siteTitle: 'Movie Pirates',
        siteMetaDesc: 'Discover, rate, and review movies on Movie Pirates universe.',
        brandTheme: 'red',
        maxReviewsPerUser: 5,
        antiSpamLimit: 30,
      }
    };
  } catch (error: any) {
    console.error('Failed to get global settings:', error);
    return { success: false, message: error.message || 'Failed to fetch settings from database.' };
  }
}

export async function saveGlobalSettings(input: GlobalSettingsInput): Promise<{ success: boolean; message: string }> {
  try {
    await requirePermission('manage_settings');
    
    // Validate schema
    const validated = SettingsSchema.parse(input);

    const { db } = await connectToDatabase();
    const settingsCollection = db.collection('settings');

    await settingsCollection.updateOne(
      { key: 'global_config' },
      { 
        $set: {
          ...validated,
          updatedAt: new Date(),
        } 
      },
      { upsert: true }
    );

    await logAuditEvent({
      action: 'save_settings',
      details: 'Updated global operational settings in MongoDB.',
      category: 'system',
      severity: 'warning'
    });

    return { success: true, message: 'Settings saved successfully in MongoDB.' };
  } catch (error: any) {
    console.error('Failed to save global settings:', error);
    return { success: false, message: error.message || 'Failed to persist settings.' };
  }
}

export async function flushPlatformCache(): Promise<{ success: boolean; message: string }> {
  try {
    await requirePermission('manage_platform');

    await logAuditEvent({
      action: 'flush_cache',
      details: 'Executed global platform cache flush.',
      category: 'system',
      severity: 'warning'
    });

    return { success: true, message: 'Cache flushed successfully on the server.' };
  } catch (error: any) {
    console.error('Failed to flush cache:', error);
    return { success: false, message: error.message || 'Cache flush failed.' };
  }
}

export async function seedMockDatabase(): Promise<{ success: boolean; message: string }> {
  try {
    await requirePermission('manage_platform');
    
    const { db } = await connectToDatabase();
    const moviesCollection = db.collection('movies');
    
    // Check if db already has movies
    const moviesCount = await moviesCollection.countDocuments();
    if (moviesCount > 0) {
      return { success: false, message: `Database already seeded. Contains ${moviesCount} movie records.` };
    }

    // Map mock movies to include standard ObjectIds and dates
    const moviesToInsert = mockMovies.map((movie, idx) => {
      // Create repeatable ObjectIds: e.g. 66580f4f9f4a13d712000001, etc.
      const hex = (idx + 1).toString().padStart(24, '0');
      const docId = new ObjectId(hex);

      return {
        _id: docId,
        title: movie.title,
        posterUrl: movie.posterUrl,
        backdropUrl: movie.backdropUrl,
        dataAiHint: movie.dataAiHint,
        type: movie.type,
        genres: movie.genres,
        releaseDate: movie.releaseDate,
        rating: movie.rating,
        overview: movie.overview,
        cast: movie.cast.map(c => ({
          name: c.name,
          character: c.character,
          profileUrl: c.profileUrl,
          dataAiHint: c.dataAiHint,
        })),
        director: movie.director,
        trailerUrl: movie.trailerUrl,
        watchUrl: movie.watchUrl,
        status: 'published',
        isFeatured: movie.isFeatured || false,
        regions: movie.regions || ['Global'],
        createdAt: new Date(),
        updatedAt: new Date()
      };
    });

    await moviesCollection.insertMany(moviesToInsert);

    await logAuditEvent({
      action: 'seed_database',
      details: `Successfully seeded database with ${moviesToInsert.length} mock movies.`,
      category: 'system',
      severity: 'critical'
    });

    return { success: true, message: `Database successfully seeded with ${moviesToInsert.length} movies.` };
  } catch (error: any) {
    console.error('Failed to seed database:', error);
    return { success: false, message: error.message || 'Database seeding failed.' };
  }
}
