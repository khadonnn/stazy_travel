import {
    Home,
    Inbox,
    Calendar,
    Search,
    Settings,
    Plus,
    Projector,
    ChevronDown,
    CalendarCheck2,
    MessageSquareWarning,
    ChevronsUpDown,
    PackagePlus,
    Shirt,
    User,
    ShoppingBasket,
    ChartSpline,
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
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarSeparator,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import Image from 'next/image';
import {
    DropdownMenuItem,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sheet, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import EditUser from '@/components/EditUser';
import AddOrder from '@/components/AddOrder';
import AddProduct from '@/components/AddProduct';
import AddCategory from '@/components/AddCategory';
import AddUser from '@/components/AddUser';
const items = [
    {
        title: 'Home',
        url: '/',
        icon: Home,
    },
    {
        title: 'Analytics',
        url: '/analytics',
        icon: ChartSpline,
    },
    {
        title: 'Inbox',
        url: '#',
        icon: Inbox,
    },
    {
        title: 'Calendar',
        url: '#',
        icon: Calendar,
    },
    {
        title: 'Search',
        url: '#',
        icon: Search,
    },
    {
        title: 'Settings',
        url: '/users/settings',
        icon: Settings,
    },
];

const AppSidebar = () => {
    return (
        <Sidebar collapsible="icon">
            {/* logo */}
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
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Application</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {items.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild>
                                        <Link href={item.url}>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                    {item.title === 'Inbox' && <SidebarMenuBadge>22</SidebarMenuBadge>}
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
                {/* Hotels */}
                <SidebarGroup>
                    <SidebarGroupLabel>Hotels</SidebarGroupLabel>
                    <SidebarGroupAction title="Add Hotel">
                        <Plus /> <span className="sr-only">Add Hotel</span>
                    </SidebarGroupAction>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild>
                                    <Link href="/hotels">
                                        <Shirt />
                                        See all hotels
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            {/* add product */}
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild>
                                    {/* RIGHT: Nút Settings */}
                                    <Sheet>
                                        <SheetTrigger asChild>
                                            <SidebarMenuButton asChild>
                                                <Link href="#">
                                                    <Plus /> Add Product
                                                </Link>
                                            </SidebarMenuButton>
                                        </SheetTrigger>
                                        <AddProduct />
                                    </Sheet>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            {/* add category */}
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild>
                                    {/* RIGHT: Nút Settings */}
                                    <Sheet>
                                        <SheetTrigger asChild>
                                            <SidebarMenuButton asChild>
                                                <Link href="#">
                                                    <Plus /> Add Category
                                                </Link>
                                            </SidebarMenuButton>
                                        </SheetTrigger>
                                        <AddCategory />
                                    </Sheet>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
                {/* User */}
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
                                        <User />
                                        See All Users
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            {/* add product */}
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild>
                                    {/* RIGHT: Nút Settings */}
                                    <Sheet>
                                        <SheetTrigger asChild>
                                            <SidebarMenuButton asChild>
                                                <Link href="#">
                                                    <Plus /> Add User
                                                </Link>
                                            </SidebarMenuButton>
                                        </SheetTrigger>
                                        <AddUser />
                                    </Sheet>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
                {/* order/ payment */}
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
                                        <ShoppingBasket />
                                        See All Transactions
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            {/* add product */}
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild>
                                    {/* RIGHT: Nút Settings */}
                                    <Sheet>
                                        <SheetTrigger asChild>
                                            <SidebarMenuButton asChild>
                                                <Link href="#">
                                                    <Plus /> Add Order
                                                </Link>
                                            </SidebarMenuButton>
                                        </SheetTrigger>
                                        <AddOrder />
                                    </Sheet>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
                {/* collapse */}
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
                                            <Link href="/#">
                                                <CalendarCheck2 />
                                                Daily
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton asChild>
                                            <Link href="/#">
                                                <MessageSquareWarning /> Feed back
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </CollapsibleContent>
                    </SidebarGroup>
                </Collapsible>
                {/* sub */}
                {/* <Collapsible defaultOpen className="group/collapsible">
                    <SidebarGroup>
                        <SidebarGroupLabel asChild>
                            <CollapsibleTrigger>
                                Sub Projects
                                <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                            </CollapsibleTrigger>
                        </SidebarGroupLabel>

                        <CollapsibleContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild>
                                        <Link href="/#">
                                            <Projector />
                                            All projects
                                        </Link>
                                    </SidebarMenuButton>
                                    <SidebarMenuSub>
                                        <SidebarMenuSubItem>
                                            <SidebarMenuSubButton asChild>
                                                <Link href="/#">Project 1</Link>
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                    </SidebarMenuSub>{' '}
                                    <SidebarMenuSub>
                                        <SidebarMenuSubItem>
                                            <SidebarMenuSubButton asChild>
                                                <Link href="/#">Project 2</Link>
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                    </SidebarMenuSub>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </CollapsibleContent>
                    </SidebarGroup>
                </Collapsible> */}
            </SidebarContent>

            <SidebarSeparator className="inset-0 ml-0" />
            <SidebarFooter className="inset-0 rounded-md">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton size="lg">
                                    <Image
                                        src="/assets/images/avatar.jpg"
                                        alt="logo"
                                        width={20}
                                        height={20}
                                        className="h-10 w-10 shrink-0 rounded-lg border border-gray-700/20 object-cover dark:border-gray-200/20"
                                    />
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-semibold">Khadon</span>
                                    </div>{' '}
                                    <ChevronsUpDown className="ml-auto" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem>Account</DropdownMenuItem>
                                <DropdownMenuItem>Setting</DropdownMenuItem>
                                <DropdownMenuItem>Sign out</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
};
export default AppSidebar;
