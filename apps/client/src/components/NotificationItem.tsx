type NotificationItemProps = {
    title: string;
    description: string;
    time: string;
    read: boolean;
    onMarkAsRead?: () => void;
};

export default function NotificationItem({
    title,
    description,
    time,
    read,
    onMarkAsRead,
}: NotificationItemProps) {
    const handleClick = () => {
        if (!read && onMarkAsRead) {
            onMarkAsRead();
        }
    };

    return (
        <div
            className={`p-3 rounded hover:bg-accent cursor-pointer ${
                read ? 'opacity-60' : 'bg-gray-100'
            }`}
            onClick={handleClick}
        >
            <div className='font-medium'>{title}</div>
            <div className='text-sm text-gray-500'>{description}</div>
            <div className='text-xs text-right text-gray-400'>{time}</div>
        </div>
    );
}
