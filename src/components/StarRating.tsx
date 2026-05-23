"use client";

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

type StarRatingProps = {
  totalStars?: number;
  initialRating?: number;
  onRatingChange?: (rating: number) => void;
  readOnly?: boolean;
  size?: number; // size of the star icon in pixels
  className?: string;
};

const StarRating = React.memo(function StarRating({
  totalStars = 10,
  initialRating = 0,
  onRatingChange,
  readOnly = false,
  size = 24,
  className,
}: StarRatingProps) {
  const [rating, setRating] = useState(initialRating);
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => {
    setRating(initialRating);
  }, [initialRating]);

  const handleClick = (newRating: number) => {
    if (readOnly) return;
    setRating(newRating);
    if (onRatingChange) {
      onRatingChange(newRating);
    }
  };

  const handleMouseEnter = (newRating: number) => {
    if (readOnly) return;
    setHoverRating(newRating);
  };

  const handleMouseLeave = () => {
    if (readOnly) return;
    setHoverRating(0);
  };

  return (
    <div className={cn("flex items-center space-x-1 flex-wrap", className)} aria-label={`Rating: ${rating} out of ${totalStars} stars`}>
      {[...Array(totalStars)].map((_, index) => {
        const starValue = index + 1;
        const isActive = starValue <= (hoverRating || rating);
        return (
          <button
            key={starValue}
            type="button"
            disabled={readOnly}
            className={cn(
              "p-0 bg-transparent border-none",
              !readOnly && "cursor-pointer"
            )}
            onClick={() => handleClick(starValue)}
            onMouseEnter={() => handleMouseEnter(starValue)}
            onMouseLeave={handleMouseLeave}
            aria-label={`Rate ${starValue} star${starValue > 1 ? 's' : ''}`}
          >
            <Star
              size={size}
              className={cn(
                "transition-colors duration-200",
                isActive ? "text-accent fill-accent" : "text-muted-foreground/50"
              )}
            />
          </button>
        );
      })}
    </div>
  );
});

export default StarRating;
