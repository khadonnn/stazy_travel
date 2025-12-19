import {
    Wifi,
    AirVent,
    ShowerHead,
    Bath,
    Tv,
    WashingMachine,
    Luggage,
    HeartHandshake,
    Bed,
    Sun,
    Tent,
    Building2,
    Martini,
    Key,
    CookingPot,
    Refrigerator,
    Microwave,
    Coffee,
    Utensils,
    Wine,
    Waves,
    Dumbbell,
    Umbrella,
    Gamepad2,
    Dice6,
    Music,
    Trees,
    Baby,
    Users,
    Dog,
    Car,
    Bike,
    Plane,
    Mountain,
    Building,
    Camera,
    ShieldCheck,
    BriefcaseMedical,
    Laptop,
    Phone,
    Star,
    Medal,
    Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface Amenity {
    id: string;
    name: string;
    icon: LucideIcon;
    category:
        | 'basic'
        | 'comfort'
        | 'food'
        | 'relax'
        | 'family'
        | 'transport'
        | 'view'
        | 'safety'
        | 'business'
        | 'award';
}

export const Amenities_demos: Amenity[] = [
    // ======== TIỆN NGHI CƠ BẢN (basic) ========
    { id: 'wifi', name: 'Wifi miễn phí', icon: Wifi, category: 'basic' },
    {
        id: 'air-conditioning',
        name: 'Điều hòa nhiệt độ',
        icon: AirVent,
        category: 'basic',
    },
    {
        id: 'bathroom',
        name: 'Phòng tắm riêng',
        icon: ShowerHead,
        category: 'basic',
    },
    { id: 'hot-water', name: 'Nước nóng 24/7', icon: Bath, category: 'basic' },
    { id: 'tv', name: 'TV màn hình phẳng', icon: Tv, category: 'basic' },
    { id: 'laundry', name: 'Giặt ủi', icon: WashingMachine, category: 'basic' },
    {
        id: 'luggage-storage',
        name: 'Gửi hành lý',
        icon: Luggage,
        category: 'basic',
    },
    {
        id: 'housekeeping',
        name: 'Dọn phòng hàng ngày',
        icon: HeartHandshake,
        category: 'basic',
    },

    // ======== GIƯỜNG & PHÒNG (comfort) ========
    { id: 'double-bed', name: 'Giường đôi', icon: Bed, category: 'comfort' },
    { id: 'single-bed', name: 'Giường đơn', icon: Bed, category: 'comfort' },
    { id: 'extra-bed', name: 'Giường phụ', icon: Bed, category: 'comfort' },
    { id: 'balcony', name: 'Ban công', icon: Sun, category: 'comfort' },
    { id: 'terrace', name: 'Sân thượng', icon: Tent, category: 'comfort' },
    {
        id: 'high-floor-view',
        name: 'Tầng cao, view đẹp',
        icon: Building2,
        category: 'comfort',
    },
    {
        id: 'room-service',
        name: 'Gọi món tại phòng',
        icon: Martini,
        category: 'comfort',
    },
    { id: 'concierge', name: 'Dịch vụ hỗ trợ', icon: Key, category: 'comfort' },

    // ======== BẾP & ĂN UỐNG (food) ========
    {
        id: 'kitchen',
        name: 'Bếp nấu đầy đủ',
        icon: CookingPot,
        category: 'food',
    },
    { id: 'fridge', name: 'Tủ lạnh', icon: Refrigerator, category: 'food' },
    { id: 'microwave', name: 'Lò vi sóng', icon: Microwave, category: 'food' },
    {
        id: 'coffee-maker',
        name: 'Máy pha cà phê',
        icon: Coffee,
        category: 'food',
    },
    {
        id: 'breakfast',
        name: 'Ăn sáng miễn phí',
        icon: Utensils,
        category: 'food',
    },
    {
        id: 'kitchenware',
        name: 'Đồ dùng bếp',
        icon: Utensils,
        category: 'food',
    },
    { id: 'mini-bar', name: 'Mini Bar', icon: Martini, category: 'food' },
    {
        id: 'on-site-restaurant',
        name: 'Nhà hàng tại chỗ',
        icon: Wine,
        category: 'food',
    },
    { id: 'bar', name: 'Quầy bar', icon: Wine, category: 'food' },

    // ======== GIẢI TRÍ & SỨC KHỎE (relax) ========
    { id: 'pool', name: 'Hồ bơi', icon: Waves, category: 'relax' },
    { id: 'gym', name: 'Phòng gym', icon: Dumbbell, category: 'relax' },
    { id: 'spa', name: 'Spa / Sauna', icon: Umbrella, category: 'relax' },
    { id: 'bbq', name: 'Sân vườn / BBQ', icon: Trees, category: 'relax' },
    { id: 'garden', name: 'Sân vườn', icon: Trees, category: 'relax' },
    {
        id: 'game-console',
        name: 'Máy chơi game',
        icon: Gamepad2,
        category: 'relax',
    },
    { id: 'boardgames', name: 'Board game', icon: Dice6, category: 'relax' },
    {
        id: 'sound-system',
        name: 'Hệ thống âm thanh',
        icon: Music,
        category: 'relax',
    },

    // ======== GIA ĐÌNH & TRẺ EM (family) ========
    { id: 'baby-cot', name: 'Cũi em bé', icon: Baby, category: 'family' },
    { id: 'high-chair', name: 'Ghế ăn cho bé', icon: Baby, category: 'family' },
    {
        id: 'family-room',
        name: 'Phòng gia đình',
        icon: Users,
        category: 'family',
    },
    {
        id: 'pet-friendly',
        name: 'Chấp nhận thú cưng',
        icon: Dog,
        category: 'family',
    },

    // ======== DI CHUYỂN (transport) ========
    { id: 'parking', name: 'Bãi đậu xe', icon: Car, category: 'transport' },
    {
        id: 'motorbike-parking',
        name: 'Chỗ để xe máy',
        icon: Bike,
        category: 'transport',
    },
    {
        id: 'bike-rental',
        name: 'Thuê xe đạp',
        icon: Bike,
        category: 'transport',
    },
    {
        id: 'motorbike-rental',
        name: 'Thuê xe máy',
        icon: Bike,
        category: 'transport',
    },
    {
        id: 'airport-shuttle',
        name: 'Xe đưa đón sân bay',
        icon: Plane,
        category: 'transport',
    },
    {
        id: 'shuttle-service',
        name: 'Dịch vụ đưa đón',
        icon: Car,
        category: 'transport',
    },

    // ======== TẦM NHÌN & CẢNH QUAN (view) ========
    { id: 'mountain-view', name: 'View núi', icon: Mountain, category: 'view' },
    { id: 'beach-view', name: 'View biển', icon: Waves, category: 'view' },
    { id: 'sea-view', name: 'Hướng biển', icon: Waves, category: 'view' },
    { id: 'river-view', name: 'View sông', icon: Waves, category: 'view' },
    { id: 'lake-view', name: 'View hồ', icon: Waves, category: 'view' },
    {
        id: 'city-view',
        name: 'View thành phố',
        icon: Building,
        category: 'view',
    },
    { id: 'garden-view', name: 'View sân vườn', icon: Trees, category: 'view' },
    {
        id: 'scenic-view',
        name: 'View cảnh đẹp',
        icon: Mountain,
        category: 'view',
    },

    // ======== AN TOÀN (safety) ========
    { id: 'cctv', name: 'Camera an ninh', icon: Camera, category: 'safety' },
    { id: 'reception-24h', name: 'Lễ tân 24/7', icon: Key, category: 'safety' },
    {
        id: 'fire-safety',
        name: 'An toàn PCCC',
        icon: ShieldCheck,
        category: 'safety',
    },
    {
        id: 'first-aid',
        name: 'Sơ cứu cơ bản',
        icon: BriefcaseMedical,
        category: 'safety',
    },

    // ======== CÔNG VIỆC (business) ========
    {
        id: 'workspace',
        name: 'Góc làm việc',
        icon: Laptop,
        category: 'business',
    },
    { id: 'printer', name: 'Máy in/scan', icon: Phone, category: 'business' },
    {
        id: 'meeting-room',
        name: 'Phòng họp nhỏ',
        icon: Users,
        category: 'business',
    },

    // ======== DANH HIỆU (award) ========
    {
        id: 'award-winning',
        name: 'Giải thưởng chất lượng',
        icon: Medal,
        category: 'award',
    },
    { id: 'top-rated', name: 'Đánh giá cao', icon: Star, category: 'award' },
    {
        id: 'trending',
        name: 'Xu hướng đặt phòng',
        icon: Sparkles,
        category: 'award',
    },
];