'use client';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const data = [
    { name: '5 Sao', value: 5500 },
    { name: '4 Sao', value: 3000 },
    { name: '3 Sao', value: 1000 },
    { name: '2 Sao', value: 300 },
    { name: '1 Sao', value: 200 },
];

// Định nghĩa màu cho các phần
const COLORS = ['#10B981', '#3B82F6', '#FBBF24', '#EF4444', '#7C3AED']; // Xanh lá, Xanh dương, Vàng, Đỏ, Tím

// =================================================================
// 1. CUSTOM TOOLTIP (Màu nền theo miếng bánh, KHÔNG CÓ PHẦN TRĂM)
// =================================================================

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        // Lấy màu và dữ liệu từ miếng bánh đang hover
        const segmentColor = payload[0].color || '#333';
        const segmentData = payload[0].payload;

        return (
            <div
                style={{
                    // Áp dụng màu nền của miếng bánh
                    backgroundColor: segmentColor,
                    // Chữ màu trắng
                    color: '#FAFAFA',
                    // Các style còn lại
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid ' + segmentColor,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }}
            >
                {/* Chỉ hiển thị Tên và Số lượng (Không có %) */}
                <p className="text-sm font-semibold">{segmentData.name}</p>
                <p className="text-xs">Số lượng: {segmentData.value.toLocaleString()}</p>
            </div>
        );
    }
    return null;
};

const AppPieChart = () => (
    <ResponsiveContainer width="100%" height="100%">
        <PieChart>
            <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100} // KHÔI PHỤC nét to (outerRadius=100)
                paddingAngle={5}
                dataKey="value"
                labelLine={false}
                // Dùng hàm label mặc định để chỉ hiển thị % (như code gốc bạn gửi)
                // Cần chú ý: nếu các miếng bánh nhỏ (2%, 3%) bị mất, đó là do Recharts tự ẩn.
                label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
            >
                {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
            </Pie>

            {/* SỬ DỤNG CUSTOM TOOLTIP VỚI MÀU NỀN THEO MIẾNG BÁNH */}
            <Tooltip content={<CustomTooltip />} />

            {/* LEGEND ĐẶT DƯỚI (Giữ nguyên) */}
            <Legend
                layout="horizontal" // Bố cục ngang
                align="center" // Căn giữa theo chiều ngang
                verticalAlign="bottom" // Đặt ở phía dưới
                wrapperStyle={{ paddingTop: '10px', paddingRight: '10px' }} // Khoảng cách với Pie Chart
            />
        </PieChart>
    </ResponsiveContainer>
);

export default AppPieChart;
