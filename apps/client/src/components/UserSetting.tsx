"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LogOut,
  Settings,
  User,
  Calendar,
  HousePlus,
  GalleryVerticalEnd,
} from "lucide-react";
import { useUser, useClerk } from "@clerk/nextjs"; //  Clerk hooks
import Link from "next/link";
import { useIsAuthor } from "@/hooks/useRole";

export default function UserSetting() {
  const { user } = useUser(); // Clerk user object
  const { signOut } = useClerk(); // hàm đăng xuất
  const isAuthor = useIsAuthor(); // Kiểm tra role

  if (!user) return null; // bảo vệ an toàn

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-primary rounded-full">
        <Avatar className="w-8 h-8">
          <AvatarImage
            src={user.imageUrl || "/assets/user2.avif"} // Clerk tự quản lý ảnh
            alt={user.fullName || "user"}
            className="object-cover w-full h-full"
          />
          <AvatarFallback>
            {(user.firstName?.charAt(0) || "U").toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="mt-1">
        <DropdownMenuLabel>{user.fullName || "My Account"}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link
            href={`/profile/${user.id}`} //  dùng user.id từ Clerk
            className="flex items-center gap-2"
          >
            <User className="h-4 w-4" /> Profile
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/my-bookings" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Phòng đã đặt
          </Link>
        </DropdownMenuItem>

        {isAuthor && (
          <>
            <DropdownMenuItem asChild>
              <Link href="/create-hotel" className="flex items-center gap-2">
                <HousePlus className="h-4 w-4" /> Tạo khách sạn
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link href="/my-hotels" className="flex items-center gap-2">
                <GalleryVerticalEnd className="h-4 w-4" /> Khách sạn đã tạo
              </Link>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuItem>
          <Settings className="h-4 w-4" /> Settings
        </DropdownMenuItem>

        <DropdownMenuItem
          className="text-destructive"
          onClick={() => signOut()} //  dùng Clerk signOut
        >
          <LogOut className="h-4 w-4" /> Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
