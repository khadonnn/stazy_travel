import { Message } from '../../types/chat';
import { Avatar } from '../shared/Avatar';

interface UserMessageProps {
    message: Message;
}

export function UserMessage({ message }: UserMessageProps) {
    return (
        <div className="flex justify-end gap-3">
            <div className="bg-primary text-primary-foreground max-w-[85%] rounded-lg px-4 py-2">
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p className="text-primary-foreground/70 mt-1 text-right text-[10px]">{message.timestamp}</p>
            </div>
            <Avatar role="user" />
        </div>
    );
}
