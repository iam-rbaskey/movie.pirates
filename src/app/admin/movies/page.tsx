"use client";

import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addMovie, getMovies, deleteMovie, updateMovie, type MovieCreateInput, type MovieOutput, type UpdateMovieInput } from '@/ai/flows/movie-management-flow';
import { MovieCreateInputSchema } from '@/ai/schemas/movie-schemas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, Edit, Film, Search } from 'lucide-react';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function AdminMoviesPage() {
  const { toast } = useToast();
  const [movies, setMovies] = useState<MovieOutput[]>([]);
  const [isLoadingMovies, setIsLoadingMovies] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState<MovieOutput | null>(null);
  const [searchTerm, setSearchTerm] = useState('');


  const form = useForm<MovieCreateInput>({
    resolver: zodResolver(MovieCreateInputSchema),
    defaultValues: {
      title: '',
      posterUrl: '',
      type: 'movie',
      backdropUrl: '',
      genres: [],
      releaseDate: new Date().toISOString().split('T')[0],
      overview: '',
      cast: [],
      director: '',
      trailerUrl: '',
      watchUrl: '',
      dataAiHint: 'movie still',
      rating: 0,
      episodes: [],
    },
  });

  const { fields: genreFields, append: appendGenre, remove: removeGenre } = useFieldArray({
    control: form.control,
    name: "genres" as any,
  });

  const { fields: castFields, append: appendCast, remove: removeCast } = useFieldArray({
    control: form.control,
    name: "cast",
  });

  const { fields: episodeFields, append: appendEpisode, remove: removeEpisode } = useFieldArray({
    control: form.control,
    name: "episodes",
  });

  const contentType = form.watch('type');

  const fetchMovies = async () => {
    setIsLoadingMovies(true);
    setError(null);
    try {
      const fetchedMovies = await getMovies();
      setMovies(fetchedMovies);
    } catch (e: any) {
      setError(e.message || "Failed to fetch movies.");
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsLoadingMovies(false);
    }
  };

  useEffect(() => {
    fetchMovies();
  }, []);

  const handleEditClick = (movie: MovieOutput) => {
    setEditingMovie(movie);
    const releaseDate = movie.releaseDate ? new Date(movie.releaseDate).toISOString().split('T')[0] : '';
    const castData = movie.cast && movie.cast.length > 0 ? movie.cast : [];
    const genreData = movie.genres && movie.genres.length > 0 ? movie.genres : [];
    const episodeData = movie.episodes && movie.episodes.length > 0 ? movie.episodes : [];

    form.reset({
      ...movie,
      type: movie.type || 'movie',
      releaseDate,
      cast: castData,
      genres: genreData,
      episodes: episodeData,
    });
    setIsFormOpen(true);
  };

  const handleAddNewClick = () => {
    setEditingMovie(null);
    form.reset({
      title: '',
      posterUrl: '',
      type: 'movie',
      backdropUrl: '',
      genres: [],
      releaseDate: new Date().toISOString().split('T')[0],
      overview: '',
      cast: [],
      director: '',
      trailerUrl: '',
      watchUrl: '',
      dataAiHint: 'movie still',
      rating: 0,
      episodes: [],
    });
    setIsFormOpen(true);
  };

  const onSubmit = async (data: MovieCreateInput) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {
        ...data,
        genres: (data.genres || []).map(g => typeof g === 'string' ? g.trim() : '').filter(Boolean),
        cast: (data.cast || []).filter(c => c.name && c.name.trim()),
        rating: data.rating ?? 0,
        episodes: data.type === 'series'
          ? (data.episodes || []).filter(ep => ep.title?.trim() && (ep.downloadUrl?.trim() || ep.watchUrl?.trim()))
          : undefined,
      };

      let result;
      if (editingMovie) {
        const updatePayload: UpdateMovieInput = { ...payload, movieId: editingMovie.id };
        result = await updateMovie(updatePayload);
      } else {
        result = await addMovie(payload);
      }

      if (result.success) {
        toast({ title: "Success", description: result.message });
        setIsFormOpen(false);
        setEditingMovie(null);
        await fetchMovies();
      } else {
        setError(result.message);
        toast({ variant: "destructive", title: "Error", description: result.message });
      }
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred.");
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMovie = async (movieId: string) => {
    setIsDeleting(true);
    try {
      const result = await deleteMovie({ movieId });
      if (result.success) {
        toast({ title: "Success", description: result.message });
        await fetchMovies();
      } else {
        toast({ variant: "destructive", title: "Error", description: result.message });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message || "Failed to delete movie." });
    } finally {
      setIsDeleting(false);
    }
  };

  const getSanitizedUrl = (movie: MovieOutput) => {
    const url = movie.posterUrl;
    if (!url || url.includes('/title/') || url.includes('/name/') || !url.startsWith('http')) {
      return `https://placehold.co/100x150.png?text=${encodeURIComponent(movie.title)}`;
    }
    return url;
  };

  const isGDriveUrl = (url?: string) => {
    return !!(url && (url.includes('drive.google.com') || url.includes('docs.google.com')));
  };

  const getGDriveStatusBadge = (movie: MovieOutput) => {
    if (movie.type === 'movie') {
      if (isGDriveUrl(movie.watchUrl)) {
        return <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 hover:bg-emerald-500/15">Active GDrive</Badge>;
      } else {
        return <Badge className="bg-red-500/10 text-red-500 border border-red-500/25 hover:bg-red-500/15 font-semibold">Missing Link</Badge>;
      }
    } else {
      const eps = movie.episodes || [];
      if (eps.length === 0) {
        return <Badge className="bg-red-500/10 text-red-500 border border-red-500/25 hover:bg-red-500/15 font-semibold">No Episodes</Badge>;
      }
      const withLink = eps.filter(ep => isGDriveUrl(ep.watchUrl)).length;
      if (withLink === eps.length) {
        return <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 hover:bg-emerald-500/15">All Active</Badge>;
      } else if (withLink > 0) {
        return <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/25 hover:bg-amber-500/15">Partial ({withLink}/{eps.length})</Badge>;
      } else {
        return <Badge className="bg-red-500/10 text-red-500 border border-red-500/25 hover:bg-red-500/15 font-semibold">Missing Link</Badge>;
      }
    }
  };

  const filteredMovies = movies.filter(movie =>
    movie.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoadingMovies) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading content...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold font-headline flex items-center"><Film className="mr-2 sm:mr-3 h-7 w-7 sm:h-8 sm:w-8 text-primary" />Content Management</h1>
        <Dialog open={isFormOpen} onOpenChange={(open) => {
          if (!open) setEditingMovie(null);
          setIsFormOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button onClick={handleAddNewClick} className="w-full sm:w-auto"><PlusCircle className="mr-2 h-4 w-4" />Add New Content</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl font-headline">{editingMovie ? 'Edit Content' : 'Add New Content'}</DialogTitle>
              <DialogDescription className="text-sm sm:text-base">{editingMovie ? 'Update the details for this content.' : 'Fill in the details for the new content.'}</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-y-hidden">
                <div className="flex-1 overflow-y-auto space-y-4 p-1 pr-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Content Type</FormLabel>
                          <FormDescription>
                            Toggle between Movie and Series.
                          </FormDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className={cn(field.value === 'movie' ? 'text-foreground' : 'text-muted-foreground')}>Movie</Label>
                          <FormControl>
                            <Switch
                              checked={field.value === 'series'}
                              onCheckedChange={(checked) => {
                                field.onChange(checked ? 'series' : 'movie');
                              }}
                            />
                          </FormControl>
                          <Label className={cn(field.value === 'series' ? 'text-foreground' : 'text-muted-foreground')}>Series</Label>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="Content Title" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="posterUrl" render={({ field }) => (
                    <FormItem><FormLabel>Poster URL</FormLabel><FormControl><Input placeholder="https://..." {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="backdropUrl" render={({ field }) => (
                    <FormItem><FormLabel>Backdrop URL (Optional)</FormLabel><FormControl><Input placeholder="https://..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="overview" render={({ field }) => (
                    <FormItem><FormLabel>Overview</FormLabel><FormControl><Textarea placeholder="Content overview..." {...field} rows={3} /></FormControl><FormMessage /></FormItem>
                  )} />

                  <div>
                    <Label className="mb-2 block">Genres</Label>
                    {genreFields.map((field, index) => (
                      <div key={field.id} className="flex items-center space-x-2 mb-2">
                        <FormField control={form.control} name={`genres.${index}`} render={({ field: itemField }) => (
                          <FormItem className="flex-grow"><FormControl><Input placeholder={`Genre ${index + 1}`} {...itemField} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeGenre(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => appendGenre('')}><PlusCircle className="mr-2 h-4 w-4" />Add Genre</Button>
                    <FormMessage>{form.formState.errors.genres?.root?.message || form.formState.errors.genres?.message}</FormMessage>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="releaseDate" render={({ field }) => (
                      <FormItem><FormLabel>Release Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField
                      control={form.control}
                      name="rating"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Initial Rating (0-10)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              max="10"
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                field.onChange(val === '' ? undefined : parseFloat(val));
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField control={form.control} name="director" render={({ field }) => (
                    <FormItem><FormLabel>Director</FormLabel><FormControl><Input placeholder="Director Name" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="trailerUrl" render={({ field }) => (
                    <FormItem><FormLabel>Trailer URL</FormLabel><FormControl><Input placeholder="https://www.youtube.com/..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="watchUrl" render={({ field }) => (
                    <FormItem><FormLabel>Watch URL</FormLabel><FormControl><Input placeholder="https://..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                  )} />

                  <div>
                    <Label className="mb-2 block">Cast</Label>
                    {castFields.map((field, index) => (
                      <Card key={field.id} className="mb-3 p-3 space-y-2 bg-secondary/30">
                        <div className="flex justify-between items-center">
                          <p className="font-medium text-sm">Cast Member {index + 1}</p>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeCast(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                        <FormField control={form.control} name={`cast.${index}.name`} render={({ field: itemField }) => (
                          <FormItem><FormLabel className="text-xs">Name</FormLabel><FormControl><Input placeholder="Actor Name" {...itemField} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name={`cast.${index}.character`} render={({ field: itemField }) => (
                          <FormItem><FormLabel className="text-xs">Character</FormLabel><FormControl><Input placeholder="Character Name" {...itemField} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name={`cast.${index}.profileUrl`} render={({ field: itemField }) => (
                          <FormItem><FormLabel className="text-xs">Profile URL (Optional)</FormLabel><FormControl><Input placeholder="https://..." {...itemField} value={itemField.value ?? ''} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </Card>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => appendCast({ name: '', character: '', profileUrl: '', dataAiHint: 'actor headshot' })}><PlusCircle className="mr-2 h-4 w-4" />Add Cast Member</Button>
                    <FormMessage>{form.formState.errors.cast?.root?.message || form.formState.errors.cast?.message}</FormMessage>
                  </div>

                  {contentType === 'series' && (
                    <div>
                      <Label className="mb-2 block">Episodes</Label>
                      {episodeFields.map((field, index) => (
                        <Card key={field.id} className="mb-3 p-3 space-y-2 bg-secondary/30">
                          <div className="flex justify-between items-center">
                            <p className="font-medium text-sm">Episode {index + 1}</p>
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeEpisode(index)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                          <FormField
                            control={form.control}
                            name={`episodes.${index}.title`}
                            render={({ field: itemField }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Title</FormLabel>
                                <FormControl>
                                  <Input placeholder="Episode Title" {...itemField} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`episodes.${index}.downloadUrl`}
                            render={({ field: itemField }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Download URL (Optional)</FormLabel>
                                <FormControl>
                                  <Input placeholder="https://..." {...itemField} value={itemField.value ?? ''} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`episodes.${index}.watchUrl`}
                            render={({ field: itemField }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Watch URL</FormLabel>
                                <FormControl>
                                  <Input placeholder="https://..." {...itemField} value={itemField.value ?? ''} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </Card>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => appendEpisode({ title: '', downloadUrl: '', watchUrl: '' })}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Episode
                      </Button>
                      <FormMessage>{form.formState.errors.episodes?.root?.message || form.formState.errors.episodes?.message}</FormMessage>
                    </div>
                  )}

                  <FormField control={form.control} name="dataAiHint" render={({ field }) => (
                    <FormItem><FormLabel>Image Hint (Optional)</FormLabel><FormControl><Input placeholder="e.g. space opera" {...field} value={field.value ?? ''} /></FormControl><FormDescription className="text-xs sm:text-sm">Keyword for AI image placeholder services.</FormDescription><FormMessage /></FormItem>
                  )} />
                </div>
                {error && <Alert variant="destructive" className="mt-2"><AlertDescription>{error}</AlertDescription></Alert>}
                <DialogFooter className="flex-col sm:flex-row pt-4 mt-auto border-t">
                  <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSubmitting} className="w-full sm:w-auto">Cancel</Button>
                  <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingMovie ? 'Save Changes' : 'Add Content'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {movies.length === 0 && !isLoadingMovies && !error && (
        <Alert>
          <AlertTitle>No Content Found</AlertTitle>
          <AlertDescription>There is no content in the database yet. Add some using the button above!</AlertDescription>
        </Alert>
      )}
      {error && !isLoadingMovies && (
        <Alert variant="destructive">
          <AlertTitle>Error Loading Content</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {movies.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Existing Content ({movies.length})</CardTitle>
            <CardDescription>List of all movies and series currently in the database.</CardDescription>
            <div className="relative pt-4">
              <Search className="absolute left-2.5 top-6 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search content by title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-full sm:max-w-xs"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px] sm:w-[80px]">Poster</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="hidden sm:table-cell">Type</TableHead>
                    <TableHead className="hidden sm:table-cell">GDrive Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Director</TableHead>
                    <TableHead className="hidden md:table-cell">Release Date</TableHead>
                    <TableHead className="hidden sm:table-cell">Rating</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovies.length > 0 ? (
                    filteredMovies.map((movie) => (
                      <TableRow key={movie.id}>
                        <TableCell>
                          <Image src={getSanitizedUrl(movie)} alt={movie.title} width={50} height={75} className="rounded min-w-[50px] object-cover" data-ai-hint={movie.dataAiHint || "movie poster"} />
                        </TableCell>
                        <TableCell className="font-medium whitespace-nowrap">{movie.title}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant={movie.type === 'series' ? 'secondary' : 'outline'}>
                            {movie.type.charAt(0).toUpperCase() + movie.type.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {getGDriveStatusBadge(movie)}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell whitespace-nowrap">{movie.director}</TableCell>
                        <TableCell className="hidden md:table-cell whitespace-nowrap">{movie.releaseDate ? new Date(movie.releaseDate).toLocaleDateString() : 'N/A'}</TableCell>
                        <TableCell className="hidden sm:table-cell">{movie.rating.toFixed(1)}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditClick(movie)}><Edit className="h-4 w-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" disabled={isDeleting}>
                                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the content "{movie.title}".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteMovie(movie.id)} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                  {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        No results found for "{searchTerm}".
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
