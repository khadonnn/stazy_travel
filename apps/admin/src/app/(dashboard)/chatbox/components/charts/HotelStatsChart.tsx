'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { HotelStatsData } from '../../types/chat';

interface HotelStatsChartProps {
    data: HotelStatsData;
}

export function HotelStatsChart({ data }: HotelStatsChartProps) {
    return (
        <div className="space-y-3">
            {/* Top Hotels Bar Chart */}
            {data.top_hotels.length > 0 && (
                <div>
                    <div className="text-muted-foreground mb-2 text-[11px] font-medium">🏆 Top khách sạn đặt nhiều</div>
                    <ResponsiveContainer width="100%" height={160}>
                        <BarChart
                            data={data.top_hotels}
                            layout="vertical"
                            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis type="number" tick={{ fontSize: 10 }} />
                            <YAxis dataKey="title" type="category" tick={{ fontSize: 9 }} width={100} />
                            <Tooltip formatter={(v: number) => [`${v} booking`, '']} />
                            <Bar dataKey="bookings" fill="#6366f1" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Category Distribution */}
            {data.category_distribution.length > 0 && (
                <div>
                    <div className="text-muted-foreground mb-2 text-[11px] font-medium">📊 Phân bố theo loại</div>
                    <ResponsiveContainer width="100%" height={120}>
                        <BarChart data={data.category_distribution} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Bar dataKey="bookings" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Bookings" />
                            <Bar dataKey="count" fill="#94a3b8" radius={[4, 4, 0, 0]} name="Số KS" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}
