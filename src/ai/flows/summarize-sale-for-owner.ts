'use server';

/**
 * @fileOverview Summarizes sale details into a concise message for the owner.
 *
 * This file defines a Genkit flow that takes sale details as input and generates a summary message
 * for the owner, including customer name, amount paid, carat details, payment method, and recipient.
 *
 * @exports summarizeSaleForOwner - The main function to generate the sale summary.
 * @exports SummarizeSaleForOwnerInput - The input type for the summarizeSaleForOwner function.
 * @exports SummarizeSaleForOwnerOutput - The output type for the summarizeSaleForOwner function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the input schema
const SummarizeSaleForOwnerInputSchema = z.object({
  customerName: z.string().describe('The name of the customer.'),
  totalCarat: z.number().describe('The total carat amount.'),
  caratType: z.enum(['Small Carat', 'Big Carat', 'Mixed', 'N/A']).describe('The type of carat.'),
  totalAmount: z.number().describe('The total amount of the sale.'),
  paidAmount: z.number().describe('The amount paid by the customer.'),
  paidTo: z.string().describe('The recipient of the payment.'),
  paymentMode: z.enum(['PhonePe', 'Cash', 'Online Payment', 'Due']).describe('The payment mode used.'),
});

export type SummarizeSaleForOwnerInput = z.infer<
  typeof SummarizeSaleForOwnerInputSchema
>;

// Define the output schema
const SummarizeSaleForOwnerOutputSchema = z.object({
  summaryMessage: z.string().describe('A concise summary of the sale for the owner.'),
});

export type SummarizeSaleForOwnerOutput = z.infer<
  typeof SummarizeSaleForOwnerOutputSchema
>;

// Define the main function
export async function summarizeSaleForOwner(
  input: SummarizeSaleForOwnerInput
): Promise<SummarizeSaleForOwnerOutput> {
  return summarizeSaleForOwnerFlow(input);
}

// Define the prompt
const summarizeSaleForOwnerPrompt = ai.definePrompt({
  name: 'summarizeSaleForOwnerPrompt',
  input: {schema: SummarizeSaleForOwnerInputSchema},
  output: {schema: SummarizeSaleForOwnerOutputSchema},
  prompt: `Summarize the following sale details into a concise message for the owner. Use 'rs' as the currency symbol.

  Customer Name: {{{customerName}}}
  Total Carat: {{{totalCarat}}}
  Carat Type: {{{caratType}}}
  Total Amount: {{{totalAmount}}}rs
  Paid Amount: {{{paidAmount}}}rs
  Paid To: {{{paidTo}}}
  Payment Mode: {{{paymentMode}}}

  Summary:`,
});

// Define the flow
const summarizeSaleForOwnerFlow = ai.defineFlow(
  {
    name: 'summarizeSaleForOwnerFlow',
    inputSchema: SummarizeSaleForOwnerInputSchema,
    outputSchema: SummarizeSaleForOwnerOutputSchema,
  },
  async input => {
    const {output} = await summarizeSaleForOwnerPrompt(input);
    return output!;
  }
);
