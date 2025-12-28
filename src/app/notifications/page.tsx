
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
import { collection, query, orderBy, doc, deleteDoc, writeBatch, where } from 'firebase/firestore';
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
import { formatDistanceToNow, format, startOfDay, endOfDay } from 'date-fns';
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
import { Checkbox } from '@/components/ui/checkbox';
import withPasswordProtection from '@/components/with-password-protection';
import { ParsedNotification } from '@/components/parsed-notification';
import { useDateFilter } from '@/context/date-filter-context';

function NotificationsPage() {
  const firestore = useFirestore();
  const { isUserLoading } = useUser();
  const { toast } = useToast();
  const { globalDate, setGlobalDate, clearGlobalDate } = useDateFilter();

  const [searchTerm, setSearchTerm] = React.useState('');
  const [notificationToDelete, setNotificationToDelete] = React.useState<
    Notification | undefined
  >();
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = React.useState(false);

  const notificationsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    
    const dateToFilter = globalDate || new Date();
    const startDate = startOfDay(dateToFilter).toISOString();
    const endDate = endOfDay(dateToFilter).toISOString();

    return query(
      collection(firestore, 'notifications'),
      where('createdAt', '>=', startDate),
      where('createdAt', '<=', endDate),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, globalDate]);

  const { data: notifications, isLoading: isLoadingNotifications } =
    useCollection<Notification>(notificationsQuery);

  const filteredNotifications = React.useMemo(() => {
    if (!notifications) return [];
    
    if (searchTerm) {
        return notifications.filter((notification) => {
            const searchLower = searchTerm.toLowerCase();
            return notification.customerName?.toLowerCase().includes(searchLower);
        });
    }
    
    return notifications;
  }, [notifications, searchTerm]);
  
  React.useEffect(() => {
    // When filters change, we need to remove selected IDs that are no longer visible.
    const visibleIds = new Set(filteredNotifications.map(n => n.id));
    setSelectedIds(currentIds => {
      const newIds = new Set<string>();
      currentIds.forEach(id => {
        if (visibleIds.has(id)) {
          newIds.add(id);
        }
      });
      return newIds;
    });
  }, [filteredNotifications]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredNotifications.map(n => n.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

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
  
  const handleBulkDelete = async () => {
    if (!firestore || selectedIds.size === 0) return;
    
    setIsBulkDeleting(true);
    const batch = writeBatch(firestore);
    selectedIds.forEach(id => {
      batch.delete(doc(firestore, 'notifications', id));
    });

    try {
      await batch.commit();
      toast({
        title: 'Notifications Deleted',
        description: `${selectedIds.size} notifications have been successfully removed.`
      });
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Error bulk deleting notifications: ", error);
      toast({
        variant: 'destructive',
        title: 'Bulk Deletion Failed',
        description: 'Could not delete the selected notifications. You may not have permission.'
      });
    } finally {
      setIsBulkDeleting(false);
      setShowBulkDeleteConfirm(false);
    }
  };

  const isLoading = isUserLoading || isLoadingNotifications;
  
  const allFilteredSelected = filteredNotifications.length > 0 && selectedIds.size === filteredNotifications.length;

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
              className={cn(
                "flex items-start justify-between gap-4 group p-4 rounded-lg border transition-colors",
                selectedIds.has(notification.id) ? 'bg-primary/10 border-primary/20' : 'bg-card'
                )}
            >
              <div className="flex items-start gap-4 flex-1">
                 <Checkbox 
                    checked={selectedIds.has(notification.id)} 
                    onCheckedChange={(checked) => handleSelectOne(notification.id, !!checked)}
                    id={`select-${notification.id}`}
                    aria-label={`Select notification ${notification.id}`}
                    className='mt-1'
                />
                <div className="bg-secondary p-3 rounded-full mt-1">
                  <Bell className="h-5 w-5 text-secondary-foreground" />
                </div>
                <div className="flex-1 space-y-1">
                  <ParsedNotification notification={notification} />
                  <p className="text-sm text-muted-foreground pt-1">
                    {format(new Date(notification.createdAt), 'PPpp')} (
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
                className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
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
        <h3 className="mt-4 text-lg font-semibold">No activity found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          No records found for the selected period. New notifications will appear here.
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
           {selectedIds.size > 0 && (
             <Button 
                variant="destructive" 
                onClick={() => setShowBulkDeleteConfirm(true)}
                disabled={isBulkDeleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete ({selectedIds.size})
            </Button>
           )}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Activity Feed</CardTitle>
            <CardDescription>A log of all billing activities.</CardDescription>
            <div className='border-t pt-4 mt-4'>
                <div className="flex flex-col md:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="Search by name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            variant={'outline'}
                            className={cn(
                            'w-full md:w-[280px] justify-start text-left font-normal',
                            !globalDate && 'text-muted-foreground'
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {globalDate ? format(globalDate, 'PPP') : <span>Today</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                            mode="single"
                            selected={globalDate ?? undefined}
                            onSelect={(date) => setGlobalDate(date || new Date())}
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                    {globalDate && (
                        <Button variant="ghost" size="icon" onClick={clearGlobalDate}>
                        <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
                </div>
                 {filteredNotifications.length > 0 && (
                    <div className="flex items-center space-x-2 pt-4">
                        <Checkbox 
                            id="select-all" 
                            checked={allFilteredSelected}
                            onCheckedChange={(checked) => handleSelectAll(!!checked)}
                        />
                        <label
                            htmlFor="select-all"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                           Select all ({filteredNotifications.length})
                        </label>
                    </div>
                )}
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
      
       <AlertDialog
        open={showBulkDeleteConfirm}
        onOpenChange={setShowBulkDeleteConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the {selectedIds.size} selected notifications.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isBulkDeleting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete Selected
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default withPasswordProtection(NotificationsPage);
