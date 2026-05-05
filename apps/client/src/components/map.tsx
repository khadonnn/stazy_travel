"use client";

import React, { useEffect, useRef } from "react";
import {
  Place,
  getPlaceLabel,
  getPlaceLatLng,
  getCategoryName,
  getCategoryColor,
  getCategoryIcon,
} from "../types/map-types";
import { formatPrice } from "@/lib/utils/formatPrice";

interface MapProps {
  center?: [number, number];
  zoom?: number;
  hotels?: Place[];
  style?: React.CSSProperties;
  onSelect?: (place: Place) => void;
  theme?: "light" | "dark";
  selected?: Place | null;
  /** If true the component renders in "single-place" mode (detail page). */
  singleMode?: boolean;
}

export default function MapComponent({
  center = [10.762622, 106.660172],
  zoom = 13,
  hotels = [],
  style,
  onSelect,
  theme = "light",
  selected,
  singleMode = false,
}: MapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});

  // ---- MAIN EFFECT: create / recreate map ----
  useEffect(() => {
    if (!mapRef.current) return;

    // Inject Leaflet CSS once
    const cssHref = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    if (!document.querySelector(`link[href="${cssHref}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = cssHref;
      document.head.appendChild(link);
    }

    // Also inject our custom popup styles once
    const styleId = "map-popup-styles";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        .map-custom-popup .leaflet-popup-content-wrapper {
          border-radius: 16px;
          padding: 0;
          overflow: hidden;
          box-shadow: 0 24px 60px rgba(0,0,0,0.22);
        }
        .map-custom-popup .leaflet-popup-content { margin: 0; min-width: 240px; }
        .map-popup-card { font-family: inherit; }
        .map-popup-img-wrap { width: 100%; height: 160px; overflow: hidden; }
        .map-popup-img { width: 100%; height: 100%; object-fit: cover; }
        .map-popup-body { padding: 14px 16px 16px; }
        .map-popup-badge {
          display: inline-block; padding: 2px 10px; border-radius: 999px;
          font-size: 11px; font-weight: 600; text-transform: capitalize;
          margin-bottom: 6px;
          background: rgba(245,158,11,0.15); color: #b45309;
        }
        .map-popup-address { font-size: 11px; color: #9ca3af; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.06em; }
        .map-popup-title { font-size: 16px; font-weight: 700; margin: 0 0 6px; line-height: 1.3; }
        .map-popup-divider { height: 1px; background: #e5e7eb; margin: 8px 0; }
        .map-popup-description { font-size: 13px; color: #6b7280; margin: 0 0 8px; line-height: 1.5; max-height: 60px; overflow: hidden; }
        .map-popup-review { font-size: 13px; color: #d97706; font-weight: 600; margin: 0 0 6px; }
        .map-popup-link {
          display: inline-block; font-size: 12px; font-weight: 600;
          color: #0ea5e9; text-decoration: none; margin-top: 4px;
        }
        .map-popup-link:hover { text-decoration: underline; }
      `;
      document.head.appendChild(style);
    }

    let map: any = null;
    let cancelled = false;

    import("leaflet")
      .then((L) => {
        if (cancelled) return;

        // Fix default marker icon URLs (CDN)
        const IconDefault = L.Icon.Default as any;
        IconDefault.mergeOptions({
          iconRetinaUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          iconUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          shadowUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });

        map = L.map(mapRef.current as HTMLDivElement).setView(center, zoom);

        const lightTiles =
          "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
        const darkTiles =
          "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

        L.tileLayer(theme === "dark" ? darkTiles : lightTiles, {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 20,
        }).addTo(map);

        const bounds = L.latLngBounds([]);

        hotels.forEach((place) => {
          const coords = getPlaceLatLng(place);
          if (!coords) return; // skip places without coordinates

          const { lat, lng } = coords;
          const color = getCategoryColor(place.category);
          const label = getPlaceLabel(place);

          // SVG pin marker
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

          const marker = L.marker([lat, lng], { icon }).addTo(map);
          bounds.extend([lat, lng]);

          const key = place.id ?? `${lat},${lng}`;
          markersRef.current[key] = marker;

          // ---- Build popup HTML ----
          const imgHtml = place.featuredImage
            ? `<div class="map-popup-img-wrap"><img class="map-popup-img" src="${place.featuredImage}" alt="${label}" /></div>`
            : "";

          const catName = getCategoryName(place.category);
          const catIcon = getCategoryIcon(place.category);
          const badgeHtml = catName
            ? `<span class="map-popup-badge">${catIcon} ${catName}</span>`
            : "";

          const addressHtml = place.address
            ? `<div class="map-popup-address">${place.address}</div>`
            : "";

          const priceHtml = place.price
            ? `<p class="map-popup-review" style="margin:0;font-size:14px;color:#d97706;font-weight:600">${formatPrice(place.price)}/đêm</p>`
            : "";

          const ratingHtml = place.reviewStar
            ? `<div style="font-size:13px;color:#f59e0b;margin-bottom:4px">⭐ ${place.reviewStar}${place.reviewCount ? ` (${place.reviewCount} đánh giá)` : ""}</div>`
            : "";

          const rawDesc = (place.description || "")
            .toString()
            .replace(/\n/g, "<br/>");
          const descHtml = rawDesc
            ? `<p class="map-popup-description">${rawDesc}</p>`
            : "";

          const externalLink = coords
            ? `https://www.google.com/maps?q=${lat},${lng}`
            : "";
          const linkHtml = externalLink
            ? `<a class="map-popup-link" href="${externalLink}" target="_blank" rel="noopener noreferrer">Xem trên Google Maps ↗</a>`
            : "";

          const popupHtml = `
            <div class="map-popup-card">
              ${imgHtml}
              <div class="map-popup-body">
                ${badgeHtml}
                ${addressHtml}
                <h3 class="map-popup-title">${label}</h3>
                <div class="map-popup-divider"></div>
                ${ratingHtml}
                ${descHtml}
                ${priceHtml}
                ${linkHtml}
              </div>
            </div>
          `;

          marker.bindPopup(popupHtml, {
            maxWidth: 280,
            className: "custom-popup map-custom-popup",
          });

          marker.on("click", () => {
            if (onSelect) onSelect(place);
            marker.openPopup();
          });

          const tooltipText = catName ? catName.toUpperCase() : "PLACE";
          marker.bindTooltip(tooltipText);
        });

        // Fit bounds or center on single marker
        if (!singleMode) {
          if (hotels.length > 1) {
            map.fitBounds(bounds.pad(0.2), { animate: true, duration: 0.7 });
          } else if (hotels.length === 1 && hotels[0]) {
            const firstCoords = getPlaceLatLng(hotels[0]);
            const firstLat = firstCoords?.lat ?? center[0];
            const firstLng = firstCoords?.lng ?? center[1];
            map.setView([firstLat, firstLng], Math.max(zoom, 14));
          }
        }

        leafletMapRef.current = map;
      })
      .catch((err) => {
        console.error("Leaflet failed to load", err);
      });

    return () => {
      cancelled = true;
      if (map) {
        try {
          map.remove();
        } catch (_) {
          /* ignore */
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1], zoom, JSON.stringify(hotels), theme, singleMode]);

  // ---- React to external `selected` prop ----
  useEffect(() => {
    if (!selected) return;
    const map = leafletMapRef.current;
    if (!map) return;

    const coords = getPlaceLatLng(selected);
    if (!coords) return;

    const key = selected.id ?? `${coords.lat},${coords.lng}`;
    const marker = markersRef.current[key];
    if (marker) {
      try {
        marker.openPopup();
      } catch (_) {
        /* ignore */
      }
    }

    try {
      map.flyTo([coords.lat, coords.lng], 15, { duration: 0.7 });
    } catch (_) {
      /* ignore */
    }
  }, [selected]);

  return (
    <div
      ref={mapRef}
      style={{
        height: "100vh",
        width: "100%",
        zIndex: 1,
        ...(style || {}),
      }}
    />
  );
}
