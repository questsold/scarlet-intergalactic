
export interface FubDeal {
    id: number;
    name: string;
    price: number | null;
    commission?: number | null;
    status: string;
    stageName?: string;
    stageId: number;
    personId: number;
    createdAt: string;
    updated: string;
    closeDate?: string;
    projectedCloseDate?: string;
    users?: { id: number; name: string }[];
    pipelineName?: string;
    enteredStageAt?: string;
    mutualAcceptanceDate?: string;
    customSignedDate?: string;
}

export interface FubDealsResponse {
    deals: FubDeal[];
    _metadata: {
        total: number;
        nextUrl: string | null;
    };
}
