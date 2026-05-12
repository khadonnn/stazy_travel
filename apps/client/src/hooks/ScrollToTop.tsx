"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MoveUp } from "lucide-react";

interface ScrollToTopProps {
  /** Routes where the button should be hidden */
  hideRoutes?: string[];
}

const ScrollToTop = ({ hideRoutes = [] }: ScrollToTopProps) => {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Show/hide button based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Check if current route should hide the button
  const shouldHide = hideRoutes.some((route) => pathname?.startsWith(route));

  if (shouldHide) return null;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      onClick={scrollToTop}
      aria-label="Scroll to top"
      className={`
        fixed bottom-4 left-4 z-[9998]
        p-3 rounded-full
        bg-white shadow-md border border-gray-200
        hover:bg-gray-100
        cursor-pointer
        transition-all duration-300 ease-in-out
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}
      `}
    >
      <MoveUp className="w-5 h-5 text-gray-700" />
    </button>
  );
};

export default ScrollToTop;
