
'use client';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import type { Token } from '@/lib/types';
import { Printer, X } from 'lucide-react';
import * as React from 'react';
import { format } from 'date-fns';

interface TokenSummaryDialogProps {
  token: Token;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPrint: () => void;
}

const DetailItem = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div className="flex justify-between items-center py-2">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-800">{value}</p>
    </div>
);

export function TokenSummaryDialog({ token, open, onOpenChange, onPrint }: TokenSummaryDialogProps) {

  if (!token) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm p-0 print:border-none print:shadow-none print:bg-white">
        <style>
          {`
            @media print {
              body, body > *, .print-hidden {
                visibility: hidden;
                margin: 0;
                padding: 0;
              }
              #token-receipt-container, #token-receipt-container * {
                visibility: visible;
              }
               #token-receipt-container {
                position: absolute;
                left: 0;
                top: 0;
                right: 0;
                width: 100%;
                height: auto;
                min-height: 100vh;
                display: block;
                padding: 0;
                margin: 0;
                background: white;
                overflow: visible;
              }
               #token-receipt {
                  width: 100%;
                  border: none;
                  box-shadow: none;
                  margin: 0;
                  padding: 1.5rem;
                  font-size: 14px;
               }
            }
          `}
        </style>
        <div id="token-receipt-container">
          <div className="p-6 bg-white rounded-lg border-2 border-dashed border-gray-400" id="token-receipt">
            {/* Header */}
            <header className="text-center mb-4 pb-3 border-b-2 border-dashed border-gray-300">
                <h1 className="text-xl font-bold text-gray-800">Ananad Sagar Ripening Chamber</h1>
                <p className="text-xs text-gray-500">Customer Token</p>
            </header>

            <main className="space-y-3">
              <DetailItem label="Token No" value={`#${token.id.slice(-6).toUpperCase()}`} />
              <DetailItem label="Date" value={format(new Date(token.createdAt), 'PP')} />
              <DetailItem label="Time" value={format(new Date(token.createdAt), 'p')} />
              <DetailItem label="Customer" value={token.customerName} />
              {token.roomNumber && <DetailItem label="Room No" value={token.roomNumber} />}
              {token.contactNumber && <DetailItem label="Contact" value={token.contactNumber} />}
              
              <div className="pt-3 mt-3 border-t-2 border-dashed border-gray-300">
                {typeof token.inCarat === 'number' && (
                    <div className="flex justify-between text-base font-bold">
                        <span>In Carat:</span>
                        <span>{token.inCarat}</span>
                    </div>
                )}
              </div>
            </main>
          </div>
        </div>
        <DialogFooter className="px-6 pb-4 sm:justify-between pt-4 rounded-b-lg border-t print-hidden bg-gray-50 flex-col sm:flex-row gap-2">
          <DialogClose asChild>
            <Button variant="outline" className='flex-1'>
                <X className="mr-2 h-4 w-4" />
                Close
            </Button>
          </DialogClose>
          <Button variant="default" onClick={onPrint} className='flex-1'>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    