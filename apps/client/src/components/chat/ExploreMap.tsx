"use client";

import React, { useEffect, useRef, useState } from "react";
import { renderToString } from "react-dom/server";
import {
  getPlaceLatLng,
  getPlaceLabel,
  getCategoryColor,
} from "@/types/map-types";
import LocationCard from "@/components/location-card";

/** Minimal shape needed to render a hotel marker on the map */
export interface HotelMarkerData {
  id: number;
  title: string;
  price: number;
  address: string;
  rating?: number;
  image?: string;
  featuredImage?: string;
  galleryImgs?: string[];
  slug?: string;
  map?: { lat: number; lng: number } | null;
  reviewStar?: number;
  reviewCount?: number;
  description?: string;
  category?: any;
  [key: string]: any;
}

interface ExploreMapProps {
  /** List of hotels to display as markers */
  hotels: HotelMarkerData[];
  /** Currently selected/hovered hotel id – will open its popup */
  activeHotelId?: number | null;
  /** Callback when a marker is clicked */
  onMarkerClick?: (hotelId: number) => void;
  /** Map height */
  height?: number | string;
}

/**
 * Multi-marker Leaflet map used in the Explore full-screen page.
 * Shows only markers initially; clicking a marker reveals hotel info via LocationCard.
 */
const ExploreMap: React.FC<ExploreMapProps> = ({
  hotels,
  activeHotelId = null,
  onMarkerClick,
  height = "100%",
}) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<any>(null);
  const markersMapRef = useRef<Record<number, any>>({});
  const [leafletLoaded, setLeafletLoaded] = useState(false);

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

  // Create map instance once
  useEffect(() => {
    if (!mapRef.current) return;
    let cancelled = false;

    import("leaflet")
      .then((L) => {
        if (cancelled || !mapRef.current) return;

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

        // Default center: Vietnam center
        const map = L.map(mapRef.current as HTMLDivElement, {
          zoomControl: true,
          scrollWheelZoom: true,
        }).setView([14.0583, 108.2772], 6);

        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
          {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
            subdomains: "abcd",
            maxZoom: 20,
          },
        ).addTo(map);

        leafletMapRef.current = map;
        setLeafletLoaded(true);
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
  }, []);

  // Update markers when hotels change
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map || !leafletLoaded) return;

    import("leaflet").then((L) => {
      // Clear existing markers
      Object.values(markersMapRef.current).forEach((marker: any) => {
        try {
          map.removeLayer(marker);
        } catch (_) {}
      });
      markersMapRef.current = {};

      if (hotels.length === 0) return;

      const bounds = L.latLngBounds([]);

      hotels.forEach((hotel) => {
        const coords = getPlaceLatLng(hotel as any);
        if (!coords) return;

        const color = hotel.category
          ? getCategoryColor(hotel.category)
          : "#3b82f6";

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
          popupAnchor: [0, -66],
        });

        const marker = L.marker([coords.lat, coords.lng], { icon }).addTo(map);

        // Render LocationCard component into HTML string for popup
        // Build a StayDataType-compatible object for LocationCard
        const stayForCard: any = {
          id: hotel.id,
          title: hotel.title,
          slug: hotel.slug || String(hotel.id),
          price: hotel.price,
          address: hotel.address,
          featuredImage: hotel.featuredImage || hotel.image || "",
          galleryImgs: hotel.galleryImgs || [],
          map: coords,
          reviewStar: hotel.rating || hotel.reviewStar || 0,
          reviewCount: hotel.reviewCount || 0,
          description: hotel.description || "",
          category: hotel.category,
        };

        let popupHtml: string;
        try {
          popupHtml = renderToString(<LocationCard place={stayForCard} />);
        } catch {
          // Fallback HTML if renderToString fails
          popupHtml = `
            <div style="padding:12px;width:280px;">
              <h3 style="font-weight:700;font-size:15px;margin:0 0 6px;">${hotel.title}</h3>
              <p style="color:#d97706;font-weight:600;font-size:14px;margin:0 0 4px;">${Number(hotel.price).toLocaleString("vi-VN")}đ/đêm</p>
              <p style="color:#6b7280;font-size:12px;margin:0;">${hotel.address}</p>
            </div>`;
        }

        marker.bindPopup(popupHtml, {
          maxWidth: 320,
          className:
            "custom-popup !p-0 !bg-transparent !border-none !shadow-none",
        });

        // Event: marker click
        marker.on("click", () => {
          if (onMarkerClick) {
            onMarkerClick(hotel.id);
          }
        });

        markersMapRef.current[hotel.id] = marker;
        bounds.extend([coords.lat, coords.lng]);
      });

      // Fit bounds to show all markers
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    });
  }, [hotels, leafletLoaded]);

  // Open popup for active hotel
  useEffect(() => {
    if (!activeHotelId || !leafletMapRef.current) return;
    const marker = markersMapRef.current[activeHotelId];
    if (marker) {
      marker.openPopup();
      leafletMapRef.current.panTo(marker.getLatLng(), { animate: true });
    }
  }, [activeHotelId]);

  return (
    <div
      ref={mapRef}
      className="w-full h-full"
      style={{
        height: typeof height === "number" ? `${height}px` : height,
        minHeight: "400px",
      }}
    />
  );
};

export default ExploreMap;
