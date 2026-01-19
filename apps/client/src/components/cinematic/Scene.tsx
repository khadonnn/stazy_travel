"use client";

import { ReactNode } from "react";

interface SceneProps {
  children: ReactNode;
  className?: string;
}

export default function Scene({ children, className }: SceneProps) {
  return (
    <section
      className={`relative min-h-screen w-full flex items-center justify-center ${className}`}
    >
      {children}
    </section>
  );
}
