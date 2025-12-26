
'use client';
import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
  Calendar,
  Settings,
  Save,
  Wrench,
  ClipboardList,
  Phone,
  TrendingUp,
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, setDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc, getDoc } from 'firebase/firestore';
import type { Bill, AppSettings } from '@/lib/types';
import { format, getYear, getMonth, subHours } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { composeReminderMessage } from '@/ai/flows/compose-reminder-message';
import { Input } from './ui/input';
import { NotificationsFeed } from './notifications-feed';

const ALL_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

type AggregatedDueCustomer = {
  customerName: string;
  contactNumber?: string;
  totalDueAmount: number;
  lastBillDate: string; // Storing as ISO string
  lastBillIsoDate: string;
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
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (appSettings) {
      setSmallCaratRate(appSettings.smallCaratRate ?? '');
      setBigCaratRate(appSettings.bigCaratRate ?? '');
      setLabourRate(appSettings.labourRate ?? '');
    }
  }, [appSettings]);

  const handleSaveRates = async () => {
    if (!firestore || !settingsDocRef) return;

    setIsSaving(true);
    const newRates: AppSettings = {
      smallCaratRate: Number(smallCaratRate) || 0,
      bigCaratRate: Number(bigCaratRate) || 0,
      labourRate: Number(labourRate) || 0,
    };

    setDocumentNonBlocking(settingsDocRef, newRates, { merge: true });

    toast({
      title: 'Rates Updated',
      description: 'The new rates have been saved and will apply to new bills.',
    });
    setIsSaving(false);
  };

  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings />
          Manage Rates
        </CardTitle>
        <CardDescription>
          Update the billing rates. Changes apply to all new bills.
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
      </CardContent>
      <CardContent>
        <Button onClick={handleSaveRates} disabled={!isOwner || isLoading || isSaving} className="w-full">
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Rates
        </Button>
      </CardContent>
    </Card>
  );
}


export function OwnerDashboard() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [remindersState, setRemindersState] = React.useState<{ [key: string]: 'sending' | 'sent' | 'error' }>({});
  const [isOwner, setIsOwner] = React.useState<boolean | null>(null);
  
  const [selectedYear, setSelectedYear] = React.useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = React.useState<string>((new Date().getMonth() + 1).toString().padStart(2, '0'));

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
  
  const collectionPath = React.useMemo(() => {
    if (isOwner === null || !user) return null;
    return isOwner ? 'bills' : `managers/${user.uid}/bills`;
  }, [isOwner, user]);

  const billsQuery = useMemoFirebase(() => {
    if (!firestore || !collectionPath) return null;
    return query(collection(firestore, collectionPath), orderBy('createdAt', 'desc'));
  }, [firestore, collectionPath]);

  const { data: allBills, isLoading: isLoadingBills, error: billsError } = useCollection<Bill>(billsQuery);

  const {
    totalAmount,
    totalRevenue,
    totalDue,
    totalSales,
    totalLabour,
    todaysRevenue,
    todaysLabourCost,
    todaysNetProfit,
    inactiveCustomers,
    monthlyData,
    yearlyData,
    monthlyLabourData,
    yearlyLabourData,
    dueBills,
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
      inactiveCustomers: 0,
      monthlyData: ALL_MONTHS.map(month => ({ month, total: 0 })),
      yearlyData: [],
      monthlyLabourData: ALL_MONTHS.map(month => ({ month, total: 0 })),
      yearlyLabourData: [],
      dueBills: [],
      recentBills: [],
      availableYears: [new Date().getFullYear().toString()],
    };

    if (!allBills) {
      return initialResult;
    }

    const now = new Date();
    const twentyFourHoursAgo = subHours(now, 24);

    const todaysBills = allBills.filter(bill => new Date(bill.createdAt) >= twentyFourHoursAgo);

    const todaysRevenue = todaysBills.reduce((acc, bill) => acc + bill.paidAmount, 0);
    const todaysLabourCost = todaysBills.reduce((acc, bill) => acc + (bill.totalLabourAmount || 0), 0);
    const todaysNetProfit = todaysRevenue - todaysLabourCost;

    const years = new Set<string>();
    allBills.forEach(bill => years.add(getYear(new Date(bill.createdAt)).toString()));
    const earliestYearInHistory = Array.from(years).sort((a,b) => Number(a) - Number(b))[0];
    const earliestYear = earliestYearInHistory ? parseInt(earliestYearInHistory) : new Date().getFullYear();
    
    const allAvailableYears = Array.from({length: new Date().getFullYear() - earliestYear + 1}, (_, i) => (earliestYear + i).toString()).reverse();


    // Filter bills based on selected month and year
    const filteredBills = allBills.filter(bill => {
      const billDate = new Date(bill.createdAt);
      const yearMatches = selectedYear === 'all' || getYear(billDate).toString() === selectedYear;
      const monthMatches = selectedMonth === 'all' || (getMonth(billDate) + 1).toString().padStart(2, '0') === selectedMonth;
      return yearMatches && monthMatches;
    });

    const totalAmount = filteredBills.reduce((acc, bill) => acc + bill.totalAmount, 0);
    const totalRevenue = filteredBills.reduce((acc, bill) => acc + bill.paidAmount, 0);
    const totalDue = filteredBills.reduce((acc, bill) => acc + bill.dueAmount, 0);
    const totalSales = filteredBills.length;
    const totalLabour = filteredBills.reduce((acc, bill) => acc + (bill.totalLabourAmount || 0), 0);
    
    // Inactive customers for the selected period
    const customerLastActivity: { [key: string]: Date } = {};
    filteredBills.forEach(bill => {
      const billDate = new Date(bill.createdAt);
      const customerNameKey = bill.customerName.trim().toLowerCase();
       if (!customerLastActivity[customerNameKey] || billDate > customerLastActivity[customerNameKey]) {
          customerLastActivity[customerNameKey] = billDate;
      }
    });

    let periodStart: Date;
    if (selectedYear !== 'all' && selectedMonth !== 'all') {
      periodStart = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, 1);
    } else if (selectedYear !== 'all') {
       periodStart = new Date(parseInt(selectedYear), 0, 1);
    } else {
        periodStart = new Date(0); // Epoch for all time
    }
    
    const uniqueCustomersInPeriod = Object.keys(customerLastActivity).length;
    const activeCustomersInPeriod = Object.values(customerLastActivity).filter(d => d >= periodStart).length;
    const inactiveCount = uniqueCustomersInPeriod - activeCustomersInPeriod;


    // --- Chart Data Calculations ---
    const yearlySales: { [key: string]: number } = {};
    const yearlyLabour: { [key: string]: number } = {};
    const monthlySalesForYear: { [key: string]: number } = Object.fromEntries(ALL_MONTHS.map(m => [m, 0]));
    const monthlyLabourForYear: { [key: string]: number } = Object.fromEntries(ALL_MONTHS.map(m => [m, 0]));
    
    const billsForMonthlyChart = allBills.filter(bill => getYear(new Date(bill.createdAt)).toString() === selectedYear);

    billsForMonthlyChart.forEach(bill => {
        const month = format(new Date(bill.createdAt), 'MMM');
        monthlySalesForYear[month] = (monthlySalesForYear[month] || 0) + bill.paidAmount;
        monthlyLabourForYear[month] = (monthlyLabourForYear[month] || 0) + (bill.totalLabourAmount || 0);
    });

    allBills.forEach(bill => {
        const year = getYear(new Date(bill.createdAt)).toString();
        yearlySales[year] = (yearlySales[year] || 0) + bill.paidAmount;
        yearlyLabour[year] = (yearlyLabour[year] || 0) + (bill.totalLabourAmount || 0);
    });

    const formattedMonthlyData = ALL_MONTHS.map(month => ({
      month,
      total: monthlySalesForYear[month] || 0,
    }));
    const formattedMonthlyLabourData = ALL_MONTHS.map(month => ({
      month,
      total: monthlyLabourForYear[month] || 0,
    }));

    const sortedYearsForChart = Array.from(years).sort((a, b) => Number(a) - Number(b));
    const formattedYearlyData = sortedYearsForChart.map(year => ({
        year,
        total: yearlySales[year] || 0,
    }));
    const formattedYearlyLabourData = sortedYearsForChart.map(year => ({
        year,
        total: yearlyLabour[year] || 0,
    }));
    
    // --- Due Bills Calculation ---
    const aggregatedDueCustomers: { [key: string]: AggregatedDueCustomer } = {};
     filteredBills.forEach(bill => {
       if (bill.dueAmount > 0) {
        const customerNameKey = bill.customerName.trim().toLowerCase();
        if (aggregatedDueCustomers[customerNameKey]) {
          aggregatedDueCustomers[customerNameKey].totalDueAmount += bill.dueAmount;
          if (bill.createdAt > aggregatedDueCustomers[customerNameKey].lastBillIsoDate) {
            aggregatedDueCustomers[customerNameKey].lastBillIsoDate = bill.createdAt;
            aggregatedDueCustomers[customerNameKey].lastBillDate = bill.createdAt;
             if (bill.contactNumber) {
              aggregatedDueCustomers[customerNameKey].contactNumber = bill.contactNumber;
            }
          }
        } else {
          aggregatedDueCustomers[customerNameKey] = {
            customerName: bill.customerName,
            totalDueAmount: bill.dueAmount,
            lastBillDate: bill.createdAt,
            lastBillIsoDate: bill.createdAt,
            contactNumber: bill.contactNumber,
          };
        }
      }
    });

    const customersWithDue = Object.values(aggregatedDueCustomers).sort((a, b) => b.totalDueAmount - a.totalDueAmount);

    return {
      totalAmount,
      totalRevenue,
      totalDue,
      totalSales,
      totalLabour,
      todaysRevenue,
      todaysLabourCost,
      todaysNetProfit,
      inactiveCustomers: inactiveCount,
      monthlyData: formattedMonthlyData,
      yearlyData: formattedYearlyData,
      monthlyLabourData: formattedMonthlyLabourData,
      yearlyLabourData: formattedYearlyLabourData,
      dueBills: customersWithDue,
      recentBills: filteredBills.slice(0, 5),
      availableYears: allAvailableYears,
    };
  }, [allBills, selectedYear, selectedMonth]);


  const handleSendReminder = async (customer: AggregatedDueCustomer) => {
    setRemindersState(prev => ({ ...prev, [customer.customerName]: 'sending' }));
    toast({
        title: 'Sending Reminder...',
        description: `Composing and sending a reminder to ${customer.customerName}.`,
    });

    try {
        await composeReminderMessage({
            customerName: customer.customerName,
            lastActivityDate: format(new Date(customer.lastBillDate), 'yyyy-MM-dd'),
        });
        
        setRemindersState(prev => ({ ...prev, [customer.customerName]: 'sent' }));
        toast({
            title: 'Reminder Sent!',
            description: `A reminder has been successfully sent to ${customer.customerName}.`,
        });
    } catch (error) {
        setRemindersState(prev => ({ ...prev, [customer.customerName]: 'error' }));
        toast({
            variant: 'destructive',
            title: 'Failed to Send Reminder',
            description: 'An error occurred while sending the reminder.',
        });
        console.error(`Failed to send reminder to ${customer.customerName}:`, error);
    }
  };

  const isLoading = isUserLoading || isLoadingBills || isOwner === null;

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
    <div className="space-y-4">
       {/* Today's Profit Section */}
      <Card>
        <CardHeader className='pb-2'>
            <CardTitle className='flex items-center gap-2 text-base'>
                <TrendingUp className='h-5 w-5' />
                Today (Last 24 Hours)
            </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{todaysRevenue.toLocaleString()}rs</div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Today's Labour Cost</CardTitle>
                    <Wrench className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{todaysLabourCost.toLocaleString()}rs</div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Today's Net Profit</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-600">{todaysNetProfit.toLocaleString()}rs</div>
                </CardContent>
            </Card>
        </CardContent>
      </Card>


      {/* Global Filters */}
      <Card>
        <CardHeader className='pb-2'>
            <CardTitle className='flex items-center gap-2 text-base'>
                <Calendar className='h-5 w-5' />
                Filter by Period
            </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
           <div className='flex-1'>
                <p className='text-sm text-muted-foreground mb-1'>Year</p>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Year" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        {availableYears.map(year => (
                            <SelectItem key={year} value={year}>{year}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
           </div>
            <div className='flex-1'>
                 <p className='text-sm text-muted-foreground mb-1'>Month</p>
                <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={selectedYear === 'all'}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Month" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Months</SelectItem>
                         {ALL_MONTHS.map((month, index) => (
                            <SelectItem key={month} value={(index + 1).toString().padStart(2, '0')}>
                                {month}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </CardContent>
      </Card>


      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAmount.toLocaleString()}rs</div>
            <p className="text-xs text-muted-foreground">
              Total value of bills in period
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
              Paid amount in selected period
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
              Outstanding amount in period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Labour Paid</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLabour.toLocaleString()}rs</div>
            <p className="text-xs text-muted-foreground">
              Labour charges in selected period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{totalSales}</div>
            <p className="text-xs text-muted-foreground">Bills in selected period</p>
          </CardContent>
        </Card>
        
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
         {/* Notifications Feed */}
        <NotificationsFeed />
        
        {/* Due Amounts & Reminders */}
        <Card>
            <CardHeader>
                <CardTitle>Customer Reminders</CardTitle>
                <CardDescription>
                    Customers with outstanding payments in the selected period.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {dueBills.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Customer</TableHead>
                                <TableHead>Total Due</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {dueBills.map(customer => (
                            <TableRow key={customer.customerName}>
                                <TableCell>
                                    <div className="font-medium">{customer.customerName}</div>
                                    <div className="text-xs text-muted-foreground">
                                        Last Bill: {format(new Date(customer.lastBillDate), 'dd MMM, yyyy')}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="destructive">{customer.totalDueAmount.toLocaleString()}rs</Badge>
                                </TableCell>
                                <TableCell>
                                    {customer.contactNumber ? (
                                        <Button asChild variant="ghost" size="sm" className="flex items-center gap-2">
                                            <a href={`tel:${customer.contactNumber}`}>
                                                <Phone className="h-4 w-4" />
                                                {customer.contactNumber}
                                            </a>
                                        </Button>
                                    ) : (
                                        <span className="text-xs text-muted-foreground">No contact</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                     <Button 
                                        size="sm"
                                        onClick={() => handleSendReminder(customer)}
                                        disabled={!isOwner || remindersState[customer.customerName] === 'sending'}
                                     >
                                         {remindersState[customer.customerName] === 'sending' ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                         ) : 'Send Reminder'}
                                    </Button>
                                </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ): (
                    <div className="text-center py-12">
                        <DollarSign className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">No pending customer payments</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            All accounts are settled for this period.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <Tabs defaultValue="sales">
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Analytics</CardTitle>
                        <CardDescription>
                            Detailed reports for sales and labour.
                        </CardDescription>
                    </div>
                     <div className="flex items-center gap-2">
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
                                <TabsTrigger value="monthly" disabled={selectedYear === 'all'}>Monthly</TabsTrigger>
                                <TabsTrigger value="yearly">Yearly</TabsTrigger>
                            </TabsList>
                        </div>
                    </CardHeader>
                    <TabsContent value="monthly">
                        <CardContent className="pl-2">
                            {selectedYear === 'all' ? (
                                <div className="flex flex-col items-center justify-center h-[350px] text-center">
                                    <AlertCircle className="h-10 w-10 text-muted-foreground" />
                                    <p className="mt-4 text-sm text-muted-foreground">Please select a specific year to view the monthly report.</p>
                                </div>
                            ) : (
                            <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                                <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={value => `${value.toLocaleString()}rs`}/>
                                <Tooltip cursor={{ fill: 'hsl(var(--accent))', radius: 'var(--radius)' }} contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }}/>
                                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                            </ResponsiveContainer>
                            )}
                        </CardContent>
                    </TabsContent>
                    <TabsContent value="yearly">
                        <CardContent className="pl-2">
                            <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={yearlyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                                <XAxis dataKey="year" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={value => `${value.toLocaleString()}rs`}/>
                                <Tooltip cursor={{ fill: 'hsl(var(--accent))', radius: 'var(--radius)' }} contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }}/>
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
                                <TabsTrigger value="monthly" disabled={selectedYear === 'all'}>Monthly</TabsTrigger>
                                <TabsTrigger value="yearly">Yearly</TabsTrigger>
                            </TabsList>
                        </div>
                    </CardHeader>
                    <TabsContent value="monthly">
                        <CardContent className="pl-2">
                            {selectedYear === 'all' ? (
                                <div className="flex flex-col items-center justify-center h-[350px] text-center">
                                    <AlertCircle className="h-10 w-10 text-muted-foreground" />
                                    <p className="mt-4 text-sm text-muted-foreground">Please select a specific year to view the monthly report.</p>
                                </div>
                            ) : (
                            <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={monthlyLabourData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                                <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={value => `${value.toLocaleString()}rs`}/>
                                <Tooltip cursor={{ fill: 'hsl(var(--accent))', radius: 'var(--radius)' }} contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }}/>
                                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                            </ResponsiveContainer>
                            )}
                        </CardContent>
                    </TabsContent>
                    <TabsContent value="yearly">
                        <CardContent className="pl-2">
                            <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={yearlyLabourData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                                <XAxis dataKey="year" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={value => `${value.toLocaleString()}rs`}/>
                                <Tooltip cursor={{ fill: 'hsl(var(--accent))', radius: 'var(--radius)' }} contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }}/>
                                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </TabsContent>
                </Tabs>
            </TabsContent>
        </Card>
      </Tabs>
      
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Recent Bills */}
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>Recent Bills</CardTitle>
            <CardDescription>
              Latest 5 bills in the selected period.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                            <TableCell>{format(new Date(bill.createdAt), 'dd MMM, p')}</TableCell>                        
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
      </div>
    </div>
  );
}
