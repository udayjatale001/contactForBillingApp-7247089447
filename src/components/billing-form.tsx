'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as React from 'react';
import { Gem, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { BillingFormValues, billingSchema } from '@/lib/types';
import { createBill } from '@/app/actions/billing';
import { useToast } from '@/hooks/use-toast';
import { BillSummaryDialog } from './bill-summary-dialog';

type BillResult = Awaited<ReturnType<typeof createBill>>;

export function BillingForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [billResult, setBillResult] = React.useState<BillResult | null>(null);

  const form = useForm<BillingFormValues>({
    resolver: zodResolver(billingSchema),
    defaultValues: {
      caratType: 'Small Carat',
      paymentMode: 'Cash',
      paidTo: 'Gopal Dada',
    },
  });

  const { watch } = form;
  const inCarat = watch('inCarat', 0);
  const outCarat = watch('outCarat', 0);
  const caratType = watch('caratType');
  const paidAmount = watch('paidAmount', 0);

  const totalCarat = React.useMemo(() => {
    const total = Number(inCarat) - Number(outCarat);
    return total > 0 ? total : 0;
  }, [inCarat, outCarat]);

  const rate = React.useMemo(() => (caratType === 'Big Carat' ? 20 : 17), [caratType]);

  const totalAmount = React.useMemo(() => totalCarat * rate, [totalCarat, rate]);

  const dueAmount = React.useMemo(() => {
    const due = totalAmount - Number(paidAmount);
    return due > 0 ? due : 0;
  }, [totalAmount, paidAmount]);

  async function onSubmit(data: BillingFormValues) {
    setIsSubmitting(true);
    try {
        const fullBillDetails = {
            ...data,
            totalCarat,
            rate,
            totalAmount,
            dueAmount,
            createdAt: new Date(),
        };

      const result = await createBill(fullBillDetails);
      if (result.success) {
        setBillResult(result);
        toast({
          title: 'Bill Generated Successfully!',
          description: `Bill for ${data.customerName} has been created.`,
        });
        form.reset();
      } else {
        throw new Error(result.error || 'Failed to create bill.');
      }
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Billing Details</CardTitle>
                <CardDescription>Enter the details for the new bill.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <FormField
                    control={form.control}
                    name="inCarat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>In Carat</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 500" {...field} />
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
                          <Input type="number" placeholder="e.g., 100" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="caratType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Carat Type</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex items-center space-x-4"
                        >
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Small Carat" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Small Carat (Rate: ₹17)
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Big Carat" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Big Carat (Rate: ₹20)
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="paidAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Paid Amount</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 5000" {...field} />
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
                </div>

                 <FormField
                  control={form.control}
                  name="paymentMode"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Payment Mode</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex items-center space-x-4"
                        >
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="PhonePe" />
                            </FormControl>
                            <FormLabel className="font-normal">PhonePe</FormLabel>
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

            <Card className="lg:col-span-1 h-fit sticky top-24">
               <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gem className="text-primary"/>
                  Calculation Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-base">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Carat:</span>
                  <span className="font-bold">{totalCarat.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rate:</span>
                  <span className="font-bold">₹{rate.toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span className="text-muted-foreground">Total Amount:</span>
                  <span>₹{totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid Amount:</span>
                  <span>₹{Number(paidAmount).toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-xl text-primary">
                  <span className="text-muted-foreground">Due Amount:</span>
                  <span>₹{dueAmount.toLocaleString()}</span>
                </div>
              </CardContent>
              <Button type="submit" className="w-full h-12 rounded-t-none text-lg" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin" /> : 'Generate Bill'}
              </Button>
            </Card>
          </div>
        </form>
      </Form>
      {billResult && (
        <BillSummaryDialog
          result={billResult}
          open={!!billResult}
          onOpenChange={() => setBillResult(null)}
        />
      )}
    </>
  );
}
