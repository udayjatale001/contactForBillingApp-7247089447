
'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';
import type { Notification } from '@/lib/types';
import { ClipboardList, Wallet } from 'lucide-react';

interface ParsedNotificationProps {
  notification: Notification;
}

const notificationTypes = {
  'new-bill': {
    label: 'New Bill Created',
    icon: ClipboardList,
    color: 'text-blue-500',
  },
  'payment-update': {
    label: 'Payment Update',
    icon: Wallet,
    color: 'text-green-600',
  },
};


const MemoizedParsedNotification = React.memo(function ParsedNotification({ notification }: ParsedNotificationProps) {
  if (!notification) {
    return null;
  }
  
  const {
    customerName,
    paidAmount,
    totalCarat,
    paidTo,
    paymentMode,
    dueAmount,
    type,
  } = notification;

  const notificationInfo = notificationTypes[type] || {
    label: 'Notification',
    icon: ClipboardList,
    color: 'text-gray-500',
  };
  const Icon = notificationInfo.icon;


  if (!customerName) {
    // Fallback for old message format if needed
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
      <div className='flex items-center gap-2'>
        <Icon className={cn('h-5 w-5', notificationInfo.color)} />
        <p className="font-semibold text-foreground">{notificationInfo.label} for {customerName}</p>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm pl-7">
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
});

export { MemoizedParsedNotification as ParsedNotification };
