
'use client';
import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  DollarSign,
  Users,
  CreditCard,
  Activity,
  Loader2,
  AlertCircle,
  FileText,
  Calendar as CalendarIcon,
  Settings,
  Save,
  Wrench,
  ClipboardList,
  Phone,
  TrendingUp,
  X,
  MessageSquare,
  Trash2,
  FileDown,
  ArrowRight,
  Wallet,
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc, getDoc, getDocs, writeBatch, updateDoc, runTransaction } from 'firebase/firestore';
import type { Bill, AppSettings, Labour, Customer } from '@/lib/types';
import { format, getYear, getMonth, isSameDay, startOfDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { composeReminderMessage } from '@/ai/flows/compose-reminder-message';
import { Input } from './ui/input';
import { NotificationsFeed } from './notifications-feed';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { useLanguage } from '@/context/language-context';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { useDateFilter } from '@/context/date-filter-context';
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';
import { CustomerPaymentDialog } from './customer-payment-dialog';


const ALL_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

type AggregatedDueCustomer = {
  id: string;
  name: string;
  contactNumber?: string;
  totalDueAmount: number;
  lastActivity: string;
};


function ManageRatesCard({ isOwner }: { isOwner: boolean }) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const settingsDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'app_settings', 'rates');
  }, [firestore]);

  const { data: appSettings, isLoading } = useDoc<AppSettings>(settingsDocRef);

  const [smallCaratRate, setSmallCaratRate] = React.useState<number | string>('');
  const [bigCaratRate, setBigCaratRate] = React.useState<number | string>('');
  const [labourRate, setLabourRate] = React.useState<number | string>('');
  const [contactUsNumber, setContactUsNumber] = React.useState<string>('');
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (appSettings) {
      setSmallCaratRate(appSettings.smallCaratRate ?? '');
      setBigCaratRate(appSettings.bigCaratRate ?? '');
      setLabourRate(appSettings.labourRate ?? '');
      setContactUsNumber(appSettings.contactUsNumber ?? '');
    }
  }, [appSettings]);

  const handleSaveRates = async () => {
    if (!firestore || !settingsDocRef) return;

    setIsSaving(true);
    const newRates: AppSettings = {
      smallCaratRate: Number(smallCaratRate) || 0,
      bigCaratRate: Number(bigCaratRate) || 0,
      labourRate: Number(labourRate) || 0,
      contactUsNumber: contactUsNumber,
    };

    setDocumentNonBlocking(settingsDocRef, newRates, { merge: true });

    toast({
      title: 'Settings Updated',
      description: 'The new settings have been saved and will apply to new bills.',
    });
    setIsSaving(false);
  };

  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings />
          Manage Global Settings
        </CardTitle>
        <CardDescription>
          Update billing rates and contact information. Changes apply to all new bills.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Small Carat Rate</label>
          <Input
            type="number"
            placeholder="e.g., 17"
            value={smallCaratRate}
            onChange={(e) => setSmallCaratRate(e.target.value)}
            disabled={!isOwner || isLoading || isSaving}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Big Carat Rate</label>
          <Input
            type="number"
            placeholder="e.g., 20"
            value={bigCaratRate}
            onChange={(e) => setBigCaratRate(e.target.value)}
            disabled={!isOwner || isLoading || isSaving}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Labour Rate</label>
          <Input
            type="number"
            placeholder="e.g., 5"
            value={labourRate}
            onChange={(e) => setLabourRate(e.target.value)}
            disabled={!isOwner || isLoading || isSaving}
          />
        </div>
         <div className="space-y-2">
          <label className="text-sm font-medium">Contact Us Number</label>
          <Input
            type="tel"
            placeholder="e.g., 9876543210"
            value={contactUsNumber}
            onChange={(e) => setContactUsNumber(e.target.value)}
            disabled={!isOwner || isLoading || isSaving}
          />
        </div>
      </CardContent>
      <CardContent>
        <Button onClick={handleSaveRates} disabled={!isOwner || isLoading || isSaving} className="w-full">
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
}

export function OwnerDashboard() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { globalDate } = useDateFilter();
  
  const [isOwner, setIsOwner] = React.useState<boolean | null>(null);
  
  const [selectedYear, setSelectedYear] = React.useState<string>(new Date().getFullYear().toString());
  const [isExporting, setIsExporting] = React.useState(false);

  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [customerToDelete, setCustomerToDelete] = React.useState<Customer | null>(null);

  React.useEffect(() => {
    if(user && firestore) {
      const checkRole = async () => {
        const ownerDocRef = doc(firestore, 'roles_owner', user.uid);
        const ownerDoc = await getDoc(ownerDocRef);
        setIsOwner(ownerDoc.exists());
      }
      checkRole();
    }
  }, [user, firestore]);
  
  const billsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'bills'), orderBy('createdAt', 'desc'));
  }, [firestore]);
  const { data: allBills, isLoading: isLoadingBills, error: billsError } = useCollection<Bill>(billsQuery);

  const customersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'customers'), orderBy('totalDueAmount', 'desc'));
  }, [firestore]);
  const { data: customers, isLoading: isLoadingCustomers, forceRefetch } = useCollection<Customer>(customersQuery);

  const topDueCustomers = React.useMemo(() => {
    if (!customers) return [];
    return customers.filter(c => c.totalDueAmount > 0).slice(0, 5);
  }, [customers]);

  const {
    totalAmount,
    totalRevenue,
    totalDue,
    totalSales,
    totalLabour,
    todaysRevenue,
    todaysLabourCost,
    todaysNetProfit,
    monthlyData,
    yearlyData,
    monthlyLabourData,
    yearlyLabourData,
    recentBills,
    availableYears,
  } = React.useMemo(() => {
    const initialResult = {
      totalAmount: 0,
      totalRevenue: 0,
      totalDue: 0,
      totalSales: 0,
      totalLabour: 0,
      todaysRevenue: 0,
      todaysLabourCost: 0,
      todaysNetProfit: 0,
      monthlyData: ALL_MONTHS.map(month => ({ month, total: 0 })),
      yearlyData: [],
      monthlyLabourData: ALL_MONTHS.map(month => ({ month, total: 0 })),
      yearlyLabourData: [],
      recentBills: [],
      availableYears: [] as string[],
    };

    if (!allBills) {
      return initialResult;
    }
    
    const todayFilterStart = startOfDay(globalDate || new Date());
    
    const todaysBills = allBills.filter(bill => isSameDay(new Date(bill.createdAt), todayFilterStart));


    const todaysRevenue = todaysBills.reduce((acc, bill) => acc + bill.paidAmount, 0);
    const todaysLabourCost = todaysBills.reduce((acc, bill) => acc + (bill.totalLabourAmount || 0), 0);
    const todaysNetProfit = todaysRevenue - todaysLabourCost;

    const yearsInData = new Set<string>();
    allBills.forEach(bill => yearsInData.add(getYear(new Date(bill.createdAt)).toString()));
    const allAvailableYears = Array.from(yearsInData).sort((a,b) => Number(b) - Number(a));

    const filteredBills = globalDate 
        ? allBills.filter(bill => isSameDay(new Date(bill.createdAt), globalDate))
        : allBills.filter(bill => isSameDay(new Date(bill.createdAt), new Date()));
    

    const totalAmount = filteredBills.reduce((acc, bill) => acc + bill.totalAmount, 0);
    const totalRevenue = filteredBills.reduce((acc, bill) => acc + bill.paidAmount, 0);
    const totalDue = filteredBills.reduce((acc, bill) => acc + bill.dueAmount, 0);
    const totalSales = filteredBills.length;
    const totalLabour = filteredBills.reduce((acc, bill) => acc + (bill.totalLabourAmount || 0), 0);
    
    // --- Chart Data Calculations ---
    const yearlySales: { [key: string]: number } = {};
    const yearlyLabour: { [key: string]: number } = {};
    const monthlySalesForYear: { [key: string]: number } = Object.fromEntries(ALL_MONTHS.map(m => [m, 0]));
    const monthlyLabourForYear: { [key: string]: number } = Object.fromEntries(ALL_MONTHS.map(m => [m, 0]));
    
    const yearForMonthlyChart = globalDate ? getYear(globalDate).toString() : selectedYear;
    const billsForMonthlyChart = allBills.filter(bill => getYear(new Date(bill.createdAt)).toString() === yearForMonthlyChart);

    billsForMonthlyChart.forEach(bill => {
        const month = format(new Date(bill.createdAt), 'MMM');
        monthlySalesForYear[month] = (monthlySalesForYear[month] || 0) + bill.paidAmount;
        monthlyLabourForYear[month] = (monthlyLabourForYear[month] || 0) + (bill.totalLabourAmount || 0);
    });

    const formattedMonthlyData = ALL_MONTHS.map(month => ({
      month,
      total: monthlySalesForYear[month] || 0,
    }));
    
    allBills.forEach(bill => {
        const year = getYear(new Date(bill.createdAt)).toString();
        yearlySales[year] = (yearlySales[year] || 0) + bill.paidAmount;
        yearlyLabour[year] = (yearlyLabour[year] || 0) + (bill.totalLabourAmount || 0);
    });

    const sortedYearsForChart = Array.from(yearsInData).sort((a, b) => Number(a) - Number(b));
    const formattedYearlyData = sortedYearsForChart.map(year => ({
        year,
        total: yearlySales[year] || 0,
    }));
    const formattedYearlyLabourData = sortedYearsForChart.map(year => ({
        year,
        total: yearlyLabour[year] || 0,
    }));

    const formattedMonthlyLabourData = ALL_MONTHS.map(month => ({
        month,
        total: monthlyLabourForYear[month] || 0,
    }));

    return {
      totalAmount,
      totalRevenue,
      totalDue,
      totalSales,
      totalLabour,
      todaysRevenue,
      todaysLabourCost,
      todaysNetProfit,
      monthlyData: formattedMonthlyData,
      yearlyData: formattedYearlyData,
      monthlyLabourData: formattedMonthlyLabourData,
      yearlyLabourData: formattedYearlyLabourData,
      recentBills: allBills.slice(0, 5),
      availableYears: allAvailableYears,
    };
  }, [allBills, globalDate, selectedYear]);

  const handleUpdatePayment = async (
    customer: Customer, 
    paidAmount: number, 
    paymentMode: 'Cash' | 'Online Payment', 
    paidTo: 'Gopal Temkar' | 'Yuvaraj Temkar' | 'Suyash Temkar' | 'Gajananad Murtankar',
    paymentDate: Date
    ) => {
    if (!firestore || !user) return;
    setIsProcessing(true);

        const customerRef = doc(firestore, 'customers', customer.id);
    
    const paymentBill: Bill = {
        id: uuidv4(),
        managerId: user.uid,
        customerName: customer.name,
        contactNumber: customer.contactNumber,
        totalCarat: 0,
        caratType: 'N/A',
        totalAmount: paidAmount,
        paidAmount: paidAmount,
        dueAmount: 0,
        paidTo: paidTo,
        paymentMode: paymentMode,
        createdAt: paymentDate.toISOString(),
    };

    try {
      await runTransaction(firestore, async (transaction) => {
        const customerDoc = await transaction.get(customerRef);
        if (!customerDoc.exists()) {
          throw 'Document does not exist!';
        }
        const currentDue = customerDoc.data().totalDueAmount;
        const newDue = currentDue - paidAmount;

        transaction.update(customerRef, { 
            totalDueAmount: newDue > 0 ? newDue : 0,
            lastActivity: paymentDate.toISOString(),
        });
        
        const globalBillRef = doc(firestore, 'bills', paymentBill.id);
        transaction.set(globalBillRef, paymentBill);

        const managerBillRef = doc(firestore, 'managers', user.uid, 'bills', paymentBill.id);
        transaction.set(managerBillRef, paymentBill);
      });

      toast({ title: 'Payment updated successfully!' });
      forceRefetch(); 
      setSelectedCustomer(null);
    } catch (e) {
      console.error('Payment update failed: ', e);
      toast({ variant: 'destructive', title: 'Payment update failed.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteRequest = (customer: Customer) => {
    setCustomerToDelete(customer);
    setSelectedCustomer(null);
  };

    const confirmDeleteCustomer = async () => {
    if (!firestore || !customerToDelete) return;
    
    const customerRef = doc(firestore, 'customers', customerToDelete.id);
    try {
        await updateDoc(customerRef, { totalDueAmount: 0 });
        toast({ title: `Due cleared for ${customerToDelete.name}` });
        forceRefetch();
    } catch (e) {
        console.error('Failed to clear due: ', e);
        toast({ variant: 'destructive', title: 'Failed to clear due.' });
    } finally {
        setCustomerToDelete(null);
    }
  };

  const handleWhatsAppReminder = (customer: Customer | AggregatedDueCustomer, paidAmount?: number, remainingDue?: number, date?: Date) => {
    if (!customer.contactNumber) return;
    let message = '';
    if (paidAmount && remainingDue !== undefined && date) {
        message = `Thank you for your payment, ${customer.name}!\n\nPaid Amount: ₹${paidAmount.toLocaleString()}\nRemaining Due: ₹${remainingDue.toLocaleString()}\nDate: ${format(date, 'PPpp')}\n\nThank you for your business! 😊`;
    } else {
        message = t('whatsapp_reminder_message', customer.totalDueAmount.toLocaleString());
    }
    const whatsappUrl = `https://wa.me/91${customer.contactNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleExport = async () => {
    if (!firestore) return;
    setIsExporting(true);

    try {
        const billsQuery = query(collection(firestore, 'bills'), orderBy('createdAt', 'desc'));
        const labourQuery = query(collection(firestore, 'labours'), orderBy('createdAt', 'desc'));

        const [billsSnapshot, labourSnapshot] = await Promise.all([
            getDocs(billsQuery),
            getDocs(labourQuery)
        ]);

        const billsData = billsSnapshot.docs.map(doc => {
            const data = doc.data() as Bill;
            return {
                'Bill ID': data.id,
                'Customer Name': data.customerName,
                'Room Number': data.roomNumber || 'N/A',
                'Contact Number': data.contactNumber || 'N/A',
                'Date': format(new Date(data.createdAt), 'yyyy-MM-dd pp'),
                'In Carat': data.inCarat || 0,
                'Out Carat': data.outCarat || 0,
                'Total Carat': data.totalCarat,
                'Carat Type': data.caratType,
                'Small Carat Qty': data.smallCarat || 0,
                'Small Carat Rate': data.smallCaratRate || 0,
                'Big Carat Qty': data.bigCarat || 0,
                'Big Carat Rate': data.bigCaratRate || 0,
                'Total Amount': data.totalAmount,
                'Paid Amount': data.paidAmount,
                'Due Amount': data.dueAmount,
                'Payment Mode': data.paymentMode,
                'Paid To': data.paidTo,
                'Total Labour Amount': data.totalLabourAmount || 0
            };
        });

        const labourData = labourSnapshot.docs.map(doc => {
            const data = doc.data() as Labour;
            return {
                'Record ID': data.id,
                'Bill ID': data.billId,
                'Customer Name': data.customerName,
                'Date': format(new Date(data.createdAt), 'yyyy-MM-dd'),
                'In Carat Labour': data.inCaratLabour || 0,
                'In Carat Labour Rate': data.inCaratLabourRate || 0,
                'Out Carat Labour': data.outCaratLabour || 0,
                'Out Carat Labour Rate': data.outCaratLabourRate || 0,
                'Total Labour Amount': data.totalLabourAmount
            };
        });

        const wb = XLSX.utils.book_new();
        const billsSheet = XLSX.utils.json_to_sheet(billsData);
        const labourSheet = XLSX.utils.json_to_sheet(labourData);

        XLSX.utils.book_append_sheet(wb, billsSheet, 'All Bills');
        XLSX.utils.book_append_sheet(wb, labourSheet, 'Labour Records');

        XLSX.writeFile(wb, 'Anand_Sagar_Data.xlsx');

        toast({
            title: 'Export Successful',
            description: 'All data has been exported to an Excel file.',
        });

    } catch (error) {
        console.error("Failed to export data:", error);
        toast({
            variant: 'destructive',
            title: 'Export Failed',
            description: 'Could not export data. Please check permissions and try again.',
        });
    } finally {
        setIsExporting(false);
    }
  };

  const isLoading = isUserLoading || isLoadingBills || isOwner === null || isLoadingCustomers;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (billsError) {
    return (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <h3 className="mt-4 text-lg font-semibold text-destructive">Failed to Load Dashboard</h3>
            <p className="mt-1 text-sm text-destructive/80">
                Could not fetch billing data. Please check your connection and security rules.
            </p>
        </div>
    );
  }

  return (
    <>
    <div className="space-y-4">
      
       <Card>
        <CardHeader>
             <CardTitle className='flex flex-col md:flex-row items-start md:items-center justify-between gap-4'>
                <span>Data Management</span>
                 <Button onClick={handleExport} disabled={isExporting} className='w-full md:w-auto'>
                    {isExporting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <FileDown className="mr-2 h-4 w-4" />
                    )}
                    Export All Data to Excel
                </Button>
            </CardTitle>
            <CardDescription>Download a complete record of all bills and labour charges.</CardDescription>
        </CardHeader>
       </Card>

      <Card>
        <CardHeader className='pb-2'>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
                <CardTitle className='flex items-center gap-2 text-base'>
                    <TrendingUp className='h-5 w-5' />
                    {globalDate ? `${format(globalDate, 'PPP')} Snapshot` : "Today's Snapshot"}
                </CardTitle>
            </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{todaysRevenue.toLocaleString()}rs</div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Labour Cost</CardTitle>
                    <Wrench className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{todaysLabourCost.toLocaleString()}rs</div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-600">{todaysNetProfit.toLocaleString()}rs</div>
                </CardContent>
            </Card>
        </CardContent>
      </Card>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAmount.toLocaleString()}rs</div>
            <p className="text-xs text-muted-foreground">
              Total value of bills
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRevenue.toLocaleString()}rs</div>
            <p className="text-xs text-muted-foreground">
              Total paid amount
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Due</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDue.toLocaleString()}rs</div>
            <p className="text-xs text-muted-foreground">
              Total outstanding
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Labour Paid</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLabour.toLocaleString()}rs</div>
            <p className="text-xs text-muted-foreground">
              Total labour charges
            </p>
          </CardContent>
        </Card>
        <Card className='col-span-2 md:col-span-1'>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{totalSales}</div>
            <p className="text-xs text-muted-foreground">Total bills generated</p>
          </CardContent>
        </Card>
        
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <NotificationsFeed />
        
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Due Customers</CardTitle>
            <CardDescription>
              Highest outstanding payments. Click a customer to pay.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingCustomers ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : topDueCustomers.length > 0 ? (
              topDueCustomers.map((customer) => (
                <div 
                    key={customer.id} 
                    onClick={() => setSelectedCustomer(customer)}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg gap-4 hover:bg-muted/50 cursor-pointer transition-colors"
                >
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-lg truncate">{customer.name.toUpperCase()}</p>
                        <div className="flex items-center gap-2 mt-1">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a href={`tel:${customer.contactNumber}`} className="text-sm text-blue-500 hover:underline" onClick={e => e.stopPropagation()}>
                            {customer.contactNumber || 'No number'}
                        </a>
                        </div>
                    </div>

                    <div className="w-full sm:w-auto flex items-center justify-between gap-2">
                        <div className="text-right">
                            <p className="text-xl font-bold text-destructive">{customer.totalDueAmount.toLocaleString()}rs</p>
                            <p className="text-xs text-muted-foreground">Due Amount</p>
                        </div>
                    </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Wallet className="mx-auto h-10 w-10 text-muted-foreground" />
                <h3 className="mt-4 text-md font-semibold">All Dues Cleared</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  There are no customers with outstanding payments.
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className='justify-center'>
             <Button asChild variant="outline">
                <Link href="/payments">
                    Go to Payments Page <ArrowRight className='ml-2 h-4 w-4' />
                </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Tabs defaultValue="sales">
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <CardTitle>Analytics</CardTitle>
                        <CardDescription>
                            Detailed reports for sales and labour. Select a year to see monthly data.
                        </CardDescription>
                    </div>
                     <div className="flex items-center gap-4 w-full md:w-auto">
                        <Select value={selectedYear} onValueChange={setSelectedYear} >
                            <SelectTrigger className="w-full md:w-[180px]">
                                <SelectValue placeholder="Select Year" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableYears.map(year => (
                                    <SelectItem key={year} value={year}>{year}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                       <TabsList>
                            <TabsTrigger value="sales">Sales Report</TabsTrigger>
                            <TabsTrigger value="labour">Labour Report</TabsTrigger>
                        </TabsList>
                    </div>
                </div>
            </CardHeader>
            <TabsContent value="sales">
                <Tabs defaultValue="monthly">
                    <CardHeader className="pt-0">
                         <div className="flex justify-end items-center gap-2">
                           <TabsList>
                                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                                <TabsTrigger value="yearly">Yearly</TabsTrigger>
                            </TabsList>
                        </div>
                    </CardHeader>
                    <TabsContent value="monthly">
                        <CardContent className="pl-2">
                            <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                                <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={value => `${value.toLocaleString()}rs`}/>
                                <Tooltip cursor={{ fill: 'hsl(var(--accent))', radius: 'var(--radius)' }} contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }} formatter={(value: number) => `${value.toLocaleString()}rs`} />
                                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </TabsContent>
                    <TabsContent value="yearly">
                        <CardContent className="pl-2">
                            <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={yearlyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                                <XAxis dataKey="year" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={value => `${value.toLocaleString()}rs`}/>
                                <Tooltip cursor={{ fill: 'hsl(var(--accent))', radius: 'var(--radius)' }} contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }} formatter={(value: number) => `${value.toLocaleString()}rs`} />
                                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </TabsContent>
                </Tabs>
            </TabsContent>
            <TabsContent value="labour">
                 <Tabs defaultValue="monthly">
                    <CardHeader className="pt-0">
                         <div className="flex justify-end items-center gap-2">
                           <TabsList>
                                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                                <TabsTrigger value="yearly">Yearly</TabsTrigger>
                            </TabsList>
                        </div>
                    </CardHeader>
                    <TabsContent value="monthly">
                        <CardContent className="pl-2">
                            <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={monthlyLabourData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                                <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={value => `${value.toLocaleString()}rs`}/>
                                <Tooltip cursor={{ fill: 'hsl(var(--accent))', radius: 'var(--radius)' }} contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }} formatter={(value: number) => `${value.toLocaleString()}rs`} />
                                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </TabsContent>
                    <TabsContent value="yearly">
                        <CardContent className="pl-2">
                            <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={yearlyLabourData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                                <XAxis dataKey="year" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={value => `${value.toLocaleString()}rs`}/>
                                <Tooltip cursor={{ fill: 'hsl(var(--accent))', radius: 'var(--radius)' }} contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }} formatter={(value: number) => `${value.toLocaleString()}rs`} />
                                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </TabsContent>
                </Tabs>
            </TabsContent>
        </Card>
      </Tabs>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-full lg:col-span-4">
            <CardHeader>
                <CardTitle>Recent Bills</CardTitle>
                <CardDescription>Latest 5 bills generated.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
            {recentBills && recentBills.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Due</TableHead>
                        <TableHead>Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {recentBills.map(bill => (
                        <TableRow key={bill.id}>
                            <TableCell className="font-medium">{bill.customerName}</TableCell>
                            <TableCell>{bill.totalAmount.toLocaleString()}rs</TableCell>
                            <TableCell>
                            <Badge variant={bill.dueAmount > 0 ? 'destructive' : 'outline'}>
                                {bill.dueAmount > 0 ? `${bill.dueAmount.toLocaleString()}rs` : 'Paid'}
                            </Badge>
                            </TableCell>
                            <TableCell>{format(new Date(bill.createdAt), 'PPp')}</TableCell>                        
                        </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                    <div className="text-center py-16">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No Bills Found</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        No bills were generated in this period.
                    </p>
                </div>
            )}
            </CardContent>
        </Card>
        <ManageRatesCard isOwner={!!isOwner} />
      </div>

    </div>

    <CustomerPaymentDialog
        customer={selectedCustomer}
        open={!!selectedCustomer}
        onOpenChange={setSelectedCustomer}
        onConfirmPayment={handleUpdatePayment}
        onDelete={handleDeleteRequest}
        onWhatsApp={handleWhatsAppReminder}
        isProcessing={isProcessing}
      />

    <AlertDialog open={!!customerToDelete} onOpenChange={() => setCustomerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear the outstanding due for <span className="font-semibold">{customerToDelete?.name}</span> by setting it to 0. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCustomer} className='bg-destructive hover:bg-destructive/90'>
                Clear Due
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </>
  );
}
