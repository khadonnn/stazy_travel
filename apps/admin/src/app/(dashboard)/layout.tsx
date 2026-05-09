import AppSidebar from '@/components/AppSidebar';
import Navbar from '@/components/Navbar';
import { ThemeProvider } from '@/components/theme-provider';
import { SidebarProvider } from '@/components/ui/sidebar';
import { cookies } from 'next/headers';
import { Toaster } from 'sonner';
export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const cookieStore = await cookies();
    const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true';

    return (
        <div className="flex">
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
                <SidebarProvider defaultOpen={defaultOpen}>
                    <AppSidebar />
                    <main className="w-full overflow-y-auto [&::-webkit-scrollbar]:w-[2px] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-white/[0.08] [&::-webkit-scrollbar-track]:bg-transparent">
                        <Navbar />
                        <div className="px-4"> {children}</div>
                        <Toaster />
                    </main>
                </SidebarProvider>
            </ThemeProvider>
        </div>
    );
}
