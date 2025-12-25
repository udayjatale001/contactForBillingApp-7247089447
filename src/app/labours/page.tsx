
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wrench } from 'lucide-react';

function LabourCalculator() {
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

  return (
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
      <LabourCalculator />
    </div>
  );
}
