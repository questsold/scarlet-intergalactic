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
    const response = await fetch(`${BASE_URL}/users?limit=100`, {
        headers: getHeaders(),
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.statusText}`);
    }

    return response.json();
};

export const fetchPeople = async (limit = 100, offset = 0): Promise<FubPeopleResponse> => {
    const response = await fetch(`${BASE_URL}/people?limit=${limit}&offset=${offset}`, {
        headers: getHeaders(),
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch people: ${response.statusText}`);
    }

    return response.json();
};

export const fetchAllPeople = async (): Promise<FubPeopleResponse> => {
    // A more complete implementation might paginate through all results.
    // For this dashboard, we'll fetch a larger sample to show recent activity.
    return fetchPeople(500, 0); // FUB API max limit is typically 100 per page, but we will handle this in components if needed, or ask user. Let's start with 100
}

export const searchPeople = async (nameQuery: string): Promise<FubPeopleResponse> => {
    const response = await fetch(`${BASE_URL}/people?limit=10&name=${encodeURIComponent(nameQuery)}`, {
        headers: getHeaders(),
    });

    if (!response.ok) {
        throw new Error(`Failed to search people: ${response.statusText}`);
    }

    return response.json();
};

export const searchPeopleByEmail = async (email: string): Promise<FubPeopleResponse> => {
    const response = await fetch(`${BASE_URL}/people?limit=10&email=${encodeURIComponent(email)}`, {
        headers: getHeaders(),
    });

    if (!response.ok) {
        throw new Error(`Failed to search people by email: ${response.statusText}`);
    }

    return response.json();
};

export const fetchDeals = async (limit = 100, offset = 0): Promise<FubDealsResponse> => {
    const response = await fetch(`${BASE_URL}/deals?limit=${limit}&offset=${offset}`, {
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
