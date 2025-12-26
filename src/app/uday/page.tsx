
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
import { Badge } from '@/components/ui/badge';
import type { Bill } from '@/lib/types';
import { Input } from '@/components/ui/input';
import {
  FileText,
  Loader2,
  Search,
  Trash2,
  Calendar as CalendarIcon,
  X,
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, getDoc, doc, deleteDoc } from 'firebase/firestore';
import { BillSummaryDialog } from '@/components/bill-summary-dialog';
import { cn } from '@/lib/utils';
import { isSameDay, format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

export default function UdayPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>();
  const [isOwner, setIsOwner] = React.useState<boolean | null>(null);
  const [selectedBill, setSelectedBill] = React.useState<Bill | null>(null);
  const [billToDelete, setBillToDelete] = React.useState<Bill | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  React.useEffect(() => {
    if (user && firestore) {
      const checkRole = async () => {
        const ownerDocRef = doc(firestore, 'roles_owner', user.uid);
        const ownerDoc = await getDoc(ownerDocRef);
        setIsOwner(ownerDoc.exists());
      };
      checkRole();
    }
  }, [user, firestore]);

  const billsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'bills'),
      where('managerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user]);

  const { data: bills, isLoading } = useCollection<Bill>(billsQuery);

  const filteredBills = React.useMemo(() => {
    if (!bills) return [];
    return bills.filter(bill => {
      const nameMatch = bill.customerName.toLowerCase().includes(searchTerm.toLowerCase());
      const dateMatch = selectedDate
        ? isSameDay(new Date(bill.createdAt), selectedDate)
        : true;
      return nameMatch && dateMatch;
    });
  }, [bills, searchTerm, selectedDate]);
  
  const handleRowClick = (bill: Bill) => {
    setSelectedBill(bill);
  };

  const handleCloseDialog = () => {
    setSelectedBill(null);
  };

  const handleDeleteClick = (e: React.MouseEvent, bill: Bill) => {
    e.stopPropagation();
    setBillToDelete(bill);
  };

  const confirmDelete = async () => {
    if (!firestore || !billToDelete || !user) return;
    setIsDeleting(true);

    const managerDocRef = doc(firestore, 'managers', user.uid, 'bills', billToDelete.id);
    const globalDocRef = doc(firestore, 'bills', billToDelete.id);

    try {
        await deleteDoc(managerDocRef);
        await deleteDoc(globalDocRef);
        toast({
            title: 'Bill Deleted',
            description: 'The bill has been removed successfully.',
        });
    } catch (error) {
        console.error('Error deleting bill: ', error);
        // Emitting a more generic error for deletion from two places
        const permissionError = new FirestorePermissionError({
            path: billToDelete.id, // Using billId as a general reference
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
            variant: 'destructive',
            title: 'Deletion Failed',
            description: 'Could not delete the bill. You may not have permission.',
        });
    } finally {
        setIsDeleting(false);
        setBillToDelete(null);
    }
  };

  const isLoadingData = isLoading || isOwner === null || isUserLoading;
  
  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight font-headline">
            Uday's Bill Records
          </h2>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>All Your Bills</CardTitle>
            <CardDescription>
              A record of all bills you have generated. Click a row to see details.
            </CardDescription>
            <div className="border-t pt-4 mt-4">
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
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingData ? (
              <div className="flex justify-center items-center py-16">
                  <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
              </div>
            ) : filteredBills && filteredBills.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Due Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBills.map((bill) => (
                    <TableRow
                      key={bill.id}
                      onClick={() => handleRowClick(bill)}
                      className="cursor-pointer"
                    >
                      <TableCell>{bill.customerName}</TableCell>
                      <TableCell>{bill.totalAmount.toLocaleString()}rs</TableCell>
                      <TableCell>
                        <Badge
                          variant={bill.dueAmount > 0 ? 'destructive' : 'outline'}
                        >
                          {bill.dueAmount > 0 ? `${bill.dueAmount.toLocaleString()}rs` : 'Paid'}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(bill.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDeleteClick(e, bill)}
                          title="Delete Bill"
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
                  <h3 className="mt-4 text-lg font-semibold">No Bills Found</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                      Your search did not return any results or you haven't created any bills yet.
                  </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {selectedBill && (
        <BillSummaryDialog
          bill={selectedBill}
          open={!!selectedBill}
          onOpenChange={handleCloseDialog}
          onSave={async () => {
            handleCloseDialog();
          }}
          isSavingDisabled={true}
        />
      )}
      <AlertDialog
        open={!!billToDelete}
        onOpenChange={() => setBillToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the bill for {' '}
              <span className="font-semibold">{billToDelete?.customerName}</span>.
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
