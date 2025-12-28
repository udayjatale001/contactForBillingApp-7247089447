
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
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { Bill, Customer } from '@/lib/types';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, getDocs, writeBatch, doc, deleteDoc } from 'firebase/firestore';
import { Loader2, Search, Users, MessageSquare, Trash2, AlertCircle } from 'lucide-react';

export default function KoushalPage() {
  const { isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = React.useState('');
  const [billToDelete, setBillToDelete] = React.useState<Bill | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const billsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'bills'));
  }, [firestore]);

  const { data: allBills, isLoading: isLoadingBills, error: billsError } = useCollection<Bill>(billsQuery);

  const filteredBills = React.useMemo(() => {
    if (!allBills) return [];
    if (!searchTerm) return allBills;
    return allBills.filter((bill) =>
      bill.customerName && bill.customerName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allBills, searchTerm]);

  const handleDeleteClick = (bill: Bill) => {
    setBillToDelete(bill);
  };
  
  const handleWhatsAppClick = (bill: Bill) => {
    if (!bill.contactNumber) {
        toast({
            variant: 'destructive',
            title: 'No Contact Number',
            description: `Cannot send message to ${bill.customerName} as there is no number on file.`,
        });
        return;
    }
    const whatsappUrl = `https://wa.me/91${bill.contactNumber}`;
    window.open(whatsappUrl, '_blank');
  };

  const confirmDelete = async () => {
    if (!firestore || !billToDelete) return;
    setIsDeleting(true);

    try {
      // Only delete the single bill record from the global collection
      const billRef = doc(firestore, 'bills', billToDelete.id);
      await deleteDoc(billRef);

      toast({
        title: 'Bill Record Deleted',
        description: `The bill record for ${billToDelete.customerName} has been permanently removed.`,
      });

    } catch (error) {
      console.error('Error deleting bill record: ', error);
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: 'Could not delete the bill record. You may not have permission.',
      });
    } finally {
      setIsDeleting(false);
      setBillToDelete(null);
    }
  };

  const isLoading = isUserLoading || isLoadingBills;

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight font-headline">
            Customer Details
          </h2>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Customer Overview</CardTitle>
            <CardDescription>
              A complete list of all customer bill records.
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
            {isLoading ? (
              <div className="flex justify-center items-center py-16">
                <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
              </div>
            ) : billsError ? (
               <div className="flex flex-col items-center justify-center p-8 text-center bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertCircle className="h-12 w-12 text-destructive" />
                  <h3 className="mt-4 text-lg font-semibold text-destructive">Failed to Load Customers</h3>
                  <p className="mt-1 text-sm text-destructive/80">
                      Could not fetch billing data. Please check your connection and security rules.
                  </p>
              </div>
            ) : filteredBills.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Total Carat</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBills.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell className="font-medium">{bill.customerName}</TableCell>
                        <TableCell>{bill.contactNumber || 'N/A'}</TableCell>
                        <TableCell>{bill.address || 'N/A'}</TableCell>
                        <TableCell className="text-green-600 font-medium">{(bill.totalAmount || 0).toLocaleString()}rs</TableCell>
                        <TableCell>{(bill.totalCarat || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleWhatsAppClick(bill)} disabled={!bill.contactNumber} title="Send WhatsApp">
                            <MessageSquare className="h-4 w-4 text-green-600" />
                          </Button>
                           <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(bill)} title="Delete Bill Record">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-16">
                <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No Customers Found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  As you create bills, customer data will appear here automatically.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        open={!!billToDelete}
        onOpenChange={() => setBillToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this single bill record for{' '}
              <span className='font-semibold'>{billToDelete?.customerName}</span>. It will not affect other bills for this customer.
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
              Delete Bill Record
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    