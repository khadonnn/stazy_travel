import { Bot, User } from 'lucide-react';

interface AvatarProps {
    role: 'user' | 'assistant';
    size?: 'sm' | 'md';
}

export function Avatar({ role, size = 'md' }: AvatarProps) {
    const sizeClass = size === 'sm' ? 'h-6 w-6' : 'h-8 w-8';
    const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

    if (role === 'assistant') {
        return (
            <div className={`${sizeClass} bg-primary/10 flex shrink-0 items-center justify-center rounded-full`}>
                <Bot className={`text-primary ${iconSize}`} />
            </div>
        );
    }

    return (
        <div className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-blue-100`}>
            <User className={`${iconSize} text-blue-600`} />
        </div>
    );
}
