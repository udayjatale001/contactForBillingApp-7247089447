import { Wrench } from 'lucide-react';

export default function LaboursPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
          <Wrench /> Labours
        </h2>
      </div>
      <p className="text-muted-foreground">Manage your labour details here.</p>
    </div>
  );
}
