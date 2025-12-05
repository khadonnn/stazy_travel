'use client';

import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';

import { cn } from '@/lib/utils';

interface DualRangeSliderProps
    extends React.ComponentProps<typeof SliderPrimitive.Root> {
    labelPosition?: 'top' | 'bottom';
    label?: (value: number | undefined) => React.ReactNode;
}

const DualRangeSlider = React.forwardRef<
    React.ElementRef<typeof SliderPrimitive.Root>,
    DualRangeSliderProps
>(
    (
        { className, label, labelPosition = 'top', value = [0, 100], ...props },
        ref,
    ) => {
        return (
            <SliderPrimitive.Root
                ref={ref}
                className={cn(
                    'relative flex w-full touch-none select-none items-center',
                    className,
                )}
                value={value}
                {...props}
            >
                <SliderPrimitive.Track className='relative h-2 w-full grow overflow-hidden rounded-full bg-secondary'>
                    <SliderPrimitive.Range className='absolute h-full bg-primary' />
                </SliderPrimitive.Track>
                {(value as [number, number]).map((v, i) => (
                    <SliderPrimitive.Thumb
                        key={i}
                        className='relative block h-4 w-4 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'
                    >
                        {label && (
                            <span
                                className={cn(
                                    'absolute flex w-full justify-center pointer-events-none z-20',
                                    labelPosition === 'top' && '-top-7',
                                    labelPosition === 'bottom' && 'top-4',
                                )}
                            >
                                {label(v)}
                            </span>
                        )}
                    </SliderPrimitive.Thumb>
                ))}
            </SliderPrimitive.Root>
        );
    },
);
DualRangeSlider.displayName = 'DualRangeSlider';

export { DualRangeSlider };
