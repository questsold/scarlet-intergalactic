export interface BoldTrailUser {
    id: number;
    user_id: number;
    account_user_id?: number;
    first_name: string;
    last_name: string;
    name: string;
    email: string;
    role: string;
}

export interface BoldTrailTransaction {
    id: number;
    address: string;
    city: string;
    state: string;
    zip: string;
    status: 'listing' | 'pending' | 'closed' | 'cancelled' | 'active' | 'opportunity';
    price: number;
    transaction_type: string;
    representing: 'seller' | 'buyer' | 'both';
    acceptance_date: number | null;
    expiration_date: number | null;
    created_at: number;
    updated_at: number;
    closing_date: number | null;
    total_gross_commission: number;
    listing_date: number | null;
    external_id: string | null;
    timezone: number;
    commissions_finalized_at: number | null;
    custom_id: string;
    closed_at: number | null;
    custom_attributes: Array<{
        type: string;
        label: string;
        name: string;
        value: any;
    }>;
    sales_volume: number;
    buying_side_representer?: {
        id: number;
        type: string;
    };
    listing_side_representer?: {
        id: number;
        type: string;
    };
    // Include any additional participants (users/contacts) if they are extended
    participants?: Array<any>;
    assigned_agent_name?: string;
    assigned_agent_avatar?: string;
}
