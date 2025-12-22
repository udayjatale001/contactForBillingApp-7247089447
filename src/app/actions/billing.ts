'use server';

import { z } from 'zod';

// Replicating a simplified version of the final schema for the action
const actionBillSchema = z.object({
  customerName: z.string(),
  inCarat: z.number(),
  outCarat: z.number(),
  smallCarat: z.number().optional(),
  bigCarat: z.number().optional(),
  totalAmount: z.number(),
  paidAmount: z.number(),
  dueAmount: z.number(),
  paidTo: z.string(),
  paymentMode: z.string(),
  createdAt: z.date(),
});


type FullBillDetails = z.infer<typeof actionBillSchema>;

export async function createBill(
  data: FullBillDetails
): Promise<{ success: true; billDetails: FullBillDetails; } | { success: false; error: string; }> {
  
  // The zod validation is now more complex and happens in the form, 
  // so we'll just do a basic check here.
  if (!data.customerName || data.paidAmount > data.totalAmount) {
    return { success: false, error: 'Invalid data provided.' };
  }

  try {
    // Here you would save the 'bill' object to your Firestore database.
    // For this demo, we'll just log it to the console.
    console.log('Saving bill to Firestore:', data);
    
    return {
      success: true,
      billDetails: data,
    };

  } catch (error) {
    console.error('Error creating bill:', error);
    return { success: false, error: 'Failed to process bill.' };
  }
}
