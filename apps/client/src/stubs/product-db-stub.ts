// Stub module for @repo/product-db in browser context
// This prevents Node.js-only modules (pg, prisma-adapter) from being bundled into browser
export const prisma = new Proxy({} as any, {
  get: () => {
    throw new Error("prisma should not be called from browser code");
  },
});

export function getHotelPrice() {
  return 0;
}

// Re-export Prisma namespace types (they compile away at runtime)
export const InteractionType = {} as any;
export const Prisma = {} as any;
export default prisma;
