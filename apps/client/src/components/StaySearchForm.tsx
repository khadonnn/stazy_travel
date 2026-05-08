"use client";

import { useMemo } from "react";
import StayDatesRangeInput from "@/components/StayDatesRangeInput";
import GuestsInput from "@/components/GuestsInput";
import LocationInput from "@/components/LocationInput";
import { useBookingStore } from "@/store/useBookingStore";

const StaySearchForm = () => {
  const { location, checkInDate, checkOutDate, guests } = useBookingStore();

  // Build search URL with query params from store
  const searchHref = useMemo(() => {
    const params = new URLSearchParams();

    if (location) {
      params.set("search", location);
    }
    if (checkInDate instanceof Date) {
      params.set("checkIn", checkInDate.toISOString().split("T")[0]!);
    }
    if (checkOutDate instanceof Date) {
      params.set("checkOut", checkOutDate.toISOString().split("T")[0]!);
    }
    if (guests.adults > 0) {
      params.set("adults", guests.adults.toString());
    }
    if (guests.children > 0) {
      params.set("children", guests.children.toString());
    }

    const queryString = params.toString();
    return `/hotels${queryString ? `?${queryString}` : ""}`;
  }, [location, checkInDate, checkOutDate, guests]);

  return (
    <form className="w-full h-[90px] relative mt-8 flex rounded-full shadow-xl dark:shadow-2xl bg-white dark:bg-neutral-800">
      <LocationInput className="flex-[1.5]" />
      <div className="self-center border-r border-slate-200 dark:border-slate-700 h-8"></div>
      <StayDatesRangeInput className="flex-1" />
      <div className="self-center border-r border-slate-200 dark:border-slate-700 h-8"></div>
      <GuestsInput
        className="flex-1"
        hasButtonSubmit
        buttonSubmitHref={searchHref}
      />
    </form>
  );
};

export default StaySearchForm;
