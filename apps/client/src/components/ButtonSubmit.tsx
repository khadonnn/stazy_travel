import type { PathName } from '@/types/routers';
import { Search } from 'lucide-react';
import Link from 'next/link';

interface Props {
    href?: PathName;
}
// search button
const ButtonSubmit = ({ href = '/hotels' }: Props) => {
    return (
        <Link
            href={href}
            className='h-14 md:h-16 w-full md:w-16 rounded-full bg-primary hover:bg-primary-700 flex items-center justify-center text-neutral-50 focus:outline-none hover:bg-primary/80 transition duration-150 ease-in-out'
        >
            <span className='mr-3 md:hidden'>Search</span>
            <Search className='w-6 h-6' />
        </Link>
    );
};

export default ButtonSubmit;
