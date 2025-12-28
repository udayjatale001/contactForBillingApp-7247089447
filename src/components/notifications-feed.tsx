
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { Notification } from '@/lib/types';
import { Loader2, Bell, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { Button } from './ui/button';
import { ParsedNotification } from './parsed-notification';

export function NotificationsFeed() {
  const firestore = useFirestore();

  const notificationsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'notifications'), orderBy('createdAt', 'desc'), limit(5));
  }, [firestore]);

  const { data: notifications, isLoading } = useCollection<Notification>(notificationsQuery);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>A feed of the latest billing events.</CardDescription>
        </div>
        <Button asChild variant="outline" size="sm">
            <Link href="/notifications">View All</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : notifications && notifications.length > 0 ? (
          <div className="space-y-6">
            {notifications.map((notification) => (
              <div key={notification.id} className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-full mt-1">
                   <Bell className="h-5 w-5 text-primary" />
                </div>
                <div className='flex-1'>
                  <ParsedNotification notification={notification} />
                  <p className="text-xs text-muted-foreground pt-1">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
           <div className="text-center py-8">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-4 text-md font-semibold">No Recent Activity</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                  New notifications will appear here in real-time.
              </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

    