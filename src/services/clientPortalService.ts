import { collection, doc, setDoc, getDoc, getDocs, updateDoc, query, where, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { ClientPortal, ClientPortalMilestone } from '../types/clientPortal';
import type { BoldTrailTransaction } from '../types/boldtrail';

const PORTALS_COLLECTION = 'client_portals';

export const clientPortalService = {
    /**
     * Generates default milestones for a standard transaction process.
     */
    generateDefaultMilestones(transaction?: BoldTrailTransaction): ClientPortalMilestone[] {
        const milestones: ClientPortalMilestone[] = [
            {
                id: 'viewing_homes',
                title: 'Viewing Homes',
                description: 'Touring potential properties',
                deadlineDate: null,
                completedDate: null,
                isCompleted: true, // usually past this if we have a transaction
                order: 1
            },
            {
                id: 'pre_approval',
                title: 'Pre-Approval',
                description: 'Securing financing pre-approval with a lender',
                deadlineDate: null,
                completedDate: null,
                isCompleted: true,
                order: 2
            },
            {
                id: 'submitting_offers',
                title: 'Submitting Offers',
                description: 'Making an offer on a property',
                deadlineDate: null,
                completedDate: null,
                isCompleted: true,
                order: 3
            },
            {
                id: 'offer_accepted',
                title: 'Offer Accepted',
                description: 'The seller has accepted your offer!',
                deadlineDate: transaction?.acceptance_date || transaction?.created_at || null,
                completedDate: transaction?.acceptance_date || transaction?.created_at || null,
                isCompleted: true,
                order: 4
            },
            {
                id: 'inspection_due_diligence',
                title: 'Inspection & Due Diligence',
                description: 'Deadline to complete property inspections',
                deadlineDate: null,
                completedDate: null,
                isCompleted: false,
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
                title: 'Closing Scheduled',
                description: 'Signing the final paperwork',
                deadlineDate: transaction?.closing_date || null,
                completedDate: null,
                isCompleted: transaction?.status === 'closed',
                order: 8
            },
            {
                id: 'key_exchange',
                title: 'Key Exchange',
                description: 'Officially taking possession of your new home!',
                deadlineDate: transaction?.closing_date || null,
                completedDate: null,
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
        clientPhone?: string
    ): Promise<string> {
        const portalRef = doc(collection(db, PORTALS_COLLECTION));
        const now = Date.now();

        const milestones = this.generateDefaultMilestones();
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
            transactionId: `manual_${now}`,
            clientName: clientName,
            clientEmail: clientEmail,
            clientPhone: clientPhone,
            propertyAddress: propertyAddress || 'TBD Address',
            agentId: agentEmail.toLowerCase(),
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
    }
};
