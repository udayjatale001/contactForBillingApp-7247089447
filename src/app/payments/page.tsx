
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
import type { Customer } from '@/lib/types';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, runTransaction, updateDoc } from 'firebase/firestore';
import { Loader2, Search, Users, MessageSquare, Trash2, Phone, Wallet } from 'lucide-react';
import { useLanguage } from '@/context/language-context';

function CustomerPaymentRow({ customer, onUpdate, onDelete }: { customer: Customer, onUpdate: (id: string, amount: number) => void, onDelete: (id: string) => void }) {
  const { t } = useLanguage();
  const [paidAmount, setPaidAmount] = React.useState('');
  const [isConfirming, setIsConfirming] = React.useState(false);

  const currentDue = customer.totalDueAmount - (Number(paidAmount) || 0);

  const handleConfirm = async () => {
    const amount = Number(paidAmount);
    if (!amount || amount <= 0 || amount > customer.totalDueAmount) {
      // Basic validation, can be enhanced
      return;
    }
    setIsConfirming(true);
    await onUpdate(customer.id, amount);
    setIsConfirming(false);
    setPaidAmount('');
  };
  
  const handleWhatsAppReminder = () => {
    if (!customer.contactNumber) return;
    const message = t('whatsapp_reminder_message', customer.totalDueAmount.toLocaleString());
    const whatsappUrl = `https://wa.me/91${customer.contactNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border rounded-lg gap-4">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-lg truncate">{customer.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <a href={`tel:${customer.contactNumber}`} className="text-sm text-blue-500 hover:underline">
            {customer.contactNumber || 'No number'}
          </a>
        </div>
      </div>

      <div className="w-full md:w-auto grid grid-cols-2 sm:flex sm:flex-row items-center gap-2 md:gap-4">
        <div className="text-center p-2 rounded-md bg-destructive/10">
          <p className="text-xs font-medium text-destructive">Due Amount</p>
          <p className="text-xl font-bold text-destructive">{customer.totalDueAmount.toLocaleString()}rs</p>
        </div>
        
        <div className="text-center p-2 rounded-md bg-blue-500/10">
          <p className="text-xs font-medium text-blue-600">Current Due</p>
          <p className="text-xl font-bold text-blue-600">{currentDue.toLocaleString()}rs</p>
        </div>

        <div className="flex-grow">
          <Input
            type="number"
            placeholder="Paid Amount"
            value={paidAmount}
            onChange={(e) => setPaidAmount(e.target.value)}
            className="h-10 text-base"
          />
        </div>

        <div className="flex items-center gap-1">
          <Button onClick={handleConfirm} disabled={isConfirming || !paidAmount || Number(paidAmount) <= 0} className="h-10">
            {isConfirming ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
          </Button>
           <Button variant="ghost" size="icon" onClick={handleWhatsAppReminder} disabled={!customer.contactNumber}>
            <MessageSquare className="h-5 w-5 text-green-500" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(customer.id)}>
            <Trash2 className="h-5 w-5 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PaymentsPage() {
  const { isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [searchTerm, setSearchTerm] = React.useState('');
  const [customerToDelete, setCustomerToDelete] = React.useState<string | null>(null);

  const customersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'customers'), orderBy('lastActivity', 'desc'));
  }, [firestore]);

  const { data: customers, isLoading: isLoadingCustomers, error, forceRefetch } = useCollection<Customer>(customersQuery);

  const filteredCustomers = React.useMemo(() => {
    if (!customers) return [];
    
    let activeCustomers = customers.filter(c => c.totalDueAmount > 0);

    if (searchTerm) {
      return activeCustomers.filter((customer) =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return activeCustomers;
  }, [customers, searchTerm]);

  const handleUpdatePayment = async (customerId: string, paidAmount: number) => {
    if (!firestore) return;

    const customerRef = doc(firestore, 'customers', customerId);
    try {
      await runTransaction(firestore, async (transaction) => {
        const customerDoc = await transaction.get(customerRef);
        if (!customerDoc.exists()) {
          throw 'Document does not exist!';
        }
        const currentDue = customerDoc.data().totalDueAmount;
        const newDue = currentDue - paidAmount;
        transaction.update(customerRef, { totalDueAmount: newDue > 0 ? newDue : 0 });
      });
      toast({ title: 'Payment updated successfully!' });
      forceRefetch(); // Re-fetch data to update the UI
    } catch (e) {
      console.error('Payment update failed: ', e);
      toast({ variant: 'destructive', title: 'Payment update failed.' });
    }
  };
  
  const handleDeleteCustomer = async () => {
    if (!firestore || !customerToDelete) return;
    
    const customerRef = doc(firestore, 'customers', customerToDelete);
    try {
        await updateDoc(customerRef, { totalDueAmount: 0 });
        toast({ title: 'Customer due cleared.' });
        forceRefetch();
    } catch (e) {
        console.error('Failed to clear due: ', e);
        toast({ variant: 'destructive', title: 'Failed to clear due.' });
    } finally {
        setCustomerToDelete(null);
    }
  };

  const isLoading = isUserLoading || isLoadingCustomers;

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight font-headline">
            Customer Payments
          </h2>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Manage Due Amounts</CardTitle>
            <CardDescription>
              Track and update outstanding payments from all customers.
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
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center items-center py-16">
                <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
              </div>
            ) : filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer) => (
                <CustomerPaymentRow 
                    key={customer.id} 
                    customer={customer} 
                    onUpdate={handleUpdatePayment}
                    onDelete={() => setCustomerToDelete(customer.id)}
                />
              ))
            ) : (
              <div className="text-center py-16">
                <Wallet className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">All Dues Cleared</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  There are no customers with outstanding payments.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
       <AlertDialog open={!!customerToDelete} onOpenChange={() => setCustomerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear the outstanding due for this customer by setting it to 0. This is not the same as making a payment. Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCustomer} className='bg-destructive hover:bg-destructive/90'>
                Clear Due
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
