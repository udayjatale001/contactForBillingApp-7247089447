'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck, ShieldOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function MakeOwnerPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isUserLoading && !user) {
      // If user is not logged in, they can't be made an owner.
      // Redirect them to login, maybe with a message.
      toast({
        title: 'Please Log In',
        description: 'You must be logged in to claim the owner role.',
      });
      router.push('/login');
    } else if (user && firestore) {
      // Check if the current user is already an owner
      const ownerDocRef = doc(firestore, 'roles_owner', user.uid);
      getDoc(ownerDocRef).then((docSnap) => {
        setIsOwner(docSnap.exists());
      });
    }
  }, [user, isUserLoading, firestore, router, toast]);

  const handleMakeOwner = async () => {
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'User or database is not available.',
      });
      return;
    }

    setIsLoading(true);
    const ownerDocRef = doc(firestore, 'roles_owner', user.uid);

    try {
      // Use the non-blocking function to create the role document
      await setDocumentNonBlocking(ownerDocRef, { id: user.uid }, {});
      
      toast({
        title: 'Success!',
        description: 'You have been granted owner privileges.',
      });
      setIsOwner(true); // Update state to reflect new role
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);

    } catch (error) {
      console.error('Error granting owner role:', error);
      toast({
        variant: 'destructive',
        title: 'Operation Failed',
        description: 'Could not grant owner privileges. See console for details.',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isUserLoading || isOwner === null) {
      return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck /> Owner Role Assignment
          </CardTitle>
          <CardDescription>
            This utility assigns owner privileges to the currently logged-in user. Use this only for the initial setup of the application's owner.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-md bg-secondary/30">
            <p className="font-semibold text-sm">Current User:</p>
            <p className="text-muted-foreground break-all">{user?.email}</p>
          </div>

          {isOwner ? (
            <div className="flex items-center gap-2 p-4 rounded-md bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300">
                <ShieldCheck className="h-5 w-5"/>
                <p className="font-medium">You already have owner privileges.</p>
            </div>
          ) : (
             <div className="flex items-center gap-2 p-4 rounded-md bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300">
                <ShieldOff className="h-5 w-5"/>
                <p className="font-medium">You do not currently have owner privileges.</p>
            </div>
          )}
          
          <Button
            onClick={handleMakeOwner}
            disabled={isOwner || isLoading}
            className="w-full"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isOwner ? 'Privileges Already Granted' : 'Grant Owner Privileges'}
          </Button>

        </CardContent>
      </Card>
    </div>
  );
}
