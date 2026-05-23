"use client";

import { usePathname } from 'next/navigation';
import TelegramPopup from './TelegramPopup';

const ConditionalTelegramPopup = () => {
  const pathname = usePathname();
  
  // Only show the popup on the home page
  if (pathname !== '/') {
    return null;
  }

  return <TelegramPopup />;
};

export default ConditionalTelegramPopup;
