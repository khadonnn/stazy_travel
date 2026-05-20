// Stub for @clerk/nextjs in browser context (Pages Router)
export function auth() {
  return Promise.resolve({ userId: null });
}

export function useUser() {
  return { user: null, isSignedIn: false, isLoaded: true };
}

export function useAuth() {
  return { userId: null, isSignedIn: false, isLoaded: true };
}

export function ClerkProvider({ children }: { children: any }) {
  return children;
}

export function SignedIn({ children }: { children: any }) {
  return null;
}

export function SignedOut({ children }: { children: any }) {
  return null;
}

export function UserButton() {
  return null;
}

export function SignIn() {
  return null;
}

export function SignUp() {
  return null;
}
