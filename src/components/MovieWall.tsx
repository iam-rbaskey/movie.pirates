'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { type MovieOutput } from '@/ai/flows/movie-management-flow';
import { Card } from '@/components/ui/card';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isTvDevice } from '@/lib/utils';

interface MovieWallProps {
    movies: MovieOutput[];
}

export default function MovieWall({ movies }: MovieWallProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
    const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
    const [isTv, setIsTv] = useState(false);

    // Handle window constraints (optional, but good for centering initially)
    useEffect(() => {
        const handleResize = () => {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        handleResize(); // Initial size
        window.addEventListener('resize', handleResize);
        
        setIsTv(isTvDevice());
        
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Calculate grid dimensions
    // We want a square-ish wall that's larger than the viewport
    // Let's create a grid that roughly tries to fill a large square area based on movie count
    // Responsive sizing
    const isMobile = windowSize.width > 0 && windowSize.width < 768;
    const columns = Math.ceil(Math.sqrt(movies.length));

    // Smaller cards for mobile
    const CARD_WIDTH = isMobile ? 140 : 200;
    const CARD_HEIGHT = isMobile ? 210 : 300;
    const GAP = isMobile ? 30 : 50;

    // Center the wall initially
    const wallWidth = columns * (CARD_WIDTH + GAP);
    const wallHeight = Math.ceil(movies.length / columns) * (CARD_HEIGHT + GAP);

    const getDragConstraints = () => {
        if (typeof window === 'undefined' || windowSize.width === 0) {
            return { left: 0, right: 0, top: 0, bottom: 0 };
        }
        const W = windowSize.width;
        const H = windowSize.height;

        let left = 0, right = 0;
        if (wallWidth <= W) {
            left = (W - wallWidth) / 2;
            right = (W - wallWidth) / 2;
        } else {
            left = W - wallWidth;
            right = 0;
        }

        let top = 0, bottom = 0;
        if (wallHeight <= H) {
            top = (H - wallHeight) / 2;
            bottom = (H - wallHeight) / 2;
        } else {
            top = H - wallHeight;
            bottom = 0;
        }

        return { left, right, top, bottom };
    };

    const getSanitizedUrl = (movie: MovieOutput) => {
        const url = movie.posterUrl;
        if (!url || url.includes('/title/') || url.includes('/name/') || (!url.startsWith('http') && !url.startsWith('data:'))) {
            return `https://placehold.co/600x900.png?text=${encodeURIComponent(movie.title)}`;
        }
        return url;
    };

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-background cursor-grab active:cursor-grabbing">
            {/* Mobile Back Button (Visible only on mobile) */}
            <div className="fixed top-4 left-4 z-50 md:hidden">
                <Link href="/">
                    <Button
                        size="icon"
                        className="h-10 w-10 rounded-full bg-card/85 border border-border backdrop-blur-md text-foreground hover:bg-muted shadow-lg flex items-center justify-center animate-in fade-in duration-200"
                        aria-label="Go back"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                </Link>
            </div>

            <motion.div
                key={`${windowSize.width}-${windowSize.height}`}
                ref={containerRef}
                drag
                dragConstraints={getDragConstraints()}
                dragElastic={0.05}
                dragMomentum={true}
                className="absolute flex flex-wrap content-start left-0 top-0"
                style={{
                    width: wallWidth,
                    height: wallHeight,
                }}
                initial={{
                    x: (windowSize.width - wallWidth) / 2,
                    y: (windowSize.height - wallHeight) / 2
                }}
            >
                {movies.map((movie) => (
                    <motion.div
                        key={movie.id}
                        className="flex items-center justify-center p-4"
                        style={{
                            width: CARD_WIDTH + GAP,
                            height: CARD_HEIGHT + GAP,
                        }}
                        whileHover={isTv ? undefined : { scale: 1.05, zIndex: 10 }}
                        whileTap={isTv ? undefined : { scale: 0.95 }}
                    >
                        <Link href={`/movies/${movie.id}`}>
                            <Card
                                className="overflow-hidden border-0 shadow-lg relative group"
                                style={{
                                    width: CARD_WIDTH,
                                    height: CARD_HEIGHT,
                                    // Ensure card doesn't shrink
                                    flexShrink: 0
                                }}
                            >
                                <Image
                                    src={brokenImages[movie.id] ? `https://placehold.co/600x900.png?text=${encodeURIComponent(movie.title)}` : getSanitizedUrl(movie)}
                                    alt={movie.title}
                                    fill
                                    className="object-cover transition-transform duration-300 group-hover:scale-110"
                                    sizes="(max-width: 768px) 150px, 200px"
                                    referrerPolicy="no-referrer"
                                    onError={() => {
                                        setBrokenImages(prev => ({ ...prev, [movie.id]: true }));
                                    }}
                                    priority={false}
                                />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-4 text-center">
                                    <h3 className="text-white font-bold text-lg line-clamp-2">{movie.title}</h3>
                                    <p className="text-gray-300 text-xs mt-2">{movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : 'N/A'}</p>
                                </div>
                            </Card>
                        </Link>
                    </motion.div>
                ))}
            </motion.div>

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-xl pointer-events-none z-50 border hidden md:block">
                <p className="text-sm font-medium">Drag to explore • Click to view</p>
            </div>
        </div>
    );
}
