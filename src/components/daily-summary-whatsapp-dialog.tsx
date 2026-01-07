
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
import { useToast } from '@/hooks/use-toast';
import type { Bill } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Loader2, MessageSquare, Pencil } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';

const WHATSAPP_NUMBER_KEY = 'daily-summary-whatsapp-number';

export function DailySummaryWhatsAppDialog() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isOpen, setIsOpen] = React.useState(false);
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [isEditingNumber, setIsEditingNumber] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);

  React.useEffect(() => {
    const savedNumber = localStorage.getItem(WHATSAPP_NUMBER_KEY);
    if (savedNumber) {
      setPhoneNumber(savedNumber);
    } else {
      setIsEditingNumber(true); // Force edit if no number is saved
    }
  }, []);

  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const billsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'bills'),
      where('createdAt', '>=', todayStart.toISOString()),
      where('createdAt', '<=', todayEnd.toISOString()),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, todayStart, todayEnd]);

  const { data: todaysBills, isLoading } = useCollection<Bill>(billsQuery);

  const summary = React.useMemo(() => {
    if (!todaysBills) {
      return { received: 0, issued: 0, amountReceived: 0, amountPending: 0 };
    }
    return todaysBills.reduce(
      (acc, bill) => {
        acc.received += bill.inCarat || 0;
        acc.issued += bill.outCarat || 0;
        acc.amountReceived += bill.paidAmount || 0;
        acc.amountPending += bill.dueAmount || 0;
        return acc;
      },
      { received: 0, issued: 0, amountReceived: 0, amountPending: 0 }
    );
  }, [todaysBills]);

  const handleSaveNumber = () => {
    if (phoneNumber.trim().length === 10) {
      localStorage.setItem(WHATSAPP_NUMBER_KEY, phoneNumber.trim());
      setIsEditingNumber(false);
      toast({ title: 'Number Saved Successfully!' });
    } else {
      toast({
        variant: 'destructive',
        title: 'Invalid Number',
        description: 'Please enter a valid 10-digit mobile number.',
      });
    }
  };

  const handleSend = () => {
    if (!phoneNumber || isLoading) return;

    setIsSending(true);
    
    const message = `
*Daily Summary: ${format(new Date(), 'PPP')}*

- *Total Carat Received:* ${summary.received.toLocaleString()}
- *Total Carat Issued:* ${summary.issued.toLocaleString()}
- *Total Amount Received:* ${summary.amountReceived.toLocaleString()}rs
- *Total Amount Pending:* ${summary.amountPending.toLocaleString()}rs
    `.trim();

    const whatsappUrl = `https://wa.me/91${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    
    setIsSending(false);
    setIsOpen(false);
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline">
        <MessageSquare className="mr-2 h-4 w-4" />
        Send Daily Summary
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Daily Report</DialogTitle>
            <DialogDescription>
              Enter the WhatsApp number to receive the daily summary.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="whatsapp-number">WhatsApp Number</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="whatsapp-number"
                  type="tel"
                  placeholder="10-digit number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={!isEditingNumber}
                />
                {!isEditingNumber ? (
                  <Button variant="outline" size="icon" onClick={() => setIsEditingNumber(true)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                ) : (
                   <Button onClick={handleSaveNumber}>Save</Button>
                )}
              </div>
            </div>
            
            <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
                <h4 className="font-semibold mb-2">Today's Summary ({format(new Date(), 'PP')})</h4>
                {isLoading ? <Loader2 className="animate-spin" /> : (
                    <>
                        <div className="flex justify-between"><span>Carat Received:</span> <span>{summary.received.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span>Carat Issued:</span> <span>{summary.issued.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span>Amount Received:</span> <span>{summary.amountReceived.toLocaleString()}rs</span></div>
                        <div className="flex justify-between"><span>Amount Pending:</span> <span>{summary.amountPending.toLocaleString()}rs</span></div>
                    </>
                )}
            </div>

          </div>
          <DialogFooter className="sm:justify-end">
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={handleSend}
              disabled={isSending || isLoading || isEditingNumber || !phoneNumber}
            >
              {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
