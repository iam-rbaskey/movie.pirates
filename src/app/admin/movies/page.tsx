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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, Edit, Film, Search, Eye, Filter, ArrowUpDown, Star, Globe2, Trash, CheckSquare, Square, Check, X, ShieldAlert, Tv } from 'lucide-react';
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

  // Filters and table parameters
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // all, movies, series, docs, shorts, others
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6; // Perfect height for a clean table page

  // Bulk Selection States
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

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
      status: 'published',
      isFeatured: false,
      regions: ['Global'],
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
      status: movie.status || (movie.watchUrl ? 'published' : 'draft'),
      isFeatured: movie.isFeatured ?? false,
      regions: movie.regions || ['Global'],
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
      status: 'published',
      isFeatured: false,
      regions: ['Global'],
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
        status: data.status || 'published',
        isFeatured: data.isFeatured ?? false,
        regions: data.regions && data.regions.length > 0 ? data.regions : ['Global'],
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

  // Inline database updates
  const handleToggleFeatured = async (movie: MovieOutput) => {
    const nextFeatured = !(movie.isFeatured ?? false);
    try {
      const res = await updateMovie({ 
        movieId: movie.id, 
        isFeatured: nextFeatured 
      });
      if (res.success) {
        toast({ title: "Update Success", description: `"${movie.title}" is now ${nextFeatured ? 'Featured' : 'Not Featured'}.` });
        setMovies(prev => prev.map(m => m.id === movie.id ? { ...m, isFeatured: nextFeatured } : m));
      } else {
        toast({ variant: "destructive", title: "Update Failed", description: res.message });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message || "Failed to update featured status." });
    }
  };

  const handleStatusChange = async (movie: MovieOutput, nextStatus: 'draft' | 'published' | 'scheduled' | 'archived') => {
    try {
      const res = await updateMovie({ 
        movieId: movie.id, 
        status: nextStatus 
      });
      if (res.success) {
        toast({ title: "Update Success", description: `"${movie.title}" status updated to ${nextStatus}.` });
        setMovies(prev => prev.map(m => m.id === movie.id ? { ...m, status: nextStatus } : m));
      } else {
        toast({ variant: "destructive", title: "Update Failed", description: res.message });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message || "Failed to update status." });
    }
  };

  // Bulk operation actions
  const handleBulkStatusChange = async (status: 'draft' | 'published' | 'archived') => {
    setIsSubmitting(true);
    try {
      let successCount = 0;
      for (const id of selectedIds) {
        const res = await updateMovie({ movieId: id, status });
        if (res.success) successCount++;
      }
      toast({ title: "Bulk Action Completed", description: `Successfully updated ${successCount} content items to ${status}.` });
      setSelectedIds([]);
      await fetchMovies();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message || "Failed to execute bulk update." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete the ${selectedIds.length} selected items? This action is permanent.`)) {
      return;
    }
    setIsSubmitting(true);
    try {
      let successCount = 0;
      for (const id of selectedIds) {
        const res = await deleteMovie({ movieId: id });
        if (res.success) successCount++;
      }
      toast({ title: "Bulk Action Completed", description: `Successfully deleted ${successCount} content items.` });
      setSelectedIds([]);
      await fetchMovies();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message || "Failed to delete bulk items." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectMovie = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (visibleItems: MovieOutput[]) => {
    const visibleIds = visibleItems.map(m => m.id);
    const allSelected = visibleIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const getSanitizedUrl = (movie: MovieOutput) => {
    const url = movie.posterUrl;
    if (!url || url.includes('/title/') || url.includes('/name/') || (!url.startsWith('http') && !url.startsWith('data:'))) {
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
        return <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/25">Active GDrive</Badge>;
      }
      return <Badge className="bg-red-500/10 text-red-500 border border-red-500/25">Missing link</Badge>;
    } else {
      const eps = movie.episodes || [];
      if (eps.length === 0) return <Badge className="bg-red-500/10 text-red-500 border border-red-500/25">No eps</Badge>;
      const withLink = eps.filter(ep => isGDriveUrl(ep.watchUrl)).length;
      if (withLink === eps.length) {
        return <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/25">All Active</Badge>;
      } else if (withLink > 0) {
        return <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/25">Partial ({withLink}/{eps.length})</Badge>;
      }
      return <Badge className="bg-red-500/10 text-red-500 border border-red-500/25">Missing link</Badge>;
    }
  };

  // Combined Filtering and Sorting
  const filteredMovies = movies.filter(movie => {
    // 1. Search filter
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
    const status = movie.status || (movie.watchUrl ? 'published' : 'draft');
    let matchesStatus = true;
    if (statusFilter !== 'all') {
      matchesStatus = status === statusFilter;
    }

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

  // Pagination
  const totalPages = Math.ceil(filteredMovies.length / itemsPerPage);
  const paginatedMovies = filteredMovies.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [searchTerm, activeTab, typeFilter, statusFilter, sortBy]);

  return (
    <div className="space-y-8 animate-fade-in pb-16 relative">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold font-headline flex items-center text-white uppercase tracking-wider">
            <Film className="mr-3 h-8 w-8 text-[#FF5A5F]" /> Operations Control
          </h1>
          <p className="text-xs md:text-sm text-[#A1A1A1] font-medium mt-1">
            Futuristic OTT catalogue workflows, scheduling pipeline, and media configurations.
          </p>
        </div>

        <Dialog open={isFormOpen} onOpenChange={(open) => {
          if (!open) setEditingMovie(null);
          setIsFormOpen(open);
        }}>
          <Button 
            onClick={handleAddNewClick} 
            className="w-full md:w-auto bg-[#FF5A5F] hover:bg-[#FF6F73] text-white font-bold rounded-2xl py-6 px-6 text-xs uppercase tracking-wider shadow-[0_4px_20px_rgba(255,90,95,0.25)] border border-[#FF5A5F]/20 transition-all duration-300"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Index New Content
          </Button>
          
          {/* Add / Edit Dialog Wrapper */}
          <DialogContent className="max-w-[620px] max-h-[90vh] bg-[#0D0D0D]/95 border border-white/10 text-white rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-[24px] flex flex-col overflow-hidden">
            <DialogHeader className="p-6 pb-2">
              <DialogTitle className="text-lg md:text-xl font-bold font-headline uppercase tracking-wider text-white">
                {editingMovie ? 'Edit Asset Parameters' : 'Catalog New Asset'}
              </DialogTitle>
              <DialogDescription className="text-xs text-[#A1A1A1] font-medium">
                {editingMovie ? 'Update content operational properties, status state, and availability.' : 'Configure release schedules and upload tags.'}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto px-6 py-2 space-y-5 scrollbar-hide">
                  
                  {/* Status, Featured Toggles */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-[#A1A1A1]">Workflow Status</FormLabel>
                          <select
                            value={field.value}
                            onChange={field.onChange}
                            className="w-full bg-white/[0.03] border border-white/8 rounded-xl h-11 px-3 text-xs text-white focus:outline-none focus:border-[#FF5A5F]/40 cursor-pointer"
                          >
                            <option value="draft" className="bg-[#0D0D0D] text-white">Draft</option>
                            <option value="published" className="bg-[#0D0D0D] text-white">Published</option>
                            <option value="scheduled" className="bg-[#0D0D0D] text-white">Scheduled</option>
                            <option value="archived" className="bg-[#0D0D0D] text-white">Archived</option>
                          </select>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="isFeatured"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] px-4 h-11 mt-6">
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-white">Featured</FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="data-[state=checked]:bg-[#FF5A5F] data-[state=unchecked]:bg-white/10"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="regions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-[#A1A1A1]">Regional Availability</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="US, UK, Global" 
                            value={field.value ? field.value.join(', ') : 'Global'} 
                            onChange={(e) => {
                              const list = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                              field.onChange(list.length > 0 ? list : ['Global']);
                            }} 
                            className="bg-white/[0.03] border-white/8 rounded-xl h-11 text-xs text-white focus:border-[#FF5A5F]/40" 
                          />
                        </FormControl>
                        <FormDescription className="text-[10px] text-[#666666]">Comma separated ISO codes or regional strings.</FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-white">Content Format</FormLabel>
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
                        <Input placeholder="Enter title" {...field} className="bg-white/[0.03] border-white/8 rounded-xl h-11 text-xs text-white focus:border-[#FF5A5F]/40" />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="posterUrl" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-[#A1A1A1]">Poster Image URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} className="bg-white/[0.03] border-white/8 rounded-xl h-11 text-xs text-white focus:border-[#FF5A5F]/40" />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="backdropUrl" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-[#A1A1A1]">Backdrop Image URL (Optional)</FormLabel>
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
            <option value="draft" className="bg-[#0D0D0D] text-white">Draft</option>
            <option value="published" className="bg-[#0D0D0D] text-white">Published</option>
            <option value="scheduled" className="bg-[#0D0D0D] text-white">Scheduled</option>
            <option value="archived" className="bg-[#0D0D0D] text-white">Archived</option>
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
          
          {/* Hybrid Content List + Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-3.5">
              <thead>
                <tr className="text-left text-[#666666] text-[10px] font-bold uppercase tracking-wider select-none">
                  <th className="px-4 py-2 w-[40px]">
                    <button 
                      onClick={() => handleSelectAll(paginatedMovies)}
                      className="text-[#666666] hover:text-white transition-colors"
                      title="Select all page assets"
                    >
                      {paginatedMovies.every(m => selectedIds.includes(m.id)) ? (
                        <CheckSquare className="w-4.5 h-4.5 text-[#FF5A5F]" />
                      ) : (
                        <Square className="w-4.5 h-4.5" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-2 w-[80px]">Poster</th>
                  <th className="px-6 py-2 w-[220px]">Title</th>
                  <th className="px-6 py-2 w-[140px]">Rating</th>
                  <th className="px-6 py-2 w-[120px]">Category</th>
                  <th className="px-6 py-2 w-[100px]">Views</th>
                  <th className="px-6 py-2 w-[130px]">Streams</th>
                  <th className="px-6 py-2 w-[120px]">Release Date</th>
                  <th className="px-6 py-2 text-right w-[140px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedMovies.map((movie) => {
                  const status = movie.status || (movie.watchUrl ? 'published' : 'draft');
                  const isFeatured = movie.isFeatured ?? false;
                  const regions = movie.regions || ['Global'];
                  const isSelected = selectedIds.includes(movie.id);
                  
                  return (
                    <tr 
                      key={movie.id} 
                      className={cn(
                        "bg-[#0D0D0D]/40 border border-white/5 hover:bg-[#0D0D0D]/60 hover:border-white/10 rounded-[22px] group transition-all duration-300 relative",
                        isSelected && "bg-[#FF5A5F]/5 border-[#FF5A5F]/20"
                      )}
                      style={{ height: '92px' }}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3 rounded-l-[22px]">
                        <button 
                          onClick={() => handleSelectMovie(movie.id)}
                          className="text-[#666666] hover:text-white transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4.5 h-4.5 text-[#FF5A5F]" />
                          ) : (
                            <Square className="w-4.5 h-4.5" />
                          )}
                        </button>
                      </td>

                      {/* Poster */}
                      <td className="px-6 py-3">
                        <div className="w-[56px] h-[72px] rounded-xl overflow-hidden relative border border-white/10 shadow-md">
                          <Image 
                            src={brokenImages[movie.id] ? `https://placehold.co/100x150.png?text=${encodeURIComponent(movie.title)}` : getSanitizedUrl(movie)} 
                            alt={movie.title} 
                            fill
                            sizes="56px"
                            className="object-cover" 
                            referrerPolicy="no-referrer"
                            onError={() => {
                              setBrokenImages(prev => ({ ...prev, [movie.id]: true }));
                            }}
                          />
                        </div>
                      </td>

                      {/* Title & Featured Indicator */}
                      <td className="px-6 py-3 font-semibold text-white max-w-[220px]">
                        <div className="flex items-center gap-2">
                          <Link href={`/movies/${movie.id}`} className="hover:text-[#FF5A5F] transition-colors truncate block max-w-[170px] font-headline text-sm tracking-wide">
                            {movie.title}
                          </Link>
                          <button 
                            onClick={() => handleToggleFeatured(movie)}
                            className={cn("p-1 rounded-md transition-all", isFeatured ? "text-amber-500 scale-110" : "text-[#666666] hover:text-white")}
                            title={isFeatured ? "Featured content" : "Toggle featured status"}
                          >
                            <Star className="w-3.5 h-3.5 fill-current" />
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          {movie.type === 'series' ? (
                            <Tv className="w-3 h-3 text-[#FF5A5F]" />
                          ) : (
                            <Film className="w-3 h-3 text-[#00D1B2]" />
                          )}
                          <span className="text-[9px] text-[#A1A1A1] font-semibold uppercase tracking-wider">
                            {movie.type === 'series' ? 'TV Series' : 'Movie'}
                          </span>
                        </div>
                      </td>

                      {/* Rating */}
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/25 px-2.5 py-1.5 rounded-xl w-fit text-amber-500 font-bold text-[10px] shadow-sm uppercase tracking-wider">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span>{movie.rating > 0 ? `${movie.rating.toFixed(1)}/10` : 'Unrated'}</span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-6 py-3 text-xs font-semibold text-[#A1A1A1] max-w-[120px] truncate">
                        {movie.genres[0] || 'Unassigned'}
                      </td>

                      {/* Views (Constant DB value - None) */}
                      <td className="px-6 py-3 text-xs font-mono font-semibold text-[#666666]">
                        —
                      </td>

                      {/* Streams / GDrive Status */}
                      <td className="px-6 py-3">
                        {getGDriveStatusBadge(movie)}
                      </td>

                      {/* Release Date */}
                      <td className="px-6 py-3 text-xs font-mono font-semibold text-[#A1A1A1]">
                        {movie.releaseDate ? new Date(movie.releaseDate).toLocaleDateString() : 'N/A'}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-3 rounded-r-[22px] text-right space-x-1.5">
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
                              title="Delete Item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-[#0D0D0D]/95 border border-white/10 text-white rounded-3xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="font-headline uppercase tracking-wider font-bold">Remove from index?</AlertDialogTitle>
                              <AlertDialogDescription className="text-xs text-[#A1A1A1]">
                                This action cannot be reversed. Entry for "{movie.title}" will be permanently removed from MongoDB database.
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

      {/* Floating Bulk Actions Toolbar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-in-up">
          <div className="bg-[#0D0D0D]/95 border border-white/10 backdrop-blur-[24px] px-6 py-4 rounded-[24px] shadow-[0_15px_40px_rgba(0,0,0,0.8)] flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#FF5A5F]" />
              <span className="text-xs font-bold text-white tracking-wide">{selectedIds.length} Assets Selected</span>
            </div>

            <div className="h-4 w-[1px] bg-white/10" />

            <div className="flex items-center gap-2">
              <Button 
                onClick={() => handleBulkStatusChange('published')}
                className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-[10px] font-bold uppercase tracking-wider rounded-xl h-9 px-3 border border-emerald-500/20"
              >
                Publish
              </Button>
              <Button 
                onClick={() => handleBulkStatusChange('draft')}
                className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 text-[10px] font-bold uppercase tracking-wider rounded-xl h-9 px-3 border border-amber-500/20"
              >
                Draft
              </Button>
              <Button 
                onClick={() => handleBulkStatusChange('archived')}
                className="bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl h-9 px-3 border border-white/10"
              >
                Archive
              </Button>
              <Button 
                onClick={handleBulkDelete}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-bold uppercase tracking-wider rounded-xl h-9 px-3 border border-red-500/20"
              >
                Delete
              </Button>
              <button 
                onClick={() => setSelectedIds([])}
                className="p-2 text-[#666666] hover:text-white rounded-lg hover:bg-white/5"
                title="Cancel selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
