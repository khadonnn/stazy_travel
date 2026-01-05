'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus, Upload } from 'lucide-react';

// UI Components
import { SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

// 1. Định nghĩa Schema khớp với EditProductForm (nhưng không cần id)
const formSchema = z.object({
    title: z.string().min(5, { message: 'Tên khách sạn phải có ít nhất 5 ký tự' }),
    slug: z.string().min(5, { message: 'Slug là bắt buộc' }),
    description: z.string().min(10, { message: 'Mô tả quá ngắn' }),
    price: z.coerce.number().min(0, { message: 'Giá không hợp lệ' }),
    saleOff: z.coerce.number().min(0).max(100).optional(),

    // Category là số ID
    categoryId: z.coerce.number().min(1, { message: 'Vui lòng chọn danh mục' }),

    isAds: z.boolean().default(false).optional(),
    address: z.string().min(5, { message: 'Địa chỉ là bắt buộc' }),

    // Thông số phòng
    maxGuests: z.coerce.number().min(1),
    bedrooms: z.coerce.number().min(0),
    bathrooms: z.coerce.number().min(0),

    // Ảnh (Trong form Add thường chỉ xử lý cơ bản hoặc upload sau)
    // Ở đây ta validate string (url) hoặc file object tuỳ logic upload của bạn
    // Tạm thời để string cho đơn giản
    featuredImage: z.string().optional(),
});

const AddProduct = () => {
    const [loading, setLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: '',
            slug: '',
            description: '',
            price: 0,
            saleOff: 0,
            categoryId: 0, // Mặc định chưa chọn
            isAds: false,
            address: '',
            maxGuests: 2,
            bedrooms: 1,
            bathrooms: 1,
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            setLoading(true);
            console.log('Creating new hotel:', values);

            // Gọi API POST /hotels tại đây
            // await fetch(...)

            // Reset form sau khi thành công
            form.reset();
            // Đóng Sheet (nếu bạn có prop setOpen)
        } catch (error) {
            console.error(error);
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

            <ScrollArea className="mx-2 h-[calc(100vh-120px)]">
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
                                        <FormLabel>Tên khách sạn</FormLabel>
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
                                                placeholder="Mô tả chi tiết về tiện ích..."
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
                                                Đẩy bài viết này lên top hiển thị.
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

                        {/* --- NHÓM 4: ẢNH (Placeholder) --- */}
                        <div className="space-y-4">
                            <h3 className="text-muted-foreground text-sm font-medium">Hình ảnh</h3>
                            <div className="hover:bg-accent/50 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
                                <Upload className="text-muted-foreground mb-2 h-8 w-8" />
                                <span className="text-muted-foreground text-sm">Chọn ảnh để tải lên</span>
                                <Input type="file" className="hidden" />
                            </div>
                        </div>

                        {/* --- FOOTER BUTTON --- */}
                        <div className="bg-background sticky bottom-0 pt-4 pb-2">
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {loading ? 'Đang tạo...' : 'Tạo mới'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </ScrollArea>
        </SheetContent>
    );
};

export default AddProduct;
