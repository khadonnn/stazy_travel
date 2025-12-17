import {
    // Tiện nghi cũ
    Wifi,
    Bed,
    Bath,
    Car,
    Tv,
    Coffee,
    Dumbbell,
    Utensils,
    BriefcaseMedical,
    Baby,
    ShowerHead,
    AirVent,
    Umbrella,
    Luggage,
    Key,
    Martini,
    Dice6,

    // Tiện nghi mới và đã được sử dụng trong danh sách
    Sun, // Dùng cho 'balcony'
    Wine, // Dùng cho 'on-site-restaurant', 'bar'
    Waves, // Dùng cho View biển/Hồ bơi
    Mountain, // Dùng cho View núi
    Trees, // Dùng cho BBQ/Sân vườn
    CookingPot, // Dùng cho 'kitchen'
    Refrigerator, // Dùng cho 'fridge'
    Microwave, // Dùng cho 'microwave'
    WashingMachine, // Dùng cho 'laundry'
    Dog, // Dùng cho 'pet-friendly'
    Users, // Dùng cho 'family-room', 'meeting-room'
    Building2, // Dùng cho 'high-floor-view', 'city-view'
    HeartHandshake, // Dùng cho 'housekeeping'
    Camera, // Dùng cho 'cctv'
    Phone, // Dùng cho 'printer'
    Laptop, // Dùng cho 'workspace'
    Medal, // Dùng cho 'award-winning'
    Star, // Dùng cho 'top-rated'
    Sparkles, // Dùng cho 'fire-extinguisher', 'trending'
    Gamepad2, // Dùng cho 'game-console'
    Music, // Dùng cho 'music-system'
    Bike, // Dùng cho 'motorbike-rental', 'bike-rental'
    // Lưu ý: Các icon không dùng (như ParkingMeter) có thể bỏ đi để clean code
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface Amenity {
    id: string;
    name: string;
    icon: LucideIcon;
    category: string;
}

// (import giữ nguyên — bạn đã có đủ icon rồi!)

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
        id: 'private-bathroom',
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
    { id: 'extra-bed', name: 'Giường phụ', icon: Bed, category: 'comfort' },
    {
        id: 'balcony',
        name: 'Ban công / Sân thượng',
        icon: Sun,
        category: 'comfort',
    },
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
    {
        id: 'concierge',
        name: 'Dịch vụ hỗ trợ đặc biệt',
        icon: Key,
        category: 'comfort',
    },

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
        id: 'coffee-machine',
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

    // ======== GIẢI TRÍ & THỂ THAO (relax) ========
    { id: 'pool', name: 'Hồ bơi', icon: Waves, category: 'relax' },
    { id: 'gym', name: 'Phòng gym', icon: Dumbbell, category: 'relax' },
    {
        id: 'spa-sauna',
        name: 'Spa / Sauna',
        icon: Umbrella,
        category: 'relax',
    },
    {
        id: 'game-console',
        name: 'Máy chơi game',
        icon: Gamepad2,
        category: 'relax',
    },
    { id: 'board-games', name: 'Board game', icon: Dice6, category: 'relax' },
    {
        id: 'music-system',
        name: 'Hệ thống âm thanh',
        icon: Music,
        category: 'relax',
    },

    // ======== GIA ĐÌNH & TRẺ EM (family) ========
    { id: 'baby-cot', name: 'Cũi em bé', icon: Baby, category: 'family' },
    { id: 'high-chair', name: 'Ghế ăn cho bé', icon: Baby, category: 'family' },
    {
        id: 'family-room',
        name: 'Phòng cho gia đình',
        icon: Users,
        category: 'family',
    },
    {
        id: 'pet-friendly',
        name: 'Chấp nhận thú cưng',
        icon: Dog,
        category: 'family',
    },

    // ======== NGOẠI TRỜI & CẢNH QUAN (outdoor) ✅ MỞ RỘNG VIEW ========
    {
        id: 'free-parking',
        name: 'Bãi đậu xe miễn phí',
        icon: Car,
        category: 'outdoor',
    },
    {
        id: 'bbq-grill',
        name: 'Sân vườn / BBQ',
        icon: Trees,
        category: 'outdoor',
    },
    {
        id: 'mountain-view',
        name: 'View núi',
        icon: Mountain,
        category: 'outdoor',
    },
    {
        id: 'beach-access',
        name: 'Lối ra biển',
        icon: Waves,
        category: 'outdoor',
    },
    {
        id: 'private-beach',
        name: 'Bãi biển riêng',
        icon: Waves,
        category: 'outdoor',
    },
    { id: 'river-view', name: 'View sông', icon: Waves, category: 'outdoor' },
    {
        id: 'city-view',
        name: 'View thành phố',
        icon: Building2,
        category: 'outdoor',
    },
    {
        id: 'scenic-view',
        name: 'View cảnh đẹp (ruộng, đồi...)',
        icon: Mountain,
        category: 'outdoor',
    },

    // ======== DI CHUYỂN & DỊCH VỤ (transport) — ✅ THÊM MỚI ========
    {
        id: 'motorbike-rental',
        name: 'Thuê xe máy',
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
        id: 'airport-shuttle',
        name: 'Xe đưa đón sân bay',
        icon: Car,
        category: 'transport',
    },
    {
        id: 'shuttle-service',
        name: 'Dịch vụ đưa đón (cảng, bến...)',
        icon: Car,
        category: 'transport',
    },

    // ======== AN TOÀN & Y TẾ (safety) ========
    {
        id: 'first-aid',
        name: 'Hộp y tế cơ bản',
        icon: BriefcaseMedical,
        category: 'safety',
    },
    { id: 'cctv', name: 'Camera an ninh', icon: Camera, category: 'safety' },
    { id: '24h-reception', name: 'Lễ tân 24/7', icon: Key, category: 'safety' },
    {
        id: 'fire-extinguisher',
        name: 'Bình chữa cháy',
        icon: Sparkles,
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

    // ======== DANH HIỆU & ĐÁNH GIÁ (award) ========
    {
        id: 'award-winning',
        name: 'Giải thưởng chất lượng',
        icon: Medal,
        category: 'award',
    },
    { id: 'top-rated', name: 'Đánh giá cao', icon: Star, category: 'award' },
    {
        id: 'trending',
        name: 'Được đặt nhiều nhất',
        icon: Sparkles,
        category: 'award',
    },
];
