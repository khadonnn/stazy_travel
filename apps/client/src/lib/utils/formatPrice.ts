import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
const formatPrice = (value: number) => value.toLocaleString('vi-VN'); // => "6.700.000"

export { formatPrice };
