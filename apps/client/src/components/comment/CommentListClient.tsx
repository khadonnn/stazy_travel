"use client";

import { useEffect, useState } from "react";
import AvatarCus from "@/shared/AvartarCus";
import { Star } from "lucide-react";
import { format } from "date-fns";
import { getReviews } from "@/app/hotels/[slug]/actions/review";

// Component con hiển thị 1 dòng (Thuần UI)
const CommentListing = ({ data }: { data: any }) => {
  return (
    <div className="flex space-x-4 py-4 border-b border-neutral-200 dark:border-neutral-700">
      <div className="pt-0.5">
        <AvatarCus
          sizeClass="h-10 w-10 text-lg"
          radius="rounded-full"
          userName={data.user.name}
          imgUrl={data.user.avatar || ""}
        />
      </div>
      <div className="flex-grow">
        <div className="flex justify-between space-x-3">
          <div className="flex flex-col">
            <div className="text-sm font-semibold">
              <span>{data.user.name}</span>
            </div>
            <span className="text-sm text-neutral-500 mt-0.5">
              {format(new Date(data.createdAt), "dd MMM, yyyy")}
            </span>
          </div>
          <div className="flex text-yellow-500">
            {Array.from({ length: data.rating || 5 }).map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-current" />
            ))}
          </div>
        </div>
        <p className="block mt-3 text-neutral-6000 dark:text-neutral-300">
          {data.comment}
        </p>
      </div>
    </div>
  );
};

// ✅ CLIENT COMPONENT với useEffect để fetch data
export default function CommentListClient({
  hotelId,
  refreshKey,
}: {
  hotelId: number;
  refreshKey?: number;
}) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReviews() {
      setLoading(true);
      try {
        const data = await getReviews(hotelId);
        setReviews(data);
      } catch (error) {
        console.error("Error loading reviews:", error);
      } finally {
        setLoading(false);
      }
    }

    if (hotelId) {
      loadReviews();
    }
  }, [hotelId, refreshKey]);

  if (loading) {
    return (
      <div className="text-neutral-500 italic py-4">Đang tải bình luận...</div>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-neutral-500 italic py-4">Chưa có bình luận nào.</div>
    );
  }

  return (
    <div className="space-y-6">
      {reviews.map((item: any) => (
        <CommentListing key={item.id} data={item} />
      ))}
    </div>
  );
}
