
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Wrench, DollarSign, User } from 'lucide-react';
import { cn } from '@/lib/utils';

function LabourCalculator() {
  const [customerName, setCustomerName] = React.useState('');
  const [inCaratQty, setInCaratQty] = React.useState<number | string>('');
  const [inCaratRate, setInCaratRate] = React.useState<number | string>('');
  const [outCaratQty, setOutCaratQty] = React.useState<number | string>('');
  const [outCaratRate, setOutCaratRate] = React.useState<number | string>('');

  const handleNumberChange = (setter: React.Dispatch<React.SetStateAction<number | string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setter(value);
    }
  };

  const inCaratTotal = React.useMemo(() => {
    const qty = parseFloat(inCaratQty as string);
    const rate = parseFloat(inCaratRate as string);
    return isNaN(qty) || isNaN(rate) ? 0 : qty * rate;
  }, [inCaratQty, inCaratRate]);

  const outCaratTotal = React.useMemo(() => {
    const qty = parseFloat(outCaratQty as string);
    const rate = parseFloat(outCaratRate as string);
    return isNaN(qty) || isNaN(rate) ? 0 : qty * rate;
  }, [outCaratQty, outCaratRate]);
  
  const grandTotal = React.useMemo(() => inCaratTotal + outCaratTotal, [inCaratTotal, outCaratTotal]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      <div className="lg:col-span-2 space-y-6">
        <Card>
            <CardHeader>
                <CardTitle className='flex items-center gap-2'><User />Customer Details</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    <Label htmlFor="customerName">Customer Name</Label>
                    <Input id="customerName" placeholder="Enter customer's name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                </div>
            </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench /> Labour Cost Calculator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg">
                <div className="space-y-2">
                    <Label htmlFor="inCaratQty">In Carat Quantity</Label>
                    <Input id="inCaratQty" type="number" placeholder="e.g., 100" value={inCaratQty} onChange={handleNumberChange(setInCaratQty)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="inCaratRate">In Carat Rate (rs)</Label>
                    <Input id="inCaratRate" type="number" placeholder="e.g., 1.5" value={inCaratRate} onChange={handleNumberChange(setInCaratRate)} />
                </div>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg">
                <div className="space-y-2">
                    <Label htmlFor="outCaratQty">Out Carat Quantity</Label>
                    <Input id="outCaratQty" type="number" placeholder="e.g., 50" value={outCaratQty} onChange={handleNumberChange(setOutCaratQty)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="outCaratRate">Out Carat Rate (rs)</Label>
                    <Input id="outCaratRate" type="number" placeholder="e.g., 1.5" value={outCaratRate} onChange={handleNumberChange(setOutCaratRate)} />
                </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="lg:col-span-1 h-fit sticky top-24">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="text-primary"/>
            Calculation Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-base">
           {customerName && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer:</span>
                <span className='font-semibold'>{customerName}</span>
              </div>
              <Separator />
            </>
           )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">In Carat Total:</span>
            <span>{inCaratTotal.toLocaleString()}rs</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Out Carat Total:</span>
            <span>{outCaratTotal.toLocaleString()}rs</span>
          </div>
          <Separator />
          <div className={cn("flex justify-between font-bold text-xl text-primary")}>
            <span className="text-muted-foreground">Grand Total:</span>
            <span>{grandTotal.toLocaleString()}rs</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


export default function LaboursPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
          <Wrench /> Labours
        </h2>
      </div>
      <p className="text-muted-foreground pb-4">Use the calculator below to quickly estimate labour costs.</p>
      <LabourCalculator />
    </div>
  );
}
