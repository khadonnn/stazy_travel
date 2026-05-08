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
        className="w-full sm:max-w-4xl overflow-y-auto p-0"
      >
        <div className="p-6">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <Map className="h-5 w-5 text-primary" />
              Sitemap
            </SheetTitle>
            <SheetDescription className="text-muted-foreground">
              Navigation structure of Stazy platform
            </SheetDescription>
          </SheetHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger
                value="diagram"
                className="flex items-center gap-2 text-xs"
              >
                <Network className="h-3.5 w-3.5" />
                Diagram
              </TabsTrigger>
              <TabsTrigger
                value="tree"
                className="flex items-center gap-2 text-xs"
              >
                <List className="h-3.5 w-3.5" />
                Tree
              </TabsTrigger>
            </TabsList>

            <TabsContent value="diagram" className="mt-0">
              <SitemapDiagram />
            </TabsContent>

            <TabsContent value="tree" className="mt-0">
              <SitemapTree />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
