"use client"; // ✅ BẮT BUỘC CÓ

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { submitReview } from "@/app/hotels/[slug]/actions/review";
import { toast } from "sonner";

export default function AddCommentForm({
  hotelId,
  userId,
  hotelSlug,
  onSuccess,
}: {
  hotelId: number;
  userId: string;
  hotelSlug?: string;
  onSuccess?: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    // Validation đơn giản
    const comment = formData.get("comment");
    if (!comment || !comment.toString().trim()) {
      toast.error("Vui lòng nhập nội dung đánh giá");
      return;
    }

    setLoading(true);

    // Append dữ liệu ẩn
    formData.append("hotelId", hotelId.toString());
    formData.append("userId", userId);
    formData.append("rating", rating.toString());
    if (hotelSlug) {
      formData.append("hotelSlug", hotelSlug);
    }

    try {
      const res = await submitReview(formData);

      if (res.success) {
        // 1. Reset Form
        formRef.current?.reset();
        setRating(5);

        // 2. Làm mới Server Component (CommentList) để hiện comment mới
        router.refresh();

        // 3. Callback để component cha reload
        if (onSuccess) {
          onSuccess();
        }

        toast.success("Đánh giá của bạn đã được gửi!");
      } else {
        toast.error("Lỗi: " + res.error);
      }
    } catch (error) {
      console.error(error);
      toast.error("Lỗi khi gửi đánh giá");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="space-y-4 border p-4 rounded-lg bg-gray-50 mt-8"
    >
      <h3 className="font-semibold text-lg">Viết đánh giá của bạn</h3>

      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`cursor-pointer w-6 h-6 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
            onClick={() => setRating(star)}
          />
        ))}
      </div>

      <Textarea
        name="comment"
        placeholder="Chia sẻ trải nghiệm..."
        className="bg-white min-h-[100px]"
      />

      <Button type="submit" disabled={loading}>
        {loading ? "Đang gửi..." : "Gửi đánh giá"}
      </Button>
    </form>
  );
}
