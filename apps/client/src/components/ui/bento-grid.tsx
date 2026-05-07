import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { Star, MapPin, ArrowRight } from "lucide-react"; // Bổ sung thêm ArrowRight

export const BentoGrid = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 auto-rows-[240px] md:auto-rows-[280px] gap-4",
        className,
      )}
    >
      {children}
    </div>
  );
};

export const BentoGridItem = ({
  className,
  title,
  description,
  id,
  price,
  rating,
  image,
  category,
  featured = false, // Giữ lại prop featured để xử lý thẻ lớn
}: {
  className?: string;
  title?: string;
  description?: string;
  id: number;
  price: number;
  rating: number;
  image: string;
  category: string;
  featured?: boolean;
}) => {
  return (
    <Link
      href={`/hotels/${id}`}
      className={cn(
        "group relative overflow-hidden rounded-xl",
        "block w-full h-full",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-1 hover:shadow-xl", // Hiệu ứng nhấc card lên
        "will-change-transform",
        className,
      )}
    >
      {/* ===== BACKGROUND IMAGE ===== */}
      <div className="absolute inset-0">
        <Image
          src={image}
          alt={title || "Hotel"}
          fill
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />

        {/* Gradient overlay: Tối đi một chút khi hover để chữ nổi bật hơn */}
        <div
          className="
            absolute inset-0
            bg-gradient-to-t
            from-black/90 via-black/30 to-transparent
            opacity-70 group-hover:opacity-90
            transition-opacity duration-300
          "
        />
      </div>

      {/* ===== TOP META (Giữ nguyên vị trí 2 bên) ===== */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-start justify-between">
        <div className="flex items-center justify-center px-2.5 py-1 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10">
          <span className="text-[11px] font-medium leading-none text-white/90">
            {category}
          </span>
        </div>

        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/30 backdrop-blur-sm border border-white/10">
          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
          <span className="text-xs text-white font-medium">
            {rating.toFixed(1)}
          </span>
        </div>
      </div>

      {/* ===== CONTENT (Chứa hiệu ứng chuyển động) ===== */}
      <div
        className="
          relative z-20
          h-full
          flex flex-col justify-end
          p-5 md:p-6
        "
      >
        <div
          className="
            flex flex-col gap-1.5
            translate-y-3 group-hover:translate-y-0
            transition-transform duration-300 ease-out
          "
        >
          {/* --- Title --- */}
          <h3
            className={cn(
              "font-semibold text-white leading-tight line-clamp-2",
              "group-hover:text-yellow-400 transition-colors duration-300",
              featured ? "text-xl md:text-2xl" : "text-base md:text-lg", // Kích thước chữ dựa vào featured
            )}
          >
            {title}
          </h3>

          {/* --- Location (Ẩn đi, hiện ra khi hover) --- */}
          <div
            className="
              flex items-center gap-1.5 text-xs text-white/70
              max-h-0 opacity-0 overflow-hidden
              group-hover:max-h-8 group-hover:opacity-100 group-hover:mt-1
              transition-all duration-300 ease-out
            "
          >
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="line-clamp-1">{description}</span>
          </div>

          {/* --- Price & CTA (Ẩn đi, hiện ra kèm đường gạch ngang) --- */}
          <div
            className="
              mt-1 pt-3 border-t border-white/15 
              flex items-center justify-between
              max-h-0 opacity-0 overflow-hidden
              group-hover:max-h-16 group-hover:opacity-100 group-hover:mt-2
              transition-all duration-300 ease-out
            "
          >
            <div>
              <p className="text-[10px] text-white/50 uppercase tracking-wider mb-0.5">
                Mỗi đêm
              </p>
              <p className="text-sm md:text-base font-bold text-white">
                {new Intl.NumberFormat("vi-VN", {
                  style: "currency",
                  currency: "VND",
                  maximumFractionDigits: 0,
                }).format(price)}
              </p>
            </div>

            {/* Mũi tên trượt từ trái sang phải */}
            <div
              className="
                p-2 rounded-full bg-white text-black
                opacity-0 -translate-x-3
                group-hover:opacity-100 group-hover:translate-x-0
                transition-all duration-300 ease-out delay-75
              "
            >
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* hover ring */}
      <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/0 group-hover:ring-white/15 transition-all duration-300 pointer-events-none" />
    </Link>
  );
};
