'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Logo } from './icons/logo';
import type { Bill } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import * as React from 'react';


interface BillSummaryDialogProps {
  bill: Bill;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => Promise<void>;
}

export function BillSummaryDialog({ bill, open, onOpenChange, onSave }: BillSummaryDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);

  if (!bill) {
    return null;
  }
  
  const handleSaveClick = async () => {
    setIsSaving(true);
    await onSave();
    setIsSaving(false);
  }

  const DetailItem = ({ label, value, className }: { label: string, value: React.ReactNode, className?: string}) => (
    <div className={`flex justify-between items-baseline ${className}`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-right">{value}</p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0">
        <div className="p-6" id="bill-receipt">
            <DialogHeader className="mb-6">
                <div className='flex justify-center items-center flex-col gap-2'>
                    <Logo />
                    <h2 className="text-xl font-bold font-headline">Anand Sagar Fresh Fruits</h2>
                </div>
            </DialogHeader>
            <div className="space-y-4">
                <div className="space-y-2 p-4 border rounded-lg bg-secondary/20">
                    <DetailItem label="Customer Name" value={bill.customerName} />
                    <Separator />
                    <DetailItem label="In Carat" value={bill.inCarat} />
                    <DetailItem label="Out Carat" value={bill.outCarat} />
                    {bill.smallCarat && bill.smallCarat > 0 && <DetailItem label="Small Carat" value={bill.smallCarat} />}
                    {bill.bigCarat && bill.bigCarat > 0 && <DetailItem label="Big Carat" value={bill.bigCarat} />}
                    <Separator className="my-2"/>
                    <DetailItem label="Total Amount" value={`${bill.totalAmount.toLocaleString()}rs`} className="font-bold text-base"/>
                    <DetailItem label="Paid Amount" value={`${bill.paidAmount.toLocaleString()}rs`} />
                    <DetailItem label="Due Amount" value={<Badge variant={bill.dueAmount > 0 ? "destructive" : "default"}>{bill.dueAmount.toLocaleString()}rs</Badge>} />
                    <Separator className="my-2"/>
                    <DetailItem label="Paid To" value={bill.paidTo} />
                    <DetailItem label="Date" value={new Date(bill.createdAt).toLocaleDateString()} />
                </div>
                <div className='text-center text-sm text-muted-foreground'>
                    Payment Method: {bill.paymentMode}
                </div>
            </div>
        </div>

        <DialogFooter className="px-6 pb-6 sm:justify-between bg-secondary/20 pt-4">
          <Button variant="default" onClick={handleSaveClick} className='flex-1' disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} className='flex-1' disabled={isSaving}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
