export interface TravelRegion {
    region: string;
    img: string;
}

export interface Hotel {
    id: number;
    title: string;
    description: string;
    address: string;
    city?: string;
    country?: string;
    phone?: string;
    email?: string;
    featuredImage?: string;
    price?: string | number;
    maxGuests?: number;
}

export const TRAVEL_IMAGES: TravelRegion[] = [
    { region: 'Đà Lạt', img: '/src/assets/travels/dalat.jpeg' },
    { region: 'Đà Nẵng', img: '/src/assets/travels/danang.jpeg' },
    { region: 'Hạ Long', img: '/src/assets/travels/halongbay.jpeg' },
    { region: 'Hội An', img: '/src/assets/travels/hoian.jpeg' },
    { region: 'Huế', img: '/src/assets/travels/hue.jpeg' },
    { region: 'Mũi Né', img: '/src/assets/travels/muine.jpeg' },
    { region: 'Ninh Bình', img: '/src/assets/travels/ninhbinh.jpeg' },
    { region: 'Phú Quốc', img: '/src/assets/travels/phuquoc.jpeg' },
    { region: 'Sapa', img: '/src/assets/travels/sapa.jpeg' },
    { region: 'Vũng Tàu', img: '/src/assets/travels/vungtau.jpeg' },
];

// Helper function để tìm khách sạn theo vùng
export const findHotelByRegion = (hotels: Hotel[], region: string): Hotel | null => {
    let found = hotels.find(h =>
        (h.city && h.city.toLowerCase().includes(region.toLowerCase())) ||
        (h.address && h.address.toLowerCase().includes(region.toLowerCase())) ||
        (h.title && h.title.toLowerCase().includes(region.toLowerCase()))
    );
    
    // Tìm với các biến thể tên vùng
    if (!found && region === 'Ninh Bình') {
        found = hotels.find(h =>
            (h.city && (h.city.toLowerCase().includes('ninh bình') || h.city.toLowerCase().includes('ninhbinh'))) ||
            (h.address && (h.address.toLowerCase().includes('ninh bình') || h.address.toLowerCase().includes('ninhbinh'))) ||
            (h.title && (h.title.toLowerCase().includes('ninh bình') || h.title.toLowerCase().includes('ninhbinh')))
        );
    }
    
    if (!found && region === 'Sapa') {
        found = hotels.find(h =>
            (h.city && (h.city.toLowerCase().includes('sa pa') || h.city.toLowerCase().includes('sapa') || h.city.toLowerCase().includes('lào cai'))) ||
            (h.address && (h.address.toLowerCase().includes('sa pa') || h.address.toLowerCase().includes('sapa') || h.address.toLowerCase().includes('lào cai'))) ||
            (h.title && (h.title.toLowerCase().includes('sa pa') || h.title.toLowerCase().includes('sapa') || h.title.toLowerCase().includes('lào cai')))
        );
    }
    
    return found || null;
};
