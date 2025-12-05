// src/types/about.ts (Tạo file nếu cần)
export interface AboutData {
    heroSection: { title: string; description: string };
    mission: { title: string; description: string };
    services: { title: string; subtitle: string; items: { id: string; title: string; description: string }[] };
    team: { title: string; subtitle: string; members: any[] }; // Tùy chỉnh any[]
    values: { title: string; items: { id: string; title: string; description: string; color: string }[] };
}

export interface AboutStoreState {
    aboutData: AboutData | null;
    isLoading: boolean;
    error: string | null;
    fetchAboutData: () => Promise<void>; // Hàm để fetch data
}