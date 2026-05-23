'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { type MovieOutput } from '@/ai/flows/movie-management-flow';
import { Card } from '@/components/ui/card';

interface MovieWallProps {
    movies: MovieOutput[];
}

export default function MovieWall({ movies }: MovieWallProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

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

    // Initial position to center the wall using CSS logic (50% left/top - 50% width/height)
    // We use x and y for movement, starting offset by half width/height to center on the 50% mark

    const getSanitizedUrl = (movie: MovieOutput) => {
        const url = movie.posterUrl;
        if (!url || url.includes('/title/') || url.includes('/name/') || !url.startsWith('http')) {
            return `https://placehold.co/600x900.png?text=${encodeURIComponent(movie.title)}`;
        }
        return url;
    };

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-background cursor-grab active:cursor-grabbing">
            <motion.div
                ref={containerRef}
                drag
                dragMomentum={true}
                className="absolute flex flex-wrap content-start left-1/2 top-1/2"
                style={{
                    width: wallWidth,
                    height: wallHeight,
                    x: -wallWidth / 2,
                    y: -wallHeight / 2,
                }}
            // Remove constraints to allow infinite-like dragging feels
            // dragConstraints={{
            //   left: -wallWidth + windowSize.width,
            //   right: 0,
            //   top: -wallHeight + windowSize.height,
            //   bottom: 0,
            // }}
            >
                {movies.map((movie) => (
                    <motion.div
                        key={movie.id}
                        className="flex items-center justify-center p-4"
                        style={{
                            width: CARD_WIDTH + GAP,
                            height: CARD_HEIGHT + GAP,
                        }}
                        whileHover={{ scale: 1.05, zIndex: 10 }}
                        whileTap={{ scale: 0.95 }}
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
                                    src={getSanitizedUrl(movie)}
                                    alt={movie.title}
                                    fill
                                    className="object-cover transition-transform duration-300 group-hover:scale-110"
                                    sizes="(max-width: 768px) 150px, 200px"
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

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-xl pointer-events-none z-50 border">
                <p className="text-sm font-medium">Drag to explore • Click to view</p>
            </div>
        </div>
    );
}
