"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Place, getPlaceLabel, getCategoryName } from "../types/map-types";
import MapComponent from "./map";
import LocationCard from "./location-card";

export default function MapLayout({ places }: { places?: Place[] }) {
  const [selected, setSelected] = useState<Place | null>(null);
  const [themeDark, setThemeDark] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [cityFilter, setCityFilter] = useState<string>("all");
  console.log("places", places);
  const allPlaces = useMemo(() => (places?.length ? places : []), [places]);

  // Extract unique category names
  const categories = useMemo(() => {
    const unique = new Set<string>();
    allPlaces.forEach((place) => {
      const catName = getCategoryName(place.category);
      unique.add(catName);
    });
    return Array.from(unique);
  }, [allPlaces]);

  const filteredPlaces = useMemo(() => {
    return allPlaces.filter((place) => {
      const catName = getCategoryName(place.category);
      const city = (place.city || "").toLowerCase();
      const matchesCategory = !filter || catName === filter;
      const matchesCity =
        cityFilter === "all" || city === cityFilter.toLowerCase();
      return matchesCategory && matchesCity;
    });
  }, [allPlaces, filter, cityFilter]);

  const selectedPlace = selected;

  const cityOptions = useMemo(() => {
    const unique = new Set<string>();
    allPlaces.forEach((place) => {
      if (place.city) unique.add(place.city);
    });
    return Array.from(unique);
  }, [allPlaces]);

  const placeCount = filteredPlaces.length;
  const cityCount = new Set(
    filteredPlaces.map((place) => place.city).filter(Boolean),
  ).size;

  useEffect(() => {
    setSelected(null);
  }, [filter, cityFilter]);

  return (
    <section className="relative overflow-hidden py-8">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-8 space-y-3">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
            Map
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            All the wonderful places that I visited, memories in a map.
          </p>
          <p className="text-sm text-muted-foreground">
            {placeCount} places <span className="mx-2 opacity-50">·</span>{" "}
            {cityCount} cities
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <div className="space-y-4 rounded-2xl border border-border/50 bg-card/70 p-4 backdrop-blur-sm">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Location
              </p>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${!filter ? "active-filter" : "border-border/60 hover:border-amber-400 hover:text-amber-400"}`}
                    onClick={() => setFilter(null)}
                  >
                    All
                    <span className="ml-2 rounded-full bg-black/15 px-2 py-0.5 text-xs">
                      {allPlaces.length}
                    </span>
                  </button>

                  {categories.map((category) => {
                    const count = allPlaces.filter(
                      (place) => getCategoryName(place.category) === category,
                    ).length;

                    return (
                      <button
                        key={category}
                        className={`rounded-xl border px-3 py-2 text-sm font-medium capitalize transition-colors ${filter === category ? "active-filter" : "border-border/60 hover:border-amber-400 hover:text-amber-400"}`}
                        onClick={() => setFilter(category)}
                      >
                        {category}
                        <span className="ml-2 rounded-full bg-black/15 px-2 py-0.5 text-xs">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  City
                </label>
                <select
                  value={cityFilter}
                  onChange={(event) => setCityFilter(event.target.value)}
                  className="w-full rounded-2xl border border-border/60 bg-background/80 px-4 py-3 text-sm outline-none transition-colors focus:border-amber-400"
                >
                  <option value="all">All Cities ({cityOptions.length})</option>
                  {cityOptions.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="max-h-[calc(100vh-560px)] space-y-3 overflow-y-auto pr-1 scrollbar-thin">
              {filteredPlaces.map((place) => {
                const isActive =
                  selectedPlace?.id === place.id ||
                  selectedPlace?.title === place.title;

                return (
                  <div
                    key={place.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelected(place)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        setSelected(place);
                    }}
                    style={{
                      cursor: "pointer",
                      outline: "none",
                      borderRadius: "1.5rem",
                      transition: "box-shadow 0.2s, transform 0.2s",
                      boxShadow: isActive
                        ? "0 0 0 3px rgba(245,158,11,0.3)"
                        : undefined,
                    }}
                  >
                    <LocationCard place={place} />
                  </div>
                );
              })}
            </div>
          </aside>

          <section className="space-y-5">
            <div
              className={`overflow-hidden rounded-[1.5rem] border shadow-[0_24px_80px_rgba(0,0,0,0.25)] ${themeDark ? "border-white/10 bg-slate-950" : "border-border/60 bg-background"}`}
            >
              <MapComponent
                hotels={filteredPlaces}
                onSelect={(place) => setSelected(place)}
                selected={selectedPlace}
                theme={themeDark ? "dark" : "light"}
                style={{ height: 620 }}
              />
            </div>

            <p className="text-sm text-muted-foreground">
              Bấm vào marker màu cam trên bản đồ để xem popup chi tiết địa điểm.
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}
