import axios from 'axios';

// 1. Cấu hình Port cho đúng với Payment Service (8002) 
// hoặc Gateway (8000) của bạn
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8002/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// 2. Không cần interceptor localStorage nữa vì Clerk quản lý Token trong bộ nhớ/cookie
// Chúng ta sẽ truyền token vào header Authorization từ phía Component gọi API

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.error("Phiên đăng nhập hết hạn hoặc không có quyền.");
            // Với Clerk, bạn có thể redirect về trang sign-in của họ
            if (typeof window !== 'undefined') {
                window.location.href = '/sign-in';
            }
        }
        return Promise.reject(error);
    }
);

export default api;