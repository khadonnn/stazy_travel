// Stub module for @repo/product-db in browser context
export const prisma = new Proxy({} as any, {
    get: () => {
        throw new Error('prisma should not be called from browser code');
    },
});

export function getHotelPrice() {
    return 0;
}

export const InteractionType = {} as any;
export const Prisma = {} as any;
export default prisma;
