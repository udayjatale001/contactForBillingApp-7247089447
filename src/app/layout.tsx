
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { RootStateProvider } from '@/components/root-state-provider';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { LanguageProvider } from '@/context/language-context';
import { DateFilterProvider } from '@/context/date-filter-context';
import { TokenProvider } from '@/context/token-context';
import { PT_Sans } from 'next/font/google';

export const metadata: Metadata = {
  title: 'Anand Sagar Ripening & Cooling Chamber',
  description: 'Billing application for Anand Sagar Ripening & Cooling Chamber',
};

const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-sans',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={cn('font-sans antialiased', ptSans.variable)}>
        <LanguageProvider>
          <DateFilterProvider>
            <TokenProvider>
              <FirebaseClientProvider>
                <RootStateProvider>{children}</RootStateProvider>
              </FirebaseClientProvider>
            </TokenProvider>
          </DateFilterProvider>
        </LanguageProvider>
        <Toaster />
      </body>
    </html>
  );
}
