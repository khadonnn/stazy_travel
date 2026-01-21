"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { syncMyRole } from "@/actions/syncRole";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * Component để user tự đồng bộ role khi thấy không khớp
 * Dùng trong profile page hoặc khi user bị chặn vì role
 */
export function SyncRoleButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    role?: string;
  } | null>(null);

  const handleSync = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await syncMyRole();
      setResult(response);

      if (response.success) {
        // Reload page sau 2 giây để Clerk cập nhật metadata
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (error) {
      setResult({
        success: false,
        message: "Có lỗi xảy ra khi đồng bộ role",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={handleSync}
        disabled={loading}
        variant="outline"
        size="sm"
      >
        <RefreshCw
          className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
        />
        {loading ? "Đang đồng bộ..." : "Đồng bộ quyền truy cập"}
      </Button>

      {result && (
        <Alert variant={result.success ? "default" : "destructive"}>
          {result.success ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertTitle>{result.success ? "Thành công!" : "Lỗi"}</AlertTitle>
          <AlertDescription>
            {result.message}
            {result.success && (
              <p className="mt-2 text-sm">
                Trang sẽ tự động tải lại trong 2 giây...
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
