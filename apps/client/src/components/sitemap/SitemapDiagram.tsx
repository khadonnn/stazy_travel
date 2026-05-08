"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Search,
  Hotel,
  Info,
  Bug,
  LogIn,
  UserPlus,
  User,
  Calendar,
  ShoppingCart,
  CreditCard,
  RotateCcw,
  Building2,
  Plus,
  GalleryVerticalEnd,
  Heart,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface SitemapNode {
  id: string;
  label: string;
  path?: string;
  icon?: React.ReactNode;
  badge?: string;
  children?: SitemapNode[];
}

const sitemapData: SitemapNode[] = [
  {
    id: "discovery",
    label: "Discovery",
    children: [
      {
        id: "hotels",
        label: "Hotels",
        path: "/hotels",
        icon: <Hotel className="h-4 w-4" />,
      },
      {
        id: "hotel-detail",
        label: "Hotel Detail",
        path: "/hotels/[slug]",
        icon: <Hotel className="h-4 w-4" />,
        badge: "dynamic",
      },
      {
        id: "search",
        label: "AI Search",
        path: "/search-service",
        icon: <Search className="h-4 w-4" />,
      },
      {
        id: "chat",
        label: "AI Chat",
        path: "/chat/[chatId]",
        icon: <MessageCircle className="h-4 w-4" />,
        badge: "dynamic",
      },
      {
        id: "about",
        label: "About",
        path: "/about",
        icon: <Info className="h-4 w-4" />,
      },
    ],
  },
  {
    id: "user",
    label: "User",
    children: [
      {
        id: "signin",
        label: "Sign In",
        path: "/sign-in",
        icon: <LogIn className="h-4 w-4" />,
      },
      {
        id: "signup",
        label: "Sign Up",
        path: "/sign-up",
        icon: <UserPlus className="h-4 w-4" />,
      },
      {
        id: "profile",
        label: "Profile",
        path: "/profile",
        icon: <User className="h-4 w-4" />,
      },
      {
        id: "bookings",
        label: "My Bookings",
        path: "/my-bookings",
        icon: <Calendar className="h-4 w-4" />,
      },
      {
        id: "favorites",
        label: "Favorites",
        path: "/favorites",
        icon: <Heart className="h-4 w-4" />,
      },
    ],
  },
  {
    id: "transaction",
    label: "Payments",
    children: [
      {
        id: "cart",
        label: "Cart",
        path: "/cart",
        icon: <ShoppingCart className="h-4 w-4" />,
      },
      {
        id: "checkout",
        label: "Checkout",
        path: "/checkout",
        icon: <CreditCard className="h-4 w-4" />,
      },
      {
        id: "return",
        label: "Return",
        path: "/return",
        icon: <RotateCcw className="h-4 w-4" />,
      },
    ],
  },
  {
    id: "host",
    label: "Host",
    children: [
      {
        id: "host-dashboard",
        label: "Dashboard",
        path: "/host",
        icon: <Building2 className="h-4 w-4" />,
      },
      {
        id: "my-hotels",
        label: "My Hotels",
        path: "/my-hotels",
        icon: <GalleryVerticalEnd className="h-4 w-4" />,
      },
      {
        id: "create-hotel",
        label: "Create Hotel",
        path: "/create-hotel",
        icon: <Plus className="h-4 w-4" />,
      },
    ],
  },
];

const categoryColors: Record<string, string> = {
  Discovery: "border-l-amber-500",
  User: "border-l-blue-500",
  Payments: "border-l-rose-500",
  Host: "border-l-orange-500",
};

export function SitemapDiagram() {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      {/* Root */}
      <div className="flex justify-center">
        <Link href="/">
          <div
            className={cn(
              "inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border-2 bg-primary text-primary-foreground font-semibold text-sm transition-all",
              pathname === "/" && "ring-2 ring-primary/40 ring-offset-2",
            )}
          >
            <Home className="h-4 w-4" />
            HOME
          </div>
        </Link>
      </div>

      {/* Connector */}
      <div className="flex justify-center">
        <div className="w-px h-6 bg-border" />
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {sitemapData.map((category) => (
          <div key={category.id} className="space-y-3">
            {/* Category Header */}
            <div
              className={cn(
                "px-3 py-2 rounded-md border-l-4 bg-muted/50",
                categoryColors[category.label],
              )}
            >
              <span className="text-sm font-semibold">{category.label}</span>
            </div>

            {/* Children */}
            <div className="space-y-1.5">
              {category.children?.map((child) => {
                const isActive = child.path === pathname;
                const isDynamic = child.badge === "dynamic";

                const content = (
                  <div
                    className={cn(
                      "group flex items-center gap-2.5 px-3 py-2 rounded-md border text-sm transition-all",
                      isActive
                        ? "bg-primary/5 border-primary/30 text-primary font-medium"
                        : "bg-background border-transparent hover:bg-muted/60 hover:border-border",
                      isDynamic && "opacity-70",
                    )}
                  >
                    {child.icon && (
                      <span
                        className={cn(
                          "shrink-0 text-muted-foreground",
                          isActive && "text-primary",
                        )}
                      >
                        {child.icon}
                      </span>
                    )}
                    <span className="flex-1 truncate">{child.label}</span>
                    {child.badge && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0"
                      >
                        {child.badge}
                      </Badge>
                    )}
                    {child.path && !isDynamic && (
                      <span className="text-[10px] text-muted-foreground/50 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                        {child.path}
                      </span>
                    )}
                  </div>
                );

                return (
                  <div key={child.id}>
                    {child.path && !isDynamic ? (
                      <Link href={child.path}>{content}</Link>
                    ) : (
                      content
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
