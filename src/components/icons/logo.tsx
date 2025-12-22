import { Apple } from 'lucide-react';

export function Logo() {
  return (
    <div className="group flex items-center gap-2 text-primary">
      <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
        <Apple className="h-6 w-6 text-primary" />
      </div>
      <div className="flex flex-col">
        <span className="font-bold text-lg font-headline text-foreground leading-tight">
          Aanand Sagar
        </span>
        <span className="text-xs text-muted-foreground leading-tight">
          Billing App
        </span>
      </div>
    </div>
  );
}
