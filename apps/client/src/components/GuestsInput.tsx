import { useState } from 'react';
import {
    Popover,
    PopoverTrigger,
    PopoverContent,
} from '@/components/ui/popover';
import ClearDataButton from './ClearDataButton';
import { UserPlus } from 'lucide-react';
import ButtonSubmit from '@/components/ButtonSubmit';
import type { PathName } from '@/types/routers';
import NcInputNumber from '@/components/NcInputNumber';
import { useBookingStore } from '@/store/useBookingStore';

export interface GuestsInputProps {
    fieldClassName?: string;
    className?: string;
    buttonSubmitHref?: PathName;
    hasButtonSubmit?: boolean;
}

const GuestsInput = ({
    fieldClassName = '[ nc-hero-field-padding ]',
    className = '[ nc-flex-1 ]',
    buttonSubmitHref = '/hotels',
    hasButtonSubmit = false,
}: GuestsInputProps) => {
    const { guests, setGuests, clearGuests } = useBookingStore();
    const [isOpen, setIsOpen] = useState(false);

    const handleChangeData = (value: number, type: keyof typeof guests) => {
        setGuests({
            ...guests,
            [type]: value,
        });
    };

    const totalGuests = guests.adults + guests.children + guests.infants;

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <div className={`flex relative ${className}`}>
                    <div
                        className={`flex-1 z-10 flex items-center focus:outline-none -ml-3 ${
                            isOpen ? 'cus-hero-field-focused' : ''
                        }`}
                    >
                        <button
                            type='button'
                            className={`relative z-10 flex-1 flex text-left items-center ${fieldClassName} space-x-3 focus:outline-none w-full`}
                        >
                            <div className='text-neutral-300 dark:text-neutral-400'>
                                <UserPlus className='w-5 h-5 lg:w-7 lg:h-7' />
                            </div>
                            <div className='flex-grow'>
                                <span className='block xl:text-lg font-semibold'>
                                    {totalGuests || 0} khách
                                </span>
                                <span className='block mt-1 text-sm text-neutral-400 leading-none font-light'>
                                    {totalGuests ? 'Khách' : 'Thêm khách'}
                                </span>
                            </div>

                            {totalGuests > 0 && isOpen && (
                                <ClearDataButton onClick={clearGuests} />
                            )}
                        </button>

                        {hasButtonSubmit && (
                            <div className='pr-2 xl:pr-4'>
                                <ButtonSubmit href={buttonSubmitHref} />
                            </div>
                        )}
                    </div>
                </div>
            </PopoverTrigger>

            <PopoverContent
                align='end'
                sideOffset={8}
                className='w-full sm:min-w-[340px] max-w-sm bg-white dark:bg-neutral-800 p-4 sm:p-6 rounded-3xl shadow-xl border-0'
            >
                <NcInputNumber
                    className='w-full'
                    defaultValue={guests.adults}
                    onChange={(value) => handleChangeData(value, 'adults')}
                    max={10}
                    min={1}
                    label='Người lớn'
                    desc='Từ 13 tuổi trở lên'
                />
                <NcInputNumber
                    className='w-full mt-6'
                    defaultValue={guests.children}
                    onChange={(value) => handleChangeData(value, 'children')}
                    max={4}
                    label='Trẻ em'
                    desc='Từ 2 đến 12 tuổi'
                />
                <NcInputNumber
                    className='w-full mt-6'
                    defaultValue={guests.infants}
                    onChange={(value) => handleChangeData(value, 'infants')}
                    max={4}
                    label='Em bé'
                    desc='Dưới 2 tuổi'
                />
            </PopoverContent>

            {isOpen && (
                <div className='h-8 absolute self-center top-1/2 -translate-y-1/2 z-0 -left-0.5 right-0.5 bg-white dark:bg-neutral-800 rounded-full'></div>
            )}
        </Popover>
    );
};

export default GuestsInput;
