"use client";

import React, { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Building2,
  Plus,
  TrendingUp,
  Calendar,
  DollarSign,
  Eye,
  Hotel,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import axios from "axios";

const API_URL =
  process.env.NEXT_PUBLIC_PRODUCT_SERVICE_URL || "http://localhost:8000";

interface HotelStats {
  totalHotels: number;
  approvedHotels: number;
  pendingHotels: number;
  draftHotels: number;
  totalViews: number;
  totalBookings: number;
  totalRevenue: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

const HostPage = () => {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [stats, setStats] = useState<HotelStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;

    // Kiểm tra đăng nhập
    if (!isSignedIn) {
      router.push("/sign-in?redirect_url=/host");
      return;
    }

    // Kiểm tra role AUTHOR
    const userRole = user?.publicMetadata?.role as string;
    if (userRole !== "AUTHOR" && userRole !== "ADMIN") {
      router.push("/?error=unauthorized");
      return;
    }

    // Fetch stats
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API_URL}/users/${user.id}/stats`);
        setStats(response.data.data);
      } catch (err) {
        console.error("Error fetching host stats:", err);
        // Nếu API chưa có, dùng mock data
        setStats({
          totalHotels: 0,
          approvedHotels: 0,
          pendingHotels: 0,
          draftHotels: 0,
          totalViews: 0,
          totalBookings: 0,
          totalRevenue: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [isLoaded, isSignedIn, user, router]);

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex space-x-2">
          <div className="w-4 h-4 rounded-full bg-primary animate-bounce"></div>
          <div className="w-4 h-4 rounded-full bg-primary animate-bounce delay-75"></div>
          <div className="w-4 h-4 rounded-full bg-primary animate-bounce delay-150"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        {/* Header */}
        <motion.div
          variants={itemVariants}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Host Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Quản lý khách sạn và theo dõi hiệu suất của bạn
            </p>
          </div>
          <Button asChild size="lg" className="gap-2">
            <Link href="/create-hotel">
              <Plus className="h-4 w-4" />
              Tạo khách sạn mới
            </Link>
          </Button>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Tổng khách sạn
                </CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.totalHotels || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.approvedHotels || 0} đã duyệt,{" "}
                  {stats?.pendingHotels || 0} chờ duyệt
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lượt xem</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.totalViews.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Tổng lượt xem tất cả khách sạn
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Đặt phòng</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.totalBookings || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Tổng số booking đã nhận
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Doanh thu</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(stats?.totalRevenue || 0).toLocaleString("vi-VN")}đ
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Tổng doanh thu ước tính
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle>Thao tác nhanh</CardTitle>
              <CardDescription>
                Các tính năng phổ biến dành cho chủ nhà
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <Button variant="outline" asChild className="h-auto py-4">
                <Link
                  href="/my-hotels"
                  className="flex flex-col items-center gap-2"
                >
                  <Hotel className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-semibold">Quản lý khách sạn</div>
                    <div className="text-xs text-muted-foreground">
                      Xem & chỉnh sửa
                    </div>
                  </div>
                </Link>
              </Button>

              <Button variant="outline" asChild className="h-auto py-4">
                <Link
                  href="/create-hotel"
                  className="flex flex-col items-center gap-2"
                >
                  <Plus className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-semibold">Tạo khách sạn mới</div>
                    <div className="text-xs text-muted-foreground">
                      Đăng tài sản mới
                    </div>
                  </div>
                </Link>
              </Button>

              <Button variant="outline" asChild className="h-auto py-4">
                <Link
                  href="/my-bookings"
                  className="flex flex-col items-center gap-2"
                >
                  <Calendar className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-semibold">Quản lý đặt phòng</div>
                    <div className="text-xs text-muted-foreground">
                      Xem lịch booking
                    </div>
                  </div>
                </Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Info Alert */}
        {stats && stats.pendingHotels > 0 && (
          <motion.div variants={itemVariants}>
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="flex items-center gap-3 pt-6">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-900">
                    Bạn có {stats.pendingHotels} khách sạn đang chờ phê duyệt
                  </p>
                  <p className="text-sm text-amber-700">
                    Admin sẽ xem xét và phê duyệt trong vòng 24-48 giờ
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default HostPage;
