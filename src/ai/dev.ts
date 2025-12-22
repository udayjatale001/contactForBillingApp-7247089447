import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-sale-for-owner.ts';
import '@/ai/flows/generate-customer-notification.ts';
import '@/ai/flows/compose-reminder-message.ts';