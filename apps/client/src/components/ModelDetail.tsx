import { useState } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';

type ModalProps = {
    images: string[];
    onClose?: () => void;
    startIndex?: number;
};

export default function ModalDetail({
    images,
    startIndex = 0,
    onClose,
}: ModalProps) {
    const [currentIndex, setCurrentIndex] = useState(startIndex);

    if (!images || images.length === 0) return null;

    return (
        <AnimatePresence>
            <MotionConfig transition={{ duration: 0.3, ease: 'easeInOut' }}>
                <motion.div
                    className='fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50'
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    {/* Overlay */}
                    <div className='absolute inset-0' onClick={onClose} />

                    {/* Nội dung modal */}
                    <motion.div
                        className='relative max-w-4xl w-full mx-4'
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                    >
                        {/* Ảnh lớn */}
                        <div className='relative'>
                            <img
                                src={images[currentIndex]}
                                alt={`image-${currentIndex}`}
                                className='w-full h-[540px] object-contain rounded-2xl'
                            />
                            {/* Nút đóng */}
                            <button
                                className='absolute top-2 right-1 text-white bg-black bg-opacity-50 px-3 py-1 rounded-lg'
                                onClick={onClose}
                            >
                                ✕
                            </button>
                            {/* Nút điều hướng */}
                            {currentIndex > 0 && (
                                <button
                                    className='absolute left-2 top-1/2 -translate-y-1/2 text-white text-3xl'
                                    onClick={() =>
                                        setCurrentIndex((i) => i - 1)
                                    }
                                >
                                    ‹
                                </button>
                            )}
                            {currentIndex < images.length - 1 && (
                                <button
                                    className='absolute right-2 top-1/2 -translate-y-1/2 text-white text-3xl'
                                    onClick={() =>
                                        setCurrentIndex((i) => i + 1)
                                    }
                                >
                                    ›
                                </button>
                            )}
                        </div>

                        {/* Thumbnails */}
                        <div className='mt-4 flex justify-center space-x-2'>
                            {images.map((img, idx) => (
                                <img
                                    key={idx}
                                    src={img}
                                    onClick={() => setCurrentIndex(idx)}
                                    className={`w-36 h-36 object-cover rounded cursor-pointer border-2 ${
                                        currentIndex === idx
                                            ? 'border-green-500'
                                            : 'border-transparent'
                                    }`}
                                />
                            ))}
                        </div>
                    </motion.div>
                </motion.div>
            </MotionConfig>
        </AnimatePresence>
    );
}
