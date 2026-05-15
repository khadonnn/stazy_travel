'use client';
import { useTheme } from 'next-themes';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ActivityCalendar, BlockElement, ThemeInput } from 'react-activity-calendar';

type CalendarData = {
    date: string;
    count: number;
    level: number;
};

const githubTheme: ThemeInput = {
    light: ['#DDDDDD', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
    dark: ['#393E46', '#39d353', '#26a641', '#006d32', '#0e4429'],
};

interface ContributionChartProps {
    data?: CalendarData[];
    totalCount?: number;
}

const ContributionChart = ({ data: propData, totalCount }: ContributionChartProps) => {
    const { resolvedTheme } = useTheme();

    // Use prop data or empty array fallback
    const data: CalendarData[] = propData && propData.length > 0 ? propData : [];

    const total = totalCount ?? data.reduce((sum, d) => sum + d.count, 0);

    // Custom block rendering function for activity blocks
    const renderBlock = (block: BlockElement, activity: CalendarData) => {
        const date = new Date(activity.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });

        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>{block}</TooltipTrigger>
                    <TooltipContent>
                        <p>
                            {date}: {activity.count} activities
                        </p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    };

    // Custom rendering for color legend
    const renderColorLegend = (block: BlockElement, level: number) => (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>{block}</TooltipTrigger>
                <TooltipContent>
                    <p>Level: {level}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );

    if (data.length === 0) {
        return (
            <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
                No contribution data available
            </div>
        );
    }

    return (
        <ActivityCalendar
            blockMargin={4}
            blockRadius={2}
            blockSize={10}
            colorScheme={resolvedTheme === 'light' ? 'light' : 'dark'}
            data={data}
            fontSize={14}
            labels={{
                totalCount: `${total} activities in the last year`,
            }}
            maxLevel={4}
            weekStart={0}
            showWeekdayLabels={true}
            style={{ paddingBottom: 20, marginBottom: 20 }}
            theme={githubTheme}
            renderBlock={renderBlock}
            renderColorLegend={renderColorLegend}
        />
    );
};

export default ContributionChart;
