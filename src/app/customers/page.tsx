
'use client';

import { useLanguage } from '@/context/language-context';

export default function CustomersPage() {
  const { t } = useLanguage();

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight font-headline">
          {t('customers')}
        </h2>
      </div>
      {/* This is a blank page content area */}
    </div>
  );
}
