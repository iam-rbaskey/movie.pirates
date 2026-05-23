import React, { Suspense } from 'react';
import { getSuggestions } from '@/ai/flows/suggestion-flow';
import { Loader2, MessageSquare } from 'lucide-react';
import SuggestionsClientPage from './SuggestionsClientPage';

export const revalidate = 300; // Revalidate every 5 minutes

export default async function SuggestionsPage() {
  const initialSuggestions = await getSuggestions();

  return (
    <div className="space-y-8 animate-fade-in py-8">
      <header className="space-y-4 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold font-headline flex items-center justify-center">
          <MessageSquare className="mr-2 sm:mr-3 h-8 w-8 sm:h-10 sm:w-10 text-primary" /> Movie Suggestions
        </h1>
        <p className="text-muted-foreground text-md sm:text-lg max-w-2xl mx-auto">
          See what the community wants to see next, or add your own suggestion!
        </p>
      </header>
      
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-25rem)]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-lg text-muted-foreground">Loading suggestions...</p>
        </div>
      }>
        <SuggestionsClientPage initialSuggestions={initialSuggestions} />
      </Suspense>
    </div>
  );
}
