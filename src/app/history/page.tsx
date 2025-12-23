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
import { useAppContext } from '@/components/root-state-provider';
import { FileText } from 'lucide-react';

export default function HistoryPage() {
  const { bills } = useAppContext();
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
          {bills.length > 0 ? (
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
                {bills.map((bill) => (
                  <TableRow
                    key={bill.id}
                    onClick={() => handleBillClick(bill)}
                    className="cursor-pointer"
                  >
                    <TableCell>{bill.customerName}</TableCell>
                    <TableCell>{bill.totalAmount.toLocaleString()}rs</TableCell>
                    <TableCell>
                      <Badge
                        variant={bill.dueAmount > 0 ? 'destructive' : 'outline'}
                      >
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
                <h3 className="mt-4 text-lg font-semibold">No Bills Found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    Generate a new bill to see its history here.
                </p>
            </div>
          )}
        </CardContent>
      </Card>
      {selectedBill && (
        <Dialog open={!!selectedBill} onOpenChange={handleCloseDialog}>
          <DialogContent className="sm:max-w-md printable-area">
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
                <DetailItem label="Rate" value={`${(selectedBill.totalAmount/selectedBill.totalCarat).toFixed(2)}rs`} />
                <Separator />
                <DetailItem
                  label="Total Amount"
                  value={`${selectedBill.totalAmount.toLocaleString()}rs`}
                  className="font-bold text-base"
                />
                <DetailItem
                  label="Paid Amount"
                  value={`${selectedBill.paidAmount.toLocaleString()}rs`}
                />
                <DetailItem
                  label="Due Amount"
                  value={
                    <Badge
                      variant={
                        selectedBill.dueAmount > 0 ? 'destructive' : 'default'
                      }
                    >
                      {selectedBill.dueAmount.toLocaleString()}rs
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
            <DialogFooter className="sm:justify-between non-printable">
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
