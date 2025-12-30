import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import toast from 'react-hot-toast';
import type {
    User,
    LoginPayload,
    SignupPayload,
    UpdateProfilePayload,
} from '@/types/profile';
import api from '@/lib/api/axios'; // axios instance

interface AuthState {
    authUser: User | null;
    isLoggingIn: boolean;
    isSigningUp: boolean;
    isUpdatingProfile: boolean;

    login: (data: LoginPayload) => Promise<void>;
    logout: () => Promise<void>;
    signup: (data: SignupPayload) => Promise<void>;
    updateProfile: (data: UpdateProfilePayload) => Promise<void>;
    checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            authUser: null,
            isLoggingIn: false,
            isSigningUp: false,
            isUpdatingProfile: false,

            //  ĐÃ SỬA: Lấy data.data.user và data.data.token
            login: async ({ email, password }) => {
                set({ isLoggingIn: true });
                try {
                    const response = await api.post('/auth/login', {
                        email,
                        password,
                    });

                    // Lấy data từ response.data.data
                    const apiData = response.data.data;
                    console.log('Login response data:', apiData);
                    localStorage.setItem('user-token', apiData.token);
                    set({ authUser: apiData.user });

                    toast.success('Đăng nhập thành công');
                } catch (error) {
                    toast.error('Sai email hoặc mật khẩu');
                    console.error('Login error:', error);
                    throw error;
                } finally {
                    set({ isLoggingIn: false });
                }
            },

            logout: async () => {
                try {
                    const token = localStorage.getItem('user-token');
                    if (token) {
                        await api.post(
                            '/auth/logout',
                            {},
                            {
                                headers: { Authorization: `Bearer ${token}` },
                            },
                        );
                    }
                } catch (error) {
                    console.error('Logout error:', error);
                } finally {
                    localStorage.removeItem('user-token');
                    set({ authUser: null });
                    toast.success('Đã đăng xuất');
                    window.location.href = '/login';
                }
            },

            //  ĐÃ SỬA: Giả sử /auth/register cũng trả về cấu trúc tương tự
            signup: async (data) => {
                set({ isSigningUp: true });
                try {
                    const response = await api.post('/auth/register', data);
                    const apiData = response.data.data; // 👈 giống login

                    localStorage.setItem('user-token', apiData.token);
                    set({ authUser: apiData.user });

                    toast.success('Tạo tài khoản thành công');
                } catch (error) {
                    toast.error('Đăng ký thất bại');
                    console.error('Signup error:', error);
                } finally {
                    set({ isSigningUp: false });
                }
            },

            //  Cập nhật hồ sơ người dùng với upload ảnh
            updateProfile: async (data: UpdateProfilePayload) => {
                set({ isUpdatingProfile: true });
                try {
                    const token = localStorage.getItem('user-token');
                    const formData = new FormData();

                    // Nếu data.profilePic là File thì append file với tên đúng backend expects
                    if (data.profilePic instanceof File) {
                        formData.append('profile_pic', data.profilePic);
                    }

                    // Append tất cả các field khác nếu có giá trị
                    if (data.name) formData.append('name', data.name);
                    if (data.nickname)
                        formData.append('nickname', data.nickname);
                    if (data.email) formData.append('email', data.email);
                    if (data.dob) formData.append('dob', data.dob);
                    if (data.phone) formData.append('phone', data.phone);
                    if (data.address) formData.append('address', data.address);
                    if (data.gender && data.gender !== '')
                        formData.append('gender', data.gender);

                    formData.append('_method', 'PUT');

                    // Debug: Log formData contents
                    console.log('Sending profile update data:');
                    for (const [key, value] of formData.entries()) {
                        console.log(key, value);
                    }

                    const response = await api.post('/auth/profile', formData, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'multipart/form-data',
                        },
                    });

                    const apiData = response.data.data;
                    set({ authUser: apiData.user });
                    toast.success('Cập nhật hồ sơ thành công');
                } catch (error: unknown) {
                    const axiosError = error as {
                        response?: {
                            status?: number;
                            data?: {
                                errors?: Record<string, string[]>;
                            };
                        };
                        message?: string;
                    };

                    console.error('Update profile error details:', {
                        status: axiosError.response?.status,
                        data: axiosError.response?.data,
                        message: axiosError.message,
                    });

                    // More specific error messages
                    if (axiosError.response?.status === 422) {
                        const validationErrors =
                            axiosError.response.data?.errors;
                        if (validationErrors) {
                            const firstError =
                                Object.values(validationErrors)[0];
                            toast.error(`Validation error: ${firstError}`);
                        } else {
                            toast.error('Dữ liệu không hợp lệ');
                        }
                    } else {
                        toast.error('Không thể cập nhật hồ sơ');
                    }
                    console.error('Update profile error:', error);
                    throw error;
                } finally {
                    set({ isUpdatingProfile: false });
                }
            },

            // Kiểm tra và load thông tin user từ token
            checkAuth: async () => {
                try {
                    const token = localStorage.getItem('user-token');
                    if (!token) {
                        set({ authUser: null });
                        return;
                    }

                    const response = await api.get('/auth/profile', {
                        headers: { Authorization: `Bearer ${token}` },
                    });

                    const apiData = response.data.data;
                    set({ authUser: apiData.user });
                    console.log('Auth checked, user loaded:', apiData.user);
                } catch (error) {
                    console.error('Auth check failed:', error);
                    localStorage.removeItem('user-token');
                    set({ authUser: null });
                }
            },
        }),
        {
            name: 'luxe-auth-storage',
        },
    ),
);
