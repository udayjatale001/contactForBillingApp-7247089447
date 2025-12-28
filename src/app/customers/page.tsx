
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
import type { Bill, Customer } from '@/lib/types';
import { Input } from '@/components/ui/input';
import {
  Users,
  Loader2,
  Search,
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { useLanguage } from '@/context/language-context';

export default function CustomersPage() {
  const { t } = useLanguage();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [searchTerm, setSearchTerm] = React.useState('');

  const billsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    // We need all bills to aggregate customer data, so we query the global collection.
    return query(collection(firestore, 'bills'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: allBills, isLoading: isLoadingBills, error: billsError } = useCollection<Bill>(billsQuery);

  const aggregatedCustomers = React.useMemo(() => {
    if (!allBills) return [];

    const customerMap: Map<string, Customer> = new Map();

    allBills.forEach(bill => {
      const customerNameKey = bill.customerName.trim().toLowerCase();
      
      let customer = customerMap.get(customerNameKey);
      
      if (!customer) {
        // This is the first time we see this customer
        customer = {
          id: bill.managerId + '-' + customerNameKey, // Create a stable unique ID
          name: bill.customerName,
          contactNumber: bill.contactNumber,
          totalBilledAmount: 0,
          totalPaidAmount: 0,
          totalDueAmount: 0,
          totalCarat: 0,
          lastActivity: bill.createdAt,
        };
      }
      
      // Aggregate data
      customer.totalBilledAmount += bill.totalAmount;
      customer.totalPaidAmount += bill.paidAmount;
      customer.totalDueAmount += bill.dueAmount;
      customer.totalCarat += bill.totalCarat;

      // Update contact number and last activity date if the current bill is newer
      if (bill.createdAt > customer.lastActivity) {
          customer.lastActivity = bill.createdAt;
          if (bill.contactNumber) {
              customer.contactNumber = bill.contactNumber;
          }
      }

      customerMap.set(customerNameKey, customer);
    });

    return Array.from(customerMap.values()).sort((a,b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
  }, [allBills]);

  const filteredCustomers = React.useMemo(() => {
    if (searchTerm) {
      return aggregatedCustomers.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return aggregatedCustomers;
  }, [aggregatedCustomers, searchTerm]);
  
  const isLoading = isUserLoading || isLoadingBills;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight font-headline">
          {t('customers')}
        </h2>
      </div>
       <Card>
          <CardHeader>
            <CardTitle>All Customers</CardTitle>
            <CardDescription>
              A complete list of all customers and their aggregated transaction data.
            </CardDescription>
            <div className="border-t pt-4 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder={t('search_by_customer_name')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-16">
                  <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
              </div>
            ) : filteredCustomers && filteredCustomers.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('customer_name')}</TableHead>
                      <TableHead>{t('contact_number')}</TableHead>
                      <TableHead>Total Billed</TableHead>
                      <TableHead>Total Paid</TableHead>
                      <TableHead>Total Due</TableHead>
                      <TableHead>Total Carat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>{customer.contactNumber || 'N/A'}</TableCell>
                        <TableCell>{customer.totalBilledAmount.toLocaleString()}rs</TableCell>
                        <TableCell>{customer.totalPaidAmount.toLocaleString()}rs</TableCell>
                        <TableCell>
                           <Badge
                            variant={customer.totalDueAmount > 0 ? 'destructive' : 'outline'}
                          >
                            {customer.totalDueAmount > 0 ? `${customer.totalDueAmount.toLocaleString()}rs` : 'Cleared'}
                          </Badge>
                        </TableCell>
                        <TableCell>{customer.totalCarat.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-16">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No Customers Found</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                      Customer data will appear here once you start creating bills.
                  </p>
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
