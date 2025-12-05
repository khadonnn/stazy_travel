'use client';

import { Star } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface FiveStarProps {
    className?: string;
    iconClass?: string;
    defaultPoint?: number;
}

const FiveStar = ({
    className = '',
    iconClass = 'w-4 h-4',
    defaultPoint = 5,
}: FiveStarProps) => {
    const [point, setPoint] = useState(defaultPoint);
    const [currentHover, setCurrentHover] = useState(0);

    useEffect(() => {
        setPoint(defaultPoint);
    }, [defaultPoint]);

    return (
        <div className={`flex items-center ${className}`} data-nc-id='FiveStar'>
            {[1, 2, 3, 4, 5].map((item) => (
                <Star
                    key={item}
                    className={`${
                        point >= item || currentHover >= item
                            ? 'text-yellow-500'
                            : 'text-neutral-300'
                    } ${iconClass} cursor-pointer transition-colors duration-150 hover:text-yellow-400`}
                    onMouseEnter={() => setCurrentHover(item)}
                    onMouseLeave={() => setCurrentHover(0)}
                    onClick={() => setPoint(item)}
                />
            ))}
        </div>
    );
};

export default FiveStar;
