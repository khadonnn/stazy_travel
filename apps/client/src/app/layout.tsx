import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stazy Hotel ",
  description: "Nền tảng quản lý khách sạn hiện đại.",
  icons: {
    icon: "/logo.png",
  },
};

import Navbar from "@/components/NavBar";
import Footer from "@/components/Footer";
import ChatWidget from "@/components/chat/ChatWidget";
import { ClerkProvider } from "@clerk/nextjs";
import { viVN } from "@clerk/localizations";
import BackgroundWave from "@/components/BackgroundWave";
import { syncUserToDB } from "@/lib/clerk-sync";
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await syncUserToDB();
  return (
    <ClerkProvider
      localization={viVN}
      appearance={{
        layout: {
          unsafe_disableDevelopmentModeWarnings: true,
        },
      }}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
    >
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <Navbar />

          <main className="mt-10">
            <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/20" />
              <BackgroundWave />
            </div>
            <Providers>{children}</Providers>
          </main>
          <footer className="shrink-0">
            <Footer />
          </footer>
          <div className="fixed bottom-4 right-4 z-9999">
            <ChatWidget />
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
