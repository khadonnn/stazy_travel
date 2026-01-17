'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Upload, X, Plus } from 'lucide-react';
import Image from 'next/image';
import { useAuth, useUser } from '@clerk/nextjs';

// UI Components
import { SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

// CẤU HÌNH CLOUDINARY (Thay bằng thông tin thật của bạn)
const CLOUD_NAME = 'dtj7wfwzu';
const UPLOAD_PRESET = 'stazy_upload'; // Đảm bảo đã tạo Unsigned Preset này trên Cloudinary

// 1. Schema Validate
const formSchema = z.object({
    title: z.string().min(5, { message: 'Tên khách sạn phải có ít nhất 5 ký tự' }),
    slug: z.string().min(5, { message: 'Slug là bắt buộc' }),
    description: z.string().min(10, { message: 'Mô tả quá ngắn' }),
    price: z.coerce.number().min(0, { message: 'Giá không hợp lệ' }),
    saleOff: z.coerce.number().min(0).max(100).optional(),
    categoryId: z.coerce.number().min(1, { message: 'Vui lòng chọn danh mục' }),
    isAds: z.boolean().default(false).optional(),
    address: z.string().min(5, { message: 'Địa chỉ là bắt buộc' }),
    maxGuests: z.coerce.number().min(1),
    bedrooms: z.coerce.number().min(0),
    bathrooms: z.coerce.number().min(0),
    featuredImage: z.string().min(1, { message: 'Vui lòng upload ảnh đại diện' }),
});

const AddProduct = () => {
    const { userId, getToken } = useAuth();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: '',
            slug: '',
            description: '',
            price: 0,
            saleOff: 0,
            categoryId: 0,
            isAds: false,
            address: '',
            maxGuests: 2,
            bedrooms: 1,
            bathrooms: 1,
            featuredImage: '',
        },
    });

    // Xử lý Upload ảnh
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
                form.setValue('featuredImage', data.secure_url);
                setPreviewUrl(data.secure_url);
            } else {
                console.error('Lỗi upload:', data);
                alert('Lỗi upload ảnh, vui lòng kiểm tra Preset Cloudinary');
            }
        } catch (error) {
            console.error('Lỗi kết nối Cloudinary:', error);
        } finally {
            setUploading(false);
        }
    };

    const removeImage = () => {
        form.setValue('featuredImage', '');
        setPreviewUrl(null);
    };

    // Xử lý Submit Form
    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (!userId) {
            toast.error('Bạn cần đăng nhập để thực hiện chức năng này.');
            return;
        }

        try {
            setLoading(true);
            const token = await getToken();

            const payload = {
                ...values,
                price: Math.round(values.price),
                authorId: userId,
                saleOff: values.saleOff ? `${values.saleOff}%` : '0%',
                map: { lat: 10.762622, lng: 106.660172 }, // Fake map
                reviewCount: 0,
                viewCount: 0,
                reviewStar: 5,
                commentCount: 0,
                like: false,
            };

            // Gọi API Backend (Port 8000)
            const res = await fetch('http://localhost:8000/hotels', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Lỗi tạo khách sạn');
            }

            toast.success('🎉 Tạo khách sạn thành công!');
            form.reset();
            setPreviewUrl(null);
        } catch (error: any) {
            console.error(error);
            toast.error(`Lỗi: ${error.message}`);
        } finally {
            setLoading(false);
        }
    }

    return (
        <SheetContent className="w-full sm:max-w-[600px]">
            <SheetHeader>
                <SheetTitle className="text-lg">Thêm khách sạn mới</SheetTitle>
                <SheetDescription>Điền thông tin chi tiết để tạo mới một địa điểm lưu trú.</SheetDescription>
            </SheetHeader>

            <ScrollArea className="mt-4 h-[calc(100vh-120px)] pr-4">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-6">
                        {/* --- NHÓM 1: THÔNG TIN CƠ BẢN --- */}
                        <div className="space-y-4">
                            <h3 className="text-muted-foreground text-sm font-medium">Thông tin chung</h3>
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Tên khách sạn <span className="text-red-500">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input placeholder="VD: Luxury Villa Da Lat..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="slug"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Slug (URL)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="luxury-villa-da-lat" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="categoryId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Loại hình</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Chọn loại" />
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
                            </div>

                            <FormField
                                control={form.control}
                                name="address"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Địa chỉ</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Số nhà, đường, tỉnh thành..." {...field} />
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
                                        <FormLabel>Mô tả</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Mô tả chi tiết..."
                                                className="resize-none"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <Separator />

                        {/* --- NHÓM 2: GIÁ & CÀI ĐẶT --- */}
                        <div className="space-y-4">
                            <h3 className="text-muted-foreground text-sm font-medium">Cài đặt & Giá</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="price"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Giá (VND)</FormLabel>
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
                            </div>

                            <FormField
                                control={form.control}
                                name="isAds"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-sm font-medium">Quảng cáo (Ads)</FormLabel>
                                            <FormDescription className="text-xs">
                                                Đẩy bài viết này lên top.
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <Separator />

                        {/* --- NHÓM 3: SỨC CHỨA --- */}
                        <div className="space-y-4">
                            <h3 className="text-muted-foreground text-sm font-medium">Sức chứa</h3>
                            <div className="grid grid-cols-3 gap-3">
                                <FormField
                                    control={form.control}
                                    name="maxGuests"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs">Khách tối đa</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="bedrooms"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs">Phòng ngủ</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="bathrooms"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs">Phòng tắm</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <Separator />

                        {/* --- NHÓM 4: ẢNH --- */}
                        <div className="space-y-4">
                            <h3 className="text-muted-foreground text-sm font-medium">Hình ảnh</h3>
                            <FormField
                                control={form.control}
                                name="featuredImage"
                                render={({ field }) => (
                                    <FormItem>
                                        {!previewUrl ? (
                                            // Thêm class 'relative' vào thẻ cha để input absolute định vị theo nó
                                            <div className="hover:bg-accent/50 relative flex h-48 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center transition-colors">
                                                {uploading ? (
                                                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                                                ) : (
                                                    <>
                                                        <Upload className="text-muted-foreground mb-2 h-8 w-8" />
                                                        <span className="text-muted-foreground text-sm">
                                                            Click để tải ảnh lên Cloudinary
                                                        </span>
                                                        {/* SỬA LỖI TẠI ĐÂY: 
                                    1. Thêm 'h-full w-full' để đè lên class h-10 mặc định của Shadcn 
                                    2. Thêm 'z-50' để đảm bảo nó nằm trên cùng
                                */}
                                                        <Input
                                                            type="file"
                                                            accept="image/*"
                                                            className="absolute inset-0 z-50 h-full w-full cursor-pointer opacity-0"
                                                            onChange={handleImageUpload}
                                                            disabled={uploading}
                                                            // Loại bỏ các props không cần thiết cho file input để tránh lỗi value
                                                            value={undefined}
                                                            // Refs từ react-hook-form cần được xử lý cẩn thận với file input
                                                            // Chúng ta dùng onChange riêng, nên không truyền {...field} vào đây trực tiếp
                                                            // nếu không muốn quản lý value file qua react-hook-form state
                                                        />
                                                    </>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="relative h-48 w-full overflow-hidden rounded-lg border">
                                                <Image src={previewUrl} alt="Preview" fill className="object-cover" />
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="icon"
                                                    className="absolute top-2 right-2 z-10 h-6 w-6"
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
                        </div>

                        {/* --- NÚT SUBMIT --- */}
                        <Button type="submit" className="w-full" disabled={loading || uploading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? 'Đang tạo...' : 'Tạo mới'}
                        </Button>
                    </form>
                </Form>
            </ScrollArea>
        </SheetContent>
    );
};

export default AddProduct;
