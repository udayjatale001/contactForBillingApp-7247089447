'use server';

/**
 * @fileOverview A Genkit flow to generate personalized SMS notifications for customers.
 *
 * - generateCustomerNotification - A function that generates the notification message.
 * - GenerateCustomerNotificationInput - The input type for the generateCustomerNotification function.
 * - GenerateCustomerNotificationOutput - The return type for the generateCustomerNotification function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCustomerNotificationInputSchema = z.object({
  customerName: z.string().describe('The name of the customer.'),
  totalCarat: z.number().describe('The total carat amount.'),
  paidAmount: z.number().describe('The amount paid by the customer.'),
  dueAmount: z.number().describe('The remaining due amount.'),
});
export type GenerateCustomerNotificationInput = z.infer<
  typeof GenerateCustomerNotificationInputSchema
>;

const GenerateCustomerNotificationOutputSchema = z.object({
  message: z.string().describe('The generated SMS notification message.'),
});
export type GenerateCustomerNotificationOutput = z.infer<
  typeof GenerateCustomerNotificationOutputSchema
>;

export async function generateCustomerNotification(
  input: GenerateCustomerNotificationInput
): Promise<GenerateCustomerNotificationOutput> {
  return generateCustomerNotificationFlow(input);
}

const generateCustomerNotificationPrompt = ai.definePrompt({
  name: 'generateCustomerNotificationPrompt',
  input: {schema: GenerateCustomerNotificationInputSchema},
  output: {schema: GenerateCustomerNotificationOutputSchema},
  prompt: `You are an SMS notification generator for Aanand Sagar Fresh Fruit. Generate a personalized SMS notification for the customer with the following details:

Customer Name: {{customerName}}
Total Carat: {{totalCarat}}
Paid Amount: {{paidAmount}}rs
Due Amount: {{dueAmount}}rs

The message should be concise and friendly.`,
});

const generateCustomerNotificationFlow = ai.defineFlow(
  {
    name: 'generateCustomerNotificationFlow',
    inputSchema: GenerateCustomerNotificationInputSchema,
    outputSchema: GenerateCustomerNotificationOutputSchema,
  },
  async input => {
    const {output} = await generateCustomerNotificationPrompt(input);
    return output!;
  }
);
