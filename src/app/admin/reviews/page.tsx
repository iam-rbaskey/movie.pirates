
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { getAllReviews, deleteReview } from '@/ai/flows/review-flow';
import type { ReviewOutput } from '@/ai/flows/review-flow';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Star, Trash2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import StarRating from '@/components/StarRating';
import TransitionLink from '@/components/TransitionLink';

export default function AdminReviewsPage() {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<ReviewOutput[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedReviews = await getAllReviews();
      setReviews(fetchedReviews);
    } catch (e: any) {
      const errorMessage = e.message || "Failed to fetch reviews.";
      setError(errorMessage);
      toast({ variant: "destructive", title: "Error", description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm("Are you sure you want to delete this review? This will also update the movie rating and user record.")) {
      return;
    }
    try {
      const result = await deleteReview({ reviewId });
      if (result.success) {
        toast({ title: "Success", description: result.message });
        setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      } else {
        toast({ variant: "destructive", title: "Error", description: result.message });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message || "Failed to delete review." });
    }
  };

  if (isLoading && reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 mt-4 text-lg text-muted-foreground">Loading reviews...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline flex items-center">
          <Star className="mr-3 h-8 w-8 text-primary" /> Review Management
        </h1>
        <Button onClick={fetchReviews} variant="outline" disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Refreshing...' : 'Refresh Reviews'}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error Loading Reviews</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!error && reviews.length === 0 && !isLoading && (
        <Alert>
          <AlertTitle>No Reviews Found</AlertTitle>
          <AlertDescription>There are no reviews in the system yet.</AlertDescription>
        </Alert>
      )}

      {!error && reviews.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>All Reviews ({reviews.length})</CardTitle>
            <CardDescription>Browse and manage all user-submitted reviews.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="hidden md:table-cell">Movie</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Comment</TableHead>
                  <TableHead className="hidden lg:table-cell">Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell className="hidden md:table-cell font-medium">
                      <TransitionLink href={`/movies/${review.movieId}`} className="hover:underline">
                        {review.movieTitle || 'Unknown Movie'}
                      </TransitionLink>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8 hidden sm:flex">
                          <AvatarImage src={review.userAvatarUrl ?? undefined} alt={review.userName} data-ai-hint={review.dataAiHintUser || 'user avatar'}/>
                          <AvatarFallback>{review.userName ? review.userName.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
                        </Avatar>
                        <span>{review.userName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StarRating initialRating={review.rating} readOnly size={14} />
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{review.comment}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {review.createdAt ? format(new Date(review.createdAt), 'MMM d, yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteReview(review.id)} title="Delete Review">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

    
