"use client";

import { useEffect, useRef } from "react";
import { trackInteraction } from "@/actions/tracking";

export const useViewTracker = (hotelId: number) => {
  // 1. Dùng Ref để lưu trạng thái đã track hay chưa
  // useRef giữ nguyên giá trị qua các lần re-render mà không gây render lại
  const hasTrackedView = useRef(false);
  const startTime = useRef(Date.now());

  useEffect(() => {
    // Nếu cờ này đã bật (true), nghĩa là đã track rồi -> Dừng ngay
    if (hasTrackedView.current) return;

    // Đánh dấu là đã track
    hasTrackedView.current = true;

    // Ghi nhận hành động VIEW
    // Lưu ý: Không cần await ở đây để tránh block UI
    trackInteraction(hotelId, "VIEW");

    // Cleanup: Ghi nhận thời gian xem khi component unmount
    return () => {
      const durationSeconds = Math.floor(
        (Date.now() - startTime.current) / 1000
      );

      // Chỉ ghi nhận nếu xem > 5 giây
      if (durationSeconds > 5) {
        trackInteraction(hotelId, "VIEW", { duration: durationSeconds });
      }
    };
  }, [hotelId]);
};
