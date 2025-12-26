'use client';

import React, { useState, useEffect, ComponentType } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

const CORRECT_PASSWORD = 'suyash001';

// This is a Higher-Order Component (HOC)
export default function withPasswordProtection<P extends object>(
  WrappedComponent: ComponentType<P>
) {
  const WithPasswordProtection = (props: P) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
      // Ensure this code only runs on the client
      setIsClient(true);
      const sessionAuth = sessionStorage.getItem('isPageAuthenticated');
      if (sessionAuth === 'true') {
        setIsAuthenticated(true);
      }
    }, []);

    const handlePasswordCheck = () => {
      setIsLoading(true);
      if (password === CORRECT_PASSWORD) {
        sessionStorage.setItem('isPageAuthenticated', 'true');
        setIsAuthenticated(true);
      } else {
        toast({
          variant: 'destructive',
          title: 'Incorrect Password',
          description: 'The password you entered is incorrect.',
        });
      }
      setIsLoading(false);
    };

    const handleCancel = () => {
      router.back(); // Go back to the previous page
    };

    if (!isClient) {
        // Render nothing or a loader on the server to avoid SSR issues
        return null;
    }

    if (isAuthenticated) {
      return <WrappedComponent {...props} />;
    }

    return (
      <AlertDialog open={true} onOpenChange={handleCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Authentication Required</AlertDialogTitle>
            <AlertDialogDescription>
              You need to enter the password to view this page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordCheck()}
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <button
                className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground mt-2 sm:mt-0"
                onClick={handleCancel}
                disabled={isLoading}
            >
                Cancel
            </button>
            <AlertDialogAction onClick={handlePasswordCheck} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  };

  // Set a display name for the HOC for better debugging
  WithPasswordProtection.displayName = `WithPasswordProtection(${getDisplayName(
    WrappedComponent
  )})`;

  return WithPasswordProtection;
}

function getDisplayName(WrappedComponent: ComponentType<any>) {
  return WrappedComponent.displayName || WrappedComponent.name || 'Component';
}
