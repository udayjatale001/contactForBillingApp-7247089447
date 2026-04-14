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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Customer, Bill, Notification } from '@/lib/types';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, runTransaction, updateDoc, setDoc } from 'firebase/firestore';
import { Loader2, Search, Wallet, Phone, Trash2, MessageSquare, Undo2, Pencil, Lock, Plus } from 'lucide-react';
import { useLanguage } from '@/context/language-context';
import { CustomerPaymentDialog } from '@/components/customer-payment-dialog';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import withPasswordProtection from '@/components/with-password-protection';
import { composeReminderMessage } from '@/ai/flows/compose-reminder-message';
import { useUndo } from '@/context/undo-context';

const normalizeName = (name: string) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/gi, ''); 
};

function PaymentsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const { registerUndo, lastAction, undo, isUndoing } = useUndo();

  const [searchTerm, setSearchTerm] = React.useState('');
  const [customerToDelete, setCustomerToDelete] = React.useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isSendingWhatsapp, setIsSendingWhatsapp] = React.useState<string | null>(null);

  // States for security and manual operations
  const [passwordAction, setPasswordAction] = React.useState<'edit' | 'add' | null>(null);
  const [showPasswordDialog, setShowPasswordDialog] = React.useState(false);
  const [passwordInput, setPasswordInput] = React.useState('');
  
  // States for manual balance adjustment
  const [editingBalanceCustomer, setEditingBalanceCustomer] = React.useState<Customer | null>(null);
  const [showAdjustmentDialog, setShowBalanceAdjustmentDialog] = React.useState(false);
  const [newBalanceInput, setNewBalanceInput] = React.useState('');

  // States for adding new customer
  const [showAddCustomerDialog, setShowAddCustomerDialog] = React.useState(false);
  const [newCustomerData, setNewCustomerData] = React.useState({
    name: '',
    contactNumber: '',
    dueAmount: '',
  });

  const customersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'customers'), orderBy('lastActivity', 'desc'));
  }, [firestore]);

  const { data: customers, isLoading: isLoadingCustomers, forceRefetch } = useCollection<Customer>(customersQuery);

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

  const latestSelectedCustomer = React.useMemo(() => {
    if (!selectedCustomer || !customers) return selectedCustomer;
    return customers.find(c => c.id === selectedCustomer.id) || selectedCustomer;
  }, [customers, selectedCustomer]);

  const handleUpdatePayment = async (
    customer: Customer, 
    paidAmount: number, 
    paymentMode: 'Cash' | 'Online Payment',
    paidTo: 'Gopal Temkar' | 'Yuvaraj Temkar' | 'Suyash Temkar' | 'Gajanan Murtalkar',
    paymentDate: Date
    ) => {
    if (!firestore || !user) return;
    setIsProcessing(true);

    const customerRef = doc(firestore, 'customers', customer.id);
    
    const paymentBill: Bill = {
        id: uuidv4(),
        managerId: user.uid,
        customerName: customer.name,
        contactNumber: customer.contactNumber,
        totalCarat: 0,
        caratType: 'N/A',
        totalAmount: paidAmount,
        paidAmount: paidAmount,
        dueAmount: 0,
        paidTo: paidTo,
        paymentMode: paymentMode,
        createdAt: paymentDate.toISOString(),
    };
    
     const newNotification: Notification = {
        id: uuidv4(),
        billId: paymentBill.id,
        managerId: user.uid,
        createdAt: paymentDate.toISOString(),
        type: 'payment-update',
        customerName: paymentBill.customerName,
        paidAmount: paymentBill.paidAmount,
        dueAmount: paymentBill.dueAmount,
        totalCarat: paymentBill.totalCarat,
        paidTo: paymentBill.paidTo,
        paymentMode: paymentBill.paymentMode
    };

    try {
      let oldDueAmount = customer.totalDueAmount;
      await runTransaction(firestore, async (transaction) => {
        const customerDoc = await transaction.get(customerRef);
        if (!customerDoc.exists()) {
          throw 'Document does not exist!';
        }
        const currentDue = customerDoc.data().totalDueAmount;
        const newDueAmount = currentDue - paidAmount;

        transaction.update(customerRef, { 
            totalDueAmount: newDueAmount > 0 ? newDueAmount : 0,
            lastActivity: paymentDate.toISOString(),
        });
        
        const globalBillRef = doc(firestore, 'bills', paymentBill.id);
        transaction.set(globalBillRef, paymentBill);

        const managerBillRef = doc(firestore, 'managers', user.uid, 'bills', paymentBill.id);
        transaction.set(managerBillRef, paymentBill);

        transaction.set(doc(collection(firestore, 'notifications'), newNotification.id), newNotification);
      });

      registerUndo(`Payment Update (${customer.name})`, async () => {
        await runTransaction(firestore, async (transaction) => {
          transaction.update(customerRef, { totalDueAmount: oldDueAmount });
          transaction.delete(doc(firestore, 'bills', paymentBill.id));
          transaction.delete(doc(firestore, 'managers', user.uid, 'bills', paymentBill.id));
          transaction.delete(doc(firestore, 'notifications', newNotification.id));
        });
        forceRefetch();
      });

      toast({ title: 'Payment updated successfully!' });
      forceRefetch(); 
      
      setSelectedCustomer(prev => {
        if (!prev) return null;
        const newDue = prev.totalDueAmount - paidAmount;
        return {
          ...prev,
          totalDueAmount: newDue > 0 ? newDue : 0,
          lastActivity: paymentDate.toISOString()
        };
      });

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
    const oldDue = customerToDelete.totalDueAmount;
    try {
        await updateDoc(customerRef, { totalDueAmount: 0 });
        
        registerUndo(`Clear Due (${customerToDelete.name})`, async () => {
          await updateDoc(customerRef, { totalDueAmount: oldDue });
          forceRefetch();
        });

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
            message = `${t('app_title')}\n\n${t('whatsapp_thank_you_payment', customer.name)}\n\n${t('paid_amount')}: ₹${paidAmount.toLocaleString()}\n${t('due_amount')}: ₹${remainingDue.toLocaleString()}\n${t('date')}: ${format(date, 'PPpp')}\n\n${t('whatsapp_thank_you')} 😊`;
        } else {
            const response = await composeReminderMessage({
                customerName: customer.name,
                totalBillAmount: 'N/A',
                amountPaid: 'N/A',
                pendingDue: `₹${customer.totalDueAmount.toLocaleString()}`,
                language: language,
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

  // --- Manual Security Logic ---

  const openEditBalance = (e: React.MouseEvent, customer: Customer) => {
    e.stopPropagation();
    setEditingBalanceCustomer(customer);
    setPasswordAction('edit');
    setPasswordInput('');
    setShowPasswordDialog(true);
  };

  const openAddCustomer = () => {
    setPasswordAction('add');
    setPasswordInput('');
    setShowPasswordDialog(true);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === '9981') {
      setShowPasswordDialog(false);
      if (passwordAction === 'edit') {
        setNewBalanceInput(editingBalanceCustomer?.totalDueAmount.toString() || '');
        setShowBalanceAdjustmentDialog(true);
      } else if (passwordAction === 'add') {
        setNewCustomerData({ name: '', contactNumber: '', dueAmount: '' });
        setShowAddCustomerDialog(true);
      }
    } else {
      toast({
        variant: 'destructive',
        title: 'Incorrect Password',
        description: 'You do not have permission for this action.'
      });
    }
  };

  const handleAdjustBalance = async () => {
    if (!firestore || !editingBalanceCustomer) return;
    const newBalance = parseFloat(newBalanceInput);
    if (isNaN(newBalance) || newBalance < 0) {
      toast({ variant: 'destructive', title: 'Invalid Amount' });
      return;
    }

    setIsProcessing(true);
    const customerRef = doc(firestore, 'customers', editingBalanceCustomer.id);
    const oldBalance = editingBalanceCustomer.totalDueAmount;

    try {
      await updateDoc(customerRef, { totalDueAmount: newBalance });
      
      registerUndo(`Adjust Balance (${editingBalanceCustomer.name})`, async () => {
        await updateDoc(customerRef, { totalDueAmount: oldBalance });
        forceRefetch();
      });

      toast({ title: 'Balance adjusted successfully!' });
      setShowBalanceAdjustmentDialog(false);
      forceRefetch();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed to adjust balance.' });
    } finally {
      setIsProcessing(false);
      setEditingBalanceCustomer(null);
    }
  };

  const handleAddCustomer = async () => {
    if (!firestore) return;
    const { name, contactNumber, dueAmount } = newCustomerData;
    const normalizedId = normalizeName(name);
    const amount = parseFloat(dueAmount) || 0;

    if (!normalizedId) {
      toast({ variant: 'destructive', title: 'Customer name is required.' });
      return;
    }

    setIsProcessing(true);
    const customerRef = doc(firestore, 'customers', normalizedId);

    try {
      const newCustomer: Customer = {
        id: normalizedId,
        name: name.trim(),
        contactNumber: contactNumber.trim() || undefined,
        totalDueAmount: amount,
        lastActivity: new Date().toISOString(),
      };

      await setDoc(customerRef, newCustomer);

      registerUndo(`Add Customer (${newCustomer.name})`, async () => {
        // Since we don't know if the customer existed before, we clear their due
        // In a more complex app we'd check if we should delete or revert
        await updateDoc(customerRef, { totalDueAmount: 0 });
        forceRefetch();
      });

      toast({ title: 'Customer added successfully!' });
      setShowAddCustomerDialog(false);
      forceRefetch();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed to add customer.' });
    } finally {
      setIsProcessing(false);
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
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={openAddCustomer}
              className="flex items-center gap-2 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Customer</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={undo} 
              disabled={!lastAction || isUndoing}
              className="flex items-center gap-2 border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100 hover:text-orange-700 disabled:opacity-50 disabled:bg-muted transition-colors"
            >
              {isUndoing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
              <span className="hidden sm:inline">{lastAction ? `Undo: ${lastAction.label}` : 'Undo'}</span>
              <span className="sm:hidden">Undo</span>
            </Button>
          </div>
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
                            <Button variant="ghost" size="icon" onClick={(e) => openEditBalance(e, customer)}>
                                <Pencil className="h-5 w-5 text-muted-foreground" />
                            </Button>
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
              This will clear the outstanding due for <span className="font-semibold">{customerToDelete?.name}</span> by setting it to 0. This action can be undone using the Undo button.
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
        customer={latestSelectedCustomer}
        open={!!latestSelectedCustomer}
        onOpenChange={setSelectedCustomer}
        onConfirmPayment={handleUpdatePayment}
        onDelete={handleDeleteRequest}
        onWhatsApp={handleWhatsAppReminder}
        isProcessing={isProcessing}
      />

      {/* Manual Action Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handlePasswordSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" /> Security Check
              </DialogTitle>
              <DialogDescription>
                {passwordAction === 'edit' 
                  ? `Enter the password to manually edit the balance for ${editingBalanceCustomer?.name.toUpperCase()}.`
                  : 'Enter the password to manually add a new customer record.'
                }
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="edit-password">Password</Label>
              <Input 
                id="edit-password" 
                type="password" 
                autoFocus 
                value={passwordInput} 
                onChange={(e) => setPasswordInput(e.target.value)} 
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">Cancel</Button>
              </DialogClose>
              <Button type="submit">Verify</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manual Balance Adjustment Dialog */}
      <Dialog open={showAdjustmentDialog} onOpenChange={setShowBalanceAdjustmentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Balance</DialogTitle>
            <DialogDescription>
              Manually change the outstanding balance for {editingBalanceCustomer?.name.toUpperCase()}. This does not create a bill entry.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Current Balance:</span>
              <p className="text-xl font-bold">{editingBalanceCustomer?.totalDueAmount.toLocaleString()}rs</p>
            </div>
            <div>
              <Label htmlFor="new-balance">New Outstanding Balance</Label>
              <Input 
                id="new-balance" 
                type="number" 
                value={newBalanceInput} 
                onChange={(e) => setNewBalanceInput(e.target.value)} 
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowBalanceAdjustmentDialog(false)}>Cancel</Button>
            <Button onClick={handleAdjustBalance} disabled={isProcessing}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save New Balance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New Customer Dialog */}
      <Dialog open={showAddCustomerDialog} onOpenChange={setShowAddCustomerDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>
              Create a new customer profile with an initial due amount.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cust-name">Customer Name</Label>
              <Input 
                id="cust-name" 
                placeholder="Enter name"
                value={newCustomerData.name} 
                onChange={(e) => setNewCustomerData(prev => ({...prev, name: e.target.value}))} 
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cust-phone">Contact Number (10-digit)</Label>
              <Input 
                id="cust-phone" 
                type="tel"
                placeholder="9876543210"
                value={newCustomerData.contactNumber} 
                onChange={(e) => setNewCustomerData(prev => ({...prev, contactNumber: e.target.value}))} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cust-due">Initial Due Amount (rs)</Label>
              <Input 
                id="cust-due" 
                type="number"
                placeholder="0"
                value={newCustomerData.dueAmount} 
                onChange={(e) => setNewCustomerData(prev => ({...prev, dueAmount: e.target.value}))} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddCustomerDialog(false)}>Cancel</Button>
            <Button onClick={handleAddCustomer} disabled={isProcessing || !newCustomerData.name}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default withPasswordProtection(PaymentsPage);