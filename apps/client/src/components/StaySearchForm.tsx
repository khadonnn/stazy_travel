import StayDatesRangeInput from '@/components/StayDatesRangeInput';
import GuestsInput from '@/components/GuestsInput';
import LocationInput from '@/components/LocationInput';

const StaySearchForm = () => {
    return (
        <form className='w-full h-[90px] relative mt-8 flex rounded-full shadow-xl dark:shadow-2xl bg-white dark:bg-neutral-800'>
            <LocationInput className='flex-[1.5]' />
            <div className='self-center border-r border-slate-200 dark:border-slate-700 h-8'></div>
            <StayDatesRangeInput className='flex-1' />
            <div className='self-center border-r border-slate-200 dark:border-slate-700 h-8'></div>
            <GuestsInput className='flex-1' hasButtonSubmit />
        </form>
    );
};

export default StaySearchForm;
