"use client";

import React from "react";
import {
  Place,
  getPlaceLabel,
  getPlaceLatLng,
  getCategoryName,
  getCategoryIcon,
  getCategoryId,
} from "../types/map-types";
import { MapPin, Star } from "lucide-react";

function getImageUrl(place: Place): string {
  if (place.featuredImage) return place.featuredImage as string;
  const p = place as any;
  if (p.image) return p.image;
  if (place.galleryImgs && place.galleryImgs.length > 0)
    return place.galleryImgs[0] ?? "";
  return "";
}

function getBadgeBg(catId: number): string {
  const m: Record<number, string> = {
    1: "#fce7f3",
    2: "#dcfce7",
    3: "#fef9c3",
    4: "#fee2e2",
    5: "#e0e7ff",
    6: "#dbeafe",
    7: "#f3e8ff",
  };
  return m[catId] ?? "#f3f4f6";
}

function getBadgeText(catId: number): string {
  const m: Record<number, string> = {
    1: "#9d174d",
    2: "#166534",
    3: "#854d0e",
    4: "#991b1b",
    5: "#3730a3",
    6: "#1e40af",
    7: "#6b21a8",
  };
  return m[catId] ?? "#374151";
}

export default function LocationCard({ place }: { place: Place }) {
  const label = getPlaceLabel(place);
  const description = place.description || "";
  const coords = getPlaceLatLng(place);
  const catName = getCategoryName(place.category) || "Khác";
  const catIcon = getCategoryIcon(place.category);
  const catId = getCategoryId(place.category);
  const imageUrl = getImageUrl(place);
  const priceDisplay = place.price
    ? `${Number(place.price).toLocaleString("vi-VN")}đ/đêm`
    : "";
  const ratingDisplay = place.reviewStar ? (
    <span className="flex items-center gap-1">
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      <span>
        {place.reviewStar}
        {place.reviewCount ? ` (${place.reviewCount})` : ""}
      </span>
    </span>
  ) : null;
  const mapsLink = coords
    ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}`
    : "";

  return (
    <div className="w-[300px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
      {/* Image - Ép cứng chiều cao 100px */}
      <div className="relative h-[100px] overflow-hidden bg-gray-200">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={label}
            className="block h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 text-4xl">
            🏨
          </div>
        )}
        {/* Badge top-left */}
        <span
          className="absolute left-2.5 top-2.5 z-10 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold backdrop-blur-sm"
          style={{
            backgroundColor: getBadgeBg(catId),
            color: getBadgeText(catId),
            borderColor: `${getBadgeText(catId)}33`,
          }}
        >
          {catIcon} {catName}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-2 p-4">
        {/* Title */}
        <h3 className="text-base font-bold leading-snug text-gray-900 line-clamp-2 !m-0">
          {label}
        </h3>

        {/* Price & Rating */}
        {(priceDisplay || ratingDisplay) && (
          <div className="flex items-center justify-between text-sm">
            {priceDisplay && (
              <span className="font-semibold text-amber-600">
                {priceDisplay}
              </span>
            )}
            {ratingDisplay && (
              <span className="text-gray-600">{ratingDisplay}</span>
            )}
          </div>
        )}

        {/* Divider */}
        <div
          className="block mt-1 mb-1"
          style={{
            height: "1px",
            width: "48px",
            backgroundColor: "rgba(245,158,11,0.5)",
          }}
        />

        {/* Description - Đã thêm margin: 0 để diệt cái spacing 18px của Leaflet */}
        <p
          className="text-sm leading-relaxed text-gray-500 line-clamp-2 m-2! "
          style={{ fontStyle: "italic", margin: 0 }}
        >
          {description || "Chưa có mô tả"}
        </p>

        {/* Address - Cũng thêm margin: 0 cho chắc ăn */}
        {place.address && (
          <div
            className="flex items-start gap-1 text-sm text-gray-800 !m-0"
            style={{ margin: 0 }}
          >
            <span>{place.address}</span>

            <MapPin className="h-5 w-5 shrink-0 fill-red-500 text-white mt-0.5" />
          </div>
        )}

        {/* Maps link */}
        {mapsLink && (
          <a
            href={mapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] font-medium text-cyan-600 hover:underline inline-block mt-1"
          >
            Xem trên Google Maps ↗
          </a>
        )}
      </div>
    </div>
  );
}
