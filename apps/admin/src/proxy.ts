import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// 1. Các trang CÔNG KHAI (Không bao giờ bị chặn)
const isPublicRoute = createRouteMatcher([
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/unauthorized(.*)', // Bắt buộc public
    '/api/uploadthing(.*)',
]);

// 2. Các trang cần QUYỀN ADMIN (Tất cả trừ trang public)
const isAdminRoute = createRouteMatcher(['/((?!sign-in|sign-up|unauthorized|api).*)']);

export default clerkMiddleware(async (auth, req) => {
    // A. Bỏ qua kiểm tra đối với file tĩnh (CSS, Font, Image, JS)
    // Logic này quan trọng để trang không bị mất màu (đen trắng)
    const pathname = req.nextUrl.pathname;
    if (
        pathname.startsWith('/_next') ||
        pathname.match(/\.(css|js|map|png|jpg|jpeg|svg|gif|webp|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)$/)
    ) {
        return NextResponse.next();
    }

    // B. Nếu là Public Route -> Cho qua
    if (isPublicRoute(req)) {
        return NextResponse.next();
    }

    const { userId, sessionClaims } = await auth();

    // C. Chưa đăng nhập -> Đá về Login
    if (!userId) {
        // Thêm redirect_url để sau khi login xong quay lại đúng chỗ
        return (await auth()).redirectToSignIn({ returnBackUrl: req.url });
    }

    // D. Đã đăng nhập nhưng cố vào trang Admin
    if (isAdminRoute(req)) {
        const role = (sessionClaims as any)?.metadata?.role;

        // Nếu không phải Admin -> Đá về Unauthorized
        if (role !== 'admin') {
            // Dùng URL tuyệt đối để tránh lỗi relative path
            return NextResponse.redirect(new URL('/unauthorized', req.url));
        }
    }

    return NextResponse.next();
});

// Config Matcher chuẩn của Next.js 15 + Clerk
export const config = {
    matcher: [
        // Skip Next.js internals and all static files
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
