"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  ChevronDown,
  Home,
  Search,
  Hotel,
  Info,
  Bug,
  UserCircle,
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

interface TreeNode {
  id: string;
  label: string;
  path?: string;
  icon?: React.ReactNode;
  color?: string;
  children?: TreeNode[];
}

const sitemapData: TreeNode = {
  id: "root",
  label: "STAZY HOMEPAGE",
  path: "/",
  icon: <Home className="h-4 w-4" />,
  color: "bg-emerald-50 text-emerald-900 border-emerald-200",
  children: [
    {
      id: "discovery",
      label: "Discovery & Public",
      color: "bg-amber-50 text-amber-900 border-amber-200",
      children: [
        {
          id: "search",
          label: "Search Service",
          path: "/search-service",
          icon: <Search className="h-4 w-4" />,
        },
        {
          id: "hotels",
          label: "Hotel Details",
          path: "/hotels",
          icon: <Hotel className="h-4 w-4" />,
        },
        {
          id: "about",
          label: "About Us",
          path: "/about",
          icon: <Info className="h-4 w-4" />,
        },
        {
          id: "debug",
          label: "Test / Debug Pages",
          icon: <Bug className="h-4 w-4" />,
          children: [
            { id: "test", label: "Test", path: "/test" },
            { id: "debug-role", label: "Debug Role", path: "/debug-role" },
            {
              id: "debug-simple",
              label: "Debug Simple",
              path: "/debug-role-simple",
            },
          ],
        },
      ],
    },
    {
      id: "user",
      label: "User & Auth",
      color: "bg-blue-50 text-blue-900 border-blue-200",
      children: [
        {
          id: "auth",
          label: "Authentication",
          icon: <UserCircle className="h-4 w-4" />,
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
          label: "User Profile",
          icon: <User className="h-4 w-4" />,
          children: [
            {
              id: "my-profile",
              label: "My Profile",
              path: "/profile",
              icon: <User className="h-4 w-4" />,
            },
            {
              id: "my-bookings",
              label: "My Bookings",
              path: "/my-bookings",
              icon: <Calendar className="h-4 w-4" />,
            },
          ],
        },
      ],
    },
    {
      id: "transaction",
      label: "Transaction",
      color: "bg-rose-50 text-rose-900 border-rose-200",
      children: [
        {
          id: "cart",
          label: "Shopping Cart",
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
          label: "Payment Return",
          path: "/return",
          icon: <RotateCcw className="h-4 w-4" />,
        },
      ],
    },
    {
      id: "host",
      label: "Host Manager",
      color: "bg-orange-50 text-orange-900 border-orange-200",
      children: [
        {
          id: "host-dashboard",
          label: "Host Dashboard",
          path: "/host",
          icon: <Building2 className="h-4 w-4" />,
        },
        {
          id: "my-hotels",
          label: "My Hotels (List)",
          path: "/my-hotels",
          icon: <GalleryVerticalEnd className="h-4 w-4" />,
        },
        {
          id: "create-hotel",
          label: "Create Hotel",
          icon: <Plus className="h-4 w-4" />,
          children: [
            {
              id: "create-info",
              label: "Step 1: Info",
              path: "/create-hotel",
            },
            {
              id: "create-images",
              label: "Step 2: Images",
              path: "/create-hotel#images",
            },
          ],
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
  const [isExpanded, setIsExpanded] = useState(level < 2);
  const pathname = usePathname();
  const hasChildren = node.children && node.children.length > 0;

  const isActive = node.path === pathname;

  const nodeContent = (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md transition-all cursor-pointer group border border-transparent",
        level === 0 && node.color,
        level === 1 && node.color,
        level > 1 && "hover:bg-accent/50",
        isActive && "bg-primary/10 border-l-4 border-primary",
      )}
      style={{ marginLeft: `${level * 16}px` }}
      onClick={() => hasChildren && setIsExpanded(!isExpanded)}
    >
      {hasChildren && (
        <span className="text-muted-foreground">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </span>
      )}
      {node.icon && <span className="shrink-0">{node.icon}</span>}
      <span
        className={cn(
          "font-medium",
          level === 0 && "text-base font-bold",
          level === 1 && "text-sm font-semibold",
          level > 1 && "text-sm text-muted-foreground",
        )}
      >
        {node.label}
      </span>
      {node.path && (
        <span className="ml-auto text-xs text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity font-mono">
          {node.path}
        </span>
      )}
    </div>
  );

  return (
    <div className="w-full">
      {node.path && !hasChildren ? (
        <Link href={node.path}>{nodeContent}</Link>
      ) : (
        nodeContent
      )}
      {hasChildren && isExpanded && (
        <div className="mt-1 space-y-1">
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
    <div className="space-y-2">
      <TreeNodeItem node={sitemapData} />
    </div>
  );
}
