'use client';

import { LogOut, RefreshCw, Settings, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ModeToggle as Darkmode } from './Darkmode';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import MyClock from '@/components/MyClock';
import { useUser, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useQueryClient, useIsFetching } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useState } from 'react'; // Import thêm useState

const Navbar = () => {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { signOut } = useClerk();

    // Theo dõi xem có query nào đang chạy ngầm không
    const isGlobalFetching = useIsFetching();

    // State riêng để tạo hiệu ứng xoay icon khi gọi router.refresh() (vì nó không có loading state public)
    const [isManualRefreshing, setIsManualRefreshing] = useState(false);

    const handleRefresh = async () => {
        setIsManualRefreshing(true);

        // 1. Refresh dữ liệu Server Components (RSC)
        // Lệnh này sẽ yêu cầu server render lại các server component và gửi payload mới về
        router.refresh();

        // 2. Refresh dữ liệu Client (React Query)
        // Bỏ 'stayListings' đi để reload TOÀN BỘ các query trong dashboard
        // Hoặc giữ lại nếu bạn chỉ muốn reload đúng key đó.
        await queryClient.invalidateQueries();

        // Tắt loading state nhân tạo sau 1 khoảng ngắn (để UX mượt mà)
        // Hoặc chờ router.refresh hoàn tất (dù router.refresh là void, nhưng ta giả lập delay)
        setTimeout(() => {
            setIsManualRefreshing(false);
        }, 1000);
    };

    // Icon sẽ xoay nếu: React Query đang fetch HOẶC ta đang bấm nút reload thủ công
    const isSpinning = isGlobalFetching > 0 || isManualRefreshing;

    return (
        <nav className="bg-background sticky top-0 z-10 flex items-center justify-between p-4">
            {/* LEFT */}
            <div className="flex items-center justify-around gap-4">
                <SidebarTrigger className="cursor-pointer" />
                <MyClock />
            </div>

            {/* RIGHT */}
            <div className="flex items-center gap-4">
                <button
                    onClick={handleRefresh}
                    disabled={isSpinning} // Disable nút khi đang load để tránh spam
                    title="Reload dữ liệu dashboard"
                    className="hover:bg-muted rounded-full p-2 transition active:scale-95 disabled:opacity-50"
                >
                    <RefreshCw
                        className={cn(
                            'h-5 w-5 transition-all duration-500',
                            isSpinning ? 'animate-spin text-blue-500' : '',
                        )}
                    />
                </button>

                {/* THEME MENU */}
                <Darkmode />

                {/* USER MENU */}
                <DropdownMenu>
                    <DropdownMenuTrigger>
                        <Avatar className="cursor-pointer transition hover:opacity-80">
                            <AvatarImage src="https://avatars.githubusercontent.com/u/146587461?v=4&size=64" />
                            <AvatarFallback>CN</AvatarFallback>
                        </Avatar>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer">
                            <User className="mr-2 h-4 w-4" />
                            Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer">
                            <Settings className="mr-2 h-4 w-4" />
                            Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="cursor-pointer text-red-600 hover:bg-red-100 hover:text-red-700 focus:bg-red-100 focus:text-red-700"
                            onClick={() => signOut()}
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Logout
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </nav>
    );
};

export default Navbar;
