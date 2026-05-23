"use client"

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MovieCard from '@/components/MovieCard';
import StarRating from '@/components/StarRating';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Edit3, Film, Star as StarIcon, Trash2, Loader2, UserCircle, Video, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import TransitionLink from '@/components/TransitionLink';
import { getUserProfile, updateUserProfile } from '@/ai/flows/user-profile-flow';
import type { UserProfileOutput, UpdateUserProfileInput } from '@/ai/schemas/user-schemas';


export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<UserProfileOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [avatarUrlInput, setAvatarUrlInput] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const [isClientMounted, setIsClientMounted] = useState(false);

  useEffect(() => {
    setIsClientMounted(true); 

    const fetchUserData = async () => {
      setError(null);
      const userId = localStorage.getItem('userId');
      const token = localStorage.getItem('authToken');

      if (!token || !userId) {
        router.push('/auth/login');
        setIsLoading(false); 
        return;
      }

      try {
        const profileData = await getUserProfile({ userId });
        if (profileData) {
          setUser(profileData);
          setNameInput(profileData.name || '');
          setEmailInput(profileData.email || '');
          setAvatarUrlInput(profileData.avatarUrl || '');
        } else {
          setError("Failed to load user profile. The user might not exist or there was an issue fetching data.");
        }
      } catch (e: any) {
        console.error("Dashboard fetch error:", e);
        setError(e.message || "An unexpected error occurred.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  const handleProfileUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?.id) {
      toast({ variant: "destructive", title: "Error", description: "User ID not found." });
      return;
    }
    setIsUpdatingProfile(true);
    setError(null);

    const updatePayload: UpdateUserProfileInput = { userId: user.id };
    if (nameInput !== user.name) updatePayload.name = nameInput;
    if (emailInput !== user.email) updatePayload.email = emailInput;
    if (avatarUrlInput !== (user.avatarUrl ?? '')) updatePayload.avatarUrl = avatarUrlInput || null;


    if (Object.keys(updatePayload).length <= 1 && updatePayload.userId) {
        toast({ title: "No Changes", description: "No information was changed." });
        setIsUpdatingProfile(false);
        return;
    }

    try {
      const result = await updateUserProfile(updatePayload);
      if (result.success && result.user) {
        setUser(result.user); 
        setNameInput(result.user.name || '');
        setEmailInput(result.user.email || '');
        setAvatarUrlInput(result.user.avatarUrl || '');
        
        toast({ title: "Profile Updated", description: result.message });
        if (result.user.name) localStorage.setItem('userName', result.user.name);
        localStorage.setItem('userAvatarUrl', result.user.avatarUrl || '');

      } else {
        setError(result.message);
        toast({ variant: "destructive", title: "Update Failed", description: result.message });
      }
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred during profile update.");
      toast({ variant: "destructive", title: "Update Error", description: e.message || "An unexpected error occurred." });
    } finally {
      setIsUpdatingProfile(false);
    }
  };
  
  if (!isClientMounted || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">
          {!isClientMounted ? "Preparing dashboard..." : "Loading dashboard..."}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mt-6">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!user) {
     return (
      <Alert className="mt-6">
        <AlertTitle>No User Data</AlertTitle>
        <AlertDescription>Could not load user data. Please try logging in again.</AlertDescription>
         <Button onClick={() => router.push('/auth/login')} className="mt-4">Go to Login</Button>
      </Alert>
    );
  }


  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 p-4 sm:p-6 bg-card rounded-lg shadow-md">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-2 sm:border-4 border-primary shadow-sm">
            <AvatarImage src={user.avatarUrl ?? undefined} alt={user.name} data-ai-hint={user.dataAiHint || "user profile"} />
            <AvatarFallback className="text-xl sm:text-2xl">{user.name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-headline text-primary">{user.name}</h1>
            <p className="text-sm sm:text-base text-muted-foreground">{user.email}</p>
          </div>
        </div>
         <div className="text-left sm:text-right">
           <p className="text-xs sm:text-sm text-muted-foreground">Role</p>
           <p className="text-md sm:text-lg font-semibold capitalize">{user.role}</p>
         </div>
      </header>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 mb-6 sticky top-16 z-30 bg-background/80 backdrop-blur-md py-1 sm:py-2 shadow-sm">
          <TabsTrigger value="profile" className="py-2 sm:py-3 text-sm sm:text-md"><Edit3 className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5"/>Profile</TabsTrigger>
          <TabsTrigger value="watchlist" className="py-2 sm:py-3 text-sm sm:text-md"><Film className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5"/>Watchlist</TabsTrigger>
          <TabsTrigger value="reviews" className="py-2 sm:py-3 text-sm sm:text-md"><StarIcon className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5"/>My Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="shadow-lg transform hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl font-headline flex items-center"><UserCircle className="mr-2 sm:mr-3 h-6 w-6 sm:h-7 sm:w-7 text-primary"/>Edit Profile</CardTitle>
              <CardDescription className="text-sm sm:text-base">Update your personal information. Password changes are handled separately.</CardDescription>
            </CardHeader>
            <form onSubmit={handleProfileUpdate}>
              <CardContent className="space-y-4 sm:space-y-6 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs sm:text-sm font-medium">Full Name</Label>
                    <Input id="name" value={nameInput} onChange={(e) => setNameInput(e.target.value)} disabled={isUpdatingProfile} className="h-10 sm:h-11 text-sm sm:text-base"/>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs sm:text-sm font-medium">Email Address</Label>
                    <Input id="email" type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} disabled={isUpdatingProfile} className="h-10 sm:h-11 text-sm sm:text-base"/>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="avatar" className="text-xs sm:text-sm font-medium">Avatar URL</Label>
                  <Input id="avatar" value={avatarUrlInput} onChange={(e) => setAvatarUrlInput(e.target.value)} placeholder="https://example.com/avatar.png" disabled={isUpdatingProfile} className="h-10 sm:h-11 text-sm sm:text-base"/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="current-password" className="text-xs sm:text-sm">Current Password</Label>
                    <Input id="current-password" type="password" placeholder="Unchanged" disabled className="bg-muted/50 h-10 sm:h-11 text-sm sm:text-base"/>
                     <p className="text-xs text-muted-foreground">Password changes are not available on this form.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="new-password" className="text-xs sm:text-sm">New Password</Label>
                    <Input id="new-password" type="password" placeholder="Unchanged" disabled className="bg-muted/50 h-10 sm:h-11 text-sm sm:text-base"/>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4 sm:pt-6">
                <Button type="submit" disabled={isUpdatingProfile} size="lg">
                  {isUpdatingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Edit3 className="mr-2 h-4 w-4"/>}
                  Save Changes
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="watchlist">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl font-headline flex items-center"><Video className="mr-2 sm:mr-3 h-6 w-6 sm:h-7 sm:w-7 text-primary"/>My Watchlist</CardTitle>
              <CardDescription className="text-sm sm:text-base">Movies you plan to watch.</CardDescription>
            </CardHeader>
            <CardContent>
              {user.watchlist && user.watchlist.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {user.watchlist.map((movie) => ( 
                    <MovieCard key={movie.id} movie={movie} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 sm:py-12 text-muted-foreground">
                  <Video className="mx-auto h-12 w-12 sm:h-16 sm:w-16 mb-4 opacity-50"/>
                  <p className="text-md sm:text-lg">Your watchlist is empty.</p>
                  <p className="text-xs sm:text-sm">Discover movies and add them here!</p>
                  <Button variant="outline" className="mt-4 sm:mt-6" onClick={() => router.push('/movies')}>Browse Movies</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl font-headline flex items-center"><MessageSquare className="mr-2 sm:mr-3 h-6 w-6 sm:h-7 sm:w-7 text-primary"/>My Reviews</CardTitle>
              <CardDescription className="text-sm sm:text-base">Reviews you&apos;ve written.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              {user.reviews && user.reviews.length > 0 ? (
                user.reviews.map((review) => { 
                  return (
                    <Card key={review.id} className="shadow-md hover:shadow-lg transition-shadow duration-300">
                      <CardHeader className="flex flex-col sm:flex-row justify-between items-start pb-2 sm:pb-3">
                        <div className="mb-2 sm:mb-0">
                          <CardTitle className="text-lg sm:text-xl font-semibold font-headline hover:text-primary transition-colors">
                             <TransitionLink href={review.movieId ? `/movies/${review.movieId}` : '#'}>
                              {review.movieTitle ? review.movieTitle : `Review for Movie ID: ${review.movieId}`}
                             </TransitionLink>
                          </CardTitle>
                          <StarRating initialRating={review.rating} readOnly size={16} className="mt-1" />
                        </div>
                         <span className="text-xs text-muted-foreground pt-1 self-start sm:self-auto">{new Date(review.createdAt).toLocaleDateString()}</span>
                      </CardHeader>
                      <CardContent className="pt-0 pb-3 sm:pb-4">
                        <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed line-clamp-3">{review.comment}</p>
                      </CardContent>
                      <CardFooter className="flex justify-end space-x-1 sm:space-x-2 border-t pt-2 pb-2 sm:pt-3 sm:pb-3 px-2 sm:px-4">
                        <Button variant="outline" size="sm" className="px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm"><Edit3 className="mr-1 h-3 w-3" /> Edit</Button>
                        <Button variant="destructive" size="sm" className="px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm"><Trash2 className="mr-1 h-3 w-3" /> Delete</Button>
                      </CardFooter>
                    </Card>
                  );
                })
              ) : (
                <div className="text-center py-10 sm:py-12 text-muted-foreground">
                  <MessageSquare className="mx-auto h-12 w-12 sm:h-16 sm:w-16 mb-4 opacity-50"/>
                  <p className="text-md sm:text-lg">You haven&apos;t written any reviews yet.</p>
                  <p className="text-xs sm:text-sm">Share your thoughts on movies you&apos;ve watched!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
