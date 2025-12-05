'use client'; 

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { useAuthStore } from '@/store/useAuthStore';
import { GoogleIcon } from '@/components/icons/GoogleIcon';
import { EyeIcon, EyeOffIcon } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter(); 
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // lấy login + isLoggingIn từ zustand
    const login = useAuthStore((state) => state.login);
    const isLoggingIn = useAuthStore((state) => state.isLoggingIn);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await login({ email, password }); // gọi login từ zustand
            router.push('/'); // Thay thế navigate('/') bằng router.push('/')
        } catch (error) {
            console.error('Đăng nhập thất bại', error);
            // Trong ứng dụng thực tế, nên dùng toast.error() ở đây
        }
    };

    return (
        <div className='min-h-[100vh] flex items-center justify-center px-6 relative'>
            <div className='absolute top-0 left-36 w-72 h-72 bg-gradient-to-r from-green-400 to-blue-500 rounded-full blur-3xl opacity-30' />
            <div className='absolute bottom-0 right-40 w-72 h-72 bg-gradient-to-tr from-pink-400 to-purple-500 rounded-full blur-3xl opacity-30' />

            <Card className='w-full max-w-sm p-6 '>
                <CardHeader className='text-center'>
                    <CardTitle className='text-xl'>
                        Chào mừng bạn trở lại
                    </CardTitle>
                    <CardDescription>
                        Đăng nhập bằng tài khoản Google
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {/* Social Login */}
                    <div className='flex flex-col gap-4 mb-6'>
                        <Button variant='outline' className='w-full' disabled={isLoggingIn}>
                            <GoogleIcon className='w-5 h-5 mr-2' />
                            Google
                        </Button>
                    </div>

                    {/* Divider */}
                    <div className='relative text-center text-sm my-6'>
                        <span className='bg-white px-2 relative z-10'>
                            Hoặc tiếp tục với
                        </span>
                        <div className='absolute inset-0 top-1/2 border-t border-gray-300' />
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className='grid gap-4'>
                        <div className='grid gap-2'>
                            <Label htmlFor='email'>Email</Label>
                            <Input
                                id='email'
                                type='email'
                                placeholder='user@example.com'
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isLoggingIn}
                            />
                        </div>

                        <div className='grid gap-2'>
                            <div className='flex items-center'>
                                <Label htmlFor='password'>Mật khẩu</Label>
                                <Link
                                    href='/forgot-password' // Thay thế to bằng href
                                    className='ml-auto text-sm underline-offset-4 hover:underline'
                                    tabIndex={-1}
                                >
                                    Quên mật khẩu?
                                </Link>
                            </div>

                            <div className='relative'>
                                <Input
                                    id='password'
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder='••••••••'
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    required
                                    className='pr-10'
                                    disabled={isLoggingIn}
                                />
                                <button
                                    type='button'
                                    onClick={() =>
                                        setShowPassword(!showPassword)
                                    }
                                    className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none'
                                    aria-label={
                                        showPassword
                                            ? 'Ẩn mật khẩu'
                                            : 'Hiện mật khẩu'
                                    }
                                    disabled={isLoggingIn}
                                >
                                    {showPassword ? (
                                        <EyeOffIcon className='h-5 w-5' />
                                    ) : (
                                        <EyeIcon className='h-5 w-5' />
                                    )}
                                </button>
                            </div>
                        </div>

                        <Button
                            type='submit'
                            className='w-full bg-green-700 text-white'
                            disabled={isLoggingIn || !email || !password}
                        >
                            {isLoggingIn ? 'Đang đăng nhập...' : 'Đăng nhập'}
                        </Button>
                    </form>

                    {/* Signup Link */}
                    <div className='text-center text-sm mt-4'>
                        Chưa có tài khoản?{' '}
                        <Link
                            href='/register' // Thay thế to bằng href
                            className='text-green-600 underline underline-offset-4'
                        >
                            Đăng ký
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}