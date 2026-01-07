
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
  Pencil,
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
import { Checkbox } from '@/components/ui/checkbox';
import { useRouter } from 'next/navigation';
import { useToken } from '@/context/token-context';
import { DailySummaryWhatsAppDialog } from '@/components/daily-summary-whatsapp-dialog';


const BillHistoryTab = React.memo(function BillHistoryTab({ isOwner, user }: { isOwner: boolean | null, user: any}) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { globalDate, setGlobalDate, clearGlobalDate } = useDateFilter();
  
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedBill, setSelectedBill] = React.useState<Bill | null>(null);
  const [billToDelete, setBillToDelete] = React.useState<Bill | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = React.useState(false);


  const billsQuery = useMemoFirebase(() => {
    if (isOwner === null || !user || !firestore) return null;
    
    const collectionPath = isOwner ? 'bills' : `managers/${user.uid}/bills`;
    const dateToFilter = globalDate || new Date();
    const startDate = startOfDay(dateToFilter);
    const endDate = endOfDay(dateToFilter);

    return query(
      collection(firestore, collectionPath),
      where('createdAt', '>=', startDate.toISOString()),
      where('createdAt', '<=', endDate.toISOString()),
      orderBy('createdAt', 'desc')
    );
  }, [isOwner, user, firestore, globalDate]);


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

  React.useEffect(() => {
    const visibleIds = new Set(filteredBills.map(n => n.id));
    setSelectedIds(currentIds => {
      const newIds = new Set<string>();
      currentIds.forEach(id => {
        if (visibleIds.has(id)) {
          newIds.add(id);
        }
      });
      return newIds;
    });
  }, [filteredBills]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredBills.map(n => n.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleBulkDelete = async () => {
    if (!firestore || !user || selectedIds.size === 0) return;
    
    setIsBulkDeleting(true);
    const batch = writeBatch(firestore);

    try {
        if (isOwner) {
            // Owner needs to delete from global `bills` and potentially from manager subcollections
            // For simplicity, we assume we need to find the manager for each bill.
            // This is a slow operation, but necessary if not deleting from subcollections directly.
            for (const billId of selectedIds) {
                const billRef = doc(firestore, 'bills', billId);
                const billDoc = await getDoc(billRef);
                if (billDoc.exists()) {
                    const billData = billDoc.data() as Bill;
                    batch.delete(billRef);
                    // Also delete from manager subcollection
                    const managerBillRef = doc(firestore, 'managers', billData.managerId, 'bills', billId);
                    batch.delete(managerBillRef);
                }
            }
        } else {
            // Manager only deletes from their own subcollection
            selectedIds.forEach(id => {
                const managerBillRef = doc(firestore, 'managers', user.uid, 'bills', id);
                batch.delete(managerBillRef);
            });
        }
        
        await batch.commit();
        toast({
            title: 'Bills Deleted',
            description: `${selectedIds.size} bills have been successfully removed.`
        });
        setSelectedIds(new Set());
    } catch (error) {
      console.error("Error bulk deleting bills: ", error);
      toast({
        variant: 'destructive',
        title: 'Bulk Deletion Failed',
        description: 'Could not delete selected bills. You may not have permission.'
      });
    } finally {
      setIsBulkDeleting(false);
      setShowBulkDeleteConfirm(false);
    }
  };
  
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
    if (!firestore || !billToDelete || !user) return;

    setIsDeleting(true);

    try {
        const batch = writeBatch(firestore);
        
        // Both owner and manager need to delete from the global collection
        const globalBillRef = doc(firestore, 'bills', billToDelete.id);
        batch.delete(globalBillRef);

        // Also delete from the manager's subcollection
        const managerBillRef = doc(firestore, 'managers', billToDelete.managerId, 'bills', billToDelete.id);
        batch.delete(managerBillRef);
        
        await batch.commit();

        toast({
            title: 'Bill Deleted',
            description: `The bill for ${billToDelete.customerName} has been removed.`,
        });

    } catch (error) {
        console.error("Error deleting bill: ", error);
        const permissionError = new FirestorePermissionError({
            path: `bills/${billToDelete.id}`, // Specific path for error
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
            variant: 'destructive',
            title: 'Deletion Failed',
            description: 'Could not remove the bill. You may not have permission.',
        });
    } finally {
        setIsDeleting(false);
        setBillToDelete(null);
    }
  };

  const handleCloseDialog = () => {
    setSelectedBill(null);
  };
  
  const allFilteredSelected = filteredBills.length > 0 && selectedIds.size === filteredBills.length;

  return (
    <>
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div>
                        <CardTitle>All Bills</CardTitle>
                        <CardDescription>
                        A complete record of all generated bills.
                        </CardDescription>
                    </div>
                    {selectedIds.size > 0 && !isOwner && (
                        <Button 
                            variant="destructive" 
                            onClick={() => setShowBulkDeleteConfirm(true)}
                            disabled={isBulkDeleting}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete ({selectedIds.size})
                        </Button>
                    )}
                </div>

                <div className="border-t pt-4 mt-4 space-y-4">
                <div className="flex flex-col md:flex-row flex-wrap gap-2">
                    <div className="relative flex-1 md:min-w-[200px]">
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
                                'w-full justify-start text-left font-normal',
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
                 {filteredBills.length > 0 && !isOwner && (
                    <div className="flex items-center space-x-2">
                        <Checkbox 
                            id="select-all-bills" 
                            checked={allFilteredSelected}
                            onCheckedChange={(checked) => handleSelectAll(!!checked)}
                        />
                        <label
                            htmlFor="select-all-bills"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                           Select all ({filteredBills.length})
                        </label>
                    </div>
                )}
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
                          {!isOwner && <TableHead className="w-10"></TableHead>}
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
                            className={cn("cursor-pointer", selectedIds.has(bill.id) && 'bg-primary/10')}
                            onClick={() => handleRowClick(bill)}
                        >
                            {!isOwner && 
                            <TableCell onClick={(e) => e.stopPropagation()}>
                                 <Checkbox 
                                    checked={selectedIds.has(bill.id)} 
                                    onCheckedChange={(checked) => handleSelectOne(bill.id, !!checked)}
                                    aria-label={`Select bill ${bill.id}`}
                                />
                            </TableCell>
                            }
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

            <div className="mt-6 flex justify-end">
                <DailySummaryWhatsAppDialog />
            </div>

      {selectedBill && (
        <BillSummaryDialog
          bill={selectedBill}
          open={!!selectedBill}
          onOpenChange={handleCloseDialog}
          onSave={async () => { /* Dummy */ }}
          isSaving={false}
          isViewing
          onDelete={handleDeleteFromDialog}
        />
      )}
      
       <AlertDialog
        open={!!billToDelete}
        onOpenChange={() => setBillToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete the bill for{' '}
              <span className='font-semibold'>{billToDelete?.customerName}</span>.
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
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog
        open={showBulkDeleteConfirm && !isOwner}
        onOpenChange={setShowBulkDeleteConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the {selectedIds.size} selected bills from your history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isBulkDeleting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete Selected
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
  const { setTokenData } = useToken();
  const router = useRouter();

  const [searchTerm, setSearchTerm] = React.useState('');
  const [tokenToDelete, setTokenToDelete] = React.useState<Token | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [selectedToken, setSelectedToken] = React.useState<Token | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = React.useState(false);

  const tokensQuery = useMemoFirebase(() => {
    if (isOwner === null || !user || !firestore) return null;
    
    const collectionPath = isOwner ? 'tokens' : `managers/${user.uid}/tokens`;
    const dateToFilter = globalDate || new Date();
    const startDate = startOfDay(dateToFilter);
    const endDate = endOfDay(dateToFilter);
    
    return query(
        collection(firestore, collectionPath),
        where('createdAt', '>=', startDate.toISOString()),
        where('createdAt', '<=', endDate.toISOString()),
        orderBy('createdAt', 'desc')
    );
  }, [isOwner, user, firestore, globalDate]);

  const { data: tokens, isLoading } = useCollection<Token>(tokensQuery);

  const filteredTokens = React.useMemo(() => {
    if (!tokens) return [];
    
    if (searchTerm) {
        return tokens.filter(token => {
            const searchLower = searchTerm.toLowerCase();
            const nameMatch = token.customerName.toLowerCase().includes(searchLower);
            const tokenNoMatch = token.id.slice(-6).toLowerCase().includes(searchLower);
            return nameMatch || tokenNoMatch;
        });
    }

    return tokens;
  }, [tokens, searchTerm]);

   React.useEffect(() => {
    const visibleIds = new Set(filteredTokens.map(n => n.id));
    setSelectedIds(currentIds => {
      const newIds = new Set<string>();
      currentIds.forEach(id => {
        if (visibleIds.has(id)) {
          newIds.add(id);
        }
      });
      return newIds;
    });
  }, [filteredTokens]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredTokens.map(n => n.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleBulkDelete = async () => {
    if (!firestore || selectedIds.size === 0) return;
    
    setIsBulkDeleting(true);
    const batch = writeBatch(firestore);

    try {
        const tokenDocs = await Promise.all(
          Array.from(selectedIds).map(id => getDoc(doc(firestore, 'tokens', id)))
        );

        tokenDocs.forEach(tokenDoc => {
            if (tokenDoc.exists()) {
                const tokenData = tokenDoc.data() as Token;
                batch.delete(doc(firestore, 'tokens', tokenDoc.id));
                batch.delete(doc(firestore, 'managers', tokenData.managerId, 'tokens', tokenDoc.id));
            }
        });
        
        await batch.commit();
        toast({
            title: 'Tokens Deleted',
            description: `${selectedIds.size} tokens have been successfully removed.`
        });
        setSelectedIds(new Set());
    } catch (error) {
      console.error("Error bulk deleting tokens: ", error);
      toast({
        variant: 'destructive',
        title: 'Bulk Deletion Failed',
        description: 'Could not delete selected tokens. You may not have permission.'
      });
    } finally {
      setIsBulkDeleting(false);
      setShowBulkDeleteConfirm(false);
    }
  };
  
  const handleRowClick = (token: Token) => {
    setSelectedToken(token);
  };
  
  const handleDeleteFromDialog = () => {
    if (selectedToken) {
      setTokenToDelete(selectedToken);
      setSelectedToken(null);
    }
  };
  
  const handleContinueToBill = (e: React.MouseEvent, token: Token) => {
    e.stopPropagation();
    setTokenData(token);
    router.push('/');
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
  
  const allFilteredSelected = filteredTokens.length > 0 && selectedIds.size === filteredTokens.length;

  return (
    <>
      <Card>
          <CardHeader>
             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                    <CardTitle>All Tokens</CardTitle>
                    <CardDescription>
                    A record of all printed tokens.
                    </CardDescription>
                </div>
                {selectedIds.size > 0 && (
                    <Button 
                        variant="destructive" 
                        onClick={() => setShowBulkDeleteConfirm(true)}
                        disabled={isBulkDeleting}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete ({selectedIds.size})
                    </Button>
                )}
            </div>

            <div className="border-t pt-4 mt-4 space-y-4">
              <div className="flex flex-col md:flex-row flex-wrap gap-2">
                <div className="relative flex-1 md:min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Search by customer name or token no..."
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
                            'w-full justify-start text-left font-normal',
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
                {filteredTokens.length > 0 && (
                    <div className="flex items-center space-x-2">
                        <Checkbox 
                            id="select-all-tokens" 
                            checked={allFilteredSelected}
                            onCheckedChange={(checked) => handleSelectAll(!!checked)}
                        />
                        <label
                            htmlFor="select-all-tokens"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                           Select all ({filteredTokens.length})
                        </label>
                    </div>
                )}
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
                      <TableHead className='w-10'></TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>In Carat</TableHead>
                      <TableHead>Room No.</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTokens.map((token) => (
                      <TableRow 
                        key={token.id}
                        onClick={() => handleRowClick(token)}
                        className={cn("cursor-pointer", selectedIds.has(token.id) && 'bg-primary/10')}
                      >
                         <TableCell onClick={(e) => e.stopPropagation()}>
                             <Checkbox 
                                checked={selectedIds.has(token.id)} 
                                onCheckedChange={(checked) => handleSelectOne(token.id, !!checked)}
                                aria-label={`Select token ${token.id}`}
                            />
                        </TableCell>
                        <TableCell>{token.customerName}</TableCell>
                        <TableCell>{token.inCarat || 'N/A'}</TableCell>
                        <TableCell>{token.roomNumber || 'N/A'}</TableCell>
                        <TableCell>{token.contactNumber || 'N/A'}</TableCell>
                        <TableCell>{format(new Date(token.createdAt), 'PPpp')}</TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" onClick={(e) => handleContinueToBill(e, token)}>
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">Continue to Bill</span>
                            </Button>
                        </TableCell>
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

       <AlertDialog
        open={showBulkDeleteConfirm}
        onOpenChange={setShowBulkDeleteConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the {selectedIds.size} selected tokens.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isBulkDeleting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete Selected
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
    <div className="flex-1 space-y-4 p-2 sm:p-4 md:p-8 pt-6">
      <Tabs defaultValue="bills" className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
