import axios from 'axios';

// Base API configuration
const API_BASE_URL = 'http://localhost:8000/api';

// Create axios instance with interceptors
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('user-token');
    const adminToken = localStorage.getItem('admin-token');

    // Check if this is an admin endpoint
    const isAdminEndpoint =
        config.url?.includes('/admin/') || config.url?.includes('admin/all');

    if (isAdminEndpoint) {
        // For admin endpoints, prioritize admin token
        if (adminToken) {
            config.headers.Authorization = `Bearer ${adminToken}`;
        } else if (token) {
            // Fallback to user token if user has admin role
            config.headers.Authorization = `Bearer ${token}`;
        }
    } else {
        // For user endpoints, prioritize user token
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        } else if (adminToken) {
            // Fallback to admin token only if no user token
            config.headers.Authorization = `Bearer ${adminToken}`;
        }
    }
    return config;
});

// Handle response errors
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error(
            'Booking API Error:',
            error.response?.data || error.message,
        );
        return Promise.reject(error);
    },
);

// Booking API endpoints
export const bookingApi = {
    /**
     * Get all bookings for admin
     */
    async getAllBookings(params?: {
        page?: number;
        per_page?: number;
        status?: string;
        payment_status?: string;
        search?: string;
        sort_by?: string;
        sort_order?: 'asc' | 'desc';
    }) {
        try {
            const response = await apiClient.get('/bookings/admin/all', {
                params,
            });
            return response.data;
        } catch (error: unknown) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : (error as { response?: { data?: { message?: string } } })
                          ?.response?.data?.message ||
                      'Không thể tải danh sách đặt phòng';
            throw new Error(errorMessage);
        }
    },

    /**
     * Get user bookings
     */
    async getUserBookings(params?: {
        page?: number;
        per_page?: number;
        status?: string;
        sort_by?: string;
        sort_order?: 'asc' | 'desc';
        debug?: string;
    }) {
        try {
            const response = await apiClient.get('/bookings', { params });
            return response.data;
        } catch (error: unknown) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : (error as { response?: { data?: { message?: string } } })
                          ?.response?.data?.message ||
                      'Không thể tải lịch sử đặt phòng';
            throw new Error(errorMessage);
        }
    },

    /**
     * Get booking by ID
     */
    async getBookingById(id: string) {
        try {
            const response = await apiClient.get(`/bookings/${id}`);
            return response.data;
        } catch (error: unknown) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : (error as { response?: { data?: { message?: string } } })
                          ?.response?.data?.message ||
                      'Không thể tải thông tin đặt phòng';
            throw new Error(errorMessage);
        }
    },

    /**
     * Create new booking
     */
    async createBooking(bookingData: Record<string, unknown>) {
        try {
            const response = await apiClient.post('/bookings', bookingData);
            return response.data;
        } catch (error: unknown) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : (error as { response?: { data?: { message?: string } } })
                          ?.response?.data?.message ||
                      'Không thể tạo đặt phòng';
            throw new Error(errorMessage);
        }
    },

    /**
     * Update booking
     */
    async updateBooking(id: string, bookingData: Record<string, unknown>) {
        try {
            const response = await apiClient.put(
                `/bookings/${id}`,
                bookingData,
            );
            return response.data;
        } catch (error: unknown) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : (error as { response?: { data?: { message?: string } } })
                          ?.response?.data?.message ||
                      'Không thể cập nhật đặt phòng';
            throw new Error(errorMessage);
        }
    },

    /**
     * Cancel booking
     */
    async cancelBooking(id: string) {
        try {
            const response = await apiClient.delete(`/bookings/${id}`);
            return response.data;
        } catch (error: unknown) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : (error as { response?: { data?: { message?: string } } })
                          ?.response?.data?.message ||
                      'Không thể hủy đặt phòng';
            throw new Error(errorMessage);
        }
    },
};

// Export default
export default bookingApi;