
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  Wrench,
  Loader2,
  Search,
  FileText,
  Trash2,
  Calendar as CalendarIcon,
  X,
} from 'lucide-react';
import {
  useCollection,
  useMemoFirebase,
  useUser,
  useFirestore,
} from '@/firebase';
import { collection, query, orderBy, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import type { Labour } from '@/lib/types';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, isSameDay } from 'date-fns';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { Checkbox } from '@/components/ui/checkbox';

export default function LaboursPage() {
  const firestore = useFirestore();
  const { isUserLoading } = useUser();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>();
  const [labourToDelete, setLabourToDelete] = React.useState<Labour | undefined>();
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = React.useState(false);

  const laboursQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'labours'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: labours, isLoading: isLoadingLabours } =
    useCollection<Labour>(laboursQuery);

  const filteredLabours = React.useMemo(() => {
    if (!labours) return [];
    return labours.filter((labour) => {
      const nameMatch = labour.customerName
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const dateMatch = selectedDate
        ? isSameDay(new Date(labour.createdAt), selectedDate)
        : true;
      return nameMatch && dateMatch;
    });
  }, [labours, searchTerm, selectedDate]);

  React.useEffect(() => {
    const visibleIds = new Set(filteredLabours.map(l => l.id));
    setSelectedIds(currentIds => {
      const newIds = new Set<string>();
      currentIds.forEach(id => {
        if (visibleIds.has(id)) {
          newIds.add(id);
        }
      });
      return newIds;
    });
  }, [filteredLabours]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredLabours.map(l => l.id)));
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
    labour: Labour
  ) => {
    e.stopPropagation();
    setLabourToDelete(labour);
  };

  const confirmDelete = async () => {
    if (!firestore || !labourToDelete) return;
    setIsDeleting(true);
    const docRef = doc(firestore, 'labours', labourToDelete.id);
    try {
      await deleteDoc(docRef);
      toast({
        title: 'Labour Record Deleted',
        description: 'The record has been successfully removed.',
      });
    } catch (error) {
      console.error('Error deleting labour record: ', error);
      const permissionError = new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete',
      });
      errorEmitter.emit('permission-error', permissionError);
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: 'You may not have permission to delete this record.',
      });
    } finally {
      setIsDeleting(false);
      setLabourToDelete(undefined);
    }
  };
  
  const handleBulkDelete = async () => {
    if (!firestore || selectedIds.size === 0) return;
    
    setIsBulkDeleting(true);
    const batch = writeBatch(firestore);
    selectedIds.forEach(id => {
      batch.delete(doc(firestore, 'labours', id));
    });

    try {
      await batch.commit();
      toast({
        title: 'Records Deleted',
        description: `${selectedIds.size} labour records have been removed.`
      });
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Error bulk deleting labour records: ", error);
      toast({
        variant: 'destructive',
        title: 'Bulk Deletion Failed',
        description: 'Could not delete the selected records. You may not have permission.'
      });
    } finally {
      setIsBulkDeleting(false);
      setShowBulkDeleteConfirm(false);
    }
  };

  const isLoading = isUserLoading || isLoadingLabours;
  const allFilteredSelected = filteredLabours.length > 0 && selectedIds.size === filteredLabours.length;

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
            <Wrench /> Labour Ledger
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
            <CardTitle>All Labour Records</CardTitle>
            <CardDescription>
              A complete history of all internal labour charges.
            </CardDescription>
             <div className='border-t pt-4 mt-4'>
                <div className="flex flex-col md:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="Search by customer name..."
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
                 {filteredLabours.length > 0 && (
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
                           Select all ({filteredLabours.length})
                        </label>
                    </div>
                )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-16">
                <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLabours && filteredLabours.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox 
                          checked={allFilteredSelected}
                          onCheckedChange={(checked) => handleSelectAll(!!checked)}
                          aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>In Carat</TableHead>
                    <TableHead>Out Carat</TableHead>
                    <TableHead>Total Labour</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLabours.map((labour) => (
                    <TableRow key={labour.id} className={cn(selectedIds.has(labour.id) && 'bg-primary/10')}>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                              checked={selectedIds.has(labour.id)}
                              onCheckedChange={(checked) => handleSelectOne(labour.id, !!checked)}
                              aria-label={`Select labour record ${labour.id}`}
                          />
                      </TableCell>
                      <TableCell>{labour.customerName}</TableCell>
                      <TableCell>
                        {labour.inCaratLabour && labour.inCaratLabour > 0
                          ? `${labour.inCaratLabour} @ ${labour.inCaratLabourRate}rs`
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {labour.outCaratLabour && labour.outCaratLabour > 0
                          ? `${labour.outCaratLabour} @ ${labour.outCaratLabourRate}rs`
                          : 'N/A'}
                      </TableCell>
                      <TableCell>{labour.totalLabourAmount.toLocaleString()}rs</TableCell>
                      <TableCell>{new Date(labour.createdAt).toLocaleDateString()}</TableCell>
                       <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDeleteClick(e, labour)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-16">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No Labour Records Found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    New records will be added automatically when a bill with labour charges is created.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <AlertDialog
        open={!!labourToDelete}
        onOpenChange={() => setLabourToDelete(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this labour record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
              This action cannot be undone. This will permanently delete the {selectedIds.size} selected records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isBulkDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Selected
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
