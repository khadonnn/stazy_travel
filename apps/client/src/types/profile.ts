// Dữ liệu signup
// export interface SignupPayload {
//     name: string;
//     email: string;
//     password: string;
// }

import { PostDataType } from '@/types/stay';

// // Dữ liệu login
// export interface LoginPayload {
//     email: string;
//     password: string;
// }

// // Dữ liệu update profile
// export interface UpdateProfilePayload {
//     name?: string;
//     email?: string;
//     password?: string;
//     profilePic?: string;
//     // tuỳ theo API của bạn
// }

// Kiểu dữ liệu User mới
export interface User {
    id: string;
    name: string;
    email: string;
    password: string; // chỉ để mockup
    role: 'admin' | 'user';
    profilePic?: string;
    nickname?: string;
    dob?: string;
    phone?: string;
    gender?: string;
    address?: string;
    createdAt?: string;
    updatedAt?: string;
    profile_pic?: string; // cho tương thích backend
    posts?: PostDataType[]; // Mảng bài viết của người dùng
}


// Payloads
export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
}

export interface UpdateProfilePayload {
    name?: string;
    nickname?: string;
    email?: string;
    dob?: string;
    phone?: string;
    address?: string;
    gender?: string;
    profilePic?: File | string | null;
}
