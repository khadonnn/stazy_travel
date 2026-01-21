/**
 * Client-side role hooks
 */

import { useUser } from "@clerk/nextjs";
import type { UserRole } from "@/lib/auth/roles";

/**
 * Hook để lấy role của user hiện tại từ Clerk
 */
export function useRole(): UserRole {
  const { user } = useUser();
  return (user?.publicMetadata?.role as UserRole) || "USER";
}

/**
 * Hook kiểm tra xem user có phải Author không
 */
export function useIsAuthor(): boolean {
  const role = useRole();
  return role === "AUTHOR" || role === "ADMIN";
}

/**
 * Hook kiểm tra xem user có phải Admin không
 */
export function useIsAdmin(): boolean {
  const role = useRole();
  return role === "ADMIN";
}

/**
 * Hook kiểm tra xem user có một trong các role không
 */
export function useHasRole(roles: UserRole[]): boolean {
  const role = useRole();
  return roles.includes(role);
}
