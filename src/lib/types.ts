import { z } from 'zod';

export const billingSchema = z.object({
  customerName: z
    .string({ required_error: 'Customer name is required.' })
    .min(2, { message: 'Customer name must be at least 2 characters.' }),
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
  bigCarat: z.coerce
    .number()
    .gt(0, { message: 'Big Carat must be a positive number.' })
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
}).refine(data => data.smallCarat || data.bigCarat, {
    message: "At least one carat type (Small or Big) must be provided.",
    path: ["smallCarat"],
});

export type BillingFormValues = z.infer<typeof billingSchema>;


// This will represent the final, saved bill structure.
export type Bill = {
  id: string;
  managerId: string;
  customerName: string;
  inCarat: number;
  outCarat: number;
  totalCarat: number;
  smallCarat?: number;
  bigCarat?: number;
  caratType: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paidTo: string;
  paymentMode: string;
  createdAt: string; // Storing as ISO string for Firestore compatibility
};
