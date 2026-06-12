import { AdminActionData } from '../../types/chat';
import { Mail, Tag, CheckCircle, X } from 'lucide-react';
import { useState } from 'react';

interface ActionCardProps {
    action: AdminActionData;
    onConfirm?: (action: AdminActionData) => void;
    onCancel?: () => void;
    onStatusChange?: (status: 'confirmed' | 'cancelled' | 'executing') => void;
}

export function ActionCard({ action, onConfirm, onCancel, onStatusChange }: ActionCardProps) {
    const [status, setStatus] = useState<'pending' | 'confirmed' | 'cancelled' | 'executing'>('pending');

    const handleConfirm = () => {
        setStatus('executing');
        onStatusChange?.('executing');
        onConfirm?.(action);
        setTimeout(() => {
            setStatus('confirmed');
            onStatusChange?.('confirmed');
        }, 1500);
    };

    const handleCancel = () => {
        setStatus('cancelled');
        onStatusChange?.('cancelled');
        onCancel?.();
    };

    if (status === 'confirmed') {
        return (
            <div className="rounded-lg border border-green-200 bg-green-50 p-2.5 dark:border-green-800 dark:bg-green-950/30">
                <div className="flex items-center gap-2 text-xs font-medium text-green-700 dark:text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    Đã thực hiện: {action.description}
                </div>
            </div>
        );
    }

    if (status === 'cancelled') {
        return (
            <div className="rounded-lg border border-gray-200 p-2.5 dark:border-gray-700">
                <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
                    <X className="h-4 w-4" />
                    Đã hủy: {action.description}
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-lg border bg-orange-50 p-2.5 dark:bg-orange-950/30">
            <div className="mb-1.5 text-xs font-medium text-orange-700 dark:text-orange-400">
                ⚡ Hành động: {action.description}
            </div>
            <p className="mb-2 text-[11px] text-orange-600 dark:text-orange-300">{action.confirmation_text}</p>
            <div className="flex gap-2">
                <button
                    className="flex items-center gap-1.5 rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-orange-700 disabled:opacity-50"
                    onClick={handleConfirm}
                    disabled={status === 'executing'}
                >
                    {status === 'executing' ? (
                        <span className="flex items-center gap-1">
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Đang xử lý...
                        </span>
                    ) : (
                        <>
                            {action.action_type === 'send_email' ? (
                                <Mail className="h-3 w-3" />
                            ) : (
                                <Tag className="h-3 w-3" />
                            )}
                            Xác nhận
                        </>
                    )}
                </button>
                <button
                    className="text-muted-foreground hover:bg-muted rounded-md border px-3 py-1.5 text-xs font-medium transition-colors"
                    onClick={handleCancel}
                    disabled={status === 'executing'}
                >
                    Hủy
                </button>
            </div>
        </div>
    );
}
