'use client';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

interface RandomEnvironmentImageProps {
    query?: string;
    className?: string;
    children?: ReactNode;
}

interface UnsplashImage {
    width: number;
    height: number;
    urls: {
        full: string;
    };
}

const RandomEnvironmentImage = ({
    query = 'environment',
    className = '',
    children,
}: RandomEnvironmentImageProps) => {
    const [imageUrl, setImageUrl] = useState('');
    const fallbackImage = '/assets/background.avif';

    useEffect(() => {
        const fetchImage = async () => {
            try {
                const apiKey = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;

                // Nếu không có API key, sử dụng fallback image ngay
                if (!apiKey) {
                    console.log(
                        'No Unsplash API key found, using fallback image',
                    );
                    setImageUrl(fallbackImage);
                    return;
                }

                let image: UnsplashImage | null = null;
                let attempts = 0;
                const maxAttempts = 5;

                while (attempts < maxAttempts) {
                    const res = await fetch(
                        `https://api.unsplash.com/photos/random?query=${query}&client_id=${apiKey}`,
                    );

                    if (!res.ok) {
                        throw new Error(`Unsplash API error: ${res.status}`);
                    }

                    const data = await res.json();
                    if (data.width > data.height) {
                        image = data;
                        break;
                    }

                    attempts++;
                }

                if (image?.urls?.full) {
                    setImageUrl(image.urls.full);
                } else {
                    setImageUrl(fallbackImage);
                }
            } catch (err) {
                console.error('Error fetching Unsplash image:', err);
                setImageUrl(fallbackImage);
            }
        };

        fetchImage();
    }, [query, fallbackImage]);

    return (
        <div
            className={`h-[110vh] bg-cover bg-center bg-fixed ${className}`}
            style={{
                backgroundImage: `url(${imageUrl || fallbackImage})`,
            }}
        >
            {!imageUrl && (
                <p className='text-center pt-20 text-gray-500'>
                    Loading background...
                </p>
            )}
            {imageUrl && children}
        </div>
    );
};

export default RandomEnvironmentImage;
