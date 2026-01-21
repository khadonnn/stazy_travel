/**
 * Server-side authorization middleware
 */

import { redirect } from "next/navigation";
import { getUserRole, type UserRole } from "./roles";

/**
 * Middleware yêu cầu user phải là Author (hoặc Admin)
 * Dùng trong Server Components hoặc Server Actions
 */
export async function requireAuthor() {
  const role = await getUserRole();

  if (!role) {
    redirect("/sign-in");
  }

  if (role !== "AUTHOR" && role !== "ADMIN") {
    redirect("/profile?error=require_author");
  }

  return role;
}

/**
 * Middleware yêu cầu user phải là Admin
 */
export async function requireAdmin() {
  const role = await getUserRole();

  if (!role) {
    redirect("/sign-in");
  }

  if (role !== "ADMIN") {
    redirect("/?error=unauthorized");
  }

  return role;
}

/**
 * Middleware yêu cầu user phải có một trong các role được chỉ định
 */
export async function requireRole(requiredRoles: UserRole[]) {
  const role = await getUserRole();

  if (!role) {
    redirect("/sign-in");
  }

  if (!requiredRoles.includes(role)) {
    redirect("/?error=unauthorized");
  }

  return role;
}

/**
 * Kiểm tra role không redirect, trả về boolean
 */
export async function checkRole(requiredRoles: UserRole[]): Promise<boolean> {
  const role = await getUserRole();
  return role ? requiredRoles.includes(role) : false;
}
