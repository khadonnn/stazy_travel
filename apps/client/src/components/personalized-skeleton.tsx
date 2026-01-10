import { cn } from "@/lib/utils";
import { Skeleton } from "./ui/skeleton";

export function PersonalizedSkeleton() {
  return (
    <div className="py-12 px-4 md:px-8 max-w-7xl mx-auto">
      {/* Header Skeleton */}
      <div className="mb-8 flex items-center gap-2">
        <Skeleton className="w-6 h-6 rounded-full" />
        <Skeleton className="h-8 w-64 rounded-lg" />
      </div>

      {/* Grid Layout Skeleton (Mô phỏng 4 cột) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[minmax(180px,auto)]">
        {/* Item 0: Hero (2x2) */}
        <Skeleton className="md:col-span-2 md:row-span-2 h-full min-h-[400px] rounded-3xl" />

        {/* Item 1, 2, 3, 4: Small (1x1) */}
        <Skeleton className="h-[200px] rounded-3xl" />
        <Skeleton className="h-[200px] rounded-3xl" />
        <Skeleton className="h-[200px] rounded-3xl" />
        <Skeleton className="h-[200px] rounded-3xl" />

        {/* Item 5: Small (1x1) */}
        <Skeleton className="h-[200px] rounded-3xl" />

        {/* Item 6: Wide (3x1) */}
        <Skeleton className="md:col-span-3 h-[200px] rounded-3xl" />
      </div>
    </div>
  );
}
