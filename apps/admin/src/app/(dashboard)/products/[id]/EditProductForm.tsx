'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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

// --- 1. Zod Schema ---
const formSchema = z.object({
    title: z.string().min(5, 'Tên khách sạn phải có ít nhất 5 ký tự'),
    slug: z.string().min(5),
    description: z.string().min(10),
    price: z.coerce.number().min(0),
    saleOff: z.coerce.number().min(0).max(100).optional(),
    categoryId: z.coerce.number(),
    // Fix lỗi Type: Cho phép optional, mặc định false
    isAds: z.boolean().default(false).optional(),
    address: z.string().min(5),
    maxGuests: z.coerce.number().min(1),
    bedrooms: z.coerce.number().min(0),
    bathrooms: z.coerce.number().min(0),
});

interface EditProductFormProps {
    initialData: ProductType;
}

export default function EditProductForm({ initialData }: EditProductFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // --- 2. Setup Form ---
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: initialData.title || '',
            slug: initialData.slug || '',
            description: initialData.description || '',
            price: initialData.price || 0,
            saleOff: initialData.saleOffPercent || 0,
            categoryId: initialData.categoryId,
            isAds: initialData.isAds || false,
            address: initialData.address || '',
            maxGuests: initialData.maxGuests || 1,
            bedrooms: initialData.bedrooms || 1,
            bathrooms: initialData.bathrooms || 1,
        },
    });

    // --- 3. Handle Submit ---
    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            setLoading(true);
            console.log('Updating hotel:', initialData.id, values);

            // Gọi API Update (Bạn tự implement API route này)
            const res = await fetch(`${process.env.NEXT_PUBLIC_PRODUCT_SERVICE_URL}/hotels/${initialData.id}`, {
                method: 'PATCH', // hoặc PUT
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            if (!res.ok) throw new Error('Update failed');

            router.refresh(); // Refresh Server Component để lấy data mới
            router.push('/products'); // Quay về danh sách
        } catch (error) {
            console.error(error);
            // Có thể thêm Toast error tại đây
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
                        <Button type="submit" disabled={loading}>
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
                                                <Input placeholder="Nhập tên khách sạn..." {...field} />
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
                                                <Input placeholder="ten-khach-san-chuan-seo" {...field} />
                                            </FormControl>
                                            <FormDescription>Đường dẫn thân thiện cho SEO.</FormDescription>
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
                                                <Textarea
                                                    placeholder="Mô tả về tiện ích, không gian..."
                                                    className="min-h-[150px]"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>

                        {/* Card 2: Hình ảnh */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Hình ảnh</CardTitle>
                                <CardDescription>Ảnh đại diện và thư viện ảnh.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="border-muted-foreground/25 hover:bg-accent/50 mb-6 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed py-10 text-center transition">
                                    <div className="bg-background mb-3 rounded-full p-4 shadow-sm">
                                        <Upload className="text-muted-foreground h-6 w-6" />
                                    </div>
                                    <div className="text-sm font-medium">Click để tải ảnh lên</div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                                    {/* Ảnh Featured */}
                                    <div className="group relative aspect-square overflow-hidden rounded-md border">
                                        <Image
                                            src={initialData.featuredImage || '/placeholder.jpg'}
                                            alt="Featured"
                                            fill
                                            className="object-cover"
                                        />
                                        <div className="absolute top-1 right-1 opacity-0 transition-opacity group-hover:opacity-100">
                                            <Button size="icon" variant="destructive" className="h-6 w-6 rounded-full">
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                                            MAIN
                                        </span>
                                    </div>

                                    {/* Gallery List */}
                                    {initialData.galleryImgs?.slice(0, 3).map((img, idx) => (
                                        <div
                                            key={idx}
                                            className="group relative aspect-square overflow-hidden rounded-md border"
                                        >
                                            <Image src={img} alt="Gallery" fill className="object-cover" />
                                            <div className="absolute top-1 right-1 opacity-0 transition-opacity group-hover:opacity-100">
                                                <Button
                                                    size="icon"
                                                    variant="destructive"
                                                    className="h-6 w-6 rounded-full"
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
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
                                                    <Input
                                                        className="pl-9"
                                                        placeholder="Số nhà, đường, thành phố..."
                                                        {...field}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <FormLabel className="text-muted-foreground text-xs">Latitude</FormLabel>
                                        <Input value={initialData.map?.lat} disabled className="bg-muted" />
                                    </div>
                                    <div className="space-y-2">
                                        <FormLabel className="text-muted-foreground text-xs">Longitude</FormLabel>
                                        <Input value={initialData.map?.lng} disabled className="bg-muted" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* === RIGHT COLUMN (Cài đặt & Thông số) === */}
                    <div className="space-y-8">
                        {/* Card 4: Trạng thái & Phân loại */}
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
                                                        <SelectValue placeholder="Chọn loại hình" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="1">Hotel</SelectItem>
                                                    <SelectItem value="2">Homestay</SelectItem>
                                                    <SelectItem value="3">Villa</SelectItem>
                                                    <SelectItem value="4">Resort</SelectItem>
                                                    <SelectItem value="5">Apartment</SelectItem>
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
                                                <FormLabel className="font-semibold">Quảng cáo (Ads)</FormLabel>
                                                <FormDescription className="text-xs">
                                                    Đẩy bài viết này lên top hiển thị.
                                                </FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>

                        {/* Card 5: Giá cả */}
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

                        {/* Card 6: Sức chứa */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Sức chứa</CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-4">
                                <FormField
                                    control={form.control}
                                    name="maxGuests"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="flex items-center justify-between">
                                                <FormLabel className="flex items-center gap-2 font-normal">
                                                    <Users className="text-muted-foreground h-4 w-4" /> Khách tối đa
                                                </FormLabel>
                                                <FormControl>
                                                    <Input type="number" className="w-20 text-right" {...field} />
                                                </FormControl>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                                <Separator />
                                <FormField
                                    control={form.control}
                                    name="bedrooms"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="flex items-center justify-between">
                                                <FormLabel className="flex items-center gap-2 font-normal">
                                                    <BedDouble className="text-muted-foreground h-4 w-4" /> Phòng ngủ
                                                </FormLabel>
                                                <FormControl>
                                                    <Input type="number" className="w-20 text-right" {...field} />
                                                </FormControl>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                                <Separator />
                                <FormField
                                    control={form.control}
                                    name="bathrooms"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="flex items-center justify-between">
                                                <FormLabel className="flex items-center gap-2 font-normal">
                                                    <Bath className="text-muted-foreground h-4 w-4" /> Phòng tắm
                                                </FormLabel>
                                                <FormControl>
                                                    <Input type="number" className="w-20 text-right" {...field} />
                                                </FormControl>
                                            </div>
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
