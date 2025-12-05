// Hotel & Room Management Types for Admin Panel
export interface Hotel {
    id: number;
    name: string;
    description: string;
    address: string;
    city: string;
    country: string;
    phone: string;
    email: string;
    website?: string;
    checkInTime: string; // "14:00"
    checkOutTime: string; // "12:00"
    starRating: 1 | 2 | 3 | 4 | 5;
    amenities: Amenity[];
    images: string[];
    policies: HotelPolicy[];
    coordinates: {
        lat: number;
        lng: number;
    };
    status: 'active' | 'inactive' | 'maintenance';
    createdAt: Date;
    updatedAt: Date;
}

export interface Amenity {
    id: number;
    name: string;
    category: AmenityCategory;
    icon: string;
    description?: string;
    isActive: boolean;
}

export type AmenityCategory = 
    | 'general' 
    | 'internet' 
    | 'parking' 
    | 'services' 
    | 'safety' 
    | 'business' 
    | 'entertainment'
    | 'family'
    | 'accessibility';

export interface HotelPolicy {
    id: number;
    type: PolicyType;
    title: string;
    description: string;
    isActive: boolean;
}

export type PolicyType = 
    | 'checkin_checkout' 
    | 'children_beds' 
    | 'pets' 
    | 'smoking' 
    | 'payment' 
    | 'cancellation'
    | 'damage'
    | 'noise';

export interface RoomType {
    id: number;
    name: string; // "Deluxe Room", "Suite", "Standard"
    description: string;
    basePrice: number;
    maxGuests: number;
    bedConfiguration: BedConfiguration[];
    size: number; // m²
    amenities: Amenity[];
    images: string[];
    isActive: boolean;
}

export interface BedConfiguration {
    type: 'single' | 'double' | 'queen' | 'king' | 'sofa_bed';
    quantity: number;
}

export interface Room {
    id: number;
    number: string; // "101", "A-205"
    floor: number;
    roomType: RoomType;
    status: RoomStatus;
    lastMaintenance?: Date;
    notes?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export type RoomStatus = 
    | 'available' 
    | 'occupied' 
    | 'maintenance' 
    | 'out_of_order' 
    | 'cleaning'
    | 'reserved';

// Enhanced Booking Types
export interface BookingEnhanced {
    id: number;
    bookingNumber: string; // "BK-2024-001"
    userId: number;
    roomId: number;
    room: Room;
    checkInDate: Date;
    checkOutDate: Date;
    nights: number;
    guests: GuestInfo;
    status: BookingStatus;
    paymentStatus: PaymentStatus;
    totalAmount: number;
    baseAmount: number;
    taxes: number;
    fees: number;
    discounts: number;
    specialRequests?: string;
    cancellationReason?: string;
    source: BookingSource;
    createdAt: Date;
    updatedAt: Date;
    checkInTime?: Date;
    checkOutTime?: Date;
}

export interface GuestInfo {
    primary: Guest;
    additional: Guest[];
    totalAdults: number;
    totalChildren: number;
}

export interface Guest {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    dateOfBirth?: Date;
    nationality?: string;
    idNumber?: string;
    specialNeeds?: string;
}

export type BookingStatus = 
    | 'pending' 
    | 'confirmed' 
    | 'checked_in' 
    | 'checked_out' 
    | 'cancelled' 
    | 'no_show'
    | 'modified';

export type PaymentStatus = 
    | 'pending' 
    | 'paid' 
    | 'partial' 
    | 'refunded' 
    | 'failed'
    | 'disputed';

export type BookingSource = 
    | 'direct' 
    | 'booking_com' 
    | 'expedia' 
    | 'agoda' 
    | 'airbnb'
    | 'phone'
    | 'walk_in';

// Dashboard Statistics
export interface HotelStats {
    totalRooms: number;
    availableRooms: number;
    occupiedRooms: number;
    maintenanceRooms: number;
    occupancyRate: number;
    averageDailyRate: number;
    revenuePerAvailableRoom: number;
    totalRevenue: number;
    pendingBookings: number;
    todayCheckIns: number;
    todayCheckOuts: number;
}

// Search & Filter Types
export interface RoomFilters {
    status?: RoomStatus[];
    roomType?: number[];
    floor?: number[];
    availability?: {
        from: Date;
        to: Date;
    };
    priceRange?: {
        min: number;
        max: number;
    };
    maxGuests?: number;
}

export interface BookingFilters {
    status?: BookingStatus[];
    paymentStatus?: PaymentStatus[];
    source?: BookingSource[];
    dateRange?: {
        from: Date;
        to: Date;
        type: 'booking' | 'checkin' | 'checkout';
    };
    amountRange?: {
        min: number;
        max: number;
    };
    guestName?: string;
    bookingNumber?: string;
}

// Form Types
export interface RoomFormData {
    number: string;
    floor: number;
    roomTypeId: number;
    status: RoomStatus;
    notes?: string;
    isActive: boolean;
}

export interface RoomTypeFormData {
    name: string;
    description: string;
    basePrice: number;
    maxGuests: number;
    bedConfiguration: BedConfiguration[];
    size: number;
    amenityIds: number[];
    images: File[] | string[];
    isActive: boolean;
}

export interface BookingFormData {
    userId?: number;
    roomId: number;
    checkInDate: Date;
    checkOutDate: Date;
    guestInfo: GuestInfo;
    specialRequests?: string;
    source: BookingSource;
}
