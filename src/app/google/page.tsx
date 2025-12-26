'use client';

import { useEffect } from 'react';
import { Loader2, Globe } from 'lucide-react';

export default function GooglePage() {
  useEffect(() => {
    window.location.href = 'https://www.google.com';
  }, []);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-center">
        <Globe className="h-16 w-16 text-primary" />
        <h1 className="text-2xl font-bold">Redirecting to Google</h1>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Please wait while we take you to Google.</p>
      </div>
    </div>
  );
}
