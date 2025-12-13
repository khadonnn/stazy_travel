import { SignUp, ClerkLoaded } from '@clerk/nextjs';

export default function Page() {
    return (
        <div className='min-h-screen flex items-center justify-center px-6 relative'>
            <div className='absolute top-0 left-36 w-72 h-72 bg-linear-to-r from-green-400 to-blue-500 rounded-full blur-3xl opacity-30' />
            <div className='absolute bottom-0 right-40 w-72 h-72 bg-linear-to-tr from-pink-400 to-purple-500 rounded-full blur-3xl opacity-30' />

            <div className='my-20'>
                <SignUp />
            </div>
        </div>
    );
}
