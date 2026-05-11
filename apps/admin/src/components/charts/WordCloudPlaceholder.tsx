'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import cloud from 'd3-cloud';

interface WordCloudItem {
    text: string;
    value: number;
}

interface WordCloudChartProps {
    data?: WordCloudItem[];
}

const WordCloudChart = ({ data: propData = [] }: WordCloudChartProps) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isMounted, setIsMounted] = useState(false);

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
        if (!isMounted || !svgRef.current || propData.length === 0) return;

        const width = 400;
        const height = 300;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const layout = cloud()
            .size([width, height])
            .words(
                propData.map((d) => ({
                    text: d.text,
                    size: d.value,
                    value: d.value,
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
                .style('transition', 'opacity 0.2s')

                .on('mouseover', function (event, d: any) {
                    d3.select(svgRef.current).selectAll('text').style('opacity', 0.3);
                    d3.select(this).style('opacity', 1);

                    const [mouseX, mouseY] = d3.pointer(event, containerRef.current);

                    setTooltip({
                        visible: true,
                        x: mouseX,
                        y: mouseY,
                        text: d.text,
                        value: d.value,
                    });
                })
                .on('mousemove', function (event) {
                    const [mouseX, mouseY] = d3.pointer(event, containerRef.current);
                    setTooltip((prev) => ({ ...prev, x: mouseX, y: mouseY }));
                })
                .on('mouseout', function () {
                    d3.select(svgRef.current).selectAll('text').style('opacity', 1);
                    setTooltip((prev) => ({ ...prev, visible: false }));
                });
        }
    }, [isMounted, propData]);

    if (!propData || propData.length === 0) {
        return (
            <div className="flex h-full w-full items-center justify-center rounded-lg border border-[#27272A] bg-[#18181B] p-2 text-gray-500">
                Chưa có dữ liệu bình luận
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="relative flex h-full w-full flex-col items-center justify-center rounded-lg border border-[#27272A] bg-[#18181B] p-2"
        >
            <h3 className="mb-2 w-full px-2 text-sm font-semibold text-white">Từ khóa nổi bật (Sentiment)</h3>

            <div className="relative flex h-[300px] w-full items-center justify-center overflow-hidden">
                <svg
                    ref={svgRef}
                    viewBox="0 0 400 300"
                    className="h-full w-full max-w-[400px]"
                    preserveAspectRatio="xMidYMid meet"
                />
            </div>

            {tooltip.visible && (
                <div
                    className="pointer-events-none absolute z-50 rounded-md border border-[#b4b4bd] bg-[#18181B] px-3 py-2 shadow-xl"
                    style={{
                        left: tooltip.x,
                        top: tooltip.y,
                        transform: 'translate(-50%, -120%)',
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
