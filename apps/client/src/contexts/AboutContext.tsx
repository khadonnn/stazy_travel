import React, { createContext, useState, useEffect } from 'react';

// Types
export interface TeamMember {
    id: number;
    name: string;
    role: string;
    description: string;
    avatar: string;
    email: string;
    phone: string;
    linkedin?: string;
    github?: string;
    skills: string[];
}

export interface ServiceItem {
    id: string;
    title: string;
    description: string;
}

export interface ValueItem {
    id: string;
    title: string;
    description: string;
    color: string;
}

export interface AboutData {
    heroSection: {
        title: string;
        description: string;
    };
    mission: {
        title: string;
        description: string;
    };
    services: {
        title: string;
        subtitle: string;
        items: ServiceItem[];
    };
    team: {
        title: string;
        subtitle: string;
        members: TeamMember[];
    };
    values: {
        title: string;
        items: ValueItem[];
    };
}

interface AboutContextType {
    aboutData: AboutData | null;
    isLoading: boolean;
    updateAboutData: (newData: AboutData) => void;
    addTeamMember: (member: Omit<TeamMember, 'id'>) => void;
    updateTeamMember: (id: number, member: Partial<TeamMember>) => void;
    deleteTeamMember: (id: number) => void;
    addServiceItem: (service: Omit<ServiceItem, 'id'>) => void;
    updateServiceItem: (id: string, service: Partial<ServiceItem>) => void;
    deleteServiceItem: (id: string) => void;
    resetToDefault: () => Promise<void>;
}
// eslint-disable-next-line react-refresh/only-export-components
export const AboutContext = createContext<AboutContextType | undefined>(
    undefined,
);

// Default data
const defaultAboutData: AboutData = {
    heroSection: {
        title: 'Hotel Luxe',
        description:
            'Nền tảng quản lý khách sạn hiện đại, mang đến trải nghiệm tuyệt vời cho cả khách hàng và nhà quản lý',
    },
    mission: {
        title: 'Sứ Mệnh Của Chúng Tôi',
        description:
            'Chúng tôi cam kết xây dựng một nền tảng công nghệ tiên tiến nhất trong lĩnh vực khách sạn...',
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

interface AboutProviderProps {
    children: React.ReactNode;
}

export const AboutProvider: React.FC<AboutProviderProps> = ({ children }) => {
    const [aboutData, setAboutData] = useState<AboutData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load data from localStorage or use default
    useEffect(() => {
        const loadAboutData = async () => {
            try {
                // Try to load from localStorage first
                const savedData = localStorage.getItem('hotel-luxe-about-data');
                if (savedData) {
                    setAboutData(JSON.parse(savedData));
                } else {
                    // Load from JSON file
                    const response = await import('../data/jsons/__aboutData.json');
                    setAboutData(response.default);
                    // Save to localStorage
                    localStorage.setItem(
                        'hotel-luxe-about-data',
                        JSON.stringify(response.default),
                    );
                }
            } catch (error) {
                console.error('Error loading about data:', error);
                setAboutData(defaultAboutData);
            } finally {
                setIsLoading(false);
            }
        };

        loadAboutData();
    }, []);

    // Save data to localStorage whenever aboutData changes
    const saveData = (data: AboutData) => {
        localStorage.setItem('hotel-luxe-about-data', JSON.stringify(data));
        setAboutData(data);
    };

    const updateAboutData = (newData: AboutData) => {
        saveData(newData);
    };

    const addTeamMember = (member: Omit<TeamMember, 'id'>) => {
        if (!aboutData) {
            console.error('AboutData is null, cannot add team member');
            return;
        }

        console.log('Adding team member:', member);

        const newId =
            Math.max(...aboutData.team.members.map((m) => m.id), 0) + 1;
        const newMember: TeamMember = { ...member, id: newId };

        console.log('New member with ID:', newMember);

        const updatedData = {
            ...aboutData,
            team: {
                ...aboutData.team,
                members: [...aboutData.team.members, newMember],
            },
        };

        console.log('Updated data:', updatedData);
        saveData(updatedData);
    };

    const updateTeamMember = (
        id: number,
        memberUpdate: Partial<TeamMember>,
    ) => {
        if (!aboutData) return;

        const updatedData = {
            ...aboutData,
            team: {
                ...aboutData.team,
                members: aboutData.team.members.map((member) =>
                    member.id === id ? { ...member, ...memberUpdate } : member,
                ),
            },
        };

        saveData(updatedData);
    };

    const deleteTeamMember = (id: number) => {
        if (!aboutData) return;

        const updatedData = {
            ...aboutData,
            team: {
                ...aboutData.team,
                members: aboutData.team.members.filter(
                    (member) => member.id !== id,
                ),
            },
        };

        saveData(updatedData);
    };

    const addServiceItem = (service: Omit<ServiceItem, 'id'>) => {
        if (!aboutData) return;

        const newId = `service-${Date.now()}`;
        const newService: ServiceItem = { ...service, id: newId };

        const updatedData = {
            ...aboutData,
            services: {
                ...aboutData.services,
                items: [...aboutData.services.items, newService],
            },
        };

        saveData(updatedData);
    };

    const updateServiceItem = (
        id: string,
        serviceUpdate: Partial<ServiceItem>,
    ) => {
        if (!aboutData) return;

        const updatedData = {
            ...aboutData,
            services: {
                ...aboutData.services,
                items: aboutData.services.items.map((service) =>
                    service.id === id
                        ? { ...service, ...serviceUpdate }
                        : service,
                ),
            },
        };

        saveData(updatedData);
    };

    const deleteServiceItem = (id: string) => {
        if (!aboutData) return;

        const updatedData = {
            ...aboutData,
            services: {
                ...aboutData.services,
                items: aboutData.services.items.filter(
                    (service) => service.id !== id,
                ),
            },
        };

        saveData(updatedData);
    };

    const resetToDefault = async () => {
        try {
            // Load from JSON file
            const response = await import('../data/jsons/__aboutData.json');
            const defaultData = response.default;

            // Clear localStorage and set to default
            localStorage.removeItem('hotel-luxe-about-data');
            localStorage.setItem(
                'hotel-luxe-about-data',
                JSON.stringify(defaultData),
            );

            setAboutData(defaultData);
            console.log('Data reset to default successfully');
        } catch (error) {
            console.error('Error resetting to default data:', error);
            // Fallback to hardcoded default
            localStorage.removeItem('hotel-luxe-about-data');
            localStorage.setItem(
                'hotel-luxe-about-data',
                JSON.stringify(defaultAboutData),
            );
            setAboutData(defaultAboutData);
        }
    };

    const value: AboutContextType = {
        aboutData,
        isLoading,
        updateAboutData,
        addTeamMember,
        updateTeamMember,
        deleteTeamMember,
        addServiceItem,
        updateServiceItem,
        deleteServiceItem,
        resetToDefault,
    };

    return (
        <AboutContext.Provider value={value}>{children}</AboutContext.Provider>
    );
};

export default AboutProvider;
