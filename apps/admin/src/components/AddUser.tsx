'use client';

import { SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from './ui/button';
import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { ScrollArea } from './ui/scroll-area';

const CLOUD_NAME = 'dtj7wfwzu';
const UPLOAD_PRESET = 'stazy_upload';

const formSchema = z.object({
    fullName: z.string().min(2, { message: 'Full name must be at least 2 characters!' }).max(50),
    email: z.string().email({ message: 'Invalid email address!' }),
    password: z.string().min(6, { message: 'Password must be at least 6 characters!' }),
    phone: z.string().min(10).max(15),
    address: z.string().min(2),
    city: z.string().min(2),
    avatar: z.string().optional(),
});

const AddUser = () => {
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            fullName: '',
            email: '',
            password: '',
            phone: '',
            address: '',
            city: '',
            avatar: '',
        },
    });

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', UPLOAD_PRESET);

            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (data.secure_url) {
                form.setValue('avatar', data.secure_url);
                setPreviewUrl(data.secure_url);
                toast.success('✅ Avatar uploaded!');
            } else {
                console.error('Upload error:', data);
                toast.error('Failed to upload avatar');
            }
        } catch (error) {
            console.error('Cloudinary error:', error);
            toast.error('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const removeImage = () => {
        form.setValue('avatar', '');
        setPreviewUrl(null);
    };

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            setLoading(true);

            const payload = {
                name: values.fullName,
                email: values.email,
                phone: values.phone,
                address: values.address,
                password: values.password,
                avatar:
                    values.avatar ||
                    'https://res.cloudinary.com/dtj7wfwzu/image/upload/v1737883823/default-avatar_n5qg5i.png',
                role: 'USER',
            };

            const res = await fetch('http://localhost:8000/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Failed to create user');
            }

            toast.success('✅ User created successfully!');
            form.reset();

            // Reload the page to show new user
            window.location.reload();
        } catch (error: any) {
            console.error(error);
            toast.error(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    }
    return (
        <SheetContent className="max-w-[450px]">
            <SheetHeader>
                <SheetTitle className="text-lg">Add User</SheetTitle>
                <SheetDescription>Fill in the details to create a new user account.</SheetDescription>
            </SheetHeader>

            <ScrollArea className="mx-4 mt-4 h-[calc(100vh-120px)]">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-6">
                        <FormField
                            control={form.control}
                            name="fullName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Full Name</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormDescription>Enter user full name.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input type="email" {...field} />
                                    </FormControl>
                                    <FormDescription>Only admin can see your email.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl>
                                        <Input type="password" {...field} />
                                    </FormControl>
                                    <FormDescription>Minimum 6 characters</FormDescription>
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
                                    <FormDescription>Only admin can see your phone number (optional)</FormDescription>
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
                                    <FormDescription>Enter user address (optional)</FormDescription>
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
                                    <FormDescription>Enter user city (optional)</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="avatar"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Avatar (Optional)</FormLabel>
                                    {!previewUrl ? (
                                        <FormControl>
                                            <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-6 transition hover:border-gray-400">
                                                <Upload className="mb-2 h-8 w-8 text-gray-400" />
                                                <span className="text-sm text-gray-500">Click to upload avatar</span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleImageUpload}
                                                    disabled={uploading}
                                                    className="hidden"
                                                />
                                                {uploading && (
                                                    <Loader2 className="mt-2 h-5 w-5 animate-spin text-gray-400" />
                                                )}
                                            </label>
                                        </FormControl>
                                    ) : (
                                        <div className="relative">
                                            <Image
                                                src={previewUrl}
                                                alt="Avatar preview"
                                                width={150}
                                                height={150}
                                                className="rounded-full object-cover"
                                            />
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="icon"
                                                className="absolute -top-2 -right-2 h-8 w-8 rounded-full"
                                                onClick={removeImage}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                    <FormDescription>Upload user avatar or leave empty for default</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full" disabled={loading || uploading}>
                            {loading ? 'Creating...' : 'Create User'}
                        </Button>
                    </form>
                </Form>
            </ScrollArea>
        </SheetContent>
    );
};

export default AddUser;
