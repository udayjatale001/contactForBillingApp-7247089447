
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as React from 'react';
import { Gem, Loader2, User, ChevronsUpDown, Banknote, Home, Wrench, Phone, Calendar as CalendarIcon, Printer, MapPin, Save } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { collection, doc, runTransaction } from 'firebase/firestore';
import { format, setHours, setMinutes } from 'date-fns';

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
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { BillingFormValues, billingSchema, Bill, AppSettings, Notification, Labour, Token, Customer } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { BillSummaryDialog } from './bill-summary-dialog';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, addDocumentNonBlocking, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { TokenSummaryDialog } from './token-summary-dialog';


export function BillingForm() {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSavingToken, setIsSavingToken] = React.useState(false);
  const [generatedBill, setGeneratedBill] = React.useState<Bill | null>(null);
  const [generatedToken, setGeneratedToken] = React.useState<Token | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);

  // Refs for input fields
  const formRef = React.useRef<HTMLFormElement>(null);

  const settingsDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'app_settings', 'rates');
  }, [firestore]);

  const { data: appSettings, isLoading: isLoadingRates } = useDoc<AppSettings>(settingsDocRef);

  const defaultFormValues: Partial<BillingFormValues> = {
      customerName: '',
      roomNumber: '',
      contactNumber: '',
      address: '',
      createdAt: new Date(),
      inCarat: undefined,
      outCarat: undefined,
      smallCarat: undefined,
      smallCaratRate: 17,
      bigCarat: undefined,
      bigCaratRate: 20,
      paidAmount: undefined,
      paymentMode: 'Cash' as 'Cash' | 'Online Payment' | 'Due',
      paidTo: 'Gopal Temkar' as 'Gopal Temkar' | 'Yuvaraj Temkar' | 'Suyash Temkar' | 'Gajananad Murtankar',
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
  
  const { setValue } = form;

  React.useEffect(() => {
    if (appSettings) {
        // We set the default values in the form declaration now.
        // This effect can still be useful if we want to override with fetched settings
        // but for now we keep the hardcoded defaults.
        // setValue('smallCaratRate', appSettings.smallCaratRate, { shouldValidate: true });
        // setValue('bigCaratRate', appSettings.bigCaratRate, { shouldValidate: true });
    }
  }, [appSettings, setValue]);


  const { watch, trigger, getValues } = form;
  
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
    const inLabourRateValue = Number(inCaratLabourRate) || 0;
    const outLabourQty = Number(outCaratLabour) || 0;
    const outLabourRateValue = Number(outCaratLabourRate) || 0;
    return (inLabourQty * inLabourRateValue) + (outLabourQty * outLabourRateValue);
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


 const handleSaveBill = async (): Promise<void> => {
    if (!generatedBill || !user || !firestore) {
        toast({
            variant: 'destructive',
            title: 'Save Failed',
            description: "No bill data, user, or firestore available.",
        });
        return Promise.reject("Missing data for save");
    }

    try {
        await runTransaction(firestore, async (transaction) => {
            // All reads must happen before any writes
            let customerDue = 0;
            const customerRef = doc(firestore, 'customers', generatedBill.customerName.toLowerCase());
            
            try {
                const customerDoc = await transaction.get(customerRef);
                if (customerDoc.exists()) {
                    customerDue = customerDoc.data().totalDueAmount || 0;
                }
            } catch (error) {
                console.info("Customer doesn't exist, will be created.");
            }
    
            // Now perform all writes
            // Save main bill records
            const billCollectionRef = collection(firestore, 'bills');
            const managerBillCollectionRef = collection(firestore, 'managers', user.uid, 'bills');
            transaction.set(doc(billCollectionRef, generatedBill.id), generatedBill);
            transaction.set(doc(managerBillCollectionRef, generatedBill.id), generatedBill);
    
            // Save notification
            const newNotification: Notification = {
                id: uuidv4(),
                billId: generatedBill.id,
                managerId: user.uid,
                createdAt: new Date().toISOString(),
                customerName: generatedBill.customerName,
                paidAmount: generatedBill.paidAmount,
                dueAmount: generatedBill.dueAmount,
                totalCarat: generatedBill.totalCarat,
                paidTo: generatedBill.paidTo,
                paymentMode: generatedBill.paymentMode
            };
            transaction.set(doc(collection(firestore, 'notifications'), newNotification.id), newNotification);
    
            // Save labour record if applicable
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
                transaction.set(doc(collection(firestore, 'labours'), newLabourRecord.id), newLabourRecord);
            }
    
            // Update aggregated customer record
            if (generatedBill.dueAmount > 0) {
                const newTotalDue = customerDue + generatedBill.dueAmount;
                const customerData: Customer = {
                    id: generatedBill.customerName.toLowerCase(),
                    name: generatedBill.customerName,
                    contactNumber: generatedBill.contactNumber || '',
                    totalDueAmount: newTotalDue,
                    lastActivity: generatedBill.createdAt,
                };
                 transaction.set(customerRef, customerData, { merge: true });
            }
        });
        
        toast({
            title: 'Bill Saved!',
            description: `The bill for ${generatedBill.customerName} has been saved.`,
        });
        
        form.reset(defaultFormValues);
        setGeneratedBill(null); // Close the dialog and reset state
        return Promise.resolve();

    } catch (error) {
        console.error("Error saving bill and associated data: ", error);
        toast({
            variant: 'destructive',
            title: 'Save Failed',
            description: 'An error occurred while saving the bill.',
        });
        return Promise.reject(error);
    }
};

  const handleBillDialogClose = (open: boolean) => {
    if (!open) {
        setGeneratedBill(null);
    }
  }

  const capitalizeFirstLetter = (string: string) => {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
  };
  
  const handleCustomerNameBlur = async () => {
    await trigger('customerName');
    const currentValue = getValues('customerName');
    setValue('customerName', capitalizeFirstLetter(currentValue), { shouldValidate: true });
  };


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
            ...(data.address && { address: data.address }),
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
            createdAt: (data.createdAt || new Date()).toISOString(),
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
  
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>, date: Date | undefined) => {
    const { value } = e.target;
    if (value && date) {
      const [hours, minutes] = value.split(':');
      const newDate = setHours(setMinutes(date, parseInt(minutes)), parseInt(hours));
      setValue('createdAt', newDate, { shouldValidate: true });
    }
  };

  const handleShowTokenDialog = async () => {
    setIsSavingToken(true);
    const data = getValues();

    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'User not logged in or DB not ready.'});
      setIsSavingToken(false);
      return;
    }

    if (!data.customerName) {
      form.setError('customerName', { type: 'manual', message: 'Customer name is required for a token.'});
      setIsSavingToken(false);
      return;
    }
    
    const newToken: Token = {
      id: uuidv4(),
      managerId: user.uid,
      customerName: data.customerName,
      roomNumber: data.roomNumber,
      contactNumber: data.contactNumber,
      address: data.address,
      inCarat: data.inCarat,
      createdAt: new Date().toISOString(),
    };

    try {
      // Save to global and manager-specific collections
      const tokenCollectionRef = collection(firestore, 'tokens');
      const managerTokenCollectionRef = collection(firestore, 'managers', user.uid, 'tokens');

      setDocumentNonBlocking(doc(tokenCollectionRef, newToken.id), newToken, { merge: true });
      setDocumentNonBlocking(doc(managerTokenCollectionRef, newToken.id), newToken, { merge: true });
      
      setGeneratedToken(newToken);
      
      toast({
        title: 'Token Saved',
        description: `Token for ${data.customerName} has been saved.`,
      });

    } catch (error) {
       toast({
        variant: 'destructive',
        title: 'Failed to Save Token',
        description: 'An error occurred while saving the token.',
      });
    } finally {
      setIsSavingToken(false);
    }
  };
  
  const handleTokenDialogClose = (open: boolean) => {
      if (!open) {
          setGeneratedToken(null);
      }
  }
  
  const handlePrintAndCloseTokenDialog = () => {
    window.print();
    setGeneratedToken(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const formElements = formRef.current?.elements;
      if (!formElements) return;

      const focusableElements = Array.from(formElements).filter(
        (el): el is HTMLElement => 
          el instanceof HTMLInputElement || 
          el instanceof HTMLButtonElement && el.getAttribute('role') === 'combobox'
      ).filter(el => !el.hasAttribute('disabled'));


      const currentElement = e.target as HTMLElement;
      let currentIndex = focusableElements.indexOf(currentElement);
      
      if (currentIndex > -1 && currentIndex < focusableElements.length - 1) {
        const nextElement = focusableElements[currentIndex + 1];
        if (nextElement) {
          nextElement.focus();
        }
      }
    }
  };

  return (
    <>
      <Form {...form}>
        <form ref={formRef} onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                                    <Input placeholder="Enter customer's name" {...field} onBlur={handleCustomerNameBlur} onKeyDown={handleKeyDown}/>
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
                                        <Input type="tel" placeholder="e.g., 9876543210" className="pl-10" {...field} value={field.value ?? ''} onKeyDown={handleKeyDown} />
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
                                    <Input placeholder="e.g., 09" {...field} value={field.value ?? ''} onKeyDown={handleKeyDown} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Address</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input placeholder="Enter customer's address" className="pl-10" {...field} value={field.value ?? ''} onKeyDown={handleKeyDown} />
                                    </div>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="inCarat"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>In Carat</FormLabel>
                                    <FormControl>
                                    <Input type="number" placeholder='' {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} onKeyDown={handleKeyDown}/>
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
                                    <Input type="number" placeholder='' {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} onKeyDown={handleKeyDown}/>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                          control={form.control}
                          name="createdAt"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Bill Date & Time</FormLabel>
                              <div className='flex flex-col sm:flex-row gap-2'>
                                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant={"outline"}
                                        className={cn(
                                          "w-full text-left font-normal",
                                          !field.value && "text-muted-foreground"
                                        )}
                                      >
                                        {field.value ? (
                                          format(field.value, "PP")
                                        ) : (
                                          <span>Pick a date</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={field.value}
                                      onSelect={(date) => {
                                        field.onChange(date);
                                        setIsCalendarOpen(false);
                                      }}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                                <FormControl>
                                    <Input 
                                        type="time" 
                                        className='w-full sm:w-auto flex-grow sm:flex-grow-0 sm:w-[120px]'
                                        value={field.value ? format(field.value, 'HH:mm') : ''}
                                        onChange={(e) => handleTimeChange(e, field.value)}
                                    />
                                </FormControl>
                              </div>
                               <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                    </CardContent>
                     <CardFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleShowTokenDialog}
                            disabled={isSavingToken || (!watchedValues.customerName && !watchedValues.inCarat)}
                        >
                            {isSavingToken ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                            Print Token
                        </Button>
                    </CardFooter>
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
                                    <Input type="number" placeholder="e.g., 10" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} onKeyDown={handleKeyDown}/>
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
                                    <Input type="number" placeholder="e.g., 17" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} onKeyDown={handleKeyDown}/>
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
                                    <Input type="number" placeholder="e.g., 5" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} onKeyDown={handleKeyDown}/>
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
                                    <Input type="number" placeholder="e.g., 20" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} onKeyDown={handleKeyDown}/>
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
                                        <Input type="number" placeholder="In Qty" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} onKeyDown={handleKeyDown}/>
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
                                        <Input type="number" step="0.1" placeholder="e.g., 1.5" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} onKeyDown={handleKeyDown}/>
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
                                        <Input type="number" placeholder="Out Qty" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} onKeyDown={handleKeyDown}/>
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
                                        <Input type="number" step="0.1" placeholder="e.g., 1.5" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} onKeyDown={handleKeyDown}/>
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
                                <Input type="number" placeholder="Enter paid amount" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} disabled={paymentMode === 'Due'} onKeyDown={handleKeyDown}/>
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
                                    <SelectTrigger onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault();}}>
                                        <SelectValue placeholder="Select a person" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    <SelectItem value="Gopal Temkar">Gopal Temkar</SelectItem>
                                    <SelectItem value="Yuvaraj Temkar">Yuvaraj Temkar</SelectItem>
                                    <SelectItem value="Suyash Temkar">Suyash Temkar</SelectItem>
                                    <SelectItem value="Gajananad Murtankar">Gajananad Murtankar</SelectItem>
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
                                    className="flex flex-col sm:flex-row flex-wrap items-center gap-x-4 gap-y-2"
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

            {/* Summary Card */}
            <div className="lg:col-span-1">
                <Card className="lg:sticky lg:top-24">
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

          </div>
        </form>
      </Form>
      {generatedBill && (
        <BillSummaryDialog
          bill={generatedBill}
          open={!!generatedBill}
          onOpenChange={handleBillDialogClose}
          onSave={handleSaveBill}
          isSaving={isSubmitting} 
          isViewing={false}
        />
      )}
      {generatedToken && (
          <TokenSummaryDialog 
            token={generatedToken}
            open={!!generatedToken}
            onOpenChange={handleTokenDialogClose}
            onPrint={handlePrintAndCloseTokenDialog}
          />
      )}
    </>
  );
}

    

    