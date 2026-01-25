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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface SitemapNode {
  id: string;
  label: string;
  path?: string;
  icon?: React.ReactNode;
  bgColor: string;
  textColor: string;
  hoverBg: string;
  children?: SitemapNode[];
}

const sitemapData: SitemapNode[] = [
  {
    id: "discovery",
    label: "Discovery",
    bgColor: "bg-amber-500",
    textColor: "text-white",
    hoverBg: "hover:bg-amber-600",
    children: [
      {
        id: "search",
        label: "Search",
        path: "/search-service",
        icon: <Search className="h-3.5 w-3.5" />,
        bgColor: "bg-white",
        textColor: "text-foreground",
        hoverBg: "hover:bg-amber-50",
      },
      {
        id: "hotels",
        label: "Hotels",
        path: "/hotels",
        icon: <Hotel className="h-3.5 w-3.5" />,
        bgColor: "bg-white",
        textColor: "text-foreground",
        hoverBg: "hover:bg-amber-50",
      },
      {
        id: "about",
        label: "About",
        path: "/about",
        icon: <Info className="h-3.5 w-3.5" />,
        bgColor: "bg-white",
        textColor: "text-foreground",
        hoverBg: "hover:bg-amber-50",
      },
      {
        id: "debug",
        label: "Debug",
        path: "/debug-role",
        icon: <Bug className="h-3.5 w-3.5" />,
        bgColor: "bg-white",
        textColor: "text-foreground",
        hoverBg: "hover:bg-amber-50",
      },
    ],
  },
  {
    id: "user",
    label: "User Auth",
    bgColor: "bg-blue-500",
    textColor: "text-white",
    hoverBg: "hover:bg-blue-600",
    children: [
      {
        id: "signin",
        label: "Sign In",
        path: "/sign-in",
        icon: <LogIn className="h-3.5 w-3.5" />,
        bgColor: "bg-white",
        textColor: "text-foreground",
        hoverBg: "hover:bg-blue-50",
      },
      {
        id: "signup",
        label: "Sign Up",
        path: "/sign-up",
        icon: <UserPlus className="h-3.5 w-3.5" />,
        bgColor: "bg-white",
        textColor: "text-foreground",
        hoverBg: "hover:bg-blue-50",
      },
      {
        id: "profile",
        label: "Profile",
        path: "/profile",
        icon: <User className="h-3.5 w-3.5" />,
        bgColor: "bg-white",
        textColor: "text-foreground",
        hoverBg: "hover:bg-blue-50",
      },
      {
        id: "bookings",
        label: "Bookings",
        path: "/my-bookings",
        icon: <Calendar className="h-3.5 w-3.5" />,
        bgColor: "bg-white",
        textColor: "text-foreground",
        hoverBg: "hover:bg-blue-50",
      },
    ],
  },
  {
    id: "transaction",
    label: "Payments",
    bgColor: "bg-rose-500",
    textColor: "text-white",
    hoverBg: "hover:bg-rose-600",
    children: [
      {
        id: "cart",
        label: "Cart",
        path: "/cart",
        icon: <ShoppingCart className="h-3.5 w-3.5" />,
        bgColor: "bg-white",
        textColor: "text-foreground",
        hoverBg: "hover:bg-rose-50",
      },
      {
        id: "checkout",
        label: "Checkout",
        path: "/checkout",
        icon: <CreditCard className="h-3.5 w-3.5" />,
        bgColor: "bg-white",
        textColor: "text-foreground",
        hoverBg: "hover:bg-rose-50",
      },
      {
        id: "return",
        label: "Return",
        path: "/return",
        icon: <RotateCcw className="h-3.5 w-3.5" />,
        bgColor: "bg-white",
        textColor: "text-foreground",
        hoverBg: "hover:bg-rose-50",
      },
    ],
  },
  {
    id: "host",
    label: "Host",
    bgColor: "bg-orange-500",
    textColor: "text-white",
    hoverBg: "hover:bg-orange-600",
    children: [
      {
        id: "host-dashboard",
        label: "Dashboard",
        path: "/host",
        icon: <Building2 className="h-3.5 w-3.5" />,
        bgColor: "bg-white",
        textColor: "text-foreground",
        hoverBg: "hover:bg-orange-50",
      },
      {
        id: "my-hotels",
        label: "My Hotels",
        path: "/my-hotels",
        icon: <GalleryVerticalEnd className="h-3.5 w-3.5" />,
        bgColor: "bg-white",
        textColor: "text-foreground",
        hoverBg: "hover:bg-orange-50",
      },
      {
        id: "create",
        label: "Create",
        path: "/create-hotel",
        icon: <Plus className="h-3.5 w-3.5" />,
        bgColor: "bg-white",
        textColor: "text-foreground",
        hoverBg: "hover:bg-orange-50",
      },
    ],
  },
];

export function SitemapDiagram() {
  const pathname = usePathname();

  return (
    <div className="w-full py-8 px-4 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        {/* Root Node */}
        <div className="flex flex-col items-center mb-10">
          <Link href="/">
            <Card
              className={cn(
                "px-5 py-3 border-2 transition-colors cursor-pointer",
                "bg-emerald-600 border-emerald-700 text-white",
                pathname === "/" && "ring-2 ring-emerald-400 ring-offset-2",
                "hover:bg-emerald-700",
              )}
            >
              <div className="flex items-center gap-2.5">
                <Home className="h-5 w-5" />
                <div>
                  <div className="font-semibold text-sm">HOMEPAGE</div>
                </div>
              </div>
            </Card>
          </Link>

          {/* Vertical Line */}
          <div className="w-px h-8 bg-border"></div>

          {/* Horizontal Distributor */}
          <div className="relative w-full max-w-4xl">
            <div className="absolute left-0 right-0 top-0 h-px bg-border"></div>
            <div className="grid grid-cols-4 gap-0">
              {sitemapData.map((_, index) => (
                <div key={index} className="flex justify-center">
                  <div className="w-px h-8 bg-border"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Category Branches */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {sitemapData.map((category) => (
            <div key={category.id} className="flex flex-col items-center gap-3">
              {/* Category Header */}
              <Card
                className={cn(
                  "w-full px-4 py-2.5 border-2 transition-colors",
                  category.bgColor,
                  category.textColor,
                  category.hoverBg,
                )}
              >
                <div className="font-semibold text-sm text-center">
                  {category.label}
                </div>
              </Card>

              {/* Vertical Line */}
              <div className="w-px h-3 bg-border"></div>

              {/* Child Nodes */}
              <div className="w-full space-y-2.5">
                {category.children?.map((child) => {
                  const isActive = child.path === pathname;

                  const nodeContent = (
                    <Card
                      className={cn(
                        "px-3 py-2.5 border transition-colors cursor-pointer",
                        child.bgColor,
                        child.textColor,
                        child.hoverBg,
                        isActive &&
                          "ring-2 ring-primary ring-offset-1 bg-accent",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {child.icon}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-xs truncate">
                            {child.label}
                          </div>
                          {child.path && (
                            <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                              {child.path}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );

                  return (
                    <div key={child.id}>
                      {child.path ? (
                        <Link href={child.path}>{nodeContent}</Link>
                      ) : (
                        nodeContent
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <Card className="mt-10 p-4">
          <div className="text-xs font-semibold mb-2.5 text-muted-foreground">
            CATEGORIES
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-amber-500"></div>
              <span className="text-xs">Discovery & Public</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-blue-500"></div>
              <span className="text-xs">User & Auth</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-rose-500"></div>
              <span className="text-xs">Payments</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-orange-500"></div>
              <span className="text-xs">Host Manager</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
