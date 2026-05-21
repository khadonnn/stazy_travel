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
import {
    Compass,
    Plane,
    Building2,
    ShieldCheck,
    FileText,
    Crown,
    Shield,
    Settings,
    Loader2,
    Heart,
    MessageSquare,
    Award,
    Coins,
} from 'lucide-react';
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

// 🌟 ĐỊNH NGHĨA TYPE CHO ĐÚNG CHUẨN TYPESCRIPT
interface BadgeRuleContext {
    bookingCount: number;
    hotelCount: number;
    reviewCount: number;
    wishlistCount: number;
    totalSpending: number;
    isAdmin: boolean;
    isAuthor: boolean;
}

interface BadgeRule {
    key: string;
    icon: React.ReactNode;
    title: string;
    // Hàm nhận vào các chỉ số hệ thống và trả về chuỗi mô tả động (hoặc string cố định)
    getDescription: (ctx: BadgeRuleContext) => string;
    // Hàm điều kiện: Trả về true thì User sẽ được sở hữu badge này
    condition: (ctx: BadgeRuleContext) => boolean;
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
        getNextPageParam: (lastPage, allPages) => (lastPage.length === 5 ? allPages.length + 1 : undefined),
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

    // 1. GOM CÁC CHỈ SỐ VÀO MỘT CONTEXT ĐỂ TRUYỀN XUỐNG BỘ LỌC RULE
    const ctx: BadgeRuleContext = {
        bookingCount: user._count.bookings,
        hotelCount: user._count.hotels,
        reviewCount: user._count.reviews,
        wishlistCount: user._count?.favorites || 0,
        totalSpending: user.totalSpending,
        isAdmin: user.role === 'ADMIN',
        isAuthor: user.role === 'AUTHOR',
    };

    //  MẢNG MAP LIỆT KÊ CẤU HÌNH BADGES (CỰC KỲ DỄ BỔ SUNG THÊM SAU NÀY)
    const badgeRules: BadgeRule[] = [
        {
            key: 'loyal-elite',
            icon: (
                <Award
                    size={36}
                    className="rounded-full border border-purple-600/50 bg-purple-600/20 p-2 text-purple-700 dark:text-purple-400"
                />
            ),
            title: 'Huyền thoại Xê dịch (Travel Legend)',
            getDescription: (c) =>
                `Mốc thành tựu tối cao: Đã hoàn thành ${c.bookingCount} đơn đặt phòng (Yêu cầu >= 50). `,
            condition: (c) => c.bookingCount >= 50,
        },
        {
            key: 'explorer',
            icon: (
                <Compass
                    size={36}
                    className="rounded-full border border-blue-500/50 bg-blue-500/20 p-2 text-blue-600 dark:text-blue-400"
                />
            ),
            title: 'Explorer',
            getDescription: (c) =>
                `Đã thực hiện ${c.bookingCount} đơn đặt phòng thành công trên hệ thống (Yêu cầu 11 - 49).`,
            condition: (c) => c.bookingCount > 10 && c.bookingCount < 50,
        },
        {
            key: 'first-step',
            icon: (
                <Plane
                    size={36}
                    className="rounded-full border border-sky-500/50 bg-sky-500/20 p-2 text-sky-600 dark:text-sky-400"
                />
            ),
            title: 'Người Tiên Phong (First Step)',
            getDescription: () => 'Kích hoạt thành công đơn đặt phòng đầu tiên trên nền tảng Stazy.',
            condition: (c) => c.bookingCount > 0 && c.bookingCount <= 10,
        },
        {
            key: 'review-expert',
            icon: (
                <MessageSquare
                    size={36}
                    className="rounded-full border border-orange-500/50 bg-orange-500/20 p-2 text-orange-600 dark:text-orange-400"
                />
            ),
            title: 'Nhà Phê Bình (Review Expert)',
            getDescription: (c) => `Đã đóng góp ${c.reviewCount} đánh giá công khai (Yêu cầu >= 5).`,
            condition: (c) => c.reviewCount >= 5,
        },
        {
            key: 'hotel-scout',
            icon: (
                <Heart
                    size={36}
                    className="rounded-full border border-rose-500/50 bg-rose-500/20 p-2 text-rose-600 dark:text-rose-400"
                />
            ),
            title: 'Chuyên Gia Săn Lùng (Hotel Scout)',
            getDescription: () => 'Lưu trữ trên 10 khách sạn vào danh sách yêu thích. ',
            condition: (c) => c.wishlistCount >= 10,
        },
        {
            key: 'big-spender',
            icon: (
                <Coins
                    size={36}
                    className="rounded-full border border-amber-500/50 bg-amber-500/20 p-2 text-amber-600 dark:text-amber-400"
                />
            ),
            title: 'Nhà Đầu Tư Du Lịch (Big Spender)',
            getDescription: (c) =>
                `Tổng tích lũy chi tiêu đạt ngưỡng thượng lưu: ${new Intl.NumberFormat('vi-VN').format(c.totalSpending)} VND (Yêu cầu >= 50M).`,
            condition: (c) => c.totalSpending >= 50000000,
        },
        {
            key: 'vip',
            icon: (
                <Crown
                    size={36}
                    className="rounded-full border border-yellow-500/50 bg-yellow-500/20 p-2 text-yellow-600 dark:text-yellow-400"
                />
            ),
            title: 'VIP MEMBER',
            getDescription: (c) =>
                c.isAdmin
                    ? 'Tài khoản Quản trị viên (Admin) sở hữu toàn quyền hệ thống.'
                    : `Thành viên VIP. Tổng chi tiêu tích lũy: ${new Intl.NumberFormat('vi-VN').format(c.totalSpending)} VND.`,
            condition: (c) =>
                (c.totalSpending >= 10000000 && c.totalSpending < 50000000) ||
                (c.isAdmin && c.totalSpending < 50000000),
        },
        {
            key: 'hotel-host',
            icon: (
                <Building2
                    size={36}
                    className="rounded-full border border-green-500/50 bg-green-500/20 p-2 text-green-600 dark:text-green-400"
                />
            ),
            title: 'Hotel Host',
            getDescription: (c) => `Đang vận hành và quản lý ${c.hotelCount} cơ sở lưu trú trên hệ thống.`,
            condition: (c) => c.hotelCount > 0,
        },
        {
            key: 'verified-host',
            icon: (
                <ShieldCheck
                    size={36}
                    className="rounded-full border border-emerald-600/50 bg-emerald-600/20 p-2 text-emerald-600 dark:text-emerald-400"
                />
            ),
            title: 'Verified Host',
            getDescription: () => 'Đối tác lưu trú đã được kiểm định thông tin pháp lý và hồ sơ năng lực sạch.',
            condition: (c) => c.isAuthor && c.hotelCount > 0,
        },
        {
            key: 'admin',
            icon: (
                <Shield
                    size={36}
                    className="rounded-full border border-red-500/50 bg-red-500/20 p-2 text-red-600 dark:text-red-400"
                />
            ),
            title: 'System Administrator',
            getDescription: () => 'Tài khoản thuộc nhóm điều phối trục lõi hệ thống bảo mật.',
            condition: (c) => c.isAdmin,
        },
    ];

    // 2. CHẠY LỌC ĐỘNG QUA MẢNG RULE: Thỏa mãn condition nào thì sinh ra Badge đó luôn
    const activeBadges = badgeRules
        .filter((rule) => rule.condition(ctx))
        .map((rule) => ({
            key: rule.key,
            icon: rule.icon,
            title: rule.title,
            description: rule.getDescription(ctx),
        }));

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

            <div className="mt-4 flex flex-col gap-8 xl:flex-row">
                {/* LEFT COLUMN */}
                <div className="w-full space-y-6 xl:w-1/3">
                    {/* USER BADGES CONTAINER */}
                    <div className="bg-primary-foreground rounded-lg border p-4 shadow-sm">
                        <h1 className="text-xl font-semibold">Thành tựu & Huy hiệu nhóm</h1>
                        <div className="mt-4 flex flex-wrap gap-4">
                            {activeBadges.length > 0 ? (
                                activeBadges.map((badge) => (
                                    <HoverCard key={badge.key}>
                                        <HoverCardTrigger className="block cursor-pointer transition hover:scale-110">
                                            {badge.icon}
                                        </HoverCardTrigger>
                                        <HoverCardContent side="top" className="w-80 p-4">
                                            <h1 className="text-foreground mb-1 text-sm font-bold">{badge.title}</h1>
                                            <p className="text-muted-foreground text-xs leading-relaxed">
                                                {badge.description}
                                            </p>
                                        </HoverCardContent>
                                    </HoverCard>
                                ))
                            ) : (
                                <p className="text-muted-foreground text-sm">Chưa đạt thành tựu nào trên hệ thống.</p>
                            )}
                        </div>
                    </div>

                    {/* INFO CONTAINER */}
                    <div className="bg-primary-foreground rounded-lg border p-4">
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
                            <div className="flex items-center gap-4 pt-2 text-sm">
                                <div>
                                    <span className="text-muted-foreground font-medium italic">Bookings:</span>{' '}
                                    <span className="font-semibold">{ctx.bookingCount}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground font-medium italic">Hotels:</span>{' '}
                                    <span className="font-semibold">{ctx.hotelCount}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground font-medium italic">Reviews:</span>{' '}
                                    <span className="font-semibold">{ctx.reviewCount}</span>
                                </div>
                            </div>
                            <p className="text-muted-foreground mt-4 text-sm">Joined on {formatDate(user.createdAt)}</p>
                        </div>
                    </div>

                    {/* BOOKINGS CONTAINER */}
                    <div className="bg-primary-foreground rounded-lg border p-4">
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

                {/* RIGHT COLUMN */}
                <div className="w-full space-y-6 xl:w-2/3">
                    {/* USER CARD CONTAINER */}
                    <div className="bg-primary-foreground space-y-2 rounded-lg border p-4">
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
                    <div className="bg-primary-foreground rounded-lg border p-4">
                        <div className="mt-6">
                            <h1 className="mb-6 text-xl font-semibold">User Contribution</h1>
                            <ContributionChart data={contributionData} />
                        </div>
                        <h1 className="mt-8 text-xl font-semibold">User Activity</h1>
                        <AppLineChart data={activityData} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserDetailClient;
