
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
import type { Customer, Bill } from '@/lib/types';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc, runTransaction, updateDoc } from 'firebase/firestore';
import { Loader2, Search, Users, Wallet, Phone, Trash2, MessageSquare } from 'lucide-react';
import { useLanguage } from '@/context/language-context';
import { CustomerPaymentDialog } from '@/components/customer-payment-dialog';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import withPasswordProtection from '@/components/with-password-protection';
import { composeReminderMessage } from '@/ai/flows/compose-reminder-message';


function PaymentsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [searchTerm, setSearchTerm] = React.useState('');
  const [customerToDelete, setCustomerToDelete] = React.useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isSendingWhatsapp, setIsSendingWhatsapp] = React.useState<string | null>(null);


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

  const handleUpdatePayment = async (
    customer: Customer, 
    paidAmount: number, 
    paymentMode: 'Cash' | 'Online Payment',
    paymentDate: Date
    ) => {
    if (!firestore || !user) return;
    setIsProcessing(true);

    const customerRef = doc(firestore, 'customers', customer.id);
    
    // Create a new bill to record this specific payment transaction
    const paymentBill: Bill = {
        id: uuidv4(),
        managerId: user.uid,
        customerName: customer.name,
        contactNumber: customer.contactNumber,
        totalCarat: 0,
        caratType: 'N/A',
        totalAmount: paidAmount, // Total amount of this transaction is what's paid
        paidAmount: paidAmount,
        dueAmount: 0, // This specific transaction has no due amount
        paidTo: 'Gopal Temkar', // Default value
        paymentMode: paymentMode,
        createdAt: paymentDate.toISOString(),
    };

    try {
      await runTransaction(firestore, async (transaction) => {
        const customerDoc = await transaction.get(customerRef);
        if (!customerDoc.exists()) {
          throw 'Document does not exist!';
        }
        const currentDue = customerDoc.data().totalDueAmount;
        const newDue = currentDue - paidAmount;

        // Update the central customer record
        transaction.update(customerRef, { 
            totalDueAmount: newDue > 0 ? newDue : 0,
            lastActivity: paymentDate.toISOString(),
        });
        
        // Add the payment record as a new bill document in the global collection
        const globalBillRef = doc(firestore, 'bills', paymentBill.id);
        transaction.set(globalBillRef, paymentBill);

        // Also add to manager's subcollection
        const managerBillRef = doc(firestore, 'managers', user.uid, 'bills', paymentBill.id);
        transaction.set(managerBillRef, paymentBill);
      });

      toast({ title: 'Payment updated successfully!' });
      forceRefetch(); // Re-fetch data to update the UI
      setSelectedCustomer(null); // Close the dialog
    } catch (e) {
      console.error('Payment update failed: ', e);
      toast({ variant: 'destructive', title: 'Payment update failed.' });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleDeleteRequest = (customer: Customer) => {
    setCustomerToDelete(customer);
    setSelectedCustomer(null);
  };

  const confirmDeleteCustomer = async () => {
    if (!firestore || !customerToDelete) return;
    
    const customerRef = doc(firestore, 'customers', customerToDelete.id);
    try {
        await updateDoc(customerRef, { totalDueAmount: 0 });
        toast({ title: `Due cleared for ${customerToDelete.name}` });
        forceRefetch();
    } catch (e) {
        console.error('Failed to clear due: ', e);
        toast({ variant: 'destructive', title: 'Failed to clear due.' });
    } finally {
        setCustomerToDelete(null);
    }
  };

  const handleWhatsAppReminder = async (customer: Customer, paidAmount?: number, remainingDue?: number, date?: Date) => {
    if (!customer.contactNumber) return;
    setIsSendingWhatsapp(customer.id);
    let message = '';
    
    try {
        if (paidAmount && remainingDue !== undefined && date) {
            // This is a payment confirmation message
            message = `Anand Sagar Ripening & Cooling Chamber\n\nThank you for your payment, ${customer.name}!\n\nPaid Amount: ₹${paidAmount.toLocaleString()}\nRemaining Due: ₹${remainingDue.toLocaleString()}\nDate: ${format(date, 'PPpp')}\n\nThank you for your business! 😊`;
        } else {
            // This is a payment reminder message, generated by AI
            const response = await composeReminderMessage({
                customerName: customer.name,
                totalBillAmount: 'N/A',
                amountPaid: 'N/A',
                pendingDue: `₹${customer.totalDueAmount.toLocaleString()}`,
            });
            message = response.message;
        }
        
        const whatsappUrl = `https://wa.me/91${customer.contactNumber}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');

    } catch (error) {
        console.error("Failed to generate WhatsApp message:", error);
        toast({
            variant: "destructive",
            title: "Failed to generate message",
            description: "Could not create the WhatsApp reminder message.",
        });
    } finally {
        setIsSendingWhatsapp(null);
    }
};

  const isLoading = isUserLoading || isLoadingCustomers;

  return (
    <>
      <div className="flex-1 space-y-4 p-2 sm:p-4 md:p-8 pt-6">
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
                <div 
                    key={customer.id} 
                    onClick={() => setSelectedCustomer(customer)}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg gap-4 hover:bg-muted/50 cursor-pointer transition-colors"
                >
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-lg truncate">{customer.name.toUpperCase()}</p>
                        <div className="flex items-center gap-2 mt-1">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a href={`tel:${customer.contactNumber}`} className="text-sm text-blue-500 hover:underline" onClick={e => e.stopPropagation()}>
                            {customer.contactNumber || 'No number'}
                        </a>
                        </div>
                    </div>

                    <div className="w-full sm:w-auto flex items-center justify-between gap-2">
                        <div className="text-right">
                            <p className="text-xl font-bold text-destructive">{customer.totalDueAmount.toLocaleString()}rs</p>
                            <p className="text-xs text-muted-foreground">Due Amount</p>
                        </div>
                        <div className="flex items-center">
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleWhatsAppReminder(customer);}} disabled={isSendingWhatsapp === customer.id}>
                                {isSendingWhatsapp === customer.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageSquare className="h-5 w-5 text-green-500" />}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDeleteRequest(customer);}}>
                                <Trash2 className="h-5 w-5 text-destructive" />
                            </Button>
                        </div>
                    </div>
                </div>
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
              This will clear the outstanding due for <span className="font-semibold">{customerToDelete?.name}</span> by setting it to 0. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCustomer} className='bg-destructive hover:bg-destructive/90'>
                Clear Due
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CustomerPaymentDialog
        customer={selectedCustomer}
        open={!!selectedCustomer}
        onOpenChange={setSelectedCustomer}
        onConfirmPayment={handleUpdatePayment}
        onDelete={handleDeleteRequest}
        onWhatsApp={handleWhatsAppReminder}
        isProcessing={isProcessing}
      />
    </>
  );
}

export default withPasswordProtection(PaymentsPage);
