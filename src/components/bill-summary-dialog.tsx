
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import type { Bill } from '@/lib/types';
import { Loader2, Printer, X, MessageSquare } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/utils';


interface BillSummaryDialogProps {
  bill: Bill;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
  isSavingDisabled: boolean;
}

export function BillSummaryDialog({ bill, open, onOpenChange, onSave, isSaving, isSavingDisabled }: BillSummaryDialogProps) {

  if (!bill) {
    return null;
  }
  
  const handlePrintClick = () => {
    onSave().then(() => {
        // The print is handled via CSS, so we just trigger it after saving.
        setTimeout(() => window.print(), 100);
    })
  }

  const generateWhatsAppMessage = () => {
    const header = `*Anand Sagar Ripening Chamber*\nIchapur Road, Shahpur\n\n`;
    const billInfo = `*Bill No:* #${bill.id.slice(-6).toUpperCase()}\n*Date:* ${new Date(bill.createdAt).toLocaleDateString()}\n\n`;
    const customerDetails = `*Customer Details:*\nName: ${bill.customerName}\n` +
      (bill.roomNumber ? `Room No: ${bill.roomNumber}\n` : '') +
      (bill.contactNumber ? `Contact: ${bill.contactNumber}\n` : '') + '\n';

    let caratDetails = '*Carat Details:*\n';
    if (bill.inCarat) caratDetails += `In Carat: ${bill.inCarat}\n`;
    if (bill.outCarat) caratDetails += `Out Carat: ${bill.outCarat}\n`;
    if (bill.smallCarat) caratDetails += `Small Carat: ${bill.smallCarat} at per carat ${bill.smallCaratRate}rs\n`;
    if (bill.bigCarat) caratDetails += `Big Carat: ${bill.bigCarat} at per carat ${bill.bigCaratRate}rs\n\n`;
    
    let amountSummary = `*Amount Summary:*\n`;
    amountSummary += `Total Amount: ${bill.totalAmount.toLocaleString()}rs\n`;
    amountSummary += `Paid Amount: ${bill.paidAmount.toLocaleString()}rs\n`;
    amountSummary += `*Due Amount: ${bill.dueAmount.toLocaleString()}rs*\n\n`;
    
    if (bill.totalLabourAmount && bill.totalLabourAmount > 0) {
      amountSummary += `_(Internal Labour Cost: ${bill.totalLabourAmount.toLocaleString()}rs)_\n\n`;
    }

    const paymentDetails = `*Payment Details:*\nPaid To: ${bill.paidTo}\nMethod: ${bill.paymentMode}\nDate: ${new Date(bill.createdAt).toLocaleString()}\n\n`;
    const footer = `Thank you for your business! 😊`;

    return encodeURIComponent(header + billInfo + customerDetails + caratDetails + amountSummary + paymentDetails + footer);
  };

  const handleWhatsAppClick = () => {
    if (bill.contactNumber) {
      const message = generateWhatsAppMessage();
      // Assuming Indian phone numbers without country code, will add 91.
      // If numbers already have it, WhatsApp handles it.
      const whatsappUrl = `https://wa.me/91${bill.contactNumber}?text=${message}`;
      window.open(whatsappUrl, '_blank');
    }
  };


  const DetailItem = ({ label, value, className, valueClassName }: { label: string, value: React.ReactNode, className?: string, valueClassName?: string }) => (
    <div className={cn("flex justify-between items-center", className)}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("text-sm font-medium", valueClassName)}>{value}</p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 print:border-none print:shadow-none print:bg-white">
        <style>
          {`
            @media print {
              body, body > *, .print-hidden {
                visibility: hidden;
                margin: 0;
                padding: 0;
              }
              #bill-receipt-container, #bill-receipt-container * {
                visibility: visible;
              }
               #bill-receipt-container {
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
               #bill-receipt {
                  width: 100%;
                  border: none;
                  box-shadow: none;
                  margin: 0;
                  padding: 1.5rem;
                  font-size: 14px;
               }
               .print-hidden {
                 display: none;
               }
            }
          `}
        </style>
        <div id="bill-receipt-container">
          <div className="p-6 bg-white rounded-lg" id="bill-receipt">
            {/* Header */}
            <header className="flex justify-between items-start mb-6 pb-4 border-b">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Anand Sagar Ripening Chamber</h1>
                <p className="text-sm text-gray-500">Ichapur Road, Shahpur</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Bill No: #${bill.id.slice(-6).toUpperCase()}</p>
                <p className="text-sm text-gray-500">Date: {new Date(bill.createdAt).toLocaleDateString()}</p>
              </div>
            </header>

            <main className="space-y-6">
              {/* Customer Details */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h2 className="text-lg font-bold text-gray-700 mb-2">Customer Details</h2>
                <div className="space-y-1">
                  <DetailItem label="Name" value={bill.customerName} />
                  {bill.roomNumber && <DetailItem label="Room Number" value={bill.roomNumber} />}
                  {bill.contactNumber && <DetailItem label="Contact" value={bill.contactNumber} />}
                </div>
              </div>

              {/* Carat Details */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h2 className="text-lg font-bold text-gray-700 mb-3">Carat Details</h2>
                <div className="space-y-3">
                  {bill.inCarat && bill.inCarat > 0 && <DetailItem label="In Carat" value={bill.inCarat} />}
                  {bill.outCarat && bill.outCarat > 0 && <DetailItem label="Out Carat" value={bill.outCarat} />}

                  {bill.smallCarat && bill.smallCarat > 0 && (
                    <DetailItem
                      label="Small Carat"
                      value={`${bill.smallCarat} at per carat ${bill.smallCaratRate}rs`}
                    />
                  )}
                  {bill.bigCarat && bill.bigCarat > 0 && (
                     <DetailItem
                      label="Big Carat"
                      value={`${bill.bigCarat} at per carat ${bill.bigCaratRate}rs`}
                    />
                  )}
                   <Separator className="my-2" />
                  <DetailItem label="Total Amount" value={`${bill.totalAmount.toLocaleString()}rs`} valueClassName="text-lg font-bold text-gray-800" />
                  <DetailItem label="Paid Amount" value={`${bill.paidAmount.toLocaleString()}rs`} />
                  <DetailItem 
                    label="Due Amount" 
                    value={`${bill.dueAmount.toLocaleString()}rs`} 
                    valueClassName={cn("font-bold", bill.dueAmount > 0 ? "text-red-600" : "text-green-600")} 
                  />
                   {bill.totalLabourAmount && bill.totalLabourAmount > 0 && (
                    <p className="text-xs italic text-gray-500 pt-2">(Internal Labour Cost: {bill.totalLabourAmount.toLocaleString()}rs)</p>
                  )}
                </div>
              </div>
              
              {/* Payment Details */}
              <div className="p-4 bg-gray-50 rounded-lg">
                 <h2 className="text-lg font-bold text-gray-700 mb-2">Payment Details</h2>
                 <div className="space-y-1">
                    <DetailItem label="Paid To" value={bill.paidTo} />
                    <DetailItem label="Payment Method" value={bill.paymentMode} />
                    <DetailItem label="Date & Time" value={new Date(bill.createdAt).toLocaleString()} />
                 </div>
              </div>
            </main>

            {/* Footer */}
            <footer className="mt-10 pt-6 border-t flex justify-between items-center">
              <div className="text-center">
                <p className="text-sm text-gray-500">Seal / Signature</p>
              </div>
              <div className="text-sm text-gray-600">
                Thank You 😊
              </div>
            </footer>
          </div>
        </div>
        <DialogFooter className="px-6 pb-4 sm:justify-between pt-4 rounded-b-lg border-t print-hidden bg-gray-50 flex-col sm:flex-row gap-2">
          <DialogClose asChild>
            <Button variant="outline" className='flex-1'>
                <X className="mr-2 h-4 w-4" />
                Close
            </Button>
          </DialogClose>
          <Button variant="secondary" onClick={handleWhatsAppClick} className='flex-1' disabled={!bill.contactNumber}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Send via WhatsApp
          </Button>
          <Button variant="default" onClick={handlePrintClick} className='flex-1' disabled={isSaving || isSavingDisabled}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
            Save & Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
