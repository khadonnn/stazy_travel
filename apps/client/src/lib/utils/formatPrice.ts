import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Format Price ───────────────────────────────────────
export const formatPrice = (
  value: number | string | { toNumber?: () => number } | null | undefined,
  options: {
    showCurrency?: boolean; // mặc định: true
    showFree?: boolean; // mặc định: true → nếu 0 thì hiện "Miễn phí"
    locale?: string; // mặc định: 'vi-VN'
  } = {}
): string => {
  const { showCurrency = true, showFree = true, locale = "vi-VN" } = options;

  // 1. Xử lý giá trị null/undefined/0
  if (value == null) return showFree ? "—" : "";
  if (value === 0 && showFree) return "Miễn phí";

  // 2. Chuẩn hóa về number
  let num: number;
  if (typeof value === "number") {
    num = value;
  } else if (typeof value === "string") {
    num = parseFloat(value) || 0;
  } else if (typeof value === "object" && "toNumber" in value) {
    // Hỗ trợ Decimal (Prisma)
    num = (value as any).toNumber();
  } else {
    num = 0;
  }

  // 3. Làm tròn 0 chữ số thập phân (VND không có xu)
  num = Math.round(num);

  // 4. Định dạng
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const formatted = formatter.format(num);
  const currency = showCurrency ? " ₫" : "";

  return formatted + currency;
};
