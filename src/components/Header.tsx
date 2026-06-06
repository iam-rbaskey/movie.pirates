"use client";

import TransitionLink from '@/components/TransitionLink';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, 
  Menu, 
  User, 
  LayoutDashboard, 
  LogOut, 
  Home, 
  Film, 
  Tv,
  Bookmark, 
  X, 
  Sparkles,
  Moon,
  Sun,
  Play
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
import { updateUserActivity } from '@/ai/flows/user-activity-flow';
import { trackAnonymousVisitor } from '@/ai/flows/visitor-tracking-flow';
import { Logo } from './icons/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/movies', label: 'Movies' },
  { href: '/series', label: 'TV Shows' },
  { href: '/explore', label: 'Collections' },
  { href: '/dashboard', label: 'My List' },
];

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [visitorTracked, setVisitorTracked] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  // Monitor scroll for header shrinking and blur intensification
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      const name = localStorage.getItem('userName');
      const role = localStorage.getItem('userRole');
      const avatar = localStorage.getItem('userAvatarUrl');
      setIsLoggedIn(!!token);
      setUserName(name);
      setUserRole(role);
      setUserAvatarUrl(avatar);
    }
  }, [pathname]);

  useEffect(() => {
    // Track logged-in user activity
    const userId = localStorage.getItem('userId');
    if (userId) {
      const intervalId = setInterval(() => {
        updateUserActivity({ userId }).catch(console.error);
      }, 30000);
      return () => clearInterval(intervalId);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    // Track anonymous visitors once per session
    const trackVisitor = async () => {
      if (isClient && !isLoggedIn && !visitorTracked) {
        setVisitorTracked(true);
        let visitorId = localStorage.getItem('visitorId');
        if (!visitorId) {
          visitorId = crypto.randomUUID();
          localStorage.setItem('visitorId', visitorId);
        }
        try {
          await trackAnonymousVisitor({ visitorId });
        } catch (e) {
          console.error("Failed to track visitor:", e);
        }
      }
    };
    trackVisitor();
  }, [isClient, isLoggedIn, visitorTracked]);

  const handleLogout = async () => {
    try {
      const { logoutUser } = await import('@/ai/flows/user-auth-flow');
      await logoutUser();
    } catch (err) {
      console.error('Failed to logout via server action:', err);
    }
    
    // Fallback manual cookie clear in browser just in case
    document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
    document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';

    localStorage.clear();
    setIsLoggedIn(false);
    setUserName(null);
    setUserRole(null);
    setUserAvatarUrl(null);
    setVisitorTracked(false);
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
    router.push('/auth/login');
  };

  const isActiveLink = (href: string) => {
    if (href === '/') return pathname === href;
    return pathname.startsWith(href);
  };

  const { theme, setTheme } = useTheme();
  const currentTheme = theme === 'system' ? 'dark' : theme;

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsMobileSearchOpen(false);
    const destination = pathname.startsWith('/series') ? '/series' : '/movies';
    router.push(`${destination}?q=${encodeURIComponent(searchQuery)}`);
  };

  // Define mobile bottom navigation items
  const bottomNavItems = [
    { icon: Home, label: 'Home', href: '/' },
    { icon: Film, label: 'Movies', href: '/movies' },
    { icon: Tv, label: 'Series', href: '/series' },
    { icon: Search, label: 'Search', onClick: () => setIsMobileSearchOpen(true) },
    { icon: User, label: 'Profile', href: '/dashboard' }
  ];

  return (
    <>
      {/* DESKTOP FLOATING NAVBAR */}
      <header
        className={cn(
          "fixed left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-7xl transition-all duration-500 ease-out rounded-full border glassmorphism hidden md:block",
          isScrolled 
            ? "top-4 h-[60px] bg-background/85 backdrop-blur-[24px] border-primary/20 shadow-[0_15px_40px_rgba(0,0,0,0.65)]" 
            : "top-6 h-[76px] bg-background/45 backdrop-blur-[16px] border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.45)]"
        )}
      >
        <div className="h-full px-6 flex items-center justify-between">
          <div className="flex items-center space-x-6 lg:space-x-8">
            <TransitionLink href="/" aria-label="Homepage" className="flex-shrink-0">
              <Logo className="h-8 w-auto min-w-[120px] transition-transform duration-300 hover:scale-105" />
            </TransitionLink>

            {/* Desktop Navigation Links */}
            <nav className="flex items-center space-x-1 lg:space-x-2">
              {navLinks.map((link) => {
                const active = isActiveLink(link.href);
                return (
                  <TransitionLink
                    key={link.label}
                    href={link.href}
                    className={cn(
                      "relative px-4 py-2 text-xs lg:text-sm font-semibold tracking-wider uppercase transition-all duration-300 rounded-full",
                      active 
                        ? "text-primary dark:text-white bg-primary/10 dark:bg-primary/25 border border-primary/20 dark:border-primary/30" 
                        : "text-foreground/70 hover:text-foreground dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
                    )}
                  >
                    {link.label}
                    {active && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    )}
                  </TransitionLink>
                );
              })}
              {isClient && isLoggedIn && userRole === 'admin' && (
                <TransitionLink
                  href="/admin"
                  className={cn(
                    "px-4 py-2 text-xs lg:text-sm font-semibold tracking-wider uppercase transition-all duration-300 rounded-full",
                    isActiveLink('/admin')
                      ? "text-primary dark:text-white bg-primary/10 dark:bg-primary/25 border border-primary/20 dark:border-primary/30"
                      : "text-foreground/70 hover:text-foreground dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
                  )}
                >
                  Admin
                </TransitionLink>
              )}
            </nav>
          </div>

          <div className="flex items-center space-x-3 lg:space-x-4">
            {/* Search Form */}
            <form onSubmit={handleSearch} className="relative hidden lg:block">
              <Input
                type="search"
                placeholder="Search movies, series..."
                className="h-10 w-48 xl:w-64 pl-10 pr-4 text-xs tracking-wider rounded-full border-white/10 bg-white/5 backdrop-blur-md focus:w-72 focus:bg-background/90 transition-all duration-350"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            </form>

            <ThemeToggle />

            {/* Profile Avatar / Login Button */}
            {isClient && isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center cursor-pointer">
                    <Avatar className="h-9 w-9 border-2 border-primary/40 hover:border-primary transition-colors p-0.5 bg-background">
                      <AvatarImage src={userAvatarUrl ?? undefined} alt={userName || 'User Avatar'} />
                      <AvatarFallback className="bg-primary/10 dark:bg-primary/25 text-primary dark:text-white font-headline text-sm">
                        {userName ? userName.charAt(0).toUpperCase() : 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 glassmorphism border-border rounded-2xl p-2 mt-2">
                  <DropdownMenuLabel className="font-normal px-3 py-2">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-semibold leading-none text-foreground">{userName}</p>
                      <p className="text-xs leading-none text-muted-foreground">{userRole === 'admin' ? 'Administrator' : 'Premium Member'}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border" />
                  {userRole === 'admin' && (
                    <DropdownMenuItem onClick={() => router.push('/admin')} className="rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-foreground focus:bg-accent/10 focus:text-accent-foreground">
                      <LayoutDashboard className="mr-2 h-4 w-4 text-primary" />
                      <span>Admin Panel</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => router.push('/dashboard')} className="rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-foreground focus:bg-accent/10 focus:text-accent-foreground">
                    <User className="mr-2 h-4 w-4 text-primary" />
                    <span>My Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem onClick={handleLogout} className="rounded-xl hover:bg-red-500/10 focus:bg-red-500/20 text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                onClick={() => router.push('/auth/login')}
                className="h-10 px-5 rounded-full text-xs font-semibold tracking-widest uppercase bg-primary hover:bg-primary_hover text-white transition-all shadow-[0_4px_15px_rgba(139,0,0,0.3)] hover:shadow-[0_4px_20px_rgba(139,0,0,0.5)]"
              >
                Login
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* MOBILE TOP NAVBAR REMOVED FOR RESOURCE AND LAYOUT OPTIMIZATION */}

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[92%] h-[72px] rounded-full bg-[#0F0F0F]/85 backdrop-blur-[20px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.7)] flex items-center justify-around px-4 md:hidden">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const active = item.href ? (item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)) : false;

          return (
            <button
              key={item.label}
              onClick={item.onClick || (() => router.push(item.href || '/'))}
              className="flex flex-col items-center justify-center flex-1 h-full py-1 text-center"
            >
              <div className={cn(
                "flex items-center justify-center p-2 rounded-full transition-all duration-350",
                active 
                  ? "bg-primary text-white shadow-[0_4px_15px_rgba(139,0,0,0.55)] scale-110" 
                  : "text-muted-foreground hover:text-white"
              )}>
                <Icon className="h-5 w-5" />
              </div>
              <span className={cn(
                "text-[10px] mt-1 font-semibold tracking-wide uppercase transition-colors",
                active ? "text-white" : "text-muted-foreground/75"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* MOBILE SEARCH OVERLAY DIALOG */}
      {isMobileSearchOpen && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col justify-start pt-16 px-6 md:hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              <span className="font-headline font-bold text-lg tracking-wider text-white">SEARCH MOVIE PIRATES</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full bg-white/5 border border-white/10 text-white"
              onClick={() => setIsMobileSearchOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <form onSubmit={handleSearch} className="relative w-full">
            <Input
              autoFocus
              type="search"
              placeholder="Type title, genre, actor..."
              className="h-14 w-full pl-12 pr-4 text-base rounded-2xl border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-primary/50 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" />
          </form>

          <div className="mt-8">
            <h4 className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-3">Popular Searches</h4>
            <div className="flex flex-wrap gap-2">
              {['Batman', 'Pirates', 'Action', 'Series', 'Interstellar'].map((term) => (
                <button
                  key={term}
                  onClick={() => {
                    setSearchQuery(term);
                    router.push(`/movies?q=${encodeURIComponent(term)}`);
                    setIsMobileSearchOpen(false);
                  }}
                  className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-white/80 hover:bg-primary/20 hover:text-white transition-all"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );

  function handleProfileClick() {
    if (userRole === 'admin') {
      router.push('/admin');
    } else {
      router.push('/dashboard');
    }
  }
}
