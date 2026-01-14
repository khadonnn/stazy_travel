'use client';

import { useAdminSocket } from '@/hooks/useAdminSocket';

export default function AdminSocketListener() {
    useAdminSocket();

    return null;
}
