import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
export const formatCurrency = (amount: number) => {
    const valueInThousands = amount / 1000;
    const formattedValue = new Intl.NumberFormat('vi-VN', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(valueInThousands);
    return `${formattedValue}K`;
};
export const formatPercent = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    // Nếu giá trị > 1 (VD: 74.19), giả định nó đã là % -> Giữ nguyên
    if (value > 1) return `${value.toFixed(1)}%`;
    // Nếu giá trị <= 1 (VD: 0.7419), giả định nó là số thập phân -> Nhân 100
    return `${(value * 100).toFixed(1)}%`;
};
