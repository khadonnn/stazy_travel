'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface DataItem {
    name: string;
    RMSE: number;
    Precision: number;
    Recall: number;
}

interface AlgorithmComparisonChartProps {
    data?: DataItem[];
}

const AlgorithmComparisonChart = ({ data = [] }: AlgorithmComparisonChartProps) => {
    if (!data || data.length === 0) {
        return (
            <div className="flex h-full items-center justify-center text-gray-500">
                Chưa có dữ liệu so sánh thuật toán
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="name" stroke="#A1A1AA" />
                <YAxis yAxisId="rmse" orientation="left" stroke="#F87171" domain={[0, 'auto']} name="RMSE" />
                <YAxis yAxisId="metrics" orientation="right" stroke="#3B82F6" domain={[0, 1]} name="P/R" />
                <Tooltip
                    contentStyle={{ backgroundColor: '#18181B', border: '1px solid #3F3F46', color: '#FAFAFA' }}
                    formatter={(value: number, name: string) => [value.toFixed(3), name]}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />

                <Bar yAxisId="rmse" dataKey="RMSE" fill="#F87171" name="RMSE (Độ lỗi)" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="metrics" dataKey="Precision" fill="#3B82F6" name="Precision@5" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="metrics" dataKey="Recall" fill="#10B981" name="Recall@5" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
};

export default AlgorithmComparisonChart;
