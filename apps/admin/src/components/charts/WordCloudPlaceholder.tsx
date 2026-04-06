'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import cloud from 'd3-cloud';

// Dữ liệu mẫu
const data = [
    { text: 'Sạch sẽ', value: 100 },
    { text: 'Nhân viên thân thiện', value: 85 },
    { text: 'Gần trung tâm', value: 80 },
    { text: 'Wifi mạnh', value: 70 },
    { text: 'Bể bơi đẹp', value: 65 },
    { text: 'Giá hợp lý', value: 60 },
    { text: 'Yên tĩnh', value: 55 },
    { text: 'Đồ ăn ngon', value: 50 },
    { text: 'View biển', value: 45 },
    { text: 'Sang trọng', value: 40 },
    { text: 'Hơi ồn', value: 30 },
    { text: 'Phòng nhỏ', value: 25 },
    { text: 'Xa sân bay', value: 20 },
    { text: 'Gym', value: 15 },
    { text: 'Spa', value: 15 },
];

const WordCloudChart = () => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null); // Ref để tính tọa độ tooltip
    const [isMounted, setIsMounted] = useState(false);

    // State quản lý Tooltip
    const [tooltip, setTooltip] = useState({
        visible: false,
        x: 0,
        y: 0,
        text: '',
        value: 0,
    });

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!isMounted || !svgRef.current) return;

        const width = 400;
        const height = 300;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const layout = cloud()
            .size([width, height])
            .words(
                data.map((d) => ({
                    text: d.text,
                    size: d.value,
                    value: d.value, // Quan trọng: Truyền giá trị gốc vào đây để dùng cho tooltip
                })),
            )
            .padding(5)
            .rotate(() => Math.floor(Math.random() * 2) * 90)
            .font('Inter')
            .fontSize((d) => Math.sqrt(d.size || 0) * 5)
            .on('end', draw);

        layout.start();

        function draw(words: any[]) {
            const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2})`);

            const colors = ['#fbbf24', '#34d399', '#60a5fa', '#f87171', '#a78bfa'];

            g.selectAll('text')
                .data(words)
                .enter()
                .append('text')
                .style('font-size', (d: any) => `${d.size}px`)
                .style('font-family', 'Inter, sans-serif')
                .style('fill', (_d, i) => colors[i % colors.length] || '#ffffff')
                .attr('text-anchor', 'middle')
                .attr('transform', (d: any) => `translate(${d.x},${d.y})rotate(${d.rotate})`)
                .text((d: any) => d.text)
                .style('cursor', 'pointer')
                .style('transition', 'opacity 0.2s') // Hiệu ứng mờ khi hover

                // --- XỬ LÝ SỰ KIỆN TOOLTIP ---
                .on('mouseover', function (event, d: any) {
                    // Làm mờ các chữ khác để nổi bật chữ đang hover
                    d3.select(svgRef.current).selectAll('text').style('opacity', 0.3);
                    d3.select(this).style('opacity', 1);

                    // Cập nhật vị trí và nội dung Tooltip
                    // Lấy toạ độ chuột tương đối với container
                    const [mouseX, mouseY] = d3.pointer(event, containerRef.current);

                    setTooltip({
                        visible: true,
                        x: mouseX,
                        y: mouseY,
                        text: d.text,
                        value: d.value, // Lấy giá trị gốc từ bước map ở trên
                    });
                })
                .on('mousemove', function (event) {
                    // Cập nhật vị trí toolip theo chuột khi di chuyển
                    const [mouseX, mouseY] = d3.pointer(event, containerRef.current);
                    setTooltip((prev) => ({ ...prev, x: mouseX, y: mouseY }));
                })
                .on('mouseout', function () {
                    // Reset lại độ mờ
                    d3.select(svgRef.current).selectAll('text').style('opacity', 1);

                    // Ẩn Tooltip
                    setTooltip((prev) => ({ ...prev, visible: false }));
                });
        }
    }, [isMounted]);

    return (
        <div
            ref={containerRef}
            className="relative flex h-full w-full flex-col items-center justify-center rounded-lg border border-[#27272A] bg-[#18181B] p-2"
        >
            <h3 className="mb-2 w-full px-2 text-sm font-semibold text-white"> Từ khóa nổi bật (Sentiment)</h3>

            <div className="relative flex h-[300px] w-full items-center justify-center overflow-hidden">
                <svg
                    ref={svgRef}
                    viewBox="0 0 400 300"
                    className="h-full w-full max-w-[400px]"
                    preserveAspectRatio="xMidYMid meet"
                />
            </div>

            {/* --- PHẦN TOOLTIP CUSTOM --- */}
            {tooltip.visible && (
                <div
                    className="pointer-events-none absolute z-50 rounded-md border border-[#b4b4bd] bg-[#18181B] px-3 py-2 shadow-xl"
                    style={{
                        left: tooltip.x,
                        top: tooltip.y,
                        transform: 'translate(-50%, -120%)', // Đẩy tooltip lên trên con trỏ chuột một chút
                        minWidth: '120px',
                    }}
                >
                    <p className="mb-1 text-sm font-bold text-white">{tooltip.text}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-300">
                        <span className="h-2 w-2 rounded-full bg-yellow-400"></span>
                        <span>{tooltip.value} lượt nhắc</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WordCloudChart;
