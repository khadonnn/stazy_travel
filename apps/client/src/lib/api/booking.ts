import axios from 'axios';

// 1. Trỏ về cổng của Payment Service
const API_BASE_URL = 'http://localhost:8002/api';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
});

// Interceptor nên dùng Clerk Token thay vì localStorage
apiClient.interceptors.request.use(async (config) => {
    // Bạn nên truyền token từ component vào đây hoặc dùng cách lấy token trực tiếp
    return config;
});

export const bookingApi = {
    async getUserBookings(params?: any, token?: string) {
        try {
            // 2. Gọi đúng route mới tạo ở Backend
            const response = await apiClient.get('/sessions/my-bookings', {
                params,
                headers: {
                    Authorization: `Bearer ${token}` // Truyền token Clerk từ UI xuống
                }
            });
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.error || 'Lỗi tải đặt phòng');
        }
    },
};