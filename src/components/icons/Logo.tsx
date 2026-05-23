import Image from 'next/image';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
    const imageUrl = "https://i.ibb.co/Lz7Qb3rv/movie-pirates-logo-v1-1.png";

    return (
        <div className={cn("relative", className)}>
            <Image
                src={imageUrl}
                alt="Movie Pirates Logo"
                fill
                sizes="200px" // A hint for the browser to optimize image loading
                className="object-contain"
                priority
            />
        </div>
    );
}
