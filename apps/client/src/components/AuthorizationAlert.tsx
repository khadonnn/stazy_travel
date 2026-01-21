"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertCircle, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const ERROR_MESSAGES = {
  require_author: {
    title: "Yêu cầu quyền Author",
    description:
      "Bạn cần là Author để truy cập tính năng này. Vui lòng gửi yêu cầu trở thành Author.",
    action: "Gửi yêu cầu Author",
    actionLink: "/profile#become-author",
  },
  unauthorized: {
    title: "Không có quyền truy cập",
    description: "Bạn không có quyền truy cập trang này.",
    action: "Về trang chủ",
    actionLink: "/",
  },
  require_login: {
    title: "Yêu cầu đăng nhập",
    description: "Vui lòng đăng nhập để tiếp tục.",
    action: "Đăng nhập",
    actionLink: "/sign-in",
  },
} as const;

/**
 * Component hiển thị thông báo lỗi authorization
 *
 * Usage:
 * - Thêm vào layout hoặc page
 * - Sẽ tự động hiện khi URL có ?error=require_author hoặc ?error=unauthorized
 */
export function AuthorizationAlert() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [errorType, setErrorType] = useState<
    keyof typeof ERROR_MESSAGES | null
  >(null);

  useEffect(() => {
    if (!searchParams) return;

    const error = searchParams.get("error") as keyof typeof ERROR_MESSAGES;

    if (error && ERROR_MESSAGES[error]) {
      setErrorType(error);
      setVisible(true);

      // Auto dismiss sau 10 giây
      const timer = setTimeout(() => {
        handleDismiss();
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const handleDismiss = () => {
    setVisible(false);

    if (!searchParams) return;

    // Remove error param từ URL
    const params = new URLSearchParams(searchParams);
    params.delete("error");

    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;

    router.replace(newUrl);
  };

  if (!visible || !errorType) return null;

  const error = ERROR_MESSAGES[errorType];

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
      <Alert variant="destructive" className="shadow-lg">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>{error.title}</AlertTitle>
        <AlertDescription className="mt-2">
          {error.description}
        </AlertDescription>
        <div className="mt-4 flex gap-2">
          <Button asChild size="sm">
            <Link href={error.actionLink}>{error.action}</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={handleDismiss}>
            Đóng
          </Button>
        </div>
      </Alert>
    </div>
  );
}
