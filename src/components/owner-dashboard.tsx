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
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Button } from './ui/button';
import { BellRing, Send, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { composeReminderMessage } from '@/ai/flows/compose-reminder-message';
import type { Bill } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

export function OwnerDashboard() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  
  const billsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'bills');
  }, [firestore]);

  const { data: bills, isLoading } = useCollection<Bill>(billsQuery);

  const [isSendingReminders, setIsSendingReminders] = React.useState(false);
  const [selectedBill, setSelectedBill] = React.useState<Bill | null>(null);

  const totalRevenue = React.useMemo(() => (bills || []).reduce((sum, bill) => sum + bill.paidAmount, 0), [bills]);
  const totalDue = React.useMemo(() => (bills || []).reduce((sum, bill) => sum + bill.dueAmount, 0), [bills]);
  const dueBills = React.useMemo(() => (bills || []).filter((bill) => bill.dueAmount > 0).sort((a, b) => b.dueAmount - a.dueAmount), [bills]);
  const recentBills = React.useMemo(() => [...(bills || [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5), [bills]);

  const inactiveCustomers = React.useMemo(() => {
    if (!bills) return [];
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const customerLastActivity: { [key: string]: Date } = {};
    bills.forEach(bill => {
        const createdAtDate = new Date(bill.createdAt);
        if (!customerLastActivity[bill.customerName] || createdAtDate > customerLastActivity[bill.customerName]) {
            customerLastActivity[bill.customerName] = createdAtDate;
        }
    });

    return Object.entries(customerLastActivity)
      .filter(([, lastDate]) => lastDate < oneMonthAgo)
      .map(([name, lastDate]) => ({ customerName: name, lastActivityDate: lastDate }));
  }, [bills]);

  const salesData = React.useMemo(() => {
    if (!bills) return [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyTotals: { [key: string]: number } = {};

    bills.forEach(bill => {
      const createdAtDate = new Date(bill.createdAt);
      const month = createdAtDate.getMonth();
      const year = createdAtDate.getFullYear();
      const key = `${monthNames[month]} ${year}`;
      if (!monthlyTotals[key]) {
        monthlyTotals[key] = 0;
      }
      monthlyTotals[key] += bill.paidAmount;
    });

    return Object.entries(monthlyTotals)
      .map(([name, total]) => ({ name, total }))
      .sort((a,b) => new Date(a.name).getTime() - new Date(b.name).getTime()) // Ensure chronological order
      .slice(-6); // Last 6 months
  }, [bills]);


  const handleSendReminders = async () => {
    if (inactiveCustomers.length === 0) {
      toast({ title: 'No inactive customers to remind.' });
      return;
    }
    setIsSendingReminders(true);
    try {
      for (const customer of inactiveCustomers) {
        await composeReminderMessage({
          customerName: customer.customerName,
          lastActivityDate: customer.lastActivityDate.toISOString().split('T')[0],
        });
      }
      toast({
        title: 'Reminders Sent!',
        description: `Sent reminder messages to ${inactiveCustomers.length} inactive customer(s).`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error Sending Reminders',
        description: 'Could not generate reminder messages.',
      });
    } finally {
      setIsSendingReminders(false);
    }
  };

  const handleBillClick = (bill: Bill) => setSelectedBill(bill);
  const handleCloseDialog = () => setSelectedBill(null);

  const DetailItem = ({ label, value, className }: { label: string; value: React.ReactNode; className?: string; }) => (
    <div className={`flex justify-between items-center ${className}`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRevenue.toLocaleString()}rs</div>
            <p className="text-xs text-muted-foreground">from all saved bills</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{totalDue.toLocaleString()}rs</div>
            <p className="text-xs text-muted-foreground">{dueBills.length} active dues</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{bills?.length || 0}</div>
            <p className="text-xs text-muted-foreground">total bills generated</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inactiveCustomers.length}</div>
            <p className="text-xs text-muted-foreground">No activity for over a month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Monthly Report</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
             {salesData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={salesData}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000}krs`} />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                      }}
                      formatter={(value: number) => `${value.toLocaleString()}rs`}
                    />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[350px] text-center">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No Sales Data</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Save a bill to see monthly sales reports here.
                    </p>
                </div>
              )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Due Amounts</CardTitle>
            <CardDescription>
              List of all customers with outstanding payments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dueBills.length > 0 ? (
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Amount Due</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {dueBills.map((bill) => (
                    <TableRow key={bill.id}>
                        <TableCell>{bill.customerName}</TableCell>
                        <TableCell className="text-right font-medium text-destructive">
                        {bill.dueAmount.toLocaleString()}rs
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            ) : (
                 <div className="text-center py-10">
                    <h3 className="text-lg font-semibold">No Dues Found</h3>
                    <p className="text-sm text-muted-foreground">
                        All bills are fully paid.
                    </p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Bills</CardTitle>
            <CardDescription>A list of the most recent bills generated.</CardDescription>
          </CardHeader>
          <CardContent>
             {recentBills.length > 0 ? (
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
                        {recentBills.map((bill) => (
                        <TableRow key={bill.id} onClick={() => handleBillClick(bill)} className="cursor-pointer">
                            <TableCell>{bill.customerName}</TableCell>
                            <TableCell>{bill.totalAmount.toLocaleString()}rs</TableCell>
                            <TableCell>
                            <Badge variant={bill.dueAmount > 0 ? 'destructive' : 'outline'}>
                                {bill.dueAmount.toLocaleString()}rs
                            </Badge>
                            </TableCell>
                            <TableCell>{new Date(bill.createdAt).toLocaleDateString()}</TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                </Table>
             ) : (
                <div className="text-center py-16">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No Recent Bills</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Saved bills will appear here.
                    </p>
                </div>
             )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BellRing /> Customer Reminders</CardTitle>
            <CardDescription>
              Send a friendly reminder message to customers who haven't visited in over a month.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 border rounded-lg bg-secondary/50">
              <p className="font-semibold">{inactiveCustomers.length} inactive customer(s) found.</p>
              <ul className="text-sm text-muted-foreground list-disc pl-5 mt-2 max-h-24 overflow-y-auto">
                {inactiveCustomers.map(c => <li key={c.customerName}>{c.customerName} (Last visit: {c.lastActivityDate.toLocaleDateString()})</li>)}
                {inactiveCustomers.length === 0 && <li>All customers have been active recently!</li>}
              </ul>
            </div>
          </CardContent>
          <CardContent>
            <Button onClick={handleSendReminders} disabled={isSendingReminders || inactiveCustomers.length === 0} className="w-full">
              {isSendingReminders ? 'Sending...' : 'Send Reminder(s)'}
              <Send className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {selectedBill && (
        <Dialog open={!!selectedBill} onOpenChange={handleCloseDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Bill Details</DialogTitle>
              <DialogDescription>
                Detailed information for bill ID: {selectedBill.id}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2 p-4 border rounded-lg">
                <h3 className="font-semibold">
                  Bill for {selectedBill.customerName}
                </h3>
                <Separator />
                <DetailItem label="Total Carat" value={selectedBill.totalCarat} />
                <DetailItem label="Carat Type" value={selectedBill.caratType} />
                <DetailItem label="Rate" value={`${(selectedBill.totalAmount / selectedBill.totalCarat).toFixed(2)}rs`} />
                <Separator />
                <DetailItem label="Total Amount" value={`${selectedBill.totalAmount.toLocaleString()}rs`} className="font-bold text-base" />
                <DetailItem label="Paid Amount" value={`${selectedBill.paidAmount.toLocaleString()}rs`} />
                <DetailItem
                  label="Due Amount"
                  value={
                    <Badge variant={selectedBill.dueAmount > 0 ? 'destructive' : 'default'}>
                      {selectedBill.dueAmount.toLocaleString()}rs
                    </Badge>
                  }
                />
                <Separator />
                <DetailItem label="Paid To" value={selectedBill.paidTo} />
                <DetailItem label="Payment Mode" value={selectedBill.paymentMode} />
                <DetailItem label="Date & Time" value={new Date(selectedBill.createdAt).toLocaleString()} />
              </div>
            </div>
            <DialogFooter className="sm:justify-end">
              <Button onClick={handleCloseDialog}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
