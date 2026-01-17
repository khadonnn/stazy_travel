'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner'; // Import Sonner để thông báo đẹp hơn
import { ProductType } from '@repo/types';

// UI Components (Shadcn)
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

// Icons
import { ChevronLeft, Upload, X, MapPin, BedDouble, Bath, Users, Save, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

// --- CẤU HÌNH CLOUDINARY ---
const CLOUD_NAME = 'dtj7wfwzu';
const UPLOAD_PRESET = 'stazy_preset';

// --- 1. Zod Schema ---
const formSchema = z.object({
    title: z.string().min(5, 'Tên khách sạn phải có ít nhất 5 ký tự'),
    slug: z.string().min(5),
    description: z.string().min(10),
    price: z.coerce.number().min(0),
    saleOff: z.coerce.number().min(0).max(100).optional(),
    categoryId: z.coerce.number(),
    isAds: z.boolean().default(false).optional(),
    address: z.string().min(5),
    maxGuests: z.coerce.number().min(1),
    bedrooms: z.coerce.number().min(0),
    bathrooms: z.coerce.number().min(0),
    featuredImage: z.string().min(1, 'Vui lòng upload ảnh đại diện'),
});

interface EditProductFormProps {
    initialData: ProductType;
}

export default function EditProductForm({ initialData }: EditProductFormProps) {
    const router = useRouter();
    const { getToken } = useAuth();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false); // State upload ảnh

    // --- 2. Setup Form ---
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: initialData.title || '',
            slug: initialData.slug || '',
            description: initialData.description || '',
            price: initialData.price || 0,
            saleOff: initialData.saleOffPercent || 0, // Lưu ý: Backend trả về saleOffPercent (int)
            categoryId: initialData.categoryId,
            isAds: initialData.isAds || false,
            address: initialData.address || '',
            maxGuests: initialData.maxGuests || 1,
            bedrooms: initialData.bedrooms || 1,
            bathrooms: initialData.bathrooms || 1,
            featuredImage: initialData.featuredImage || '',
        },
    });

    // --- 3. Logic Upload Ảnh Cloudinary ---
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
                // Cập nhật giá trị vào form để Zod validate
                form.setValue('featuredImage', data.secure_url);
                toast.success('Upload ảnh thành công');
            } else {
                console.error('Cloudinary Error:', data);
                toast.error('Lỗi upload ảnh (kiểm tra Preset)');
            }
        } catch (error) {
            console.error(error);
            toast.error('Lỗi kết nối Cloudinary');
        } finally {
            setUploading(false);
        }
    };

    const removeImage = () => {
        form.setValue('featuredImage', '');
    };

    // --- 4. Handle Submit ---
    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            setLoading(true);
            const token = await getToken();

            // Chuẩn bị payload khớp với Backend
            const payload = {
                ...values,
                price: Math.round(values.price), // Làm tròn tiền tệ
                // Backend mong đợi string "10%" cho saleOff nhưng cũng tự parse int
                // Tốt nhất gửi theo format backend đã xử lý ở updateHotel
                saleOff: values.saleOff ? `${values.saleOff}%` : '0%',
            };

            console.log('Updating hotel:', initialData.id, payload);

            const res = await fetch(`${process.env.NEXT_PUBLIC_PRODUCT_SERVICE_URL}/hotels/${initialData.id}`, {
                method: 'PUT', // Dùng PUT cho khớp với route backend
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`, // Gửi token xác thực
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Update failed');
            }

            toast.success('Cập nhật thành công!');
            router.refresh();
            router.push('/products');
        } catch (error: any) {
            console.error(error);
            toast.error(`Lỗi: ${error.message}`);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pb-10">
                {/* --- HEADER --- */}
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <div className="text-muted-foreground mb-2 flex items-center gap-2">
                            <Link
                                href="/products"
                                className="hover:text-foreground flex items-center gap-1 text-sm transition-colors"
                            >
                                <ChevronLeft className="h-4 w-4" /> Back to List
                            </Link>
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight">Edit Hotel</h2>
                        <p className="text-muted-foreground">Chỉnh sửa thông tin chi tiết và cài đặt cho khách sạn.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" type="button" onClick={() => router.back()} disabled={loading}>
                            Huỷ bỏ
                        </Button>
                        <Button type="submit" disabled={loading || uploading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Lưu thay đổi
                        </Button>
                    </div>
                </div>

                <Separator />

                {/* --- MAIN GRID --- */}
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                    {/* === LEFT COLUMN (Content chính) === */}
                    <div className="space-y-8 lg:col-span-2">
                        {/* Card 1: Thông tin cơ bản */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Thông tin chung</CardTitle>
                                <CardDescription>Tên, mô tả và địa chỉ.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tên khách sạn</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="slug"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Slug (URL)</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Mô tả chi tiết</FormLabel>
                                            <FormControl>
                                                <Textarea className="min-h-[150px]" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>

                        {/* Card 2: Hình ảnh - ĐÃ CẬP NHẬT LOGIC UPLOAD */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Hình ảnh</CardTitle>
                                <CardDescription>Ảnh đại diện (Main Image).</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <FormField
                                    control={form.control}
                                    name="featuredImage"
                                    render={({ field }) => (
                                        <FormItem>
                                            {/* Nếu chưa có ảnh -> Hiện nút Upload */}
                                            {!field.value ? (
                                                <div className="hover:bg-accent/50 relative flex h-48 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center transition-colors">
                                                    {uploading ? (
                                                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                                                    ) : (
                                                        <>
                                                            <Upload className="text-muted-foreground mb-2 h-8 w-8" />
                                                            <span className="text-muted-foreground text-sm">
                                                                Click để thay đổi ảnh
                                                            </span>
                                                            {/* Input ẩn phủ kín div cha */}
                                                            <Input
                                                                type="file"
                                                                accept="image/*"
                                                                className="absolute inset-0 z-50 h-full w-full cursor-pointer opacity-0"
                                                                onChange={handleImageUpload}
                                                                disabled={uploading}
                                                                value={undefined} // Uncontrolled
                                                            />
                                                        </>
                                                    )}
                                                </div>
                                            ) : (
                                                // Nếu có ảnh -> Hiện Preview + Nút xóa
                                                <div className="relative h-64 w-full overflow-hidden rounded-lg border bg-gray-100">
                                                    <Image
                                                        src={field.value}
                                                        alt="Featured Preview"
                                                        fill
                                                        className="object-cover"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="icon"
                                                        className="absolute top-2 right-2 z-10 h-8 w-8 shadow-md"
                                                        onClick={removeImage}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>

                        {/* Card 3: Vị trí */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Vị trí</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="address"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Địa chỉ</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <MapPin className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                                                    <Input className="pl-9" placeholder="Số nhà, đường..." {...field} />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                {/* Tọa độ (Read-only) */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <div className="text-muted-foreground text-xs">Latitude</div>
                                        <Input value={initialData.map?.lat || 0} disabled className="bg-muted" />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="text-muted-foreground text-xs">Longitude</div>
                                        <Input value={initialData.map?.lng || 0} disabled className="bg-muted" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* === RIGHT COLUMN (Cài đặt & Thông số) === */}
                    <div className="space-y-8">
                        {/* Card 4: Category & Ads */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Phân loại</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="categoryId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Loại hình</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="1">Hotel</SelectItem>
                                                    <SelectItem value="2">Homestay</SelectItem>
                                                    <SelectItem value="3">Villa</SelectItem>
                                                    <SelectItem value="4">Resort</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="isAds"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                            <div className="space-y-0.5">
                                                <FormLabel>Quảng cáo (Ads)</FormLabel>
                                                <FormDescription>Đẩy bài lên top.</FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>

                        {/* Card 5: Price */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Giá phòng</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="price"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Giá niêm yết (VND)</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="saleOff"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Giảm giá (%)</FormLabel>
                                            <FormControl>
                                                <Input type="number" max="100" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>

                        {/* Card 6: Capacity */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Sức chứa</CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-4">
                                <FormField
                                    control={form.control}
                                    name="maxGuests"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center justify-between">
                                            <FormLabel className="flex gap-2">
                                                <Users className="h-4 w-4" /> Khách
                                            </FormLabel>
                                            <FormControl>
                                                <Input type="number" className="w-20 text-right" {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="bedrooms"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center justify-between">
                                            <FormLabel className="flex gap-2">
                                                <BedDouble className="h-4 w-4" /> Ngủ
                                            </FormLabel>
                                            <FormControl>
                                                <Input type="number" className="w-20 text-right" {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="bathrooms"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center justify-between">
                                            <FormLabel className="flex gap-2">
                                                <Bath className="h-4 w-4" /> Tắm
                                            </FormLabel>
                                            <FormControl>
                                                <Input type="number" className="w-20 text-right" {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </form>
        </Form>
    );
}
