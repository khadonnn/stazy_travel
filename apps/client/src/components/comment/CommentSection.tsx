// Server Component Wrapper cho phần Comments
import CommentList from "@/components/Comments";
import AddCommentForm from "@/components/comment/AddCommentForm";
import { auth } from "@clerk/nextjs/server";

interface CommentSectionProps {
  hotelId: number;
  hotelSlug: string;
}

export default async function CommentSection({
  hotelId,
  hotelSlug,
}: CommentSectionProps) {
  const { userId } = await auth();

  return (
    <div className="space-y-8">
      {/* Danh sách comment hiện có */}
      <CommentList hotelId={hotelId} />

      {/* Form thêm comment mới */}
      {userId ? (
        <AddCommentForm
          hotelId={hotelId}
          userId={userId}
          hotelSlug={hotelSlug}
        />
      ) : (
        <div className="text-center py-8 border rounded-lg bg-gray-50">
          <p className="text-neutral-500">
            Vui lòng đăng nhập để viết đánh giá
          </p>
        </div>
      )}
    </div>
  );
}
