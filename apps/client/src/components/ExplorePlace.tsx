"use client"; // BẮT BUỘC vì sử dụng Carousel và các tương tác client

import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import FadeIn from "./ui/fade-in";
import { useTranslations } from "next-intl";

const places = [
  {
    id: 1,
    name: "Hạ Long Bay",
    count: 3000,
    thumbnail: "/assets/travels/halongbay.jpeg",
  },
  {
    id: 2,
    name: "Hội An",
    count: 2500,
    thumbnail: "/assets/travels/hoian.jpeg",
  },
  {
    id: 3,
    name: "Sapa",
    count: 1800,
    thumbnail: "/assets/travels/sapa.jpeg",
  },
  {
    id: 4,
    name: "Đà Nẵng",
    count: 4200,
    thumbnail: "/assets/travels/danang.jpeg",
  },
  {
    id: 5,
    name: "Huế",
    count: 2900,
    thumbnail: "/assets/travels/hue.jpeg",
  },
  {
    id: 6,
    name: "Phú Quốc",
    count: 3500,
    thumbnail: "/assets/travels/phuquoc.jpeg",
  },
  {
    id: 7,
    name: "Ninh Bình",
    count: 2100,
    thumbnail: "/assets/travels/ninhbinh.jpeg",
  },
  {
    id: 8,
    name: "Mũi Né",
    count: 1700,
    thumbnail: "/assets/travels/muine.jpeg",
  },
  {
    id: 9,
    name: "Vũng Tàu",
    count: 4000,
    thumbnail: "/assets/travels/vungtau.jpeg",
  },
  {
    id: 10,
    name: "Đà Lạt",
    count: 4000,
    thumbnail: "/assets/travels/dalat.jpeg",
  },
];

export function ExplorePlace() {
  const t = useTranslations("ExplorePlace"); // <--- 2. Khởi tạo namespace "ExplorePlace"

  return (
    <div className="relative w-full px-14 mx-auto">
      <div className="flex items-center justify-between">
        <div className="mb-8">
          {/* Eyebrow */}
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px w-8 bg-zinc-400/40" />
            <span className="text-xs uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-1.5">
              {t("eyebrow")} {/* <--- Dịch chữ "Xu hướng điểm đến" */}
              <TrendingUp className="w-3.5 h-3.5 text-orange-700" />{" "}
            </span>
          </div>

          {/* Tiêu đề chính */}
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-zinc-900">
            {t("title")} {/* <--- Dịch chữ "Khám phá địa điểm" */}
          </h2>

          {/* Đoạn mô tả */}
          <p className="mt-3 text-sm text-zinc-400 max-w-xl leading-relaxed">
            {t("description")}{" "}
            {/* <--- Dịch chữ "Tìm hiểu các khu vực hấp dẫn" */}
          </p>
        </div>
        <Link href="/hotels">
          <Button variant="link">{t("viewAll")}</Button>{" "}
          {/* <--- Dịch chữ "Xem tất cả" */}
        </Link>
      </div>

      <Carousel opts={{ align: "start" }}>
        <CarouselContent>
          {places.map((place, index) => (
            <CarouselItem
              key={place.id}
              className="md:basis-1/2 lg:basis-1/3 xl:basis-1/5"
            >
              <FadeIn className="h-full w-full" delay={index * 100}>
                <Card className="overflow-hidden rounded-2xl shadow-sm">
                  <div className="overflow-hidden rounded-2xl">
                    <Image
                      src={place.thumbnail}
                      alt={place.name}
                      width={500}
                      height={400}
                      className="h-56 w-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                  </div>
                  <CardContent className="p-3">
                    <h3 className="text-base font-semibold">{place.name}</h3>
                    <p
                      className="text-sm text-muted-foreground"
                      suppressHydrationWarning
                    >
                      {/* 3. Truyền biến số count vào chuỗi dịch để xử lý logic "phòng/rooms" */}
                      {t("roomsCount", { count: place.count })}
                    </p>
                  </CardContent>
                </Card>
              </FadeIn>
            </CarouselItem>
          ))}
        </CarouselContent>

        <CarouselPrevious className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 bg-white rounded-full shadow-lg p-3 hover:bg-gray-100">
          <ChevronLeft className="w-6 h-6" />
        </CarouselPrevious>

        <CarouselNext className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-8 bg-white rounded-full shadow-lg p-3 hover:bg-gray-100">
          <ChevronRight className="w-6 h-6" />
        </CarouselNext>
      </Carousel>
    </div>
  );
}
