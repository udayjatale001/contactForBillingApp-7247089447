
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCollection, useMemoFirebase, useUser, useFirestore } from '@/firebase';
import { collection, query, orderBy, doc, getDoc } from 'firebase/firestore';
import type { Notification } from '@/lib/types';
import { Loader2, Bell, FileText, ShieldAlert } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationsPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [isOwner, setIsOwner] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    // We should only check the role if the user is loaded and exists.
    if (!isUserLoading && user && firestore) {
      const checkRole = async () => {
        const ownerDocRef = doc(firestore, 'roles_owner', user.uid);
        const ownerDoc = await getDoc(ownerDocRef);
        setIsOwner(ownerDoc.exists());
      };
      checkRole();
    } else if (!isUserLoading && !user) {
      // If loading is finished and there's no user, they are definitely not an owner.
      setIsOwner(false);
    }
  }, [user, isUserLoading, firestore]);

  const notificationsQuery = useMemoFirebase(() => {
    // Only fetch if the user is an owner
    if (!firestore || !isOwner) return null;
    return query(collection(firestore, 'notifications'), orderBy('createdAt', 'desc'));
  }, [firestore, isOwner]);

  const { data: notifications, isLoading: isLoadingNotifications } = useCollection<Notification>(notificationsQuery);

  const isLoading = isUserLoading || isOwner === null || (isOwner && isLoadingNotifications);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (!isOwner) {
      return (
        <div className="text-center py-16">
          <ShieldAlert className="mx-auto h-12 w-12 text-destructive" />
          <h3 className="mt-4 text-lg font-semibold">Access Denied</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            This page is only accessible to owners.
          </p>
        </div>
      );
    }
    
    if (notifications && notifications.length > 0) {
      return (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <div key={notification.id} className="flex items-start gap-4">
              <div className="bg-primary/10 p-2 rounded-full">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div className='flex-1'>
                <p className="text-sm text-foreground">{notification.message}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      );
    }
    
    return (
      <div className="text-center py-16">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No Notifications Yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          New notifications will appear here as bills are created.
        </p>
      </div>
    );
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight font-headline">
          Notifications
        </h2>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Activity Feed</CardTitle>
          <CardDescription>A log of all billing activities.</CardDescription>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}
