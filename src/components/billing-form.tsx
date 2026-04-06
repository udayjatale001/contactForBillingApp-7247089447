
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as React from 'react';
import { Gem, Loader2, User, ChevronsUpDown, Banknote, Home, Wrench, Phone, Calendar as CalendarIcon, Printer, MapPin, Save, Settings } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { collection, doc, runTransaction, getDoc } from 'firebase/firestore';
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
import { Label } from './ui/label';
import { useToken } from '@/context/token-context';
import { useLanguage } from '@/context/language-context';

export function BillingForm() {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSavingToken, setIsSavingToken] = React.useState(false);
  const [generatedBill, setGeneratedBill] = React.useState<Bill | null>(null);
  const [generatedToken, setGeneratedToken] = React.useState<Token | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const { tokenData, setTokenData } = useToken();

  // Refs for input fields
  const formRef = React.useRef<HTMLFormElement>(null);

  const settingsDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'app_settings', 'rates');
  }, [firestore]);

  const { data: appSettings, isLoading: isLoadingRates } = useDoc<AppSettings>(settingsDocRef);

  const form = useForm<BillingFormValues>({
    resolver: zodResolver(billingSchema),
    defaultValues: {
      customerName: '',
      roomNumber: '',
      contactNumber: '',
      address: '',
      createdAt: new Date(),
      inCarat: undefined,
      outCarat: undefined,
      smallCarat: undefined,
      smallCaratRate: undefined,
      bigCarat: undefined,
      bigCaratRate: undefined,
      paidAmount: undefined,
      paymentMode: 'Cash',
      paidTo: 'Gopal Temkar',
      inCaratLabour: undefined,
      inCaratLabourRate: undefined,
      outCaratLabour: undefined,
      outCaratLabourRate: undefined,
    },
    mode: 'onBlur',
  });
  
  const { setValue } = form;
  
  React.useEffect(() => {
    if (tokenData) {
      setValue('customerName', tokenData.customerName || '');
      setValue('contactNumber', tokenData.contactNumber || '');
      setValue('roomNumber', tokenData.roomNumber || '');
      setValue('address', tokenData.address || '');
      setValue('inCarat', tokenData.inCarat);
      // Clear the token data from context after using it
      setTokenData(null);
    }
  }, [tokenData, setValue, setTokenData]);

  React.useEffect(() => {
    if (appSettings) {
        setValue('smallCaratRate', appSettings.smallCaratRate ?? 17, { shouldValidate: true });
        setValue('bigCaratRate', appSettings.bigCaratRate ?? 20, { shouldValidate: true });
        setValue('inCaratLabourRate', appSettings.inCaratLabourRate ?? 1.5, { shouldValidate: true });
        setValue('outCaratLabourRate', appSettings.outCaratLabourRate ?? 1.5, { shouldValidate: true });
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
    const smallQty = Number(smallCarat) || 0;
    const bigQty = Number(bigCarat) || 0;
    return (smallQty * smallRate) + (bigQty * bigRate);
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
            const customerDoc = await transaction.get(customerRef);
            
            if (customerDoc.exists()) {
                customerDue = customerDoc.data().totalDueAmount || 0;
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
                type: 'new-bill',
                customerName: generatedBill.customerName,
                paidAmount: generatedBill.paidAmount,
                dueAmount: generatedBill.dueAmount,
                totalCarat: generatedBill.totalCarat,
                paidTo: generatedBill.paidTo,
                paymentMode: generatedBill.paymentMode
            };
            transaction.set(doc(collection(firestore, 'notifications'), newNotification.id), newNotification);
    
            // Always save a labour record
            const newLabourRecord: Labour = {
                id: uuidv4(),
                billId: generatedBill.id,
                managerId: user.uid,
                customerName: generatedBill.customerName,
                inCaratLabour: generatedBill.inCaratLabour,
                inCaratLabourRate: generatedBill.inCaratLabourRate,
                outCaratLabour: generatedBill.outCaratLabour,
                outCaratLabourRate: generatedBill.outCaratLabourRate,
                totalLabourAmount: generatedBill.totalLabourAmount || 0,
                createdAt: generatedBill.createdAt,
            };
            transaction.set(doc(collection(firestore, 'labours'), newLabourRecord.id), newLabourRecord);
    
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
        
        form.reset({
            ...getValues(),
            customerName: '',
            roomNumber: '',
            contactNumber: '',
            address: '',
            inCarat: undefined,
            outCarat: undefined,
            smallCarat: undefined,
            bigCarat: undefined,
            paidAmount: undefined,
            inCaratLabour: undefined,
            outCaratLabour: undefined,
        });

        // setGeneratedBill(null); // Keep dialog open after saving.
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

  const handleAddressBlur = async () => {
    await trigger('address');
    const currentValue = getValues('address');
    setValue('address', capitalizeFirstLetter(currentValue || ''), { shouldValidate: true });
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
                        <CardTitle className='flex items-center gap-2'><User />{t('customer_details')}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="customerName"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>{t('customer_name')}</FormLabel>
                                <FormControl>
                                    <Input placeholder={t('enter_customer_name')} {...field} onBlur={handleCustomerNameBlur} onKeyDown={handleKeyDown}/>
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
                                <FormLabel>{t('contact_number')}</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input type="tel" placeholder={t('enter_contact_number')} className="pl-10" {...field} value={field.value ?? ''} onKeyDown={handleKeyDown} />
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
                                <FormLabel>{t('room_number')}</FormLabel>
                                <FormControl>
                                    <Input placeholder={t('enter_room_number')} {...field} value={field.value ?? ''} onKeyDown={handleKeyDown} />
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
                                        <Input placeholder="Enter customer's address" className="pl-10" {...field} value={field.value ?? ''} onBlur={handleAddressBlur} onKeyDown={handleKeyDown} />
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
                                    <FormLabel>{t('in_carat')}</FormLabel>
                                    <FormControl>
                                    <Input type="number" placeholder={t('in_carat_placeholder')} {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} onKeyDown={handleKeyDown}/>
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
                                    <FormLabel>{t('out_carat')}</FormLabel>
                                    <FormControl>
                                    <Input type="number" placeholder={t('out_carat_placeholder')} {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} onKeyDown={handleKeyDown}/>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                    </CardContent>
                     <CardFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleShowTokenDialog}
                            disabled={isSavingToken || (!watchedValues.customerName && !watchedValues.inCarat)}
                        >
                            {isSavingToken ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                            {t('print_token')}
                        </Button>
                    </CardFooter>
                </Card>

                {/* Carat Details */}
                <Card>
                    <CardHeader>
                        <CardTitle className='flex items-center gap-2'><ChevronsUpDown />{t('carat_details')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                                <h3 className="font-semibold text-sm text-primary">Small Carat</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="smallCarat"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('small_carat_qty')}</FormLabel>
                                                <FormControl>
                                                <Input type="number" placeholder="Qty" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} onKeyDown={handleKeyDown}/>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="smallCaratRate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('rate')}</FormLabel>
                                                <FormControl>
                                                <Input type="number" placeholder="Rate" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} onKeyDown={handleKeyDown}/>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                            <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                                <h3 className="font-semibold text-sm text-primary">Big Carat</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="bigCarat"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('big_carat_qty')}</FormLabel>
                                                <FormControl>
                                                <Input type="number" placeholder="Qty" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} onKeyDown={handleKeyDown}/>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="bigCaratRate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('rate')}</FormLabel>
                                                <FormControl>
                                                <Input type="number" placeholder="Rate" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} onKeyDown={handleKeyDown}/>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                 {/* Labour Charges */}
                <Card>
                    <CardHeader>
                        <CardTitle className='flex items-center gap-2'><Wrench />{t('labour_charges_internal')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="inCaratLabour"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('in_carat_labour_qty')}</FormLabel>
                                            <FormControl>
                                            <Input type="number" placeholder={t('in_qty_placeholder')} {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} onKeyDown={handleKeyDown}/>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="inCaratLabourRate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('rate')}</FormLabel>
                                            <FormControl>
                                            <Input type="number" placeholder="Rate" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} onKeyDown={handleKeyDown}/>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="outCaratLabour"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('out_carat_labour_qty')}</FormLabel>
                                            <FormControl>
                                            <Input type="number" placeholder={t('out_qty_placeholder')} {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} onKeyDown={handleKeyDown}/>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="outCaratLabourRate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('rate')}</FormLabel>
                                            <FormControl>
                                            <Input type="number" placeholder="Rate" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} onKeyDown={handleKeyDown}/>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                             </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Payment Details */}
                <Card>
                    <CardHeader>
                        <CardTitle className='flex items-center gap-2'><Banknote />{t('payment_details')}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="paidAmount"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('paid_amount')}</FormLabel>
                                <FormControl>
                                <Input type="number" placeholder={t('enter_paid_amount')} {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} disabled={paymentMode === 'Due'} onKeyDown={handleKeyDown}/>
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
                                <FormLabel>{t('paid_to')}</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault();}}>
                                        <SelectValue placeholder={t('select_person')} />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    <SelectItem value="Gopal Temkar">Gopal Temkar</SelectItem>
                                    <SelectItem value="Yuvaraj Temkar">Yuvaraj Temkar</SelectItem>
                                    <SelectItem value="Suyash Temkar">Suyash Temkar</SelectItem>
                                    <SelectItem value="Gajanan Murtalkar">Gajanan Murtalkar</SelectItem>
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
                                <FormLabel>{t('payment_method')}</FormLabel>
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
                                        <FormLabel className="font-normal">{t('online payment')}</FormLabel>
                                    </FormItem>
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                        <RadioGroupItem value="Cash" />
                                        </FormControl>
                                        <FormLabel className="font-normal">{t('cash')}</FormLabel>
                                    </FormItem>
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                        <RadioGroupItem value="Due" />
                                        </FormControl>
                                        <FormLabel className="font-normal">{t('due')}</FormLabel>
                                    </FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        <div className="md:col-span-2">
                            <FormLabel>{t('due_amount')}</FormLabel>
                            <div className={cn("flex items-center justify-between rounded-md border border-input bg-muted px-3 py-2 text-sm mt-2", dueAmount > 0 ? 'text-destructive' : 'text-primary')}>
                                <span>{(dueAmount < 0 ? 0 : dueAmount).toLocaleString()}rs</span>
                            </div>
                            {dueAmount < 0 && (
                                <p className="text-sm text-green-600 font-medium mt-2">{t('change_to_return')} {(-dueAmount).toLocaleString()}rs</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Summary Card */}
            <div className="lg:col-span-1 space-y-6">
                <Card className="lg:sticky lg:top-24">
                   <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Gem className="text-primary"/>
                      {t('calculation_summary')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-base">
                     <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('carat_amount')}</span>
                      <span>{totalCaratAmount.toLocaleString()}rs</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('internal_labour')}</span>
                      <span className='text-muted-foreground'>{totalLabourAmount.toLocaleString()}rs</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span className="text-muted-foreground">{t('total_amount')}</span>
                      <span>{totalAmount.toLocaleString()}rs</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('paid_amount')}</span>
                      <span>{(paymentMode === 'Due' ? 0 : Number(paidAmount) || 0).toLocaleString()}rs</span>
                    </div>
                    <Separator />
                    <div className={cn("flex justify-between font-bold text-xl", dueAmount > 0 ? 'text-destructive' : 'text-primary')}>
                      <span className="text-muted-foreground">{t('due_amount')}</span>
                      <span>{(dueAmount < 0 ? 0 : dueAmount).toLocaleString()}rs</span>
                    </div>
                     {dueAmount < 0 && (
                         <p className="text-sm text-green-600 font-medium">{t('change_to_return')} {(-dueAmount).toLocaleString()}rs</p>
                     )}
                  </CardContent>
                  <Button type="submit" className="w-full h-12 rounded-t-none text-lg" disabled={isSubmitting || isLoadingRates}>
                    {isSubmitting || isLoadingRates ? <Loader2 className="animate-spin" /> : t('generate_bill')}
                  </Button>
                </Card>
                
                 {/* Bill Date & Time */}
                <Card>
                    <CardHeader>
                        <CardTitle className='flex items-center gap-2'><CalendarIcon />{t('bill_date_time')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <FormField
                          control={form.control}
                          name="createdAt"
                          render={({ field }) => (
                            <FormItem>
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
                                          <span>{t('pick_a_date')}</span>
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
