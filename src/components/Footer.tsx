import TransitionLink from '@/components/TransitionLink';
import { Logo } from './icons/Logo';
import { Facebook, Twitter, Instagram } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-card text-card-foreground border-t border-primary/20 mt-8 md:mt-16">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Desktop Footer (Hidden on mobile) */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-8 py-12">
          {/* About Section */}
          <div className="col-span-2 lg:col-span-1 space-y-4">
            <Logo className="h-9 w-[155px]" />
            <p className="text-muted-foreground text-sm">
              The best place to discover, watch, and discuss your favorite movies and series.
            </p>
            <div className="flex space-x-4">
              <TransitionLink href="#" aria-label="Facebook">
                <Facebook className="h-6 w-6 text-muted-foreground hover:text-primary transition-colors" />
              </TransitionLink>
              <TransitionLink href="#" aria-label="Twitter">
                <Twitter className="h-6 w-6 text-muted-foreground hover:text-primary transition-colors" />
              </TransitionLink>
              <TransitionLink href="#" aria-label="Instagram">
                <Instagram className="h-6 w-6 text-muted-foreground hover:text-primary transition-colors" />
              </TransitionLink>
            </div>
          </div>

          {/* Links Sections */}
          <div className="col-span-1">
            <h3 className="font-bold text-foreground mb-4">Movie</h3>
            <ul className="space-y-2 text-sm">
              <li><TransitionLink href="#" className="text-muted-foreground hover:text-primary transition-colors">Action</TransitionLink></li>
              <li><TransitionLink href="#" className="text-muted-foreground hover:text-primary transition-colors">Comedy</TransitionLink></li>
              <li><TransitionLink href="#" className="text-muted-foreground hover:text-primary transition-colors">Horror</TransitionLink></li>
              <li><TransitionLink href="#" className="text-muted-foreground hover:text-primary transition-colors">Animation</TransitionLink></li>
              <li><TransitionLink href="#" className="text-muted-foreground hover:text-primary transition-colors">Fantasy</TransitionLink></li>
            </ul>
          </div>

          <div className="col-span-1">
            <h3 className="font-bold text-foreground mb-4">Series</h3>
            <ul className="space-y-2 text-sm">
              <li><TransitionLink href="#" className="text-muted-foreground hover:text-primary transition-colors">Reality Shows</TransitionLink></li>
              <li><TransitionLink href="#" className="text-muted-foreground hover:text-primary transition-colors">Classic Shows</TransitionLink></li>
              <li><TransitionLink href="#" className="text-muted-foreground hover:text-primary transition-colors">Valentine Day</TransitionLink></li>
              <li><TransitionLink href="#" className="text-muted-foreground hover:text-primary transition-colors">Comedy</TransitionLink></li>
              <li><TransitionLink href="#" className="text-muted-foreground hover:text-primary transition-colors">Fantasy</TransitionLink></li>
            </ul>
          </div>
          
          {/* Support Section */}
          <div className="col-span-2 lg:col-span-1">
            <h3 className="font-bold text-foreground mb-4">Support</h3>
            <ul className="space-y-2 text-sm">
                <li><TransitionLink href="#" className="text-muted-foreground hover:text-primary transition-colors">General Info</TransitionLink></li>
                <li><TransitionLink href="#" className="text-muted-foreground hover:text-primary transition-colors">Privacy Policy</TransitionLink></li>
                <li><TransitionLink href="#" className="text-muted-foreground hover:text-primary transition-colors">Terms of Service</TransitionLink></li>
                <li><TransitionLink href="#" className="text-muted-foreground hover:text-primary transition-colors">Help Center</TransitionLink></li>
                <li><TransitionLink href="#" className="text-muted-foreground hover:text-primary transition-colors">support@movie.love</TransitionLink></li>
            </ul>
          </div>
        </div>

        {/* Mobile Compact Header (Shown only on mobile) */}
        <div className="flex md:hidden flex-col items-center justify-center pt-6 pb-4 space-y-3">
          <Logo className="h-6 w-[103px]" />
          <div className="flex space-x-6">
            <TransitionLink href="#" aria-label="Facebook">
              <Facebook className="h-4.5 w-4.5 text-muted-foreground hover:text-primary transition-colors" />
            </TransitionLink>
            <TransitionLink href="#" aria-label="Twitter">
              <Twitter className="h-4.5 w-4.5 text-muted-foreground hover:text-primary transition-colors" />
            </TransitionLink>
            <TransitionLink href="#" aria-label="Instagram">
              <Instagram className="h-4.5 w-4.5 text-muted-foreground hover:text-primary transition-colors" />
            </TransitionLink>
          </div>
        </div>

        {/* Bottom copyright statement */}
        <div className="border-t border-border/30 md:border-t py-4 md:py-6 text-center text-[10px] md:text-xs text-muted-foreground pb-28 md:pb-6">
          <p>&copy; {new Date().getFullYear()} Movie Pirates. All rights reserved. | Made with ❤️ by RBaskey</p>
        </div>
      </div>
    </footer>
  );
}
