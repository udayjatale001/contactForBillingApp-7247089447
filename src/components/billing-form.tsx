'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as React from 'react';
import { Gem, Loader2, User, ChevronsUpDown, Banknote } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

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
import { BillingFormValues, billingSchema, Bill } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { BillSummaryDialog } from './bill-summary-dialog';
import { cn } from '@/lib/utils';
import { useAppContext } from './root-state-provider';


export function BillingForm() {
  const { toast } = useToast();
  const { addBill } = useAppContext();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [generatedBill, setGeneratedBill] = React.useState<Bill | null>(null);

  const defaultFormValues = {
      customerName: '',
      inCarat: undefined,
      outCarat: undefined,
      smallCarat: undefined,
      bigCarat: undefined,
      paidAmount: undefined,
      paymentMode: 'Cash',
      paidTo: 'Gopal Dada',
  };

  const form = useForm<BillingFormValues>({
    resolver: zodResolver(billingSchema),
    defaultValues: defaultFormValues,
  });

  const { watch, trigger, formState: { errors } } = form;
  const smallCarat = watch('smallCarat');
  const bigCarat = watch('bigCarat');
  const paidAmount = watch('paidAmount');

  const totalAmount = React.useMemo(() => {
    const smallCaratAmount = (Number(smallCarat) || 0) * 17;
    const bigCaratAmount = (Number(bigCarat) || 0) * 20;
    return smallCaratAmount + bigCaratAmount;
  }, [smallCarat, bigCarat]);

  const dueAmount = React.useMemo(() => {
    const due = totalAmount - (Number(paidAmount) || 0);
    return due;
  }, [totalAmount, paidAmount]);

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

  const handleSaveBill = () => {
    if (generatedBill) {
      addBill(generatedBill);
      toast({
        title: 'Bill Saved!',
        description: 'The bill has been successfully added to the history.',
      });
      handleCloseDialog();
    }
  };

  const handleCloseDialog = () => {
    setGeneratedBill(null);
    form.reset(defaultFormValues);
  }

  async function onSubmit(data: BillingFormValues) {
    setIsSubmitting(true);
    const isValid = await trigger();
    if (!isValid || (paidAmount && totalAmount > 0 && paidAmount > totalAmount)) {
        setIsSubmitting(false);
        toast({
            variant: 'destructive',
            title: 'Validation Error',
            description: 'Please correct the errors before submitting.',
        });
        return;
    }

    try {
        const fullBillDetails: Bill = {
            id: uuidv4(),
            ...data,
            inCarat: data.inCarat || 0,
            outCarat: data.outCarat || 0,
            totalCarat: (data.smallCarat || 0) + (data.bigCarat || 0),
            totalAmount,
            dueAmount: dueAmount < 0 ? 0 : dueAmount,
            createdAt: new Date(),
            caratType: data.smallCarat ? 'Small Carat' : 'Big Carat',
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
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FormField
                            control={form.control}
                            name="customerName"
                            render={({ field }) => (
                                <FormItem className="md:col-span-3">
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
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="smallCarat"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Small Carat (Rate: 17rs)</FormLabel>
                                    <FormControl>
                                    <Input type="number" placeholder="e.g., 10" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="bigCarat"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Big Carat (Rate: 20rs)</FormLabel>
                                    <FormControl>
                                    <Input type="number" placeholder="e.g., 5" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
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
                                <Input type="number" placeholder="Enter paid amount" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}/>
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
                                    <SelectItem value="Gopal Dada">Gopal Dada</SelectItem>
                                    <SelectItem value="Yuvraj Dada">Yuvraj Dada</SelectItem>
                                    <SelectItem value="Suyash Dada">Suyash Dada</SelectItem>
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
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
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
                <div className="flex justify-between font-bold text-lg">
                  <span className="text-muted-foreground">Total Amount:</span>
                  <span>{totalAmount.toLocaleString()}rs</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid Amount:</span>
                  <span>{(Number(paidAmount) || 0).toLocaleString()}rs</span>
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
              <Button type="submit" className="w-full h-12 rounded-t-none text-lg" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin" /> : 'Generate Bill'}
              </Button>
            </Card>
          </div>
        </form>
      </Form>
      {generatedBill && (
        <BillSummaryDialog
          bill={generatedBill}
          open={!!generatedBill}
          onOpenChange={handleCloseDialog}
          onSave={handleSaveBill}
        />
      )}
    </>
  );
}
