import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminUser {
    id: number;
    name: string;
    email: string;
    role: string;
}

interface AdminAuthState {
    adminUser: AdminUser | null;
    isLoading: boolean;
    isAdminAuthenticated: boolean;
    hasCheckedAuth: boolean; // Thêm flag để tránh check liên tục

    // Actions
    adminLogin: (email: string, password: string) => Promise<void>;
    adminLogout: (shouldRedirect?: boolean) => void;
    checkAdminAuth: () => Promise<void>;
    refreshAdminToken: () => Promise<boolean>;
    setAdminUser: (user: AdminUser | null) => void;
    setLoading: (loading: boolean) => void;
}

export const useAdminAuthStore = create<AdminAuthState>()(
    persist(
        (set, get) => ({
            adminUser: null,
            isLoading: true,
            isAdminAuthenticated: false,
            hasCheckedAuth: false,

            setAdminUser: (user: AdminUser | null) => {
                set({ 
                    adminUser: user, 
                    isAdminAuthenticated: !!user 
                });
            },

            setLoading: (loading: boolean) => {
                set({ isLoading: loading });
            },

            adminLogin: async (email: string, password: string) => {
                console.log('AdminStore: Starting login process');
                set({ isLoading: true });
                try {
                    console.log('AdminStore: Making login request to API');
                    const response = await fetch('http://localhost:8000/api/auth/login', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                        },
                        body: JSON.stringify({ email, password }),
                    });

                    const data = await response.json();
                    console.log('AdminStore: API response:', data);

                    if (!response.ok || !data.success) {
                        console.error('AdminStore: Login failed - API error:', data.message);
                        throw new Error(data.message || 'Login failed');
                    }

                    // Check if user is admin
                    if (data.data.user.role !== 'admin') {
                        console.error('AdminStore: Login failed - Not admin role:', data.data.user.role);
                        throw new Error('Access denied. Admin privileges required.');
                    }

                    const adminUser: AdminUser = {
                        id: data.data.user.id,
                        name: data.data.user.name,
                        email: data.data.user.email,
                        role: data.data.user.role,
                    };

                    // Store admin session
                    console.log('AdminStore: Storing admin session');
                    localStorage.setItem('admin-token', data.data.token);
                    localStorage.setItem('admin-user', JSON.stringify(adminUser));
                    
                    set({ 
                        adminUser, 
                        isAdminAuthenticated: true,
                        isLoading: false,
                        hasCheckedAuth: false // Reset để có thể check auth cho dashboard
                    });

                    console.log('AdminStore: Login successful');
                } catch (error) {
                    console.error('AdminStore: Login error caught:', error);
                    set({ isLoading: false });
                    throw error;
                }
            },

            adminLogout: (shouldRedirect: boolean = true) => {
                localStorage.removeItem('admin-token');
                localStorage.removeItem('admin-user');
                set({ 
                    adminUser: null, 
                    isAdminAuthenticated: false,
                    hasCheckedAuth: false // Reset để có thể check lại
                });

                // Only redirect if explicitly requested and we're on admin pages
                if (shouldRedirect && window.location.pathname.startsWith('/admin') && 
                    window.location.pathname !== '/admin/login') {
                    window.location.href = '/admin/login';
                }
            },

            refreshAdminToken: async (): Promise<boolean> => {
                try {
                    const adminToken = localStorage.getItem('admin-token');
                    if (!adminToken) {
                        return false;
                    }

                    const response = await fetch('http://localhost:8000/api/auth/refresh', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${adminToken}`,
                            'Accept': 'application/json'
                        }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data.success) {
                            localStorage.setItem('admin-token', data.data.token);
                            return true;
                        }
                    }
                    
                    // If refresh fails, logout without redirect
                    get().adminLogout(false);
                    return false;
                } catch (error) {
                    console.error('Token refresh failed:', error);
                    get().adminLogout();
                    return false;
                }
            },

            checkAdminAuth: async () => {
                try {
                    // Only run admin auth check if we're on admin pages
                    if (!window.location.pathname.startsWith('/admin')) {
                        set({ isLoading: false });
                        return;
                    }

                    // Skip only if already authenticated AND checked
                    if (get().hasCheckedAuth && get().isAdminAuthenticated) {
                        console.log('AdminStore: Already authenticated, skipping');
                        return;
                    }

                    console.log('AdminStore: Starting auth check');
                    set({ isLoading: true });

                    const adminToken = localStorage.getItem('admin-token');
                    const storedAdminUser = localStorage.getItem('admin-user');

                    if (adminToken && storedAdminUser) {
                        // Verify token with backend
                        const response = await fetch('http://localhost:8000/api/auth/profile', {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${adminToken}`,
                                'Accept': 'application/json',
                            },
                        });

                        if (response.ok) {
                            const data = await response.json();

                            if (data.success && data.data.user.role === 'admin') {
                                const user: AdminUser = {
                                    id: data.data.user.id,
                                    name: data.data.user.name,
                                    email: data.data.user.email,
                                    role: data.data.user.role,
                                };

                                localStorage.setItem('admin-user', JSON.stringify(user));
                                set({ 
                                    adminUser: user, 
                                    isAdminAuthenticated: true,
                                    isLoading: false,
                                    hasCheckedAuth: true
                                });
                                return;
                            }
                        } else if (response.status === 401) {
                            // Token expired, try to refresh
                            const refreshSuccess = await get().refreshAdminToken();
                            if (refreshSuccess) {
                                // Retry auth check with new token
                                await get().checkAdminAuth();
                                return;
                            }
                        }

                        // Token is invalid or expired, clear it
                        localStorage.removeItem('admin-token');
                        localStorage.removeItem('admin-user');
                        set({ 
                            adminUser: null, 
                            isAdminAuthenticated: false,
                            isLoading: false,
                            hasCheckedAuth: true
                        });
                    } else {
                        set({ 
                            isLoading: false,
                            hasCheckedAuth: true 
                        });
                    }
                } catch (error) {
                    console.error('Admin auth check failed:', error);
                    localStorage.removeItem('admin-token');
                    localStorage.removeItem('admin-user');
                    set({ 
                        adminUser: null, 
                        isAdminAuthenticated: false,
                        isLoading: false,
                        hasCheckedAuth: true
                    });
                }
            },
        }),
        {
            name: 'admin-auth-storage',
            // Only persist admin user data, not tokens (for security)
            partialize: (state) => ({ 
                adminUser: state.adminUser,
                isAdminAuthenticated: state.isAdminAuthenticated,
                hasCheckedAuth: false // Reset mỗi lần reload page
            }),
        }
    )
);

// Export the refreshAdminToken function for use in adminApi
export const refreshAdminToken = () => useAdminAuthStore.getState().refreshAdminToken();