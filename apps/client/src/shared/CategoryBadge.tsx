import type { StayCategory, TwMainColor } from '@/types/stay';
import { Badge } from '@/components/ui/badge';

const colorMap: Record<TwMainColor, string> = {
    pink: 'bg-pink-100 text-pink-800',
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
    indigo: 'bg-indigo-100 text-indigo-800',
    blue: 'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800',
    gray: 'bg-gray-100 text-gray-800',
};

export default function CategoryBadge({
    category,
}: {
    category?: StayCategory;
}) {
    const classes = category?.color ? colorMap[category.color] : colorMap.gray;

    return (
        <Badge
            variant='outline'
            className={`${classes} border-none py-2 text-sm `}
        >
            {category?.icon} {category?.name || 'Chưa xác định'}
        </Badge>
    );
}
