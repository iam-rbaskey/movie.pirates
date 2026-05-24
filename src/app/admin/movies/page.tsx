"use client";

import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addMovie, getMovies, deleteMovie, updateMovie, type MovieCreateInput, type MovieOutput, type UpdateMovieInput } from '@/ai/flows/movie-management-flow';
import { MovieCreateInputSchema } from '@/ai/schemas/movie-schemas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, Edit, Film, Search, Eye, Filter, ArrowUpDown } from 'lucide-react';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function AdminMoviesPage() {
  const { toast } = useToast();
  const [movies, setMovies] = useState<MovieOutput[]>([]);
  const [isLoadingMovies, setIsLoadingMovies] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState<MovieOutput | null>(null);

  // Filter and telemetry states
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // all, movies, series, docs, shorts, others
  const [typeFilter, setTypeFilter] = useState('all'); // all, movie, series
  const [statusFilter, setStatusFilter] = useState('all'); // all, published, draft
  const [sortBy, setSortBy] = useState('newest'); // newest, rating, title
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

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

  // Helper mappings for the table columns
  const getReleaseYear = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).getFullYear().toString();
    } catch {
      return 'N/A';
    }
  };

    const getStableDuration = (movie: MovieOutput) => {
    if (movie.type === 'series' && movie.episodes && movie.episodes.length > 0) {
      return `${movie.episodes.length} eps`;
    }
    return '—';
  };

  const getStableViews = (movie: MovieOutput) => {
    return '—';
  };

  const getStatus = (movie: MovieOutput) => {
    // Published if stream watchUrl exists, draft otherwise
    return !!movie.watchUrl;
  };

  // Combined Filtering and Sorting logic
  const filteredMovies = movies.filter(movie => {
    // 1. Search Filter
    const matchesSearch = movie.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (movie.director || '').toLowerCase().includes(searchTerm.toLowerCase());

    // 2. Tab Filter
    let matchesTab = true;
    if (activeTab === 'movies') matchesTab = movie.type === 'movie';
    else if (activeTab === 'series') matchesTab = movie.type === 'series';
    else if (activeTab === 'docs') matchesTab = movie.genres.some(g => g.toLowerCase().includes('documentary'));
    else if (activeTab === 'shorts') matchesTab = movie.genres.some(g => g.toLowerCase().includes('short'));
    else if (activeTab === 'others') matchesTab = !movie.type || (movie.type !== 'movie' && movie.type !== 'series');

    // 3. Dropdown Type Filter
    let matchesDropdownType = true;
    if (typeFilter !== 'all') {
      matchesDropdownType = movie.type === typeFilter;
    }

    // 4. Status Filter
    const isPublished = getStatus(movie);
    let matchesStatus = true;
    if (statusFilter === 'published') matchesStatus = isPublished;
    else if (statusFilter === 'draft') matchesStatus = !isPublished;

    return matchesSearch && matchesTab && matchesDropdownType && matchesStatus;
  }).sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.releaseDate || 0).getTime() - new Date(a.releaseDate || 0).getTime();
    }
    if (sortBy === 'rating') {
      return (b.rating || 0) - (a.rating || 0);
    }
    if (sortBy === 'title') {
      return a.title.localeCompare(b.title);
    }
    return 0;
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredMovies.length / itemsPerPage);
  const paginatedMovies = filteredMovies.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab, typeFilter, statusFilter, sortBy]);

  if (isLoadingMovies) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-[#FF5A5F]" />
          <p className="text-sm font-semibold tracking-widest text-[#A1A1A1] uppercase animate-pulse">Synchronizing database assets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold font-headline flex items-center text-white uppercase tracking-wider">
            <Film className="mr-3 h-8 w-8 text-[#FF5A5F]" /> Contents Management
          </h1>
          <p className="text-xs md:text-sm text-[#A1A1A1] font-medium mt-1">
            Manage, catalog, configure stream links, and edit movies and series.
          </p>
        </div>

        {/* Dialog triggered Add Button */}
        <Dialog open={isFormOpen} onOpenChange={(open) => {
          if (!open) setEditingMovie(null);
          setIsFormOpen(open);
        }}>
          <Button 
            onClick={handleAddNewClick} 
            className="w-full md:w-auto bg-[#FF5A5F] hover:bg-[#FF6F73] text-white font-bold rounded-2xl py-6 px-6 text-xs uppercase tracking-wider shadow-[0_4px_20px_rgba(255,90,95,0.25)] border border-[#FF5A5F]/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Content
          </Button>
          
          {/* Add / Edit Dialog Wrapper */}
          <DialogContent className="max-w-[620px] max-h-[90vh] bg-[#0D0D0D]/95 border border-white/10 text-white rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-[24px] flex flex-col overflow-hidden">
            <DialogHeader className="p-6 pb-2">
              <DialogTitle className="text-lg md:text-xl font-bold font-headline uppercase tracking-wider text-white">
                {editingMovie ? 'Edit Catalog Content' : 'Add Catalog Content'}
              </DialogTitle>
              <DialogDescription className="text-xs text-[#A1A1A1] font-medium">
                {editingMovie ? 'Modify the properties and details of this content.' : 'Fill in the cataloging properties to index the new content.'}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto px-6 py-2 space-y-5 scrollbar-hide">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-white">Content Type</FormLabel>
                          <FormDescription className="text-[10px] text-[#666666]">
                            Toggle between standard Film and Episodic Series.
                          </FormDescription>
                        </div>
                        <div className="flex items-center gap-3">
                          <Label className={cn('text-xs font-bold transition-colors', field.value === 'movie' ? 'text-white' : 'text-[#666666]')}>Movie</Label>
                          <FormControl>
                            <Switch
                              checked={field.value === 'series'}
                              onCheckedChange={(checked) => {
                                field.onChange(checked ? 'series' : 'movie');
                              }}
                              className="data-[state=checked]:bg-[#FF5A5F] data-[state=unchecked]:bg-white/10"
                            />
                          </FormControl>
                          <Label className={cn('text-xs font-bold transition-colors', field.value === 'series' ? 'text-white' : 'text-[#666666]')}>Series</Label>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-[#A1A1A1]">Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter title" {...field} className="bg-white/[0.03] border-white/8 rounded-xl h-11 text-xs text-white focus:border-[#FF5A5F]/40 focus:ring-0" />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="posterUrl" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-[#A1A1A1]">Poster URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} className="bg-white/[0.03] border-white/8 rounded-xl h-11 text-xs text-white focus:border-[#FF5A5F]/40" />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="backdropUrl" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-[#A1A1A1]">Backdrop URL (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} value={field.value ?? ''} className="bg-white/[0.03] border-white/8 rounded-xl h-11 text-xs text-white focus:border-[#FF5A5F]/40" />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="overview" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-[#A1A1A1]">Overview</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Content summary description..." {...field} rows={3} className="bg-white/[0.03] border-white/8 rounded-xl text-xs text-white focus:border-[#FF5A5F]/40 resize-none" />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )} />

                  {/* Dynamic Genres List */}
                  <div className="bg-white/[0.01] border border-white/5 p-4 rounded-2xl space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-wider text-[#A1A1A1]">Genres</Label>
                    <div className="space-y-2">
                      {genreFields.map((field, index) => (
                        <div key={field.id} className="flex items-center gap-2">
                          <FormField control={form.control} name={`genres.${index}`} render={({ field: itemField }) => (
                            <FormItem className="flex-grow">
                              <FormControl>
                                <Input placeholder={`Genre e.g. Action, Sci-Fi`} {...itemField} className="bg-white/[0.03] border-white/8 rounded-xl h-10 text-xs text-white focus:border-[#FF5A5F]/40" />
                              </FormControl>
                              <FormMessage className="text-[10px]" />
                            </FormItem>
                          )} />
                          <button 
                            type="button" 
                            onClick={() => removeGenre(index)}
                            className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => appendGenre('')}
                      className="w-full bg-white/5 border-white/8 hover:bg-white/10 text-white rounded-xl h-10 text-xs font-bold uppercase tracking-wider"
                    >
                      <PlusCircle className="mr-2 h-4 w-4 text-[#FF5A5F]" /> Add Genre Tag
                    </Button>
                  </div>

                  {/* Rating / Release Date Group */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="releaseDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-[#A1A1A1]">Release Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} className="bg-white/[0.03] border-white/8 rounded-xl h-11 text-xs text-white focus:border-[#FF5A5F]/40" />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )} />
                    
                    <FormField
                      control={form.control}
                      name="rating"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-[#A1A1A1]">Rating (0-10)</FormLabel>
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
                              className="bg-white/[0.03] border-white/8 rounded-xl h-11 text-xs text-white focus:border-[#FF5A5F]/40"
                            />
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField control={form.control} name="director" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-[#A1A1A1]">Director</FormLabel>
                      <FormControl>
                        <Input placeholder="Director Name" {...field} value={field.value ?? ''} className="bg-white/[0.03] border-white/8 rounded-xl h-11 text-xs text-white focus:border-[#FF5A5F]/40" />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="trailerUrl" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-[#A1A1A1]">Trailer URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://youtube.com/..." {...field} value={field.value ?? ''} className="bg-white/[0.03] border-white/8 rounded-xl h-11 text-xs text-white focus:border-[#FF5A5F]/40" />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="watchUrl" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-[#A1A1A1]">Watch URL (Active Stream link)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://drive.google.com/..." {...field} value={field.value ?? ''} className="bg-white/[0.03] border-white/8 rounded-xl h-11 text-xs text-white focus:border-[#FF5A5F]/40" />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )} />

                  {/* Cast List */}
                  <div className="bg-white/[0.01] border border-white/5 p-4 rounded-2xl space-y-4">
                    <Label className="text-xs font-bold uppercase tracking-wider text-[#A1A1A1]">Cast Members</Label>
                    <div className="space-y-4">
                      {castFields.map((field, index) => (
                        <div key={field.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2 relative">
                          <button 
                            type="button" 
                            onClick={() => removeCast(index)}
                            className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/5 text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          
                          <p className="text-[10px] font-bold text-white uppercase tracking-wider mb-2">Member #{index + 1}</p>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <FormField control={form.control} name={`cast.${index}.name`} render={({ field: itemField }) => (
                              <FormItem><FormLabel className="text-[9px] font-semibold text-[#666666]">Actor Name</FormLabel><FormControl><Input placeholder="Actor" {...itemField} className="bg-white/[0.03] border-white/8 rounded-lg h-9 text-xs focus:border-[#FF5A5F]/40" /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name={`cast.${index}.character`} render={({ field: itemField }) => (
                              <FormItem><FormLabel className="text-[9px] font-semibold text-[#666666]">Character</FormLabel><FormControl><Input placeholder="Role" {...itemField} className="bg-white/[0.03] border-white/8 rounded-lg h-9 text-xs focus:border-[#FF5A5F]/40" /></FormControl></FormItem>
                            )} />
                          </div>
                          
                          <FormField control={form.control} name={`cast.${index}.profileUrl`} render={({ field: itemField }) => (
                            <FormItem><FormLabel className="text-[9px] font-semibold text-[#666666]">Profile Image URL</FormLabel><FormControl><Input placeholder="https://..." {...itemField} value={itemField.value ?? ''} className="bg-white/[0.03] border-white/8 rounded-lg h-9 text-xs focus:border-[#FF5A5F]/40" /></FormControl></FormItem>
                          )} />
                        </div>
                      ))}
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => appendCast({ name: '', character: '', profileUrl: '', dataAiHint: 'actor headshot' })}
                      className="w-full bg-white/5 border-white/8 hover:bg-white/10 text-white rounded-xl h-10 text-xs font-bold uppercase tracking-wider"
                    >
                      <PlusCircle className="mr-2 h-4 w-4 text-[#FF5A5F]" /> Add Cast Member
                    </Button>
                  </div>

                  {/* Series Episodes config */}
                  {contentType === 'series' && (
                    <div className="bg-white/[0.01] border border-white/5 p-4 rounded-2xl space-y-4">
                      <Label className="text-xs font-bold uppercase tracking-wider text-[#A1A1A1]">Series Episodes</Label>
                      <div className="space-y-4">
                        {episodeFields.map((field, index) => (
                          <div key={field.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3 relative">
                            <button 
                              type="button" 
                              onClick={() => removeEpisode(index)}
                              className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/5 text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                            
                            <p className="text-[10px] font-bold text-white uppercase tracking-wider">Episode #{index + 1}</p>
                            
                            <FormField control={form.control} name={`episodes.${index}.title`} render={({ field: itemField }) => (
                              <FormItem><FormLabel className="text-[9px] font-semibold text-[#666666]">Episode Title</FormLabel><FormControl><Input placeholder="Title" {...itemField} className="bg-white/[0.03] border-white/8 rounded-lg h-9 text-xs focus:border-[#FF5A5F]/40" /></FormControl></FormItem>
                            )} />
                            
                            <div className="grid grid-cols-2 gap-2">
                              <FormField control={form.control} name={`episodes.${index}.watchUrl`} render={({ field: itemField }) => (
                                <FormItem><FormLabel className="text-[9px] font-semibold text-[#666666]">Streaming Watch URL</FormLabel><FormControl><Input placeholder="https://..." {...itemField} value={itemField.value ?? ''} className="bg-white/[0.03] border-white/8 rounded-lg h-9 text-xs focus:border-[#FF5A5F]/40" /></FormControl></FormItem>
                              )} />
                              <FormField control={form.control} name={`episodes.${index}.downloadUrl`} render={({ field: itemField }) => (
                                <FormItem><FormLabel className="text-[9px] font-semibold text-[#666666]">Download Link</FormLabel><FormControl><Input placeholder="https://..." {...itemField} value={itemField.value ?? ''} className="bg-white/[0.03] border-white/8 rounded-lg h-9 text-xs focus:border-[#FF5A5F]/40" /></FormControl></FormItem>
                              )} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => appendEpisode({ title: '', downloadUrl: '', watchUrl: '' })}
                        className="w-full bg-white/5 border-white/8 hover:bg-white/10 text-white rounded-xl h-10 text-xs font-bold uppercase tracking-wider"
                      >
                        <PlusCircle className="mr-2 h-4 w-4 text-[#FF5A5F]" /> Add Episode Asset
                      </Button>
                    </div>
                  )}

                  <FormField control={form.control} name="dataAiHint" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-[#A1A1A1]">AI Image Suggestion Hint</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. dark space odyssey" {...field} value={field.value ?? ''} className="bg-white/[0.03] border-white/8 rounded-xl h-11 text-xs text-white focus:border-[#FF5A5F]/40" />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )} />
                </div>
                
                {error && (
                  <div className="px-6 py-2">
                    <Alert variant="destructive" className="bg-[#EF4444]/10 border-[#EF4444]/20 text-white rounded-xl py-3"><AlertDescription className="text-xs">{error}</AlertDescription></Alert>
                  </div>
                )}
                
                <DialogFooter className="p-6 border-t border-white/5 flex flex-row gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsFormOpen(false)} 
                    disabled={isSubmitting} 
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white border-white/10 rounded-2xl py-6 text-xs font-bold uppercase tracking-wider"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="flex-1 bg-[#FF5A5F] hover:bg-[#FF6F73] text-white rounded-2xl py-6 text-xs font-bold uppercase tracking-wider shadow-[0_4px_20px_rgba(255,90,95,0.25)] border border-[#FF5A5F]/20"
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingMovie ? 'Save Changes' : 'Publish Asset'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Categories Filtering Tabs */}
      <div className="bg-[#0D0D0D]/40 border border-white/5 backdrop-blur-[24px] rounded-3xl p-2.5 flex flex-wrap gap-2 shadow-lg w-max max-w-full">
        {[
          { label: 'All Contents', id: 'all' },
          { label: 'Movies', id: 'movies' },
          { label: 'Series', id: 'series' },
          { label: 'Documentaries', id: 'docs' },
          { label: 'Short Films', id: 'shorts' },
          { label: 'Others', id: 'others' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-5 py-3 rounded-2xl text-xs font-bold tracking-wide uppercase transition-all duration-300',
              activeTab === tab.id
                ? 'bg-[#FF5A5F]/18 text-white border border-[#FF5A5F]/30 shadow-inner'
                : 'text-[#A1A1A1] hover:text-white border border-transparent hover:bg-white/3'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Top controls - Search & Filter parameters */}
      <div className="grid gap-4 md:grid-cols-4 bg-[#0D0D0D]/25 border border-white/5 backdrop-blur-[12px] p-5 rounded-3xl shadow-lg">
        {/* Search */}
        <div className="relative md:col-span-2">
          <Search className="absolute left-4 top-4.5 h-4 w-4 text-[#666666]" />
          <input
            type="text"
            placeholder="Search assets by title or director..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/[0.02] border border-white/8 rounded-[18px] h-[52px] pl-11 pr-4 text-xs font-medium text-white focus:outline-none focus:border-[#FF5A5F]/40 placeholder-[#666666] transition-colors"
          />
        </div>

        {/* Filter Type */}
        <div className="relative">
          <Filter className="absolute left-4 top-4.5 h-3.5 w-3.5 text-[#666666]" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full bg-white/[0.02] border border-white/8 rounded-[18px] h-[52px] pl-10 pr-4 text-xs font-bold uppercase tracking-wider text-[#A1A1A1] focus:outline-none focus:border-[#FF5A5F]/40 appearance-none cursor-pointer"
          >
            <option value="all" className="bg-[#0D0D0D] text-white">All Formats</option>
            <option value="movie" className="bg-[#0D0D0D] text-white">Movies</option>
            <option value="series" className="bg-[#0D0D0D] text-white">Series</option>
          </select>
        </div>

        {/* Filter Status */}
        <div className="relative">
          <ArrowUpDown className="absolute left-4 top-4.5 h-3.5 w-3.5 text-[#666666]" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-white/[0.02] border border-white/8 rounded-[18px] h-[52px] pl-10 pr-4 text-xs font-bold uppercase tracking-wider text-[#A1A1A1] focus:outline-none focus:border-[#FF5A5F]/40 appearance-none cursor-pointer"
          >
            <option value="all" className="bg-[#0D0D0D] text-white">All Statuses</option>
            <option value="published" className="bg-[#0D0D0D] text-white">Published</option>
            <option value="draft" className="bg-[#0D0D0D] text-white">Draft</option>
          </select>
        </div>
      </div>

      {/* Main Content Table & Display */}
      {filteredMovies.length === 0 ? (
        <div className="bg-[#0D0D0D]/40 border border-white/5 rounded-3xl p-16 text-center text-[#666666] font-medium shadow-md">
          <Film className="w-16 h-16 mx-auto opacity-35 text-[#FF5A5F] mb-4" />
          <p className="text-sm font-bold tracking-wide uppercase text-white">No Cataloged Assets Identified</p>
          <p className="text-xs text-[#A1A1A1] mt-1 font-medium">Create items or loosen search variables to sync coordinates.</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-2.5">
              <thead>
                <tr className="text-left text-[#666666] text-[10px] font-bold uppercase tracking-wider select-none">
                  <th className="px-6 py-2 w-[80px]">Poster</th>
                  <th className="px-6 py-2 w-[220px]">Title</th>
                  <th className="px-6 py-2 w-[110px]">Type</th>
                  <th className="px-6 py-2 w-[130px]">Category</th>
                  <th className="px-6 py-2 w-[120px]">Release Year</th>
                  <th className="px-6 py-2 w-[110px]">Duration</th>
                  <th className="px-6 py-2 w-[130px]">Status</th>
                  <th className="px-6 py-2 w-[110px]">Views</th>
                  <th className="px-6 py-2 text-right w-[140px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedMovies.map((movie) => {
                  const isPublished = getStatus(movie);
                  return (
                    <tr 
                      key={movie.id} 
                      className="bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 rounded-2xl group transition-all duration-300"
                    >
                      {/* Poster */}
                      <td className="px-6 py-3 rounded-l-2xl">
                        <div className="w-[56px] h-[72px] rounded-xl overflow-hidden relative border border-white/10 shadow-md">
                          <Image 
                            src={getSanitizedUrl(movie)} 
                            alt={movie.title} 
                            fill
                            sizes="56px"
                            className="object-cover" 
                            data-ai-hint={movie.dataAiHint || "movie poster"} 
                          />
                        </div>
                      </td>

                      {/* Title */}
                      <td className="px-6 py-3 font-semibold text-white max-w-[220px] truncate">
                        <Link href={`/movies/${movie.id}`} className="hover:text-[#FF5A5F] transition-colors">
                          {movie.title}
                        </Link>
                        <p className="text-[9px] text-[#666666] font-medium tracking-wide mt-1 truncate">Dir: {movie.director || 'N/A'}</p>
                      </td>

                      {/* Type */}
                      <td className="px-6 py-3">
                        <Badge 
                          className={cn(
                            'text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border shadow-sm',
                            movie.type === 'series' 
                              ? 'bg-[#00D1B2]/10 border-[#00D1B2]/20 text-[#00D1B2]' 
                              : 'bg-white/5 border-white/10 text-white'
                          )}
                        >
                          {movie.type || 'Movie'}
                        </Badge>
                      </td>

                      {/* Category */}
                      <td className="px-6 py-3 text-xs font-semibold text-[#A1A1A1] max-w-[130px] truncate">
                        {movie.genres[0] || 'Unassigned'}
                      </td>

                      {/* Release Year */}
                      <td className="px-6 py-3 text-xs font-mono font-semibold text-[#A1A1A1]">
                        {getReleaseYear(movie.releaseDate)}
                      </td>

                      {/* Duration */}
                      <td className="px-6 py-3 text-xs font-semibold text-[#A1A1A1]">
                        {getStableDuration(movie)}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-3">
                        {isPublished ? (
                          <Badge className="bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded">
                            Published
                          </Badge>
                        ) : (
                          <Badge className="bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded">
                            Draft
                          </Badge>
                        )}
                      </td>

                      {/* Views */}
                      <td className="px-6 py-3 text-xs font-mono font-semibold text-[#A1A1A1]">
                        {getStableViews(movie)}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-3 rounded-r-2xl text-right space-x-1.5">
                        <Link 
                          href={`/movies/${movie.id}`} 
                          className="inline-flex items-center justify-center p-2 rounded-xl bg-white/5 border border-white/5 text-[#A1A1A1] hover:text-white hover:bg-white/10 transition-colors"
                          title="View on Platform"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        
                        <button
                          onClick={() => handleEditClick(movie)}
                          type="button"
                          className="p-2 rounded-xl bg-white/5 border border-white/5 text-[#A1A1A1] hover:text-[#FF5A5F] hover:bg-white/10 transition-colors"
                          title="Edit Details"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              type="button"
                              className="p-2 rounded-xl bg-white/5 border border-white/5 text-[#A1A1A1] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                              title="Delete catalog item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-[#0D0D0D]/95 border border-white/10 text-white rounded-3xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="font-headline uppercase tracking-wider font-bold">Destroy database item?</AlertDialogTitle>
                              <AlertDialogDescription className="text-xs text-[#A1A1A1]">
                                This action cannot be reversed. Catalog entry for "{movie.title}" will be permanently removed from MongoDB database.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-white/5 hover:bg-white/10 text-white border-white/10 rounded-2xl">Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteMovie(movie.id)}
                                disabled={isDeleting}
                                className="bg-[#EF4444] hover:bg-[#EF4444]/90 text-white rounded-2xl font-bold uppercase tracking-wider"
                              >
                                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirm Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Grid Layout - Card Stack */}
          <div className="grid gap-4 sm:grid-cols-2 lg:hidden">
            {paginatedMovies.map((movie) => {
              const isPublished = getStatus(movie);
              return (
                <div 
                  key={movie.id} 
                  className="bg-[#0D0D0D]/40 border border-white/5 backdrop-blur-[16px] rounded-3xl p-5 flex flex-col justify-between gap-4 shadow-lg hover:border-white/10 transition-all duration-300"
                >
                  <div className="flex gap-4">
                    {/* Poster */}
                    <div className="w-[64px] h-[84px] rounded-xl overflow-hidden relative border border-white/10 shadow-md flex-shrink-0">
                      <Image 
                        src={getSanitizedUrl(movie)} 
                        alt={movie.title} 
                        fill
                        sizes="64px"
                        className="object-cover" 
                      />
                    </div>
                    {/* Details */}
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-white truncate">{movie.title}</h4>
                      <p className="text-[10px] text-[#A1A1A1] mt-1 font-semibold truncate">Dir: {movie.director || 'N/A'}</p>
                      
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <Badge className="bg-white/5 border border-white/10 text-[8px] font-bold uppercase py-0.5">
                          {movie.type || 'Movie'}
                        </Badge>
                        <Badge className="bg-white/5 border border-white/10 text-[8px] font-bold uppercase py-0.5">
                          {movie.genres[0] || 'Unassigned'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-3.5 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="text-[8px] font-bold text-[#666666] uppercase">Telemetry Stats</div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-[#A1A1A1] font-bold">{getReleaseYear(movie.releaseDate)}</span>
                        <span className="text-[10px] font-semibold text-[#A1A1A1]">{getStableDuration(movie)}</span>
                        <span className="text-[10px] font-mono text-[#A1A1A1] font-bold">{getStableViews(movie)} views</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isPublished ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]" title="Published" />
                      ) : (
                        <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" title="Draft" />
                      )}
                      
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditClick(movie)}
                          type="button"
                          className="p-1.5 rounded-lg bg-white/5 text-[#A1A1A1] hover:text-white"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteMovie(movie.id)}
                          type="button"
                          className="p-1.5 rounded-lg bg-white/5 text-[#EF4444]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Minimal Glass Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-1.5 pt-4">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-[#0D0D0D]/40 hover:bg-white/5 disabled:opacity-35 disabled:hover:bg-transparent text-white border border-white/5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors select-none"
              >
                Prev
              </button>
              
              <div className="bg-[#0D0D0D]/40 border border-white/5 rounded-xl px-4 py-2 text-xs font-mono font-bold text-[#A1A1A1] select-none">
                Page <span className="text-white">{currentPage}</span> of <span className="text-white">{totalPages}</span>
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-[#0D0D0D]/40 hover:bg-white/5 disabled:opacity-35 disabled:hover:bg-transparent text-white border border-white/5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors select-none"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
