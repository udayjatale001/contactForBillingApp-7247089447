
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
import { format } from 'date-fns';
import { useLanguage } from '@/context/language-context';


interface BillSummaryDialogProps {
  bill: Bill;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
  isSavingDisabled: boolean;
}

export function BillSummaryDialog({ bill, open, onOpenChange, onSave, isSaving, isSavingDisabled }: BillSummaryDialogProps) {
  const { t } = useLanguage();
  const [isSavingForPrint, setIsSavingForPrint] = React.useState(false);
  const [isSavingForWhatsApp, setIsSavingForWhatsApp] = React.useState(false);

  if (!bill) {
    return null;
  }
  
  const generateWhatsAppMessage = () => {
    const header = `*${t('bill_receipt_title')}*\n${t('bill_receipt_subtitle')}\n\n`;
    const billInfo = `*${t('bill_no')}:* #${bill.id.slice(-6).toUpperCase()}\n*${t('date')}:* ${format(new Date(bill.createdAt), 'PP')}\n\n`;
    const customerDetails = `*${t('customer_details')}:*\n${t('customer_name')}: ${bill.customerName}\n` +
      (bill.roomNumber ? `${t('room_number')}: ${bill.roomNumber}\n` : '') +
      (bill.contactNumber ? `${t('contact_number')}: ${bill.contactNumber}\n` : '') + '\n';

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

  const handlePrintClick = async () => {
    if (isSavingDisabled) return;
    setIsSavingForPrint(true);
    await onSave();
    // The print is handled via CSS, so we just trigger it after saving.
    setTimeout(() => {
        window.print();
        setIsSavingForPrint(false);
    }, 100);
  }

  const handleWhatsAppClick = async () => {
    if (isSavingDisabled || !bill.contactNumber) return;
    setIsSavingForWhatsApp(true);
    await onSave();

    const message = generateWhatsAppMessage();
    // Assuming Indian phone numbers without country code, will add 91.
    // If numbers already have it, WhatsApp handles it.
    const whatsappUrl = `https://wa.me/91${bill.contactNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
    setIsSavingForWhatsApp(false);
    onOpenChange(false); // Close dialog after opening whatsapp
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
                <h1 className="text-2xl font-bold text-gray-800">{t('bill_receipt_title')}</h1>
                <p className="text-sm text-gray-500">{t('bill_receipt_subtitle')}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">{t('bill_no')}: #${bill.id.slice(-6).toUpperCase()}</p>
                <p className="text-sm text-gray-500">{t('date')}: ${format(new Date(bill.createdAt), 'PP')}</p>
              </div>
            </header>

            <main className="space-y-6">
              {/* Customer Details */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h2 className="text-lg font-bold text-gray-700 mb-2">{t('customer_details')}</h2>
                <div className="space-y-1">
                  <DetailItem label={t('customer_name')} value={bill.customerName} />
                  {bill.roomNumber && <DetailItem label={t('room_number')} value={bill.roomNumber} />}
                  {bill.contactNumber && <DetailItem label={t('contact_number')} value={bill.contactNumber} />}
                </div>
              </div>

              {/* Carat Details */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h2 className="text-lg font-bold text-gray-700 mb-3">{t('carat_details')}</h2>
                <div className="space-y-3">
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
                  <DetailItem label={t('total_amount')} value={`${bill.totalAmount.toLocaleString()}${t('rs_symbol')}`} valueClassName="text-lg font-bold text-gray-800" />
                  <DetailItem label={t('paid_amount')} value={`${bill.paidAmount.toLocaleString()}${t('rs_symbol')}`} />
                  <DetailItem 
                    label={t('due_amount')} 
                    value={`${bill.dueAmount.toLocaleString()}${t('rs_symbol')}`} 
                    valueClassName={cn("font-bold", bill.dueAmount > 0 ? "text-red-600" : "text-green-600")} 
                  />
                </div>
              </div>
              
              {/* Payment Details */}
              <div className="p-4 bg-gray-50 rounded-lg">
                 <h2 className="text-lg font-bold text-gray-700 mb-2">{t('payment_details')}</h2>
                 <div className="space-y-1">
                    <DetailItem label={t('payment_method')} value={t(bill.paymentMode.toLowerCase() as keyof typeof import('@/lib/locales/en').default)} />
                    <DetailItem label={`${t('date')} & ${t('time')}`} value={format(new Date(bill.createdAt), 'PPpp')} />
                 </div>
              </div>
            </main>

            {/* Footer */}
            <footer className="mt-10 pt-6 border-t flex justify-between items-center">
              <div className="text-center">
                <p className="text-sm text-gray-500">{t('signature_seal')}</p>
              </div>
              <div className="text-sm text-gray-600">
                {t('thank_you_note')} 😊
              </div>
            </footer>
          </div>
        </div>
        <DialogFooter className="px-6 pb-4 sm:justify-between pt-4 rounded-b-lg border-t print-hidden bg-gray-50 flex-col sm:flex-row gap-2">
          <DialogClose asChild>
            <Button variant="outline" className='flex-1'>
                <X className="mr-2 h-4 w-4" />
                {t('close')}
            </Button>
          </DialogClose>
          <Button 
            variant="secondary" 
            onClick={handleWhatsAppClick} 
            className='flex-1' 
            disabled={isSavingDisabled || !bill.contactNumber || isSavingForPrint || isSavingForWhatsApp}
          >
            {isSavingForWhatsApp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
            {t('send_via_whatsapp')}
          </Button>
          <Button 
            variant="default" 
            onClick={handlePrintClick} 
            className='flex-1' 
            disabled={isSavingDisabled || isSavingForPrint || isSavingForWhatsApp}
          >
            {isSavingForPrint ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
            {t('save_and_print')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
