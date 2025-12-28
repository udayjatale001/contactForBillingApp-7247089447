
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
import type { Bill } from '@/lib/types';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, getDocs, writeBatch, doc, deleteDoc, where } from 'firebase/firestore';
import { Loader2, Search, Users, MessageSquare, Trash2, AlertCircle } from 'lucide-react';

// This new interface represents a single, aggregated customer record.
interface AggregatedCustomer {
  id: string; // We'll use the customer name as a unique key
  name: string;
  contactNumber?: string;
  address?: string;
  totalAmount: number;
  totalCarat: number;
  billIds: string[]; // Keep track of all associated bill IDs for deletion
}

export default function KoushalPage() {
  const { isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = React.useState('');
  const [customerToDelete, setCustomerToDelete] = React.useState<AggregatedCustomer | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const billsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'bills'));
  }, [firestore]);

  const { data: allBills, isLoading: isLoadingBills, error: billsError } = useCollection<Bill>(billsQuery);

  const aggregatedCustomers = React.useMemo(() => {
    if (!allBills) return [];

    const customerMap = new Map<string, AggregatedCustomer>();

    allBills.forEach((bill) => {
      // Ensure we don't process bills without a customer name
      if (!bill.customerName) return;

      const customerNameKey = bill.customerName.trim().toLowerCase();
      let customer = customerMap.get(customerNameKey);

      if (!customer) {
        // If customer doesn't exist, create a new entry
        customer = {
          id: customerNameKey,
          name: bill.customerName,
          contactNumber: bill.contactNumber,
          address: bill.address,
          totalAmount: 0,
          totalCarat: 0,
          billIds: [],
        };
      }

      // Update the totals and details for the customer
      customer.totalAmount += bill.totalAmount || 0;
      customer.totalCarat += bill.totalCarat || 0;
      // Always use the latest contact info if available
      if (bill.contactNumber) customer.contactNumber = bill.contactNumber;
      if (bill.address) customer.address = bill.address;
      customer.billIds.push(bill.id);
      
      customerMap.set(customerNameKey, customer);
    });

    return Array.from(customerMap.values());
  }, [allBills]);


  const filteredCustomers = React.useMemo(() => {
    if (!aggregatedCustomers) return [];
    if (!searchTerm) return aggregatedCustomers;
    return aggregatedCustomers.filter((customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [aggregatedCustomers, searchTerm]);

  const handleDeleteClick = (customer: AggregatedCustomer) => {
    setCustomerToDelete(customer);
  };
  
  const handleWhatsAppClick = (customer: AggregatedCustomer) => {
    if (!customer.contactNumber) {
        toast({
            variant: 'destructive',
            title: 'No Contact Number',
            description: `Cannot send message to ${customer.name} as there is no number on file.`,
        });
        return;
    }
    const message = `Hello ${customer.name}, you have added a total of ${customer.totalCarat} carats so far. Thank you for your continued business.`;
    const whatsappUrl = `https://wa.me/91${customer.contactNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const confirmDelete = async () => {
    if (!firestore || !customerToDelete) return;
    setIsDeleting(true);
  
    try {
      const batch = writeBatch(firestore);
  
      // This logic will only remove the bills from the global collection,
      // which is used to build this aggregated view. It will NOT touch manager subcollections.
      // This aligns with "deleting from this page only".
      customerToDelete.billIds.forEach(billId => {
        const billRef = doc(firestore, 'bills', billId);
        batch.delete(billRef);
      });
  
      await batch.commit();
  
      toast({
        title: 'Customer Data Removed',
        description: `All associated bills for ${customerToDelete.name} have been removed from the global view.`,
      });
  
    } catch (error) {
      console.error('Error deleting customer records: ', error);
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: 'Could not delete customer records. You may not have permission.',
      });
    } finally {
      setIsDeleting(false);
      setCustomerToDelete(null);
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
              A complete list of all customers and their total transactions.
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
            ) : filteredCustomers.length > 0 ? (
              <div className="w-full overflow-x-auto">
                <Table className="min-w-[720px]">
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
                    {filteredCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>{customer.contactNumber || 'N/A'}</TableCell>
                        <TableCell>{customer.address || 'N/A'}</TableCell>
                        <TableCell className="text-green-600 font-medium">{(customer.totalAmount || 0).toLocaleString()}rs</TableCell>
                        <TableCell>{(customer.totalCarat || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleWhatsAppClick(customer)} disabled={!customer.contactNumber} title="Send WhatsApp">
                            <MessageSquare className="h-4 w-4 text-green-600" />
                          </Button>
                           <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(customer)} title="Delete All Records for Customer">
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
        open={!!customerToDelete}
        onOpenChange={() => setCustomerToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all records for{' '}
              <span className='font-semibold'>{customerToDelete?.name}</span> from this aggregated view by removing their global bill entries.
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
              Delete Records
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
