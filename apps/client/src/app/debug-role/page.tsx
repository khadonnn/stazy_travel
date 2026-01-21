"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SyncRoleButton } from "@/components/SyncRoleButton";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function RoleDebugPage() {
  const { user, isLoaded } = useUser();
  const [dbRole, setDbRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDbRole = async () => {
      try {
        setError(null);
        const response = await fetch("/api/debug/my-role");

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        setDbRole(data.role);
      } catch (error: any) {
        console.error("Error fetching DB role:", error);
        setError(error.message || "Không thể lấy thông tin role");
      } finally {
        setLoading(false);
      }
    };

    if (isLoaded) {
      if (user) {
        fetchDbRole();
      } else {
        setLoading(false);
      }
    }
  }, [isLoaded, user]);

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Chưa đăng nhập</AlertTitle>
          <AlertDescription>
            Vui lòng đăng nhập để xem thông tin role
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Lỗi</AlertTitle>
          <AlertDescription>
            {error}
            <p className="mt-2 text-sm">
              Có thể user chưa tồn tại trong database. Vui lòng đăng nhập lại
              hoặc liên hệ admin.
            </p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const clerkRole = user.publicMetadata?.role as string | undefined;
  const isRoleMatch = clerkRole === dbRole;

  console.log("Debug Info:", {
    isLoaded,
    hasUser: !!user,
    clerkRole,
    dbRole,
    isRoleMatch,
    loading,
    error,
  });

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Debug Role Information</h1>

      <div className="space-y-6">
        {/* Role Status */}
        <Card>
          <CardHeader>
            <CardTitle>Trạng thái Role</CardTitle>
            <CardDescription>
              Kiểm tra xem role có đồng bộ giữa Clerk và Database không
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Trạng thái đồng bộ:</span>
              {isRoleMatch ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Đã đồng bộ
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Chưa đồng bộ
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="font-medium">Role trên Clerk:</span>
              <Badge variant="outline">{clerkRole || "Chưa có"}</Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-medium">Role trong Database:</span>
              <Badge variant="outline">{dbRole || "Chưa có"}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* User Info */}
        <Card>
          <CardHeader>
            <CardTitle>Thông tin User</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">User ID:</span>
              <code className="text-sm bg-muted px-2 py-1 rounded">
                {user.id}
              </code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium">
                {user.primaryEmailAddress?.emailAddress}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tên:</span>
              <span className="font-medium">{user.fullName}</span>
            </div>
          </CardContent>
        </Card>

        {/* Sync Action */}
        {!isRoleMatch && (
          <Card>
            <CardHeader>
              <CardTitle>Đồng bộ Role</CardTitle>
              <CardDescription>
                Role của bạn chưa đồng bộ. Nhấn nút bên dưới để đồng bộ role từ
                Database lên Clerk.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SyncRoleButton />
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Hướng dẫn</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>Nếu role chưa đồng bộ:</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Nhấn nút "Đồng bộ quyền truy cập" ở trên</li>
              <li>Đợi trang tự động reload</li>
              <li>Kiểm tra lại menu để thấy các tính năng mới</li>
            </ol>
            <p className="mt-4">
              <strong>Nếu vẫn không được:</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Logout và login lại</li>
              <li>Xóa cache trình duyệt (Ctrl+Shift+Delete)</li>
              <li>Liên hệ admin nếu vấn đề vẫn tiếp diễn</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
