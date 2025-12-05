import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { LogOut, Settings, User, Calendar } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import Link from 'next/link';
const BASE_URL = 'http://localhost:8000';
export default function UserSetting() {
    const { authUser, logout } = useAuthStore();
    console.log('Auth user hello:', authUser);
    return (
        <DropdownMenu>
            <DropdownMenuTrigger className='focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-primary rounded-full'>
                <Avatar className='w-10 h-10'>
                    <AvatarImage
                        src={
                            BASE_URL + authUser?.profile_pic ||
                            '/assets/user2.avif'
                        }
                        alt={authUser?.name || 'user'}
                        className='object-cover w-full h-full'
                    />
                    <AvatarFallback>
                        {authUser?.name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent className='mt-1'>
                <DropdownMenuLabel>
                    {authUser?.name || 'My Account'}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href='/profile' className='flex items-center gap-2'>
                        <User className='h-4 w-4' /> Profile
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link
                        href='/my-bookings'
                        className='flex items-center gap-2'
                    >
                        <Calendar className='h-4 w-4' /> Đặt phòng
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                    <Settings className='h-4 w-4' /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem className='text-destructive' onClick={logout}>
                    <LogOut className='h-4 w-4' /> Logout
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
