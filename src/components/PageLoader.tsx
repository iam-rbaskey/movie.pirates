"use client";

import { useLoading } from '@/context/LoadingContext';
import { cn } from '@/lib/utils';
import { Clapperboard } from 'lucide-react';

export default function PageLoader() {
  const { isLoading } = useLoading();

  return (
    <div
      className={cn(
        'page-loader fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm transition-opacity duration-500',
        isLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
    >
      <Clapperboard
        className="h-24 w-24 animate-pulse-scale text-primary"
        aria-label="Loading page"
        strokeWidth={1.5}
      />
    </div>
  );
}
