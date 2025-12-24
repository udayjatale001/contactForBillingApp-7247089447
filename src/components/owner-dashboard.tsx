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
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, setDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc, getDoc } from 'firebase/firestore';
import type { Bill, AppSettings } from '@/lib/types';
import { format, getYear, getMonth, parse } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { composeReminderMessage } from '@/ai/flows/compose-reminder-message';
import { Input } from './ui/input';
import { Label } from './ui/label';

const ALL_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

type AggregatedDueCustomer = {
  customerName: string;
  totalDueAmount: number;
  lastBillDate: string; // Storing as ISO string
  lastBillIsoDate: string;
};

const ManageRatesCard = ({ settings, settingsRef, isOwner }: { settings: AppSettings | null, settingsRef: any, isOwner: boolean | null }) => {
    const { toast } = useToast();
    const [rates, setRates] = React.useState<AppSettings>({ smallCaratRate: 0, bigCaratRate: 0, labourRate: 0 });
    const [isSaving, setIsSaving] = React.useState(false);

    React.useEffect(() => {
        if (settings) {
            setRates(settings);
        }
    }, [settings]);

    const handleRateChange = (field: keyof AppSettings, value: string) => {
        const numericValue = value === '' ? 0 : parseFloat(value);
        if (!isNaN(numericValue)) {
            setRates(prev => ({ ...prev, [field]: numericValue }));
        }
    };

    const handleSaveRates = async () => {
        if (!settingsRef || !isOwner) {
            toast({ variant: "destructive", title: "Permission Denied", description: "You do not have permission to update rates." });
            return;
        }
        setIsSaving(true);
        
        setDocumentNonBlocking(settingsRef, rates, { merge: true });

        // Simulate optimistic update feedback
        setTimeout(() => {
          setIsSaving(false);
          toast({ title: "Rates Updated", description: "The new rates have been saved successfully." });
        }, 500); // Give a moment for the non-blocking write to be initiated
    };
    
    return (
        <Card className="lg:col-span-7">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Settings /> Manage Rates</CardTitle>
                <CardDescription>
                    Update the billing rates for carats and labour. Changes will apply to all new bills.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="smallCaratRate">Small Carat Rate</Label>
                        <Input
                            id="smallCaratRate"
                            type="number"
                            value={rates.smallCaratRate}
                            onChange={(e) => handleRateChange('smallCaratRate', e.target.value)}
                            placeholder="e.g., 17"
                            disabled={!isOwner}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="bigCaratRate">Big Carat Rate</Label>
                        <Input
                            id="bigCaratRate"
                            type="number"
                            value={rates.bigCaratRate}
                            onChange={(e) => handleRateChange('bigCaratRate', e.target.value)}
                            placeholder="e.g., 20"
                            disabled={!isOwner}
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="labourRate">Labour Rate</Label>
                        <Input
                            id="labourRate"
                            type="number"
                            value={rates.labourRate}
                             onChange={(e) => handleRateChange('labourRate', e.target.value)}
                            placeholder="e.g., 5"
                             disabled={!isOwner}
                        />
                    </div>
                </div>
                <div className="flex justify-end">
                    <Button onClick={handleSaveRates} disabled={!isOwner || isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Rates
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};


export function OwnerDashboard() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSendingReminders, setIsSendingReminders] = React.useState(false);
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
  
  const settingsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'app_settings', 'rates');
  }, [firestore]);

  const { data: appSettings, isLoading: isLoadingSettings } = useDoc<AppSettings>(settingsRef);

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
    totalRevenue,
    totalDue,
    totalSales,
    inactiveCustomers,
    monthlyData,
    yearlyData,
    dueBills,
    recentBills,
    availableYears,
  } = React.useMemo(() => {
    const initialResult = {
      totalRevenue: 0,
      totalDue: 0,
      totalSales: 0,
      inactiveCustomers: 0,
      monthlyData: ALL_MONTHS.map(month => ({ month, total: 0 })),
      yearlyData: [],
      dueBills: [],
      recentBills: [],
      availableYears: [new Date().getFullYear().toString()],
    };

    if (!allBills) {
      return initialResult;
    }

    const years = new Set<string>();
    allBills.forEach(bill => years.add(getYear(new Date(bill.createdAt)).toString()));
    const earliestYearInHistory = Array.from(years).sort((a,b) => Number(a) - Number(b))[0];
    const earliestYear = earliestYearInHistory ? parseInt(earliestYearInHistory) : new Date().getFullYear();
    
    const allAvailableYears = Array.from({length: 3000 - earliestYear + 1}, (_, i) => (earliestYear + i).toString()).reverse();


    // Filter bills based on selected month and year
    const filteredBills = allBills.filter(bill => {
      const billDate = new Date(bill.createdAt);
      const yearMatches = selectedYear === 'all' || getYear(billDate).toString() === selectedYear;
      const monthMatches = selectedMonth === 'all' || (getMonth(billDate) + 1).toString().padStart(2, '0') === selectedMonth;
      return yearMatches && monthMatches;
    });

    const totalRevenue = filteredBills.reduce((acc, bill) => acc + bill.paidAmount, 0);
    const totalDue = filteredBills.reduce((acc, bill) => acc + bill.dueAmount, 0);
    const totalSales = filteredBills.length;
    
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
    const monthlySalesForYear: { [key: string]: number } = Object.fromEntries(ALL_MONTHS.map(m => [m, 0]));
    
    // Use allBills for yearly chart, but only filtered bills from selectedYear for monthly chart
    const billsForMonthlyChart = allBills.filter(bill => getYear(new Date(bill.createdAt)).toString() === selectedYear);

    billsForMonthlyChart.forEach(bill => {
        const month = format(new Date(bill.createdAt), 'MMM');
        monthlySalesForYear[month] = (monthlySalesForYear[month] || 0) + bill.paidAmount;
    });
     allBills.forEach(bill => {
        const year = getYear(new Date(bill.createdAt)).toString();
        yearlySales[year] = (yearlySales[year] || 0) + bill.paidAmount;
    });

    const formattedMonthlyData = ALL_MONTHS.map(month => ({
      month,
      total: monthlySalesForYear[month] || 0,
    }));

    const sortedYearsForYearlyChart = Array.from(years).sort((a, b) => Number(a) - Number(b));
    const formattedYearlyData = sortedYearsForYearlyChart.map(year => ({
        year,
        total: yearlySales[year] || 0,
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
          }
        } else {
          aggregatedDueCustomers[customerNameKey] = {
            customerName: bill.customerName,
            totalDueAmount: bill.dueAmount,
            lastBillDate: bill.createdAt,
            lastBillIsoDate: bill.createdAt,
          };
        }
      }
    });

    const customersWithDue = Object.values(aggregatedDueCustomers).sort((a, b) => b.totalDueAmount - a.totalDueAmount);

    return {
      totalRevenue,
      totalDue,
      totalSales,
      inactiveCustomers: inactiveCount,
      monthlyData: formattedMonthlyData,
      yearlyData: formattedYearlyData,
      dueBills: customersWithDue,
      recentBills: filteredBills.slice(0, 5),
      availableYears: allAvailableYears,
    };
  }, [allBills, selectedYear, selectedMonth]);


  const handleSendReminders = async () => {
    setIsSendingReminders(true);
    toast({
        title: 'Sending Reminders...',
        description: 'AI is composing and sending friendly reminders to customers with due amounts.',
    });

    try {
        const reminderPromises = dueBills.map(bill =>
            composeReminderMessage({
                customerName: bill.customerName,
                lastActivityDate: format(new Date(bill.lastBillDate), 'yyyy-MM-dd'),
            })
        );
        
        await Promise.all(reminderPromises);

        toast({
            title: 'Reminders Sent!',
            description: 'All reminders have been successfully sent.',
        });
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Failed to Send Reminders',
            description: 'An error occurred while sending reminders.',
        });
        console.error("Failed to send reminders:", error);
    } finally {
        setIsSendingReminders(false);
    }
};

  const isLoading = isUserLoading || isLoadingBills || isOwner === null || isLoadingSettings;

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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
              Outstanding amount in selected period
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Inactive Customers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inactiveCustomers}</div>
            <p className="text-xs text-muted-foreground">
              No bills in the selected period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid gap-4 lg:grid-cols-7">
        <ManageRatesCard settings={appSettings} settingsRef={settingsRef} isOwner={isOwner} />
        {/* Sales Report */}
        <Card className="lg:col-span-4">
            <Tabs defaultValue="monthly">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Sales Report</CardTitle>
                            <CardDescription>
                                Revenue summary for the selected period.
                            </CardDescription>
                        </div>
                         <div className="flex items-center gap-2">
                           <TabsList>
                                <TabsTrigger value="monthly" disabled={selectedYear === 'all'}>Monthly</TabsTrigger>
                                <TabsTrigger value="yearly">Yearly</TabsTrigger>
                            </TabsList>
                        </div>
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
                            <XAxis
                            dataKey="month"
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            />
                            <YAxis
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={value => `${value.toLocaleString()}rs`}
                            />
                            <Tooltip
                            cursor={{ fill: 'hsl(var(--accent))', radius: 'var(--radius)' }}
                            contentStyle={{ 
                                backgroundColor: 'hsl(var(--background))', 
                                borderColor: 'hsl(var(--border))',
                                borderRadius: 'var(--radius)'
                                }}
                            />
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
                            <XAxis
                            dataKey="year"
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            />
                            <YAxis
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={value => `${value.toLocaleString()}rs`}
                            />
                            <Tooltip
                            cursor={{ fill: 'hsl(var(--accent))', radius: 'var(--radius)' }}
                            contentStyle={{ 
                                backgroundColor: 'hsl(var(--background))', 
                                borderColor: 'hsl(var(--border))',
                                borderRadius: 'var(--radius)'
                                }}
                            />
                            <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </TabsContent>
            </Tabs>
        </Card>

        {/* Recent Bills */}
        <Card className="lg:col-span-3">
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

         {/* Due Amounts & Reminders */}
        <Card className="lg:col-span-7">
            <CardHeader>
                <CardTitle>Customer Reminders</CardTitle>
                <CardDescription>
                    Customers with outstanding payments in the selected period.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {dueBills.length > 0 ? (
                    <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                        <div className="md:col-span-2">
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Total Due Amount</TableHead>
                                        <TableHead>Last Bill Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {dueBills.slice(0, 5).map(dueCustomer => (
                                    <TableRow key={dueCustomer.customerName}>
                                        <TableCell className="font-medium">{dueCustomer.customerName}</TableCell>
                                        <TableCell>
                                            <Badge variant="destructive">{dueCustomer.totalDueAmount.toLocaleString()}rs</Badge>
                                        </TableCell>
                                        <TableCell>{format(new Date(dueCustomer.lastBillDate), 'dd MMM yyyy')}</TableCell>
                                    </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="flex items-center justify-center p-6 bg-secondary/30 rounded-lg">
                            <Button size="lg" onClick={handleSendReminders} disabled={!isOwner || isSendingReminders}>
                                {isSendingReminders ? (
                                    <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Sending...
                                    </>
                                ) : 'Send Reminders'}
                            </Button>
                        </div>
                    </div>
                ): (
                    <div className="text-center py-16">
                        <DollarSign className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">No Due Amounts</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            All accounts are settled for this period.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
