import { getPromptsForMessage } from '../../registry/capabilities';
import { BIData } from '../../types/chat';

interface FollowUpChipsProps {
    biData?: BIData;
    onChipClick: (query: string) => void;
    loading?: boolean;
}

export function FollowUpChips({ biData, onChipClick, loading }: FollowUpChipsProps) {
    if (!biData) return null;

    const prompts = getPromptsForMessage(biData as Record<string, unknown>);
    if (prompts.length === 0) return null;

    return (
        <div className="mt-2">
            <div className="text-muted-foreground mb-1 text-[10px]">🔍 Hỏi thêm:</div>
            <div className="flex flex-wrap gap-1.5">
                {prompts.map((prompt) => (
                    <button
                        key={prompt.label}
                        onClick={() => onChipClick(prompt.query)}
                        disabled={loading}
                        className="bg-background hover:bg-muted cursor-pointer rounded-full border px-2 py-0.5 text-[10px] transition-colors disabled:opacity-50"
                    >
                        {prompt.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
