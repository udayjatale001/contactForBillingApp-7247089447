
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { Notification } from '@/lib/types';
import { Loader2, Bell, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationsPage() {
  const firestore = useFirestore();

  const notificationsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'notifications'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: notifications, isLoading } = useCollection<Notification>(notificationsQuery);

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
          {isLoading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
            </div>
          ) : notifications && notifications.length > 0 ? (
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
          ) : (
             <div className="text-center py-16">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No Notifications Yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    New notifications will appear here as bills are created.
                </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
