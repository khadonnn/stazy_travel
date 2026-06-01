"use client";
import * as React from "react";
import { CalendarIcon } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import ClearDataButton from "./ClearDataButton";
import { cn } from "@/lib/utils";
import { useBookingStore } from "@/store/useBookingStore";
import { useLocale, useTranslations } from "next-intl"; // <--- 1. Import hook hệ thống i18n

export interface StayDatesRangeInputProps {
  className?: string;
  fieldClassName?: string;
}

export default function StayDatesRangeInput({
  className = "lg:flex-[2]",
  fieldClassName = "px-4 py-2",
}: StayDatesRangeInputProps) {
  const currentLocale = useLocale(); // <--- 2. Lấy ngôn ngữ đang active (vi hoặc en)
  const t = useTranslations("StayDatesRangeInput"); // <--- 3. Khởi tạo namespace

  // Lấy date từ store
  const date = useBookingStore((s) => s.date);
  const setDate = useBookingStore((s) => s.setDate);

  // Derived checkInDate, checkOutDate từ date
  const checkInDate = date?.from;
  const checkOutDate = date?.to;

  const [open, setOpen] = React.useState(false);

  // Cấu hình hiển thị format ngày rút gọn
  const dateFormatOptions: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "2-digit",
  };

  const renderInput = () => (
    <>
      <div className="text-neutral-300 dark:text-neutral-400">
        <CalendarIcon className="w-5 h-5 lg:w-7 lg:h-7" />
      </div>
      <div className="flex-grow text-left">
        <span className="block xl:text-lg font-semibold">
          {/* 4. Truyền động currentLocale vào hàm format ngày thay vì fix cứng "en-US" */}
          {checkInDate
            ? `${checkInDate.toLocaleDateString(currentLocale, dateFormatOptions)}`
            : t("addDates")}{" "}
          {/* <--- Dịch chữ "Thêm ngày" */}
          {checkOutDate
            ? " - " +
              checkOutDate.toLocaleDateString(currentLocale, dateFormatOptions)
            : ""}
        </span>
        <span className="block mt-1 text-sm text-neutral-400 leading-none font-light">
          {t("dateRangeLabel")} {/* <--- Dịch chữ "Đặt phòng - Trả phòng" */}
        </span>
      </div>
    </>
  );

  const isSSR = typeof window === "undefined";
  const popoverKey = isSSR ? "ssr" : "csr";

  return (
    <Popover open={open} onOpenChange={setOpen} key={popoverKey}>
      <PopoverTrigger asChild>
        <button
          suppressHydrationWarning={true}
          type="button"
          className={cn(
            "flex-1 z-10 flex relative items-center space-x-4 focus:outline-none",
            fieldClassName,
            className,
            open && "cus-hero-field-focused",
          )}
        >
          {renderInput()}
          {date?.from && <ClearDataButton onClick={() => setDate(undefined)} />}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0 bg-white dark:bg-neutral-800 rounded-3xl shadow-lg overflow-hidden">
        {/* Để component lịch đồng bộ ngôn ngữ (Thứ, Tháng), bạn có thể truyền locale của date-fns vào đây nếu component Calendar của bạn có hỗ trợ prop locale */}
        <Calendar
          mode="range"
          selected={date}
          onSelect={(range) => setDate(range ?? undefined)}
          numberOfMonths={2}
          disabled={{ before: new Date() }}
        />
      </PopoverContent>

      {open && (
        <div className="h-8 absolute self-center top-1/2 -translate-y-1/2 z-0 -left-0.5 right-0.5 bg-white dark:bg-neutral-800 rounded-full"></div>
      )}
    </Popover>
  );
}
