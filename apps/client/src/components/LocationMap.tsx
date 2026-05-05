"use client";

import React, { useEffect, useRef } from "react";
import { renderToString } from "react-dom/server"; // Thêm import này
// Thêm import này (Sửa lại đường dẫn nếu cần)

import type { StayDataType } from "@/types/stay";
import {
  getPlaceLabel,
  getPlaceLatLng,
  getCategoryColor,
} from "@/types/map-types";
import LocationCard from "./location-card";

interface LocationMapProps {
  /** Full stay data – preferred way to pass data */
  stay?: StayDataType;
  /** Legacy props for backward compat (only used when `stay` is not provided) */
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  /** Map height */
  height?: number | string;
}

/**
 * A Leaflet-based map that displays a single stay location.
 * Used in StayDetailPage's "Vị trí" section.
 */
const LocationMap: React.FC<LocationMapProps> = ({
  stay,
  address: legacyAddress,
  lat: legacyLat,
  lng: legacyLng,
  height = 500,
}) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<any>(null);

  // Derive coords either from `stay` or legacy props
  const coords = stay
    ? getPlaceLatLng(stay)
    : typeof legacyLat === "number" &&
        typeof legacyLng === "number" &&
        !isNaN(legacyLat) &&
        !isNaN(legacyLng)
      ? { lat: legacyLat, lng: legacyLng }
      : null;

  const displayAddress = stay?.address ?? legacyAddress ?? "";
  const displayLabel = stay ? getPlaceLabel(stay) : displayAddress;

  // Inject Leaflet CSS once
  useEffect(() => {
    const cssHref = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    if (!document.querySelector(`link[href="${cssHref}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = cssHref;
      document.head.appendChild(link);
    }
  }, []);

  // Create / update map
  useEffect(() => {
    if (!mapRef.current || !coords) return;

    let cancelled = false;

    import("leaflet")
      .then((L) => {
        if (cancelled) return;

        // Fix default marker icon URLs
        const IconDefault = L.Icon.Default as any;
        IconDefault.mergeOptions({
          iconRetinaUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          iconUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          shadowUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });

        const map = L.map(mapRef.current as HTMLDivElement).setView(
          [coords.lat, coords.lng],
          15,
        );

        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
          {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
            subdomains: "abcd",
            maxZoom: 20,
          },
        ).addTo(map);

        const color = stay ? getCategoryColor(stay.category) : "#d97706";

        const svg = `
          <svg width="72" height="72" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C8.686 2 6 4.686 6 8c0 5.25 6 12 6 12s6-6.75 6-12c0-3.314-2.686-6-6-6z" fill="${color}" stroke="#fff" stroke-width="1.3"/>
            <circle cx="12" cy="8.25" r="2.35" fill="#fff"/>
          </svg>`;

        const icon = L.divIcon({
          html: svg,
          className: "custom-div-icon",
          iconSize: [72, 72],
          iconAnchor: [36, 66],
        });

        const marker = L.marker([coords.lat, coords.lng], { icon }).addTo(map);

        // --- ĐOẠN CODE THAY ĐỔI CHÍNH Ở ĐÂY ---
        let popupHtml = "";

        if (stay) {
          // Render component LocationCard thành chuỗi HTML để bỏ vào popup
          popupHtml = renderToString(<LocationCard place={stay as any} />);
        } else {
          // Fallback nếu không truyền stay (chỉ có toạ độ legacy)
          const googleLink = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
          popupHtml = `
            <div style="padding: 12px; width: 250px;">
              <p class="font-bold text-lg">${displayLabel}</p>
              ${displayAddress ? `<p class="text-sm text-gray-500 mb-2">${displayAddress}</p>` : ""}
              <a href="${googleLink}" target="_blank" rel="noopener noreferrer" class="text-sm font-semibold text-cyan-500 hover:underline">Xem trên Google Maps ↗</a>
            </div>
          `;
        }

        marker.bindPopup(popupHtml, {
          // Xóa background/padding mặc định của Leaflet để LocationCard hiển thị đẹp nhất
          className:
            "custom-popup !p-0 !bg-transparent !border-none !shadow-none",
        });

        marker.openPopup();

        leafletMapRef.current = map;
      })
      .catch((err) => {
        console.error("Leaflet failed to load", err);
      });

    return () => {
      cancelled = true;
      if (leafletMapRef.current) {
        try {
          leafletMapRef.current.remove();
        } catch (_) {
          /* ignore */
        }
        leafletMapRef.current = null;
      }
    };
  }, [coords?.lat, coords?.lng]);

  // ---- No coords fallback ----
  if (!coords) {
    return (
      <div
        className="w-full rounded-xl overflow-hidden shadow bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
        style={{ height: typeof height === "number" ? `${height}px` : height }}
      >
        <span className="text-neutral-500">Không có thông tin vị trí</span>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className="w-full rounded-xl overflow-hidden shadow"
      style={{ height: typeof height === "number" ? `${height}px` : height }}
    />
  );
};

export default LocationMap;
