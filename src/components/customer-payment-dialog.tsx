
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import type { Customer } from '@/lib/types';
import { Loader2, MessageSquare, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type PaidTo = 'Gopal Temkar' | 'Yuvaraj Temkar' | 'Suyash Temkar' | 'Gajananad Murtankar';
type PaymentMode = 'Cash' | 'Online Payment';

interface CustomerPaymentDialogProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (customer: Customer | null) => void;
  onConfirmPayment: (
    customer: Customer, 
    paidAmount: number, 
    paymentMode: PaymentMode, 
    paidTo: PaidTo,
    paymentDate: Date
  ) => Promise<void>;
  onDelete: (customer: Customer) => void;
  onWhatsApp: (customer: Customer, paidAmount?: number, remainingDue?: number, date?: Date) => void;
  isProcessing: boolean;
}

export function CustomerPaymentDialog({ 
    customer, 
    open, 
    onOpenChange, 
    onConfirmPayment, 
    onDelete,
    onWhatsApp,
    isProcessing 
}: CustomerPaymentDialogProps) {
  
  const [paidAmount, setPaidAmount] = React.useState('');
  const [paymentDate, setPaymentDate] = React.useState(new Date());
  const [paymentMode, setPaymentMode] = React.useState<PaymentMode>('Cash');
  const [paidTo, setPaidTo] = React.useState<PaidTo>('Gopal Temkar');

  React.useEffect(() => {
    if (customer) {
      setPaidAmount('');
      setPaymentDate(new Date());
    }
  }, [customer]);

  if (!customer) {
    return null;
  }
  
  const handleConfirm = () => {
    const amount = Number(paidAmount);
    if (!isNaN(amount) && amount > 0 && amount <= customer.totalDueAmount) {
      onConfirmPayment(customer, amount, paymentMode, paidTo, paymentDate);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
    }
  }

  const remainingDue = customer.totalDueAmount - (Number(paidAmount) || 0);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => onOpenChange(isOpen ? customer : null)}>
      <DialogContent className="sm:max-w-md w-full p-0 flex flex-col" onKeyDown={handleKeyDown}>
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Payment for {customer.name.toUpperCase()}</DialogTitle>
          <DialogDescription>
            Settle the outstanding balance for this customer.
          </DialogDescription>
        </DialogHeader>
        
        <div className="px-6 flex-1 overflow-y-auto space-y-4">
            {/* Customer Info */}
            <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Mobile Number</span>
                    <span className="font-medium">{customer.contactNumber || 'N/A'}</span>
                </div>
                <Separator className="my-2" />
                 <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Current Due</span>
                    <span className="font-bold text-2xl text-destructive">{customer.totalDueAmount.toLocaleString()}rs</span>
                </div>
            </div>
            
            {/* Payment Fields */}
            <div className="space-y-4">
                 <div>
                    <Label htmlFor="paid-amount">Paid Amount</Label>
                    <Input 
                        id="paid-amount" 
                        type="number" 
                        placeholder='0.00'
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(e.target.value)}
                        autoFocus
                    />
                 </div>
                 <div>
                    <Label htmlFor="payment-date">Date & Time</Label>
                    <Input 
                        id="payment-date"
                        type="datetime-local"
                        value={format(paymentDate, "yyyy-MM-dd'T'HH:mm")}
                        onChange={(e) => setPaymentDate(new Date(e.target.value))}
                    />
                 </div>
                 <div>
                    <Label>Payment Method</Label>
                    <RadioGroup value={paymentMode} onValueChange={(v) => setPaymentMode(v as PaymentMode)} className="flex gap-4 mt-2">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Cash" id="cash" />
                            <Label htmlFor="cash">Cash</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Online Payment" id="online" />
                            <Label htmlFor="online">Online Payment</Label>
                        </div>
                    </RadioGroup>
                 </div>
                 <div>
                    <Label>Paid To</Label>
                    <Select value={paidTo} onValueChange={(v) => setPaidTo(v as PaidTo)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select person" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Gopal Temkar">Gopal Temkar</SelectItem>
                            <SelectItem value="Suyash Temkar">Suyash Temkar</SelectItem>
                            <SelectItem value="Yuvaraj Temkar">Yuvraj Temkar</SelectItem>
                            <SelectItem value="Gajananad Murtankar">Gajananad Murtankar</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
            </div>

             {/* Remaining Due */}
            <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Remaining Due</span>
                    <span className={cn(
                        "font-bold text-2xl",
                        remainingDue > 0 ? 'text-blue-600' : 'text-green-600'
                    )}>
                        {remainingDue.toLocaleString()}rs
                    </span>
                </div>
            </div>
        </div>

        <DialogFooter className="p-6 pt-0 mt-4 flex-col sm:flex-row gap-2">
            <div className="flex w-full gap-2">
                <Button variant="outline" size="icon" onClick={() => onDelete(customer)}>
                    <Trash2 className="h-5 w-5 text-destructive" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => onWhatsApp(customer, Number(paidAmount), remainingDue, paymentDate)} disabled={!customer.contactNumber || !paidAmount}>
                    <MessageSquare className="h-5 w-5 text-green-500" />
                </Button>
            </div>
            <div className="flex w-full gap-2">
                <DialogClose asChild>
                    <Button variant="ghost" className="flex-1">Cancel</Button>
                </DialogClose>
                <Button 
                    onClick={handleConfirm} 
                    disabled={isProcessing || !paidAmount || Number(paidAmount) <= 0 || Number(paidAmount) > customer.totalDueAmount}
                    className="flex-1"
                >
                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirm Payment
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    