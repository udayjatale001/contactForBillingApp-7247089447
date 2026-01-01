
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogClose,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import type { AppSettings, Bill } from '@/lib/types';
import { Loader2, Printer, X, MessageSquare, Trash2, Save, Phone } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useLanguage } from '@/context/language-context';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';


interface BillSummaryDialogProps {
  bill: Bill;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
  isViewing?: boolean;
  onDelete?: () => void;
}

const DetailItem = ({ label, value, className, valueClassName }: { label: string, value: React.ReactNode, className?: string, valueClassName?: string }) => (
    <div className={cn("flex justify-between items-start text-xs sm:text-sm", className)}>
      <p className="text-gray-500">{label}</p>
      <p className={cn("font-medium text-right text-gray-800", valueClassName)}>{value}</p>
    </div>
  );

export function BillSummaryDialog({ bill, open, onOpenChange, onSave, isSaving, isViewing = false, onDelete }: BillSummaryDialogProps) {
  const { t } = useLanguage();
  const [isProcessing, setIsProcessing] = React.useState(false);

  const firestore = useFirestore();
  const settingsDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'app_settings', 'rates');
  }, [firestore]);
  const { data: appSettings } = useDoc<AppSettings>(settingsDocRef);


  if (!bill) {
    return null;
  }

  const handleOpenChange = (isOpen: boolean) => {
    // Only allow closing via the explicit close button
    if (!isOpen) {
      onOpenChange(false);
    }
  };

  const handleDialogInteraction = (e: React.UIEvent) => {
    e.preventDefault();
  };
  
  const generateWhatsAppMessage = () => {
    const header = `*${t('app_title')}*\n${t('bill_receipt_subtitle')}\n\n`;
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
  
  const handleSaveAction = async () => {
    setIsProcessing(true);
    try {
        if (!isViewing) {
            await onSave();
        }
    } catch(error) {
        console.error("Error during bill save:", error);
    } finally {
        setIsProcessing(false);
    }
  }

  const handleWhatsAppAction = () => {
    if (bill.contactNumber) {
        const message = generateWhatsAppMessage();
        const whatsappUrl = `https://wa.me/91${bill.contactNumber}?text=${message}`;
        window.open(whatsappUrl, '_blank');
    }
  };

  return (
    <>
      <Dialog 
        open={open} 
        onOpenChange={(isOpen) => {
            if (!isOpen) onOpenChange(false);
        }}
      >
        <DialogContent 
            className="max-w-sm w-full p-0 sm:max-h-[90vh] flex flex-col print-container"
            onPointerDownOutside={handleDialogInteraction}
            onInteractOutside={handleDialogInteraction}
        >
            <DialogHeader className="p-4 sm:p-6 pb-0 flex-row justify-between items-center print-hidden">
                <DialogTitle className='sr-only'>Bill Summary</DialogTitle>
                <DialogClose asChild>
                    <Button variant="ghost" size="icon">
                        <X className="h-5 w-5" />
                        <span className="sr-only">Close</span>
                    </Button>
                </DialogClose>
            </DialogHeader>
          <div id="final-bill-print" className="p-4 sm:p-6 bg-white text-gray-800 rounded-t-lg overflow-y-auto flex-1 font-sans">
              {/* Header */}
              <header className="text-center mb-4 sm:mb-6 pb-4 border-b border-gray-200">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-800 tracking-wider">{t('app_title')}</h1>
                  <p className="text-xs sm:text-sm text-gray-500">{t('bill_receipt_subtitle')}</p>
                   <div className='flex justify-between text-xs sm:text-sm text-gray-500 mt-4'>
                      <span>{t('bill_no')}: #{bill.id.slice(-6).toUpperCase()}</span>
                      <span>{t('date')}: {format(new Date(bill.createdAt), 'PP')}</span>
                  </div>
              </header>

              <main className="space-y-4 sm:space-y-6">
                  {/* Customer Details */}
                  <div className="p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <h2 className="text-base sm:text-lg font-bold text-gray-700 mb-2">{t('customer_details')}</h2>
                      <div className="space-y-1">
                          <DetailItem label={t('customer_name')} value={bill.customerName} />
                          {bill.roomNumber && <DetailItem label={t('room_number')} value={bill.roomNumber} />}
                          {bill.contactNumber && <DetailItem label={t('contact_number')} value={bill.contactNumber} />}
                          {bill.address && <DetailItem label='Address' value={bill.address} />}
                      </div>
                  </div>

                  {/* Carat Details */}
                  <div className="p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-100">
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
                          <Separator className="my-2 bg-gray-200" />
                          <DetailItem label={t('total_amount')} value={`${bill.totalAmount.toLocaleString()}${t('rs_symbol')}`} valueClassName="text-base sm:text-lg font-bold text-black" />
                          <DetailItem label={t('paid_amount')} value={`${bill.paidAmount.toLocaleString()}${t('rs_symbol')}`} />
                          <DetailItem
                              label={t('due_amount')}
                              value={`${bill.dueAmount.toLocaleString()}${t('rs_symbol')}`}
                              valueClassName={cn("font-bold text-lg", bill.dueAmount > 0 ? "text-red-600" : "text-green-600")}
                          />
                      </div>
                  </div>

                  {/* Payment Details */}
                  <div className="p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <h2 className="text-base sm:text-lg font-bold text-gray-700 mb-2">{t('payment_details')}</h2>
                      <div className="space-y-1">
                          <DetailItem label={t('payment_method')} value={t(bill.paymentMode.toLowerCase() as keyof typeof import('@/lib/locales/en').default)} />
                          <DetailItem label={`${t('date')} & ${t('time')}`} value={format(new Date(bill.createdAt), 'PPpp')} />
                      </div>
                  </div>
              </main>

              {/* Footer */}
              <footer className="mt-6 sm:mt-10 pt-6 border-t border-gray-200 flex flex-col items-center gap-4 text-xs sm:text-sm">
                  <div className="flex justify-between items-center w-full">
                    <div className="text-center">
                         <p className="text-gray-500 h-8 border-b-2 border-dotted border-gray-400 w-32"></p>
                        <p className="text-gray-500 mt-1">{t('signature_seal')}</p>
                    </div>
                    <div className="text-gray-500 font-semibold">
                        {t('thank_you_note')} 😊
                    </div>
                  </div>
                  {appSettings?.contactUsNumber && (
                    <div className="text-center font-bold text-black mt-2 flex items-center gap-2">
                      <Phone className="h-4 w-4"/>
                      <span>Contact Us: {appSettings.contactUsNumber}</span>
                    </div>
                  )}
              </footer>
          </div>
          <DialogFooter className="px-4 py-3 sm:px-6 sm:pb-4 rounded-b-lg border-t bg-gray-50 flex-row justify-between w-full print-hidden">
              <div className='flex items-center gap-2'>
                {isViewing && onDelete && (
                    <Button variant="ghost" size="icon" onClick={onDelete}>
                        <Trash2 className="h-5 w-5 text-destructive" />
                        <span className="sr-only">Delete</span>
                    </Button>
                )}
                 <Button 
                      variant="ghost"
                      size="icon"
                      onClick={() => window.print()}
                  >
                      <Printer className="h-5 w-5"/>
                      <span className="sr-only">Print</span>
                  </Button>
              </div>
              <div className='flex-1 flex justify-end gap-2'>
                <Button 
                    variant="secondary" 
                    onClick={handleWhatsAppAction} 
                    disabled={!bill.contactNumber || isProcessing || isSaving}
                >
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                    {t('send_via_whatsapp')}
                </Button>
                 {!isViewing && (
                   <Button 
                      variant="default" 
                      onClick={handleSaveAction}
                      disabled={isProcessing || isSaving}
                  >
                      {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save Bill
                  </Button>
                 )}
              </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <style jsx global>{`
        @page {
          size: 80mm auto;
          margin: 0;
        }
        @media print {
          html, body {
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 0;
            padding: 0;
            background: white;
          }
          body > * {
            visibility: hidden;
          }
          .print-hidden {
            display: none !important;
          }
          .print-container, .print-container > div {
            visibility: hidden;
            border: none !important;
            box-shadow: none !important;
            max-width: none !important;
          }
          #final-bill-print, #final-bill-print * {
            visibility: visible;
          }
          #final-bill-print {
            position: static;
            display: block;
            width: 100%; /* Fill the container */
            height: fit-content;
            max-height: none;
            min-height: initial;
            margin: auto;
            padding: 1rem;
            background-color: #ffffff !important;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
            overflow: visible;
            page-break-before: auto;
            page-break-after: auto;
            page-break-inside: avoid !important;
          }
        }
      `}</style>
    </>
  );
}
