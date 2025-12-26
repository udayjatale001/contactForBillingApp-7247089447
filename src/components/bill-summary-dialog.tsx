
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
import { Loader2, Printer } from 'lucide-react';
import * as React from 'react';


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
    // The print is handled via CSS, so we just trigger it.
    window.print();
  }

  const DetailItem = ({ label, value, className }: { label: string, value: React.ReactNode, className?: string}) => (
    <div className={`flex justify-between items-baseline py-2 ${className}`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="text-md font-semibold text-right">{value}</div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0">
        <style>
          {`
            @media print {
              body > * {
                visibility: hidden;
              }
              #bill-receipt-container, #bill-receipt-container * {
                visibility: visible;
              }
              #bill-receipt-container {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                display: flex;
                justify-content: center;
                align-items: flex-start;
                padding: 1rem;
                background: white; /* Ensure a white background for printing */
              }
               #bill-receipt {
                  width: 100%;
                  border: none;
                  box-shadow: none;
               }
            }
          `}
        </style>
        {/* This outer container is used by the print styles */}
        <div id="bill-receipt-container">
          <div className="p-6" id="bill-receipt">
              <DialogHeader className="mb-4 text-center">
                  <h2 className="text-xl font-bold">Anand Sagar Ripening Chamber</h2>
                  <p className="text-sm text-muted-foreground">Ichapur Road, Shahpur</p>
                   <div className='flex justify-between text-xs text-muted-foreground mt-4'>
                      <span>Bill No: A...{bill.id.slice(-4)}</span>
                      <span>{new Date(bill.createdAt).toLocaleDateString()}</span>
                  </div>
              </DialogHeader>
              <div className="space-y-1">
                  <DetailItem label="Customer Name" value={bill.customerName} />
                  {bill.roomNumber && <DetailItem label="Room Number" value={bill.roomNumber} />}
                  {bill.contactNumber && <DetailItem label="Contact" value={bill.contactNumber} />}
                  <Separator className="my-2" />
                  {bill.inCarat && bill.inCarat > 0 && <DetailItem label="In Carat" value={bill.inCarat} />}
                  {bill.outCarat && bill.outCarat > 0 && <DetailItem label="Out Carat" value={bill.outCarat} />}
                  {bill.smallCarat && bill.smallCarat > 0 && <DetailItem label="Small Carat" value={`${bill.smallCarat} @ ${bill.smallCaratRate}rs`} />}
                  {bill.bigCarat && bill.bigCarat > 0 && <DetailItem label="Big Carat" value={`${bill.bigCarat} @ ${bill.bigCaratRate}rs`} />}
                  
                  <Separator className="my-2" />
                  <DetailItem label="Total Amount" value={`${bill.totalAmount.toLocaleString()}rs`} className="font-bold text-lg"/>
                  <DetailItem label="Paid Amount" value={`${bill.paidAmount.toLocaleString()}rs`} />
                  <DetailItem label="Due Amount" value={<Badge variant={bill.dueAmount > 0 ? "destructive" : "default"}>{bill.dueAmount.toLocaleString()}rs</Badge>} />
                  <Separator className="my-2" />
                  
                  {/* Internal Labour Info */}
                  {bill.totalLabourAmount && bill.totalLabourAmount > 0 && (
                    <>
                      <div className='text-center text-xs text-muted-foreground pt-2'>
                        (Internal Labour Cost: {bill.totalLabourAmount.toLocaleString()}rs)
                      </div>
                      <Separator className="my-2" />
                    </>
                  )}

                  <DetailItem label="Paid To" value={bill.paidTo} />
                  <DetailItem label="Date" value={new Date(bill.createdAt).toLocaleDateString()} />
                  <Separator className="my-2" />
                   <div className='text-center text-sm text-muted-foreground pt-2'>
                      Payment Method: {bill.paymentMode}
                  </div>
                  <div className="pt-12 pb-4 text-center">
                      <div className="border-t border-dashed w-1/2 mx-auto"></div>
                      <p className="text-xs text-muted-foreground mt-2">Seal / Signature</p>
                  </div>
              </div>
          </div>
        </div>
        <DialogFooter className="px-6 pb-6 sm:justify-between bg-secondary/20 pt-4 rounded-b-lg border-t print:hidden">
          {/* Keep the Save button, but handle print separately */}
          <Button variant="default" onClick={onSave} className='flex-1' disabled={isSaving || isSavingDisabled}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Bill
          </Button>
          <Button variant="outline" onClick={handlePrintClick} className='flex-1'>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
