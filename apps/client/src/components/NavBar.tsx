"use client";
import SearchBar from "@/components/SearchBar";
import { Button } from "@/components/ui/button";
import { BadgeInfo, Bell, Plane, Map, Heart, Languages } from "lucide-react"; // Thêm icon Languages để chọn ngôn ngữ
import { usePathname } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import UserSetting from "@/components/UserSetting";
import Image from "next/image";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useTranslations } from "next-intl"; // <--- 1. Import hook dịch từ next-intl

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"; // Sử dụng Dropdown của shadcn/ui cho nút chuyển ngôn ngữ
import { LanguagePicker } from "./language/LanguagePicker";
interface NavbarProps {
  changeLocaleAction: (nextLocale: string) => Promise<void>;
}
const Navbar = ({ changeLocaleAction }: NavbarProps) => {
  const pathname = usePathname();
  const t = useTranslations("Navbar"); // <--- 2. Khởi tạo dịch với namespace "Navbar"

  const hiddenRoutes = ["/search-service", "/full-screen", "/chat", "/about"];
  const shouldHide = hiddenRoutes.some((route) => pathname?.startsWith(route));

  if (shouldHide) return null;
  const { isSignedIn, user, isLoaded } = useUser();

  // 3. Hàm xử lý chuyển đổi ngôn ngữ bằng Cookie (Không đổi URL)
  const changeLanguage = (nextLocale: string) => {
    document.cookie = `locale=${nextLocale}; path=/; max-age=31536000;`;
    window.location.reload(); // Refresh lại trang để Server nhận locale mới từ cookie
  };

  if (!isLoaded) {
    return (
      <div className="w-full h-16 bg-white/80 backdrop-blur-md fixed top-0 z-50" />
    );
  }

  return (
    <div className="w-full flex items-center justify-between border border-gray-300/50 px-10 fixed top-0 z-50 bg-white/60 backdrop-blur-lg shadow-sm">
      {/* left */}
      <Link href="/" className="flex items-center">
        <Image
          src={"/assets/logo.png"}
          alt="logo"
          className="w-6 h-6 md:w-8 md:h-8"
          loading="lazy"
          width={32}
          height={32}
        />
        <p className="hidden md:block text-2xl font-semibold tracking-wider ml-2 ">
          Stazy.
        </p>
      </Link>

      {/* right */}
      <TooltipProvider>
        <div className="flex items-center gap-4">
          <SearchBar />

          {/* About / Giới thiệu */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/about"
                className="hover:bg-accent rounded-md p-2 transition-colors"
              >
                <BadgeInfo className="w-5 h-5 text-gray-600" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{t("about")}</p> {/* <--- Dịch chữ "Giới thiệu" */}
            </TooltipContent>
          </Tooltip>

          {/* Explore / Khám phá */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/hotels"
                className="hover:bg-accent rounded-md p-2 transition-colors"
              >
                <Plane className="w-5 h-5 text-gray-600" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{t("explore")}</p> {/* <--- Dịch chữ "Khám phá" */}
            </TooltipContent>
          </Tooltip>

          {/* Favorites / Yêu thích */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/favorites"
                className="hover:bg-accent rounded-md p-2 transition-colors"
              >
                <Heart className="w-5 h-5 text-gray-600" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{t("favorites")}</p> {/* <--- Dịch chữ "Yêu thích" */}
            </TooltipContent>
          </Tooltip>

          {/* Notifications / Thông báo */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="hover:bg-accent rounded-md p-2 transition-colors">
                <Bell className="w-5 h-5 text-gray-600" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{t("notifications")}</p> {/* <--- Dịch chữ "Thông báo" */}
            </TooltipContent>
          </Tooltip>

          {/* 4. Nút Switch Ngôn Ngữ tích hợp thêm */}
          <LanguagePicker changeLocaleAction={changeLocaleAction} />

          {/* Auth / Đăng nhập */}
          {isSignedIn ? (
            <UserSetting />
          ) : (
            <Link href="/sign-in">
              <Button
                variant="outline"
                className="hidden md:inline-flex border-gray-300 hover:shadow-md"
              >
                {t("login")} {/* <--- Dịch chữ "Đăng nhập" */}
              </Button>
            </Link>
          )}
        </div>
      </TooltipProvider>
    </div>
  );
};

export default Navbar;
