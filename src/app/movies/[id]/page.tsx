
"use server";

import * as React from 'react';
import { getMovieById } from '@/ai/flows/movie-management-flow';
import { getReviewsByMovieId } from '@/ai/flows/review-flow';
import type { ReviewOutput } from '@/ai/schemas/review-schemas';
import MovieDetailView from '@/components/MovieDetailView';
import { notFound } from 'next/navigation';

// This defines the correct props structure for a dynamic page in the App Router.
type MovieDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function MovieDetailPage(props: MovieDetailPageProps) {
  const params = await props.params;

  if (!params.id) {
    notFound();
  }

  // Fetch data on the server
  const movie = await getMovieById({ movieId: params.id });

  // If no movie is found, render the 404 page
  if (!movie) {
    notFound();
  }

  const reviews: ReviewOutput[] = await getReviewsByMovieId({ movieId: params.id });

  // Render the client component with the fetched data
  return <MovieDetailView movie={movie} reviews={reviews} />;
}
