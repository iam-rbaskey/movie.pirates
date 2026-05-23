
"use client";

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import TransitionLink from '@/components/TransitionLink';
import { usePathname, useRouter } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/icons/Logo';
import { AdminHeader } from '@/components/AdminHeader';
import { LayoutDashboard, Users, Film, Star, Loader2 } from 'lucide-react';

const adminNavLinks = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/movies', label: 'Content', icon: Film },
  { href: '/admin/reviews', label: 'Reviews', icon: Star },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const role = localStorage.getItem('userRole');
    if (token && role === 'admin') {
      setIsAuthorized(true);
    } else {
      router.push('/auth/login'); // Or '/dashboard' if preferred for non-admins
    }
    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Verifying authorization...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    // This ideally should not be visible for long as router.push should navigate away
    return (
        <div className="flex h-screen items-center justify-center bg-background">
            <p className="text-lg text-destructive">Unauthorized. Redirecting...</p>
        </div>
    );
  }

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon">
        <SidebarHeader className="p-4">
          <div className="flex items-center justify-between">
            <TransitionLink href="/admin" className="flex items-center gap-2 font-semibold">
              <Logo className="h-7 w-[121px]" />
              <span className="group-data-[collapsible=icon]:hidden">Admin Panel</span>
            </TransitionLink>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {adminNavLinks.map((link) => (
              <SidebarMenuItem key={link.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href))}
                  tooltip={{ children: link.label, side: 'right', align: 'center' }}
                >
                  <TransitionLink href={link.href}>
                    <link.icon className="h-5 w-5" />
                    <span>{link.label}</span>
                  </TransitionLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <div className="flex flex-col min-h-screen">
            <AdminHeader />
            <main className="flex-1 p-6 bg-muted/40">
              {children}
            </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
