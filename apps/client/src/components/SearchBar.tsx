"use client"; // Giữ nguyên dòng này

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

// FIX: Xóa từ khóa 'async' ở đây
const SearchBar = () => {
  const t = useTranslations("SearchBar"); // Giữ nguyên hook Client

  return (
    <div className="hidden sm:flex items-center gap-2 rounded-md ring-1 ring-gray-300 px-2 py-2 shadow-md">
      <Search className="w-4 h-4 mr-2 text-gray-500" />
      <input
        id="search"
        placeholder={t("searchPlaceholder")}
        className="text-sm outline-0 bg-transparent text-gray-600 placeholder-gray-400 px-2 rounded-md"
      />
    </div>
  );
};

export default SearchBar;
