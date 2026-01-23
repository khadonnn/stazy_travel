import { create } from "zustand";
import { persist } from "zustand/middleware";
import toast from "react-hot-toast";
import axios from "axios";

import type {
  LoginPayload,
  SignupPayload,
  UpdateProfilePayload,
} from "@/types/profile";
import { IUser } from "@repo/types";

// Tạo axios instance riêng cho auth (không ảnh hưởng global axios)
const authApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api",
});

interface AuthState {
  authUser: IUser | null;
  isLoggingIn: boolean;
  isSigningUp: boolean;
  isUpdatingProfile: boolean;

  checkAuth: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  signup: (payload: SignupPayload) => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      authUser: null,
      isLoggingIn: false,
      isSigningUp: false,
      isUpdatingProfile: false,

      // ⚠️ Clerk integration: thường không cần gọi checkAuth nếu Clerk dùng client-side session,
      // nhưng nếu bạn cần sync với backend (ví dụ: JWT trong header), bạn có thể dùng:
      checkAuth: async () => {
        try {
          const res = await authApi.get<{ user: IUser }>("/auth/me");
          set({ authUser: res.data.user });
        } catch (error) {
          set({ authUser: null });
        }
      },

      login: async (payload) => {
        set({ isLoggingIn: true });
        try {
          const res = await authApi.post<{ user: IUser }>(
            "/auth/login",
            payload,
          );
          set({ authUser: res.data.user, isLoggingIn: false });
          toast.success("Đăng nhập thành công");
        } catch (err: any) {
          toast.error(err.response?.data?.message || "Đăng nhập thất bại");
          set({ isLoggingIn: false });
        }
      },

      signup: async (payload) => {
        set({ isSigningUp: true });
        try {
          const res = await authApi.post<{ user: IUser }>(
            "/auth/signup",
            payload,
          );
          set({ authUser: res.data.user, isSigningUp: false });
          toast.success("Đăng ký thành công");
        } catch (err: any) {
          toast.error(err.response?.data?.message || "Đăng ký thất bại");
          set({ isSigningUp: false });
        }
      },

      updateProfile: async (payload) => {
        set({ isUpdatingProfile: true });
        try {
          const res = await authApi.patch<{ user: IUser }>(
            "/auth/profile",
            payload,
          );
          set({ authUser: res.data.user, isUpdatingProfile: false });
          toast.success("Cập nhật thành công");
        } catch (err: any) {
          toast.error(err.response?.data?.message || "Cập nhật thất bại");
          set({ isUpdatingProfile: false });
        }
      },

      logout: async () => {
        try {
          await authApi.post("/auth/logout");
          set({ authUser: null });
        } catch {
          // Dù lỗi, vẫn reset local state để đảm bảo logout
          set({ authUser: null });
        }
      },
    }),
    {
      name: "lusxe-auth-storage",
      // Optional: chỉ lưu `authUser` nếu cần (tránh lưu trạng thái loading)
      // partialize: (state) => ({ authUser: state.authUser }),
    },
  ),
);
