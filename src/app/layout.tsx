import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import { AuthGuard } from '@/components/auth-guard';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import { RootStateProvider } from '@/components/root-state-provider';

export const metadata: Metadata = {
  title: 'Aanand Sagar Billing App',
  description: 'Billing application for Aanand Sagar Fresh Fruit',
};

const fontSans = Inter({
  subsets: ['latin'],
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
      <body className={cn('font-body antialiased', fontSans.variable)}>
        <FirebaseClientProvider>
          <AuthGuard>
            <RootStateProvider>{children}</RootStateProvider>
          </AuthGuard>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
