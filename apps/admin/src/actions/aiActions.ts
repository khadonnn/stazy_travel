'use server';

const SEARCH_SERVICE_URL = process.env.SEARCH_SERVICE_URL || 'http://127.0.0.1:8008';

export async function getAIStatus() {
    try {
        const response = await fetch(`${SEARCH_SERVICE_URL}/api/admin/ai/status`, {
            cache: 'no-store',
        });

        if (!response.ok) {
            throw new Error('Failed to fetch AI status');
        }

        return await response.json();
    } catch (error: any) {
        console.error('AI Status fetch error:', error);
        return null;
    }
}

export async function forceRetrainAI() {
    try {
        const response = await fetch(`${SEARCH_SERVICE_URL}/api/admin/ai/force-retrain`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });

        const data = await response.json();

        if (!response.ok && response.status !== 202) {
            throw new Error(data.message || 'Failed to trigger retrain');
        }

        return { success: true, data };
    } catch (error: any) {
        console.error('Retrain error:', error);
        return { success: false, error: error.message };
    }
}

export async function getTrainingProgress() {
    try {
        const response = await fetch(`${SEARCH_SERVICE_URL}/api/admin/ai/training-progress`, {
            cache: 'no-store',
        });

        if (!response.ok) {
            throw new Error('Failed to fetch training progress');
        }

        return await response.json();
    } catch (error: any) {
        console.error('Training progress fetch error:', error);
        return null;
    }
}

// Backward-compatible aliases (used by TodoList.tsx)
export const getTrainingStatus = getAIStatus;
export const trainAIModel = forceRetrainAI;
