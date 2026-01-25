"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Briefcase, Calendar, Mail, Phone, Star } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import axios from "axios";
import { useParams } from "next/navigation";
import { getRandomBorderColor } from "@/lib/randomColor";

const API_URL =
  process.env.NEXT_PUBLIC_PRODUCT_SERVICE_URL || "http://localhost:8000";

interface Hotel {
  id: number;
  title: string;
  address: string;
  price: number;
  featuredImage?: string;
  reviewStar?: number;
  slug?: string;
}

interface HostData {
  id: string;
  name: string;
  nickname?: string;
  email: string;
  phone?: string;
  address?: string;
  avatar?: string;
  bgImage?: string;
  jobName?: string;
  desc?: string;
  createdAt: string;
  hotels?: Hotel[];
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

export default function HostProfilePage() {
  const params = useParams();
  const userId = params?.id as string;

  const [hostData, setHostData] = useState<HostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHostData = async () => {
      if (!userId) return;

      setLoading(true);
      setError(null);

      try {
        // Gọi API lấy user info kèm hotels
        const response = await axios.get(
          `${API_URL}/users/${userId}?includeHotels=true`,
        );

        console.log("🔍 API Response:", response.data);
        console.log("🏨 Hotels data:", response.data.data?.hotels);

        if (response.data.success) {
          setHostData(response.data.data);
        } else {
          setError("Không tìm thấy thông tin chủ nhà");
        }
      } catch (err: any) {
        console.error("❌ Fetch host error:", err);
        console.error("❌ Error response:", err.response?.data);
        setError(
          err.response?.data?.message || "Lỗi khi tải thông tin chủ nhà",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchHostData();
  }, [userId]);

  if (loading) {
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

  if (error || !hostData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h3 className="text-xl font-semibold mb-2">Không tìm thấy chủ nhà</h3>
          <p className="text-muted-foreground mb-4">
            {error || "Vui lòng thử lại sau"}
          </p>
          <Button asChild>
            <Link href="/">Về trang chủ</Link>
          </Button>
        </div>
      </div>
    );
  }

  const joinDate = new Date(hostData.createdAt).toLocaleDateString("vi-VN", {
    month: "long",
    year: "numeric",
  });

  const defaultBg =
    "https://images.unsplash.com/photo-1613339027986-b94d85708995?q=80&w=1074&auto=format&fit=crop";
  const defaultAvatar = "/assets/user2.avif";

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* ==================== HERO SECTION ==================== */}
      <div className="relative h-[380px] md:h-[480px] w-full overflow-hidden">
        <img
          src={hostData.bgImage || defaultBg}
          alt="Cover"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 container mx-auto px-4 pb-12 md:pb-16">
          <motion.div
            className="flex flex-col md:flex-row items-start md:items-end gap-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            {/* Avatar */}
            <motion.div
              className="relative flex-shrink-0"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            >
              <div className="relative">
                <img
                  src={hostData.avatar || defaultAvatar}
                  alt={hostData.name}
                  className="w-32 h-32 md:w-44 md:h-44 rounded-full border-4 border-white shadow-2xl object-cover bg-white ring-2 ring-white/40"
                />
                <Badge className="absolute -bottom-2 right-2 bg-primary text-primary-foreground px-3 py-1 text-xs font-bold shadow-md">
                  CHỦ NHÀ
                </Badge>
              </div>
            </motion.div>

            {/* Info */}
            <div className="flex-1 text-white md:pb-4">
              <h1 className="text-3xl md:text-4xl font-bold drop-shadow-lg">
                {hostData.name}
              </h1>
              <p className="text-lg md:text-xl mt-1 opacity-90 font-medium">
                {hostData.jobName || "Chủ nhà"}
              </p>
            </div>

            {/* Action button */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Button size="lg" className="shadow-lg">
                Liên hệ ngay
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* ==================== MAIN CONTENT ==================== */}
      <div className="container mx-auto px-4 max-w-7xl -mt-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          {/* LEFT COLUMN - About & Verified */}
          <div className="space-y-6 lg:sticky lg:top-8 lg:self-start">
            <motion.div variants={itemVariants}>
              <Card className="border-none shadow-md">
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold mb-4">Giới thiệu</h2>
                  <p className="text-gray-700 leading-relaxed mb-6">
                    {hostData.desc || "Chưa có mô tả về chủ nhà."}
                  </p>

                  <div className="space-y-4 text-sm">
                    {hostData.address && (
                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-muted-foreground" />
                        <span>{hostData.address}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <Briefcase className="w-5 h-5 text-muted-foreground" />
                      <span>{hostData.jobName || "Chủ nhà"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-muted-foreground" />
                      <span>Tham gia {joinDate}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="border-none shadow-md">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-4">Đã xác minh</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-green-600">
                      <Mail className="w-5 h-5" />
                      <span className="font-medium text-sm truncate">
                        {hostData.email}
                      </span>
                    </div>
                    {hostData.phone && (
                      <div className="flex items-center gap-3 text-green-600">
                        <Phone className="w-5 h-5" />
                        <span className="font-medium">{hostData.phone}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* RIGHT COLUMN - Listings */}
          <div className="lg:col-span-2 space-y-8">
            <motion.div
              variants={itemVariants}
              className="flex items-center justify-between"
            >
              <h2 className="text-2xl md:text-3xl font-bold">
                Chỗ nghỉ của chủ nhà
              </h2>
              <Badge variant="secondary" className="text-base px-4 py-1.5">
                {hostData.hotels?.length || 0} chỗ nghỉ
              </Badge>
            </motion.div>

            {hostData.hotels && hostData.hotels.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                {hostData.hotels.map((hotel) => {
                  const borderColor = getRandomBorderColor();
                  return (
                    <motion.div
                      key={hotel.id}
                      variants={itemVariants}
                      whileHover={{ y: 0, transition: { duration: 0.3 } }}
                    >
                      <Link
                        href={`/hotels/${hotel.slug || hotel.id}`}
                        className="block group"
                      >
                        <Card
                          className="overflow-hidden border-8 shadow-md hover:shadow-xl transition-all duration-200"
                          style={{
                            borderColor: "transparent",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = `${borderColor}40`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "transparent";
                          }}
                        >
                          <div className="relative aspect-[4/3] overflow-hidden">
                            <img
                              src={hotel.featuredImage || "/placeholder.jpg"}
                              alt={hotel.title}
                              className="w-full h-full object-cover"
                            />
                            {hotel.reviewStar && (
                              <div className="absolute top-3 right-3">
                                <Badge
                                  variant="secondary"
                                  className="bg-white/90 backdrop-blur-sm flex items-center gap-1 px-2.5 py-1 text-sm font-semibold"
                                >
                                  <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                                  {hotel.reviewStar}
                                </Badge>
                              </div>
                            )}
                          </div>

                          <CardContent className="p-5">
                            <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors line-clamp-1">
                              {hotel.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-3">
                              {hotel.address}
                            </p>
                            <div className="font-bold text-xl">
                              {Number(hotel.price).toLocaleString("vi-VN")}
                              <span className="text-sm font-normal text-muted-foreground">
                                {" "}
                                / đêm
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 bg-muted/40 rounded-xl border border-dashed">
                <p className="text-muted-foreground text-lg">
                  Chủ nhà này hiện chưa có chỗ nghỉ nào được đăng tải.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
