import { X } from 'lucide-react';

export interface ClearDataButtonProps {
    onClick: (e: React.MouseEvent) => void;
}

const ClearDataButton = ({ onClick }: ClearDataButtonProps) => {
    return (
        <div
            role='button'
            onClick={(e) => {
                e.stopPropagation();
                onClick(e);
            }}
            className='absolute z-10 w-5 h-5 lg:w-6 lg:h-6 text-sm bg-neutral-200 dark:bg-neutral-800 rounded-full flex items-center justify-center right-1 lg:right-3 top-1/2 transform -translate-y-1/2 cursor-pointer'
            aria-label='Clear input'
        >
            <X className='w-4 h-4' />
        </div>
    );
};

export default ClearDataButton;
