"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addSuggestion, type SuggestionOutput } from '@/ai/flows/suggestion-flow';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import TransitionLink from '@/components/TransitionLink';

const suggestionFormSchema = z.object({
  text: z.string().min(3, { message: "Suggestion must be at least 3 characters." }).max(500, "Too long!"),
});

type SuggestionFormValues = z.infer<typeof suggestionFormSchema>;

export default function SuggestionsClientPage({ initialSuggestions }: { initialSuggestions: SuggestionOutput[] }) {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<SuggestionOutput[]>(initialSuggestions);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const id = localStorage.getItem('userId');
    setIsLoggedIn(!!token);
    setUserId(id);
  }, []);

  const form = useForm<SuggestionFormValues>({
    resolver: zodResolver(suggestionFormSchema),
    defaultValues: {
      text: '',
    },
  });

  const onSubmit = async (data: SuggestionFormValues) => {
    if (!userId) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to submit a suggestion.' });
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await addSuggestion({ text: data.text, userId });
      if (result.success && result.suggestion) {
        setSuggestions(prev => [result.suggestion!, ...prev]);
        toast({ title: 'Success', description: 'Your suggestion has been submitted!' });
        form.reset();
        setIsModalOpen(false);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message || 'An unexpected error occurred.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button size="lg">
              <PlusCircle className="mr-2 h-5 w-5" /> Add Your Suggestion
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            {isLoggedIn ? (
              <>
                <DialogHeader>
                  <DialogTitle>Suggest a Movie or Series</DialogTitle>
                  <DialogDescription>
                    What do you want to see on Movie Pirates? Let us know!
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="text"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your Suggestion</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="e.g., 'Add the classic 1980s sci-fi movie Blade Runner'"
                              className="resize-none"
                              rows={4}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit Suggestion
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </>
            ) : (
                <DialogHeader>
                  <DialogTitle>Login Required</DialogTitle>
                  <DialogDescription>
                    You need to be logged in to make a suggestion.
                  </DialogDescription>
                  <DialogFooter className="pt-4">
                    <Button asChild>
                      <TransitionLink href="/auth/login">Go to Login</TransitionLink>
                    </Button>
                  </DialogFooter>
                </DialogHeader>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {suggestions.length > 0 ? (
          suggestions.map((suggestion) => (
            <Card key={suggestion.id} className="p-4 shadow-md">
              <CardContent className="p-0 flex items-start space-x-4">
                <Avatar className="h-10 w-10 border">
                  <AvatarImage src={suggestion.userAvatarUrl ?? undefined} alt={suggestion.userName} data-ai-hint={suggestion.dataAiHintUser || 'user avatar'} />
                  <AvatarFallback>{suggestion.userName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-baseline justify-between">
                    <p className="font-semibold text-foreground">{suggestion.userName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(suggestion.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <p className="text-sm text-foreground/80 mt-1">{suggestion.text}</p>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Alert>
            <MessageSquare className="h-4 w-4" />
            <AlertTitle>No Suggestions Yet</AlertTitle>
            <AlertDescription>
              Be the first to suggest a movie or series for the community!
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
