import { z } from 'zod';

export type ProductType = {
    id: string | number;
    name: string;
    shortDescription: string;
    description: string;
    price: number;
    sizes: string[];
    colors: string[];
    images: Record<string, string>;
};

export type ProductsType = ProductType[];

export type CartItemType = ProductType & {
    quantity: number;
    selectedSize: string;
    selectedColor: string;
};

export type CartItemsType = CartItemType[];

export const BookingFormSchema = z.object({
    name: z.string().min(1, 'Name is required!'),
    email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address!').min(1, 'Email is required!'),
    phone: z
        .string()
        .min(7, 'Phone number must be between 7 and 10 digits!')
        .max(10, 'Phone number must be between 7 and 10 digits!')
        .regex(/^\d+$/, 'Phone number must contain only numbers!'),
    address: z.string().min(1, 'Address is required!'),
    city: z.string().min(1, 'City is required!'),
});

export type BookingFormInputs = z.infer<typeof BookingFormSchema>;

//
export const PaymentMethod = {
    CreditCard: 'credit_card',
    MOMO: 'momo',
    ZaloPay: 'zalopay',
} as const;

export const paymentMethodEnum = z.enum(Object.values(PaymentMethod));

export const paymentFormSchema = z.object({
    cardHolder: z.string().min(1, 'Card holder is required!'),

    cardNumber: z
        .string()
        .trim()
        .refine( 
            (val) => {
                const cleaned = val.replace(/\s+/g, ''); 
                return /^\d{16}$/.test(cleaned);
            },
            {
                message: 'Card Number must be 16 digits (spaces ignored)!',
            }
        ),

    expirationDate: z
        .string()
        .regex(
            /^(0[1-9]|1[0-2])\/\d{2}$/,
            'Expiration date must be in MM/YY format!',
        ),

    cvv: z.string().regex(/^\d{3,4}$/, 'CVV must be 3 or 4 digits!'),

    paymentMethod: paymentMethodEnum,
});

// payment

export type PaymentFormInputs = z.infer<typeof paymentFormSchema>;

export type CartStoreStateType = {
    cart: CartItemsType;
    hasHydrated: boolean;
};

export type CartStoreActionsType = {
    addToCart: (product: CartItemType) => void;
    removeFromCart: (product: CartItemType) => void;
    clearCart: () => void;
};
