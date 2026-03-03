import type { FubDeal } from './fubDeals';
import type { BoldTrailTransaction } from './boldtrail';

export type UnifiedDeal = FubDeal | BoldTrailTransaction;

export function isBoldTrailTransaction(deal: UnifiedDeal): deal is BoldTrailTransaction {
    return 'transaction_type' in deal;
}
