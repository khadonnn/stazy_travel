'use client';

import { HotelStatsData, UserAccessData, AnomalyData } from '../../types/chat';
import { Building2, Users, AlertTriangle, DollarSign } from 'lucide-react';

interface Column {
    key: string;
    label: string;
    align?: 'left' | 'right' | 'center';
    format?: 'number' | 'vnd' | 'text';
}

interface TableCardProps {
    title: string;
    icon?: React.ReactNode;
    columns: Column[];
    data: Record<string, any>[];
    maxRows?: number;
}

const formatVND = (amount: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

function formatCell(value: any, format?: string): string {
    if (value === null || value === undefined) return '-';
    switch (format) {
        case 'vnd':
            return formatVND(Number(value));
        case 'number':
            return Number(value).toLocaleString('vi-VN');
        default:
            return String(value);
    }
}

export function TableCard({ title, icon, columns, data, maxRows = 5 }: TableCardProps) {
    if (!data || data.length === 0) return null;

    const rows = data.slice(0, maxRows);

    return (
        <div className="rounded-lg border bg-white/50 dark:bg-gray-900/50">
            <div className="border-b px-3 py-2">
                <div className="flex items-center gap-1.5">
                    {icon}
                    <span className="text-xs font-semibold">{title}</span>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="text-muted-foreground border-b">
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className={`px-3 py-1.5 font-medium ${
                                        col.align === 'right'
                                            ? 'text-right'
                                            : col.align === 'center'
                                              ? 'text-center'
                                              : 'text-left'
                                    }`}
                                >
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, i) => (
                            <tr
                                key={i}
                                className="border-b last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/50"
                            >
                                {columns.map((col) => (
                                    <td
                                        key={col.key}
                                        className={`px-3 py-1.5 ${
                                            col.align === 'right'
                                                ? 'text-right font-medium'
                                                : col.align === 'center'
                                                  ? 'text-center'
                                                  : ''
                                        }`}
                                    >
                                        {formatCell(row[col.key], col.format)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─── Pre-built table helpers ───

export function TopHotelsTable({ data }: { data: HotelStatsData }) {
    if (!data.top_hotels || data.top_hotels.length === 0) return null;

    return (
        <TableCard
            title="Top Khách sạn"
            icon={<Building2 className="h-3 w-3 text-blue-600" />}
            columns={[
                { key: 'rank', label: '#', align: 'center' },
                { key: 'title', label: 'Tên khách sạn' },
                { key: 'bookings', label: 'Booking', align: 'right', format: 'number' },
                { key: 'revenue', label: 'Doanh thu', align: 'right', format: 'vnd' },
            ]}
            data={data.top_hotels.map((h, i) => ({ ...h, rank: i + 1 }))}
        />
    );
}

export function TopUsersTable({ data }: { data: UserAccessData }) {
    if (!data.top_users || data.top_users.length === 0) return null;

    return (
        <TableCard
            title="Top Người dùng"
            icon={<Users className="h-3 w-3 text-purple-600" />}
            columns={[
                { key: 'rank', label: '#', align: 'center' },
                { key: 'userId', label: 'User ID' },
                { key: 'bookings', label: 'Booking', align: 'right', format: 'number' },
                { key: 'total_spent', label: 'Đã chi', align: 'right', format: 'vnd' },
            ]}
            data={data.top_users.map((u, i) => ({ ...u, rank: i + 1 }))}
        />
    );
}

export function AnomalyTable({ data }: { data: AnomalyData[] }) {
    if (!data || data.length === 0) return null;

    return (
        <TableCard
            title="Danh sách bất thường"
            icon={<AlertTriangle className="h-3 w-3 text-amber-600" />}
            columns={[
                { key: 'date', label: 'Ngày' },
                { key: 'revenue', label: 'Doanh thu', align: 'right', format: 'vnd' },
                { key: 'bookings', label: 'Booking', align: 'right', format: 'number' },
                { key: 'reason', label: 'Lý do' },
            ]}
            data={data.map((a) => ({
                date: a.date,
                revenue: a.revenue,
                bookings: a.bookings,
                reason: a.reasons[0] || '',
            }))}
        />
    );
}
