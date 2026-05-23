
"use client";

import Link, { type LinkProps } from 'next/link';
import { usePathname } from 'next/navigation';
import { useLoading } from '@/context/LoadingContext';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type TransitionLinkProps = LinkProps & {
  children: ReactNode;
  className?: string;
};

export default function TransitionLink({ href, children, className, ...props }: TransitionLinkProps) {
  const { setIsLoading } = useLoading();
  const currentPath = usePathname();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // If the link is to the current page, a hash link, or an external link, don't trigger the loader.
    const hrefStr = typeof href === 'string' ? href : href.pathname || '';
    if (hrefStr === currentPath || hrefStr.startsWith('#') || hrefStr.startsWith('http')) {
      return;
    }
    
    // Prevent multiple loader triggers
    e.currentTarget.blur();
    setIsLoading(true);
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={cn(className)}
      {...props}
    >
      {children}
    </Link>
  );
}
