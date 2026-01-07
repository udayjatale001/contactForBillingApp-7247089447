
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
import { Loader2, MessageSquare } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { useDateFilter } from '@/context/date-filter-context';

const PERMANENT_WHATSAPP_NUMBER = '7247089447';

export function DailySummaryWhatsAppDialog() {
  const firestore = useFirestore();
  const { globalDate } = useDateFilter();
  
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);

  const reportDate = globalDate || new Date();

  const billsQuery = useMemoFirebase(() => {
    if (!firestore || !isOpen) return null; // Only query when the dialog is open
    
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

  const handleSend = () => {
    if (isLoading) return;

    setIsSending(true);
    
    const message = `
*Daily Summary: ${format(reportDate, 'PPP')}*

- *Total Carat Received:* ${summary.received.toLocaleString()}
- *Total Carat Issued:* ${summary.issued.toLocaleString()}
- *Total Amount Received:* ${summary.amountReceived.toLocaleString()}rs
- *Total Amount Pending:* ${summary.amountPending.toLocaleString()}rs
    `.trim().replace(/^\s+/gm, '');

    const whatsappUrl = `https://wa.me/91${PERMANENT_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
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
              A summary for the selected date will be sent to a pre-configured WhatsApp number.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
                <h4 className="font-semibold mb-2">Summary for {format(reportDate, 'PP')}</h4>
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
              disabled={isSending || isLoading}
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
