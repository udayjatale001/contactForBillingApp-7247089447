
import { z } from 'zod';

export const billingSchema = z.object({
  customerName: z
    .string({ required_error: 'Customer name is required.' })
    .min(2, { message: 'Customer name must be at least 2 characters.' }),
  roomNumber: z.string().optional(),
  contactNumber: z.string().optional(),
  inCarat: z.coerce
    .number({ required_error: 'In Carat value is required.' })
    .positive({ message: 'In Carat must be a positive number.' }).optional(),
  outCarat: z.coerce
    .number({ required_error: 'Out Carat value is required.' })
    .nonnegative({ message: 'Out Carat cannot be negative.' }).optional(),
  smallCarat: z.coerce
    .number()
    .gt(0, { message: 'Small Carat must be a positive number.' })
    .optional(),
  smallCaratRate: z.coerce
    .number()
    .gt(0, { message: 'Small Carat Rate must be a positive number.' })
    .optional(),
  bigCarat: z.coerce
    .number()
    .gt(0, { message: 'Big Carat must be a positive number.' })
    .optional(),
  bigCaratRate: z.coerce
    .number()
    .gt(0, { message: 'Big Carat Rate must be a positive number.' })
    .optional(),
  paidAmount: z.coerce
    .number()
    .nonnegative({ message: 'Paid amount cannot be negative.' }).optional(),
  paidTo: z.enum(['Gopal Dada', 'Yuvraj Dada', 'Suyash Dada', 'Gaju Dada'], {
    required_error: 'You need to select who was paid.',
  }),
  paymentMode: z.enum(['Online Payment', 'Cash', 'Due'], {
    required_error: 'You need to select a payment mode.',
  }),
  // Labour Fields
  inCaratLabour: z.coerce.number().nonnegative().optional(),
  inCaratLabourRate: z.coerce.number().nonnegative().optional(),
  outCaratLabour: z.coerce.number().nonnegative().optional(),
  outCaratLabourRate: z.coerce.number().nonnegative().optional(),
}).refine(data => {
    // If smallCarat has a value, smallCaratRate must also have a value.
    if (data.smallCarat && !data.smallCaratRate) return false;
    // If bigCarat has a value, bigCaratRate must also have a value.
    if (data.bigCarat && !data.bigCaratRate) return false;
    return true;
}, {
    message: "Rate is required if quantity is provided.",
    path: ["smallCaratRate"], // Or point to a more general location
})
.refine(data => data.smallCarat || data.bigCarat, {
    message: "At least one carat type (Small or Big) must be provided.",
    path: ["smallCarat"],
});


export type BillingFormValues = z.infer<typeof billingSchema>;


// This will represent the final, saved bill structure.
export type Bill = {
  id: string;
  managerId: string;
  customerName: string;
  roomNumber?: string;
  contactNumber?: string;
  inCarat: number;
  outCarat: number;
  totalCarat: number;
  smallCarat?: number;
  bigCarat?: number;
  caratType: string;
  smallCaratRate: number; // Rate at time of transaction
  bigCaratRate: number; // Rate at time of transaction
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paidTo: string;
  paymentMode: string;
  createdAt: string; // Storing as ISO string for Firestore compatibility
  // Labour fields
  inCaratLabour?: number;
  inCaratLabourRate?: number;
  outCaratLabour?: number;
  outCaratLabourRate?: number;
  totalLabourAmount?: number;
};

// Represents the structure of the settings document in Firestore
export type AppSettings = {
  smallCaratRate: number;
  bigCaratRate: number;
  labourRate: number;
};

// Represents a notification document in Firestore
export type Notification = {
    id: string;
    billId: string;
    managerId: string;
    message: string;
    createdAt: string; // ISO string
}
