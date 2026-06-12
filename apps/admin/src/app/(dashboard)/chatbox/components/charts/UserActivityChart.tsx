'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { UserAccessData } from '../../types/chat';

interface UserActivityChartProps {
    data: UserAccessData;
}

export function UserActivityChart({ data }: UserActivityChartProps) {
    const chartData = data.daily_active_users.map((d) => ({
        ...d,
        date: d.date.slice(5),
    }));

    return (
        <div className="space-y-3">
            {/* Daily Active Users Chart */}
            {data.daily_active_users.length > 0 && (
                <div>
                    <div className="text-muted-foreground mb-2 text-[11px] font-medium">👥 User active theo ngày</div>
                    <ResponsiveContainer width="100%" height={140}>
                        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip formatter={(v: number) => [`${v} users`, '']} />
                            <Line type="monotone" dataKey="users" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 2 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Top Users */}
            {data.top_users.length > 0 && (
                <div>
                    <div className="text-muted-foreground mb-2 text-[11px] font-medium">⭐ Top người dùng</div>
                    <div className="space-y-1">
                        {data.top_users.map((u, i) => (
                            <div key={u.userId} className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">
                                    #{i + 1} {u.userId}
                                </span>
                                <span className="font-medium">
                                    {u.bookings} booking · {(u.total_spent / 1_000_000).toFixed(1)}M VND
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
