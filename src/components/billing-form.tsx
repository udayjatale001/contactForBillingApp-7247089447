
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as React from 'react';
import { Gem, Loader2, User, ChevronsUpDown, Banknote, Home, Wrench, Phone } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { collection, doc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { BillingFormValues, billingSchema, Bill, AppSettings, Notification, Labour } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { BillSummaryDialog } from './bill-summary-dialog';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, addDocumentNonBlocking, useDoc, useMemoFirebase } from '@/firebase';


export function BillingForm() {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [generatedBill, setGeneratedBill] = React.useState<Bill | null>(null);

  const settingsDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'app_settings', 'rates');
  }, [firestore]);

  const { data: appSettings, isLoading: isLoadingRates } = useDoc<AppSettings>(settingsDocRef);

  const defaultFormValues: Partial<BillingFormValues> = {
      customerName: '',
      roomNumber: '',
      contactNumber: '',
      inCarat: undefined,
      outCarat: undefined,
      smallCarat: undefined,
      smallCaratRate: undefined,
      bigCarat: undefined,
      bigCaratRate: undefined,
      paidAmount: undefined,
      paymentMode: 'Cash' as 'Cash' | 'Online Payment' | 'Due',
      paidTo: 'Gopal Temkar' as 'Gopal Temkar' | 'Yuvaraj Temkar' | 'Suyash Temkar' | 'Gaju Dada',
      inCaratLabour: undefined,
      inCaratLabourRate: 1.5,
      outCaratLabour: undefined,
      outCaratLabourRate: 1.5,
  };

  const form = useForm<BillingFormValues>({
    resolver: zodResolver(billingSchema),
    defaultValues: defaultFormValues,
    mode: 'onBlur',
  });

  const { watch, setValue, formState: { errors } } = form;
  
  // Watch all relevant fields
  const watchedValues = watch();
  const {
      inCarat,
      outCarat,
      smallCarat,
      smallCaratRate,
      bigCarat,
      bigCaratRate,
      paidAmount,
      paymentMode,
      inCaratLabour,
      inCaratLabourRate,
      outCaratLabour,
      outCaratLabourRate
  } = watchedValues;


  // Sync labour quantities with main carat quantities
  React.useEffect(() => {
    setValue('inCaratLabour', inCarat);
  }, [inCarat, setValue]);

  React.useEffect(() => {
    setValue('outCaratLabour', outCarat);
  }, [outCarat, setValue]);

  const totalCaratAmount = React.useMemo(() => {
    const smallRate = Number(smallCaratRate) || 0;
    const bigRate = Number(bigCaratRate) || 0;
    const smallCaratAmount = (Number(smallCarat) || 0) * smallRate;
    const bigCaratAmount = (Number(bigCarat) || 0) * bigRate;
    return smallCaratAmount + bigCaratAmount;
  }, [smallCarat, smallCaratRate, bigCarat, bigCaratRate]);
  
  const totalLabourAmount = React.useMemo(() => {
    const inLabourQty = Number(inCaratLabour) || 0;
    const inLabourRate = Number(inCaratLabourRate) || 0;
    const outLabourQty = Number(outCaratLabour) || 0;
    const outLabourRate = Number(outCaratLabourRate) || 0;
    return (inLabourQty * inLabourRate) + (outLabourQty * outLabourRate);
  }, [inCaratLabour, inCaratLabourRate, outCaratLabour, outCaratLabourRate]);

  // The customer-facing total amount should only be the carat amount.
  const totalAmount = React.useMemo(() => {
    return totalCaratAmount;
  }, [totalCaratAmount]);


  const dueAmount = React.useMemo(() => {
    let effectivePaidAmount = Number(paidAmount) || 0;
    if (paymentMode === 'Due') {
        effectivePaidAmount = 0;
    }
    const due = totalAmount - effectivePaidAmount;
    return due;
  }, [totalAmount, paidAmount, paymentMode]);

  React.useEffect(() => {
    if (paidAmount && totalAmount > 0 && paidAmount > totalAmount) {
        form.setError('paidAmount', {
            type: 'manual',
            message: 'Paid amount cannot be greater than total amount.'
        });
    } else {
        if (form.formState.errors.paidAmount?.type === 'manual') {
            form.clearErrors('paidAmount');
        }
    }
  }, [paidAmount, totalAmount, form]);

    React.useEffect(() => {
    if (paymentMode === 'Due') {
      form.setValue('paidAmount', 0);
    }
  }, [paymentMode, form]);


  const handleSaveAndPrint = async () => {
    if (generatedBill && user && firestore) {
        // 1. Save the bill documents
        addDocumentNonBlocking(collection(firestore, 'managers', user.uid, 'bills'), generatedBill);
        addDocumentNonBlocking(collection(firestore, 'bills'), generatedBill);

        // 2. Create and save the notification
        const notificationMessage = `${generatedBill.customerName} paid ${generatedBill.paidAmount}rs for ${generatedBill.totalCarat} carats to ${generatedBill.paidTo} via ${generatedBill.paymentMode}. Due amount is ${generatedBill.dueAmount}rs.`;
        const newNotification: Notification = {
            id: uuidv4(),
            billId: generatedBill.id,
            managerId: user.uid,
            message: notificationMessage,
            createdAt: new Date().toISOString(),
        };
        addDocumentNonBlocking(collection(firestore, 'notifications'), newNotification);

        // 3. Create and save the labour record if applicable
        if (generatedBill.totalLabourAmount && generatedBill.totalLabourAmount > 0) {
            const newLabourRecord: Labour = {
                id: uuidv4(),
                billId: generatedBill.id,
                managerId: user.uid,
                customerName: generatedBill.customerName,
                inCaratLabour: generatedBill.inCaratLabour,
                inCaratLabourRate: generatedBill.inCaratLabourRate,
                outCaratLabour: generatedBill.outCaratLabour,
                outCaratLabourRate: generatedBill.outCaratLabourRate,
                totalLabourAmount: generatedBill.totalLabourAmount,
                createdAt: generatedBill.createdAt,
            };
            addDocumentNonBlocking(collection(firestore, 'labours'), newLabourRecord);
        }
        
        // 4. Reset the form
        form.reset(defaultFormValues);

        toast({
          title: 'Bill Saved!',
          description: 'The bill and associated records have been saved.',
        });
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setGeneratedBill(null);
    }
  }

  async function onSubmit(data: BillingFormValues) {
    setIsSubmitting(true);
     if (!user) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to create a bill.',
      });
      setIsSubmitting(false);
      return;
    }
    
    // This check is sufficient. Zod resolver will prevent submission if there are errors.
    if (data.paidAmount && totalAmount > 0 && data.paidAmount > totalAmount) {
        setIsSubmitting(false);
        toast({
            variant: 'destructive',
            title: 'Validation Error',
            description: 'Paid amount cannot be greater than total amount.',
        });
        return;
    }

    try {
        const finalPaidAmount = data.paymentMode === 'Due' ? 0 : data.paidAmount || 0;
        const finalDueAmount = totalAmount - finalPaidAmount;

        const hasSmallCarat = (data.smallCarat || 0) > 0;
        const hasBigCarat = (data.bigCarat || 0) > 0;
        let caratType = 'N/A';
        if (hasSmallCarat && hasBigCarat) {
          caratType = 'Mixed';
        } else if (hasSmallCarat) {
          caratType = 'Small Carat';
        } else if (hasBigCarat) {
          caratType = 'Big Carat';
        }

        const fullBillDetails: Bill = {
            id: uuidv4(),
            managerId: user.uid,
            customerName: data.customerName,
            ...(data.roomNumber && { roomNumber: data.roomNumber }),
            ...(data.contactNumber && { contactNumber: data.contactNumber }),
            ...(data.inCarat && { inCarat: data.inCarat }),
            ...(data.outCarat && { outCarat: data.outCarat }),
            totalCarat: (data.smallCarat || 0) + (data.bigCarat || 0),
            ...(data.smallCarat && { smallCarat: data.smallCarat }),
            ...(data.bigCarat && { bigCarat: data.bigCarat }),
            caratType: caratType,
            ...(data.smallCaratRate && { smallCaratRate: data.smallCaratRate }),
            ...(data.bigCaratRate && { bigCaratRate: data.bigCaratRate }),
            totalAmount,
            paidAmount: finalPaidAmount,
            dueAmount: finalDueAmount < 0 ? 0 : finalDueAmount,
            paidTo: data.paidTo,
            paymentMode: data.paymentMode,
            createdAt: new Date().toISOString(),
            ...(data.inCaratLabour && { inCaratLabour: data.inCaratLabour }),
            ...(data.inCaratLabourRate && { inCaratLabourRate: data.inCaratLabourRate }),
            ...(data.outCaratLabour && { outCaratLabour: data.outCaratLabour }),
            ...(data.outCaratLabourRate && { outCaratLabourRate: data.outCaratLabourRate }),
            totalLabourAmount: totalLabourAmount,
        };
        
      setGeneratedBill(fullBillDetails);


    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-6">
                {/* Customer Details */}
                <Card>
                    <CardHeader>
                        <CardTitle className='flex items-center gap-2'><User />Customer Details</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="customerName"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Customer Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Enter customer's name" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="contactNumber"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Contact Number</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input type="tel" placeholder="e.g., 9876543210" className="pl-10" {...field} />
                                    </div>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="roomNumber"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Room Number</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., 09" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        <FormField
                            control={form.control}
                            name="inCarat"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>In Carat</FormLabel>
                                <FormControl>
                                <Input type="number" placeholder="e.g., 500" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="outCarat"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Out Carat</FormLabel>
                                <FormControl>
                                <Input type="number" placeholder="e.g., 100" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                {/* Carat Details */}
                <Card>
                    <CardHeader>
                        <CardTitle className='flex items-center gap-2'><ChevronsUpDown />Carat Details</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <FormField
                            control={form.control}
                            name="smallCarat"
                            render={({ field }) => (
                                <FormItem className="col-span-2 md:col-span-2">
                                    <FormLabel>Small Carat (Qty)</FormLabel>
                                    <FormControl>
                                    <Input type="number" placeholder="e.g., 10" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="smallCaratRate"
                            render={({ field }) => (
                                <FormItem className="col-span-2 md:col-span-2">
                                    <FormLabel>Rate</FormLabel>
                                    <FormControl>
                                    <Input type="number" placeholder="e.g., 17" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="bigCarat"
                            render={({ field }) => (
                                <FormItem className="col-span-2 md:col-span-2">
                                    <FormLabel>Big Carat (Qty)</FormLabel>
                                    <FormControl>
                                    <Input type="number" placeholder="e.g., 5" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="bigCaratRate"
                            render={({ field }) => (
                                <FormItem className="col-span-2 md:col-span-2">
                                    <FormLabel>Rate</FormLabel>
                                    <FormControl>
                                    <Input type="number" placeholder="e.g., 20" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                 {/* Labour Charges */}
                <Card>
                    <CardHeader>
                        <CardTitle className='flex items-center gap-2'><Wrench />Labour Charges (Internal)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <FormField
                                control={form.control}
                                name="inCaratLabour"
                                render={({ field }) => (
                                    <FormItem className="col-span-2 md:col-span-2">
                                        <FormLabel>In Carat Labour (Qty)</FormLabel>
                                        <FormControl>
                                        <Input type="number" placeholder="In Qty" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="inCaratLabourRate"
                                render={({ field }) => (
                                    <FormItem className="col-span-2 md:col-span-2">
                                        <FormLabel>Rate</FormLabel>
                                        <FormControl>
                                        <Input type="number" step="0.1" placeholder="e.g., 1.5" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="outCaratLabour"
                                render={({ field }) => (
                                    <FormItem className="col-span-2 md:col-span-2">
                                        <FormLabel>Out Carat Labour (Qty)</FormLabel>
                                        <FormControl>
                                        <Input type="number" placeholder="Out Qty" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="outCaratLabourRate"
                                render={({ field }) => (
                                    <FormItem className="col-span-2 md:col-span-2">
                                        <FormLabel>Rate</FormLabel>
                                        <FormControl>
                                        <Input type="number" step="0.1" placeholder="e.g., 1.5" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Payment Details */}
                <Card>
                    <CardHeader>
                        <CardTitle className='flex items-center gap-2'><Banknote />Payment Details</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="paidAmount"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Paid Amount</FormLabel>
                                <FormControl>
                                <Input type="number" placeholder="Enter paid amount" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} disabled={paymentMode === 'Due'}/>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="paidTo"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Paid To</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a person" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    <SelectItem value="Gopal Temkar">Gopal Temkar</SelectItem>
                                    <SelectItem value="Yuvaraj Temkar">Yuvaraj Temkar</SelectItem>
                                    <SelectItem value="Suyash Temkar">Suyash Temkar</SelectItem>
                                    <SelectItem value="Gaju Dada">Gaju Dada</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="paymentMode"
                            render={({ field }) => (
                                <FormItem className="space-y-3 md:col-span-2">
                                <FormLabel>Payment Method</FormLabel>
                                <FormControl>
                                    <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="flex items-center space-x-4"
                                    >
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                        <RadioGroupItem value="Online Payment" />
                                        </FormControl>
                                        <FormLabel className="font-normal">Online Payment</FormLabel>
                                    </FormItem>
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                        <RadioGroupItem value="Cash" />
                                        </FormControl>
                                        <FormLabel className="font-normal">Cash</FormLabel>
                                    </FormItem>
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                        <RadioGroupItem value="Due" />
                                        </FormControl>
                                        <FormLabel className="font-normal">Due</FormLabel>
                                    </FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        <div className="md:col-span-2">
                            <FormLabel>Due Amount</FormLabel>
                            <div className={cn("flex items-center justify-between rounded-md border border-input bg-muted px-3 py-2 text-sm mt-2", dueAmount > 0 ? 'text-destructive' : 'text-primary')}>
                                <span>{(dueAmount < 0 ? 0 : dueAmount).toLocaleString()}rs</span>
                            </div>
                            {dueAmount < 0 && (
                                <p className="text-sm text-green-600 font-medium mt-2">Change to return: {(-dueAmount).toLocaleString()}rs</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="lg:col-span-1 h-fit sticky top-24">
               <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gem className="text-primary"/>
                  Calculation Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-base">
                 <div className="flex justify-between">
                  <span className="text-muted-foreground">Carat Amount:</span>
                  <span>{totalCaratAmount.toLocaleString()}rs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Internal Labour:</span>
                  <span className='text-muted-foreground'>{totalLabourAmount.toLocaleString()}rs</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span className="text-muted-foreground">Total Amount:</span>
                  <span>{totalAmount.toLocaleString()}rs</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid Amount:</span>
                  <span>{(paymentMode === 'Due' ? 0 : Number(paidAmount) || 0).toLocaleString()}rs</span>
                </div>
                <Separator />
                <div className={cn("flex justify-between font-bold text-xl", dueAmount > 0 ? 'text-destructive' : 'text-primary')}>
                  <span className="text-muted-foreground">Due Amount:</span>
                  <span>{(dueAmount < 0 ? 0 : dueAmount).toLocaleString()}rs</span>
                </div>
                 {dueAmount < 0 && (
                     <p className="text-sm text-green-600 font-medium">Change to return: {(-dueAmount).toLocaleString()}rs</p>
                 )}
              </CardContent>
              <Button type="submit" className="w-full h-12 rounded-t-none text-lg" disabled={isSubmitting || isLoadingRates}>
                {isSubmitting || isLoadingRates ? <Loader2 className="animate-spin" /> : 'Generate Bill'}
              </Button>
            </Card>
          </div>
        </form>
      </Form>
      {generatedBill && (
        <BillSummaryDialog
          bill={generatedBill}
          open={!!generatedBill}
          onOpenChange={handleDialogClose}
          onSave={async () => handleDialogClose()}
          isSavingDisabled={true}
        />
      )}
    </>
  );
}
