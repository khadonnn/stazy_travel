import { create } from 'zustand';

interface ExportState {
    onExportAction: (() => Promise<void>) | null;
    exportLabel: string | null;
    registerExportAction: (action: (() => Promise<void>) | null, label?: string | null) => void;
}

export const useExportStore = create<ExportState>((set) => ({
    onExportAction: null,
    exportLabel: null,
    registerExportAction: (action, label = null) => set({ onExportAction: action, exportLabel: label }),
}));
