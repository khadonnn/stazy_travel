export {};

// Mở rộng interface mặc định của Clerk
declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: "admin" | "user" | string;
    };
  }
}
