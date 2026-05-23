
"use client";

import * as React from 'react';
import StarRating from '@/components/StarRating';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import type { ReviewOutput } from '@/ai/schemas/review-schemas'; 
import type { MovieOutput } from '@/ai/schemas/movie-schemas'; 
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Play, Users, MessageCircle, Download, Tv2, FilmIcon } from 'lucide-react';
import Image from 'next/image';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from '@/hooks/use-toast';
import { addReview } from '@/ai/flows/review-flow';

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
    <div className="animate-fade-in py-8 md:py-12">
      {/* Movie Hero Section */}
      <section className="relative mb-12 rounded-xl overflow-hidden min-h-[50vh] flex items-end text-white shadow-2xl">
        {backdropUrl && (
          <Image
            src={backdropUrl}
            alt={`Backdrop for ${movie.title}`}
            fill 
            style={{ objectFit: 'cover' }}
            className="absolute inset-0 z-0"
            data-ai-hint={movie.dataAiHint || "movie scene"}
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent z-10"></div>
         <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background to-transparent z-10"></div>

        <div className="relative z-20 p-6 md:p-10 w-full flex flex-col md:flex-row items-center gap-8">
          <div className="md:w-1/2 lg:w-2/3 space-y-4">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-headline leading-tight">{movie.title}</h1>
            <div className="flex items-center space-x-2">
              <StarRating initialRating={movie.rating} readOnly size={20} totalStars={10} />
              <span className="text-lg font-semibold">{movie.rating.toFixed(1)}</span>
            </div>
            <p className="text-foreground/80 leading-relaxed max-w-xl line-clamp-3">{movie.overview}</p>
            <div className="flex items-center gap-3 pt-4">
              {movie.watchUrl && (
                  <Button asChild size="lg" className="text-lg h-12 px-8">
                    <a href={movie.watchUrl} target="_blank" rel="noopener noreferrer">
                      <Play className="mr-2 h-6 w-6" /> Watch Now
                    </a>
                  </Button>
              )}
               {movie.trailerUrl && (
                 <Button asChild size="lg" variant="secondary">
                   <a href={movie.trailerUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="mr-2 h-6 w-6" /> Download
                   </a>
                 </Button>
               )}
            </div>
          </div>
          <div className="md:w-1/2 lg:w-1/3 flex-shrink-0 space-y-4">
              {movie.cast.slice(0, 3).map((item, index) => (
                  <div key={index} className="flex items-center p-2 rounded-lg bg-black/30 backdrop-blur-sm">
                       <Image
                          src={item.profileUrl || 'https://placehold.co/100x100.png'}
                          alt={item.name}
                          width={40}
                          height={40}
                          className="rounded-full mr-3"
                           data-ai-hint={item.dataAiHint || "actor headshot"}
                        />
                        <div>
                            <p className="font-semibold text-sm">{item.name}</p>
                            <p className="text-xs text-white/70">{item.character}</p>
                        </div>
                  </div>
              ))}
          </div>
        </div>
      </section>

      {/* Episodes Section */}
      {movie.type === 'series' && movie.episodes && movie.episodes.length > 0 && (
        <section className="mb-8 md:mb-12">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-2xl font-headline flex items-center">
                  <Tv2 className="mr-3 h-6 w-6 text-primary" /> Episodes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {movie.episodes.map((episode, index) => (
                    <AccordionItem value={`item-${index}`} key={index}>
                      <AccordionTrigger>
                        <span className="text-left">Episode {index + 1}: {episode.title}</span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="flex items-center gap-4">
                          {episode.watchUrl && (
                             <Button asChild>
                                <a href={episode.watchUrl} target="_blank" rel="noopener noreferrer">
                                    <Play className="mr-2 h-4 w-4" /> Watch Episode
                                </a>
                             </Button>
                          )}
                          {episode.downloadUrl && (
                            <Button asChild variant="secondary">
                              <a href={episode.downloadUrl} target="_blank" rel="noopener noreferrer">
                                <Download className="mr-2 h-4 w-4" /> Download Episode
                              </a>
                            </Button>
                          )}
                          {!episode.watchUrl && !episode.downloadUrl && (
                              <p className="text-sm text-muted-foreground">No links available for this episode.</p>
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
        {/* Left Column: Cast & Details */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-2xl font-headline flex items-center">
                <Users className="mr-3 h-6 w-6 text-primary" /> Cast
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {movie.cast.map((actor, index) => (
                <div key={index} className="text-center">
                  <Avatar className="h-20 w-20 mx-auto mb-2">
                    <AvatarImage src={actor.profileUrl || 'https://placehold.co/100x100.png'} alt={actor.name} data-ai-hint={actor.dataAiHint || "actor headshot"} />
                    <AvatarFallback>{actor.name.substring(0,1)}</AvatarFallback>
                  </Avatar>
                  <p className="font-medium text-sm">{actor.name}</p>
                  <p className="text-xs text-muted-foreground">{actor.character}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-2xl font-headline flex items-center">
                <FilmIcon className="mr-3 h-6 w-6 text-primary" /> Details
              </CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-2 text-sm">
                    <li className="flex justify-between"><span className="font-semibold text-muted-foreground">Director:</span> <span className="text-right">{movie.director || 'N/A'}</span></li>
                    <li className="flex justify-between"><span className="font-semibold text-muted-foreground">Release Date:</span> <span className="text-right">{movie.releaseDate ? new Date(movie.releaseDate).toLocaleDateString() : 'N/A'}</span></li>
                    <li className="flex justify-between"><span className="font-semibold text-muted-foreground">Genres:</span> <span className="text-right">{movie.genres.join(', ') || 'N/A'}</span></li>
                </ul>
            </CardContent>
          </Card>

        </div>

        {/* Right Column: Reviews */}
        <div className="lg:col-span-1 space-y-8">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-2xl font-headline flex items-center">
                <MessageCircle className="mr-3 h-6 w-6 text-primary" /> Reviews
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {userId ? (
                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="rating" className="block text-sm font-medium text-foreground mb-2">
                      Your Rating ({rating}/10)
                    </label>
                    <StarRating initialRating={rating} onRatingChange={setRating} size={24} totalStars={10} />
                  </div>
                  <div>
                    <label htmlFor="comment" className="block text-sm font-medium text-foreground mb-2">Your Review</label>
                    <Textarea 
                      id="comment" 
                      placeholder={`What did you think of ${movie.title}?`} 
                      rows={4} 
                      className="bg-input"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Submitting...' : 'Submit Review'}
                  </Button>
                </form>
              ) : (
                <div className="text-center py-4 space-y-3">
                  <p className="text-sm text-muted-foreground">You must be logged in to leave a review.</p>
                  <Button asChild size="sm">
                    <a href="/auth/login">Log In</a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            {localReviews.length > 0 ? localReviews.map((review) => (
              <Card key={review.id} className="bg-secondary">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={review.userAvatarUrl ?? undefined} alt={review.userName} data-ai-hint={review.dataAiHintUser || "user avatar"}/>
                      <AvatarFallback>{review.userName.substring(0,1)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold">{review.userName}</h4>
                        <span className="text-xs text-muted-foreground">{new Date(review.createdAt).toLocaleDateString()}</span>
                      </div>
                      <StarRating initialRating={review.rating} readOnly size={16} totalStars={10} className="mb-2" />
                      <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <p className="text-muted-foreground text-center py-4">No reviews yet. Be the first!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
