import { z } from 'zod';

export const billingSchema = z.object({
  customerName: z
    .string({ required_error: 'Customer name is required.' })
    .min(2, { message: 'Customer name must be at least 2 characters.' }),
  inCarat: z.coerce
    .number({ required_error: 'In Carat value is required.' })
    .positive({ message: 'In Carat must be a positive number.' }),
  outCarat: z.coerce
    .number({ required_error: 'Out Carat value is required.' })
    .nonnegative({ message: 'Out Carat cannot be negative.' }),
  smallCarat: z.coerce
    .number()
    .nonnegative({ message: 'Small Carat cannot be negative.' })
    .optional(),
  bigCarat: z.coerce
    .number()
    .nonnegative({ message: 'Big Carat cannot be negative.' })
    .optional(),
  paidAmount: z.coerce
    .number({ required_error: 'Paid amount is required.' })
    .nonnegative({ message: 'Paid amount cannot be negative.' }),
  paidTo: z.enum(['Gopal Dada', 'Yuvraj Dada', 'Suyash Dada', 'Gaju Dada'], {
    required_error: 'You need to select who was paid.',
  }),
  paymentMode: z.enum(['Online Payment', 'Cash'], {
    required_error: 'You need to select a payment mode.',
  }),
});

export type BillingFormValues = z.infer<typeof billingSchema>;
