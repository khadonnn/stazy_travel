import axios from 'axios';

// Đảm bảo bạn đã định nghĩa NEXT_PUBLIC_API_BASE_URL trong file .env.local
const api = axios.create({
    // SỬ DỤNG process.env trong Next.js
    baseURL:
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        'http://localhost:3003/api' ||
        'http://localhost:3000/api',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Thêm interceptor cho request
api.interceptors.request.use((config) => {
    // Logic này sẽ chạy trong Client Component
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('user-token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// Thêm interceptor cho response
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Đảm bảo code này chỉ chạy trên trình duyệt (client)
        if (typeof window !== 'undefined' && error.response?.status === 401) {
            localStorage.removeItem('user-token');

            const currentPath = window.location.pathname;
            const isAdminRoute = currentPath.startsWith('/admin');
            const isProtectedRoute = ['/profile', '/my-bookings', '/cart'].some(
                (route) => currentPath.startsWith(route),
            );

            // Dùng router.push() của next/navigation thì tốt hơn
            // Nhưng window.location.href vẫn hoạt động để redirect cứng
            if (!isAdminRoute && isProtectedRoute) {
                // Tốt nhất là dùng hook useRouter().push('/login') trong component,
                // nhưng nếu cần xử lý toàn cục, window.location.href là cách nhanh nhất.
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    },
);

export default api;
