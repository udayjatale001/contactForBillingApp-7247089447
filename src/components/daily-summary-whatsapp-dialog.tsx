
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
import type { Bill } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Loader2, MessageSquare, Save, Pencil } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { useDateFilter } from '@/context/date-filter-context';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from '@/hooks/use-toast';

const WHATSAPP_NUMBER_STORAGE_KEY = 'daily-report-whatsapp-number';

export function DailySummaryWhatsAppDialog() {
  const firestore = useFirestore();
  const { globalDate } = useDateFilter();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);
  const [whatsAppNumber, setWhatsAppNumber] = React.useState('');
  const [isEditingNumber, setIsEditingNumber] = React.useState(false);
  const [tempNumber, setTempNumber] = React.useState('');

  const reportDate = globalDate || new Date();

  React.useEffect(() => {
    if (isOpen) {
      const savedNumber = localStorage.getItem(WHATSAPP_NUMBER_STORAGE_KEY);
      if (savedNumber) {
        setWhatsAppNumber(savedNumber);
        setTempNumber(savedNumber);
        setIsEditingNumber(false);
      } else {
        setIsEditingNumber(true);
      }
    }
  }, [isOpen]);

  const billsQuery = useMemoFirebase(() => {
    if (!firestore || !isOpen) return null;

    const startDate = startOfDay(reportDate);
    const endDate = endOfDay(reportDate);

    return query(
      collection(firestore, 'bills'),
      where('createdAt', '>=', startDate.toISOString()),
      where('createdAt', '<=', endDate.toISOString()),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, reportDate, isOpen]);

  const { data: billsForDate, isLoading } = useCollection<Bill>(billsQuery);

  const summary = React.useMemo(() => {
    if (!billsForDate) {
      return { received: 0, issued: 0, amountReceived: 0, amountPending: 0 };
    }
    return billsForDate.reduce(
      (acc, bill) => {
        acc.received += bill.inCarat || 0;
        acc.issued += bill.outCarat || 0;
        acc.amountReceived += bill.paidAmount || 0;
        acc.amountPending += bill.dueAmount || 0;
        return acc;
      },
      { received: 0, issued: 0, amountReceived: 0, amountPending: 0 }
    );
  }, [billsForDate]);

  const handleSaveNumber = () => {
    if (tempNumber.length >= 10 && /^\d+$/.test(tempNumber)) {
      localStorage.setItem(WHATSAPP_NUMBER_STORAGE_KEY, tempNumber);
      setWhatsAppNumber(tempNumber);
      setIsEditingNumber(false);
      toast({ title: 'Number Saved Successfully!' });
    } else {
      toast({
        variant: 'destructive',
        title: 'Invalid Number',
        description: 'Please enter a valid WhatsApp number.',
      });
    }
  };

  const handleSend = () => {
    if (isLoading || !whatsAppNumber) {
      toast({
        variant: 'destructive',
        title: 'Cannot Send Report',
        description: 'A valid WhatsApp number is required.',
      });
      return;
    }

    setIsSending(true);

    const message = `*Daily Summary: ${format(reportDate, 'PPP')}*

- *Total Carat Received:* ${summary.received.toLocaleString()}
- *Total Carat Issued:* ${summary.issued.toLocaleString()}
- *Total Amount Received:* ${summary.amountReceived.toLocaleString()}rs
- *Total Amount Pending:* ${summary.amountPending.toLocaleString()}rs`
      .trim()
      .replace(/^\s+/gm, '');

    const whatsappUrl = `https://wa.me/91${whatsAppNumber}?text=${encodeURIComponent(
      message
    )}`;
    window.open(whatsappUrl, '_blank');

    setIsSending(false);
    setIsOpen(false);
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline">
        <MessageSquare className="mr-2 h-4 w-4" />
        Send Daily Report
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Daily Report</DialogTitle>
            <DialogDescription>
              A summary for the selected date will be sent to the entered
              WhatsApp number.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="whatsapp-number">WhatsApp Number</Label>
              <div className="flex gap-2">
                <Input
                  id="whatsapp-number"
                  value={tempNumber}
                  onChange={(e) => setTempNumber(e.target.value)}
                  disabled={!isEditingNumber}
                  placeholder="Enter 10-digit number"
                />
                {isEditingNumber ? (
                  <Button onClick={handleSaveNumber} size="icon">
                    <Save className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => setIsEditingNumber(true)}
                    variant="outline"
                    size="icon"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
              <h4 className="font-semibold mb-2">
                Summary for {format(reportDate, 'PP')}
              </h4>
              {isLoading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <div className="flex justify-between">
                    <span>Carat Received:</span>{' '}
                    <span>{summary.received.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Carat Issued:</span>{' '}
                    <span>{summary.issued.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Amount Received:</span>{' '}
                    <span>{summary.amountReceived.toLocaleString()}rs</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Amount Pending:</span>{' '}
                    <span>{summary.amountPending.toLocaleString()}rs</span>
                  </div>
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
              disabled={isSending || isLoading || !whatsAppNumber}
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
