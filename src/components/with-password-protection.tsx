'use client';

import React, { ComponentType, useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const AUTHORIZED_MOBILE_NUMBER = '9826926999';
const PASSWORD_STORAGE_KEY = 'admin-password';

// This is a Higher-Order Component (HOC)
export default function withPasswordProtection<P extends object>(
  WrappedComponent: ComponentType<P>
) {
  const WithPasswordProtection = (props: P) => {
    const { toast } = useToast();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [showPasswordDialog, setShowPasswordDialog] = useState(true);
    const [passwordInput, setPasswordInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // State for Forgot Password flow
    const [showForgotDialog, setShowForgotDialog] = useState(false);
    const [mobileNumberInput, setMobileNumberInput] = useState('');
    const [showCreatePasswordDialog, setShowCreatePasswordDialog] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    
    const getDefaultPassword = () => '123';

    const getStoredPassword = useCallback(() => {
      if (typeof window !== 'undefined') {
        return localStorage.getItem(PASSWORD_STORAGE_KEY);
      }
      return null;
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);

      const storedPassword = getStoredPassword();
      const correctPassword = storedPassword || getDefaultPassword();

      if (passwordInput === correctPassword) {
        toast({ title: 'Access Granted' });
        setIsAuthenticated(true);
        setShowPasswordDialog(false);
      } else {
        toast({
          variant: 'destructive',
          title: 'Access Denied',
          description: 'The password you entered is incorrect.',
        });
      }
      setIsLoading(false);
      setPasswordInput('');
    };

    const handleVerifyMobile = () => {
      if (mobileNumberInput === AUTHORIZED_MOBILE_NUMBER) {
        setShowForgotDialog(false);
        setMobileNumberInput('');
        setShowCreatePasswordDialog(true);
      } else {
        toast({
          variant: 'destructive',
          title: 'Verification Failed',
          description: 'The mobile number you entered is invalid.',
        });
      }
    };
    
    const handleResetPassword = () => {
        if (newPassword.length < 4) {
            toast({
              variant: 'destructive',
              title: 'Password Too Short',
              description: 'Your new password must be at least 4 characters long.',
            });
            return;
        }
        if (newPassword !== confirmNewPassword) {
            toast({
              variant: 'destructive',
              title: 'Passwords Do Not Match',
              description: 'Please ensure both passwords are the same.',
            });
            return;
        }
        
        if(typeof window !== 'undefined') {
            localStorage.setItem(PASSWORD_STORAGE_KEY, newPassword);
        }

        toast({
            title: 'Password Updated',
            description: 'You can now use your new password to log in.',
        });
        
        setShowCreatePasswordDialog(false);
        setNewPassword('');
        setConfirmNewPassword('');
        setShowPasswordDialog(true); // Go back to the main password dialog
    };


    if (isAuthenticated) {
      return <WrappedComponent {...props} />;
    }

    return (
      <>
        {/* Main Password Dialog */}
        <Dialog open={showPasswordDialog} onOpenChange={(isOpen) => !isOpen && setShowPasswordDialog(true)}>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Authentication Required</DialogTitle>
                <DialogDescription>
                  You need to enter the password to view this page.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="password-input" className="text-right">
                    Password
                  </Label>
                  <Input
                    id="password-input"
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="col-span-3"
                    autoFocus
                  />
                </div>
              </div>
              <DialogFooter className='sm:justify-between'>
                 <Button type="button" variant="link" className='p-0' onClick={() => { setShowPasswordDialog(false); setShowForgotDialog(true); }}>
                    Forgot Password?
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Forgot Password Dialog */}
        <AlertDialog open={showForgotDialog} onOpenChange={setShowForgotDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Password Recovery</AlertDialogTitle>
              <AlertDialogDescription>
                Please enter the registered mobile number to recover access.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2">
                <Label htmlFor="mobile-input">Registered Mobile Number</Label>
                <Input
                    id="mobile-input"
                    type="tel"
                    value={mobileNumberInput}
                    onChange={(e) => setMobileNumberInput(e.target.value)}
                    placeholder="9826926999"
                    autoFocus
                />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setShowForgotDialog(false); setShowPasswordDialog(true); }}>Back to Login</AlertDialogCancel>
              <AlertDialogAction onClick={handleVerifyMobile}>Verify</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {/* Create New Password Dialog */}
         <AlertDialog open={showCreatePasswordDialog} onOpenChange={setShowCreatePasswordDialog}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Create New Password</AlertDialogTitle>
                    <AlertDialogDescription>
                        Enter and confirm your new password to regain access.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-4 py-2">
                    <div className='space-y-1'>
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                            id="new-password"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className='space-y-1'>
                        <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                        <Input
                            id="confirm-new-password"
                            type="password"
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                        />
                    </div>
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => { setShowCreatePasswordDialog(false); setShowPasswordDialog(true); }}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetPassword}>Reset Password</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        
        {/* Fallback content while dialog is showing */}
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                 <h2 className="text-3xl font-bold tracking-tight">Access Restricted</h2>
            </div>
             <div className="flex items-center justify-center h-96">
                <p className="text-muted-foreground">Please authenticate to continue.</p>
             </div>
        </div>
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
