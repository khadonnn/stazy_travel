'use client';

interface TypingIndicatorProps {
    skeletonType?: 'chart' | 'card' | 'text';
}

function ChartSkeleton({ height = 160 }: { height?: number }) {
    return (
        <div className="bg-background animate-pulse rounded-lg border p-2">
            <div className="bg-muted mb-1 h-3 w-24 rounded" />
            <div className="bg-muted/50 rounded" style={{ height }} />
        </div>
    );
}

function CardSkeleton() {
    return (
        <div className="animate-pulse space-y-2">
            <div className="flex gap-2">
                <div className="bg-muted h-14 flex-1 rounded-lg" />
                <div className="bg-muted h-14 flex-1 rounded-lg" />
                <div className="bg-muted h-14 flex-1 rounded-lg" />
            </div>
            <ChartSkeleton height={120} />
        </div>
    );
}

function TextSkeleton() {
    return (
        <div className="flex items-center gap-1 p-2">
            <div className="bg-muted-foreground/50 h-2 w-2 animate-bounce rounded-full [animation-delay:0ms]" />
            <div className="bg-muted-foreground/50 h-2 w-2 animate-bounce rounded-full [animation-delay:150ms]" />
            <div className="bg-muted-foreground/50 h-2 w-2 animate-bounce rounded-full [animation-delay:300ms]" />
        </div>
    );
}

export function TypingIndicator({ skeletonType = 'text' }: TypingIndicatorProps) {
    return (
        <div className="flex justify-start gap-3">
            <div className="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                <div className="bg-primary h-4 w-4 animate-pulse rounded-full" />
            </div>
            <div className="bg-muted max-w-[85%] rounded-lg px-4 py-2">
                {skeletonType === 'card' ? (
                    <CardSkeleton />
                ) : skeletonType === 'chart' ? (
                    <ChartSkeleton />
                ) : (
                    <TextSkeleton />
                )}
            </div>
        </div>
    );
}
