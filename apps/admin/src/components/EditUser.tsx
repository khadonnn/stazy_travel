'use client';

import { SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'; // Import Avatar components
import React, { useState } from 'react'; // Import useState và React

// 1. CẬP NHẬT ZOD SCHEMA: Thêm trường avatar
const formSchema = z.object({
    fullName: z.string().min(2, { message: 'Full name must be at least 2 characters!' }).max(50),
    email: z.string().email({ message: 'Invalid email address!' }),
    phone: z.string().min(10).max(15),
    address: z.string().min(2),
    city: z.string().min(2),
    role: z.enum(['admin', 'user']),
    // Trường file mới: cho phép null hoặc FileList
    avatar: z.any().optional(),
});

const EditUser = () => {
    // State để lưu trữ URL xem trước của ảnh
    const [previewUrl, setPreviewUrl] = useState<string | null>(
        'https://avatars.githubusercontent.com/u/146587461?v=4&size=64', // Giá trị mặc định
    );

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            fullName: 'khadon',
            email: 'khadon@gmail.com',
            phone: '+097 123 456 789',
            address: 'Q1, HCM',
            city: 'HCM',
            role: 'admin',
            // avatar: undefined, // Không cần thiết nếu là optional
        },
    });

    // Hàm xử lý khi chọn file ảnh
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, fieldChange: (value: any) => void) => {
        const file = e.target.files?.[0];

        if (file) {
            // Đọc file để tạo URL xem trước
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            // Gửi File object cho react-hook-form
            fieldChange(file);
        } else {
            setPreviewUrl(null);
            fieldChange(undefined);
        }
    };

    // Hàm xử lý Submit (ví dụ)
    const onSubmit = (values: z.infer<typeof formSchema>) => {
        console.log('Form data:', values);
        if (values.avatar instanceof File) {
            console.log('Image file:', values.avatar.name);
            // Ở đây bạn sẽ dùng FormData để gửi file lên server
        }
    };

    return (
        <SheetContent className="overflow-y-auto">
            <SheetHeader className="my-3">
                <SheetTitle className="mb-4">Edit User</SheetTitle>
                <SheetDescription asChild>
                    <Form {...form}>
                        {/* 2. THÊM TRƯỜNG CHỌN VÀ XEM TRƯỚC ẢNH */}
                        <div className="mb-6 flex flex-col items-center justify-center space-y-3">
                            {/* Avatar Preview */}
                            <Avatar className="size-20">
                                <AvatarImage src={previewUrl || undefined} alt="Avatar Preview" />
                                <AvatarFallback>
                                    {form.getValues('fullName').substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>

                            <h2 className="text-md text-foreground font-semibold">{form.getValues('fullName')}</h2>
                        </div>

                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            {/* INPUT FILE */}
                            <FormField
                                control={form.control}
                                name="avatar"
                                render={({ field: { value, onChange, ...fieldProps } }) => (
                                    <FormItem>
                                        <FormLabel>Change Avatar</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...fieldProps}
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => handleImageChange(e, onChange)}
                                                className="cursor-pointer"
                                            />
                                        </FormControl>
                                        <FormDescription>Choose a new profile picture (Max 5MB).</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* FULL NAME FIELD (Được giữ nguyên) */}
                            <FormField
                                control={form.control}
                                name="fullName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Full Name</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormDescription>This is your public full name.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* CÁC TRƯỜNG KHÁC (Email, Phone, Address, City) được giữ nguyên... */}
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormDescription>Only admin can see your email.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Phone</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormDescription>Only admin can see your phone number.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="address"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Address</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormDescription>This is the public address.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="city"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>City</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormDescription>This is the public city.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {/* <FormField cho Role sẽ phức tạp hơn nếu dùng enum/select, giữ nguyên các trường khác */}

                            <Button type="submit">Submit</Button>
                        </form>
                    </Form>
                </SheetDescription>
            </SheetHeader>
        </SheetContent>
    );
};

export default EditUser;