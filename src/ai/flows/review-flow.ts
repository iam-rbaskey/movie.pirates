'use server';

import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { 
  ReviewSchema, 
  GetReviewsInputSchema, 
  AddReviewInputSchema, 
  AddReviewOutputSchema,
  DeleteReviewInputSchema,
  DeleteReviewOutputSchema,
  type ReviewOutput, 
  type GetReviewsInput,
  type AddReviewInput,
  type AddReviewOutput,
  type DeleteReviewInput,
  type DeleteReviewOutput
} from '@/ai/schemas/review-schemas';

import { verifyAuth } from '@/lib/auth';

export type { ReviewOutput };

export async function addReview(input: AddReviewInput): Promise<AddReviewOutput> {
  try {
    const caller = await verifyAuth();
    if (!caller) {
      return { success: false, message: 'Unauthorized: Active session required.' };
    }

    const { db } = await connectToDatabase();
    const reviewsCollection = db.collection('reviews');
    const moviesCollection = db.collection('movies');
    const usersCollection = db.collection('users');

    const { movieId, rating, comment } = input;
    const userId = caller.userId;

    if (!ObjectId.isValid(movieId) || !ObjectId.isValid(userId)) {
      return { success: false, message: 'Invalid movie or user ID.' };
    }

    // Check if movie exists
    const movie = await moviesCollection.findOne({ _id: new ObjectId(movieId) });
    if (!movie) {
      return { success: false, message: 'Movie not found.' };
    }

    // Check if user exists
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) as any });
    if (!user) {
      return { success: false, message: 'User not found.' };
    }

    const userName = user.name;
    const userAvatarUrl = user.avatarUrl || null;

    // Create review document
    const reviewDoc = {
      movieId,
      userId: new ObjectId(userId),
      userName,
      userAvatarUrl,
      rating,
      comment,
      createdAt: new Date(),
    };

    const result = await reviewsCollection.insertOne(reviewDoc);
    const insertedId = result.insertedId.toString();

    // Create output object matching ReviewSchema
    const finalReview = {
      id: insertedId,
      movieId,
      userId,
      userName,
      userAvatarUrl,
      rating,
      comment,
      createdAt: reviewDoc.createdAt.toISOString(),
      movieTitle: movie.title,
      moviePosterUrl: movie.posterUrl,
    };

    // Push to user's reviews list in DB
    await usersCollection.updateOne(
      { _id: new ObjectId(userId) as any },
      { 
        $push: { 
          reviews: {
            id: insertedId,
            movieId,
            userId,
            userName,
            userAvatarUrl,
            rating,
            comment,
            createdAt: reviewDoc.createdAt.toISOString(),
          } as any
        } 
      }
    );

    // Recalculate average rating for the movie
    const allReviewsForMovie = await reviewsCollection.find({ movieId }).toArray();
    let avgRating = rating; 
    if (allReviewsForMovie.length > 0) {
      const totalRating = allReviewsForMovie.reduce((sum, r) => sum + r.rating, 0);
      avgRating = totalRating / allReviewsForMovie.length;
    }

    // Update movie rating
    await moviesCollection.updateOne(
      { _id: new ObjectId(movieId) },
      { $set: { rating: avgRating } }
    );

    return {
      success: true,
      message: 'Review submitted successfully!',
      review: finalReview,
    };

  } catch (e: any) {
    console.error('Error adding review:', e);
    return { success: false, message: e.message || 'An unexpected error occurred.' };
  }
}

export async function deleteReview(input: DeleteReviewInput): Promise<DeleteReviewOutput> {
  const { reviewId } = input;
  try {
    const caller = await verifyAuth();
    if (!caller) {
      return { success: false, message: 'Unauthorized: Active session required.' };
    }

    if (!ObjectId.isValid(reviewId)) {
      return { success: false, message: 'Invalid review ID format.' };
    }

    const { db } = await connectToDatabase();
    const reviewsCollection = db.collection('reviews');
    const moviesCollection = db.collection('movies');
    const usersCollection = db.collection('users');

    // Find the review to get movieId and userId before deleting
    const review = await reviewsCollection.findOne({ _id: new ObjectId(reviewId) });
    if (!review) {
      return { success: false, message: 'Review not found.' };
    }

    const { movieId, userId } = review;

    // Ensure caller is owner or admin
    const isOwner = userId.toString() === caller.userId;
    const isAdmin = ['admin', 'Commander', 'Admin'].includes(caller.role);
    if (!isOwner && !isAdmin) {
      return { success: false, message: 'Forbidden: You cannot delete another user\'s review.' };
    }

    // Delete from reviews collection
    const deleteResult = await reviewsCollection.deleteOne({ _id: new ObjectId(reviewId) });
    if (deleteResult.deletedCount !== 1) {
      return { success: false, message: 'Failed to delete review from reviews collection.' };
    }

    // Pull from user's reviews list
    await usersCollection.updateOne(
      { _id: new ObjectId(userId) as any },
      { $pull: { reviews: { id: reviewId } as any } }
    );

    // Recalculate average rating for the movie
    const allReviewsForMovie = await reviewsCollection.find({ movieId }).toArray();
    let avgRating = 0;
    if (allReviewsForMovie.length > 0) {
      const totalRating = allReviewsForMovie.reduce((sum, r) => sum + r.rating, 0);
      avgRating = totalRating / allReviewsForMovie.length;
    }

    // Update movie rating
    await moviesCollection.updateOne(
      { _id: new ObjectId(movieId) },
      { $set: { rating: avgRating } }
    );

    return { success: true, message: 'Review deleted successfully.' };

  } catch (e: any) {
    console.error('Error deleting review:', e);
    return { success: false, message: e.message || 'An unexpected error occurred.' };
  }
}

export async function getReviewsByMovieId(input: GetReviewsInput): Promise<ReviewOutput[]> {
  const { movieId } = input;
  try {
    if (!ObjectId.isValid(movieId)) {
      return [];
    }
    const { db } = await connectToDatabase();
    const reviewsCollection = db.collection('reviews');
    const moviesCollection = db.collection('movies');

    const reviewsFromDb = await reviewsCollection
      .find({ movieId: movieId })
      .sort({ createdAt: -1 })
      .toArray();

    if (!reviewsFromDb || reviewsFromDb.length === 0) {
      return [];
    }

    const movie = await moviesCollection.findOne({ _id: new ObjectId(movieId) });

    const reviewsForOutput: ReviewOutput[] = reviewsFromDb.map(doc => ({
      id: doc._id.toString(),
      movieId: doc.movieId,
      userId: doc.userId.toString(),
      userName: doc.userName,
      userAvatarUrl: doc.userAvatarUrl || null,
      rating: doc.rating,
      comment: doc.comment,
      createdAt: new Date(doc.createdAt).toISOString(),
      dataAiHintUser: doc.dataAiHintUser || null,
      movieTitle: movie?.title,
      moviePosterUrl: movie?.posterUrl,
    }));

    return reviewsForOutput;
  } catch (error: any) {
    console.error(`Error fetching reviews for movie ${movieId}:`, error);
    return [];
  }
}

export async function getAllReviews(): Promise<ReviewOutput[]> {
  try {
    const { db } = await connectToDatabase();
    const reviewsCollection = db.collection('reviews');

    const reviewsFromDb = await reviewsCollection
      .find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    if (!reviewsFromDb || reviewsFromDb.length === 0) {
      return [];
    }

    const movieIds = [...new Set(reviewsFromDb.map(r => r.movieId).filter(Boolean))].map(id => {
      try {
        return new ObjectId(id);
      } catch {
        return null;
      }
    }).filter((id): id is ObjectId => id !== null);

    const moviesCollection = db.collection('movies');
    const movies = await moviesCollection.find({ _id: { $in: movieIds } }).toArray();
    const moviesMap = new Map(movies.map(m => [m._id.toString(), m]));

    const reviewsForOutput: ReviewOutput[] = reviewsFromDb.map(doc => {
      const movie = moviesMap.get(doc.movieId);
      return {
        id: doc._id.toString(),
        movieId: doc.movieId,
        userId: doc.userId.toString(),
        userName: doc.userName,
        userAvatarUrl: doc.userAvatarUrl || null,
        rating: doc.rating,
        comment: doc.comment,
        createdAt: new Date(doc.createdAt).toISOString(),
        dataAiHintUser: doc.dataAiHintUser || null,
        movieTitle: movie?.title || 'Unknown Movie',
        moviePosterUrl: movie?.posterUrl,
      };
    });

    return reviewsForOutput;
  } catch (error: any) {
    console.error(`Error fetching all reviews:`, error);
    return [];
  }
}
