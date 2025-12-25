
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCollection, useMemoFirebase, useUser, useFirestore } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Notification } from '@/lib/types';
import { Loader2, Bell, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationsPage() {
  const firestore = useFirestore();
  const { isUserLoading } = useUser();

  const notificationsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'notifications'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: notifications, isLoading: isLoadingNotifications } = useCollection<Notification>(notificationsQuery);

  const isLoading = isUserLoading || isLoadingNotifications;

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
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
                  {new Date(notification.createdAt).toLocaleString()} ({formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })})
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
        <h3 className="mt-4 text-lg font-semibold">No activity yet</h3>
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
