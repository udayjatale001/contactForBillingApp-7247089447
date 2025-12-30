
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Mail, Phone, Languages, Calendar as CalendarIcon, X, Loader2, AlertTriangle } from 'lucide-react';
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
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight font-headline">
          {t('about_this_app')}
        </h2>
      </div>
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
          <Separator className="my-4" />
          <div className="space-y-4 text-center max-w-3xl mx-auto">
              <p>
                {t('about_p1')}
              </p>
              <p>
                {t('about_p2')}
              </p>
              <p>
                {t('about_p3')}
              </p>
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
           
           <Separator className="my-6" />

            <Card className="border-destructive bg-destructive/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle />
                        Danger Zone
                    </CardTitle>
                    <CardDescription>
                        These actions are irreversible. Proceed with caution.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row items-center justify-between rounded-lg border border-destructive/20 p-4">
                        <div>
                            <h3 className="font-semibold text-foreground">Reset App</h3>
                            <p className="text-sm text-muted-foreground">Permanently delete all bills, customers, notifications, and other data.</p>
                        </div>
                         <Button
                            variant="destructive"
                            onClick={() => setShowResetConfirm(true)}
                            className="mt-2 sm:mt-0 sm:ml-4 flex-shrink-0"
                            disabled={isResetting}
                        >
                            {isResetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Reset App
                        </Button>
                    </div>
                </CardContent>
            </Card>

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
