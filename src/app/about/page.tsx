
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Mail, Phone, Languages, Calendar as CalendarIcon, X, Loader2, AlertTriangle, User, ChevronsUpDown, Banknote, Home, Wrench, FileText, DollarSign, Users, Bell, LayoutDashboard } from 'lucide-react';
import { Logo } from '@/components/icons/logo';
import { useLanguage } from '@/context/language-context';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useDateFilter } from '@/context/date-filter-context';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { format, setHours, setMinutes } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';
import * as React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, getDocs, writeBatch, doc, query, limit, CollectionReference } from 'firebase/firestore';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const GuideItem = ({ icon, title, children }: { icon: React.ElementType, title: string, children: React.ReactNode }) => (
    <div className="flex items-start gap-4">
        <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            {React.createElement(icon, { className: "h-5 w-5" })}
        </div>
        <div>
            <h4 className="text-lg font-semibold text-foreground">{title}</h4>
            <div className="mt-2 text-muted-foreground space-y-2">{children}</div>
        </div>
    </div>
);


export default function AboutPage() {
  const { t } = useLanguage();
  const { language, setLanguage } = useLanguage();
  const { globalDate, setGlobalDate, clearGlobalDate } = useDateFilter();
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const [showResetConfirm, setShowResetConfirm] = React.useState(false);
  const [isResetting, setIsResetting] = React.useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleLanguageChange = (checked: boolean) => {
    setLanguage(checked ? 'hi' : 'en');
  };
  
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    if (value && globalDate) {
      const [hours, minutes] = value.split(':');
      const newDate = setHours(setMinutes(globalDate, parseInt(minutes)), parseInt(hours));
      setGlobalDate(newDate);
    }
  };
  
  async function deleteCollectionInBatch(collectionRef: CollectionReference) {
    let snapshot = await getDocs(query(collectionRef, limit(500)));
    while (snapshot.size > 0) {
      const batch = writeBatch(firestore!);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      snapshot = await getDocs(query(collectionRef, limit(500)));
    }
  }


  const handleResetApp = async () => {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Firestore is not available.',
      });
      return;
    }
    setIsResetting(true);

    const collectionsToDelete = ['bills', 'customers', 'labours', 'notifications', 'tokens'];

    try {
      // Step 1: Delete all documents in the global collections
      for (const collectionName of collectionsToDelete) {
        const collectionRef = collection(firestore, collectionName);
        await deleteCollectionInBatch(collectionRef);
      }

      // Step 2: Delete all sub-collections within each manager
      const managersSnapshot = await getDocs(collection(firestore, 'managers'));
      if (!managersSnapshot.empty) {
        for (const managerDoc of managersSnapshot.docs) {
           const subcollectionsToDelete = ['bills', 'tokens'];
           for (const subcollectionName of subcollectionsToDelete) {
              const subcollectionRef = collection(firestore, 'managers', managerDoc.id, subcollectionName);
              await deleteCollectionInBatch(subcollectionRef);
           }
        }
      }
      
      toast({
        title: 'App Reset Successfully',
        description: 'All application data has been permanently deleted.',
      });

      // Force a reload to ensure all states are cleared
      window.location.reload();

    } catch (error) {
      console.error('Failed to reset app:', error);
      toast({
        variant: 'destructive',
        title: 'Reset Failed',
        description: 'An error occurred while deleting data.',
      });
    } finally {
      setIsResetting(false);
      setShowResetConfirm(false);
    }
  };

  return (
    <>
    <div className="flex-1 space-y-4 p-2 sm:p-4 md:p-8 pt-6">
       <Card>
        <CardHeader className="items-center text-center">
          <Logo />
          <CardTitle className="text-2xl pt-4">{t('app_title')}</CardTitle>
          <CardDescription>
            {t('developed_by')}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground px-4 md:px-8">
           <Separator className="my-4" />
           <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
                <AccordionTrigger className='text-xl font-bold text-foreground'>How to Use This App</AccordionTrigger>
                <AccordionContent className='pt-4'>
                    <div className="space-y-8">

                        <GuideItem icon={Home} title="1. Create Bill / Token Flow">
                            <p><strong>Token Generation:</strong> When you fill in the Customer Details (Name, Contact, Room No, Address, In/Out Carat) and click "Print Token," a <strong>Token</strong> is generated, printed, and saved in the Token History with a unique ID.</p>
                            <p><strong>Bill Generation:</strong> When you fill out the complete form (Customer, Carat, Labour, Payment details) and click "Generate Bill," a final <strong>Bill</strong> is created, displayed for printing, and all data is saved in the Bill History.</p>
                        </GuideItem>
                        
                        <GuideItem icon={FileText} title="2. Billing History Page">
                             <p>This page stores all generated <strong>Tokens</strong> and Final <strong>Bills</strong>. Each record has a unique ID that you can use to search. The search bar allows you to find records by <strong>Bill</strong> ID or <strong>Token</strong> ID.</p>
                            <p>Clicking any record opens a popup preview. From there, you can <strong>Print</strong> or <strong>Delete</strong> it. For <strong>Tokens</strong>, an "Edit / Continue" icon (✏️) allows you to redirect to the Create Bill page with the token's data auto-filled, so you can complete the bill without re-entering information.</p>
                        </GuideItem>

                        <GuideItem icon={DollarSign} title="3. Payments Page">
                            <p>This page displays a list of all customers with outstanding due amounts, showing their name, mobile number, and total due.</p>
                            <p>Clicking on a customer opens a payment popup where you can enter the amount paid. The remaining due is updated automatically. After confirming the payment, the data is saved, and a new "Payment Notification" is created in the Notifications page.</p>
                        </GuideItem>

                        <GuideItem icon={Wrench} title="4. Labour Page">
                            <p>This page stores all internal labour records separately. Each record includes the customer's name, date, In/Out Labour calculations, and the total labour amount. These records are independent and can only be deleted manually from this page.</p>
                        </GuideItem>

                        <GuideItem icon={Bell} title="5. Notifications Page">
                           <p>This page shows a feed of all recent activities, with two types of notifications:</p>
                           <ul className='list-disc pl-5 space-y-1'>
                               <li><strong>Bill Notifications (🧾):</strong> Appear when a new <strong>Bill</strong> is created.</li>
                               <li><strong>Payment Notifications (💰):</strong> Appear when a payment is made on the Payments page.</li>
                           </ul>
                           <p>Each notification clearly displays the customer name, paid amount, due amount, carats, payment method, and timestamp.</p>
                        </GuideItem>

                        <GuideItem icon={LayoutDashboard} title="6. Admin Page">
                            <ul className='list-disc pl-5 space-y-2'>
                                <li><strong>Export to Excel:</strong> Download all bill, payment, and labour data.</li>
                                <li><strong>Today’s Snapshot:</strong> View Revenue, Labour Cost, and Net Profit for the last 24 hours.</li>
                                <li><strong>Overall Summary:</strong> See total bills, revenue, due amounts, and labour charges.</li>
                                <li><strong>Analytics:</strong> View monthly/yearly graphs for sales and labour comparisons.</li>
                                <li><strong>Rate Management:</strong> Set global rates for carats and labour, and update the "Contact Us" number. These rates apply to all new bills only.</li>
                            </ul>
                        </GuideItem>

                        <GuideItem icon={Users} title="7. Customer Details Page">
                            <p>This page provides a summary for each customer, including the total carats supplied, total billed amount, and overall profit. It also features WhatsApp integration, allowing you to send:</p>
                            <ul className='list-disc pl-5 space-y-1'>
                               <li>Final <strong>Bills</strong></li>
                               <li><strong>Tokens</strong></li>
                               <li>Due Amount reminders</li>
                               <li>Customer summaries</li>
                           </ul>
                        </GuideItem>

                    </div>
                </AccordionContent>
            </AccordionItem>
          </Accordion>
          <Separator className="my-4" />
          <div className="flex flex-col items-center justify-center space-y-6 my-6">
             <div className="flex items-center space-x-2">
                <Label htmlFor="language-toggle" className="text-lg font-semibold text-foreground">
                  {t('language_toggle_label')}
                </Label>
                <Switch
                  id="language-toggle"
                  checked={language === 'hi'}
                  onCheckedChange={handleLanguageChange}
                  aria-label="Toggle language between English and Hindi"
                />
                 <Languages className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <Label className="text-lg font-semibold text-foreground">Global Date Filter</Label>
                 <div className="flex flex-col sm:flex-row gap-2 mt-2">
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'w-full sm:w-[280px] justify-start text-left font-normal',
                            !globalDate && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {globalDate ? format(globalDate, 'PPP HH:mm') : <span>Pick a date & time</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={globalDate || undefined}
                          onSelect={(date) => {
                            setGlobalDate(date || new Date());
                            setIsCalendarOpen(false);
                          }}
                          initialFocus
                        />
                         <div className="p-2 border-t">
                            <Input 
                                type="time" 
                                value={globalDate ? format(globalDate, 'HH:mm') : ''}
                                onChange={handleTimeChange}
                            />
                        </div>
                      </PopoverContent>
                    </Popover>
                    {globalDate && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={clearGlobalDate}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                </div>
                 <Alert className="mt-4 text-center">
                    <AlertDescription>
                        Selected date & time will be applied to the entire app.
                    </AlertDescription>
                </Alert>
              </div>
          </div>
           <Separator className="my-6" />
           <div className="text-center">
             <h3 className="text-lg font-semibold text-foreground mb-4">{t('contact_devs')}</h3>
             <div className="flex flex-col md:flex-row justify-center items-center gap-4 md:gap-6 text-foreground">
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

    <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete all application data. All bills, customers, tokens, and records will be lost forever.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleResetApp}
            disabled={isResetting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Yes, Delete Everything
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
