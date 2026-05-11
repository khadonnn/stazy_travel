"use client";

import { useEffect, useState, useCallback } from "react";
import AvatarCus from "@/shared/AvartarCus";
import { Star, MessageCircle, X } from "lucide-react";
import { format } from "date-fns";
import { getReviews, getReviewCount } from "@/app/hotels/[slug]/actions/review";

const PAGE_SIZE = 10;

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

// Modal xem tất cả đánh giá
const AllReviewsModal = ({
  hotelId,
  totalCount,
  onClose,
}: {
  hotelId: number;
  totalCount: number;
  onClose: () => void;
}) => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadPage = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      try {
        const data = await getReviews(hotelId, pageNum * PAGE_SIZE, PAGE_SIZE);
        if (pageNum === 0) {
          setReviews(data);
        } else {
          setReviews((prev) => [...prev, ...data]);
        }
        setHasMore(data.length === PAGE_SIZE);
      } catch (error) {
        console.error("Error loading reviews:", error);
      } finally {
        setLoading(false);
      }
    },
    [hotelId],
  );

  // Lock body scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    loadPage(0);
  }, [loadPage]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadPage(nextPage);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm cursor-pointer"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col mx-4 shadow-2xl cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-700">
          <div>
            <h2 className="text-xl font-bold">Tất cả đánh giá</h2>
            <p className="text-sm text-neutral-500 mt-1">
              {totalCount} đánh giá từ khách hàng
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Reviews list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {reviews.map((item: any) => (
            <CommentListing key={item.id} data={item} />
          ))}

          {loading && (
            <div className="text-center py-4 text-neutral-500 italic">
              Đang tải...
            </div>
          )}

          {hasMore && !loading && (
            <button
              onClick={handleLoadMore}
              className="w-full py-3 mt-2 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              Xem thêm đánh giá
            </button>
          )}

          {!hasMore && reviews.length > 0 && (
            <p className="text-center text-sm text-neutral-400 py-3">
              Đã hiển thị tất cả {totalCount} đánh giá
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// ✅ CLIENT COMPONENT chính
export default function CommentListClient({
  hotelId,
  refreshKey,
  onCountLoaded,
}: {
  hotelId: number;
  refreshKey?: number;
  onCountLoaded?: (count: number) => void;
}) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    async function loadInitial() {
      setLoading(true);
      try {
        const [data, count] = await Promise.all([
          getReviews(hotelId, 0, PAGE_SIZE),
          getReviewCount(hotelId),
        ]);
        setReviews(data);
        setTotalCount(count);
        setHasMore(count > PAGE_SIZE);
        if (onCountLoaded) onCountLoaded(count);
      } catch (error) {
        console.error("Error loading reviews:", error);
      } finally {
        setLoading(false);
      }
    }

    if (hotelId) {
      loadInitial();
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
    <>
      <div className="space-y-6">
        {reviews.map((item: any) => (
          <CommentListing key={item.id} data={item} />
        ))}

        {/* Nút xem thêm */}
        {hasMore && (
          <div className="mb-2">
            <button
              onClick={() => setShowModal(true)}
              className="cursor-pointer flex items-center gap-2 mx-auto px-6 py-3 text-sm font-medium text-primary-600 border border-primary-200 hover:bg-gray-100 rounded-full transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Xem tất cả {totalCount} đánh giá
            </button>
          </div>
        )}
      </div>

      {/* Modal xem tất cả */}
      {showModal && (
        <AllReviewsModal
          hotelId={hotelId}
          totalCount={totalCount}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
