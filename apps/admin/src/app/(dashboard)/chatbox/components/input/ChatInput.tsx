import { Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ChatInputProps {
    value: string;
    onChange: (value: string) => void;
    onSend: () => void;
    loading?: boolean;
    placeholder?: string;
}

export function ChatInput({ value, onChange, onSend, loading, placeholder }: ChatInputProps) {
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
    };

    return (
        <div className="bg-background border-t px-3 py-2">
            <div className="flex gap-2">
                <Input
                    placeholder={placeholder || 'Hỏi về doanh thu, booking, dự báo...'}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                    className="flex-1"
                />
                <Button onClick={onSend} disabled={!value.trim() || loading} size="icon">
                    <Send className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
