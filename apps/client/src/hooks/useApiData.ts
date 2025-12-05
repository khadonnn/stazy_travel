export interface Hotel {
    id: number;
    title: string;
    description: string;
    featured_image: string;
    address: string;
    price_per_night: number;
    max_guests: number;
    review_score: number;
    is_active: boolean;
    created_at: string;
}

