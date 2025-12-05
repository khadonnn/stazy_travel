'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation'; // Thay thế useNavigate
import Link from 'next/link'; 
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { register } from '@/lib/api/auth';
import { GoogleIcon } from '@/components/icons/GoogleIcon';
import toast from 'react-hot-toast'; // Thêm import toast
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from '@/components/ui/card';
import { EyeIcon, EyeOffIcon } from 'lucide-react';

export default function RegisterPage() {
    const router = useRouter(); // Thay thế useNavigate()
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (form.password !== form.password_confirmation) {
            // Thay thế alert() bằng toast.error()
            toast.error('Mật khẩu nhập lại không khớp');
            setLoading(false);
            return;
        }

        try {
            const res = await register(
                form.name,
                form.email,
                form.password,
                form.password_confirmation,
            );
            // Lưu ý: localStorage không nên dùng trong Next.js cho token, 
            // nhưng tôi giữ lại logic này theo mã gốc.
            localStorage.setItem('token', res.token); 
            
            toast.success('Đăng ký thành công!');
            
            // Chuyển hướng bằng router.push
            router.push('/login');
        } catch (err: unknown) {
            let errorMessage = 'Đăng ký thất bại';
            if (err && typeof err === 'object' && 'response' in err) {
                const apiError = err as {
                    response?: { data?: { message?: string } };
                };
                errorMessage = apiError.response?.data?.message || errorMessage;
            } else if (err instanceof Error) {
                errorMessage = err.message;
            }
            // Thay thế alert() bằng toast.error()
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className='min-h-screen flex items-center justify-center px-6 relative'>
            <div className='absolute top-0 left-36 w-72 h-72 bg-gradient-to-r from-green-400 to-blue-500 rounded-full blur-3xl opacity-30' />
            <div className='absolute bottom-0 right-40 w-72 h-72 bg-gradient-to-tr from-pink-400 to-purple-500 rounded-full blur-3xl opacity-30' />

            <Card className='w-full max-w-sm p-6'>
                <CardHeader className='text-center'>
                    <CardTitle className='text-xl'>Tạo tài khoản</CardTitle>
                    <CardDescription>Tạo bằng tài khoản Google</CardDescription>
                </CardHeader>

                <CardContent>
                    {/* Social Register */}
                    <div className='flex flex-col gap-4 mb-6'>
                        <Button variant='outline' className='w-full' disabled={loading}>
                            <GoogleIcon className='w-5 h-5 mr-2' />
                            Google
                        </Button>
                    </div>

                    {/* Divider */}
                    <div className='relative text-center text-sm my-6'>
                        <span className='bg-white px-2 relative z-10'>
                            Hoặc đăng ký mới
                        </span>
                        <div className='absolute inset-0 top-1/2 border-t border-gray-300' />
                    </div>

                    {/* Register Form */}
                    <form onSubmit={handleSubmit} className='grid gap-4'>
                        <Input
                            name='name'
                            placeholder='Họ và tên'
                            value={form.name}
                            onChange={handleChange}
                            required
                            disabled={loading}
                        />
                        <Input
                            name='email'
                            placeholder='Email'
                            type='email'
                            value={form.email}
                            onChange={handleChange}
                            required
                            disabled={loading}
                        />

                        {/* Password Input */}
                        <div className='relative'>
                            <Input
                                name='password'
                                placeholder='Mật khẩu'
                                type={showPassword ? 'text' : 'password'}
                                value={form.password}
                                onChange={handleChange}
                                required
                                className='pr-10'
                                disabled={loading}
                            />
                            <button
                                type='button'
                                onClick={() => setShowPassword(!showPassword)}
                                className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none'
                                aria-label={
                                    showPassword
                                        ? 'Ẩn mật khẩu'
                                        : 'Hiện mật khẩu'
                                }
                                disabled={loading}
                            >
                                {showPassword ? (
                                    <EyeOffIcon className='h-5 w-5' />
                                ) : (
                                    <EyeIcon className='h-5 w-5' />
                                )}
                            </button>
                        </div>

                        {/* Confirm Password Input */}
                        <div className='relative'>
                            <Input
                                name='password_confirmation'
                                placeholder='Xác nhận mật khẩu'
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={form.password_confirmation}
                                onChange={handleChange}
                                required
                                className='pr-10'
                                disabled={loading}
                            />
                            <button
                                type='button'
                                onClick={() =>
                                    setShowConfirmPassword(!showConfirmPassword)
                                }
                                className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none'
                                aria-label={
                                    showConfirmPassword
                                        ? 'Ẩn mật khẩu'
                                        : 'Hiện mật khẩu'
                                }
                                disabled={loading}
                            >
                                {showConfirmPassword ? (
                                    <EyeOffIcon className='h-5 w-5' />
                                ) : (
                                    <EyeIcon className='h-5 w-5' />
                                )}
                            </button>
                        </div>
                        
                        {/* Error message for confirmation */}
                        {form.password !== form.password_confirmation && form.password_confirmation && (
                            <p className='text-sm text-red-600'>
                                Mật khẩu xác nhận không khớp.
                            </p>
                        )}


                        <Button
                            type='submit'
                            className='w-full bg-green-700 text-white'
                            disabled={loading || form.password !== form.password_confirmation || !form.name || !form.email || !form.password}
                        >
                            {loading ? 'Đang đăng ký...' : 'Đăng ký'}
                        </Button>

                        <p className='text-sm text-center'>
                            Đã có tài khoản?{' '}
                            <Link
                                href='/login' // Next.js Link dùng href
                                className='text-green-600 underline underline-offset-4'
                            >
                                Đăng nhập
                            </Link>
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}