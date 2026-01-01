
'use client';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import type { Token } from '@/lib/types';
import { Printer, X, MessageSquare, Trash2 } from 'lucide-react';
import * as React from 'react';
import { format } from 'date-fns';
import { useLanguage } from '@/context/language-context';

interface TokenSummaryDialogProps {
  token: Token;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPrint: () => void;
  onDelete?: () => void;
}

const DetailItem = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div className="flex justify-between items-center py-1 sm:py-2">
      <p className="text-xs sm:text-sm text-gray-500">{label}</p>
      <p className="text-xs sm:text-sm font-semibold text-gray-800 text-right">{value}</p>
    </div>
);

export function TokenSummaryDialog({ token, open, onOpenChange, onPrint, onDelete }: TokenSummaryDialogProps) {
  const { t } = useLanguage();

  if (!token) {
    return null;
  }
  
  const generateWhatsAppMessage = () => {
    const header = `*${t('bill_receipt_title')}*\n*${t('customer_token')}*\n\n`;
    const tokenInfo = `*${t('token_no')}:* #${token.id.slice(-6).toUpperCase()}\n*${t('date')}:* ${format(new Date(token.createdAt), 'PP')}\n\n`;
    const customerDetails = `*${t('customer_details')}:*\n${t('customer_name')}: ${token.customerName}\n` +
      (token.roomNumber ? `${t('room_number')}: ${token.roomNumber}\n` : '') +
      (token.contactNumber ? `${t('contact_number')}: ${token.contactNumber}\n` : '') +
      (token.address ? `Address: ${token.address}\n` : '') + '\n';
    
    let caratDetails = '';
    if (typeof token.inCarat === 'number') {
        caratDetails = `*${t('in_carat')}:* ${token.inCarat}\n\n`;
    }
    
    const footer = `${t('whatsapp_thank_you')} 😊`;

    return encodeURIComponent(header + tokenInfo + customerDetails + caratDetails + footer);
  };
  
  const handleWhatsAppClick = () => {
    if (!token.contactNumber) return;
    const message = generateWhatsAppMessage();
    const whatsappUrl = `https://wa.me/91${token.contactNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs w-full p-0 print:border-none print:shadow-none print:bg-white sm:max-h-[90vh] flex flex-col">
        <DialogHeader>
            <DialogTitle className="sr-only">Token Summary</DialogTitle>
        </DialogHeader>
        <style>
          {`
            @page {
              size: 80mm auto;
              margin: 0;
            }
            @media print {
              html, body {
                width: 100%;
                height: 100%;
                margin: 0;
                padding: 0;
                display: flex;
                justify-content: center;
                align-items: center;
              }
              body > * {
                visibility: hidden;
              }
              .print-hidden {
                display: none !important;
              }
              #token-receipt-container, #token-receipt-container * {
                visibility: visible;
              }
              #token-receipt-container {
                position: static;
                display: block;
                width: 100%;
                height: auto;
                min-height: initial;
                max-height: none;
                margin: auto;
                padding: 0;
                background-color: #ffffff !important;
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
                overflow: visible;
                page-break-before: auto;
                page-break-after: auto;
                page-break-inside: avoid !important;
              }
              #token-receipt {
                width: 100%;
                border: none !important;
                box-shadow: none !important;
                margin: 0;
                padding: 1rem;
                font-size: 12px;
                page-break-inside: avoid;
              }
            }
          `}
        </style>
        <div id="token-receipt-container" className="flex-1 overflow-y-auto">
          <div className="p-4 bg-white rounded-lg border-2 border-dashed border-gray-400" id="token-receipt">
            {/* Header */}
            <header className="text-center mb-3 pb-2 border-b-2 border-dashed border-gray-300">
                <h1 className="text-lg font-bold text-gray-800">{t('bill_receipt_title')}</h1>
                <p className="text-xs text-gray-500">{t('customer_token')}</p>
            </header>

            <main className="space-y-1">
              <DetailItem label={t('token_no')} value={`#${token.id.slice(-6).toUpperCase()}`} />
              <DetailItem label={t('date')} value={format(new Date(token.createdAt), 'PP')} />
              <DetailItem label={t('time')} value={format(new Date(token.createdAt), 'p')} />
              <DetailItem label={t('customer_name')} value={token.customerName} />
              {token.roomNumber && <DetailItem label={t('room_number')} value={token.roomNumber} />}
              {token.contactNumber && <DetailItem label={t('contact_number')} value={token.contactNumber} />}
              {token.address && <DetailItem label='Address' value={token.address} />}
              
              <div className="pt-2 mt-2 border-t-2 border-dashed border-gray-300">
                {typeof token.inCarat === 'number' && (
                    <div className="flex justify-between text-sm font-bold">
                        <span>{t('in_carat')}:</span>
                        <span>{token.inCarat}</span>
                    </div>
                )}
              </div>
            </main>
          </div>
        </div>
        <DialogFooter className="px-4 py-3 rounded-b-lg border-t print-hidden bg-gray-50 flex-row justify-between w-full">
             {onDelete && (
                <Button variant="ghost" size="icon" onClick={onDelete}>
                    <Trash2 className="h-5 w-5 text-destructive" />
                    <span className="sr-only">Delete</span>
                </Button>
            )}
            <div className='flex-1 flex justify-end gap-2'>
                <Button 
                variant="secondary" 
                onClick={handleWhatsAppClick} 
                className='flex-1' 
                disabled={!token.contactNumber}
                >
                <MessageSquare className="mr-2 h-4 w-4" />
                {t('send_via_whatsapp')}
                </Button>
                <Button variant="default" onClick={onPrint} className='flex-1'>
                <Printer className="mr-2 h-4 w-4" />
                {t('print')}
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
