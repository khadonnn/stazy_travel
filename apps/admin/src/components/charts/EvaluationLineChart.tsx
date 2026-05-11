'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface DataPoint {
    k: number;
    RMSE: number;
    Precision: number;
    Recall: number;
}

interface EvaluationLineChartProps {
    data?: DataPoint[];
}

const EvaluationLineChart = ({ data = [] }: EvaluationLineChartProps) => {
    if (!data || data.length === 0) {
        return (
            <div className="flex h-full items-center justify-center text-gray-500">
                Chưa có dữ liệu đánh giá mô hình
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis
                    dataKey="k"
                    stroke="#A1A1AA"
                    label={{ value: 'Số lượng láng giềng (K)', position: 'bottom', fill: '#A1A1AA' }}
                />
                <YAxis stroke="#A1A1AA" />
                <Tooltip
                    contentStyle={{ backgroundColor: '#18181B', border: '1px solid #3F3F46', color: '#FAFAFA' }}
                    formatter={(value: number, name: string) => [value.toFixed(3), name]}
                />
                <Legend wrapperStyle={{ paddingTop: '30px', marginLeft: '20px' }} />

                <Line type="monotone" dataKey="Precision" stroke="#3B82F6" strokeWidth={2} name="Precision@5" />
                <Line type="monotone" dataKey="Recall" stroke="#10B981" strokeWidth={2} name="Recall@5" />
                <Line type="monotone" dataKey="RMSE" stroke="#FBBF24" strokeWidth={2} name="RMSE" />
            </LineChart>
        </ResponsiveContainer>
    );
};

export default EvaluationLineChart;
