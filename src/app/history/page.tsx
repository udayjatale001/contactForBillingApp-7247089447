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
import type { Bill } from '@/lib/mock-data';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export default function HistoryPage() {
  const [selectedBill, setSelectedBill] = React.useState<Bill | null>(null);

  const handleBillClick = (bill: Bill) => {
    setSelectedBill(bill);
  };

  const handleCloseDialog = () => {
    setSelectedBill(null);
  };

  const handlePrint = () => {
    window.print();
  };

  const DetailItem = ({
    label,
    value,
    className,
  }: {
    label: string;
    value: React.ReactNode;
    className?: string;
  }) => (
    <div className={`flex justify-between items-center ${className}`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );

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
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Due Amount</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockBills.map((bill) => (
                <TableRow
                  key={bill.id}
                  onClick={() => handleBillClick(bill)}
                  className="cursor-pointer"
                >
                  <TableCell>{bill.customerName}</TableCell>
                  <TableCell>rs{bill.totalAmount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge
                      variant={bill.dueAmount > 0 ? 'destructive' : 'outline'}
                    >
                      rs{bill.dueAmount.toLocaleString()}
                    </Badge>
                  </TableCell>
                  <TableCell>{bill.createdAt.toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
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
                <DetailItem
                  label="Total Carat"
                  value={selectedBill.totalCarat}
                />
                <DetailItem
                  label="Carat Type"
                  value={selectedBill.caratType}
                />
                <DetailItem label="Rate" value={`rs${selectedBill.rate}`} />
                <DetailItem
                  label="Total Amount"
                  value={`rs${selectedBill.totalAmount.toLocaleString()}`}
                  className="font-bold text-base"
                />
                <DetailItem
                  label="Paid Amount"
                  value={`rs${selectedBill.paidAmount.toLocaleString()}`}
                />
                <DetailItem
                  label="Due Amount"
                  value={
                    <Badge
                      variant={
                        selectedBill.dueAmount > 0 ? 'destructive' : 'default'
                      }
                    >
                      rs{selectedBill.dueAmount.toLocaleString()}
                    </Badge>
                  }
                />
                <Separator />
                <DetailItem label="Paid To" value={selectedBill.paidTo} />
                <DetailItem
                  label="Payment Mode"
                  value={selectedBill.paymentMode}
                />
                <DetailItem
                  label="Date & Time"
                  value={new Date(selectedBill.createdAt).toLocaleString()}
                />
              </div>
            </div>
            <DialogFooter className="sm:justify-between">
              <Button variant="outline" onClick={handlePrint}>
                Print
              </Button>
              <Button onClick={handleCloseDialog}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
