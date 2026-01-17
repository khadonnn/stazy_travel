'use client';

import React, { useEffect, useState } from 'react';

const ROWS = 20;
const COLS = 20;

// Định nghĩa kiểu dữ liệu cho state để TypeScript không báo lỗi
type MatrixData = {
    id: number;
    row: number;
    col: number;
    type: number;
};

const SparsityHeatmap = () => {
    // 1. State lưu dữ liệu (Khởi tạo là null để biết đang loading)
    const [data, setData] = useState<{ matrix: MatrixData[]; sparsity: string } | null>(null);

    // 2. Chuyển logic Math.random() vào useEffect
    useEffect(() => {
        let filledCount = 0;
        const totalCells = ROWS * COLS;

        const generatedMatrix = Array.from({ length: totalCells }, (_, i) => {
            // Logic random giữ nguyên
            const isInteraction = Math.random() > 0.85;
            if (isInteraction) filledCount++;

            const type = isInteraction ? (Math.random() > 0.5 ? 2 : 1) : 0;

            return {
                id: i,
                row: Math.floor(i / COLS),
                col: i % COLS,
                type: type,
            };
        });

        const sparsityRate = ((totalCells - filledCount) / totalCells) * 100;

        // Cập nhật state sau khi component đã mount
        setData({
            matrix: generatedMatrix,
            sparsity: sparsityRate.toFixed(1),
        });
    }, []); // [] rỗng để chỉ chạy 1 lần khi mount

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

    // 3. Render trạng thái Loading (Skeleton) khi chưa có dữ liệu để tránh lỗi Hydration
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
                    Matrix: {ROWS} Users x {COLS} Items
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">Độ thưa (Sparsity):</span>
                    {/* Bây giờ data.sparsity được lấy từ state client-side hoàn toàn */}
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
                {data.matrix.map((cell) => (
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
        </div>
    );
};

export default SparsityHeatmap;
