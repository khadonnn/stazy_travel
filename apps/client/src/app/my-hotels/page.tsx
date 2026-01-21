"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Eye, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import Link from "next/link";
import { useIsAuthor } from "@/hooks/useRole";

interface Hotel {
  id: number;
  title: string;
  slug: string;
  featuredImage: string;
  price: number;
  status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  createdAt: string;
  rejectionReason?: string;
}

export default function MyHotelsPage() {
  const { getToken } = useAuth();
  const { isLoaded } = useUser();
  const isAuthor = useIsAuthor();
  const router = useRouter();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isAuthor) {
      router.push("/profile?error=require_author");
      return;
    }

    loadMyHotels();
  }, [isLoaded, isAuthor]);

  const loadMyHotels = async () => {
    try {
      const token = await getToken();
      const res = await fetch("http://localhost:8000/hotels/my-hotels", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setHotels(data);
      }
    } catch (error) {
      console.error("Error loading hotels:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      DRAFT: { label: "Nháp", className: "bg-gray-500" },
      PENDING: { label: "Chờ duyệt", className: "bg-yellow-500" },
      APPROVED: { label: "Đã duyệt", className: "bg-green-500" },
      REJECTED: { label: "Từ chối", className: "bg-red-500" },
      SUSPENDED: { label: "Tạm ngưng", className: "bg-orange-500" },
    };

    const s = config[status as keyof typeof config];
    return <Badge className={s.className}>{s.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Khách sạn của tôi</h1>
          <p className="text-muted-foreground mt-2">
            Quản lý các khách sạn bạn đã đăng
          </p>
        </div>
        <Link href="/create-hotel">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Thêm khách sạn mới
          </Button>
        </Link>
      </div>

      {hotels.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground mb-4">
              Bạn chưa có khách sạn nào
            </p>
            <Link href="/create-hotel">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Tạo khách sạn đầu tiên
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {hotels.map((hotel) => (
            <Card key={hotel.id}>
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <div className="relative w-32 h-32 rounded-lg overflow-hidden flex-shrink-0">
                    <Image
                      src={hotel.featuredImage}
                      alt={hotel.title}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-xl font-semibold">{hotel.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {new Intl.NumberFormat("vi-VN", {
                            style: "currency",
                            currency: "VND",
                          }).format(hotel.price)}
                          /đêm
                        </p>
                      </div>
                      {getStatusBadge(hotel.status)}
                    </div>

                    {hotel.status === "REJECTED" && hotel.rejectionReason && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3 mb-3">
                        <p className="text-xs text-red-600 dark:text-red-400">
                          <strong>Lý do từ chối:</strong>{" "}
                          {hotel.rejectionReason}
                        </p>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground mb-3">
                      Tạo lúc:{" "}
                      {new Date(hotel.createdAt).toLocaleString("vi-VN")}
                    </p>

                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4 mr-1" />
                        Xem
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="w-4 h-4 mr-1" />
                        Sửa
                      </Button>
                      <Button size="sm" variant="outline">
                        <Trash2 className="w-4 h-4 mr-1" />
                        Xóa
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
