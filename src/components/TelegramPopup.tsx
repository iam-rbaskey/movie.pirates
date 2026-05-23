"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from './ui/card';

const TelegramPopup = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem('telegramPopupDismissed');
    if (!dismissed) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2500); // Show after 2.5 seconds
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('telegramPopupDismissed', 'true');
  };

  return (
    <div className={cn(
      "fixed bottom-5 right-5 z-50 transition-all duration-500 ease-in-out",
      isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
    )}>
      <Card className="w-full max-w-sm p-4 shadow-2xl border-primary/30 bg-card/80 backdrop-blur-lg">
          <button onClick={handleDismiss} className="absolute -top-2 -right-2 bg-secondary text-secondary-foreground rounded-full p-1 shadow-md hover:bg-muted">
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </button>
          <div className="flex items-center gap-4">
              <div className="bg-blue-500 p-3 rounded-full flex-shrink-0">
                  <Send className="h-6 w-6 text-white" />
              </div>
              <div>
                  <h3 className="font-bold font-headline text-lg text-foreground">Join our Telegram!</h3>
                  <p className="text-sm text-muted-foreground mt-1">Get the latest movie updates and links instantly.</p>
                  <Button asChild size="sm" className="mt-3 w-full sm:w-auto">
                      <a href="https://t.me/moviepirates25" target="_blank" rel="noopener noreferrer">
                          Join Channel
                      </a>
                  </Button>
              </div>
          </div>
      </Card>
    </div>
  );
};

export default TelegramPopup;
