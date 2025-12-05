import {
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
    AirVent, // thay cho Snowflake
    Umbrella,
    Luggage,
    Key,
    Martini,
    Dice6,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface Amenity {
    name: string;
    icon: LucideIcon;
}

export const Amenities_demos: Amenity[] = [
    { name: 'Chìa khóa', icon: Key },
    { name: 'Hành lý', icon: Luggage },
    { name: 'Vòi sen', icon: ShowerHead },
    { name: 'Điều hòa', icon: AirVent },
    { name: 'Giường đôi', icon: Bed },
    { name: 'Phòng tắm', icon: Bath },
    { name: 'Đỗ xe', icon: Car },
    { name: 'TV', icon: Tv },
    { name: 'Wifi', icon: Wifi },
    { name: 'Đồ bếp', icon: Utensils },
    { name: 'Y tế', icon: BriefcaseMedical },
    { name: 'Chăm bé', icon: Baby },
    { name: 'Cà phê', icon: Coffee },
    { name: 'Cocktail', icon: Martini },
    { name: 'Xúc xắc', icon: Dice6 },
    { name: 'Tập gym', icon: Dumbbell },
    { name: 'Ô biển', icon: Umbrella },
];
