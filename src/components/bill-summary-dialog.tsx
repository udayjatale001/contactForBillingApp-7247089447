
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
import { Loader2, Printer, X, MessageSquare, Trash2 } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useLanguage } from '@/context/language-context';


interface BillSummaryDialogProps {
  bill: Bill;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveAndReset: () => Promise<void>;
  isSaving: boolean;
  isViewing?: boolean; // New prop
  onDelete?: () => void; // New prop for delete action
}

export function BillSummaryDialog({ bill, open, onOpenChange, onSaveAndReset, isSaving, isViewing = false, onDelete }: BillSummaryDialogProps) {
  const { t } = useLanguage();
  const [isProcessing, setIsProcessing] = React.useState(false);


  if (!bill) {
    return null;
  }
  
  const generateWhatsAppMessage = () => {
    const header = `*${t('bill_receipt_title')}*\n${t('bill_receipt_subtitle')}\n\n`;
    const billInfo = `*${t('bill_no')}:* #${bill.id.slice(-6).toUpperCase()}\n*${t('date')}:* ${format(new Date(bill.createdAt), 'PP')}\n\n`;
    const customerDetails = `*${t('customer_details')}:*\n${t('customer_name')}: ${bill.customerName}\n` +
      (bill.roomNumber ? `${t('room_number')}: ${bill.roomNumber}\n` : '') +
      (bill.contactNumber ? `${t('contact_number')}: ${bill.contactNumber}\n` : '') +
      (bill.address ? `Address: ${bill.address}\n` : '') + '\n';

    let caratDetails = `*${t('carat_details')}:*\n`;
    if (bill.inCarat) caratDetails += `${t('in_carat')}: ${bill.inCarat}\n`;
    if (bill.outCarat) caratDetails += `${t('out_carat')}: ${bill.outCarat}\n`;
    if (bill.smallCarat && bill.smallCaratRate) caratDetails += `${t('small_carat_qty')} (${bill.smallCaratRate}${t('rs_symbol')}/kg): ${bill.smallCarat}kg\n`;
    if (bill.bigCarat && bill.bigCaratRate) caratDetails += `${t('big_carat_qty')} (${bill.bigCaratRate}${t('rs_symbol')}/kg): ${bill.bigCarat}kg\n\n`;
    
    let amountSummary = `*${t('calculation_summary')}:*\n`;
    amountSummary += `${t('total_amount')}: ${bill.totalAmount.toLocaleString()}${t('rs_symbol')}\n`;
    amountSummary += `${t('paid_amount')}: ${bill.paidAmount.toLocaleString()}${t('rs_symbol')}\n`;
    amountSummary += `*${t('due_amount')}: ${bill.dueAmount.toLocaleString()}${t('rs_symbol')}*\n\n`;
    
    const paymentDetails = `*${t('payment_details')}:*\n${t('payment_method')}: ${t(bill.paymentMode.toLowerCase() as keyof typeof import('@/lib/locales/en').default)}\n${t('date')} & ${t('time')}: ${format(new Date(bill.createdAt), 'PPpp')}\n\n`;
    const footer = `${t('whatsapp_thank_you')} 😊`;

    return encodeURIComponent(header + billInfo + customerDetails + caratDetails + amountSummary + paymentDetails + footer);
  };

  const handleAction = async (action: 'print' | 'whatsapp') => {
    setIsProcessing(true);
    try {
      if (!isViewing) {
        await onSaveAndReset(); // This now also handles form reset and dialog close
      }

      if (action === 'print') {
        setTimeout(() => window.print(), 100);
      } else if (action === 'whatsapp' && bill.contactNumber) {
        const message = generateWhatsAppMessage();
        const whatsappUrl = `https://wa.me/91${bill.contactNumber}?text=${message}`;
        window.open(whatsappUrl, '_blank');
      }
    } catch (error) {
        console.error("Error during bill action:", error);
    } finally {
        setIsProcessing(false);
         if (isViewing) { // if just viewing, we need to close the dialog manually
            onOpenChange(false);
        }
    }
  };


  const DetailItem = ({ label, value, className, valueClassName }: { label: string, value: React.ReactNode, className?: string, valueClassName?: string }) => (
    <div className={cn("flex justify-between items-start text-xs sm:text-sm", className)}>
      <p className="text-muted-foreground">{label}</p>
      <p className={cn("font-medium text-right", valueClassName)}>{value}</p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm w-full p-0 print:hidden sm:max-h-[90vh] flex flex-col">
        <style>
          {`
            @media print {
              body * {
                visibility: hidden;
              }
              #bill-print-area, #bill-print-area * {
                visibility: visible;
              }
              #bill-print-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                padding: 1.5rem;
                margin: 0;
                background: white;
                color: black;
              }
            }
          `}
        </style>
        <div className="p-4 sm:p-6 bg-white rounded-t-lg overflow-y-auto flex-1">
            {/* Header */}
            <header className="flex justify-between items-start mb-4 sm:mb-6 pb-4 border-b">
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-800">{t('bill_receipt_title')}</h1>
                <p className="text-xs sm:text-sm text-gray-500">{t('bill_receipt_subtitle')}</p>
              </div>
              <div className="text-right">
                <p className="text-xs sm:text-sm text-gray-500">{t('bill_no')}: #${bill.id.slice(-6).toUpperCase()}</p>
                <p className="text-xs sm:text-sm text-gray-500">{t('date')}: ${format(new Date(bill.createdAt), 'PP')}</p>
              </div>
            </header>

            <main className="space-y-4 sm:space-y-6">
              {/* Customer Details */}
              <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                <h2 className="text-base sm:text-lg font-bold text-gray-700 mb-2">{t('customer_details')}</h2>
                <div className="space-y-1">
                  <DetailItem label={t('customer_name')} value={bill.customerName} />
                  {bill.roomNumber && <DetailItem label={t('room_number')} value={bill.roomNumber} />}
                  {bill.contactNumber && <DetailItem label={t('contact_number')} value={bill.contactNumber} />}
                  {bill.address && <DetailItem label='Address' value={bill.address} />}
                </div>
              </div>

              {/* Carat Details */}
              <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                <h2 className="text-base sm:text-lg font-bold text-gray-700 mb-3">{t('carat_details')}</h2>
                <div className="space-y-2 sm:space-y-3">
                  {bill.inCarat && bill.inCarat > 0 && <DetailItem label={t('in_carat')} value={bill.inCarat} />}
                  {bill.outCarat && bill.outCarat > 0 && <DetailItem label={t('out_carat')} value={bill.outCarat} />}

                  {bill.smallCarat && bill.smallCarat > 0 && bill.smallCaratRate && (
                    <DetailItem
                      label={`${t('small_carat_qty')} (${bill.smallCaratRate}${t('rs_symbol')}/kg)`}
                      value={`${bill.smallCarat} kg`}
                    />
                  )}
                  {bill.bigCarat && bill.bigCarat > 0 && bill.bigCaratRate && (
                     <DetailItem
                      label={`${t('big_carat_qty')} (${bill.bigCaratRate}${t('rs_symbol')}/kg)`}
                      value={`${bill.bigCarat} kg`}
                    />
                  )}
                   <Separator className="my-2" />
                  <DetailItem label={t('total_amount')} value={`${bill.totalAmount.toLocaleString()}${t('rs_symbol')}`} valueClassName="text-base sm:text-lg font-bold text-gray-800" />
                  <DetailItem label={t('paid_amount')} value={`${bill.paidAmount.toLocaleString()}${t('rs_symbol')}`} />
                  <DetailItem 
                    label={t('due_amount')} 
                    value={`${bill.dueAmount.toLocaleString()}${t('rs_symbol')}`} 
                    valueClassName={cn("font-bold", bill.dueAmount > 0 ? "text-red-600" : "text-green-600")} 
                  />
                </div>
              </div>
              
              {/* Payment Details */}
              <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                 <h2 className="text-base sm:text-lg font-bold text-gray-700 mb-2">{t('payment_details')}</h2>
                 <div className="space-y-1">
                    <DetailItem label={t('payment_method')} value={t(bill.paymentMode.toLowerCase() as keyof typeof import('@/lib/locales/en').default)} />
                    <DetailItem label={`${t('date')} & ${t('time')}`} value={format(new Date(bill.createdAt), 'PPpp')} />
                 </div>
              </div>
            </main>

            {/* Footer */}
            <footer className="mt-6 sm:mt-10 pt-6 border-t flex justify-between items-center text-xs sm:text-sm">
              <div className="text-center">
                <p className="text-gray-500">{t('signature_seal')}</p>
              </div>
              <div className="text-gray-600">
                {t('thank_you_note')} 😊
              </div>
            </footer>
          </div>
        <DialogFooter className="px-4 py-3 sm:px-6 sm:pb-4 rounded-b-lg border-t bg-gray-50 flex-row justify-between w-full">
            {isViewing && onDelete && (
                <Button variant="ghost" size="icon" onClick={onDelete}>
                    <Trash2 className="h-5 w-5 text-destructive" />
                    <span className="sr-only">Delete</span>
                </Button>
            )}
            <div className='flex-1 flex justify-end gap-2'>
              <Button 
                  variant="secondary" 
                  onClick={() => handleAction('whatsapp')} 
                  disabled={!bill.contactNumber || isProcessing || isSaving}
              >
                  {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                  {t('send_via_whatsapp')}
              </Button>
              <Button 
                  variant="default" 
                  onClick={() => handleAction('print')}
                  disabled={isProcessing || isSaving}
              >
                  {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                  {isViewing ? t('print') : t('save_and_print')}
              </Button>
            </div>
        </DialogFooter>
      </DialogContent>
      {/* This is the printable area, which is hidden by default and only visible for printing */}
      <div id="bill-print-area" className="hidden print:block">
        <div className="p-4 sm:p-6 bg-white rounded-t-lg">
              {/* Header */}
              <header className="flex justify-between items-start mb-4 sm:mb-6 pb-4 border-b">
                <div>
                  <h1 className="text-lg sm:text-2xl font-bold text-gray-800">{t('bill_receipt_title')}</h1>
                  <p className="text-xs sm:text-sm text-gray-500">{t('bill_receipt_subtitle')}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs sm:text-sm text-gray-500">{t('bill_no')}: #${bill.id.slice(-6).toUpperCase()}</p>
                  <p className="text-xs sm:text-sm text-gray-500">{t('date')}: ${format(new Date(bill.createdAt), 'PP')}</p>
                </div>
              </header>

              <main className="space-y-4 sm:space-y-6">
                {/* Customer Details */}
                <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <h2 className="text-base sm:text-lg font-bold text-gray-700 mb-2">{t('customer_details')}</h2>
                  <div className="space-y-1">
                    <DetailItem label={t('customer_name')} value={bill.customerName} />
                    {bill.roomNumber && <DetailItem label={t('room_number')} value={bill.roomNumber} />}
                    {bill.contactNumber && <DetailItem label={t('contact_number')} value={bill.contactNumber} />}
                    {bill.address && <DetailItem label='Address' value={bill.address} />}
                  </div>
                </div>

                {/* Carat Details */}
                <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <h2 className="text-base sm:text-lg font-bold text-gray-700 mb-3">{t('carat_details')}</h2>
                  <div className="space-y-2 sm:space-y-3">
                    {bill.inCarat && bill.inCarat > 0 && <DetailItem label={t('in_carat')} value={bill.inCarat} />}
                    {bill.outCarat && bill.outCarat > 0 && <DetailItem label={t('out_carat')} value={bill.outCarat} />}

                    {bill.smallCarat && bill.smallCarat > 0 && bill.smallCaratRate && (
                      <DetailItem
                        label={`${t('small_carat_qty')} (${bill.smallCaratRate}${t('rs_symbol')}/kg)`}
                        value={`${bill.smallCarat} kg`}
                      />
                    )}
                    {bill.bigCarat && bill.bigCarat > 0 && bill.bigCaratRate && (
                       <DetailItem
                        label={`${t('big_carat_qty')} (${bill.bigCaratRate}${t('rs_symbol')}/kg)`}
                        value={`${bill.bigCarat} kg`}
                      />
                    )}
                     <Separator className="my-2" />
                    <DetailItem label={t('total_amount')} value={`${bill.totalAmount.toLocaleString()}${t('rs_symbol')}`} valueClassName="text-base sm:text-lg font-bold text-gray-800" />
                    <DetailItem label={t('paid_amount')} value={`${bill.paidAmount.toLocaleString()}${t('rs_symbol')}`} />
                    <DetailItem 
                      label={t('due_amount')} 
                      value={`${bill.dueAmount.toLocaleString()}${t('rs_symbol')}`} 
                      valueClassName={cn("font-bold", bill.dueAmount > 0 ? "text-red-600" : "text-green-600")} 
                    />
                  </div>
                </div>
                
                {/* Payment Details */}
                <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                   <h2 className="text-base sm:text-lg font-bold text-gray-700 mb-2">{t('payment_details')}</h2>
                   <div className="space-y-1">
                      <DetailItem label={t('payment_method')} value={t(bill.paymentMode.toLowerCase() as keyof typeof import('@/lib/locales/en').default)} />
                      <DetailItem label={`${t('date')} & ${t('time')}`} value={format(new Date(bill.createdAt), 'PPpp')} />
                   </div>
                </div>
              </main>

              {/* Footer */}
              <footer className="mt-6 sm:mt-10 pt-6 border-t flex justify-between items-center text-xs sm:text-sm">
                <div className="text-center">
                  <p className="text-gray-500">{t('signature_seal')}</p>
                </div>
                <div className="text-gray-600">
                  {t('thank_you_note')} 😊
                </div>
              </footer>
            </div>
      </div>
    </Dialog>
  );
}

    