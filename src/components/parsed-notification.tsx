'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';

interface ParsedNotificationProps {
  message: string;
}

// Example message: Musa bhai paid 0rs for 500 carats to Gopal Temkar via Cash. Due amount is 9500rs.
const messageRegex =
  /(.+) paid ([\d,.]+)rs for ([\d,.]+) carats to (.+) via (.+)\. Due amount is ([\d,.]+)rs\./;

export function ParsedNotification({ message }: ParsedNotificationProps) {
  const parts = message.match(messageRegex);

  if (!parts) {
    // Fallback for messages that don't match the expected format
    return <p className="font-medium text-foreground leading-snug">{message}</p>;
  }

  const [, customerName, paidAmount, totalCarat, paidTo, paymentMode, dueAmount] = parts;
  const dueAmountNumber = parseFloat(dueAmount.replace(/,/g, ''));
  const paidAmountNumber = parseFloat(paidAmount.replace(/,/g, ''));

  return (
    <div className="flex flex-col space-y-2">
      <p className="font-semibold text-foreground">{customerName}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        
        <div className='text-muted-foreground'>Paid Amount:</div>
        <div className={cn(
            'font-medium',
            paidAmountNumber > 0 ? 'text-green-600' : 'text-muted-foreground'
        )}>
            {paidAmount}rs
        </div>

        <div className='text-muted-foreground'>Due Amount:</div>
        <div className={cn(
            'font-medium',
             dueAmountNumber > 0 ? 'text-red-600' : 'text-muted-foreground'
        )}>
            {dueAmount}rs
        </div>
        
        <div className='text-muted-foreground'>Carats:</div>
        <div>{totalCarat}</div>

        <div className='text-muted-foreground'>Paid To:</div>
        <div>{paidTo}</div>

        <div className='text-muted-foreground'>Method:</div>
        <div><Badge variant="outline">{paymentMode}</Badge></div>
      </div>
    </div>
  );
}