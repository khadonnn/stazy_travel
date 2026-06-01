"use client";

import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { useLocale } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const languages = [
  { code: "en", label: "English" },
  { code: "vi", label: "Tiếng Việt" },
  // { code: "es", label: "Español" },
  // { code: "fr", label: "Français" },
  // { code: "de", label: "Deutsch" },
  // { code: "jp", label: "日本語" },
  // { code: "cn", label: "中文" },
];

interface LanguagePickerProps {
  // FIX: Đổi tên prop nhận vào thành changeLocaleAction cho khớp với Navbar
  changeLocaleAction: (nextLocale: string) => Promise<void>;
}

export function LanguagePicker({ changeLocaleAction }: LanguagePickerProps) {
  // 1. Lấy chuẩn locale đang active từ next-intl thay vì bóc cookie thủ công
  const currentLocale = useLocale();

  // 2. Tìm object ngôn ngữ tương ứng (luôn luôn có giá trị fallback an toàn)
  const currentLanguageObject = languages.find(
    (lang) => lang.code === currentLocale,
  ) || { code: "vi", label: "Tiếng Việt" };

  const router = useRouter();

  // 3. Sửa lại hàm handleLanguageChange:
  const handleLanguageChange = async (nextLocale: string) => {
    // Gọi Server Action để set cookie phía Server
    await changeLocaleAction(nextLocale);

    // Thay thế window.location.reload() bằng router.refresh()
    router.refresh();
  };

  return (
    <div className="p-4 flex justify-center">
      <DropdownMenu>
        {/* Nút bấm kích hoạt Dropdown */}
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            // FIX: Cố định độ rộng (w-36) và neo text từ bên trái (justify-start)
            // để nút không co giãn gây nhảy layout khi đổi sang chữ dài hơn
            className="w-36 justify-start gap-2 rounded-xl bg-gray-50 hover:bg-gray-100 border-none shadow-sm font-medium"
          >
            <Globe className="h-4 w-4 text-gray-700 shrink-0" />
            <span className="truncate">{currentLanguageObject.label}</span>
          </Button>
        </DropdownMenuTrigger>

        {/* Menu chứa danh sách ngôn ngữ */}
        {/* FIX: Đổi align="start" thành align="end" để menu neo cố định vào mép phải của nút bấm */}
        <DropdownMenuContent className="w-56 rounded-xl p-2" align="end">
          <DropdownMenuLabel className="font-semibold text-sm px-3 py-2 text-gray-900">
            Select Language
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="my-1" />

          <div className="flex flex-col gap-1">
            {languages.map((lang) => {
              const isSelected = currentLocale === lang.code;
              return (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg hover:bg-gray-100 focus:bg-gray-100 relative group"
                >
                  {/* Dấu chấm indicator nằm bên trái */}
                  <div className="w-4 flex items-center justify-center">
                    {isSelected && (
                      <span className="h-2 w-2 rounded-full bg-black" />
                    )}
                  </div>

                  {/* Mã ngôn ngữ (in hoa, màu xám) */}
                  <span className="text-xs uppercase text-gray-500 font-medium w-6 tracking-wider">
                    {lang.code}
                  </span>

                  {/* Tên ngôn ngữ */}
                  <span className="text-sm font-normal text-gray-950">
                    {lang.label}
                  </span>
                </DropdownMenuItem>
              );
            })}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
