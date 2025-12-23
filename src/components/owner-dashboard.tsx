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
import { collection, query, orderBy, limit } from 'firebase/firestore';
import type { Bill } from '@/lib/types';
import { format, subMonths, startOfMonth, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { composeReminderMessage } from '@/ai/flows/compose-reminder-message';

// Mock data for the chart until we have enough real data
const getMockMonthlyData = () => {
    const data = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
        const date = subMonths(today, i);
        data.push({
        month: format(date, 'MMM'),
        total: Math.floor(Math.random() * (5000 - 1000 + 1)) + 1000,
        });
    }
    return data;
};


export function OwnerDashboard() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSendingReminders, setIsSendingReminders] = React.useState(false);


  // Query for all bills, ordered by creation date
  const billsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    // Owners should see all bills from the global collection
    return query(collection(firestore, 'bills'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: bills, isLoading: isLoadingBills, error: billsError } = useCollection<Bill>(billsQuery);

  const recentBillsQuery = useMemoFirebase(() => {
      if(!firestore) return null;
      return query(collection(firestore, 'bills'), orderBy('createdAt', 'desc'), limit(5));
  }, [firestore]);

  const { data: recentBills, isLoading: isLoadingRecent } = useCollection<Bill>(recentBillsQuery);

  const {
    totalRevenue,
    totalDue,
    totalSales,
    inactiveCustomers,
    monthlyData,
    dueBills,
  } = React.useMemo(() => {
    if (!bills) {
      return {
        totalRevenue: 0,
        totalDue: 0,
        totalSales: 0,
        inactiveCustomers: 0,
        monthlyData: getMockMonthlyData(),
        dueBills: [],
      };
    }

    const monthlySales: { [key: string]: number } = {};
    const customerLastActivity: { [key: string]: Date } = {};
    const oneMonthAgo = subMonths(new Date(), 1);

    const revenue = bills.reduce((acc, bill) => acc + bill.paidAmount, 0);
    const due = bills.reduce((acc, bill) => acc + bill.dueAmount, 0);

    bills.forEach(bill => {
        const billDate = new Date(bill.createdAt);
        const month = format(billDate, 'MMM');
        monthlySales[month] = (monthlySales[month] || 0) + bill.totalAmount;

        const customerName = bill.customerName.toLowerCase();
        if (!customerLastActivity[customerName] || billDate > customerLastActivity[customerName]) {
            customerLastActivity[customerName] = billDate;
        }
    });

    const inactiveCount = Object.values(customerLastActivity).filter(
      lastDate => lastDate < oneMonthAgo
    ).length;

    const formattedMonthlyData = Object.entries(monthlySales)
      .map(([month, total]) => ({ month, total }))
      .slice(-6); // Get last 6 months

    const customersWithDue = bills.filter(bill => bill.dueAmount > 0);

    return {
      totalRevenue: revenue,
      totalDue: due,
      totalSales: bills.length,
      inactiveCustomers: inactiveCount,
      monthlyData: formattedMonthlyData.length > 0 ? formattedMonthlyData : getMockMonthlyData(),
      dueBills: customersWithDue,
    };
  }, [bills]);

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

  const isLoading = isUserLoading || isLoadingBills;

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
        {/* Monthly Report */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Monthly Report</CardTitle>
            <CardDescription>
                A summary of sales over the last 6 months.
            </CardDescription>
          </CardHeader>
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
        </Card>

        {/* Recent Bills */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Bills</CardTitle>
            <CardDescription>
              The 5 most recently generated bills.
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
                                {bill.dueAmount.toLocaleString()}rs
                            </Badge>
                            </TableCell>
                            <TableCell>{format(new Date(bill.createdAt), 'dd MMM')}</TableCell>
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
                            <Button size="lg" onClick={handleSendReminders} disabled={isSendingReminders}>
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
