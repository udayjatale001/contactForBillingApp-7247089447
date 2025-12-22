import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Logo } from '@/components/icons/logo';

export default function AboutPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight font-headline">
          About
        </h2>
      </div>
      <Card>
        <CardHeader className="items-center">
          <Logo />
          <CardTitle className="text-center pt-4">
            Aanand Sagar Billing App
          </CardTitle>
          <CardDescription>
            Version 1.0.0
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          <p>
            This application is designed to streamline the billing process for Aanand Sagar Fresh Fruit.
          </p>
          <p className="mt-4">
            Developed to provide a fast, reliable, and user-friendly experience for managers and owners.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
