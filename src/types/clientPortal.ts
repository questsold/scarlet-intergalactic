export interface ClientPortalMilestone {
    id: string;
    title: string;
    description?: string;
    deadlineDate: number | null; // Unix timestamp or null
    completedDate: number | null; // Unix timestamp if completed, else null
    isCompleted: boolean;
    order: number;
}

export interface ClientPortal {
    id: string; // The Firestore document ID, acts as the public link ID
    transactionId: string | number; // Backoffice/BoldTrail ID this is tied to
    clientName: string;
    propertyAddress: string;
    agentId: string; // To restrict access horizontally
    createdAt: number;
    updatedAt: number;
    milestones: ClientPortalMilestone[];
    coverImageUrl?: string; // Optional nice image for the top of the portal
}
