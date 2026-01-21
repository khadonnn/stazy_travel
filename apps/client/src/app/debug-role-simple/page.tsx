"use client";

import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SyncRoleButton } from "@/components/SyncRoleButton";
import { Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * Simplified debug page - chỉ dùng Clerk data
 */
export default function SimpleRoleDebugPage() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
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

  const clerkRole = user.publicMetadata?.role as string | undefined;

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Role Information (Simple)</h1>

      <div className="space-y-6">
        {/* User Info */}
        <Card>
          <CardHeader>
            <CardTitle>Thông tin User từ Clerk</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
            <div className="flex justify-between">
              <span className="font-medium">Role hiện tại:</span>
              <Badge variant={clerkRole ? "default" : "secondary"}>
                {clerkRole || "USER (mặc định)"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Debug Info */}
        <Card>
          <CardHeader>
            <CardTitle>Debug Info</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded overflow-auto">
              {JSON.stringify(
                {
                  userId: user.id,
                  email: user.primaryEmailAddress?.emailAddress,
                  role: clerkRole,
                  publicMetadata: user.publicMetadata,
                  hasAuthorRole:
                    clerkRole === "AUTHOR" || clerkRole === "ADMIN",
                },
                null,
                2,
              )}
            </pre>
          </CardContent>
        </Card>

        {/* Sync Action */}
        <Card>
          <CardHeader>
            <CardTitle>Đồng bộ Role từ Database</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Nếu bạn đã được admin duyệt làm Author nhưng vẫn không thấy menu
              "Tạo khách sạn", hãy nhấn nút bên dưới để đồng bộ.
            </p>
            <SyncRoleButton />
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Hướng dẫn khắc phục</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium">Nếu không thấy role AUTHOR:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2 text-muted-foreground">
              <li>Nhấn nút "Đồng bộ quyền truy cập" ở trên</li>
              <li>Đợi 2 giây để trang reload</li>
              <li>Nếu vẫn chưa có, logout và login lại</li>
              <li>Clear cache trình duyệt (Ctrl+Shift+Delete)</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
