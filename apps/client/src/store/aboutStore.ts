import { create } from 'zustand';
import { AboutData, TeamMember, ServiceItem } from '@/contexts/AboutContext'; // Giữ nguyên các định nghĩa Types từ Context cũ

// -----------------------------------------------------------
// 1. ĐỊNH NGHĨA KIỂU DỮ LIỆU CỦA STORE STATE VÀ ACTIONS
// -----------------------------------------------------------

// Kiểu dữ liệu tương tự như AboutContextType, nhưng loại bỏ aboutData/isLoading ra
// khỏi actions để truy cập trực tiếp qua get()/set() của Zustand
interface AboutStoreState {
    aboutData: AboutData | null;
    isLoading: boolean;
    
    // Actions
    loadData: () => Promise<void>;
    resetToDefault: () => Promise<void>;
    
    updateAboutData: (newData: AboutData) => void;
    
    addTeamMember: (member: Omit<TeamMember, 'id'>) => void;
    updateTeamMember: (id: number, member: Partial<TeamMember>) => void;
    deleteTeamMember: (id: number) => void;
    
    addServiceItem: (service: Omit<ServiceItem, 'id'>) => void;
    updateServiceItem: (id: string, service: Partial<ServiceItem>) => void;
    deleteServiceItem: (id: string) => void;
}

// -----------------------------------------------------------
// 2. DEFAULT DATA (Tái sử dụng từ Context cũ)
// -----------------------------------------------------------

const defaultAboutData: AboutData = {
    heroSection: {
        title: 'Hotel Luxe',
        description: 'Nền tảng quản lý khách sạn hiện đại, mang đến trải nghiệm tuyệt vời cho cả khách hàng và nhà quản lý',
    },
    mission: {
        title: 'Sứ Mệnh Của Chúng Tôi',
        description: 'Chúng tôi cam kết xây dựng một nền tảng công nghệ tiên tiến nhất trong lĩnh vực khách sạn...',
    },
    services: {
        title: 'Hoạt Động & Dịch Vụ',
        subtitle: 'Chúng tôi cung cấp giải pháp toàn diện cho ngành khách sạn',
        items: [],
    },
    team: {
        title: 'Đội Ngũ Của Chúng Tôi - IE104.E32.CN2.CNTT',
        subtitle: 'Những con người tài năng và đam mê tạo nên Hotel Luxe',
        members: [],
    },
    values: {
        title: 'Giá Trị Cốt Lõi',
        items: [],
    },
};

// -----------------------------------------------------------
// 3. HÀM HELPER SIDE EFFECT (Không nằm trong Store State)
// -----------------------------------------------------------

const STORAGE_KEY = 'hotel-luxe-about-data';

const saveToLocalStorage = (data: AboutData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

const loadDefaultJsonData = async (): Promise<AboutData> => {
    try {
        const response = await import('@/data/jsons/__aboutData.json'); // Thay đổi đường dẫn nếu cần
        return response.default as AboutData;
    } catch (error) {
        console.error('Error loading default JSON data, using hardcoded default:', error);
        return defaultAboutData;
    }
};

// -----------------------------------------------------------
// 4. KHỞI TẠO ZUSTAND STORE
// -----------------------------------------------------------

export const useAboutStore = create<AboutStoreState>((set, get) => ({
    aboutData: null,
    isLoading: true, // Bắt đầu là true

    // ************************ ACTIONS ************************

    // A. LOAD DATA (Tương đương với useEffect trong Context)
    loadData: async () => {
        set({ isLoading: true });
        try {
            const savedData = localStorage.getItem(STORAGE_KEY);
            let initialData: AboutData;

            if (savedData) {
                initialData = JSON.parse(savedData);
            } else {
                initialData = await loadDefaultJsonData();
                saveToLocalStorage(initialData);
            }
            
            set({ aboutData: initialData, isLoading: false });
        } catch (error) {
            console.error('Error in loadData:', error);
            const fallbackData = defaultAboutData;
            saveToLocalStorage(fallbackData);
            set({ aboutData: fallbackData, isLoading: false });
        }
    },
    
    // B. RESET DATA
    resetToDefault: async () => {
        const defaultData = await loadDefaultJsonData();
        saveToLocalStorage(defaultData);
        set({ aboutData: defaultData });
        console.log('Data reset to default successfully');
    },

    // C. GENERAL UPDATE
    updateAboutData: (newData: AboutData) => {
        saveToLocalStorage(newData);
        set({ aboutData: newData });
    },

    // D. TEAM MEMBER ACTIONS
    addTeamMember: (member) => {
        set((state) => {
            const currentData = state.aboutData;
            if (!currentData) return state;

            const newId =
                Math.max(...currentData.team.members.map((m) => m.id), 0) + 1;
            const newMember: TeamMember = { ...member, id: newId };
            
            const updatedData: AboutData = {
                ...currentData,
                team: {
                    ...currentData.team,
                    members: [...currentData.team.members, newMember],
                },
            };
            saveToLocalStorage(updatedData);
            return { aboutData: updatedData };
        });
    },

    updateTeamMember: (id, memberUpdate) => {
        set((state) => {
            const currentData = state.aboutData;
            if (!currentData) return state;

            const updatedMembers = currentData.team.members.map((member ) =>
                member.id === id ? { ...member, ...memberUpdate } : member,
            );

            const updatedData: AboutData = {
                ...currentData,
                team: {
                    ...currentData.team,
                    members: updatedMembers,
                },
            };
            saveToLocalStorage(updatedData);
            return { aboutData: updatedData };
        });
    },

    deleteTeamMember: (id) => {
        set((state) => {
            const currentData = state.aboutData;
            if (!currentData) return state;

            const updatedMembers = currentData.team.members.filter(
                (member : TeamMember) => member.id !== id,
            );

            const updatedData: AboutData = {
                ...currentData,
                team: {
                    ...currentData.team,
                    members: updatedMembers,
                },
            };
            saveToLocalStorage(updatedData);
            return { aboutData: updatedData };
        });
    },
    
    // E. SERVICE ITEM ACTIONS
    addServiceItem: (service) => {
        set((state) => {
            const currentData = state.aboutData;
            if (!currentData) return state;

            const newId = `service-${Date.now()}`;
            const newService: ServiceItem = { ...service, id: newId };

            const updatedData: AboutData = {
                ...currentData,
                services: {
                    ...currentData.services,
                    items: [...currentData.services.items, newService],
                },
            };
            saveToLocalStorage(updatedData);
            return { aboutData: updatedData };
        });
    },

    updateServiceItem: (id, serviceUpdate) => {
        set((state) => {
            const currentData = state.aboutData;
            if (!currentData) return state;

            const updatedServices = currentData.services.items.map((service) =>
                service.id === id ? { ...service, ...serviceUpdate } : service,
            );

            const updatedData: AboutData = {
                ...currentData,
                services: {
                    ...currentData.services,
                    items: updatedServices,
                },
            };
            saveToLocalStorage(updatedData);
            return { aboutData: updatedData };
        });
    },

    deleteServiceItem: (id) => {
        set((state) => {
            const currentData = state.aboutData;
            if (!currentData) return state;

            const updatedServices = currentData.services.items.filter(
                (service) => service.id !== id,
            );

            const updatedData: AboutData = {
                ...currentData,
                services: {
                    ...currentData.services,
                    items: updatedServices,
                },
            };
            saveToLocalStorage(updatedData);
            return { aboutData: updatedData };
        });
    },
}));