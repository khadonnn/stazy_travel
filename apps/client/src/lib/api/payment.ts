import axios from 'axios';
import type { FullPaymentData } from '../../types/payment';

// Base API configuration
const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

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
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle response errors
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
    }
);

// Payment API endpoints
export const paymentApi = {
    /**
     * Process booking and payment from frontend
     */
    async processBooking(paymentData: FullPaymentData) {
        try {
            // Format dates to ISO string if they're Date objects
            const formattedData = {
                ...paymentData,
                checkInDate: paymentData.checkInDate instanceof Date 
                    ? paymentData.checkInDate.toISOString().split('T')[0] 
                    : paymentData.checkInDate,
                checkOutDate: paymentData.checkOutDate instanceof Date 
                    ? paymentData.checkOutDate.toISOString().split('T')[0] 
                    : paymentData.checkOutDate,
            };

            const response = await apiClient.post('/payments/process-booking', formattedData);
            return response.data;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 
                (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 
                'Thanh toán thất bại, vui lòng thử lại!';
            throw new Error(errorMessage);
        }
    },

    /**
     * Get user payment history
     */
    async getPaymentHistory() {
        try {
            const response = await apiClient.get('/payments');
            return response.data;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 
                (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 
                'Không thể tải lịch sử thanh toán';
            throw new Error(errorMessage);
        }
    },

    /**
     * Get payment by ID
     */
    async getPaymentById(paymentId: string) {
        try {
            const response = await apiClient.get(`/payments/${paymentId}`);
            return response.data;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 
                (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 
                'Không thể tải thông tin thanh toán';
            throw new Error(errorMessage);
        }
    },

    /**
     * Cancel payment
     */
    async cancelPayment(paymentId: string) {
        try {
            const response = await apiClient.post(`/payments/${paymentId}/cancel`);
            return response.data;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 
                (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 
                'Không thể hủy thanh toán';
            throw new Error(errorMessage);
        }
    },
};

// Export default
export default paymentApi;