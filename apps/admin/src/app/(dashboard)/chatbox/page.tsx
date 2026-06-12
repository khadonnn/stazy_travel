'use client';

import { Bot } from 'lucide-react';
import { useChat } from './hooks/useChat';
import { UserMessage } from './components/messages/UserMessage';
import { AgentMessage } from './components/messages/AgentMessage';
import { TypingIndicator } from './components/messages/TypingIndicator';
import { CapabilityDrawer } from './components/chips/CapabilityDrawer';
import { ChatInput } from './components/input/ChatInput';
import { EmptyState } from './components/EmptyState';

export default function ChatboxPage() {
    const { messages, input, setInput, loading, skeletonType, scrollRef, sendMessage, handleChipClick } = useChat();

    // Check if we should show empty state (only welcome message exists)
    const showEmptyState = messages.length === 1 && messages[0]?.id === 0;

    return (
        <div className="flex h-[90vh] flex-col">
            <div className="border-muted flex flex-1 flex-col overflow-hidden rounded-lg border bg-gray-700/10 shadow-none">
                {/* Header */}
                <div className="border-b px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                        <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
                            <Bot className="text-primary h-4 w-4" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 text-sm font-semibold">
                                Stazy BI Agent
                                <span className="inline-flex items-center rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                    Online
                                </span>
                            </div>
                            <p className="text-muted-foreground text-[11px]">Hotel Intelligence · Groq LLM</p>
                        </div>
                    </div>
                </div>

                {/* Messages Area or Empty State */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto">
                    {showEmptyState ? (
                        <EmptyState onPromptClick={handleChipClick} loading={loading} />
                    ) : (
                        <div className="space-y-3 px-4 py-3">
                            {messages.map((msg) =>
                                msg.role === 'user' ? (
                                    <UserMessage key={msg.id} message={msg} />
                                ) : (
                                    <AgentMessage
                                        key={msg.id}
                                        message={msg}
                                        onChipClick={handleChipClick}
                                        loading={loading}
                                    />
                                ),
                            )}

                            {/* Typing indicator */}
                            {loading && <TypingIndicator skeletonType={skeletonType} />}
                        </div>
                    )}
                </div>

                {/* Capability Drawer (progressive disclosure chips) */}
                <CapabilityDrawer onChipClick={handleChipClick} loading={loading} />

                {/* Input Area */}
                <ChatInput value={input} onChange={setInput} onSend={() => sendMessage(input)} loading={loading} />
            </div>
        </div>
    );
}
