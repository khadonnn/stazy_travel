'use server';

const API_URL = process.env.NEXT_PUBLIC_BOOKING_SERVICE_URL || 'http://localhost:8001';

export async function trainAIModel(token: string) {
    try {
        const response = await fetch(`${API_URL}/admin/train-ai`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to train AI model');
        }

        return { success: true, data };
    } catch (error: any) {
        console.error('Training error:', error);
        return { success: false, error: error.message };
    }
}

export async function getTrainingStatus(token: string) {
    try {
        const response = await fetch(`${API_URL}/admin/training-status`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            cache: 'no-store',
        });

        if (!response.ok) {
            throw new Error('Failed to fetch training status');
        }

        return await response.json();
    } catch (error: any) {
        console.error('Status fetch error:', error);
        return null;
    }
}
