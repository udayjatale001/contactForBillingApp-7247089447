
'use client';

import { Banana } from 'lucide-react';
import { useLanguage } from '@/context/language-context';

export function Logo() {
  const { t } = useLanguage();
  return (
    <div className="group flex items-center gap-2 text-primary">
      <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
        <Banana className="h-6 w-6 text-primary" />
      </div>
      <div className="flex flex-col">
        <span className="font-bold text-lg font-headline text-foreground leading-tight">
          Ananad Sagar
        </span>
        <span className="text-xs text-muted-foreground leading-tight">
          {t('billing_app')}
        </span>
      </div>
    </div>
  );
}
