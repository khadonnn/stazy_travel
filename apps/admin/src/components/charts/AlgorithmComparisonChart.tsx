import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const data = [
    { name: 'User-based CF', RMSE: 0.95, Precision: 0.65, Recall: 0.52 },
    { name: 'Item-based CF', RMSE: 0.9, Precision: 0.7, Recall: 0.55 },
    { name: 'Matrix Factorization', RMSE: 0.85, Precision: 0.75, Recall: 0.6 }, // Mô hình tốt nhất
];

const AlgorithmComparisonChart = () => (
    <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="name" stroke="#A1A1AA" />
            <YAxis yAxisId="rmse" orientation="left" stroke="#F87171" domain={[0.8, 1.0]} name="RMSE" />
            <YAxis yAxisId="metrics" orientation="right" stroke="#3B82F6" domain={[0.5, 0.8]} name="P/R" />
            <Tooltip
                contentStyle={{ backgroundColor: '#18181B', border: '1px solid #3F3F46', color: '#FAFAFA' }}
                formatter={(value: number, name: string) => [value.toFixed(3), name]}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />

            <Bar yAxisId="rmse" dataKey="RMSE" fill="#F87171" name="RMSE (Độ lỗi)" />
            <Bar yAxisId="metrics" dataKey="Precision" fill="#3B82F6" name="Precision@5" />
            <Bar yAxisId="metrics" dataKey="Recall" fill="#10B981" name="Recall@5" />
        </BarChart>
    </ResponsiveContainer>
);

export default AlgorithmComparisonChart;
