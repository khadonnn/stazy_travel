'use client';
import SearchBar from '@/components/SearchBar';
import { Button } from '@/components/ui/button';
import { BadgeInfo, Bell, Plane } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import UserSetting from '@/components/UserSetting';
// import { useAuthStore } from '@/store/useAuthStore';
import NotificationDropdown from '@/components/NotificationDropdown';
import Image from 'next/image';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs'; 
// TEMP
const Navbar = () => {
const { isSignedIn, user, isLoaded } = useUser();

if (!isLoaded) {
    return (
        <div className='w-full h-16 bg-white/80 backdrop-blur-md fixed top-0 z-50' />
    );
}
return (
    <div className='w-full flex items-center justify-between border border-gray-300 py-2 px-10 fixed top-0 z-50 bg-white/80 backdrop-blur-md'>
        {/* left */}
        <Link href='/' className='flex items-center'>
            <Image
                src={'/assets/logo.png'}
                alt='logo'
                className='w-6 h-6 md:w-8 md:h-8'
                loading='lazy'
                width={32}
                height={32}
            />
            <p className='hidden md:block text-2xl font-semibold tracking-wider ml-2 '>
                Stazy.
            </p>
        </Link>

        {/* right */}
        <TooltipProvider>
            <div className='flex items-center gap-4'>
                <SearchBar />
                {/* Location */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Link
                            href='/about'
                            className='hover:bg-accent rounded-md p-2 transition-colors'
                        >
                            <BadgeInfo className='w-5 h-5 text-gray-600' />
                        </Link>
                    </TooltipTrigger>
                    <TooltipContent side='bottom'>
                        <p>Giới thiệu</p>
                    </TooltipContent>
                </Tooltip>

                {/* Notifications */}

                {/* plane */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Link
                            href='/hotels'
                            className='hover:bg-accent rounded-md p-2 transition-colors'
                        >
                            {/* Icon */}
                            <Plane className='w-5 h-5 text-gray-600' />
                        </Link>
                    </TooltipTrigger>
                    <TooltipContent side='bottom'>
                        <p>Khám phá</p>
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <NotificationDropdown>
                            <Bell className='w-5! h-5! text-gray-600' />
                        </NotificationDropdown>
                    </TooltipTrigger>
                    {/* {!authUser && (
                            <TooltipContent side='bottom'>
                                <p>Thông báo</p>
                            </TooltipContent>
                        )} */}
                </Tooltip>

                {/* Login */}
                {isSignedIn ? (
                    <UserSetting />
                ) : (
                    <Link href='/sign-in'>
                        <Button
                            variant='outline'
                            className='hidden md:inline-flex border-gray-300 hover:shadow-md'
                        >
                            Đăng nhập
                        </Button>
                    </Link>
                )}
            </div>
        </TooltipProvider>
    </div>
);
};

export default Navbar;
