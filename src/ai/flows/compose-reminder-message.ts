
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
  lastActivityDate: z.string().describe('The date of the customer\'s last carat activity (YYYY-MM-DD).'),
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
  prompt: `You are an SMS messaging assistant for Ananad Sagar Fresh Fruit.

  Compose a friendly and encouraging reminder message for a customer who hasn't had any carat activity in a month. The message should:
  * Remind them of Ananad Sagar Fresh Fruit.
  * Mention their name.
  * Encourage them to visit again soon.
  * Highlight the fresh fruit available.

  Customer Name: {{{customerName}}}
  Last Activity Date: {{{lastActivityDate}}}
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
