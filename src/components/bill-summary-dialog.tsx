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

type BillResult = Awaited<ReturnType<typeof createBill>>;

interface BillSummaryDialogProps {
  result: BillResult;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BillSummaryDialog({ result, open, onOpenChange }: BillSummaryDialogProps) {
  if (!result || !result.success) {
    return null;
  }
  
  const { billDetails } = result;

  const DetailItem = ({ label, value, className }: { label: string, value: React.ReactNode, className?: string}) => (
    <div className={`flex justify-between items-center ${className}`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bill Generated Successfully</DialogTitle>
          <DialogDescription>
            A summary of the generated bill.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
            
            <div className="space-y-2 p-4 border rounded-lg">
                <h3 className="font-semibold">Bill for {billDetails.customerName}</h3>
                <Separator />
                <DetailItem label="Total Carat" value={`${billDetails.totalCarat} (${billDetails.caratType})`} />
                <DetailItem label="Rate" value={`₹${billDetails.rate}`} />
                <DetailItem label="Total Amount" value={`₹${billDetails.totalAmount.toLocaleString()}`} className="font-bold text-base"/>
                <DetailItem label="Paid Amount" value={`₹${billDetails.paidAmount.toLocaleString()}`} />
                <DetailItem label="Due Amount" value={<Badge variant={billDetails.dueAmount > 0 ? "destructive" : "default"}>₹{billDetails.dueAmount.toLocaleString()}</Badge>} />
                <Separator />
                <DetailItem label="Paid To" value={billDetails.paidTo} />
                <DetailItem label="Payment Mode" value={billDetails.paymentMode} />
                <DetailItem label="Date &amp; Time" value={new Date(billDetails.createdAt).toLocaleString()} />
            </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
