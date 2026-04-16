
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
import { collection, query, getDocs, writeBatch, doc, setDoc } from 'firebase/firestore';
import { Loader2, Search, Users, MessageSquare, Trash2, AlertCircle } from 'lucide-react';
import { CustomerSummaryDialog } from '@/components/customer-summary-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

// This new interface represents a single, aggregated customer record.
export interface AggregatedCustomer {
  id: string; // We'll use the normalized customer name as a unique key
  name: string;
  contactNumber?: string;
  address?: string;
  totalAmount: number;
  totalCarat: number;
  billIds: string[]; // Keep track of all associated bill IDs for deletion
  // Base values before offsets for calculation
  baseAmount: number;
  baseCarat: number;
}

const normalizeName = (name: string) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/gi, ''); // Removes punctuation like periods, commas, etc.
};

export default function KoushalPage() {
  const { isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = React.useState('');
  const [customerToDelete, setCustomerToDelete] = React.useState<AggregatedCustomer | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [selectedCustomer, setSelectedCustomer] = React.useState<AggregatedCustomer | null>(null);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = React.useState(false);

  const billsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'bills'));
  }, [firestore]);

  const { data: allBills, isLoading: isLoadingBills, error: billsError } = useCollection<Bill>(billsQuery);

  const customersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'customers'));
  }, [firestore]);
  const { data: allCustomers, isLoading: isLoadingCustomers } = useCollection<Customer>(customersQuery);

  const aggregatedCustomers = React.useMemo(() => {
    if (!allBills) return [];

    const customerMap = new Map<string, AggregatedCustomer>();

    allBills.forEach((bill) => {
      // Ensure we don't process bills without a customer name
      if (!bill.customerName) return;

      const customerNameKey = normalizeName(bill.customerName);
      let customer = customerMap.get(customerNameKey);

      if (!customer) {
        // If customer doesn't exist, create a new entry
        customer = {
          id: customerNameKey,
          name: bill.customerName, // Original name from bill for display
          contactNumber: bill.contactNumber,
          address: bill.address,
          totalAmount: 0,
          totalCarat: 0,
          billIds: [],
          baseAmount: 0,
          baseCarat: 0,
        };
      }

      // Update the totals and details for the customer
      customer.baseAmount += bill.totalAmount || 0;
      customer.baseCarat += bill.totalCarat || 0;
      // Always use the latest contact info if available
      if (bill.contactNumber) customer.contactNumber = bill.contactNumber;
      if (bill.address) customer.address = bill.address;
      customer.billIds.push(bill.id);
      
      customerMap.set(customerNameKey, customer);
    });

    // Merge with manual offsets and details from the customers collection
    const results = Array.from(customerMap.values()).map(agg => {
        const customerDoc = allCustomers?.find(c => c.id === agg.id);
        if (customerDoc) {
            return {
                ...agg,
                name: customerDoc.name || agg.name,
                contactNumber: customerDoc.contactNumber || agg.contactNumber,
                address: customerDoc.address || agg.address,
                totalAmount: agg.baseAmount + (customerDoc.totalAmountOffset || 0),
                totalCarat: agg.baseCarat + (customerDoc.totalCaratOffset || 0),
            };
        }
        return {
            ...agg,
            totalAmount: agg.baseAmount,
            totalCarat: agg.baseCarat,
        };
    });

    return results;
  }, [allBills, allCustomers]);


  const filteredCustomers = React.useMemo(() => {
    if (!aggregatedCustomers) return [];
    if (!searchTerm) return aggregatedCustomers;
    const searchLower = normalizeName(searchTerm);
    return aggregatedCustomers.filter((customer) =>
      customer.id.includes(searchLower)
    );
  }, [aggregatedCustomers, searchTerm]);

  React.useEffect(() => {
    const visibleIds = new Set(filteredCustomers.map(c => c.id));
    setSelectedIds(currentIds => {
      const newIds = new Set<string>();
      currentIds.forEach(id => {
        if (visibleIds.has(id)) {
          newIds.add(id);
        }
      });
      return newIds;
    });
  }, [filteredCustomers]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredCustomers.map(c => c.id)));
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

    const billIdsToDelete = new Set<string>();
    selectedIds.forEach(customerId => {
        const customer = aggregatedCustomers.find(c => c.id === customerId);
        if (customer) {
            customer.billIds.forEach(billId => billIdsToDelete.add(billId));
        }
    });

    billIdsToDelete.forEach(billId => {
        const billRef = doc(firestore, 'bills', billId);
        batch.delete(billRef);
    });

    try {
        await batch.commit();
        toast({
            title: 'Customers Deleted',
            description: `All records for ${selectedIds.size} customers have been removed from the global view.`
        });
        setSelectedIds(new Set());
    } catch (error) {
        console.error('Error bulk deleting customer records:', error);
        toast({
            variant: 'destructive',
            title: 'Bulk Deletion Failed',
            description: 'Could not delete the selected customer records. You may not have permission.'
        });
    } finally {
        setIsBulkDeleting(false);
        setShowBulkDeleteConfirm(false);
    }
  };


  const handleDeleteClick = (customer: AggregatedCustomer) => {
    setSelectedCustomer(null); // Close the summary dialog
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

  const handleEditCustomer = async (customerId: string, data: Partial<Customer> & { totalCarat?: number, totalAmount?: number }) => {
    if (!firestore) return;
    
    const customerRef = doc(firestore, 'customers', customerId);
    const existing = allCustomers?.find(c => c.id === customerId);
    
    // Calculate new offsets if totals were adjusted
    const updates: any = {
        name: data.name,
        address: data.address,
        contactNumber: data.contactNumber,
    };

    if (data.totalCarat !== undefined) {
        const agg = aggregatedCustomers.find(c => c.id === customerId);
        if (agg) {
            updates.totalCaratOffset = data.totalCarat - agg.baseCarat;
        }
    }
    if (data.totalAmount !== undefined) {
        const agg = aggregatedCustomers.find(c => c.id === customerId);
        if (agg) {
            updates.totalAmountOffset = data.totalAmount - agg.baseAmount;
        }
    }

    try {
        await setDoc(customerRef, updates, { merge: true });
        toast({ title: 'Customer Details Updated' });
        setSelectedCustomer(null);
    } catch (error) {
        console.error("Update failed:", error);
        toast({ variant: 'destructive', title: 'Update Failed' });
    }
  };

  const isLoading = isUserLoading || isLoadingBills || isLoadingCustomers;
  const allFilteredSelected = filteredCustomers.length > 0 && selectedIds.size === filteredCustomers.length;

  return (
    <>
      <div className="flex-1 space-y-4 p-2 sm:p-4 md:p-8 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-3xl font-bold tracking-tight font-headline">
            Customer Details
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
            <CardTitle>Customer Overview</CardTitle>
            <CardDescription>
              A complete list of all customers and their total transactions.
            </CardDescription>
            <div className="border-t pt-4 mt-4 space-y-4">
                <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    placeholder="Search by customer name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
                </div>
                 {filteredCustomers.length > 0 && (
                    <div className="flex items-center space-x-2">
                        <Checkbox 
                            id="select-all-customers" 
                            checked={allFilteredSelected}
                            onCheckedChange={(checked) => handleSelectAll(!!checked)}
                        />
                        <label
                            htmlFor="select-all-customers"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                           Select all ({filteredCustomers.length})
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='w-10'></TableHead>
                      <TableHead>Customer Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Total Carat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow 
                        key={customer.id} 
                        onClick={() => setSelectedCustomer(customer)} 
                        className={cn("cursor-pointer", selectedIds.has(customer.id) && 'bg-primary/10')}
                      >
                         <TableCell onClick={(e) => e.stopPropagation()}>
                           <Checkbox 
                              checked={selectedIds.has(customer.id)} 
                              onCheckedChange={(checked) => handleSelectOne(customer.id, !!checked)}
                              aria-label={`Select customer ${customer.name}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{customer.name.toUpperCase()}</TableCell>
                        <TableCell>{customer.contactNumber || 'N/A'}</TableCell>
                        <TableCell>{customer.address || 'N/A'}</TableCell>
                        <TableCell className="text-green-600 font-medium">{(customer.totalAmount || 0).toLocaleString()}rs</TableCell>
                        <TableCell>{(customer.totalCarat || 0).toLocaleString()}</TableCell>
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

      {selectedCustomer && (
        <CustomerSummaryDialog
            customer={selectedCustomer}
            open={!!selectedCustomer}
            onOpenChange={() => setSelectedCustomer(null)}
            onWhatsApp={() => handleWhatsAppClick(selectedCustomer)}
            onDelete={() => handleDeleteClick(selectedCustomer)}
            onEdit={(data) => handleEditCustomer(selectedCustomer.id, data)}
        />
      )}

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

       <AlertDialog
        open={showBulkDeleteConfirm}
        onOpenChange={setShowBulkDeleteConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all associated global records for the {selectedIds.size} selected customers. This action cannot be undone.
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
