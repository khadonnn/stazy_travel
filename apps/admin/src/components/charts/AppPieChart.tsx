'use client';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface DataItem {
    name: string;
    value: number;
}

interface AppPieChartProps {
    data?: DataItem[];
}

const COLORS = ['#10B981', '#3B82F6', '#FBBF24', '#EF4444', '#7C3AED'];

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const segmentColor = payload[0].color || '#333';
        const segmentData = payload[0].payload;

        return (
            <div
                style={{
                    backgroundColor: segmentColor,
                    color: '#FAFAFA',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid ' + segmentColor,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }}
            >
                <p className="text-sm font-semibold">{segmentData.name}</p>
                <p className="text-xs">Số lượng: {segmentData.value.toLocaleString()}</p>
            </div>
        );
    }
    return null;
};

const AppPieChart = ({ data = [] }: AppPieChartProps) => {
    if (!data || data.length === 0) {
        return <div className="flex h-full items-center justify-center text-gray-500">Không có dữ liệu</div>;
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    labelLine={false}
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>

                <Tooltip content={<CustomTooltip />} />

                <Legend
                    layout="horizontal"
                    align="center"
                    verticalAlign="bottom"
                    wrapperStyle={{ paddingTop: '10px', paddingRight: '10px' }}
                />
            </PieChart>
        </ResponsiveContainer>
    );
};

export default AppPieChart;
