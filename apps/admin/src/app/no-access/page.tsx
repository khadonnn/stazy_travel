'use client';

import { SignOutButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button'; // Hoặc dùng button thường

export default function NoAccessPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 text-center">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold text-red-600">Truy cập bị từ chối</h1>
                <p className="text-gray-600">
                    Tài khoản hiện tại của bạn là <strong>Khách hàng (User)</strong>.
                    <br />
                    Vui lòng đăng nhập bằng tài khoản <strong>Quản trị viên (Admin)</strong>.
                </p>
            </div>

            {/* Nút này sẽ đăng xuất tài khoản User, cho phép bạn đăng nhập lại */}
            <SignOutButton redirectUrl="/sign-in">
                <Button variant="destructive">Đăng xuất và chuyển tài khoản</Button>
            </SignOutButton>
        </div>
    );
}
