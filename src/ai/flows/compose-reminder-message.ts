
// src/ai/flows/compose-reminder-message.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow for composing reminder messages for customers.
 *
 * It includes:
 * - composeReminderMessage: A function to generate a personalized reminder message.
 * - ComposeReminderMessageInput: The input type for the composeReminderMessage function.
 * - ComposeReminderMessageOutput: The output type for the composeReminderMessage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ComposeReminderMessageInputSchema = z.object({
  customerName: z.string().describe('The name of the customer.'),
  totalBillAmount: z.string().describe('The total bill amount for the customer.'),
  amountPaid: z.string().describe('The amount already paid by the customer.'),
  pendingDue: z.string().describe('The pending due amount from the customer.'),
});
export type ComposeReminderMessageInput = z.infer<typeof ComposeReminderMessageInputSchema>;

const ComposeReminderMessageOutputSchema = z.object({
  message: z.string().describe('The personalized reminder message for the customer.'),
});
export type ComposeReminderMessageOutput = z.infer<typeof ComposeReminderMessageOutputSchema>;

export async function composeReminderMessage(input: ComposeReminderMessageInput): Promise<ComposeReminderMessageOutput> {
  return composeReminderMessageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'composeReminderMessagePrompt',
  input: {schema: ComposeReminderMessageInputSchema},
  output: {schema: ComposeReminderMessageOutputSchema},
  prompt: `You are an SMS messaging assistant for Anand Sagar Fresh Fruit.

  Compose a friendly and professional reminder message for a customer regarding their payment.

  The message should be structured as follows:
  - Start with "Anand Sagar Fresh Fruits 🍎".
  - A gentle reminder about their payment.
  - Clearly list "Total Bill Amount", "Amount Paid", and "Pending Due Amount".
  - A request to clear the remaining due amount.
  - End with "Thank you for your cooperation."

  Use the provided details:
  Customer Name: {{{customerName}}}
  Total Bill Amount: {{{totalBillAmount}}}
  Amount Paid: {{{amountPaid}}}
  Pending Due Amount: {{{pendingDue}}}
  `,
});

const composeReminderMessageFlow = ai.defineFlow(
  {
    name: 'composeReminderMessageFlow',
    inputSchema: ComposeReminderMessageInputSchema,
    outputSchema: ComposeReminderMessageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
