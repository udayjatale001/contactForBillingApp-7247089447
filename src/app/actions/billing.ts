'use server';

import { z } from 'zod';
import { billingSchema } from '@/lib/types';

const fullBillSchema = billingSchema.extend({
    totalCarat: z.number(),
    rate: z.number(),
    totalAmount: z.number(),
    dueAmount: z.number(),
    createdAt: z.date(),
});

type FullBillDetails = z.infer<typeof fullBillSchema>;

export async function createBill(
  data: FullBillDetails
): Promise<{ success: true; billDetails: FullBillDetails; } | { success: false; error: string; }> {
  const validatedData = fullBillSchema.safeParse(data);

  if (!validatedData.success) {
    return { success: false, error: 'Invalid data provided.' };
  }

  const bill = validatedData.data;

  try {
    // Here you would save the 'bill' object to your Firestore database.
    // For this demo, we'll just log it to the console.
    console.log('Saving bill to Firestore:', bill);
    
    return {
      success: true,
      billDetails: bill,
    };

  } catch (error) {
    console.error('Error creating bill:', error);
    return { success: false, error: 'Failed to process bill.' };
  }
}
