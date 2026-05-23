
"use client";

import TransitionLink from '@/components/TransitionLink';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Menu, User, LayoutDashboard, LogOut } from 'lucide-react';
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
import { updateUserActivity } from '@/ai/flows/user-activity-flow';
import { trackAnonymousVisitor } from '@/ai/flows/visitor-tracking-flow';
import { Logo } from './icons/Logo';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/series', label: 'Web Series' },
  { href: '/movies', label: 'Movies' },
  { href: '/suggestions', label: 'Suggestions' },
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
  }, [isLoggedIn]); // Rerun when login state changes

  useEffect(() => {
    // Track anonymous visitors once per session
    const trackVisitor = async () => {
      if (isClient && !isLoggedIn && !visitorTracked) {
        setVisitorTracked(true); // Prevent re-tracking
        let visitorId = localStorage.getItem('visitorId');
        if (!visitorId) {
          visitorId = crypto.randomUUID();
          localStorage.setItem('visitorId', visitorId);
        }
        try {
          // The backend flow checks if the visitor is new.
          await trackAnonymousVisitor({ visitorId });
        } catch (e) {
          console.error("Failed to track visitor:", e);
        }
      }
    };
    trackVisitor();
  }, [isClient, isLoggedIn, visitorTracked]);


  const handleLogout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
    setUserName(null);
    setUserRole(null);
    setUserAvatarUrl(null);
    setVisitorTracked(false); // Allow re-tracking on next visit after logout
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
    router.push('/auth/login');
  };

  const isActiveLink = (href: string) => {
    if (href === '/') return pathname === href;
    return pathname.startsWith(href);
  };
  
  const handleProfileClick = () => {
    if (userRole === 'admin') {
      router.push('/admin');
    } else {
      router.push('/dashboard');
    }
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // If on a series page, search within series. Otherwise, default to movies.
    const destination = pathname.startsWith('/series') ? '/series' : '/movies';
    router.push(`${destination}?q=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center space-x-8">
            <TransitionLink href="/" aria-label="Homepage">
              <Logo className="h-10 w-[173px]" />
            </TransitionLink>
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              {navLinks.map((link) => (
                <TransitionLink
                  key={link.label}
                  href={link.href}
                  className={`text-sm font-medium transition-colors ${
                    isActiveLink(link.href)
                      ? 'text-primary'
                      : 'text-foreground/70 hover:text-foreground'
                  }`}
                >
                  {link.label}
                </TransitionLink>
              ))}
              {isClient && isLoggedIn && userRole === 'admin' && (
                  <TransitionLink
                    href="/admin"
                    className={`text-sm font-medium transition-colors ${
                      isActiveLink('/admin')
                        ? 'text-primary'
                        : 'text-foreground/70 hover:text-foreground'
                    }`}
                  >
                    Admin
                  </TransitionLink>
              )}
            </nav>
          </div>

          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Search and User Area */}
             <div className="hidden md:flex items-center space-x-4">
                <form onSubmit={handleSearch} className="relative">
                  <Input
                    type="search"
                    placeholder="Search..."
                    className="h-9 w-40 lg:w-64 pl-9 pr-3 text-sm rounded-md"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </form>
                {isClient && isLoggedIn ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div className="flex items-center gap-2 cursor-pointer">
                        <Avatar className="h-9 w-9 border border-border hover:opacity-90 transition-opacity">
                          <AvatarImage src={userAvatarUrl ?? undefined} alt={userName || 'User Avatar'} data-ai-hint="user avatar" />
                          <AvatarFallback>{userName ? userName.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
                        </Avatar>
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">{userName}</p>
                          <p className="text-xs leading-none text-muted-foreground">{userRole === 'admin' ? 'Administrator' : 'User'}</p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {userRole === 'admin' && (
                        <DropdownMenuItem onClick={() => router.push('/admin')}>
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          <span>Admin Panel</span>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                        <User className="mr-2 h-4 w-4" />
                        <span>My Profile</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button size="sm" onClick={() => router.push('/auth/login')}>Login</Button>
                )}
             </div>

            {/* Mobile Menu */}
            <div className="md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="bg-background w-3/4">
                  <SheetHeader className="p-4 border-b">
                     <SheetTitle className="sr-only">Main Menu</SheetTitle>
                     <TransitionLink href="/" aria-label="Homepage">
                       <Logo className="h-8 w-[138px]" />
                    </TransitionLink>
                  </SheetHeader>
                  <div className="p-4 space-y-6">
                     <form onSubmit={handleSearch} className="relative">
                      <Input
                        type="search"
                        placeholder="Search..."
                        className="h-10 w-full pl-10 pr-4 text-base rounded-md"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    </form>
                    <nav className="flex flex-col space-y-4">
                      {navLinks.map((link) => (
                        <TransitionLink
                          key={link.label}
                          href={link.href}
                          className={`text-lg font-medium transition-colors ${
                            isActiveLink(link.href)
                              ? 'text-primary'
                              : 'text-foreground/70 hover:text-foreground'
                          }`}
                        >
                          {link.label}
                        </TransitionLink>
                      ))}
                      {isClient && isLoggedIn && userRole === 'admin' && (
                        <TransitionLink
                          href="/admin"
                          className={`text-lg font-medium transition-colors ${
                            isActiveLink('/admin')
                              ? 'text-primary'
                              : 'text-foreground/70 hover:text-foreground'
                          }`}
                        >
                          Admin
                        </TransitionLink>
                      )}
                    </nav>
                     {isClient && isLoggedIn ? (
                        <Button className="w-full" onClick={handleProfileClick}>
                           {userRole === 'admin' ? 'Admin Panel' : 'My Dashboard'}
                        </Button>
                      ) : (
                        <Button className="w-full" onClick={() => router.push('/auth/login')}>Login</Button>
                      )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
