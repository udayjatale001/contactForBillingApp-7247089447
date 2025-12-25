
'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  useCollection,
  useMemoFirebase,
  useUser,
  useFirestore,
} from '@/firebase';
import { collection, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import type { Notification } from '@/lib/types';
import {
  Loader2,
  Bell,
  FileText,
  Trash2,
  Search,
  Calendar as CalendarIcon,
  X,
} from 'lucide-react';
import { formatDistanceToNow, format, isSameDay } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
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
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

export default function NotificationsPage() {
  const firestore = useFirestore();
  const { isUserLoading } = useUser();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>();
  const [notificationToDelete, setNotificationToDelete] = React.useState<
    Notification | undefined
  >();
  const [isDeleting, setIsDeleting] = React.useState(false);

  const notificationsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'notifications'),
      orderBy('createdAt', 'desc')
    );
  }, [firestore]);

  const { data: notifications, isLoading: isLoadingNotifications } =
    useCollection<Notification>(notificationsQuery);

  const filteredNotifications = React.useMemo(() => {
    if (!notifications) return [];
    return notifications.filter((notification) => {
      const nameMatch = notification.message
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const dateMatch = selectedDate
        ? isSameDay(new Date(notification.createdAt), selectedDate)
        : true;
      return nameMatch && dateMatch;
    });
  }, [notifications, searchTerm, selectedDate]);

  const handleDeleteClick = (
    e: React.MouseEvent,
    notification: Notification
  ) => {
    e.stopPropagation();
    setNotificationToDelete(notification);
  };

  const confirmDelete = async () => {
    if (!firestore || !notificationToDelete) return;
    setIsDeleting(true);
    const docRef = doc(firestore, 'notifications', notificationToDelete.id);
    try {
      await deleteDoc(docRef);
      toast({
        title: 'Notification Deleted',
        description: 'The notification has been successfully removed.',
      });
    } catch (error) {
      console.error('Error deleting notification: ', error);
      const permissionError = new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete',
      });
      errorEmitter.emit('permission-error', permissionError);
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description:
          'There was an error deleting the notification. You may not have permission.',
      });
    } finally {
      setIsDeleting(false);
      setNotificationToDelete(undefined);
    }
  };

  const isLoading = isUserLoading || isLoadingNotifications;

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (filteredNotifications && filteredNotifications.length > 0) {
      return (
        <div className="space-y-4">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className="flex items-start justify-between gap-4 group"
            >
              <div className="flex items-start gap-4 flex-1">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-foreground">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(notification.createdAt).toLocaleString()} (
                    {formatDistanceToNow(new Date(notification.createdAt), {
                      addSuffix: true,
                    })}
                    )
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => handleDeleteClick(e, notification)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
                <span className="sr-only">Delete</span>
              </Button>
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
    <>
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
            <div className="flex flex-col md:flex-row gap-2 pt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={'outline'}
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !selectedDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? (
                        format(selectedDate, 'PPP')
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {selectedDate && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedDate(undefined)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>{renderContent()}</CardContent>
        </Card>
      </div>

      <AlertDialog
        open={!!notificationToDelete}
        onOpenChange={() => setNotificationToDelete(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this
              notification.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
