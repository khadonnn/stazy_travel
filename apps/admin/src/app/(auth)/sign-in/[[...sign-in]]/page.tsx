import { SignIn } from '@clerk/nextjs';
import { Badge } from '@/components/ui/badge';
import { UserCog } from 'lucide-react';
export default function Page() {
    return (
        <div className="relative flex min-h-screen items-center justify-center bg-black px-6">
            <div className="absolute top-0 left-36 h-72 w-72 rounded-full bg-linear-to-r from-green-400 to-blue-500 opacity-30 blur-3xl" />
            <div className="absolute right-40 bottom-0 h-72 w-72 rounded-full bg-linear-to-tr from-pink-400 to-purple-500 opacity-30 blur-3xl" />
            <div className="my-20">
                <Badge
                    variant="secondary"
                    className="mb-2 flex items-center justify-center gap-2 bg-blue-500 px-4 py-1 text-sm text-white dark:bg-blue-600"
                >
                    <UserCog />
                    Admin - Đăng nhập
                </Badge>
                <SignIn />
            </div>
        </div>
    );
}
