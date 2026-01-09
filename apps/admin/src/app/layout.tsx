import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { viVN } from '@clerk/localizations';

import { ClerkProvider } from '@clerk/nextjs';
import { QueryClientProvider } from '@tanstack/react-query';
import QueryProvider from './providers';
const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

export const metadata: Metadata = {
    title: 'Dashboard | Stazy Hotel',
    description: 'Stazy Hotel Dashboard ',
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <ClerkProvider
            localization={viVN}
            appearance={{
                layout: {
                    unsafe_disableDevelopmentModeWarnings: true,
                },
            }}
            signInUrl="/sign-in"
        >
            <html lang="en" suppressHydrationWarning>
                <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                    <QueryProvider>{children}</QueryProvider>
                </body>
            </html>
        </ClerkProvider>
    );
}
