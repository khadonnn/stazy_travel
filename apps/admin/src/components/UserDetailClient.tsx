'use client';

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { getUserDetail } from '@/app/(dashboard)/actions/get-user-detail';
import { getUserBookings } from '@/app/(dashboard)/actions/get-user-bookings';
import { getUserContribution } from '@/app/(dashboard)/actions/get-user-contribution';
import { getUserActivity } from '@/app/(dashboard)/actions/get-user-activity';
import { Badge } from '@/components/ui/badge';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Progress } from '@/components/ui/progress';
import { Compass, Plane, Building2, ShieldCheck, FileText, Crown, Shield, Settings, Loader2 } from 'lucide-react';
import { Sheet, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import EditUser from '@/components/EditUser';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import AppLineChart from '@/components/AppLineChart';
import ContributionChart from '@/components/ContributionChart';
import UserBookingsCardList from '@/components/UserBookingsCardList';

interface UserDetailClientProps {
    userId: string;
}

const UserDetailClient = ({ userId }: UserDetailClientProps) => {
    const { data: user, isLoading: loadingUser } = useQuery({
        queryKey: ['user-detail', userId],
        queryFn: () => getUserDetail(userId),
    });

    const {
        data: bookingsPages,
        isLoading: loadingBookings,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteQuery({
        queryKey: ['user-bookings', userId],
        queryFn: ({ pageParam = 1 }) => getUserBookings(userId, pageParam, 5),
        getNextPageParam: (lastPage, allPages) => {
            // If last page returned fewer than 5 items, no more pages
            return lastPage.length === 5 ? allPages.length + 1 : undefined;
        },
        initialPageParam: 1,
    });

    const bookings = bookingsPages?.pages.flatMap((page) => page) ?? [];

    const { data: contributionData = [] } = useQuery({
        queryKey: ['user-contribution', userId],
        queryFn: () => getUserContribution(userId),
    });

    const { data: activityData = [] } = useQuery({
        queryKey: ['user-activity', userId],
        queryFn: () => getUserActivity(userId),
    });

    if (loadingUser) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading user profile...</span>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex h-96 items-center justify-center">
                <p className="text-muted-foreground text-lg">User not found</p>
            </div>
        );
    }

    const bookingCount = user._count.bookings;
    const hotelCount = user._count.hotels;
    const reviewCount = user._count.reviews;
    const totalSpending = user.totalSpending;
    const isAdmin = user.role === 'ADMIN';
    const isAuthor = user.role === 'AUTHOR';

    const badges: {
        key: string;
        icon: React.ReactNode;
        title: string;
        description: string;
    }[] = [];

    if (bookingCount > 50) {
        badges.push({
            key: 'super-traveler',
            icon: (
                <Plane
                    size={36}
                    className="rounded-full border border-purple-500/50 bg-purple-500/20 p-2 text-purple-600 dark:text-purple-400"
                />
            ),
            title: 'Super Traveler',
            description: `Has made ${bookingCount} bookings (over 50)`,
        });
    } else if (bookingCount > 10) {
        badges.push({
            key: 'explorer',
            icon: (
                <Compass
                    size={36}
                    className="rounded-full border border-blue-500/50 bg-blue-500/20 p-2 text-blue-600 dark:text-blue-400"
                />
            ),
            title: 'Explorer',
            description: `Has made ${bookingCount} bookings (over 10)`,
        });
    }

    if (hotelCount > 0) {
        badges.push({
            key: 'hotel-host',
            icon: (
                <Building2
                    size={36}
                    className="rounded-full border border-green-500/50 bg-green-500/20 p-2 text-green-600 dark:text-green-400"
                />
            ),
            title: 'Hotel Host',
            description: `Has listed ${hotelCount} hotel(s)`,
        });
    }

    if (isAuthor && hotelCount > 0) {
        badges.push({
            key: 'verified-host',
            icon: (
                <ShieldCheck
                    size={36}
                    className="rounded-full border border-emerald-600/50 bg-emerald-600/20 p-2 text-emerald-600 dark:text-emerald-400"
                />
            ),
            title: 'Verified Host',
            description: 'Has verified hotel listings',
        });
    }

    if (reviewCount > 100) {
        badges.push({
            key: 'top-reviewer',
            icon: (
                <FileText
                    size={36}
                    className="rounded-full border border-orange-500/50 bg-orange-500/20 p-2 text-orange-600 dark:text-orange-400"
                />
            ),
            title: 'Top Reviewer',
            description: `Has written ${reviewCount} reviews (over 100)`,
        });
    }

    if (totalSpending > 10000000 || isAdmin) {
        badges.push({
            key: 'vip',
            icon: (
                <Crown
                    size={36}
                    className="rounded-full border border-yellow-500/50 bg-yellow-500/20 p-2 text-yellow-600 dark:text-yellow-400"
                />
            ),
            title: 'VIP',
            description: isAdmin
                ? 'Admin user with full access'
                : `Total spending: ${new Intl.NumberFormat('vi-VN').format(totalSpending)} VND`,
        });
    }

    if (isAdmin) {
        badges.push({
            key: 'admin',
            icon: (
                <Shield
                    size={36}
                    className="rounded-full border border-red-500/50 bg-red-500/20 p-2 text-red-600 dark:text-red-400"
                />
            ),
            title: 'Admin',
            description: 'Admin users have access to all features and can manage users.',
        });
    }

    const fields = [
        user.name,
        user.email,
        user.phone,
        user.gender,
        user.dob,
        user.address,
        user.avatar,
        user.jobName,
        user.desc,
    ];
    const filledFields = fields.filter((f) => f && f !== '').length;
    const completionPercent = Math.round((filledFields / fields.length) * 100);

    const formatDate = (date: Date | string) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <div>
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbLink href="/users">User</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>{user.name}</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
            {/* CONTAINER */}
            <div className="mt-4 flex flex-col gap-8 xl:flex-row">
                {/* LEFT */}
                <div className="w-full space-y-6 xl:w-1/3">
                    {/* USER BADGES CONTAINER */}
                    <div className="bg-primary-foreground rounded-lg p-4">
                        <h1 className="text-xl font-semibold">User Badges</h1>
                        <div className="mt-3 flex flex-wrap gap-4">
                            {badges.length > 0 ? (
                                badges.map((badge) => (
                                    <HoverCard key={badge.key}>
                                        <HoverCardTrigger>{badge.icon}</HoverCardTrigger>
                                        <HoverCardContent>
                                            <h1 className="mb-2 font-bold">{badge.title}</h1>
                                            <p className="text-muted-foreground text-sm italic">{badge.description}</p>
                                        </HoverCardContent>
                                    </HoverCard>
                                ))
                            ) : (
                                <p className="text-muted-foreground text-sm">No badges earned yet</p>
                            )}
                        </div>
                    </div>
                    {/* INFO CONTAINER */}
                    <div className="bg-primary-foreground rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <h1 className="text-xl font-semibold">User Information</h1>
                        </div>
                        <div className="mt-4 space-y-2">
                            <div className="mb-8 flex flex-col gap-2">
                                <p className="text-muted-foreground text-sm">Profile Completion</p>
                                <Progress value={completionPercent} />
                                <p className="text-muted-foreground text-xs">{completionPercent}%</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground font-medium italic">Full name:</span>
                                <span>{user.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground font-medium italic">Email:</span>
                                <span>{user.email}</span>
                            </div>
                            {user.phone && (
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground font-medium italic">Phone:</span>
                                    <span>{user.phone}</span>
                                </div>
                            )}
                            {user.gender && (
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground font-medium italic">Gender:</span>
                                    <span>{user.gender}</span>
                                </div>
                            )}
                            {user.dob && (
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground font-medium italic">DOB:</span>
                                    <span>{formatDate(user.dob)}</span>
                                </div>
                            )}
                            {user.address && (
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground font-medium italic">Address:</span>
                                    <span>{user.address}</span>
                                </div>
                            )}
                            {user.jobName && (
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground font-medium italic">Job:</span>
                                    <span>{user.jobName}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground font-medium italic">Role:</span>
                                <Badge
                                    className={
                                        user.role === 'ADMIN'
                                            ? 'bg-red-500/40 text-red-700 dark:text-red-400'
                                            : user.role === 'AUTHOR'
                                              ? 'bg-purple-500/40 text-purple-700 dark:text-purple-400'
                                              : 'bg-green-500/40 text-green-700 dark:text-green-400'
                                    }
                                >
                                    {user.role}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground font-medium italic">Bookings:</span>{' '}
                                    <span className="font-semibold">{bookingCount}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground font-medium italic">Hotels:</span>{' '}
                                    <span className="font-semibold">{hotelCount}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground font-medium italic">Reviews:</span>{' '}
                                    <span className="font-semibold">{reviewCount}</span>
                                </div>
                            </div>
                            <p className="text-muted-foreground mt-4 text-sm">Joined on {formatDate(user.createdAt)}</p>
                        </div>
                    </div>
                    {/* BOOKINGS CONTAINER */}
                    <div className="bg-primary-foreground rounded-lg p-4">
                        {loadingBookings ? (
                            <div className="flex h-32 items-center justify-center">
                                <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                        ) : (
                            <UserBookingsCardList
                                bookings={bookings}
                                isLoadingMore={isFetchingNextPage}
                                hasMore={!!hasNextPage}
                                onLoadMore={() => fetchNextPage()}
                            />
                        )}
                    </div>
                </div>
                {/* RIGHT */}
                <div className="w-full space-y-6 xl:w-2/3">
                    {/* USER CARD CONTAINER */}
                    <div className="bg-primary-foreground space-y-2 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Avatar className="size-12 cursor-pointer">
                                    <AvatarImage src={user.avatar || undefined} alt={user.name} />
                                    <AvatarFallback>
                                        {user.name
                                            .split(' ')
                                            .map((n: string) => n[0])
                                            .join('')
                                            .toUpperCase()
                                            .slice(0, 2)}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <h1 className="text-xl font-semibold">{user.name}</h1>
                                    {user.nickname && <p className="text-muted-foreground text-sm">@{user.nickname}</p>}
                                </div>
                            </div>

                            <Sheet>
                                <SheetTrigger asChild>
                                    <Button className="cursor-pointer">
                                        <Settings />
                                    </Button>
                                </SheetTrigger>
                                <EditUser />
                            </Sheet>
                        </div>

                        <p className="text-muted-foreground text-sm">{user.desc || 'No description provided.'}</p>
                    </div>
                    {/* CHART CONTAINER */}
                    <div className="bg-primary-foreground rounded-lg p-4">
                        <div className="mt-6">
                            <h1 className="mb-6 text-xl font-semibold">User Contribution</h1>
                            <ContributionChart data={contributionData} />
                        </div>
                        <h1 className="text-xl font-semibold">User Activity</h1>
                        <AppLineChart data={activityData} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserDetailClient;
