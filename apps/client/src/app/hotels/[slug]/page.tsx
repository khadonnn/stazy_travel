// File: apps/client/app/hotels/[slug]/page.tsx
import StayDetailPageClient from "@/pages/StayDetailPage";
import { notFound } from "next/navigation";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // 1. Lấy slug từ params (Next.js 15+ yêu cầu await params)
  const { slug } = await params;

  // 2. Kiểm tra nếu không có slug
  if (!slug) {
    return notFound();
  }

  // 3. Truyền slug xuống Component Client mà tôi đã viết cho bạn ở câu trước
  return <StayDetailPageClient params={{ slug }} />;
}
