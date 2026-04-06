
'use client';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogClose,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import type { AggregatedCustomer } from '@/app/koushal/page';
import { Loader2, Printer, X, MessageSquare, Trash2 } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/language-context';

interface CustomerSummaryDialogProps {
  customer: AggregatedCustomer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWhatsApp: () => void;
  onDelete: () => void;
}

export function CustomerSummaryDialog({ customer, open, onOpenChange, onWhatsApp, onDelete }: CustomerSummaryDialogProps) {
  const { t } = useLanguage();
  
  if (!customer) {
    return null;
  }
  
  const DetailItem = ({ label, value, className, valueClassName }: { label: string, value: React.ReactNode, className?: string, valueClassName?: string }) => (
    <div className={cn("flex justify-between items-start text-sm", className)}>
      <p className="text-muted-foreground">{label}</p>
      <p className={cn("font-medium text-right", valueClassName)}>{value}</p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full p-0 sm:max-h-[90vh] flex flex-col">
        <DialogHeader className="sr-only">
          <DialogTitle>{customer.name} Summary</DialogTitle>
        </DialogHeader>
        <div className="p-6 bg-white rounded-t-lg overflow-y-auto flex-1">
            <header className="flex justify-between items-start mb-6 pb-4 border-b">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">{t('app_title')}</h1>
                <p className="text-sm text-gray-500">{t('customer_details')}</p>
              </div>
            </header>

            <main className="space-y-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h2 className="text-lg font-bold text-gray-700 mb-2">{t('customer_details')}</h2>
                <div className="space-y-1">
                  <DetailItem label={t('customer_name')} value={customer.name} />
                  {customer.contactNumber && <DetailItem label={t('contact_number')} value={customer.contactNumber} />}
                  {customer.address && <DetailItem label='Address' value={customer.address} />}
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h2 className="text-lg font-bold text-gray-700 mb-3">Transaction Summary</h2>
                <div className="space-y-3">
                  <DetailItem label={'Total Carat'} value={customer.totalCarat.toLocaleString()} />
                   <Separator className="my-2" />
                  <DetailItem 
                    label={'Total Billed Amount'} 
                    value={`${customer.totalAmount.toLocaleString()}${t('rs_symbol')}`} 
                    valueClassName="text-lg font-bold text-gray-800"
                  />
                </div>
              </div>
            </main>
          </div>
        <DialogFooter className="px-6 pb-4 rounded-b-lg border-t bg-gray-50 flex flex-col sm:flex-row gap-2 flex-shrink-0">
            <Button 
                variant="destructive" 
                onClick={onDelete} 
                className='flex-1'
            >
                <Trash2 className="mr-2 h-4 w-4" />
                {t('delete')}
            </Button>
            <div className='flex flex-1 gap-2'>
                 <Button 
                    variant="secondary" 
                    onClick={onWhatsApp} 
                    className='flex-1' 
                    disabled={!customer.contactNumber}
                    >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    WhatsApp
                </Button>
                <DialogClose asChild>
                    <Button variant="outline" className='flex-1'>
                        <X className="mr-2 h-4 w-4" />
                        {t('close')}
                    </Button>
                </DialogClose>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
