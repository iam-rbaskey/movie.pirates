"use client";

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import TransitionLink from '@/components/TransitionLink';
import { usePathname, useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { 
  LayoutDashboard, 
  Film, 
  Folder, 
  Users, 
  Settings, 
  Terminal, 
  LogOut, 
  X, 
  ChevronLeft,
  Loader2,
  Search,
  Contact,
  Menu
} from 'lucide-react';

interface NavLinkItem {
  label: string;
  href: string;
  icon: any;
  isActivePath: boolean;
  isDisabled: boolean;
}

export default function AdminLayoutClient({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Profile info from localStorage
  const [userName, setUserName] = useState("Admin User");
  const [userEmail, setUserEmail] = useState("admin@moviepirates.com");
  const [userAvatar, setUserAvatar] = useState("");
  const [userRole, setUserRole] = useState("admin");

  // Inactive toast state
  const [toastMsg, setToastMsg] = useState("");
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const role = localStorage.getItem('userRole');
    if (token && role === 'admin') {
      setIsAuthorized(true);
      setUserName(localStorage.getItem('userName') || "Admin User");
      setUserAvatar(localStorage.getItem('userAvatarUrl') || "");
      setUserEmail(localStorage.getItem('userEmail') || "admin@moviepirates.com");
      setUserRole(role);
    } else {
      router.push('/auth/login');
    }
    setIsLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userAvatarUrl');
    localStorage.removeItem('userEmail');
    router.push('/auth/login');
  };

  const triggerToast = (label: string) => {
    setToastMsg(`The "${label}" enterprise module is currently in development.`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#050505] text-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-[#FF5A5F]" />
          <p className="text-lg text-[#A1A1A1] font-semibold tracking-wider animate-pulse">VERIFYING AUTHORIZATION...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#050505] text-white">
        <p className="text-lg text-[#EF4444] font-semibold">Unauthorized. Redirecting...</p>
      </div>
    );
  }

  const isCommander = userEmail === 'rbaskeydomi2018@gmail.com';

  const navItems: NavLinkItem[] = [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, isActivePath: pathname === '/admin', isDisabled: false },
    { label: 'Contents', href: '/admin/movies', icon: Film, isActivePath: pathname === '/admin/movies' || pathname.startsWith('/admin/movies/'), isDisabled: false },
    { label: 'Media Assets', href: '/admin/assets', icon: Folder, isActivePath: pathname === '/admin/assets', isDisabled: false },
    { label: 'Analytics', href: '/admin/analytics', icon: Contact, isActivePath: pathname === '/admin/analytics', isDisabled: false },
    { label: 'Search Analytics', href: '/admin/search-analytics', icon: Search, isActivePath: pathname === '/admin/search-analytics', isDisabled: false },
    { label: 'Users', href: '/admin/users', icon: Users, isActivePath: pathname === '/admin/users' || pathname.startsWith('/admin/users/'), isDisabled: false },
    { label: 'Roles & Permissions', href: '/admin/roles', icon: Contact, isActivePath: pathname === '/admin/roles', isDisabled: false },
    { label: 'Audit Logs', href: '/admin/logs', icon: Terminal, isActivePath: pathname === '/admin/logs', isDisabled: false },
    { label: 'Settings', href: '/admin/settings', icon: Settings, isActivePath: pathname === '/admin/settings', isDisabled: false },
  ];

  return (
    <div className="dark bg-[#050505] text-white min-h-screen relative flex overflow-hidden font-sans selection:bg-[#FF5A5F]/30 selection:text-white grain-overlay">
      
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-50 w-[260px] bg-[#070707]/90 backdrop-blur-[24px] border-r border-white/5 flex flex-col justify-between transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Logo Section */}
          <div className="h-16 border-b border-white/5 px-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#00D1B2] via-[#FF5A5F] to-[#8B0000] flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(255,90,95,0.4)] text-sm uppercase">
                MP
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xs tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-[#A1A1A1]">Movie Pirates</span>
                <span className="text-[9px] font-bold text-[#FF5A5F] tracking-widest uppercase">Admin Center</span>
              </div>
            </div>
            {/* Close button on mobile */}
            <button 
              onClick={() => setIsMobileOpen(false)} 
              className="lg:hidden text-[#A1A1A1] hover:text-white p-1 rounded-lg hover:bg-white/5"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-1.5 overflow-y-auto max-h-[calc(100vh-170px)] scrollbar-hide">
            {navItems.map((item) => {
              const Icon = item.icon;
              if (item.isDisabled) {
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => triggerToast(item.label)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide text-[#A1A1A1] hover:text-white hover:bg-white/5 border border-transparent transition-all duration-300 text-left group"
                  >
                    <Icon className="h-4.5 w-4.5 text-[#666666] group-hover:text-[#FF5A5F] transition-colors" />
                    <span>{item.label}</span>
                    <span className="ml-auto text-[8px] bg-white/5 text-[#666666] px-1.5 py-0.5 rounded border border-white/5 font-mono uppercase group-hover:border-[#FF5A5F]/20 group-hover:text-[#FF5A5F]/80 transition-all">Locked</span>
                  </button>
                );
              }

              return (
                <TransitionLink
                  key={item.label}
                  href={item.href}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide border transition-all duration-300 ${
                    item.isActivePath 
                      ? 'bg-gradient-to-r from-[#FF5A5F]/15 to-[#FF5A5F]/5 border-[#FF5A5F]/20 border-l-[4px] border-l-[#FF5A5F] text-white shadow-[0_4px_20px_rgba(255,90,95,0.08)]' 
                      : 'border-transparent text-[#A1A1A1] hover:text-white hover:bg-white/3'
                  }`}
                  onClick={() => setIsMobileOpen(false)}
                >
                  <Icon className={`h-4.5 w-4.5 transition-colors ${item.isActivePath ? 'text-[#FF5A5F]' : 'text-[#A1A1A1]'}`} />
                  <span>{item.label}</span>
                </TransitionLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile Card */}
        <div className="p-4 border-t border-white/5 bg-gradient-to-t from-[#070707] to-transparent">
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-gradient-to-tr from-[#FF5A5F] to-[#8B0000] flex items-center justify-center font-bold text-white shadow-md flex-shrink-0">
                {userAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
                ) : (
                  userName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-bold text-white truncate">{userName}</span>
                <span className="text-[9px] text-[#A1A1A1] font-mono capitalize tracking-wider truncate">{userRole}</span>
              </div>
            </div>
            
            <button 
              onClick={handleLogout}
              type="button"
              className="p-2 rounded-xl text-[#A1A1A1] hover:text-[#FF5A5F] hover:bg-white/5 transition-all"
              title="Logout Account"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Layout */}
      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto lg:pl-[260px] relative z-10">
        
        {/* Sticky Header */}
        <header className="h-16 border-b border-white/5 px-6 flex items-center justify-between bg-[#050505]/60 backdrop-blur-[12px] sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Mobile Sidebar Toggle Button */}
            <button
              onClick={() => setIsMobileOpen(true)}
              type="button"
              className="lg:hidden p-2 text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all"
              title="Open Navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Back to Streaming Button */}
            <TransitionLink 
              href="/"
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-full border border-white/8 hover:border-white/15 transition-all text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back to Streaming</span>
            </TransitionLink>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-[10px] font-bold text-[#A1A1A1] tracking-widest uppercase hidden md:block border border-white/5 px-3 py-1.5 rounded-full bg-white/[0.02]">
              Secure Admin Session
            </div>
            <ThemeToggle />
          </div>
        </header>

        {/* Content Children */}
        <main className="flex-1 p-6 md:p-8 space-y-7 max-w-7xl w-full mx-auto pb-16">
          {children}
        </main>
      </div>

      {/* Floating Glassmorphic Toast */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-[100] max-w-md animate-slide-in-up">
          <div className="bg-[#0D0D0D]/90 backdrop-blur-[24px] border border-white/10 rounded-2xl p-4 flex items-center gap-3 shadow-[0_12px_40px_rgba(0,0,0,0.7)]">
            <div className="w-2 h-2 rounded-full bg-[#FF5A5F] animate-pulse flex-shrink-0" />
            <p className="text-xs font-semibold text-white tracking-wide">{toastMsg}</p>
          </div>
        </div>
      )}
    </div>
  );
}
