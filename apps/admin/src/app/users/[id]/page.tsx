import CardList from '@/components/CardList';
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
import { BadgeCheck, Medal, Settings, Shield, Star } from 'lucide-react';
import { Sheet, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import EditUser from '@/components/EditUser';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import AppLineChart from '@/components/AppLineChart';
import ContributionChart from '@/components/ContributionChart';

const SingleUserPage = () => {
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
                        <BreadcrumbPage>Khadon</BreadcrumbPage>
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
                        <div className="mt-3 flex gap-4">
                            <HoverCard>
                                <HoverCardTrigger>
                                    <BadgeCheck
                                        size={36}
                                        className="rounded-full border border-blue-700/30 bg-blue-500/20 p-2"
                                    />
                                </HoverCardTrigger>
                                <HoverCardContent>
                                    <h1 className="mb-2 font-bold">Verified User</h1>
                                    <p className="text-muted-foreground text-sm italic">
                                        This user has been verified by the admin
                                    </p>
                                </HoverCardContent>
                            </HoverCard>
                            <HoverCard>
                                <HoverCardTrigger>
                                    <Shield
                                        size={36}
                                        className="rounded-full border border-green-800/50 bg-emerald-500/20 p-2"
                                    />
                                </HoverCardTrigger>
                                <HoverCardContent>
                                    <h1 className="mb-2 font-bold">Admin</h1>
                                    <p className="text-muted-foreground text-sm italic">
                                        Admin users have access to all features and can manage users.
                                    </p>
                                </HoverCardContent>
                            </HoverCard>
                            <HoverCard>
                                <HoverCardTrigger>
                                    <Medal
                                        size={36}
                                        className="rounded-full border border-yellow-500/50 bg-yellow-500/30 p-2"
                                    />
                                </HoverCardTrigger>
                                <HoverCardContent>
                                    <h1 className="mb-2 font-bold">Awarded</h1>
                                    <p className="text-muted-foreground text-sm italic">
                                        This user has been awarded for their contributions.
                                    </p>
                                </HoverCardContent>
                            </HoverCard>
                            <HoverCard>
                                <HoverCardTrigger>
                                    <Star
                                        size={36}
                                        className="rounded-full border border-orange-500/50 bg-orange-500/30 p-2"
                                    />
                                </HoverCardTrigger>
                                <HoverCardContent>
                                    <h1 className="mb-2 font-bold">Popular</h1>
                                    <p className="text-muted-foreground text-sm italic">
                                        This user has been popular in the community.
                                    </p>
                                </HoverCardContent>
                            </HoverCard>
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
                                <Progress value={60} />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground font-medium italic">Full name:</span>
                                <span>khadon</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground font-medium italic">Email:</span>
                                <span>khadon.com</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground font-medium italic">Phone:</span>
                                <span>+097 1234 5678</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground font-medium italic">Address:</span>
                                <span>Viet Nam , HCM</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground font-medium italic">Role:</span>
                                <Badge>Admin</Badge>
                            </div>
                            <p className="text-muted-foreground mt-4 text-sm">Joined on 2025.01.01</p>
                        </div>
                    </div>
                    {/* CARD CONTAINER */}
                    <div className="bg-primary-foreground rounded-lg p-4">
                        <CardList title="Popular Stays" />
                    </div>
                </div>
                {/* RIGHT */}
                <div className="w-full space-y-6 xl:w-2/3">
                    {/* USER CARD CONTAINER */}
                    <div className="bg-primary-foreground space-y-2 rounded-lg p-4">
                        {/* Áp dụng justify-between cho container Flex ngoài cùng */}
                        <div className="flex items-center justify-between">
                            {/* LEFT: Avatar và H1 (Nhóm lại) */}
                            {/* Giữ lại gap-4 cho khoảng cách giữa Avatar và H1 */}
                            <div className="flex items-center gap-4">
                                <Avatar className="size-12 cursor-pointer">
                                    <AvatarImage src="https://avatars.githubusercontent.com/u/146587461?v=4&size=64" />
                                    <AvatarFallback>CN</AvatarFallback>
                                </Avatar>
                                <h1 className="text-xl font-semibold">Khadon</h1>
                            </div>

                            {/* RIGHT: Nút Settings */}
                            <Sheet>
                                <SheetTrigger asChild>
                                    <Button className="cursor-pointer">
                                        <Settings />
                                    </Button>
                                </SheetTrigger>
                                <EditUser />
                            </Sheet>
                        </div>

                        <p className="text-muted-foreground text-sm">
                            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Dolore delectus quasi aliquam
                            blanditiis facilis aut eum esse, ullam beatae architecto.
                        </p>
                    </div>
                    {/* CHART CONTAINER */}
                    <div className="bg-primary-foreground rounded-lg p-4">
                        <div className="mt-6">
                            <h1 className="mb-6 text-xl font-semibold">User Contribution</h1>
                            <ContributionChart />
                        </div>
                        <h1 className="text-xl font-semibold">User Activity</h1>
                        <AppLineChart />
                    </div>
                </div>
            </div>
        </div>
    );
};
export default SingleUserPage;
