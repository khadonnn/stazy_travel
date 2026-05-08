"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
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

interface TreeNode {
  id: string;
  label: string;
  path?: string;
  icon?: React.ReactNode;
  badge?: string;
  children?: TreeNode[];
}

const sitemapData: TreeNode = {
  id: "root",
  label: "Stazy",
  path: "/",
  icon: <Home className="h-4 w-4" />,
  children: [
    {
      id: "discovery",
      label: "Discovery",
      icon: <Search className="h-4 w-4" />,
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
        {
          id: "debug",
          label: "Debug Tools",
          icon: <Bug className="h-4 w-4" />,
          children: [
            { id: "debug-role", label: "Debug Role", path: "/debug-role" },
            {
              id: "debug-simple",
              label: "Debug Simple",
              path: "/debug-role-simple",
            },
            { id: "test", label: "Test", path: "/test" },
          ],
        },
      ],
    },
    {
      id: "user",
      label: "User",
      icon: <User className="h-4 w-4" />,
      children: [
        {
          id: "auth",
          label: "Authentication",
          icon: <LogIn className="h-4 w-4" />,
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
          ],
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
      icon: <CreditCard className="h-4 w-4" />,
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
      icon: <Building2 className="h-4 w-4" />,
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
  ],
};

interface TreeNodeItemProps {
  node: TreeNode;
  level?: number;
}

function TreeNodeItem({ node, level = 0 }: TreeNodeItemProps) {
  const [isExpanded, setIsExpanded] = useState(level < 1);
  const pathname = usePathname();
  const hasChildren = node.children && node.children.length > 0;
  const isActive = node.path === pathname;
  const isDynamic = node.badge === "dynamic";

  const content = (
    <div
      className={cn(
        "group flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm transition-all cursor-pointer",
        isActive && "bg-primary/5 text-primary font-medium",
        !isActive && "hover:bg-muted/60",
        isDynamic && "opacity-60",
      )}
      style={{ paddingLeft: `${level * 16 + 10}px` }}
      onClick={() => hasChildren && setIsExpanded(!isExpanded)}
    >
      {/* Expand icon */}
      {hasChildren ? (
        <span
          className={cn(
            "shrink-0 text-muted-foreground transition-transform",
            isExpanded && "rotate-90",
          )}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      ) : (
        <span className="w-3.5" />
      )}

      {/* Icon */}
      {node.icon && (
        <span
          className={cn(
            "shrink-0 text-muted-foreground",
            isActive && "text-primary",
          )}
        >
          {node.icon}
        </span>
      )}

      {/* Label */}
      <span className={cn("flex-1 truncate", level === 0 && "font-semibold")}>
        {node.label}
      </span>

      {/* Badge for dynamic routes */}
      {node.badge && (
        <span className="text-[10px] px-1.5 py-0.5 rounded border text-muted-foreground">
          {node.badge}
        </span>
      )}

      {/* Path on hover */}
      {node.path && !isDynamic && (
        <span className="text-[10px] text-muted-foreground/40 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
          {node.path}
        </span>
      )}
    </div>
  );

  return (
    <div>
      {node.path && !hasChildren && !isDynamic ? (
        <Link href={node.path}>{content}</Link>
      ) : (
        content
      )}
      {hasChildren && isExpanded && (
        <div className="space-y-0.5">
          {node.children?.map((child) => (
            <TreeNodeItem key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function SitemapTree() {
  return (
    <div className="space-y-1">
      <TreeNodeItem node={sitemapData} />
    </div>
  );
}
