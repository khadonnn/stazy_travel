import api from './axios';

export interface PaymentNotification {
    id: number;
    title: string;
    description: string;
    time: string;
    read: boolean;
    type: 'payment';
    payment_id: string;
    status: string;
    amount: number;
    currency: string;
    hotel_name: string;
}

export interface NotificationResponse {
    success: boolean;
    data: PaymentNotification[];
    unread_count: number;
}

export interface MarkAsReadRequest {
    notification_id: number;
}

export interface MarkAsReadResponse {
    success: boolean;
    message: string;
}

export const notificationApi = {
    // Get payment notifications for the authenticated user
    getPaymentNotifications: async (): Promise<NotificationResponse> => {
        const response = await api.get('/notifications/payments');
        return response.data;
    },

    // Mark a notification as read
    markAsRead: async (notificationId: number): Promise<MarkAsReadResponse> => {
        const response = await api.post('/notifications/mark-read', {
            notification_id: notificationId,
        });
        return response.data;
    },
};

export default notificationApi;
