"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Map, Network, List } from "lucide-react";
import { SitemapTree } from "./SitemapTree";
import { SitemapDiagram } from "./SitemapDiagram";

interface SitemapSheetProps {
  children?: React.ReactNode;
  trigger?: "button" | "custom";
}

export function SitemapSheet({
  children,
  trigger = "button",
}: SitemapSheetProps) {
  const [activeTab, setActiveTab] = useState("diagram");

  const defaultTrigger = (
    <button className="flex items-center gap-2 w-full px-2 py-1.5 text-sm hover:bg-accent rounded-md transition-colors">
      <Map className="h-4 w-4" />
      <span>Sitemap</span>
    </button>
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger === "custom" && children ? children : defaultTrigger}
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:max-w-4xl overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Map className="h-5 w-5" />
            STAZY Platform - Sitemap
          </SheetTitle>
          <SheetDescription>
            Explore the complete navigation structure of STAZY platform
          </SheetDescription>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="diagram" className="flex items-center gap-2">
              <Network className="h-4 w-4" />
              Diagram View
            </TabsTrigger>
            <TabsTrigger value="tree" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Tree View
            </TabsTrigger>
          </TabsList>

          <TabsContent value="diagram" className="mt-4">
            <SitemapDiagram />
          </TabsContent>

          <TabsContent value="tree" className="mt-4">
            <SitemapTree />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
