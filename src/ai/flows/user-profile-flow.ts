'use server';

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

export async function getUserProfile(input: GetUserProfileInput): Promise<UserProfileOutput | null> {
  const { userId } = input;
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
      reviews: augmentedReviews,
      ratingHistory: user.ratingHistory || [],
      role: (user.role as any) === 'admin' ? 'Admin' : ((user.role as any) === 'user' ? 'User' : (user.role || 'User')),
      hierarchyLevel: user.hierarchyLevel ?? 0,
      permissions: user.permissions || {},
      roleAssignedBy: user.roleAssignedBy || null,
      createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
      updatedAt: user.updatedAt ? new Date(user.updatedAt).toISOString() : null,
      lastSeen: user.lastSeen ? new Date(user.lastSeen).toISOString() : null,
      lastIp: user.lastIp || null,
      dataAiHint: user.dataAiHint || null,
    };
    
    return UserProfileOutputSchema.parse(userForOutput);

  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

export async function updateUserProfile(input: UpdateUserProfileInput): Promise<UpdateUserProfileOutput> {
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
          role: (result.role as any) === 'admin' ? 'Admin' : ((result.role as any) === 'user' ? 'User' : (result.role || 'User')),
          hierarchyLevel: result.hierarchyLevel ?? 0,
          permissions: result.permissions || {},
          roleAssignedBy: result.roleAssignedBy || null,
          createdAt: result.createdAt ? new Date(result.createdAt).toISOString() : null,
          updatedAt: result.updatedAt ? new Date(result.updatedAt).toISOString() : null,
          lastSeen: result.lastSeen ? new Date(result.lastSeen).toISOString() : null,
          lastIp: result.lastIp || null,
          dataAiHint: result.dataAiHint || null,
      };
      return { success: true, message: 'Profile updated successfully.', user: UserProfileOutputSchema.parse(updatedUserForOutput) };
    }
    return { success: false, message: 'Failed to update profile or user not found.' };

  } catch (error: any) {
    console.error('Error updating user profile:', error);
    return { success: false, message: error.message || 'An unexpected error occurred during profile update.' };
  }
}
