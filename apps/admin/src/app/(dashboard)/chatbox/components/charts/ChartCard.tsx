import { useState, ReactNode } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface ChartCardProps {
    title: string;
    icon?: ReactNode;
    children: ReactNode;
    defaultHeight?: number;
    expanded?: boolean;
}

export function ChartCard({ title, icon, children, defaultHeight = 160 }: ChartCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="bg-background rounded-lg border">
            <div className="flex items-center justify-between border-b px-3 py-1.5">
                <div className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-medium">
                    {icon}
                    {title}
                </div>
                <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
                    <DialogTrigger asChild>
                        <button className="text-muted-foreground hover:bg-muted rounded p-0.5 transition-colors">
                            <Maximize2 className="h-3 w-3" />
                        </button>
                    </DialogTrigger>
                    <DialogContent className="h-[80vh] max-w-4xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-sm">
                                {icon}
                                {title}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="flex-1">{children}</div>
                    </DialogContent>
                </Dialog>
            </div>
            <div className="p-3" style={{ height: defaultHeight }}>
                {children}
            </div>
        </div>
    );
}
