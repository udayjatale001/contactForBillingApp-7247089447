
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import type { Bill, Token } from '@/lib/types';
import { Input } from '@/components/ui/input';
import {
  FileText,
  Loader2,
  Search,
  Calendar as CalendarIcon,
  X,
  Trash2,
  Ticket,
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, getDoc, doc, deleteDoc, writeBatch, getDocs } from 'firebase/firestore';
import { BillSummaryDialog } from '@/components/bill-summary-dialog';
import { TokenSummaryDialog } from '@/components/token-summary-dialog';
import { cn } from '@/lib/utils';
import { format, startOfDay, endOfDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDateFilter } from '@/context/date-filter-context';


const BillHistoryTab = React.memo(function BillHistoryTab({ isOwner, user }: { isOwner: boolean | null, user: any}) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { globalDate, setGlobalDate, clearGlobalDate } = useDateFilter();
  
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedBill, setSelectedBill] = React.useState<Bill | null>(null);
  const [billToDelete, setBillToDelete] = React.useState<Bill | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);


  const collectionPath = React.useMemo(() => {
    if (isOwner === null || !user) return null;
    return isOwner ? 'bills' : `managers/${user.uid}/bills`;
  }, [isOwner, user]);

  const billsQuery = useMemoFirebase(() => {
    if (!firestore || !collectionPath) return null;

    const dateToFilter = globalDate || new Date();
    const startDate = startOfDay(dateToFilter);
    const endDate = endOfDay(dateToFilter);

    return query(
      collection(firestore, collectionPath),
      where('createdAt', '>=', startDate.toISOString()),
      where('createdAt', '<=', endDate.toISOString()),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, collectionPath, globalDate]);


  const { data: bills, isLoading } = useCollection<Bill>(billsQuery);

  const filteredBills = React.useMemo(() => {
    if (!bills) return [];
    
    if (searchTerm) {
        return bills.filter(bill => {
            const searchLower = searchTerm.toLowerCase();
            const nameMatch = bill.customerName.toLowerCase().includes(searchLower);
            const billNoMatch = bill.id.slice(-6).toLowerCase().includes(searchLower);
            return nameMatch || billNoMatch;
        });
    }
    
    return bills;
  }, [bills, searchTerm]);
  
  const handleRowClick = (bill: Bill) => {
    setSelectedBill(bill);
  };
  
  const handleDeleteFromDialog = () => {
    if (selectedBill) {
      setBillToDelete(selectedBill);
      setSelectedBill(null); // Close the summary dialog
    }
  };

  const confirmDelete = async () => {
    if (!firestore || !billToDelete || !user || isOwner) return;

    setIsDeleting(true);

    try {
        // Only delete from the manager's subcollection, not the global one.
        const managerBillRef = doc(firestore, 'managers', billToDelete.managerId, 'bills', billToDelete.id);
        await deleteDoc(managerBillRef);

        toast({
            title: 'Bill Removed',
            description: `The bill for ${billToDelete.customerName} has been removed from your history.`,
        });

    } catch (error) {
        console.error("Error deleting bill from history: ", error);
        const permissionError = new FirestorePermissionError({
            path: `managers/${billToDelete.managerId}/bills/${billToDelete.id}`, // Specific path for error
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
            variant: 'destructive',
            title: 'Deletion Failed',
            description: 'Could not remove the bill from your history. You may not have permission.',
        });
    } finally {
        setIsDeleting(false);
        setBillToDelete(null);
    }
  };

  const handleCloseDialog = () => {
    setSelectedBill(null);
  };

  return (
    <>
      <Card>
          <CardHeader>
            <CardTitle>All Bills</CardTitle>
            <CardDescription>
              A complete record of all generated bills. Click row to view.
            </CardDescription>
            <div className="border-t pt-4 mt-4">
              <div className="flex flex-col md:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Search by customer name or bill no..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                        <PopoverTrigger asChild>
                        <Button
                            variant={'outline'}
                            className={cn(
                            'w-full md:w-[280px] justify-start text-left font-normal',
                            !globalDate && 'text-muted-foreground'
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {globalDate ? format(globalDate, 'PPP') : <span>Today</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                            mode="single"
                            selected={globalDate ?? undefined}
                            onSelect={(date) => {
                                setGlobalDate(date || new Date());
                                setIsCalendarOpen(false);
                            }}
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                    {globalDate && (
                        <Button variant="ghost" size="icon" onClick={clearGlobalDate}>
                        <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-16">
                  <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
              </div>
            ) : filteredBills && filteredBills.length > 0 ? (
              <div className="w-full overflow-x-auto">
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
                        onClick={() => handleRowClick(bill)}
                        className="cursor-pointer"
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
                        <TableCell>{format(new Date(bill.createdAt), 'PPpp')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-16">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No Bills Found</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                      No records found for the selected period.
                  </p>
              </div>
            )}
          </CardContent>
        </Card>

      {selectedBill && (
        <BillSummaryDialog
          bill={selectedBill}
          open={!!selectedBill}
          onOpenChange={handleCloseDialog}
          onSave={async () => { /* This is a dummy function as we're not saving from history view */ }}
          isSaving={false}
          isViewing
          onDelete={!isOwner ? handleDeleteFromDialog : undefined}
        />
      )}
      
       <AlertDialog
        open={!!billToDelete && !isOwner}
        onOpenChange={() => setBillToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will remove the bill for{' '}
              <span className='font-semibold'>{billToDelete?.customerName}</span> from your history view. It will not delete the global record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove From History
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
});

const TokenHistoryTab = React.memo(function TokenHistoryTab({ isOwner, user }: { isOwner: boolean | null, user: any}) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { globalDate, setGlobalDate, clearGlobalDate } = useDateFilter();
  
  const [searchTerm, setSearchTerm] = React.useState('');
  const [tokenToDelete, setTokenToDelete] = React.useState<Token | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [selectedToken, setSelectedToken] = React.useState<Token | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);

  const collectionPath = React.useMemo(() => {
    if (isOwner === null || !user) return null;
    return isOwner ? 'tokens' : `managers/${user.uid}/tokens`;
  }, [isOwner, user]);

  const tokensQuery = useMemoFirebase(() => {
    if (!firestore || !collectionPath) return null;
    
    const dateToFilter = globalDate || new Date();
    const startDate = startOfDay(dateToFilter);
    const endDate = endOfDay(dateToFilter);
    
    return query(
        collection(firestore, collectionPath),
        where('createdAt', '>=', startDate.toISOString()),
        where('createdAt', '<=', endDate.toISOString()),
        orderBy('createdAt', 'desc')
    );
  }, [firestore, collectionPath, globalDate]);

  const { data: tokens, isLoading } = useCollection<Token>(tokensQuery);

  const filteredTokens = React.useMemo(() => {
    if (!tokens) return [];
    
    if (searchTerm) {
        return tokens.filter(token => {
            const searchLower = searchTerm.toLowerCase();
            return token.customerName.toLowerCase().includes(searchLower);
        });
    }

    return tokens;
  }, [tokens, searchTerm]);
  
  const handleRowClick = (token: Token) => {
    setSelectedToken(token);
  };
  
  const handleDeleteFromDialog = () => {
    if (selectedToken) {
      setTokenToDelete(selectedToken);
      setSelectedToken(null);
    }
  };

  const confirmDelete = async () => {
    if (!firestore || !tokenToDelete || !user) return;

    setIsDeleting(true);

    try {
        const batch = writeBatch(firestore);

        const globalTokenRef = doc(firestore, 'tokens', tokenToDelete.id);
        batch.delete(globalTokenRef);

        const managerTokenRef = doc(firestore, 'managers', tokenToDelete.managerId, 'tokens', tokenToDelete.id);
        batch.delete(managerTokenRef);
        
        await batch.commit();

        toast({
            title: 'Token Deleted',
            description: `The token for ${tokenToDelete.customerName} has been removed.`,
        });

    } catch (error) {
        console.error("Error deleting token: ", error);
        const permissionError = new FirestorePermissionError({
            path: `tokens/${tokenToDelete.id}`,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
            variant: 'destructive',
            title: 'Deletion Failed',
            description: 'Could not delete the token. You may not have permission.',
        });
    } finally {
        setIsDeleting(false);
        setTokenToDelete(null);
    }
  };

  return (
    <>
      <Card>
          <CardHeader>
            <CardTitle>All Tokens</CardTitle>
            <CardDescription>
              A record of all printed tokens. These are saved separately from bills.
            </CardDescription>
            <div className="border-t pt-4 mt-4">
              <div className="flex flex-col md:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Search by customer name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                 <div className="flex items-center gap-2">
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                        <PopoverTrigger asChild>
                        <Button
                            variant={'outline'}
                            className={cn(
                            'w-full md:w-[280px] justify-start text-left font-normal',
                            !globalDate && 'text-muted-foreground'
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {globalDate ? format(globalDate, 'PPP') : <span>Today</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                            mode="single"
                            selected={globalDate ?? undefined}
                            onSelect={(date) => {
                                setGlobalDate(date || new Date());
                                setIsCalendarOpen(false);
                            }}
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                    {globalDate && (
                        <Button variant="ghost" size="icon" onClick={clearGlobalDate}>
                        <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-16">
                  <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTokens && filteredTokens.length > 0 ? (
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>In Carat</TableHead>
                      <TableHead>Room No.</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Date & Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTokens.map((token) => (
                      <TableRow 
                        key={token.id}
                        onClick={() => handleRowClick(token)}
                        className="cursor-pointer"
                      >
                        <TableCell>{token.customerName}</TableCell>
                        <TableCell>{token.inCarat || 'N/A'}</TableCell>
                        <TableCell>{token.roomNumber || 'N/A'}</TableCell>
                        <TableCell>{token.contactNumber || 'N/A'}</TableCell>
                        <TableCell>{format(new Date(token.createdAt), 'PPpp')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-16">
                  <Ticket className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No Tokens Found</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                      No records found for the selected period.
                  </p>
              </div>
            )}
          </CardContent>
        </Card>
      
       <AlertDialog
        open={!!tokenToDelete}
        onOpenChange={() => setTokenToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the token for{' '}
              <span className='font-semibold'>{tokenToDelete?.customerName}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Token
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {selectedToken && (
        <TokenSummaryDialog
            token={selectedToken}
            open={!!selectedToken}
            onOpenChange={() => setSelectedToken(null)}
            onPrint={() => window.print()}
            onDelete={handleDeleteFromDialog}
        />
      )}
    </>
  )
});


function HistoryPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
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
  
  const isLoadingData = isUserLoading || isOwner === null;
  
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <Tabs defaultValue="bills" className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
          <h2 className="text-3xl font-bold tracking-tight font-headline">
            History
          </h2>
          <TabsList>
            <TabsTrigger value="bills">Bill History</TabsTrigger>
            <TabsTrigger value="tokens">Token History</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="bills">
          {isLoadingData ? (
             <div className="flex justify-center items-center py-16">
                <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
             </div>
          ) : (
            <BillHistoryTab isOwner={isOwner} user={user} />
          )}
        </TabsContent>
        <TabsContent value="tokens">
           {isLoadingData ? (
             <div className="flex justify-center items-center py-16">
                <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
             </div>
           ) : (
            <TokenHistoryTab isOwner={isOwner} user={user} />
           )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default HistoryPage;
