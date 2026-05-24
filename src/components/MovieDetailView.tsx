"use client";

import * as React from 'react';
import StarRating from '@/components/StarRating';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import type { ReviewOutput } from '@/ai/schemas/review-schemas'; 
import type { MovieOutput } from '@/ai/schemas/movie-schemas'; 
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Play, Users, MessageCircle, Download, Tv2, FilmIcon, Star } from 'lucide-react';
import Image from 'next/image';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from '@/hooks/use-toast';
import { addReview } from '@/ai/flows/review-flow';
import { cn } from '@/lib/utils';
import VideoPlayer from '@/components/VideoPlayer';

type MovieDetailViewProps = {
  movie: MovieOutput;
  reviews: ReviewOutput[];
};

export default function MovieDetailView({ movie, reviews }: MovieDetailViewProps) {
  const { toast } = useToast();
  const backdropUrl = React.useMemo(() => {
    const url = movie.backdropUrl;
    if (!url || url.includes('/title/') || url.includes('/name/') || !url.startsWith('http')) {
      return undefined;
    }
    return url;
  }, [movie.backdropUrl]);

  const [rating, setRating] = React.useState<number>(7);
  const [comment, setComment] = React.useState<string>('');
  const [localReviews, setLocalReviews] = React.useState<ReviewOutput[]>(reviews);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  const [userId, setUserId] = React.useState<string | null>(null);
  const [userName, setUserName] = React.useState<string | null>(null);
  const [userAvatarUrl, setUserAvatarUrl] = React.useState<string | null>(null);

  // States to control active native streaming video player
  const [activeVideoUrl, setActiveVideoUrl] = React.useState<string | null>(null);
  const [activeVideoTitle, setActiveVideoTitle] = React.useState<string | null>(null);

  React.useEffect(() => {
    setUserId(localStorage.getItem('userId'));
    setUserName(localStorage.getItem('userName'));
    setUserAvatarUrl(localStorage.getItem('userAvatar'));
  }, []);

  const handleReviewSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId || !userName) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to submit a review." });
      return;
    }
    if (comment.trim().length < 3) {
      toast({ variant: "destructive", title: "Error", description: "Comment must be at least 3 characters long." });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await addReview({
        movieId: movie.id,
        userId,
        userName,
        userAvatarUrl,
        rating,
        comment,
      });

      if (response.success && response.review) {
        toast({ title: "Success", description: "Review submitted successfully!" });
        setLocalReviews((prev) => [response.review!, ...prev]);
        setComment('');
        setRating(7);
      } else {
        toast({ variant: "destructive", title: "Failed", description: response.message });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message || "Failed to submit review." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in py-8 md:py-12 space-y-12">
      {/* Movie Details Hero Banner */}
      <section className="relative rounded-[32px] overflow-hidden min-h-[55vh] md:min-h-[70vh] flex items-end text-white shadow-2xl border border-white/5 bg-black">
        {activeVideoUrl ? (
          <div className="absolute inset-0 w-full h-full z-30">
            <VideoPlayer 
              watchUrl={activeVideoUrl}
              title={activeVideoTitle || movie.title}
              movieId={movie.id}
              movieType={movie.type}
              onClose={() => {
                setActiveVideoUrl(null);
                setActiveVideoTitle(null);
              }}
            />
          </div>
        ) : (
          <>
            {backdropUrl && (
              <Image
                src={backdropUrl}
                alt={`Backdrop for ${movie.title}`}
                fill 
                priority
                className="object-cover object-top scale-105 filter brightness-75 contrast-105 select-none"
                data-ai-hint={movie.dataAiHint || "movie scene"}
              />
            )}
            {/* Gradients */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#060606] via-black/40 to-transparent z-10"></div>
            <div className="absolute inset-y-0 left-0 w-full md:w-2/3 bg-gradient-to-r from-black/80 via-black/45 to-transparent z-10"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.6)_100%)] pointer-events-none z-10" />

            <div className="relative z-20 p-6 sm:p-12 md:p-16 w-full flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div className="w-full md:w-2/3 space-y-4 md:space-y-6">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="px-3 py-1 text-[10px] font-bold tracking-widest uppercase rounded-full bg-primary text-white">
                    {movie.type === 'series' ? 'TV Show' : 'Movie'}
                  </span>
                  {movie.genres && movie.genres.map((genre) => (
                    <span key={genre} className="px-3 py-1 text-[10px] font-semibold tracking-wider rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-white/80">
                      {genre}
                    </span>
                  ))}
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-headline leading-none uppercase tracking-wider text-white">
                  {movie.title}
                </h1>

                <div className="flex items-center space-x-3 bg-black/40 border border-white/5 backdrop-blur-sm px-4 py-1.5 rounded-full w-fit">
                  <StarRating initialRating={movie.rating} readOnly size={16} totalStars={10} />
                  <span className="text-sm font-bold text-white">{movie.rating.toFixed(1)}/10</span>
                </div>

                <p className="text-white/85 leading-relaxed max-w-2xl text-sm md:text-base font-body">
                  {movie.overview || "No overview description is available for this title."}
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  {movie.watchUrl && (
                    <Button 
                      onClick={() => {
                        setActiveVideoUrl(movie.watchUrl ?? null);
                        setActiveVideoTitle(movie.title);
                      }}
                      size="lg" 
                      className="bg-primary hover:bg-[#A40000] text-white h-12 md:h-14 px-8 rounded-full text-xs font-semibold tracking-widest uppercase transition-all duration-300 shadow-[0_4px_15px_rgba(139,0,0,0.4)] hover:-translate-y-0.5 cursor-pointer"
                    >
                      <Play className="mr-2 h-4 w-4 fill-white" /> Watch Now
                    </Button>
                  )}
                  {movie.trailerUrl && (
                    <Button asChild size="lg" className="bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md text-white h-12 md:h-14 px-8 rounded-full text-xs font-semibold tracking-widest uppercase transition-all duration-300 hover:-translate-y-0.5">
                      <a href={movie.trailerUrl} target="_blank" rel="noopener noreferrer" className="flex items-center">
                        <Download className="mr-2 h-4 w-4" /> Watch Trailer
                      </a>
                    </Button>
                  )}
                </div>
              </div>

              {/* Quick Cast List Side Pane */}
              {movie.cast && movie.cast.length > 0 && (
                <div className="w-full md:w-72 flex-shrink-0 space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground tracking-widest uppercase px-1">Top Cast</h4>
                  {movie.cast.slice(0, 3).map((item, index) => (
                    <div key={index} className="flex items-center p-3 rounded-2xl border border-white/5 bg-black/40 backdrop-blur-md">
                      <div className="relative h-10 w-10 mr-3 flex-shrink-0 rounded-full overflow-hidden border border-white/10">
                        <Image
                          src={item.profileUrl || 'https://placehold.co/100x100.png'}
                          alt={item.name}
                          fill
                          className="object-cover"
                          data-ai-hint={item.dataAiHint || "actor headshot"}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-white truncate">{item.name}</p>
                        <p className="text-xs text-white/60 truncate">{item.character}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {/* Episodes List (Web Series only) */}
      {movie.type === 'series' && movie.episodes && movie.episodes.length > 0 && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <Card className="glassmorphism border-white/5 text-white rounded-3xl overflow-hidden shadow-2xl">
            <CardHeader className="border-b border-white/5 p-6 sm:p-8 bg-black/25">
              <CardTitle className="text-2xl font-headline tracking-widest uppercase flex items-center">
                <Tv2 className="mr-3 h-6 w-6 text-primary" /> Series Episodes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 sm:p-8">
              <Accordion type="single" collapsible className="w-full space-y-2">
                {movie.episodes.map((episode, index) => (
                  <AccordionItem value={`item-${index}`} key={index} className="border border-white/5 rounded-2xl overflow-hidden px-4 bg-white/5 hover:bg-white/[0.08] transition-colors">
                    <AccordionTrigger className="hover:no-underline font-semibold text-sm sm:text-base py-4">
                      <span className="text-left text-white/90">Episode {index + 1}: {episode.title}</span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pt-2">
                      <div className="flex flex-wrap items-center gap-4">
                        {episode.watchUrl && (
                          <Button 
                            onClick={() => {
                              setActiveVideoUrl(episode.watchUrl ?? null);
                              setActiveVideoTitle(`${movie.title} - Episode ${index + 1}: ${episode.title}`);
                              // Scroll up to the hero player smoothly
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="bg-primary hover:bg-[#A40000] text-white rounded-full text-xs font-semibold uppercase tracking-wider px-6 cursor-pointer"
                          >
                            <Play className="mr-2 h-4 w-4 fill-white" /> Watch Episode
                          </Button>
                        )}
                        {episode.downloadUrl && (
                          <Button asChild variant="outline" className="bg-white/5 hover:bg-white/10 border-white/10 rounded-full text-xs font-semibold uppercase tracking-wider px-6 text-white">
                            <a href={episode.downloadUrl} target="_blank" rel="noopener noreferrer" className="flex items-center">
                              <Download className="mr-2 h-4 w-4" /> Download Episode
                            </a>
                          </Button>
                        )}
                        {!episode.watchUrl && !episode.downloadUrl && (
                          <p className="text-xs text-muted-foreground">Streaming links are currently unavailable for this episode.</p>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Main Metadata and Reviews Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Columns: Cast & Additional Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Complete Cast Member Grid */}
          <Card className="glassmorphism-card border-white/5 text-white rounded-3xl overflow-hidden shadow-2xl">
            <CardHeader className="border-b border-white/5 p-6 bg-black/25">
              <CardTitle className="text-2xl font-headline tracking-widest uppercase flex items-center">
                <Users className="mr-3 h-6 w-6 text-primary" /> Full Cast Members
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
              {movie.cast && movie.cast.length > 0 ? (
                movie.cast.map((actor, index) => (
                  <div key={index} className="text-center group/actor">
                    <div className="relative h-20 w-20 mx-auto mb-3 rounded-full overflow-hidden border-2 border-white/10 group-hover/actor:border-primary transition-all duration-300">
                      <Image
                        src={actor.profileUrl || 'https://placehold.co/100x100.png'}
                        alt={actor.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover/actor:scale-110"
                        data-ai-hint={actor.dataAiHint || "actor headshot"}
                      />
                    </div>
                    <p className="font-bold text-sm text-white group-hover/actor:text-primary transition-colors">{actor.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{actor.character}</p>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm col-span-full py-4 text-center">Cast details are not listed.</p>
              )}
            </CardContent>
          </Card>

          {/* Details Pane */}
          <Card className="glassmorphism-card border-white/5 text-white rounded-3xl overflow-hidden shadow-2xl">
            <CardHeader className="border-b border-white/5 p-6 bg-black/25">
              <CardTitle className="text-2xl font-headline tracking-widest uppercase flex items-center">
                <FilmIcon className="mr-3 h-6 w-6 text-primary" /> Cinematic Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ul className="divide-y divide-white/5 text-sm">
                <li className="flex justify-between py-3"><span className="font-semibold text-muted-foreground uppercase tracking-wider text-xs">Director</span> <span className="text-right text-white font-bold">{movie.director || 'Unknown Director'}</span></li>
                <li className="flex justify-between py-3"><span className="font-semibold text-muted-foreground uppercase tracking-wider text-xs">Release Date</span> <span className="text-right text-white font-bold">{movie.releaseDate ? new Date(movie.releaseDate).toLocaleDateString(undefined, { dateStyle: 'long' }) : 'N/A'}</span></li>
                <li className="flex justify-between py-3"><span className="font-semibold text-muted-foreground uppercase tracking-wider text-xs">Genres</span> <span className="text-right text-white font-bold">{movie.genres.join(', ') || 'N/A'}</span></li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: User Reviews and Submissions */}
        <div className="lg:col-span-1 space-y-8">
          
          {/* Submit Review Glass Card */}
          <Card className="glassmorphism border-white/5 text-white rounded-3xl overflow-hidden shadow-2xl">
            <CardHeader className="border-b border-white/5 p-6 bg-black/25">
              <CardTitle className="text-2xl font-headline tracking-widest uppercase flex items-center">
                <MessageCircle className="mr-3 h-6 w-6 text-primary" /> Submit Review
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {userId ? (
                <form onSubmit={handleReviewSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label htmlFor="rating" className="block text-xs font-bold text-muted-foreground tracking-widest uppercase">
                      Your Rating ({rating}/10)
                    </label>
                    <div className="flex items-center space-x-1.5 bg-white/5 border border-white/5 p-2 rounded-2xl w-fit">
                      <StarRating initialRating={rating} onRatingChange={setRating} size={22} totalStars={10} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="comment" className="block text-xs font-bold text-muted-foreground tracking-widest uppercase">Your Review Description</label>
                    <Textarea 
                      id="comment" 
                      placeholder={`Draft a review description for ${movie.title}...`} 
                      rows={4} 
                      className="bg-white/5 border-white/10 rounded-2xl text-white placeholder-white/35 focus:bg-white/10 focus:border-primary/50 focus:ring-0 resize-none transition-all"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full bg-primary hover:bg-[#A40000] text-white font-semibold rounded-full h-11 text-xs uppercase tracking-wider transition-all duration-300"
                  >
                    {isSubmitting ? 'Publishing...' : 'Publish Review'}
                  </Button>
                </form>
              ) : (
                <div className="text-center py-6 space-y-4">
                  <p className="text-sm text-muted-foreground">Log in to your account to review this title.</p>
                  <Button asChild className="bg-primary hover:bg-[#A40000] text-white rounded-full px-6 font-semibold uppercase text-xs tracking-wider">
                    <a href="/auth/login">Log In Now</a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* User Reviews List */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground tracking-widest uppercase px-1">Community Reviews</h3>
            {localReviews.length > 0 ? (
              localReviews.map((review) => (
                <Card key={review.id} className="glassmorphism-card border-white/5 text-white rounded-2xl overflow-hidden shadow-lg transition-transform duration-300 hover:scale-[1.01]">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-9 w-9 border border-white/10 bg-primary/20">
                        <AvatarImage src={review.userAvatarUrl ?? undefined} alt={review.userName} data-ai-hint={review.dataAiHintUser || "user avatar"}/>
                        <AvatarFallback className="text-white text-xs font-headline uppercase">{review.userName.substring(0,1)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm text-white truncate">{review.userName}</h4>
                          <span className="text-[10px] text-muted-foreground">{new Date(review.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1 mt-0.5">
                          <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                          <span className="text-xs font-bold text-white/95">{review.rating.toFixed(1)}/10</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-body">{review.comment}</p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="border border-dashed border-white/10 bg-transparent text-center p-8 rounded-2xl">
                <p className="text-muted-foreground text-sm">No reviews submitted yet. Write the first review!</p>
              </Card>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
