import { BillingForm } from '@/components/billing-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  return (
    <div className="flex-1 space-y-4 p-2 sm:p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight font-headline">
          Create Bill
        </h2>
      </div>
      <BillingForm />
    </div>
  );
}
