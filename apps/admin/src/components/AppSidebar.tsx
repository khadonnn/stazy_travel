'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { io } from 'socket.io-client';
import { useNotificationStore } from '@/store/useNotificationStore'; // Đảm bảo đường dẫn đúng store của bạn

import {
    Home,
    Inbox,
    Calendar,
    Search,
    Settings,
    Plus,
    ChevronDown,
    CalendarCheck2,
    MessageSquareWarning,
    ChevronsUpDown,
    User,
    ShoppingBasket,
    ChartSpline,
    MapPinned,
    Bell,
    LogOut,
} from 'lucide-react';

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupAction,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
} from '@/components/ui/sidebar';

import {
    DropdownMenuItem,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sheet, SheetTrigger } from '@/components/ui/sheet';

// Import các component form con (giữ nguyên của bạn)
import EditUser from '@/components/EditUser';
import AddOrder from '@/components/AddOrder';
import AddProduct from '@/components/AddProduct';
import AddCategory from '@/components/AddCategory';
import AddUser from '@/components/AddUser';

// --- CẤU HÌNH URL ---
const SOCKET_URL = 'http://localhost:3005';
// URL API của Booking Service (8001) để lấy số liệu ban đầu
const API_URL = process.env.NEXT_PUBLIC_BOOKING_SERVICE_URL || 'http://localhost:8001';

const items = [
    { title: 'Home', url: '/', icon: Home },
    { title: 'Analytics', url: '/analytics', icon: ChartSpline },
    { title: 'Inbox', url: '/message', icon: Inbox }, // Quan trọng: URL phải khớp logic check pathname
    { title: 'Notifications', url: '/notifications', icon: Bell },
    { title: 'Calendar', url: '#', icon: Calendar },
    { title: 'Search', url: '#', icon: Search },
    { title: 'Settings', url: '/users/settings', icon: Settings },
];

const AppSidebar = () => {
    const { unreadCount, increment, setUnreadCount } = useNotificationStore();
    const pathname = usePathname();

    // --- 1. FETCH SỐ TIN NHẮN CHƯA ĐỌC TỪ DB (KHI F5 TRANG) ---
    useEffect(() => {
        const fetchInitialUnread = async () => {
            try {
                // Gọi API đếm số tin isRead: false từ MongoDB
                const res = await fetch(`${API_URL}/messages/stats/unread`);
                if (res.ok) {
                    const data = await res.json();
                    setUnreadCount(data.count || 0);
                }
            } catch (error) {
                console.error('⚠️ Lỗi lấy số tin nhắn chưa đọc:', error);
            }
        };

        // Chỉ gọi khi mới mount
        fetchInitialUnread();
    }, [setUnreadCount]);

    // --- 2. LẮNG NGHE SOCKET REALTIME ---
    useEffect(() => {
        const socket = io(SOCKET_URL, {
            query: { role: 'admin' },
            transports: ['websocket'],
        });

        socket.on('connect', () => {
            console.log('🔔 Sidebar connected to notification socket');
        });

        // Khi có tin nhắn mới từ user
        socket.on('receive_message_from_user', (data: any) => {
            console.log('🔔 Tin nhắn mới:', data);

            // Logic: Chỉ tăng số nếu Admin ĐANG KHÔNG Ở trang /message
            if (pathname !== '/message') {
                increment();
                // (Optional) Phát âm thanh "Ting"
                // new Audio('/sounds/notification.mp3').play().catch(() => {});
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [pathname, increment]);

    // --- 3. RESET SỐ KHI VÀO TRANG INBOX ---
    useEffect(() => {
        if (pathname === '/message') {
            setUnreadCount(0);
            // Lưu ý: Việc đánh dấu "đã đọc" trong DB sẽ do trang /message tự xử lý khi load chat
        }
    }, [pathname, setUnreadCount]);

    return (
        <Sidebar collapsible="icon">
            {/* --- HEADER --- */}
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild size="lg">
                            <Link href="/" className="flex items-center">
                                <Image
                                    src="/assets/images/logo1.png"
                                    alt="logo"
                                    width={30}
                                    height={30}
                                    className="shink-0 h-8 w-auto rounded-full object-cover"
                                />
                                <span className="font-bold tracking-wider">KHADON</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarSeparator className="inset-0 ml-0" />

            {/* --- CONTENT --- */}
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Application</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {items.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild tooltip={item.title}>
                                        <Link href={item.url}>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>

                                    {/* 🔥 BADGE TIN NHẮN MÀU ĐỎ */}
                                    {item.title === 'Inbox' && unreadCount > 0 && (
                                        <SidebarMenuBadge className="animate-in zoom-in bg-red-500 font-bold text-white duration-300 hover:bg-red-600">
                                            {unreadCount > 99 ? '99+' : unreadCount}
                                        </SidebarMenuBadge>
                                    )}
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {/* --- HOTELS GROUP --- */}
                <SidebarGroup>
                    <SidebarGroupLabel>Hotels</SidebarGroupLabel>
                    <SidebarGroupAction title="Add Hotel">
                        <Plus /> <span className="sr-only">Add Hotel</span>
                    </SidebarGroupAction>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild>
                                    <Link href="/products">
                                        <MapPinned /> See all hotels
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <Sheet>
                                    <SheetTrigger asChild>
                                        <SidebarMenuButton>
                                            <Plus /> Add Hotel
                                        </SidebarMenuButton>
                                    </SheetTrigger>
                                    <AddProduct />
                                </Sheet>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <Sheet>
                                    <SheetTrigger asChild>
                                        <SidebarMenuButton>
                                            <Plus /> Add Category
                                        </SidebarMenuButton>
                                    </SheetTrigger>
                                    <AddCategory />
                                </Sheet>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {/* --- USERS GROUP --- */}
                <SidebarGroup>
                    <SidebarGroupLabel>Users</SidebarGroupLabel>
                    <SidebarGroupAction title="Add User">
                        <Plus /> <span className="sr-only">Add User</span>
                    </SidebarGroupAction>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild>
                                    <Link href="/users">
                                        <User /> See All Users
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <Sheet>
                                    <SheetTrigger asChild>
                                        <SidebarMenuButton>
                                            <Plus /> Add User
                                        </SidebarMenuButton>
                                    </SheetTrigger>
                                    <AddUser />
                                </Sheet>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {/* --- ORDERS GROUP --- */}
                <SidebarGroup>
                    <SidebarGroupLabel>Orders / Payments</SidebarGroupLabel>
                    <SidebarGroupAction title="Add Order">
                        <Plus /> <span className="sr-only">Add Order</span>
                    </SidebarGroupAction>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild>
                                    <Link href="/payments">
                                        <ShoppingBasket /> See All Transactions
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <Sheet>
                                    <SheetTrigger asChild>
                                        <SidebarMenuButton>
                                            <Plus /> Add Order
                                        </SidebarMenuButton>
                                    </SheetTrigger>
                                    <AddOrder />
                                </Sheet>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {/* --- TODOS COLLAPSIBLE --- */}
                <Collapsible defaultOpen className="group/collapsible">
                    <SidebarGroup>
                        <SidebarGroupLabel asChild>
                            <CollapsibleTrigger>
                                Todos
                                <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                            </CollapsibleTrigger>
                        </SidebarGroupLabel>
                        <CollapsibleContent>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton asChild>
                                            <Link href="#">
                                                <CalendarCheck2 /> Daily
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton asChild>
                                            <Link href="#">
                                                <MessageSquareWarning /> Feedback
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </CollapsibleContent>
                    </SidebarGroup>
                </Collapsible>
            </SidebarContent>

            <SidebarSeparator className="inset-0 ml-0" />

            {/* --- FOOTER (USER MENU) --- */}
            <SidebarFooter className="inset-0 rounded-md">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton size="lg">
                                    <Image
                                        src="/assets/images/avatar.jpg"
                                        alt="Avatar"
                                        width={20}
                                        height={20}
                                        className="h-10 w-10 shrink-0 rounded-lg border border-gray-700/20 object-cover dark:border-gray-200/20"
                                    />
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-semibold">Khadon</span>
                                        <span className="truncate text-xs text-gray-500">Admin</span>
                                    </div>
                                    <ChevronsUpDown className="ml-auto" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[--radix-dropdown-menu-trigger-width]">
                                <DropdownMenuItem>
                                    <User className="mr-2 h-4 w-4" /> Account
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <Settings className="mr-2 h-4 w-4" /> Setting
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600 focus:bg-red-50 focus:text-red-600">
                                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
};

export default AppSidebar;
