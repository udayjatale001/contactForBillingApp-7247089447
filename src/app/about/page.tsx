
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Mail, Phone } from 'lucide-react';
import { Logo } from '@/components/icons/logo';

export default function AboutPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight font-headline">
          About This App
        </h2>
      </div>
      <Card>
        <CardHeader className="items-center text-center">
          <Logo />
          <CardTitle className="text-2xl pt-4">Ananad Sagar Billing App</CardTitle>
          <CardDescription>
            Developed by: Uday Jatale & Koushal Mahajan
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground px-4 md:px-8">
          <Separator className="my-4" />
          <div className="space-y-4 text-center max-w-3xl mx-auto">
              <p>
                This application is designed to manage and simplify the banana ripening chamber business. It helps chamber owners maintain accurate records of In-Carat and Out-Carat bananas stored in the chamber.
              </p>
              <p>
                The system calculates charges based on carat size: Small Carat (e.g., ₹17 per carat) and Big Carat (e.g., ₹20 per carat). Bananas are stored for a standard period of 3 days, and the app automatically manages billing based on quantity, carat size, and storage duration. It provides clear billing details and helps track inventory, payments, and overall business transactions efficiently.
              </p>
              <p>
                This application is built to ensure transparency, accuracy, and smooth day-to-day chamber operations.
              </p>
          </div>
           <Separator className="my-6" />
           <div className="text-center">
             <h3 className="text-lg font-semibold text-foreground mb-4">For app and website development, contact:</h3>
             <div className="flex flex-col md:flex-row justify-center items-center gap-6 text-foreground">
                <a href="mailto:help.hope8236@gmail.com" className="flex items-center gap-2 hover:text-primary transition-colors">
                    <Mail className="h-5 w-5" />
                    <span>help.hope8236@gmail.com</span>
                </a>
                <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                    <a href="tel:7247089447" className="flex items-center gap-2 hover:text-primary transition-colors">
                        <Phone className="h-5 w-5" />
                        <span>UDAY JATALE: 7247089447</span>
                    </a>
                     <a href="tel:8236001216" className="flex items-center gap-2 hover:text-primary transition-colors">
                        <Phone className="h-5 w-5" />
                        <span>KOUSHAL MAHAJAN: 8236001216</span>
                    </a>
                </div>
             </div>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
