"use client";

import React from "react";
import { motion } from "framer-motion";
import { MapPin, Briefcase, Calendar, Mail, Phone, Star } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Giả lập dữ liệu (bạn thay bằng data thật từ API)
const hostData = {
  id: "user_seed_1",
  name: "Kha Don Dev",
  nickname: "khadon",
  email: "khadondev@gmail.com",
  phone: "0999999999",
  address: "Số 290, Đường Hùng Vương, Huyện Hòa Vang, Long An",
  avatar: "/khadon.jpg",
  bgImage:
    "https://images.unsplash.com/photo-1613339027986-b94d85708995?q=80&w=1074&auto=format&fit=crop",
  jobName: "Kỹ sư giám sát",
  desc: "Xin chào, tôi là Kha Don Dev. Yêu thích du lịch và khám phá những vùng đất mới. Rất vui được đón tiếp các bạn tại homestay của tôi.",
  createdAt: "2026-01-06T11:38:00.205309",
  hotels: [
    {
      id: "hotel_1",
      name: "Hạnh Nguyễn Homestay - View Núi",
      image:
        "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800",
      price: 500000,
      rating: 4.8,
      address: "Đà Lạt, Lâm Đồng",
    },
    {
      id: "hotel_2",
      name: "Căn hộ Studio trung tâm",
      image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
      price: 850000,
      rating: 4.5,
      address: "Quận 1, TP.HCM",
    },
  ],
};

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
  const joinDate = new Date(hostData.createdAt).toLocaleDateString("vi-VN", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* ==================== HERO SECTION ==================== */}
      <div className="relative h-[380px] md:h-[480px] w-full overflow-hidden">
        <img
          src={hostData.bgImage}
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
                  src={hostData.avatar}
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
                {hostData.jobName}
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
                    {hostData.desc}
                  </p>

                  <div className="space-y-4 text-sm">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-muted-foreground" />
                      <span>{hostData.address}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Briefcase className="w-5 h-5 text-muted-foreground" />
                      <span>{hostData.jobName}</span>
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
                      <span className="font-medium">
                        Email : {hostData.email}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-green-600">
                      <Phone className="w-5 h-5" />
                      <span className="font-medium">
                        Số điện thoại : {hostData.phone}
                      </span>
                    </div>
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
                {hostData.hotels.length} chỗ nghỉ
              </Badge>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              {hostData.hotels.map((hotel) => (
                <motion.div
                  key={hotel.id}
                  variants={itemVariants}
                  whileHover={{ y: 0, transition: { duration: 0.3 } }}
                >
                  <Link href={`/hotels/${hotel.id}`} className="block group">
                    <Card className="overflow-hidden border-none shadow-md hover:shadow-xl transition-shadow duration-300">
                      <div className="relative aspect-[4/3] overflow-hidden">
                        <img
                          src={hotel.image}
                          alt={hotel.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute top-3 right-3">
                          <Badge
                            variant="secondary"
                            className="bg-white/90 backdrop-blur-sm flex items-center gap-1 px-2.5 py-1 text-sm font-semibold"
                          >
                            <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                            {hotel.rating}
                          </Badge>
                        </div>
                      </div>

                      <CardContent className="p-5">
                        <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors line-clamp-1">
                          {hotel.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          {hotel.address}
                        </p>
                        <div className="font-bold text-xl">
                          {hotel.price.toLocaleString("vi-VN")}
                          <span className="text-sm font-normal text-muted-foreground">
                            {" "}
                            / đêm
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>

            {hostData.hotels.length === 0 && (
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
