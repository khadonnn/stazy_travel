import api from "./axios";

export const getProfile = () => api.get("/auth/profile");
export const updateProfile = (data: Record<string, unknown>) => api.put("/auth/profile", data);
