'use client';

import React, { useState, useEffect, ComponentType } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
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
import { Button } from './ui/button';

const CORRECT_PASSWORD = 'suyash001';
const RECOVERY_PHONE_NUMBER = '9826926999';

// This is a Higher-Order Component (HOC)
export default function withPasswordProtection<P extends object>(
  WrappedComponent: ComponentType<P>
) {
  const WithPasswordProtection = (props: P) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [recoveryNumber, setRecoveryNumber] = useState('');
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
      // This effect runs once to confirm we are on the client.
      setIsClient(true);
    }, []);

    const handlePasswordCheck = () => {
      setIsLoading(true);
      // Simulate a small delay for user feedback
      setTimeout(() => {
        if (password === CORRECT_PASSWORD) {
          setIsAuthenticated(true);
        } else {
          toast({
            variant: 'destructive',
            title: 'Incorrect Password',
            description: 'The password you entered is incorrect.',
          });
          // Do not navigate away on failure, let them try again or use forgot password
        }
        setIsLoading(false);
      }, 300);
    };

    const handleRecoveryCheck = () => {
        setIsLoading(true);
        setTimeout(() => {
            if (recoveryNumber === RECOVERY_PHONE_NUMBER) {
                setIsAuthenticated(true);
                setShowForgotPassword(false);
                toast({
                    title: 'Authentication Successful',
                    description: 'Access granted.',
                });
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Incorrect Number',
                    description: 'The mobile number you entered is not authorized for recovery.',
                });
            }
            setIsLoading(false);
        }, 300);
    }

    const handleCancel = () => {
      router.back(); // Go back to the previous page
    };
    
    // On the server or before the client check, render nothing.
    if (!isClient) {
      return null;
    }
    
    // If authenticated in the current render cycle, show the page.
    if (isAuthenticated) {
      return <WrappedComponent {...props} />;
    }

    // Otherwise, always show the password dialog.
    return (
      <>
        <AlertDialog open={!showForgotPassword} onOpenChange={!isAuthenticated ? handleCancel : undefined}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Authentication Required</AlertDialogTitle>
              <AlertDialogDescription>
                You need to enter the password to view this page.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
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
               <Button variant="link" className="p-0 h-auto text-xs text-muted-foreground" onClick={() => setShowForgotPassword(true)}>
                    Forgot Password?
               </Button>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancel} disabled={isLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handlePasswordCheck} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Password Recovery</AlertDialogTitle>
                    <AlertDialogDescription>
                        Please enter the registered mobile number to recover access.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2 py-4">
                    <Label htmlFor="recovery-number">Registered Mobile Number</Label>
                    <Input
                        id="recovery-number"
                        type="tel"
                        value={recoveryNumber}
                        onChange={(e) => setRecoveryNumber(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRecoveryCheck()}
                        autoFocus
                    />
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setShowForgotPassword(false)} disabled={isLoading}>Back to Login</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRecoveryCheck} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Verify
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </>
    );
  };

  WithPasswordProtection.displayName = `WithPasswordProtection(${getDisplayName(
    WrappedComponent
  )})`;

  return WithPasswordProtection;
}

function getDisplayName(WrappedComponent: ComponentType<any>) {
  return WrappedComponent.displayName || WrappedComponent.name || 'Component';
}
