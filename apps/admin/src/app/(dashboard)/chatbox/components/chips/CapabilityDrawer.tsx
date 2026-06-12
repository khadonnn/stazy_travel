import { useState } from 'react';
import { ChevronDown, ChevronUp, Box } from 'lucide-react';
import { CAPABILITIES } from '../../registry/capabilities';

interface CapabilityDrawerProps {
    onChipClick: (query: string) => void;
    loading?: boolean;
}

export function CapabilityDrawer({ onChipClick, loading }: CapabilityDrawerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeGroup, setActiveGroup] = useState<string | null>(null);

    // Show only 4 quick prompts when closed
    const quickPrompts = CAPABILITIES.flatMap((cap) => cap.prompts.slice(0, 1));

    const toggleGroup = (id: string) => {
        setActiveGroup(activeGroup === id ? null : id);
    };

    return (
        <div className="border-t px-3 py-1.5">
            {/* Quick Prompts (always visible) */}
            <div className="mb-1 flex flex-wrap gap-1.5">
                {quickPrompts.map((chip) => (
                    <button
                        key={chip.label}
                        onClick={() => onChipClick(chip.query)}
                        disabled={loading}
                        className="bg-background hover:bg-muted dark:bg-background/60 cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50"
                    >
                        {chip.label}
                    </button>
                ))}

                {/* Toggle more button */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="text-muted-foreground hover:text-foreground cursor-pointer rounded-full border border-dashed px-2.5 py-1 text-[11px] font-medium transition-colors"
                >
                    {isOpen ? (
                        <span className="flex items-center gap-1">
                            Thu gọn <ChevronUp className="h-3 w-3" />
                        </span>
                    ) : (
                        <span className="flex items-center gap-1">
                            Xem thêm <ChevronDown className="h-3 w-3" />
                        </span>
                    )}
                </button>
            </div>

            {/* Expanded Capability Panel */}
            {isOpen && (
                <div className="bg-muted/30 dark:bg-muted/10 mb-1 rounded-lg border p-2">
                    {CAPABILITIES.map((cap) => (
                        <div key={cap.id} className="mb-1 last:mb-0">
                            <button
                                onClick={() => toggleGroup(cap.id)}
                                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs font-medium transition-colors hover:bg-white/50 dark:hover:bg-gray-800/50"
                            >
                                <span>
                                    {cap.icon} {cap.label}
                                </span>
                                <span className="text-muted-foreground">
                                    {activeGroup === cap.id ? (
                                        <ChevronUp className="h-3 w-3" />
                                    ) : (
                                        <ChevronDown className="h-3 w-3" />
                                    )}
                                </span>
                            </button>
                            {activeGroup === cap.id && (
                                <div className="mt-0.5 ml-2 flex flex-wrap gap-1">
                                    {cap.prompts.map((prompt) => (
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
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
