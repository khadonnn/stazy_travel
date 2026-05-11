'use client';

import React from 'react';

interface SparsityDataProps {
    totalUsers: number;
    totalItems: number;
    totalInteractions: number;
    sparsity: number;
}

interface SparsityHeatmapProps {
    data?: SparsityDataProps;
}

const ROWS = 20;
const COLS = 20;

const SparsityHeatmap = ({ data }: SparsityHeatmapProps) => {
    // Generate visualization matrix based on real sparsity rate
    const sparsityRate = data?.sparsity ?? 100;
    const interactionRate = (100 - sparsityRate) / 100;

    const matrix = Array.from({ length: ROWS * COLS }, (_, i) => {
        // Use deterministic pattern based on sparsity rate
        const rand = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
        const isInteraction = rand - Math.floor(rand) < interactionRate;
        const type = isInteraction ? (i % 3 === 0 ? 2 : 1) : 0;
        return {
            id: i,
            row: Math.floor(i / COLS),
            col: i % COLS,
            type,
        };
    });

    const getColor = (type: number) => {
        switch (type) {
            case 2:
                return 'bg-yellow-500 hover:bg-yellow-400';
            case 1:
                return 'bg-blue-500 hover:bg-blue-400';
            default:
                return 'bg-[#27272A] hover:bg-[#3F3F46]';
        }
    };

    if (!data) {
        return (
            <div className="flex h-full w-full animate-pulse flex-col items-center justify-center p-2">
                <div className="mb-3 flex w-full justify-between px-1">
                    <div className="h-4 w-24 rounded bg-[#27272A]"></div>
                    <div className="h-4 w-12 rounded bg-[#27272A]"></div>
                </div>
                <div className="h-[200px] w-full rounded bg-[#27272A]"></div>
            </div>
        );
    }

    return (
        <div className="flex h-full w-full flex-col items-center justify-center p-2">
            <div className="mb-3 flex w-full items-center justify-between px-1">
                <div className="text-muted-foreground text-md font-medium">
                    Matrix: {data.totalUsers} Users x {data.totalItems} Items
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">Độ thưa:</span>
                    <span className="text-sm font-bold text-red-400">{data.sparsity}%</span>
                </div>
            </div>

            <div
                className="grid w-full gap-[1px] overflow-hidden rounded border border-[#27272A] bg-[#18181B] p-1 shadow-inner"
                style={{
                    gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
                    aspectRatio: '1/1',
                    height: '100%',
                    width: '100%',
                }}
            >
                {matrix.map((cell) => (
                    <div
                        key={cell.id}
                        className={`h-full w-full rounded-[1px] transition-colors duration-200 ${getColor(cell.type)}`}
                        title={`User ${cell.row} - Item ${cell.col}: ${
                            cell.type === 0 ? 'Empty' : cell.type === 2 ? 'Booking' : 'View'
                        }`}
                    />
                ))}
            </div>

            <div className="text-muted-foreground mt-3 flex w-full justify-center gap-4 text-[10px]">
                <div className="flex items-center gap-1">
                    <span className="h-4 w-4 rounded-[1px] border border-gray-600 bg-[#27272A]"></span>
                    <span>Missing</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="h-4 w-4 rounded-[1px] bg-blue-500"></span>
                    <span>View</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="h-4 w-4 rounded-[1px] bg-yellow-500"></span>
                    <span>Booking</span>
                </div>
            </div>

            <div className="text-muted-foreground mt-2 flex w-full justify-center gap-3 text-[10px]">
                <span>Tổng interactions: {data.totalInteractions.toLocaleString()}</span>
            </div>
        </div>
    );
};

export default SparsityHeatmap;
