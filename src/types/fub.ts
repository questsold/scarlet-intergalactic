export interface FubPerson {
    id: number;
    firstName: string;
    lastName: string;
    stage: string;
    source: string;
    assignedTo: string; // The agent's name or ID
    assignedUserId: number;
    created: string;
    updated: string;
}

export interface FubUser {
    id: number;
    name: string;
    email: string;
    role: string;
    status: string;
    picture?: {
        original?: string;
        "162x162"?: string;
        "60x60"?: string;
    };
}

export interface FubPeopleResponse {
    _metadata: {
        collection: string;
        offset: number;
        limit: number;
        total: number;
    };
    people: FubPerson[];
}

export interface FubUsersResponse {
    _metadata: {
        collection: string;
        offset: number;
        limit: number;
        total: number;
    };
    users: FubUser[];
}
