"use client";

import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { recommendMovies, type RecommendMoviesInput, type RecommendMoviesOutput } from '@/ai/flows/movie-recommendation';
import { Loader2, PlusCircle, Trash2, Wand2, Film } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import MovieCard from '@/components/MovieCard';
import type { MovieOutput } from '@/ai/schemas/movie-schemas';

const viewingHistorySchema = z.object({
  movieTitle: z.string().min(1, "Movie title is required"),
  rating: z.coerce.number().min(1, "Min rating is 1").max(10, "Max rating is 10"),
});

const recommendMoviesFormSchema = z.object({
  userViewingHistory: z.array(viewingHistorySchema).min(1, "At least one movie history entry is required"),
  genres: z.string().optional().transform(val => val ? val.split(',').map(g => g.trim()).filter(g => g) : undefined),
  releaseYear: z.coerce.number().optional().transform(val => (val && !isNaN(val) ? val : undefined)),
});

type RecommendMoviesFormValues = z.infer<typeof recommendMoviesFormSchema>;

export default function MovieRecommendationPage() {
  const [recommendations, setRecommendations] = useState<RecommendMoviesOutput['movieRecommendations'] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<RecommendMoviesFormValues>({
    resolver: zodResolver(recommendMoviesFormSchema),
    defaultValues: {
      userViewingHistory: [{ movieTitle: '', rating: 7 }],
      genres: '' as any,
      releaseYear: undefined,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "userViewingHistory",
  });

  const onSubmit = async (data: RecommendMoviesFormValues) => {
    setIsLoading(true);
    setError(null);
    setRecommendations(null);

    try {
      const releaseYear = data.releaseYear && !isNaN(data.releaseYear) ? Number(data.releaseYear) : undefined;

      const aiInput: RecommendMoviesInput = {
        userViewingHistory: data.userViewingHistory,
        genres: data.genres,
        releaseYear: releaseYear,
      };
      const result = await recommendMovies(aiInput);
      setRecommendations(result.movieRecommendations);
      if (result.movieRecommendations.length === 0) {
        toast({
          title: "No Matches Found",
          description: "We couldn't find movies in our database for the AI's suggestions. Try different preferences.",
        });
      }
    } catch (e: any) {
      console.error("Error fetching recommendations:", e);
      setError(e.message || "Failed to get recommendations.");
      toast({
        variant: "destructive",
        title: "Error",
        description: e.message || "Failed to get recommendations. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in py-8">
      <header className='text-center'>
        <h1 className="text-3xl sm:text-4xl font-bold font-headline flex items-center justify-center">
          <Wand2 className="mr-2 sm:mr-3 h-7 w-7 sm:h-8 sm:w-8 text-primary" /> AI Movie Recommendations
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base mt-2">
          Tell us what you like, and we&apos;ll suggest movies you might enjoy!
        </p>
      </header>

      <Card className="shadow-lg max-w-4xl mx-auto bg-card">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl font-headline">Your Preferences</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Add movies you&apos;ve watched and rated (use exact titles for best results), and optionally specify genres or release year.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-md sm:text-lg font-medium mb-2 block">Viewing History</Label>
                {fields.map((item, index) => (
                  <div key={item.id} className="flex flex-col sm:flex-row sm:items-end space-y-2 sm:space-y-0 sm:space-x-2 mb-3 p-3 border rounded-md bg-secondary/30">
                    <FormField
                      control={form.control}
                      name={`userViewingHistory.${index}.movieTitle`}
                      render={({ field }) => (
                        <FormItem className="flex-grow w-full sm:w-auto">
                          <FormLabel className="text-xs sm:text-sm">Movie Title</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Inception" {...field} className="text-sm sm:text-base bg-input" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`userViewingHistory.${index}.rating`}
                      render={({ field }) => (
                        <FormItem className="w-full sm:w-auto">
                          <FormLabel className="text-xs sm:text-sm">Rating (1-10)</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" max="10" {...field} className="text-sm sm:text-base bg-input" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      disabled={fields.length <= 1}
                      className="text-destructive hover:bg-destructive/10 self-end sm:self-center"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                ))}
                {form.formState.errors.userViewingHistory && typeof form.formState.errors.userViewingHistory !== 'object' && (
                  <p className="text-sm font-medium text-destructive">{(form.formState.errors.userViewingHistory as any)?.message || (form.formState.errors.userViewingHistory as any)?.root?.message}</p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => append({ movieTitle: '', rating: 7 })}
                  className="mt-2 text-sm sm:text-base"
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Movie
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <FormField
                  control={form.control}
                  name="genres"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Preferred Genres (comma-separated)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Sci-Fi, Action, Comedy" {...field} value={field.value ?? ""} className="text-sm sm:text-base bg-input" />
                      </FormControl>
                      <FormDescription className="text-xs sm:text-sm">Optional. Helps narrow down recommendations.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="releaseYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Release Year</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 2020"
                          {...field}
                          value={field.value ?? ""}
                          onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
                          className="text-sm sm:text-base bg-input"
                        />
                      </FormControl>
                      <FormDescription className="text-xs sm:text-sm">Optional. Consider movies around this year.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading} size="lg">
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Getting Recommendations...</>
                ) : (
                  <><Wand2 className="mr-2 h-4 w-4" /> Get Recommendations</>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      {error && (
        <Alert variant="destructive" className="mt-6 max-w-4xl mx-auto">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {recommendations && recommendations.length > 0 && (
        <section className="mt-10">
          <h2 className="text-2xl sm:text-3xl font-bold font-headline mb-6 text-center">Here are your recommendations!</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {recommendations.map((rec) => (
              <div key={rec.movie.id} className="flex flex-col">
                <MovieCard movie={rec.movie} />
                <div className="mt-2 p-2 text-xs rounded-b-lg bg-card">
                  <p className="font-semibold text-primary mb-1">Why you might like it:</p>
                  <p className="text-muted-foreground text-xs line-clamp-3">{rec.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {recommendations && recommendations.length === 0 && !isLoading && !error && (
        <Alert className="mt-6 max-w-4xl mx-auto">
          <Film className="h-4 w-4" />
          <AlertTitle>No Specific Recommendations Found</AlertTitle>
          <AlertDescription>We couldn&apos;t find specific movies in our database based on the AI&apos;s suggestions. Try broadening your preferences or adding more viewing history.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
