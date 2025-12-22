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
import { mockBills } from '@/lib/mock-data';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Button } from './ui/button';
import { BellRing, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { composeReminderMessage } from '@/ai/flows/compose-reminder-message';

const salesData = [
  { name: 'Apr', total: Math.floor(Math.random() * 5000) + 1000 },
  { name: 'May', total: Math.floor(Math.random() * 5000) + 1000 },
  { name: 'Jun', total: Math.floor(Math.random() * 5000) + 1000 },
  { name: 'Jul', total: Math.floor(Math.random() * 5000) + 1000 },
];

export function OwnerDashboard() {
  const { toast } = useToast();
  const [isSendingReminders, setIsSendingReminders] = React.useState(false);

  const dueBills = mockBills.filter((bill) => bill.dueAmount > 0);
  const recentBills = [...mockBills].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  ).slice(0, 5);
  
  const inactiveCustomers = mockBills.filter(bill => {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    return bill.createdAt < oneMonthAgo;
  }).slice(0, 1); // Get one for demo

  const handleSendReminders = async () => {
    if (inactiveCustomers.length === 0) {
        toast({ title: 'No inactive customers to remind.' });
        return;
    }
    setIsSendingReminders(true);
    try {
        for (const customer of inactiveCustomers) {
            const result = await composeReminderMessage({
                customerName: customer.customerName,
                lastActivityDate: customer.createdAt.toISOString().split('T')[0]
            });
            console.log('Reminder Message:', result.message);
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


  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockBills.reduce((sum, bill) => sum + bill.paidAmount, 0).toLocaleString()}rs</div>
            <p className="text-xs text-muted-foreground">in the last 6 months</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{dueBills.reduce((sum, bill) => sum + bill.dueAmount, 0).toLocaleString()}rs</div>
            <p className="text-xs text-muted-foreground">{dueBills.length} active dues</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{mockBills.length}</div>
            <p className="text-xs text-muted-foreground">in the last 6 months</p>
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
            <ResponsiveContainer width="100%" height={350}>
                <BarChart data={salesData}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000}krs`}/>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                      formatter={(value: number) => `${value.toLocaleString()}rs`}
                    />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
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
          </CardContent>
        </Card>
      </div>

       <div className='grid gap-4 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Recent Bills</CardTitle>
            <CardDescription>A list of the most recent bills generated.</CardDescription>
          </CardHeader>
          <CardContent>
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
                  <TableRow key={bill.id}>
                    <TableCell>{bill.customerName}</TableCell>
                    <TableCell>{bill.totalAmount.toLocaleString()}rs</TableCell>
                    <TableCell>
                      <Badge variant={bill.dueAmount > 0 ? 'destructive' : 'outline'}>
                         {bill.dueAmount.toLocaleString()}rs
                      </Badge>
                    </TableCell>
                    <TableCell>{bill.createdAt.toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
                    <p className="font-semibold">{inactiveCustomers.length} customer(s) found.</p>
                    <ul className="text-sm text-muted-foreground list-disc pl-5 mt-2">
                        {inactiveCustomers.map(c => <li key={c.id}>{c.customerName} (Last visit: {c.createdAt.toLocaleDateString()})</li>)}
                         {inactiveCustomers.length === 0 && <li>All customers are active!</li>}
                    </ul>
                </div>
            </CardContent>
            <CardContent>
                 <Button onClick={handleSendReminders} disabled={isSendingReminders || inactiveCustomers.length === 0} className='w-full'>
                    {isSendingReminders ? 'Sending...' : 'Send Reminder(s)'}
                    <Send className='ml-2 h-4 w-4'/>
                 </Button>
            </CardContent>
        </Card>
       </div>
    </div>
  );
}
