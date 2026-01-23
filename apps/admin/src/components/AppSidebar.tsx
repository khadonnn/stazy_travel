'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { io } from 'socket.io-client';
import { useAuth } from '@clerk/nextjs';
import { useNotificationStore } from '@/store/useNotificationStore';
import { getAllPendingCounts } from '@/actions/statsActions';

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
    UserCheck,
    Building2,
    HousePlus,
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
import { title } from 'process';

// --- CẤU HÌNH URL ---
const SOCKET_URL = 'http://localhost:3005';
// URL API của Booking Service (8001) để lấy số liệu ban đầu
const API_URL = process.env.NEXT_PUBLIC_BOOKING_SERVICE_URL || 'http://localhost:8001';

// --- HELPER: FETCH VỚI TIMEOUT & RETRY ---
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 5000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
};

const fetchWithRetry = async (url: string, retries = 3, timeout = 5000, token?: string) => {
    for (let i = 0; i < retries; i++) {
        try {
            const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
            const response = await fetchWithTimeout(url, { headers }, timeout);
            if (response.ok) {
                return response;
            }
            // Nếu không ok, thử lại
            if (i < retries - 1) {
                await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
            }
        } catch (error) {
            if (i === retries - 1) {
                throw error; // Throw ở lần cuối
            }
            // Retry với backoff
            await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
    throw new Error('Max retries reached');
};

const items = [
    { title: 'Home', url: '/', icon: Home },
    { title: 'Analytics', url: '/analytics', icon: ChartSpline },
    { title: 'Inbox', url: '/message', icon: Inbox }, // Quan trọng: URL phải khớp logic check pathname
    { title: 'Author Requests', url: '/author-requests', icon: UserCheck },
    { title: 'Hotel Approvals', url: '/hotel-approvals', icon: HousePlus },
    { title: 'Notifications', url: '/notifications', icon: Bell },
    { title: 'Calendar', url: '#', icon: Calendar },
    { title: 'Search', url: '#', icon: Search },
    { title: 'Settings', url: '/users/settings', icon: Settings },
];

const AppSidebar = () => {
    const {
        unreadCount,
        increment,
        setUnreadCount,
        pendingAuthorRequests,
        setPendingAuthorRequests,
        pendingHotelApprovals,
        setPendingHotelApprovals,
    } = useNotificationStore();
    const pathname = usePathname();
    const { getToken } = useAuth();

    // --- 1. FETCH TẤT CẢ STATS BAN ĐẦU ---
    useEffect(() => {
        const fetchAllStats = async () => {
            try {
                // Fetch messages từ MongoDB với timeout & retry
                try {
                    const token = await getToken();
                    if (!token) {
                        console.warn('⚠️ Chưa có token, bỏ qua fetch messages');
                        return;
                    }

                    const messagesRes = await fetchWithRetry(`${API_URL}/messages/stats/unread`, 3, 5000, token);
                    const data = await messagesRes.json();
                    setUnreadCount(data.count || 0);
                } catch (msgError) {
                    console.warn('⚠️ Không thể kết nối booking-service (messages), giữ nguyên giá trị cũ');
                    // Không set 0 để tránh reset badge
                }

                // Fetch pending counts từ PostgreSQL
                try {
                    const counts = await getAllPendingCounts();
                    setPendingAuthorRequests(counts.authorRequests);
                    setPendingHotelApprovals(counts.hotels);
                } catch (pgError) {
                    console.warn('⚠️ Không thể lấy pending counts từ PostgreSQL');
                }
            } catch (error) {
                console.error('⚠️ Lỗi tổng thể khi lấy thống kê:', error);
            }
        };

        fetchAllStats();

        // Refresh mỗi 30 giây để cập nhật số liệu
        const interval = setInterval(fetchAllStats, 30000);
        return () => clearInterval(interval);
    }, [setUnreadCount, setPendingAuthorRequests, setPendingHotelApprovals, getToken]);

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

            if (pathname !== '/message') {
                increment();
                // (Optional) Phát âm thanh thông báo"
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [pathname, increment]);

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
                            {items.map((item) => {
                                // Xác định badge count cho từng item
                                let badgeCount = 0;
                                if (item.title === 'Inbox') badgeCount = unreadCount;
                                else if (item.title === 'Author Requests') badgeCount = pendingAuthorRequests;
                                else if (item.title === 'Hotel Approvals') badgeCount = pendingHotelApprovals;

                                return (
                                    <SidebarMenuItem key={item.title} className="relative">
                                        <SidebarMenuButton asChild tooltip={item.title}>
                                            <Link href={item.url} className="relative">
                                                <div className="relative">
                                                    <item.icon className="h-4 w-4" />
                                                    {/* Badge ở góc phải trên của icon khi sidebar collapsed */}
                                                    {badgeCount > 0 && (
                                                        <span className="absolute -top-1 -right-1 hidden h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white group-data-[collapsible=icon]:flex">
                                                            {badgeCount > 9 ? '9+' : badgeCount}
                                                        </span>
                                                    )}
                                                </div>
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>

                                        {/* Badge bên cạnh khi sidebar expanded */}
                                        {badgeCount > 0 && (
                                            <SidebarMenuBadge className="animate-in zoom-in bg-red-500 font-bold text-white duration-300 group-data-[collapsible=icon]:hidden hover:bg-red-600">
                                                {badgeCount > 99 ? '99+' : badgeCount}
                                            </SidebarMenuBadge>
                                        )}
                                    </SidebarMenuItem>
                                );
                            })}
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
                                    <Link href="/bookings">
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
