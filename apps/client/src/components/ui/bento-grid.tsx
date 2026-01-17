import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { Star, MapPin, ArrowRight } from "lucide-react";

/* =========================
   BENTO GRID CONTAINER
========================= */
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
        // 1 col mobile | 2 col tablet | 4 col desktop (bento ratio đẹp)
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4",
        "max-w-7xl mx-auto px-4",
        // Chiều cao cố định → layout ổn định, không jump
        "auto-rows-[220px] md:auto-rows-[240px]",
        className
      )}
    >
      {children}
    </div>
  );
};

/* =========================
   BENTO GRID ITEM
========================= */
export const BentoGridItem = ({
  className,
  title,
  description,
  id,
  price,
  rating,
  image,
  category,
}: {
  className?: string;
  title?: string;
  description?: string;
  id: number;
  price: number;
  rating: number;
  image: string;
  category: string;
}) => {
  return (
    <Link
      href={`/hotels/${id}`}
      className={cn(
        "group relative overflow-hidden rounded-3xl",
        "h-full w-full",
        "flex flex-col justify-end",
        // GPU-friendly hover
        "transition-all duration-300 ease-out",
        "hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/30",
        "will-change-transform",
        className
      )}
    >
      {/* ===== BACKGROUND IMAGE ===== */}
      <div className="absolute inset-0">
        <Image
          src={image}
          alt={title || "Hotel"}
          fill
          priority={false}
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />

        {/* Gradient overlay – animation rẻ & cinematic */}
        <div
          className="
            absolute inset-0
            bg-gradient-to-t
            from-black/90 via-black/45 to-transparent
            opacity-70 group-hover:opacity-90
            transition-opacity duration-300
          "
        />
      </div>

      {/* ===== CATEGORY BADGE ===== */}
      <div className="absolute top-4 right-4 z-20">
        <span
          className="
            px-3 py-1 text-xs font-semibold
            text-white
            bg-black/40 backdrop-blur-md
            rounded-full
            border border-white/10
          "
        >
          {category}
        </span>
      </div>

      {/* ===== CONTENT ===== */}
      <div
        className="
          relative z-20 p-5
          flex flex-col gap-2
          translate-y-3 group-hover:translate-y-0
          transition-transform duration-300 ease-out
        "
      >
        {/* --- Title & Rating --- */}
        <div className="flex items-start justify-between gap-2">
          <h3
            className="
              text-xl font-bold text-white leading-tight
              line-clamp-2
              group-hover:text-yellow-400
              transition-colors
            "
          >
            {title}
          </h3>

          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-sm shrink-0">
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            <span className="text-xs font-bold text-white">
              {rating.toFixed(1)}
            </span>
          </div>
        </div>

        {/* --- Location (no layout reflow) --- */}
        <div
          className="
            flex items-center gap-1 text-sm text-gray-300
            max-h-0 opacity-0 overflow-hidden
            group-hover:max-h-10 group-hover:opacity-100
            transition-all duration-300 ease-out
          "
        >
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="line-clamp-1">{description}</span>
        </div>

        {/* --- Price & CTA --- */}
        <div className="mt-2 pt-3 border-t border-white/20 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">Giá mỗi đêm</p>
            <p className="text-lg font-bold text-white">
              {new Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
                maximumFractionDigits: 0,
              }).format(price)}
            </p>
          </div>

          <div
            className="
              p-2 rounded-full bg-white text-black
              opacity-0 translate-x-[-6px]
              group-hover:opacity-100 group-hover:translate-x-0
              transition-all duration-150 ease-out delay-150
            "
          >
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </Link>
  );
};
