import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// Dữ liệu giả lập tinh chỉnh K (số lượng láng giềng)
const data = [
    { k: 10, RMSE: 0.92, Precision: 0.6, Recall: 0.5 },
    { k: 20, RMSE: 0.88, Precision: 0.7, Recall: 0.58 },
    { k: 30, RMSE: 0.85, Precision: 0.75, Recall: 0.62 }, // Điểm tối ưu
    { k: 40, RMSE: 0.86, Precision: 0.73, Recall: 0.6 },
    { k: 50, RMSE: 0.87, Precision: 0.71, Recall: 0.59 },
];

const EvaluationLineChart = () => (
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

            {/* Precision (Tăng dần rồi giảm) */}
            <Line type="monotone" dataKey="Precision" stroke="#3B82F6" strokeWidth={2} name="Precision@5" />
            {/* Recall (Tăng dần rồi giảm) */}
            <Line type="monotone" dataKey="Recall" stroke="#10B981" strokeWidth={2} name="Recall@5" />
            {/* RMSE (Giảm dần rồi tăng) */}
            <Line type="monotone" dataKey="RMSE" stroke="#FBBF24" strokeWidth={2} name="RMSE" />
        </LineChart>
    </ResponsiveContainer>
);

export default EvaluationLineChart;
