// types/user.ts

export type UserRole = "USER" | "AUTHOR" | "ADMIN";

export type IUser = {
  id: string;
  email: string;
  name: string;
  nickname?: string | null;
  phone?: string | null;
  gender?: string | null;
  dob?: string | null;
  address?: string | null;
  avatar?: string | null;
  bgImage?: string | null;
  jobName?: string | null;
  desc?: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
};
