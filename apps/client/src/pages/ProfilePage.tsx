import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getProfile, updateProfile } from '@/lib/api/profile';

export default function ProfilePage() {
    const [profile, setProfile] = useState<any>({
        fullName: '',
        nickname: '',
        dob: '',
        email: '',
        phone: '',
        gender: '',
    });

    useEffect(() => {
        getProfile().then((res) => setProfile(res.data));
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setProfile({ ...profile, [e.target.name]: e.target.value });
    };

    const handleSubmit = async () => {
        try {
            await updateProfile(profile);
            alert('Profile updated!');
        } catch {
            alert('Update failed');
        }
    };

    return (
        <div className='flex flex-col items-center justify-center min-h-screen px-6'>
            <h1 className='text-2xl font-bold mb-6'>Fill your Profile</h1>

            <div className='w-full max-w-sm space-y-3'>
                <Input
                    name='fullName'
                    placeholder='Full Name'
                    value={profile.fullName}
                    onChange={handleChange}
                />
                <Input
                    name='nickname'
                    placeholder='Nickname'
                    value={profile.nickname}
                    onChange={handleChange}
                />
                <Input
                    name='dob'
                    placeholder='Date of Birth'
                    value={profile.dob}
                    onChange={handleChange}
                />
                <Input
                    name='email'
                    placeholder='Email'
                    value={profile.email}
                    onChange={handleChange}
                />
                <Input
                    name='phone'
                    placeholder='Phone Number'
                    value={profile.phone}
                    onChange={handleChange}
                />
                <Input
                    name='gender'
                    placeholder='Gender'
                    value={profile.gender}
                    onChange={handleChange}
                />

                <Button
                    onClick={handleSubmit}
                    className='w-full bg-green-700 text-white'
                >
                    Continue
                </Button>
            </div>
        </div>
    );
}
