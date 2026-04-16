'use client';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogClose,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import type { AggregatedCustomer } from '@/app/koushal/page';
import { Loader2, X, MessageSquare, Trash2, Pencil, Lock, Save } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/language-context';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';

interface CustomerSummaryDialogProps {
  customer: AggregatedCustomer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWhatsApp: () => void;
  onDelete: () => void;
  onEdit: (data: any) => Promise<void>;
}

export function CustomerSummaryDialog({ customer, open, onOpenChange, onWhatsApp, onDelete, onEdit }: CustomerSummaryDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = React.useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = React.useState(false);
  const [passwordInput, setPasswordInput] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [editForm, setEditForm] = React.useState({
    name: '',
    contactNumber: '',
    address: '',
    totalCarat: 0,
    totalAmount: 0,
  });

  React.useEffect(() => {
    if (customer && !isEditing) {
        setEditForm({
            name: customer.name,
            contactNumber: customer.contactNumber || '',
            address: customer.address || '',
            totalCarat: customer.totalCarat,
            totalAmount: customer.totalAmount,
        });
    }
  }, [customer, isEditing]);
  
  if (!customer) {
    return null;
  }
  
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === '9981') {
      setShowPasswordDialog(false);
      setPasswordInput('');
      setIsEditing(true);
    } else {
      toast({
        variant: 'destructive',
        title: 'Incorrect Password',
        description: 'You do not have permission for this action.',
      });
      setPasswordInput('');
    }
  };

  const handleSaveEdit = async () => {
    setIsSubmitting(true);
    try {
        await onEdit(editForm);
        setIsEditing(false);
    } catch (error) {
        console.error("Save failed:", error);
    } finally {
        setIsSubmitting(false);
    }
  };

  const DetailItem = ({ label, value, valueClassName }: { label: string, value: React.ReactNode, valueClassName?: string }) => (
    <div className="flex justify-between items-center py-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("text-sm font-semibold text-right text-foreground", valueClassName)}>{value}</p>
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={(val) => { if(!val) { setIsEditing(false); onOpenChange(false); } }}>
        <DialogContent className="max-w-md w-full p-0 sm:max-h-[90vh] flex flex-col">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-xl font-bold tracking-tight">
                {isEditing ? `Edit ${customer.name}` : `${customer.name.toUpperCase()}`}
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 bg-background overflow-y-auto flex-1 space-y-6">
              {!isEditing ? (
                  <>
                    <div className="space-y-4">
                        <div className="rounded-xl border bg-card p-4 shadow-sm">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">{t('customer_details')}</h2>
                            <div className="space-y-2">
                                <DetailItem label={t('customer_name')} value={customer.name.toUpperCase()} />
                                <DetailItem label={t('contact_number')} value={customer.contactNumber || 'N/A'} />
                                <DetailItem label='Address' value={customer.address || 'N/A'} />
                            </div>
                        </div>

                        <div className="rounded-xl border bg-card p-4 shadow-sm">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Transaction Summary</h2>
                            <div className="space-y-2">
                                <DetailItem label={'Total Carat'} value={customer.totalCarat.toLocaleString()} />
                                <Separator className="my-2" />
                                <DetailItem 
                                    label={'Total Billed Amount'} 
                                    value={`${customer.totalAmount.toLocaleString()}${t('rs_symbol')}`} 
                                    valueClassName="text-lg font-bold text-primary"
                                />
                            </div>
                        </div>
                    </div>
                  </>
              ) : (
                  <main className="space-y-4">
                      <div className="space-y-2">
                          <Label htmlFor="edit-name">Customer Name</Label>
                          <Input 
                            id="edit-name" 
                            value={editForm.name} 
                            onChange={(e) => setEditForm(prev => ({...prev, name: e.target.value}))}
                          />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="edit-contact">Contact Number</Label>
                          <Input 
                            id="edit-contact" 
                            value={editForm.contactNumber} 
                            onChange={(e) => setEditForm(prev => ({...prev, contactNumber: e.target.value}))}
                          />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="edit-address">Address</Label>
                          <Input 
                            id="edit-address" 
                            value={editForm.address} 
                            onChange={(e) => setEditForm(prev => ({...prev, address: e.target.value}))}
                          />
                      </div>
                      <Separator className="my-4" />
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-carat">Total Carat (Adj.)</Label>
                            <Input 
                                id="edit-carat" 
                                type="number"
                                value={editForm.totalCarat} 
                                onChange={(e) => setEditForm(prev => ({...prev, totalCarat: parseFloat(e.target.value) || 0}))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-amount">Total Amount (Adj.)</Label>
                            <Input 
                                id="edit-amount" 
                                type="number"
                                value={editForm.totalAmount} 
                                onChange={(e) => setEditForm(prev => ({...prev, totalAmount: parseFloat(e.target.value) || 0}))}
                            />
                        </div>
                      </div>
                  </main>
              )}
            </div>
          <DialogFooter className="px-6 py-4 rounded-b-lg border-t bg-muted/30 flex flex-row items-center justify-between gap-2 flex-shrink-0">
              {!isEditing ? (
                  <>
                    <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={onDelete} 
                        className='text-destructive hover:bg-destructive/10 hover:text-destructive'
                        title={t('delete')}
                    >
                        <Trash2 className="h-5 w-5" />
                    </Button>
                    <div className='flex gap-2'>
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setShowPasswordDialog(true)} 
                        >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                        </Button>
                        <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={onWhatsApp} 
                            disabled={!customer.contactNumber}
                        >
                            <MessageSquare className="mr-2 h-4 w-4" />
                            WhatsApp
                        </Button>
                        <DialogClose asChild>
                            <Button variant="default" size="sm">
                                {t('close')}
                            </Button>
                        </DialogClose>
                    </div>
                  </>
              ) : (
                  <>
                    <Button variant="ghost" onClick={() => setIsEditing(false)} className="flex-1">
                        Cancel
                    </Button>
                    <Button onClick={handleSaveEdit} className="flex-1" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                    </Button>
                  </>
              )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Verification Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handlePasswordSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" /> Security Check
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Enter the password to edit details for {customer.name.toUpperCase()}.
              </p>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="edit-password">Password</Label>
              <Input 
                id="edit-password" 
                type="password" 
                autoFocus 
                value={passwordInput} 
                onChange={(e) => setPasswordInput(e.target.value)} 
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setShowPasswordDialog(false)}>Cancel</Button>
              <Button type="submit">Verify</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
