
'use server';
/**
 * @fileOverview User profile data flows (fetch and update) with MongoDB.
 *
 * - getUserProfile - Fetches user profile data.
 * - updateUserProfile - Updates user profile data.
 */

import { ai } from '@/ai/genkit';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { type Review, type UserProfile as DBUserProfile } from '@/types';
import { 
    GetUserProfileInputSchema,
    UpdateUserProfileInputSchema, 
    UpdateUserProfileOutputSchema,
    UserProfileOutputSchema,
    type GetUserProfileInput, 
    type UpdateUserProfileInput, 
    type UpdateUserProfileOutput, 
    type UserProfileOutput 
} from '@/ai/schemas/user-schemas';


// Get User Profile Flow
export async function getUserProfile(input: GetUserProfileInput): Promise<UserProfileOutput | null> {
  return getUserProfileFlow(input);
}

const getUserProfileFlow = ai.defineFlow(
  {
    name: 'getUserProfileFlow',
    inputSchema: GetUserProfileInputSchema,
    outputSchema: UserProfileOutputSchema.nullable(),
  },
  async ({ userId }) => {
    try {
      const { db } = await connectToDatabase();
      const usersCollection = db.collection<DBUserProfile>('users');
      const moviesCollection = db.collection('movies');

      if (!ObjectId.isValid(userId)) {
        console.error('Invalid ObjectId for userId:', userId);
        return null;
      }
      
      const user = await usersCollection.findOne({ _id: new ObjectId(userId) as any });

      if (!user) {
        return null;
      }

      // Augment reviews with movie data for performance optimization
      const augmentedReviews: Review[] = [];
      if (user.reviews && user.reviews.length > 0) {
        const movieIds = user.reviews.map(r => {
          try {
            return new ObjectId(r.movieId)
          } catch(e) { return null }
        }).filter((id): id is ObjectId => id !== null);

        const moviesForReviews = await moviesCollection.find({ _id: { $in: movieIds } }).toArray();
        const moviesMap = new Map(moviesForReviews.map(m => [m._id.toString(), m]));
        
        for (const review of user.reviews) {
          const movie = moviesMap.get(review.movieId);
          augmentedReviews.push({
            ...review,
            movieTitle: movie?.title,
            moviePosterUrl: movie?.posterUrl,
          });
        }
      }
      
      const userForOutput: UserProfileOutput = {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl || null,
        watchlist: user.watchlist || [],
        reviews: augmentedReviews, // Use augmented reviews
        ratingHistory: user.ratingHistory || [],
        role: user.role || 'user', // Ensure role is present, default to 'user' if missing
        dataAiHint: user.dataAiHint || null,
        lastSeen: user.lastSeen ? new Date(user.lastSeen).toISOString() : null,
      };
      
      return UserProfileOutputSchema.parse(userForOutput);

    } catch (error: any) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }
);

// Update User Profile Flow
export async function updateUserProfile(input: UpdateUserProfileInput): Promise<UpdateUserProfileOutput> {
  return updateUserProfileFlow(input);
}

const updateUserProfileFlow = ai.defineFlow(
  {
    name: 'updateUserProfileFlow',
    inputSchema: UpdateUserProfileInputSchema,
    outputSchema: UpdateUserProfileOutputSchema,
  },
  async (input) => {
    try {
      const { db } = await connectToDatabase();
      const usersCollection = db.collection<DBUserProfile>('users');

      const { userId, ...updateData } = input;

      if (!ObjectId.isValid(userId)) {
        return { success: false, message: 'Invalid User ID format.' };
      }

      const fieldsToUpdate: Partial<Pick<DBUserProfile, 'name' | 'email' | 'avatarUrl'>> = {};
      if (updateData.name) fieldsToUpdate.name = updateData.name;
      if (updateData.email) fieldsToUpdate.email = updateData.email;
      if (updateData.avatarUrl !== undefined) fieldsToUpdate.avatarUrl = updateData.avatarUrl ?? undefined;


      if (Object.keys(fieldsToUpdate).length === 0) {
        return { success: false, message: 'No update data provided.' };
      }

      const result = await usersCollection.findOneAndUpdate(
        { _id: new ObjectId(userId) as any },
        { $set: fieldsToUpdate },
        { returnDocument: 'after' }
      );

      if (result) {
         const updatedUserForOutput: UserProfileOutput = {
            id: result._id.toString(),
            name: result.name,
            email: result.email,
            avatarUrl: result.avatarUrl || null,
            watchlist: result.watchlist || [],
            reviews: result.reviews || [],
            ratingHistory: result.ratingHistory || [],
            role: result.role || 'user',
            dataAiHint: result.dataAiHint || null,
            lastSeen: result.lastSeen ? new Date(result.lastSeen).toISOString() : null,
        };
        return { success: true, message: 'Profile updated successfully.', user: UserProfileOutputSchema.parse(updatedUserForOutput) };
      }
      return { success: false, message: 'Failed to update profile or user not found.' };

    } catch (error: any) {
      console.error('Error updating user profile:', error);
      return { success: false, message: error.message || 'An unexpected error occurred during profile update.' };
    }
  }
);
