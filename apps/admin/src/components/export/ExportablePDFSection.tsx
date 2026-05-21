'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { useExportStore } from '@/store/useExportStore';
import { exportToPDF } from '@/lib/export';

type ExportablePDFSectionProps = {
    children: ReactNode;
    filename: string;
    title: string;
    className?: string;
};

export default function ExportablePDFSection({ children, filename, title, className }: ExportablePDFSectionProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const registerExportAction = useExportStore((state) => state.registerExportAction);

    useEffect(() => {
        const exportAction = async () => {
            if (!containerRef.current) {
                throw new Error('Export container not mounted');
            }

            await exportToPDF(containerRef.current, filename, title);
        };

        registerExportAction(exportAction, 'Xuất PDF');

        return () => registerExportAction(null);
    }, [filename, registerExportAction, title]);

    return (
        <div ref={containerRef} className={className}>
            {children}
        </div>
    );
}
