
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
import {
  useCollection,
  useMemoFirebase,
  useUser,
  useFirestore,
} from '@/firebase';
import {
  collection,
  query,
  orderBy,
  doc,
  deleteDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import type { Labour } from '@/lib/types';
import {
  Loader2,
  FileText,
  Trash2,
  Search,
  Calendar as CalendarIcon,
  X,
  Wrench,
} from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { useDateFilter } from '@/context/date-filter-context';
import { LabourSummaryDialog } from '@/components/labour-summary-dialog';
import { Checkbox } from '@/components/ui/checkbox';

export default function LabourerPage() {
  const { isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { globalDate, setGlobalDate, clearGlobalDate } = useDateFilter();

  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedRecord, setSelectedRecord] = React.useState<Labour | null>(null);
  const [recordToDelete, setRecordToDelete] = React.useState<Labour | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = React.useState(false);

  const laboursQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const dateToFilter = globalDate || new Date();
    const startDate = startOfDay(dateToFilter);
    const endDate = endOfDay(dateToFilter);
    
    return query(
        collection(firestore, 'labours'),
        where('createdAt', '>=', startDate.toISOString()),
        where('createdAt', '<=', endDate.toISOString()),
        orderBy('createdAt', 'desc')
    );
  }, [firestore, globalDate]);

  const { data: labourRecords, isLoading: isLoadingLabours } =
    useCollection<Labour>(laboursQuery);

  const filteredRecords = React.useMemo(() => {
    if (!labourRecords) return [];
    
    if (searchTerm) {
        return labourRecords.filter((record) =>
            record.customerName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    
    return labourRecords;
  }, [labourRecords, searchTerm]);

  React.useEffect(() => {
    // When filters change, we need to remove selected IDs that are no longer visible.
    const visibleIds = new Set(filteredRecords.map(r => r.id));
    setSelectedIds(currentIds => {
      const newIds = new Set<string>();
      currentIds.forEach(id => {
        if (visibleIds.has(id)) {
          newIds.add(id);
        }
      });
      return newIds;
    });
     // Close dialog if the selected record is no longer visible
    if (selectedRecord && !visibleIds.has(selectedRecord.id)) {
        setSelectedRecord(null);
    }
  }, [filteredRecords, selectedRecord]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredRecords.map(n => n.id)));
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
        description: `${selectedIds.size} labour records have been successfully removed.`
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


  const handleRowClick = (record: Labour) => {
    setSelectedRecord(record);
  };
  
  const handleDeleteRequest = (record: Labour | null) => {
    if (record) {
      setRecordToDelete(record);
      setSelectedRecord(null); // Close summary dialog if open
    }
  };

  const confirmDelete = async () => {
    if (!firestore || !recordToDelete) return;
    setIsDeleting(true);
    const docRef = doc(firestore, 'labours', recordToDelete.id);
    try {
      await deleteDoc(docRef);
      toast({
        title: 'Record Deleted',
        description: 'The labour record has been successfully removed.',
      });
      setSelectedRecord(null); // Deselect after deletion
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
        description:
          'There was an error deleting the record. You may not have permission.',
      });
    } finally {
      setIsDeleting(false);
      setRecordToDelete(null);
    }
  };
  
  const isLoading = isUserLoading || isLoadingLabours;
  const allFilteredSelected = filteredRecords.length > 0 && selectedIds.size === filteredRecords.length;

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight font-headline">
            Internal Labour Ledger
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
            <CardDescription>A complete log of all internal labour charges.</CardDescription>
            <div className='border-t pt-4 mt-4 space-y-4'>
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
                   <div className="flex items-center gap-2">
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                        <PopoverTrigger asChild>
                        <Button
                            variant={'outline'}
                            className={cn(
                            'w-full md:w-[240px] justify-start text-left font-normal',
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
                            onSelect={(date) => {
                                setGlobalDate(date || new Date());
                                setIsCalendarOpen(false);
                            }}
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
                {filteredRecords.length > 0 && (
                    <div className="flex items-center space-x-2">
                        <Checkbox 
                            id="select-all" 
                            checked={allFilteredSelected}
                            onCheckedChange={(checked) => handleSelectAll(!!checked)}
                        />
                        <label
                            htmlFor="select-all"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                           Select all ({filteredRecords.length})
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
            ) : filteredRecords && filteredRecords.length > 0 ? (
              <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-10'></TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>In Labour</TableHead>
                    <TableHead>Out Labour</TableHead>
                    <TableHead>Total Labour</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow
                      key={record.id}
                      onClick={() => handleRowClick(record)}
                      className={cn(
                         "cursor-pointer",
                         selectedIds.has(record.id) ? 'bg-primary/10' :
                         selectedRecord?.id === record.id && 'bg-primary/20'
                      )}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox 
                            checked={selectedIds.has(record.id)} 
                            onCheckedChange={(checked) => handleSelectOne(record.id, !!checked)}
                            aria-label={`Select record ${record.id}`}
                        />
                      </TableCell>
                      <TableCell>{record.customerName}</TableCell>
                      <TableCell>
                        {record.inCaratLabour && record.inCaratLabourRate
                          ? `${record.inCaratLabour} * ${record.inCaratLabourRate}rs`
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {record.outCaratLabour && record.outCaratLabourRate
                          ? `${record.outCaratLabour} * ${record.outCaratLabourRate}rs`
                          : 'N/A'}
                      </TableCell>
                      <TableCell>{record.totalLabourAmount.toLocaleString()}rs</TableCell>
                      <TableCell>{format(new Date(record.createdAt), 'PP')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            ) : (
              <div className="text-center py-16">
                  <Wrench className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No Labour Records Found</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                      No records found for the selected period. Records are created automatically with each bill.
                  </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedRecord && (
        <LabourSummaryDialog
            labourRecord={selectedRecord}
            open={!!selectedRecord}
            onOpenChange={() => setSelectedRecord(null)}
            onDelete={() => handleDeleteRequest(selectedRecord)}
        />
      )}

      <AlertDialog
        open={!!recordToDelete}
        onOpenChange={() => setRecordToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this labour record for{' '}
              <span className='font-semibold'>{recordToDelete?.customerName}</span>.
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
