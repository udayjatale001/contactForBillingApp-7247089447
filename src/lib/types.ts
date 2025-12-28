
import { z } from 'zod';

export const billingSchema = z.object({
  customerName: z
    .string({ required_error: 'Customer name is required.' })
    .min(1, { message: 'Customer name cannot be empty.' }),
  roomNumber: z.string().optional(),
  contactNumber: z.string()
    .optional()
    .refine((val) => val === '' || val === undefined || /^\d{10}$/.test(val), {
      message: 'Contact number must be exactly 10 digits.',
    }),
  address: z.string().optional(),
  createdAt: z.date().optional(), // New field for bill date
  inCarat: z.coerce
    .number()
    .nonnegative({ message: 'In Carat cannot be negative.' }).optional(),
  outCarat: z.coerce
    .number()
    .nonnegative({ message: 'Out Carat cannot be negative.' }).optional(),
  smallCarat: z.coerce
    .number()
    .nonnegative()
    .optional(),
  smallCaratRate: z.coerce
    .number()
    .nonnegative()
    .optional(),
  bigCarat: z.coerce
    .number()
    .nonnegative()
    .optional(),
  bigCaratRate: z.coerce
    .number()
    .nonnegative()
    .optional(),
  paidAmount: z.coerce
    .number()
    .nonnegative({ message: 'Paid amount cannot be negative.' }).optional(),
  paidTo: z.enum(['Gopal Temkar', 'Yuvaraj Temkar', 'Suyash Temkar', 'Gajananad Murtankar'], {
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
});


export type BillingFormValues = z.infer<typeof billingSchema>;


// This will represent the final, saved bill structure.
export type Bill = {
  id: string;
  managerId: string;
  customerName: string;
  roomNumber?: string;
  contactNumber?: string;
  address?: string;
  inCarat?: number;
  outCarat?: number;
  totalCarat: number;
  smallCarat?: number;
  bigCarat?: number;
  caratType: string;
  smallCaratRate?: number; // Rate at time of transaction
  bigCaratRate?: number; // Rate at time of transaction
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
    message?: string;
    createdAt: string; // ISO string
    // Denormalized fields for richer notifications
    customerName?: string;
    paidAmount?: number;
    dueAmount?: number;
    totalCarat?: number;
    paidTo?: string;
    paymentMode?: string;
}

// Represents a labour record in Firestore
export type Labour = {
  id: string;
  billId: string;
  managerId: string;
  customerName: string;
  inCaratLabour?: number;
  inCaratLabourRate?: number;
  outCaratLabour?: number;
  outCaratLabourRate?: number;
  totalLabourAmount: number;
  createdAt: string; // ISO string
};

// Represents a token record in Firestore
export type Token = {
    id: string;
    managerId: string;
    customerName: string;
    roomNumber?: string;
    contactNumber?: string;
    address?: string;
    inCarat?: number;
    createdAt: string; // ISO string
}

// Represents an aggregated customer record for the Customers page
export type Customer = {
  id: string; // Unique ID, e.g., combination of managerId and customerName
  name: string;
  contactNumber?: string;
  address?: string;
  totalBilledAmount: number;
  totalPaidAmount: number;
  totalDueAmount: number;
  totalCarat: number;
  lastActivity: string; // ISO string of the last bill date
};
