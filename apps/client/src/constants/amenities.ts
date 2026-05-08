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
  // --- Thêm mới cho ALL_AMENITIES ---
  Flame,
  Moon,
  Heart,
  Activity,
  VolumeX,
  Footprints,
  Leaf,
  CloudRain,
  MapPin,
  PartyPopper,
  ArrowUpDown,
  PawPrint,
  AlertTriangle,
  Shield,
  Armchair,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface Amenity {
  id: string;
  name: string;
  icon: LucideIcon;
  category:
    | "basic"
    | "comfort"
    | "food"
    | "relax"
    | "family"
    | "transport"
    | "view"
    | "safety"
    | "business"
    | "award";
}

export const Amenities_demos: Amenity[] = [
  // ======== TIỆN NGHI CƠ BẢN (basic) ========
  { id: "wifi", name: "Wifi miễn phí", icon: Wifi, category: "basic" },
  {
    id: "air-conditioning",
    name: "Điều hòa nhiệt độ",
    icon: AirVent,
    category: "basic",
  },
  // Alias cho generate_data.py (ac)
  { id: "ac", name: "Điều hòa nhiệt độ", icon: AirVent, category: "basic" },
  {
    id: "bathroom",
    name: "Phòng tắm riêng",
    icon: ShowerHead,
    category: "basic",
  },
  { id: "hot-water", name: "Nước nóng 24/7", icon: Bath, category: "basic" },
  // Alias cho generate_data.py (hot_water_24h)
  {
    id: "hot_water_24h",
    name: "Nước nóng 24/7",
    icon: Bath,
    category: "basic",
  },
  { id: "tv", name: "TV màn hình phẳng", icon: Tv, category: "basic" },
  { id: "laundry", name: "Giặt ủi", icon: WashingMachine, category: "basic" },
  {
    id: "luggage-storage",
    name: "Gửi hành lý",
    icon: Luggage,
    category: "basic",
  },
  {
    id: "housekeeping",
    name: "Dọn phòng hàng ngày",
    icon: HeartHandshake,
    category: "basic",
  },
  {
    id: "elevator",
    name: "Thang máy",
    icon: ArrowUpDown,
    category: "basic",
  },
  {
    id: "bathtub",
    name: "Bồn tắm",
    icon: Bath,
    category: "basic",
  },
  {
    id: "quiet_after_22h",
    name: "Yên tĩnh sau 22h",
    icon: VolumeX,
    category: "basic",
  },

  // ======== GIƯỜNG & PHÒNG (comfort) ========
  { id: "double-bed", name: "Giường đôi", icon: Bed, category: "comfort" },
  { id: "single-bed", name: "Giường đơn", icon: Bed, category: "comfort" },
  { id: "extra-bed", name: "Giường phụ", icon: Bed, category: "comfort" },
  { id: "balcony", name: "Ban công", icon: Sun, category: "comfort" },
  { id: "terrace", name: "Sân thượng", icon: Tent, category: "comfort" },
  {
    id: "high-floor-view",
    name: "Tầng cao, view đẹp",
    icon: Building2,
    category: "comfort",
  },
  {
    id: "room-service",
    name: "Gọi món tại phòng",
    icon: Martini,
    category: "comfort",
  },
  // Alias cho generate_data.py (room_service)
  {
    id: "room_service",
    name: "Dịch vụ phòng",
    icon: Martini,
    category: "comfort",
  },
  { id: "concierge", name: "Dịch vụ hỗ trợ", icon: Key, category: "comfort" },
  {
    id: "fireplace",
    name: "Lò sưởi",
    icon: Flame,
    category: "comfort",
  },
  {
    id: "hammock",
    name: "Hammock thư giãn",
    icon: Trees,
    category: "comfort",
  },
  {
    id: "outdoor_shower",
    name: "Vòi sen ngoài trời",
    icon: ShowerHead,
    category: "comfort",
  },
  {
    id: "stargazing_deck",
    name: "Sân ngắm sao",
    icon: Moon,
    category: "comfort",
  },

  // ======== BẾP & ĂN UỐNG (food) ========
  {
    id: "kitchen",
    name: "Bếp nấu đầy đủ",
    icon: CookingPot,
    category: "food",
  },
  { id: "fridge", name: "Tủ lạnh", icon: Refrigerator, category: "food" },
  // Alias cho generate_data.py (refrigerator)
  {
    id: "refrigerator",
    name: "Tủ lạnh",
    icon: Refrigerator,
    category: "food",
  },
  { id: "microwave", name: "Lò vi sóng", icon: Microwave, category: "food" },
  {
    id: "coffee-maker",
    name: "Máy pha cà phê",
    icon: Coffee,
    category: "food",
  },
  {
    id: "breakfast",
    name: "Ăn sáng miễn phí",
    icon: Utensils,
    category: "food",
  },
  {
    id: "kitchenware",
    name: "Đồ dùng bếp",
    icon: Utensils,
    category: "food",
  },
  { id: "mini-bar", name: "Mini Bar", icon: Martini, category: "food" },
  {
    id: "on-site-restaurant",
    name: "Nhà hàng tại chỗ",
    icon: Wine,
    category: "food",
  },
  // Alias cho generate_data.py (restaurant)
  {
    id: "restaurant",
    name: "Nhà hàng",
    icon: Utensils,
    category: "food",
  },
  { id: "bar", name: "Quầy bar", icon: Wine, category: "food" },
  {
    id: "rice_cooker",
    name: "Nồi cơm điện",
    icon: CookingPot,
    category: "food",
  },
  {
    id: "bbq_area",
    name: "Khu BBQ ngoài trời",
    icon: Flame,
    category: "food",
  },

  // ======== GIẢI TRÍ & SỨC KHỎE (relax) ========
  { id: "pool", name: "Hồ bơi", icon: Waves, category: "relax" },
  { id: "gym", name: "Phòng gym", icon: Dumbbell, category: "relax" },
  { id: "spa", name: "Spa / Sauna", icon: Umbrella, category: "relax" },
  // Alias cho generate_data.py (sauna)
  { id: "sauna", name: "Phòng xông hơi", icon: Waves, category: "relax" },
  {
    id: "massage",
    name: "Massage",
    icon: HeartHandshake,
    category: "relax",
  },
  {
    id: "yoga",
    name: "Phòng tập Yoga",
    icon: Activity,
    category: "relax",
  },
  { id: "bbq", name: "Sân vườn / BBQ", icon: Trees, category: "relax" },
  { id: "garden", name: "Sân vườn", icon: Trees, category: "relax" },
  {
    id: "game-console",
    name: "Máy chơi game",
    icon: Gamepad2,
    category: "relax",
  },
  { id: "boardgames", name: "Board game", icon: Dice6, category: "relax" },
  {
    id: "sound-system",
    name: "Hệ thống âm thanh",
    icon: Music,
    category: "relax",
  },
  {
    id: "karaoke_room",
    name: "Phòng Karaoke",
    icon: Music,
    category: "relax",
  },

  // ======== GIA ĐÌNH & TRẺ EM (family) ========
  { id: "baby-cot", name: "Cũi em bé", icon: Baby, category: "family" },
  // Alias cho generate_data.py (baby_crib)
  { id: "baby_crib", name: "Cũi em bé", icon: Baby, category: "family" },
  { id: "high-chair", name: "Ghế ăn cho bé", icon: Baby, category: "family" },
  // Alias cho generate_data.py (high_chair)
  {
    id: "high_chair",
    name: "Ghế ăn cho bé",
    icon: Armchair,
    category: "family",
  },
  {
    id: "family-room",
    name: "Phòng gia đình",
    icon: Users,
    category: "family",
  },
  // Alias cho generate_data.py (family_room)
  {
    id: "family_room",
    name: "Phòng gia đình",
    icon: Users,
    category: "family",
  },
  {
    id: "pet-friendly",
    name: "Chấp nhận thú cưng",
    icon: Dog,
    category: "family",
  },
  // Alias cho generate_data.py (pets_allowed)
  {
    id: "pets_allowed",
    name: "Cho phép thú cưng",
    icon: PawPrint,
    category: "family",
  },
  {
    id: "pet_bed",
    name: "Giường cho thú cưng",
    icon: PawPrint,
    category: "family",
  },
  {
    id: "pet_food",
    name: "Thức ăn cho thú cưng",
    icon: PawPrint,
    category: "family",
  },
  {
    id: "dog_run_area",
    name: "Khu chạy chó",
    icon: PawPrint,
    category: "family",
  },
  {
    id: "kids_club",
    name: "Câu lạc bộ trẻ em",
    icon: Baby,
    category: "family",
  },
  {
    id: "playground",
    name: "Sân chơi trẻ em",
    icon: Gamepad2,
    category: "family",
  },

  // ======== DI CHUYỂN (transport) ========
  { id: "parking", name: "Bãi đậu xe", icon: Car, category: "transport" },
  {
    id: "motorbike-parking",
    name: "Chỗ để xe máy",
    icon: Bike,
    category: "transport",
  },
  {
    id: "bike-rental",
    name: "Thuê xe đạp",
    icon: Bike,
    category: "transport",
  },
  {
    id: "motorbike-rental",
    name: "Thuê xe máy",
    icon: Bike,
    category: "transport",
  },
  // Alias cho generate_data.py (free_motorbike_rental)
  {
    id: "free_motorbike_rental",
    name: "Cho thuê xe máy miễn phí",
    icon: Bike,
    category: "transport",
  },
  {
    id: "airport-shuttle",
    name: "Xe đưa đón sân bay",
    icon: Plane,
    category: "transport",
  },
  {
    id: "shuttle-service",
    name: "Dịch vụ đưa đón",
    icon: Car,
    category: "transport",
  },

  // ======== TẦM NHÌN & CẢNH QUAN (view) ========
  { id: "mountain-view", name: "View núi", icon: Mountain, category: "view" },
  // Alias cho generate_data.py (mountain_view)
  { id: "mountain_view", name: "View núi", icon: Mountain, category: "view" },
  { id: "beach-view", name: "View biển", icon: Waves, category: "view" },
  { id: "sea-view", name: "Hướng biển", icon: Waves, category: "view" },
  // Alias cho generate_data.py (sea_view)
  { id: "sea_view", name: "View biển", icon: Waves, category: "view" },
  { id: "river-view", name: "View sông", icon: Waves, category: "view" },
  { id: "lake-view", name: "View hồ", icon: Waves, category: "view" },
  {
    id: "city-view",
    name: "View thành phố",
    icon: Building,
    category: "view",
  },
  // Alias cho generate_data.py (city_view)
  {
    id: "city_view",
    name: "View thành phố",
    icon: Building,
    category: "view",
  },
  { id: "garden-view", name: "View sân vườn", icon: Trees, category: "view" },
  // Alias cho generate_data.py (garden_view)
  { id: "garden_view", name: "View sân vườn", icon: Trees, category: "view" },
  {
    id: "scenic-view",
    name: "View cảnh đẹp",
    icon: Mountain,
    category: "view",
  },
  {
    id: "ocean_view",
    name: "View đại dương",
    icon: Waves,
    category: "view",
  },
  {
    id: "beachfront",
    name: "Mặt tiền biển",
    icon: Waves,
    category: "view",
  },
  {
    id: "beach_access",
    name: "Lối đi ra biển",
    icon: Footprints,
    category: "view",
  },
  {
    id: "beach_walkable",
    name: "Đi bộ đến biển",
    icon: Footprints,
    category: "view",
  },
  {
    id: "private_beach",
    name: "Bãi biển riêng",
    icon: Waves,
    category: "view",
  },

  // ======== AN TOÀN (safety) ========
  { id: "cctv", name: "Camera an ninh", icon: Camera, category: "safety" },
  { id: "reception-24h", name: "Lễ tân 24/7", icon: Key, category: "safety" },
  // Alias cho generate_data.py (24h_reception)
  {
    id: "24h_reception",
    name: "Lễ tân 24/7",
    icon: Key,
    category: "safety",
  },
  {
    id: "fire-safety",
    name: "An toàn PCCC",
    icon: ShieldCheck,
    category: "safety",
  },
  {
    id: "first-aid",
    name: "Sơ cứu cơ bản",
    icon: BriefcaseMedical,
    category: "safety",
  },
  // Alias cho generate_data.py (first_aid_kit)
  {
    id: "first_aid_kit",
    name: "Bộ sơ cứu",
    icon: BriefcaseMedical,
    category: "safety",
  },
  {
    id: "wheelchair_accessible",
    name: "Tiếp cận xe lăn",
    icon: Armchair,
    category: "safety",
  },
  {
    id: "security_guard",
    name: "Bảo vệ 24/7",
    icon: Shield,
    category: "safety",
  },
  {
    id: "smoke_detector",
    name: "Báo cháy khói",
    icon: AlertTriangle,
    category: "safety",
  },

  // ======== CÔNG VIỆC (business) ========
  {
    id: "workspace",
    name: "Góc làm việc",
    icon: Laptop,
    category: "business",
  },
  { id: "printer", name: "Máy in/scan", icon: Phone, category: "business" },
  {
    id: "meeting-room",
    name: "Phòng họp nhỏ",
    icon: Users,
    category: "business",
  },

  // ======== BỀN VỮNG (eco - mapped to relax as closest) ========
  {
    id: "solar_power",
    name: "Năng lượng mặt trời",
    icon: Sun,
    category: "relax",
  },
  {
    id: "rainwater_harvesting",
    name: "Thu gom nước mưa",
    icon: CloudRain,
    category: "relax",
  },
  {
    id: "plastic_free",
    name: "Không sử dụng nhựa",
    icon: Leaf,
    category: "relax",
  },
  {
    id: "local_sourcing",
    name: "Nguồn cung địa phương",
    icon: MapPin,
    category: "relax",
  },

  // ======== SỰ KIỆN ========
  {
    id: "event_space",
    name: "Không gian sự kiện",
    icon: PartyPopper,
    category: "comfort",
  },
  {
    id: "wedding_ready",
    name: "Sẵn sàng tổ chức cưới",
    icon: Heart,
    category: "comfort",
  },

  // ======== DANH HIỆU (award) ========
  {
    id: "award-winning",
    name: "Giải thưởng chất lượng",
    icon: Medal,
    category: "award",
  },
  { id: "top-rated", name: "Đánh giá cao", icon: Star, category: "award" },
  {
    id: "trending",
    name: "Xu hướng đặt phòng",
    icon: Sparkles,
    category: "award",
  },
];
