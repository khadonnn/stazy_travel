"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import CreateHotelForm from "@/components/CreateHotelForm";
import { useIsAuthor } from "@/hooks/useRole";

export default function CreateHotelPage() {
  const { user, isLoaded } = useUser();
  const isAuthor = useIsAuthor();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthorStatus = async () => {
      if (!isLoaded) return;

      if (!user) {
        router.push("/sign-in");
        return;
      }

      // Kiểm tra role từ Clerk metadata
      if (!isAuthor) {
        router.push("/profile?error=require_author");
        return;
      }

      setLoading(false);
    };

    checkAuthorStatus();
  }, [user, isLoaded, isAuthor, router]);

  if (loading || !isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthor) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Đăng khách sạn mới</h1>
          <p className="text-muted-foreground mt-2">
            Điền đầy đủ thông tin để tạo danh sách khách sạn của bạn. Sau khi
            gửi, admin sẽ xem xét và duyệt trong vòng 24h.
          </p>
        </div>

        <CreateHotelForm />
      </div>
    </div>
  );
}
