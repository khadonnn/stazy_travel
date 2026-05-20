"use client";

import React, { Suspense } from "react";

/**
 * Wrapper to satisfy Next.js 16 requirement:
 * useSearchParams() must be wrapped in a Suspense boundary
 * when used in pages that can be statically rendered.
 */
export function withSuspense<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode,
) {
  const Wrapped = (props: P) => (
    <Suspense
      fallback={fallback || <div className="p-8 text-center">Đang tải...</div>}
    >
      <Component {...props} />
    </Suspense>
  );
  Wrapped.displayName = `withSuspense(${Component.displayName || Component.name || "Component"})`;
  return Wrapped;
}
