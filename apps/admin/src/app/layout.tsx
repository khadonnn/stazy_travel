import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { viVN } from '@clerk/localizations';

import { cookies } from 'next/headers';
import { ClerkProvider } from '@clerk/nextjs';
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
                <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
            </html>
        </ClerkProvider>
    );
}
