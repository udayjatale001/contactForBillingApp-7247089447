
'use client';

import * as React from 'react';
import { useLanguage } from '@/context/language-context';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import type { Bill, Customer } from '@/lib/types';
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Users, Trash2, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function CustomersPage() {
  const { t } = useLanguage();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = React.useState('');
  const [customerToDelete, setCustomerToDelete] = React.useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const billsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'bills'));
  }, [firestore]);

  const { data: allBills, isLoading } = useCollection<Bill>(billsQuery);

  const aggregatedCustomers = React.useMemo(() => {
    if (!allBills) return [];

    const customerMap = new Map<string, Customer>();

    allBills.forEach((bill) => {
      const customerNameKey = bill.customerName.trim().toLowerCase();
      let customer = customerMap.get(customerNameKey);

      if (!customer) {
        customer = {
          id: customerNameKey,
          name: bill.customerName,
          contactNumber: bill.contactNumber,
          address: bill.address,
          totalBilledAmount: 0,
          totalPaidAmount: 0,
          totalDueAmount: 0,
          totalCarat: 0,
          lastActivity: bill.createdAt,
        };
      }

      customer.totalBilledAmount += bill.totalAmount;
      customer.totalPaidAmount += bill.paidAmount;
      customer.totalDueAmount += bill.dueAmount;
      customer.totalCarat += bill.totalCarat;

      if (bill.createdAt > customer.lastActivity) {
        customer.lastActivity = bill.createdAt;
        if (bill.contactNumber) customer.contactNumber = bill.contactNumber;
        if (bill.address) customer.address = bill.address;
      }
      
      customerMap.set(customerNameKey, customer);
    });

    return Array.from(customerMap.values()).sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
  }, [allBills]);

  const filteredCustomers = React.useMemo(() => {
    if (!searchTerm) return aggregatedCustomers;
    return aggregatedCustomers.filter((customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [aggregatedCustomers, searchTerm]);

  const handleWhatsAppClick = (customer: Customer) => {
    if (!customer.contactNumber) {
        toast({
            variant: 'destructive',
            title: 'No Contact Number',
            description: `No contact number is available for ${customer.name}.`,
        });
        return;
    }
    const whatsappUrl = `https://wa.me/91${customer.contactNumber}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleDeleteClick = (customer: Customer) => {
    setCustomerToDelete(customer);
  };

  const confirmDelete = async () => {
    if (!firestore || !customerToDelete) return;
    setIsDeleting(true);

    try {
        const batch = writeBatch(firestore);
        
        // Find all bills for this customer
        const billsToDeleteQuery = query(collection(firestore, 'bills'), where('customerName', '==', customerToDelete.name));
        const billsSnapshot = await getDocs(billsToDeleteQuery);

        const billIds = new Set<string>();
        billsSnapshot.forEach(doc => {
            const bill = doc.data() as Bill;
            billIds.add(bill.id);
            // Delete from global collection
            batch.delete(doc.ref);
            // Delete from manager's subcollection
            batch.delete(doc(firestore, `managers/${bill.managerId}/bills/${bill.id}`));
        });
        
        if(billIds.size > 0) {
            // Delete associated notifications
            const notificationsQuery = query(collection(firestore, 'notifications'), where('billId', 'in', Array.from(billIds)));
            const notificationsSnapshot = await getDocs(notificationsQuery);
            notificationsSnapshot.forEach(doc => batch.delete(doc.ref));

            // Delete associated labour records
            const laboursQuery = query(collection(firestore, 'labours'), where('billId', 'in', Array.from(billIds)));
            const laboursSnapshot = await getDocs(laboursQuery);
            laboursSnapshot.forEach(doc => batch.delete(doc.ref));
        }

        await batch.commit();
        toast({
            title: 'Customer Deleted',
            description: `All records for ${customerToDelete.name} have been permanently removed.`,
        });
    } catch (error) {
        console.error("Error deleting customer data:", error);
        toast({
            variant: 'destructive',
            title: 'Deletion Failed',
            description: `Could not delete data for ${customerToDelete.name}. You may not have permission.`,
        });
    } finally {
        setIsDeleting(false);
        setCustomerToDelete(null);
    }
  };

  return (
     <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight font-headline">
            {t('customers')}
          </h2>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Customer Overview</CardTitle>
            <CardDescription>
              A complete list of all customers and their aggregated transaction data.
            </CardDescription>
            <div className="relative pt-4">
              <Search className="absolute left-3 top-1/2 h-5 w-5 text-muted-foreground" />
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
            ) : filteredCustomers.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Total Billed</TableHead>
                      <TableHead>Total Paid</TableHead>
                      <TableHead>Total Due</TableHead>
                      <TableHead>Total Carat</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {customer.contactNumber || 'No contact'}
                          </div>
                        </TableCell>
                        <TableCell>{customer.totalBilledAmount.toLocaleString()}rs</TableCell>
                        <TableCell>{customer.totalPaidAmount.toLocaleString()}rs</TableCell>
                        <TableCell>
                            <Badge variant={customer.totalDueAmount > 0 ? 'destructive' : 'outline'}>
                                {customer.totalDueAmount > 0 ? `${customer.totalDueAmount.toLocaleString()}rs` : 'Settled'}
                            </Badge>
                        </TableCell>
                        <TableCell>{customer.totalCarat}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                                size="icon" 
                                variant="ghost" 
                                onClick={() => handleWhatsAppClick(customer)}
                                disabled={!customer.contactNumber}
                                title="Send WhatsApp Message"
                            >
                                <MessageSquare className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(customer)}
                              title="Delete Customer"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
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
                  Customer data will appear here as you create new bills.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!customerToDelete} onOpenChange={() => setCustomerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all bills and records associated with{' '}
              <span className="font-semibold">{customerToDelete?.name}</span>.
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
              Delete Customer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

