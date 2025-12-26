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
const LOCAL_STORAGE_KEY = 'admin_password';

// This is a Higher-Order Component (HOC)
export default function withPasswordProtection<P extends object>(
  WrappedComponent: ComponentType<P>
) {
  const WithPasswordProtection = (props: P) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [storedPassword, setStoredPassword] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [recoveryNumber, setRecoveryNumber] = useState('');
    const [showCreatePassword, setShowCreatePassword] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
      // This effect runs once to confirm we are on the client.
      setIsClient(true);
      try {
        const savedPassword = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedPassword) {
          setStoredPassword(savedPassword);
        }
      } catch (error) {
        console.error('Could not access localStorage:', error);
      }
    }, []);

    const handlePasswordCheck = () => {
      setIsLoading(true);
      // Simulate a small delay for user feedback
      setTimeout(() => {
        const effectivePassword = storedPassword || CORRECT_PASSWORD;
        if (password === effectivePassword) {
          setIsAuthenticated(true);
        } else {
          toast({
            variant: 'destructive',
            title: 'Incorrect Password',
            description: 'The password you entered is incorrect.',
          });
        }
        setIsLoading(false);
      }, 300);
    };

    const handleRecoveryCheck = () => {
        setIsLoading(true);
        setTimeout(() => {
            if (recoveryNumber === RECOVERY_PHONE_NUMBER) {
                setShowForgotPassword(false); // Close recovery dialog
                setShowCreatePassword(true);  // Open create password dialog
                toast({
                    title: 'Verification Successful',
                    description: 'Please create a new password.',
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
    
    const handleCreatePassword = () => {
        if (newPassword !== confirmPassword) {
            toast({
                variant: 'destructive',
                title: 'Passwords do not match',
                description: 'Please ensure both passwords are the same.',
            });
            return;
        }
        if (newPassword.length < 6) {
             toast({
                variant: 'destructive',
                title: 'Password too short',
                description: 'Password must be at least 6 characters long.',
            });
            return;
        }
        
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, newPassword);
            setStoredPassword(newPassword);
            setIsAuthenticated(true);
            setShowCreatePassword(false);
            toast({
                title: 'Password Reset Successful',
                description: 'Access granted. Your new password has been saved.',
            });
        } catch (error) {
            console.error('Failed to save password to localStorage:', error);
             toast({
                variant: 'destructive',
                title: 'Save Failed',
                description: 'Could not save the new password. Please try again.',
            });
        }
    }

    const handleCancel = () => {
      router.back(); // Go back to the previous page
    };
    
    if (!isClient) {
      return null;
    }
    
    if (isAuthenticated) {
      return <WrappedComponent {...props} />;
    }

    return (
      <>
        <AlertDialog open={!isAuthenticated && !showForgotPassword && !showCreatePassword}>
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

        <AlertDialog open={showCreatePassword} onOpenChange={setShowCreatePassword}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Create New Password</AlertDialogTitle>
                    <AlertDialogDescription>
                        Enter and confirm your new password. This will replace your old password.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                            id="new-password"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <Input
                            id="confirm-password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreatePassword()}
                        />
                    </div>
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setShowCreatePassword(false)} disabled={isLoading}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCreatePassword} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Reset Password
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
