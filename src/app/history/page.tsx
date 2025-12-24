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
import type { Bill } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { FileText, Loader2, Search } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, getDoc, doc } from 'firebase/firestore';

export default function HistoryPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isOwner, setIsOwner] = React.useState<boolean | null>(null);

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
    return query(
      collection(firestore, collectionPath),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, collectionPath]);

  const { data: bills, isLoading } = useCollection<Bill>(billsQuery);

  const filteredBills = React.useMemo(() => {
    if (!bills) return [];
    return bills.filter(bill =>
      bill.customerName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [bills, searchTerm]);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight font-headline">
          Billing History
        </h2>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Bills</CardTitle>
          <CardDescription>
            A complete record of all generated bills.
          </CardDescription>
          <div className="relative pt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by customer name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading || isOwner === null ? (
             <div className="flex justify-center items-center py-16">
                <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
            </div>
          ) : filteredBills && filteredBills.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Paid Amount</TableHead>
                  <TableHead>Due Amount</TableHead>
                  <TableHead>Date & Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBills.map((bill) => (
                  <TableRow
                    key={bill.id}
                  >
                    <TableCell>{bill.customerName}</TableCell>
                    <TableCell>{bill.totalAmount.toLocaleString()}rs</TableCell>
                    <TableCell>{bill.paidAmount.toLocaleString()}rs</TableCell>
                    <TableCell>
                      <Badge
                        variant={bill.dueAmount > 0 ? 'destructive' : 'outline'}
                      >
                        {bill.dueAmount > 0 ? `${bill.dueAmount.toLocaleString()}rs` : 'Paid'}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(bill.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-16">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No Bills Found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    Your search for "{searchTerm}" did not return any results.
                </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
