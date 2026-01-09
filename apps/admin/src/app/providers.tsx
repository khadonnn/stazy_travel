'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useState } from 'react';

type Props = {
    children: ReactNode;
};

export default function QueryProvider({ children }: Props) {
    const [queryClient] = useState(() => new QueryClient());

    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
