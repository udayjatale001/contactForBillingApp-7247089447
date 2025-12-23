'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { createBill } from '@/app/actions/billing';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Logo } from './icons/logo';

type BillResult = Awaited<ReturnType<typeof createBill>>;

interface BillSummaryDialogProps {
  result: BillResult;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

export function BillSummaryDialog({ result, open, onOpenChange, onSave }: BillSummaryDialogProps) {
  if (!result || !result.success) {
    return null;
  }
  
  const { billDetails } = result;

  const DetailItem = ({ label, value, className }: { label: string, value: React.ReactNode, className?: string}) => (
    <div className={`flex justify-between items-baseline ${className}`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-right">{value}</p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <div className="p-6" id="bill-receipt">
            <DialogHeader className="mb-6">
                <div className='flex justify-center items-center flex-col gap-2'>
                    <Logo />
                    <h2 className="text-xl font-bold font-headline">Anand Sagar Fresh Fruits</h2>
                </div>
            </DialogHeader>
            <div className="space-y-4">
                <div className="space-y-2 p-4 border rounded-lg bg-secondary/20">
                    <DetailItem label="Customer Name" value={billDetails.customerName} />
                    <Separator />
                    <DetailItem label="In Carat" value={billDetails.inCarat} />
                    <DetailItem label="Out Carat" value={billDetails.outCarat} />
                    {billDetails.smallCarat && billDetails.smallCarat > 0 && <DetailItem label="Small Carat" value={billDetails.smallCarat} />}
                    {billDetails.bigCarat && billDetails.bigCarat > 0 && <DetailItem label="Big Carat" value={billDetails.bigCarat} />}
                    <Separator className="my-2"/>
                    <DetailItem label="Total Amount" value={`${billDetails.totalAmount.toLocaleString()}rs`} className="font-bold text-base"/>
                    <DetailItem label="Paid Amount" value={`${billDetails.paidAmount.toLocaleString()}rs`} />
                    <DetailItem label="Due Amount" value={<Badge variant={billDetails.dueAmount > 0 ? "destructive" : "default"}>{billDetails.dueAmount.toLocaleString()}rs</Badge>} />
                    <Separator className="my-2"/>
                    <DetailItem label="Paid To" value={billDetails.paidTo} />
                    <DetailItem label="Date" value={new Date(billDetails.createdAt).toLocaleDateString()} />
                </div>
                <div className='text-center text-sm text-muted-foreground'>
                    Payment Method: {billDetails.paymentMode}
                </div>
            </div>
        </div>

        <DialogFooter className="px-6 pb-6">
          <Button variant="outline" onClick={onSave}>Save</Button>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
