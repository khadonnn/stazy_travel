import { useState } from 'react';
import { Heart } from 'lucide-react';

export interface BtnLikeIconProps {
    className?: string;
    colorClass?: string;
    isLiked?: boolean;
}

function BtnLikeIcon({
    className = '',
    colorClass = 'text-white bg-black bg-opacity-30 hover:bg-opacity-50',
    isLiked = false,
}: BtnLikeIconProps) {
    const [likedState, setLikedState] = useState(isLiked);

    return (
        <div
            className={`cus-BtnLikeIcon w-8 h-8 flex items-center justify-center rounded-full cursor-pointer ${
                likedState ? 'cus-BtnLikeIcon--liked' : ''
            } ${colorClass} ${className}`}
            data-nc-id='BtnLikeIcon'
            title='Save'
            onClick={() => setLikedState(!likedState)}
        >
            <Heart
                className={`h-5 w-5 ${
                    likedState ? 'text-red-500 fill-red-500' : 'text-current'
                }`}
                strokeWidth={1.5}
            />
        </div>
    );
}

export default BtnLikeIcon;