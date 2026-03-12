import type { FubPeopleResponse, FubUsersResponse } from '../types/fub';
import type { FubDealsResponse } from '../types/fubDeals';
// Use local API routes for Vercel Serverless Functions
const BASE_URL = '/api';

const getHeaders = () => {
    return {
        'Accept': 'application/json',
    };
}

export const fetchUsers = async (): Promise<FubUsersResponse> => {
    const response = await fetch(`${BASE_URL}/fub-proxy?action=users`, {
        headers: getHeaders(),
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.statusText}`);
    }

    return response.json();
};

export const fetchPeople = async (limit = 100, offset = 0): Promise<FubPeopleResponse> => {
    const response = await fetch(`${BASE_URL}/fub-proxy?action=people&limit=${limit}&offset=${offset}`, {
        headers: getHeaders(),
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch people: ${response.statusText}`);
    }

    return response.json();
};

export const fetchAllPeople = async (): Promise<FubPeopleResponse> => {
    // We paginate people deeply via the Vercel proxy so we don't miss long-term reporting metrics
    // Fetching 5000 leads gets us ~ 1 year back
    return fetchPeople(5000, 0); 
}

export const searchPeople = async (nameQuery: string): Promise<FubPeopleResponse> => {
    const response = await fetch(`${BASE_URL}/fub-proxy?action=people&limit=10&name=${encodeURIComponent(nameQuery)}`, {
        headers: getHeaders(),
    });

    if (!response.ok) {
        throw new Error(`Failed to search people: ${response.statusText}`);
    }

    return response.json();
};

export const searchPeopleByEmail = async (email: string): Promise<FubPeopleResponse> => {
    const response = await fetch(`${BASE_URL}/fub-proxy?action=people&limit=10&email=${encodeURIComponent(email)}`, {
        headers: getHeaders(),
    });

    if (!response.ok) {
        throw new Error(`Failed to search people by email: ${response.statusText}`);
    }

    return response.json();
};

export const fetchDeals = async (limit = 100, offset = 0): Promise<FubDealsResponse> => {
    const response = await fetch(`${BASE_URL}/fub-proxy?action=deals&limit=${limit}&offset=${offset}`, {
        headers: getHeaders(),
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch deals: ${response.statusText}`);
    }

    return response.json();
};

export const fetchAllDeals = async (): Promise<FubDealsResponse> => {
    // Server-side (api/deals.js) now paginates all FUB pages and returns the complete dataset.
    return fetchDeals(100, 0);
}

export const createEvent = async (eventData: any): Promise<any> => {
    const response = await fetch(`${BASE_URL}/fub-proxy?action=events`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify(eventData)
    });

    if (!response.ok) {
        let msg = response.statusText;
        try {
            const err = await response.json();
            if (err.details) msg = err.details;
            if (err.errorMessage) msg = err.errorMessage;
        } catch (e) { }
        throw new Error(`Failed to create event: ${msg}`);
    }

    return response.json();
};
