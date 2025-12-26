
'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';
import type { Notification } from '@/lib/types';

interface ParsedNotificationProps {
  notification: Notification;
}

export function ParsedNotification({ notification }: ParsedNotificationProps) {
  const {
    customerName,
    paidAmount,
    totalCarat,
    paidTo,
    paymentMode,
    dueAmount,
  } = notification;

  if (!customerName) {
    // Fallback for old message format if needed, though data should be structured now.
    return (
      <p className="font-medium text-foreground leading-snug">
        {notification.message}
      </p>
    );
  }

  const dueAmountNumber = dueAmount || 0;
  const paidAmountNumber = paidAmount || 0;

  return (
    <div className="flex flex-col space-y-2">
      <p className="font-semibold text-foreground">{customerName}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div className="text-muted-foreground">Paid Amount:</div>
        <div
          className={cn(
            'font-medium',
            paidAmountNumber > 0 ? 'text-green-600' : 'text-muted-foreground'
          )}
        >
          {paidAmountNumber.toLocaleString()}rs
        </div>

        <div className="text-muted-foreground">Due Amount:</div>
        <div
          className={cn(
            'font-medium',
            dueAmountNumber > 0 ? 'text-red-600' : 'text-muted-foreground'
          )}
        >
          {dueAmountNumber.toLocaleString()}rs
        </div>

        <div className="text-muted-foreground">Carats:</div>
        <div>{totalCarat}</div>

        <div className="text-muted-foreground">Paid To:</div>
        <div>{paidTo}</div>

        <div className="text-muted-foreground">Method:</div>
        <div>
          <Badge variant="outline">{paymentMode}</Badge>
        </div>
      </div>
    </div>
  );
}
