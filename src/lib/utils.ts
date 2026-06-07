import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isTvDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const tvKeywords = [
    'smarttv', 'googletv', 'appletv', 'androidtv', 'roku', 'hbbtv', 'tizen', 
    'web0s', 'webos', 'viera', 'casttv', 'opera tv', 'sonydtv', 'playstation', 
    'xbox', 'dtv', 'smart-tv', 'bravia', 'philips-tv', 'sharp-tv', 'panasonic-tv',
    'lgnetcast', 'nettv', 'crkey', 'chromecast', 'vizio', 'apple tv', 'firetv', 'firestick'
  ];
  return tvKeywords.some(keyword => ua.toLowerCase().includes(keyword));
}



