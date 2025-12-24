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
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import type { Bill } from '@/lib/types';
import { format, getYear } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { composeReminderMessage } from '@/ai/flows/compose-reminder-message';

const ALL_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export function OwnerDashboard() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSendingReminders, setIsSendingReminders] = React.useState(false);
  const [isOwner, setIsOwner] = React.useState<boolean | null>(null);
  const [selectedYear, setSelectedYear] = React.useState<string>(new Date().getFullYear().toString());

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

  const { data: bills, isLoading: isLoadingBills, error: billsError } = useCollection<Bill>(billsQuery);

  const recentBillsQuery = useMemoFirebase(() => {
      if(!firestore || !collectionPath) return null;
      return query(collection(firestore, collectionPath), orderBy('createdAt', 'desc'), limit(5));
  }, [firestore, collectionPath]);

  const { data: recentBills, isLoading: isLoadingRecent } = useCollection<Bill>(recentBillsQuery);

  const {
    totalRevenue,
    totalDue,
    totalSales,
    inactiveCustomers,
    monthlyData,
    yearlyData,
    dueBills,
    availableYears,
  } = React.useMemo(() => {
    if (!bills) {
      return {
        totalRevenue: 0,
        totalDue: 0,
        totalSales: 0,
        inactiveCustomers: 0,
        monthlyData: [],
        yearlyData: [],
        dueBills: [],
        availableYears: [],
      };
    }

    const yearlySales: { [key: string]: number } = {};
    const customerLastActivity: { [key: string]: Date } = {};
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const years = new Set<string>();

    const revenue = bills.reduce((acc, bill) => acc + bill.paidAmount, 0);
    const due = bills.reduce((acc, bill) => acc + bill.dueAmount, 0);

    // Monthly data for the selected year
    const monthlySalesForYear: { [key: string]: number } = Object.fromEntries(ALL_MONTHS.map(m => [m, 0]));

    bills.forEach(bill => {
        const billDate = new Date(bill.createdAt);
        const year = getYear(billDate).toString();
        years.add(year);

        if(year === selectedYear) {
            const month = format(billDate, 'MMM');
            monthlySalesForYear[month] = (monthlySalesForYear[month] || 0) + bill.paidAmount;
        }

        yearlySales[year] = (yearlySales[year] || 0) + bill.paidAmount;

        const customerName = bill.customerName.toLowerCase();
        if (!customerLastActivity[customerName] || billDate > customerLastActivity[customerName]) {
            customerLastActivity[customerName] = billDate;
        }
    });

    const inactiveCount = Object.values(customerLastActivity).filter(
      lastDate => lastDate < oneMonthAgo
    ).length;
    
    const sortedYears = Array.from(years).sort((a, b) => Number(b) - Number(a));

    const formattedMonthlyData = ALL_MONTHS.map(month => ({
      month,
      total: monthlySalesForYear[month] || 0,
    }));

    const formattedYearlyData = sortedYears.map(year => ({
        year,
        total: yearlySales[year] || 0,
    }));

    const customersWithDue = bills.filter(bill => bill.dueAmount > 0);

    return {
      totalRevenue: revenue,
      totalDue: due,
      totalSales: bills.length,
      inactiveCustomers: inactiveCount,
      monthlyData: formattedMonthlyData,
      yearlyData: formattedYearlyData,
      dueBills: customersWithDue,
      availableYears: sortedYears,
    };
  }, [bills, selectedYear]);

  React.useEffect(() => {
    // Set the selected year to the most recent year when data loads
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

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
                lastActivityDate: format(new Date(bill.createdAt), 'yyyy-MM-dd'),
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
              Total amount paid by customers
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
              Total outstanding amount
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
            <p className="text-xs text-muted-foreground">Total bills generated</p>
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
              No activity in the last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Sales Report */}
        <Card className="lg:col-span-4">
            <Tabs defaultValue="monthly">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Sales Report</CardTitle>
                            <CardDescription>
                                A summary of revenue over time.
                            </CardDescription>
                        </div>
                         <div className="flex items-center gap-2">
                           <TabsList>
                                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                                <TabsTrigger value="yearly">Yearly</TabsTrigger>
                            </TabsList>
                            <Select value={selectedYear} onValueChange={setSelectedYear}>
                                <SelectTrigger className="w-[120px]">
                                    <SelectValue placeholder="Select Year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableYears.map(year => (
                                        <SelectItem key={year} value={year}>{year}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <TabsContent value="monthly">
                    <CardContent className="pl-2">
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
              Your 5 most recent transactions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingRecent ? (
                <div className="flex justify-center items-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : recentBills && recentBills.length > 0 ? (
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
                        Generate a new bill to see recent activity here.
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
                    A list of customers with outstanding payments. You can send them a friendly reminder.
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
                                        <TableHead>Due Amount</TableHead>
                                        <TableHead>Last Bill Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {dueBills.slice(0, 5).map(bill => (
                                    <TableRow key={bill.id}>
                                        <TableCell className="font-medium">{bill.customerName}</TableCell>
                                        <TableCell>
                                            <Badge variant="destructive">{bill.dueAmount.toLocaleString()}rs</Badge>
                                        </TableCell>
                                        <TableCell>{format(new Date(bill.createdAt), 'dd MMM yyyy')}</TableCell>
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
                            All customer accounts are settled.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
