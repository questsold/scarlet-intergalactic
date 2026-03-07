import { collection, doc, setDoc, getDoc, getDocs, updateDoc, query, where, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { ClientPortal, ClientPortalMilestone } from '../types/clientPortal';
import type { BoldTrailTransaction } from '../types/boldtrail';
import { boldtrailApi } from './boldtrailApi';
import { searchPeopleByEmail } from './fubApi';

const PORTALS_COLLECTION = 'client_portals';

export const clientPortalService = {
    /**
     * Generates default milestones for a standard transaction process.
     */
    generateDefaultMilestones(transaction?: BoldTrailTransaction, clientType: 'buyer' | 'seller' = 'buyer', fubStage?: string): ClientPortalMilestone[] {
        if (clientType === 'seller') {
            return [
                {
                    id: 'preparing_home',
                    title: 'Preparing home to list',
                    description: 'Getting your home ready for the market',
                    deadlineDate: null,
                    completedDate: null,
                    isCompleted: false,
                    order: 1
                },
                {
                    id: 'listing_agreement',
                    title: 'Listing agreement signed',
                    description: 'Official paperwork to list your home',
                    deadlineDate: null,
                    completedDate: null,
                    isCompleted: false,
                    order: 2
                },
                {
                    id: 'listing_photos',
                    title: 'Listing Photos',
                    description: 'Professional photography session',
                    deadlineDate: null,
                    completedDate: null,
                    isCompleted: false,
                    order: 3
                },
                {
                    id: 'live_on_mls',
                    title: 'Live on the MLS',
                    description: 'Your home is officially on the market!',
                    deadlineDate: null,
                    completedDate: null,
                    isCompleted: false,
                    order: 4
                },
                {
                    id: 'offer_accepted_seller',
                    title: 'Offer Accepted',
                    description: 'You accepted an offer on your home!',
                    deadlineDate: transaction?.acceptance_date || transaction?.created_at || null,
                    completedDate: transaction?.acceptance_date || transaction?.created_at || null,
                    isCompleted: !!transaction,
                    order: 5
                },
                {
                    id: 'inspection_due_diligence_seller',
                    title: 'Inspection & Due Diligence',
                    description: 'Buyer deadline for property inspections',
                    deadlineDate: null,
                    completedDate: null,
                    isCompleted: false,
                    order: 6
                },
                {
                    id: 'appraisal_seller',
                    title: 'Appraisal',
                    description: 'Lender appraisal of your property value',
                    deadlineDate: null,
                    completedDate: null,
                    isCompleted: false,
                    order: 7
                },
                {
                    id: 'clear_to_close_seller',
                    title: 'Clear to Close',
                    description: 'Final loan approval from the underwriter',
                    deadlineDate: null,
                    completedDate: null,
                    isCompleted: false,
                    order: 8
                },
                {
                    id: 'closing_scheduled_seller',
                    title: 'Closing Scheduled',
                    description: 'Signing the final paperwork',
                    deadlineDate: transaction?.closing_date || null,
                    completedDate: null,
                    isCompleted: transaction?.status === 'closed',
                    order: 9
                },
                {
                    id: 'key_exchange_seller',
                    title: 'Key Exchange',
                    description: 'Handing over the keys to the new owners!',
                    deadlineDate: transaction?.closing_date || null,
                    completedDate: null,
                    isCompleted: transaction?.status === 'closed',
                    order: 10
                }
            ];
        }

        const safeStage = (fubStage || '').toLowerCase();

        const isViewingHomesChecked = ['met with customer', 'showing homes', 'submitting offers', 'under contract'].includes(safeStage);
        const isSubmittingOffersChecked = ['submitting offers', 'under contract'].includes(safeStage);

        const getDateFromAttr = (nameRegex: RegExp): number | null => {
            if (!transaction?.custom_attributes) return null;
            const attr = transaction.custom_attributes.find(a =>
                nameRegex.test((a.name || a.label || '').toLowerCase())
            );
            if (attr && attr.value) {
                const parsed = new Date(attr.value).getTime();
                return isNaN(parsed) ? null : parsed;
            }
            return null;
        };

        const dueDiligenceDate = getDateFromAttr(/due diligence/i);
        const keyExchangeDate = getDateFromAttr(/key exchange/i);

        const milestones: ClientPortalMilestone[] = [
            {
                id: 'pre_approval',
                title: 'Pre-Approval',
                description: 'Securing financing pre-approval with a lender',
                deadlineDate: null,
                completedDate: null,
                isCompleted: !!transaction || isViewingHomesChecked,
                order: 1
            },
            {
                id: 'viewing_homes',
                title: 'Viewing Homes',
                description: 'Touring potential properties',
                deadlineDate: null,
                completedDate: null,
                isCompleted: !!transaction || isViewingHomesChecked,
                order: 2
            },
            {
                id: 'submitting_offers',
                title: 'Submitting Offers',
                description: 'Making an offer on a property',
                deadlineDate: null,
                completedDate: null,
                isCompleted: !!transaction || isSubmittingOffersChecked,
                order: 3
            },
            {
                id: 'offer_accepted',
                title: 'Offer Accepted',
                description: 'The seller has accepted your offer!',
                deadlineDate: transaction?.acceptance_date || transaction?.created_at || null,
                completedDate: transaction?.acceptance_date || transaction?.created_at || null,
                isCompleted: !!transaction,
                order: 4
            },
            {
                id: 'inspection_due_diligence',
                title: 'Inspection & Due Diligence',
                description: 'Deadline to complete property inspections',
                deadlineDate: dueDiligenceDate,
                completedDate: dueDiligenceDate && transaction?.status === 'closed' ? dueDiligenceDate : null,
                isCompleted: !!dueDiligenceDate && (dueDiligenceDate < Date.now() || transaction?.status === 'closed'),
                order: 5
            },
            {
                id: 'appraisal',
                title: 'Appraisal',
                description: 'Lender appraisal of the property value',
                deadlineDate: null,
                completedDate: null,
                isCompleted: false,
                order: 6
            },
            {
                id: 'clear_to_close',
                title: 'Clear to Close',
                description: 'Final loan approval from the underwriter',
                deadlineDate: null,
                completedDate: null,
                isCompleted: false,
                order: 7
            },
            {
                id: 'closing_scheduled',
                title: 'Closing Date',
                description: 'Signing the final paperwork',
                deadlineDate: transaction?.closing_date || null,
                completedDate: transaction?.status === 'closed' ? transaction?.closing_date : null,
                isCompleted: transaction?.status === 'closed',
                order: 8
            },
            {
                id: 'key_exchange',
                title: 'Key Exchange',
                description: 'Officially taking possession of your new home!',
                deadlineDate: keyExchangeDate || transaction?.closing_date || null,
                completedDate: transaction?.status === 'closed' ? (keyExchangeDate || transaction?.closing_date) : null,
                isCompleted: transaction?.status === 'closed',
                order: 9
            }
        ];

        return milestones;
    },

    /**
     * Creates a new client portal from a transaction.
     */
    async createPortalFromTransaction(
        transaction: BoldTrailTransaction,
        clientName: string,
        agentEmail: string
    ): Promise<string> {
        const portalRef = doc(collection(db, PORTALS_COLLECTION));
        const now = Date.now();

        const portal: ClientPortal = {
            id: portalRef.id,
            transactionId: transaction.id,
            clientName: clientName,
            propertyAddress: transaction.address || 'TBD Address',
            agentId: agentEmail.toLowerCase(),
            createdAt: now,
            updatedAt: now,
            milestones: this.generateDefaultMilestones(transaction)
        };

        await setDoc(portalRef, portal);
        return portalRef.id;
    },

    /**
     * Creates a new manual client portal not tied to a Boldtrail transaction.
     */
    async createManualPortal(
        clientName: string,
        propertyAddress: string,
        agentEmail: string,
        questStartDate?: number,
        clientEmail?: string,
        clientPhone?: string,
        clientType?: 'buyer' | 'seller',
        agentName?: string,
        agentPhotoUrl?: string,
        fubStage?: string,
        transaction?: BoldTrailTransaction
    ): Promise<string> {
        const portalRef = doc(collection(db, PORTALS_COLLECTION));
        const now = Date.now();

        const milestones = this.generateDefaultMilestones(transaction, clientType, fubStage);
        if (questStartDate) {
            // Shift all other milestones up by 1 order
            milestones.forEach(m => m.order += 1);
            // Insert the quest started milestone
            milestones.unshift({
                id: `ms_${now}_quest_started`,
                title: 'Quest Started',
                description: 'You connected with the Quest team to start your journey.',
                deadlineDate: questStartDate,
                completedDate: questStartDate,
                isCompleted: true,
                order: 0
            });
        }

        const portal: ClientPortal = {
            id: portalRef.id,
            transactionId: transaction?.id || `manual_${now}`,
            clientName: clientName,
            clientEmail: clientEmail,
            clientPhone: clientPhone,
            clientType: clientType || 'buyer',
            propertyAddress: propertyAddress || 'TBD Address',
            agentId: agentEmail.toLowerCase(),
            agentName: agentName,
            agentPhotoUrl: agentPhotoUrl,
            createdAt: now,
            updatedAt: now,
            milestones: milestones
        };

        await setDoc(portalRef, portal);
        return portalRef.id;
    },

    /**
     * Retrieves a single portal by ID (e.g., for the public view or editor).
     */
    async getPortal(id: string): Promise<ClientPortal | null> {
        const docRef = doc(db, PORTALS_COLLECTION, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data() as ClientPortal;
        }
        return null;
    },

    /**
     * Retrieves all portals for a specific agent.
     */
    async getPortalsByAgent(agentEmail: string): Promise<ClientPortal[]> {
        const q = query(
            collection(db, PORTALS_COLLECTION),
            where('agentId', '==', agentEmail.toLowerCase())
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => doc.data() as ClientPortal).sort((a, b) => b.updatedAt - a.updatedAt);
    },

    /**
     * Retrieves all portals (for admin use).
     */
    async getAllPortals(): Promise<ClientPortal[]> {
        const q = query(collection(db, PORTALS_COLLECTION));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => doc.data() as ClientPortal).sort((a, b) => b.updatedAt - a.updatedAt);
    },

    /**
     * Updates an existing portal.
     */
    async updatePortal(id: string, updates: Partial<ClientPortal>): Promise<void> {
        const docRef = doc(db, PORTALS_COLLECTION, id);
        await updateDoc(docRef, { ...updates, updatedAt: Date.now() });
    },

    /**
     * Deletes a portal.
     */
    async deletePortal(id: string): Promise<void> {
        const docRef = doc(db, PORTALS_COLLECTION, id);
        await deleteDoc(docRef);
    },

    /**
     * Automatically scans transactions and creates portals if they are missing.
     * Extracts email from BoldTrail contacts, searches FUB, sets matching agent and created portal.
     */
    async autoSyncMissingPortals(currentTransactions: BoldTrailTransaction[], fallbackAgentEmail: string): Promise<void> {
        try {
            // Only care about active/under contract
            const targetStatuses = ['listing', 'pending'];
            const relevantTxs = currentTransactions.filter(tx => targetStatuses.includes((tx.status || '').toLowerCase()));

            if (relevantTxs.length === 0) return;

            // Get existing portals
            const existingPortals = await this.getAllPortals();
            const existingTxIds = new Set(existingPortals.map(p => String(p.transactionId)));

            // Find missing portals
            const missingTxs = relevantTxs.filter(tx => !existingTxIds.has(String(tx.id)));

            if (missingTxs.length === 0) return;

            // Batch fetch all participants
            const txIds = missingTxs.map(tx => tx.id);
            const participantsMap = await boldtrailApi.getTransactionParticipants(txIds);

            for (const tx of missingTxs) {
                try {
                    // Fetch participants for this transaction
                    const participants = participantsMap[tx.id] || [];

                    // Look for buyer, seller or "Under Contract" contact
                    let matchedContact = participants.find((p: any) => p.type === 'contact' &&
                        (p.role === 'Buyer' || p.role === 'Seller' || p.role === 'Under Contract'));

                    if (!matchedContact) {
                        matchedContact = participants.find((p: any) => p.type === 'contact');
                    }

                    if (!matchedContact || !matchedContact.email) continue;

                    const clientType = (tx.representing === 'seller' || matchedContact.role === 'Seller') ? 'seller' : 'buyer';

                    // Search FUB
                    const fubResults = await searchPeopleByEmail(matchedContact.email);
                    const fubContact: any = fubResults?.people?.[0]; // Get top match

                    if (!fubContact) continue;

                    // Find assigned agent in FUB
                    let portalAgentEmail = fallbackAgentEmail;
                    let portalAgentName = undefined;
                    let portalAgentPhotoUrl = undefined;

                    if (fubContact.assignedUserId) {
                        const assUser = fubContact.assignedUser || (fubContact.users && fubContact.users[0]);
                        if (assUser && assUser.email) {
                            portalAgentEmail = assUser.email;
                            portalAgentName = assUser.name;
                            portalAgentPhotoUrl = assUser.picture ? (assUser.picture["162x162"] || assUser.picture["60x60"] || assUser.picture.original) : undefined;
                        } else if (fubContact.assignedTo) {
                            portalAgentName = fubContact.assignedTo;
                        }
                    }

                    // Create portal
                    await this.createManualPortal(
                        fubContact.name || matchedContact.name || matchedContact.first_name,
                        tx.address || 'TBD Address',
                        portalAgentEmail,
                        undefined,
                        fubContact.emails?.[0]?.value || matchedContact.email,
                        fubContact.phones?.[0]?.value || '',
                        clientType,
                        portalAgentName,
                        portalAgentPhotoUrl,
                        fubContact.stage,
                        tx
                    );

                    console.log(`Auto-synced portal for transaction ${tx.id} - ${tx.address} for client ${matchedContact.email}`);
                } catch (innerErr) {
                    console.error(`Failed to auto-sync transaction ${tx.id}`, innerErr);
                }
            }

        } catch (e) {
            console.error("Auto Sync Error", e);
        }
    }
};
