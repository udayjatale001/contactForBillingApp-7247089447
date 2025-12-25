
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
import { Button } from '@/components/ui/button';
import { FileText, Loader2, Search, Trash2 } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, getDoc, doc, writeBatch, deleteDoc } from 'firebase/firestore';
import { BillSummaryDialog } from '@/components/bill-summary-dialog';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export default function HistoryPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isOwner, setIsOwner] = React.useState<boolean | null>(null);
  const [selectedBill, setSelectedBill] = React.useState<Bill | null>(null);
  const [billToDelete, setBillToDelete] = React.useState<Bill | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = React.useState(false);

  React.useEffect(() => {
    if(user && firestore) {
      const checkRole = async () => {
        const ownerDocRef = doc(firestore, 'roles_owner', user.uid);
        const ownerDoc = await getDoc(ownerDocRef);
        setIsOwner(ownerDoc.exists());
      }
      checkRole();
    }
  }, [user, firestore]);

  const collectionPath = React.useMemo(() => {
    if (isOwner === null || !user) return null;
    return isOwner ? 'bills' : `managers/${user.uid}/bills`;
  }, [isOwner, user]);

  const billsQuery = useMemoFirebase(() => {
    if (!firestore || !collectionPath) return null;
    return query(
      collection(firestore, collectionPath),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, collectionPath]);

  const { data: bills, isLoading } = useCollection<Bill>(billsQuery);

  const filteredBills = React.useMemo(() => {
    if (!bills) return [];
    return bills.filter(bill =>
      bill.customerName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [bills, searchTerm]);
  
  React.useEffect(() => {
    const visibleIds = new Set(filteredBills.map(b => b.id));
    setSelectedIds(currentIds => {
      const newIds = new Set<string>();
      currentIds.forEach(id => {
        if (visibleIds.has(id)) {
          newIds.add(id);
        }
      });
      return newIds;
    });
  }, [filteredBills]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredBills.map(b => b.id)));
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

  const handleRowClick = (bill: Bill) => {
    setSelectedBill(bill);
  };

  const handleCloseDialog = () => {
    setSelectedBill(null);
  };
  
  const openDeleteDialog = (e: React.MouseEvent, bill: Bill) => {
      e.stopPropagation();
      setBillToDelete(bill);
  };

  const handleDeleteBill = async () => {
    if (!firestore || !billToDelete || !user) return;
    setIsDeleting(true);

    const globalBillRef = doc(firestore, 'bills', billToDelete.id);
    const managerBillRef = doc(firestore, 'managers', billToDelete.managerId, 'bills', billToDelete.id);

    try {
        // Perform deletes separately instead of in a batch
        await deleteDoc(globalBillRef);
        await deleteDoc(managerBillRef);
        
        toast({
            title: 'Bill Deleted',
            description: `The bill for ${billToDelete.customerName} has been successfully deleted.`,
        });
    } catch (error: any) {
        console.error("Error deleting bill: ", error);
        
        const permissionError = new FirestorePermissionError({
          path: error.message.includes(globalBillRef.path) ? globalBillRef.path : managerBillRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);

        toast({
            variant: 'destructive',
            title: 'Deletion Failed',
            description: 'You do not have sufficient permissions to delete this bill.',
        });
    } finally {
        setIsDeleting(false);
        setBillToDelete(null);
    }
  };
  
  const handleBulkDelete = async () => {
    if (!firestore || selectedIds.size === 0 || !bills) return;
    
    setIsBulkDeleting(true);
    const batch = writeBatch(firestore);
    const billsToDelete = bills.filter(bill => selectedIds.has(bill.id));

    billsToDelete.forEach(bill => {
        const globalBillRef = doc(firestore, 'bills', bill.id);
        batch.delete(globalBillRef);
        const managerBillRef = doc(firestore, 'managers', bill.managerId, 'bills', bill.id);
        batch.delete(managerBillRef);
    });

    try {
      await batch.commit();
      toast({
        title: 'Bills Deleted',
        description: `${selectedIds.size} bills have been successfully removed.`
      });
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Error bulk deleting bills: ", error);
      toast({
        variant: 'destructive',
        title: 'Bulk Deletion Failed',
        description: 'Could not delete the selected bills. You may not have permission.'
      });
    } finally {
      setIsBulkDeleting(false);
      setShowBulkDeleteConfirm(false);
    }
  };

  const isLoadingData = isLoading || isOwner === null;
  const allFilteredSelected = filteredBills.length > 0 && selectedIds.size === filteredBills.length;
  const canDelete = (bill: Bill) => {
    if (isUserLoading || isOwner === null || !user) return false;
    return isOwner || user.uid === bill.managerId;
  };


  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight font-headline">
            Billing History
          </h2>
          {selectedIds.size > 0 && isOwner && (
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
            <CardTitle>All Bills</CardTitle>
            <CardDescription>
              A complete record of all generated bills. Click on a row to see details.
            </CardDescription>
            <div className="relative pt-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search by customer name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
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
                     <TableHead className="w-[50px]">
                        {isOwner && (
                            <Checkbox 
                                checked={allFilteredSelected}
                                onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                aria-label="Select all"
                            />
                        )}
                     </TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Paid Amount</TableHead>
                    <TableHead>Due Amount</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBills.map((bill) => (
                    <TableRow
                      key={bill.id}
                      onClick={() => handleRowClick(bill)}
                      className={cn(
                        "cursor-pointer",
                         selectedIds.has(bill.id) && 'bg-primary/10'
                      )}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {isOwner && (
                            <Checkbox
                                checked={selectedIds.has(bill.id)}
                                onCheckedChange={(checked) => handleSelectOne(bill.id, !!checked)}
                                aria-label={`Select bill ${bill.id}`}
                            />
                        )}
                      </TableCell>
                      <TableCell>{bill.customerName}</TableCell>
                      <TableCell>{bill.totalAmount.toLocaleString()}rs</TableCell>
                      <TableCell>{bill.paidAmount.toLocaleString()}rs</TableCell>
                      <TableCell>
                        <Badge
                          variant={bill.dueAmount > 0 ? 'destructive' : 'outline'}
                        >
                          {bill.dueAmount > 0 ? `${bill.dueAmount.toLocaleString()}rs` : 'Paid'}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(bill.createdAt).toLocaleString()}</TableCell>
                       <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => openDeleteDialog(e, bill)}
                          disabled={!canDelete(bill)}
                          title={canDelete(bill) ? "Delete Bill" : "Only owners or the bill creator can delete this"}
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
                      Your search for "{searchTerm}" did not return any results.
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
      <AlertDialog open={!!billToDelete} onOpenChange={() => setBillToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the bill
                for <span className="font-semibold">{billToDelete?.customerName}</span> from the servers.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
                onClick={handleDeleteBill}
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
              This action cannot be undone. This will permanently delete the {selectedIds.size} selected bills.
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
