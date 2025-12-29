
'use client';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import type { Labour } from '@/lib/types';
import { Trash2, X } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useLanguage } from '@/context/language-context';

interface LabourSummaryDialogProps {
  labourRecord: Labour;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
}

export function LabourSummaryDialog({ labourRecord, open, onOpenChange, onDelete }: LabourSummaryDialogProps) {
  const { t } = useLanguage();
  
  if (!labourRecord) {
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
        <div className="p-6 bg-white rounded-t-lg overflow-y-auto flex-1">
            <header className="flex justify-between items-start mb-6 pb-4 border-b">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Labour Details</h1>
                <p className="text-sm text-gray-500">Record ID: #{labourRecord.id.slice(0, 8)}</p>
              </div>
            </header>

            <main className="space-y-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h2 className="text-lg font-bold text-gray-700 mb-2">Summary</h2>
                <div className="space-y-1">
                  <DetailItem label="Customer Name" value={labourRecord.customerName} />
                  <DetailItem label="Date" value={format(new Date(labourRecord.createdAt), 'PP')} />
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h2 className="text-lg font-bold text-gray-700 mb-3">Calculation</h2>
                <div className="space-y-3">
                  <DetailItem 
                    label="In Labour" 
                    value={labourRecord.inCaratLabour && labourRecord.inCaratLabourRate ? `${labourRecord.inCaratLabour} × ${labourRecord.inCaratLabourRate}rs` : 'N/A'}
                  />
                  <DetailItem 
                    label="Out Labour" 
                    value={labourRecord.outCaratLabour && labourRecord.outCaratLabourRate ? `${labourRecord.outCaratLabour} × ${labourRecord.outCaratLabourRate}rs` : 'N/A'}
                  />
                   <Separator className="my-2" />
                  <DetailItem 
                    label="Total Labour Amount"
                    value={`${labourRecord.totalLabourAmount.toLocaleString()}rs`} 
                    valueClassName="text-lg font-bold text-gray-800"
                  />
                </div>
              </div>
            </main>
          </div>
        <DialogFooter className="px-6 pb-4 rounded-b-lg border-t bg-gray-50 flex-shrink-0 sm:justify-between">
            <Button 
                variant="destructive" 
                onClick={onDelete} 
            >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Record
            </Button>
            <DialogClose asChild>
                <Button variant="outline">
                    <X className="mr-2 h-4 w-4" />
                    Close
                </Button>
            </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
