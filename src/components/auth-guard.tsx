// src/components/auth-guard.tsx
'use client';

import { useUser } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const publicPaths = ['/login'];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isUserLoading) {
      return; // Wait for user status to be determined
    }

    const isPublicPath = publicPaths.includes(pathname);

    if (!user && !isPublicPath) {
      router.push('/login');
    }

    if (user && isPublicPath) {
        // Redirect logged-in users away from login page.
        // You might want to redirect to a default page based on role.
        router.push('/');
    }
  }, [user, isUserLoading, router, pathname]);

  if (isUserLoading || (!user && !publicPaths.includes(pathname))) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
