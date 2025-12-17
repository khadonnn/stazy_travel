import Image from 'next/image';
import Link from 'next/link';

const Footer = () => {
    return (
        <footer className='relative bg-gray-800 overflow-hidden'>
            {/* SVG Wave Background */}
            <div
                className="
          absolute inset-0
          bg-[url('/assets/svg/wave.svg')]
          bg-no-repeat
          bg-top
          bg-cover
          opacity-20
        "
                aria-hidden='true'
            />

            {/* Content */}
            <div
                className='
          relative z-10
          flex flex-col items-center gap-8
          md:flex-row md:items-start md:justify-between
          p-8 md:p-12
          text-white
        '
            >
                {/* Logo + Text */}
                <div className='flex flex-col items-center md:items-start gap-4'>
                    <Link href='/' className='flex items-center'>
                        <Image
                            src='/assets/logo.png'
                            alt='logo'
                            width={40}
                            height={40}
                            className='rounded-full object-cover box-content'
                            style={{ boxShadow: '0 0 0 1px white' }}
                        />
                        <p className='hidden md:block text-md font-medium tracking-wider ml-2'>
                            Stazy.
                        </p>
                    </Link>

                    <p className='text-sm text-gray-400'>
                        &copy; 2026 The Stazy Booking
                    </p>
                </div>

                {/* Links column 1 */}
                <div className='flex flex-col gap-4 text-sm text-gray-400 items-center md:items-start'>
                    <p className='text-amber-50 font-medium'>Links</p>
                    <Link href='/'>Homepage</Link>
                    <Link href='/contact'>Contact</Link>
                    <Link href='/terms'>Terms of Service</Link>
                    <Link href='/privacy'>Privacy Policy</Link>
                </div>

                {/* Links column 2 */}
                <div className='flex flex-col gap-4 text-sm text-gray-400 items-center md:items-start'>
                    <p className='text-amber-50 font-medium'>Hotels</p>
                    <Link href='/hotels'>All hotels</Link>
                    <Link href='/hotels'>New hotels</Link>
                    <Link href='/hotels'>Trend hotels</Link>
                    <Link href='/hotels'>Popular hotels</Link>
                </div>

                {/* Links column 3 */}
                <div className='flex flex-col gap-4 text-sm text-gray-400 items-center md:items-start'>
                    <p className='text-amber-50 font-medium'>Info</p>
                    <Link href='/'>About</Link>
                    <Link href='/'>Contact</Link>
                    <Link href='/'>Blog</Link>
                    <Link href='/'>Hosts</Link>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
