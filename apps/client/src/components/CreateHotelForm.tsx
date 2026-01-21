"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Upload, X } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

// UI Components
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Cloudinary Config
const CLOUD_NAME = "dtj7wfwzu";
const UPLOAD_PRESET = "stazy_upload";

// --- 1. SỬA LẠI SCHEMA (Dùng z.coerce) ---
const formSchema = z.object({
  title: z
    .string()
    .min(5, { message: "Tên khách sạn phải có ít nhất 5 ký tự" }),
  slug: z.string().min(5, { message: "Slug là bắt buộc" }),
  description: z.string().min(10, { message: "Mô tả quá ngắn" }),
  price: z.coerce.number().min(0, { message: "Giá không hợp lệ" }),
  saleOff: z.coerce.number().min(0).max(100),
  categoryId: z.coerce.number().min(1, { message: "Vui lòng chọn danh mục" }),
  address: z.string().min(5, { message: "Địa chỉ là bắt buộc" }),
  maxGuests: z.coerce.number().min(1),
  bedrooms: z.coerce.number().min(0),
  bathrooms: z.coerce.number().min(0),
  featuredImage: z.string().min(1, { message: "Vui lòng upload ảnh đại diện" }),
});

export default function CreateHotelForm() {
  const { userId, getToken } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // --- 2. KHỞI TẠO FORM ---
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      slug: "",
      description: "",
      price: 0,
      saleOff: 0,
      categoryId: 0,
      address: "",
      maxGuests: 2,
      bedrooms: 1,
      bathrooms: 1,
      featuredImage: "",
    },
  });

  // Auto-generate slug
  const handleTitleChange = (value: string) => {
    const slug = value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();

    form.setValue("slug", slug);
  };

  // Upload ảnh
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData },
      );

      const data = await res.json();

      if (data.secure_url) {
        form.setValue("featuredImage", data.secure_url);
        setPreviewUrl(data.secure_url);
        toast.success("Upload ảnh thành công!");
      } else {
        toast.error("Lỗi upload ảnh");
      }
    } catch (error) {
      console.error("Lỗi upload:", error);
      toast.error("Không thể upload ảnh");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    form.setValue("featuredImage", "");
    setPreviewUrl(null);
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!userId) {
      toast.error("Bạn cần đăng nhập");
      return;
    }

    try {
      setLoading(true);
      const token = await getToken();

      const payload = {
        ...values,
        // values.saleOff đã là number do z.coerce, không cần check null
        saleOff: `${values.saleOff}%`,
        authorId: userId,
        map: { lat: 10.762622, lng: 106.660172 },
        reviewCount: 0,
        viewCount: 0,
        reviewStar: 5,
        commentCount: 0,
        like: false,
        status: "PENDING",
      };

      const res = await fetch("http://localhost:8000/hotels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Lỗi tạo khách sạn");
      }

      toast.success("🎉 Gửi khách sạn thành công! Khách sạn của bạn đang chờ admin duyệt.");
      setTimeout(() => {
        router.push("/my-hotels");
      }, 2000);
    } catch (error: any) {
      console.error(error);
      toast.error(`Lỗi: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Thông tin khách sạn</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* ... Phần Title, Slug, Description, Address giữ nguyên ... */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Thông tin chung
              </h3>

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Tên khách sạn <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="VD: Khách sạn Biển Xanh"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          handleTitleChange(e.target.value);
                        }}
                      />
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
                      <FormLabel>Slug</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loại hình</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ? String(field.value) : ""}
                      >
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
                    <FormLabel>Mô tả</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={4} className="resize-none" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Giá & Khuyến mãi */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Giá cả
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Giá (VND)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="500000" {...field} />
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
                        <Input
                          type="number"
                          max="100"
                          placeholder="0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* --- 3. SỬA LỖI CÚ PHÁP JSX Ở ĐÂY --- */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Sức chứa
              </h3>
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

            {/* Hình ảnh */}
            <FormField
              control={form.control}
              name="featuredImage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hình ảnh đại diện</FormLabel>
                  {!previewUrl ? (
                    <div className="relative flex h-48 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center transition-colors hover:bg-accent/50">
                      {uploading ? (
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                      ) : (
                        <>
                          <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            Click để tải ảnh lên
                          </span>
                          <Input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 z-50 h-full w-full cursor-pointer opacity-0"
                            onChange={handleImageUpload}
                            disabled={uploading}
                          />
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="relative h-48 w-full overflow-hidden rounded-lg border">
                      <Image
                        src={previewUrl}
                        alt="Preview"
                        fill
                        className="object-cover"
                      />
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

            <Button
              type="submit"
              className="w-full"
              disabled={loading || uploading}
              size="lg"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Đang gửi..." : "Gửi để admin duyệt"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
