'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation'; // Thay thế useNavigate và useLocation
import Link from 'next/link'; 
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { forgotPassword } from '@/lib/api/auth';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();

    // Lấy email pre-fill từ query parameter (thường dùng khi resend OTP)
    useEffect(() => {
        const initialEmail = searchParams?.get('email');
        if (initialEmail) {
            setEmail(initialEmail);
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await forgotPassword(email);
            toast.success('OTP đã được gửi đến email của bạn');
            
            // Chuyển hướng đến trang verify OTP và truyền email qua query parameter
            router.push(`/verify-otp?email=${email}`);
        } catch (err: unknown) {
            let errorMessage = 'Request failed';

            if (err && typeof err === 'object' && 'response' in err) {
                const apiError = err as {
                    response?: { data?: { message?: string } };
                };
                errorMessage =
                    apiError.response?.data?.message || 'Request failed';
            } else if (err instanceof Error) {
                errorMessage = err.message;
            }

            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className='min-h-[80vh] flex items-center justify-center px-6 relative'>
            <div className='absolute top-0 left-0 w-72 h-72 bg-gradient-to-r from-green-400 to-blue-500 rounded-full blur-3xl opacity-30' />
            <div className='absolute bottom-0 right-0 w-72 h-72 bg-gradient-to-tr from-pink-400 to-purple-500 rounded-full blur-3xl opacity-30' />
            <div className='w-full max-w-sm p-6 border rounded-lg shadow-lg bg-white'>
                <h1 className='text-2xl font-bold mb-6 text-center'>Quên mật khẩu</h1>
                <p className='text-center text-gray-600 mb-6'>
                    Nhập email của bạn để nhận mã xác thực (OTP).
                </p>

                <form onSubmit={handleSubmit} className='space-y-4'>
                    <Input
                        type='email'
                        placeholder='Nhập email của bạn'
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={loading}
                    />

                    <Button
                        type='submit'
                        disabled={loading || !email}
                        className='w-full bg-green-700 text-white'
                    >
                        {loading ? 'Đang gửi...' : 'Gửi mã xác thực'}
                    </Button>
                </form>

                <p className='text-sm text-center mt-6'>
                    Đã có tài khoản?{' '}
                    <Link
                        href='/login' // Thay thế to bằng href
                        className='text-green-600 underline underline-offset-4'
                    >
                        Đăng nhập
                    </Link>
                </p>
            </div>
        </div>
    );
}