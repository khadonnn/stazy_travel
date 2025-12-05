export interface GuestsObject {
    guestAdults?: number;
    guestChildren?: number;
    guestInfants?: number;
}

export type StaySearchFormFields = 'location' | 'guests' | 'dates';

export interface PropertyType {
    name: string;
    description: string;
    checked: boolean;
}

export interface User {
    id: number;
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'user';
    profilePic?: string;
    createdAt?: string;
    updatedAt?: string;
    // add
    nickname?: string;
    dob?: string; // yyyy-mm-dd
    phone?: string;
    gender?: string; // Keep as string to handle any backend data, validation happens at form level
    address?: string;
}

// export interface Hotel {
//   id: number;
//   name: string;
//   location: string;
//   totalRooms: number;
//   availableRooms: number;
// }


export type DateRange = [Date | null, Date | null];
