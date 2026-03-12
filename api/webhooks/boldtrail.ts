import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const BROKERMINT_API_KEY = process.env.VITE_BROKERMINT_API_KEY;
const BROKERMINT_BASE_URL = 'https://my.brokermint.com/api/v3';

// Firebase Admin Initialization
if (!getApps().length) {
    const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (serviceAccountBase64) {
        try {
            const serviceAccountJson = Buffer.from(serviceAccountBase64, 'base64').toString('utf-8');
            const serviceAccount = JSON.parse(serviceAccountJson);
            initializeApp({
                credential: cert(serviceAccount)
            });
        } catch (e) {
            console.error('Failed to parse Firebase Service Account Key. Webhook sync will fail.', e);
        }
    }
}

const db = getFirestore();

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // 1. Verify Webhook Signature (Optional but recommended by Brokermint)
        // If they send a signature header, verify it uses your webhook secret
        // For right now, we accept the payload, then independently query the transaction ID
        // from the actual API to verify the data wasn't spoofed.

        const payload = req.body;
        console.log('Received Webhook Trigger:', payload);

        // Brokermint webhooks usually shape like: { event: "transaction.updated", id: 12345, ... }
        // Or sometimes it's nested depending on the exact webhook type.
        const eventName = payload.event;
        let transactionId = payload.id;

        // Handle variations in payload
        if (payload.data && payload.data.id) {
            transactionId = payload.data.id;
        }

        if (!transactionId) {
            return res.status(400).json({ error: 'No transaction ID found in payload' });
        }

        // Only process transaction-related events
        if (!eventName || !eventName.includes('transaction')) {
            return res.status(200).json({ message: 'Ignored non-transaction event' });
        }

        // 2. Fetch the pristine, 100% verified transaction from the source API
        const txRes = await fetch(`${BROKERMINT_BASE_URL}/transactions/${transactionId}`, {
            headers: {
                'Authorization': `Bearer ${BROKERMINT_API_KEY}`,
                'Accept': 'application/json'
            }
        });

        if (!txRes.ok) {
            if (txRes.status === 404) {
                // Transaction was deleted! We should delete it from Firestore.
                await db.collection('transactions').doc(String(transactionId)).delete();
                return res.status(200).json({ success: true, action: 'deleted' });
            }
            return res.status(500).json({ error: 'Failed to retrieve source transaction' });
        }

        const pristineTx = await txRes.json();

        // 3. Re-calculate ownership FUB IDs
        // Fetch FUB reference maps
        const fubResponse = await fetch('https://api.followupboss.com/v1/users?limit=100', {
            headers: {
                'Authorization': `Basic ${Buffer.from(process.env.VITE_FUB_API_KEY + ':').toString('base64')}`,
                'Accept': 'application/json'
            }
        });

        const fubData = fubResponse.ok ? await fubResponse.json() : { users: [] };
        const users = fubData.users || [];
        const nameToFubUserId = new Map<string, number>();
        const emailToFubUserId = new Map<string, number>();
        users.forEach((u: any) => {
            if (u.name) nameToFubUserId.set(u.name.toLowerCase(), u.id);
            if (u.email) emailToFubUserId.set(u.email.toLowerCase(), u.id);
        });

        let ownerFubIds: number[] = [];

        const partRes = await fetch(`${BROKERMINT_BASE_URL}/transactions/${transactionId}/participants`, {
            headers: {
                'Authorization': `Bearer ${BROKERMINT_API_KEY}`,
                'Accept': 'application/json'
            }
        });

        const btAgentIds: number[] = [];

        if (partRes.ok) {
            const participants = await partRes.json();
            const linkedUsers = participants.filter((p: any) => p.user && p.user.status === 'active');
            for (const p of linkedUsers) {
                if (p.user.id) btAgentIds.push(p.user.id);
            }
        }

        if (btAgentIds.length === 0) {
            if (pristineTx.buying_side_representer?.id) btAgentIds.push(pristineTx.buying_side_representer.id);
            if (pristineTx.listing_side_representer?.id) btAgentIds.push(pristineTx.listing_side_representer.id);
        }

        const uniqueBtAgentIds = Array.from(new Set(btAgentIds));

        for (const btAgentId of uniqueBtAgentIds) {
            const btUserRes = await fetch(`${BROKERMINT_BASE_URL}/users/${btAgentId}`, {
                headers: {
                    'Authorization': `Bearer ${BROKERMINT_API_KEY}`,
                    'Accept': 'application/json'
                }
            });

            if (btUserRes.ok) {
                const btUser = await btUserRes.json();

                let fubId: number | undefined;
                const uEmail = btUser.email?.toLowerCase();
                const uName = (`${btUser.first_name || ''} ${btUser.last_name || ''}`).trim().toLowerCase();

                if (uEmail && emailToFubUserId.has(uEmail)) {
                    fubId = emailToFubUserId.get(uEmail);
                } else if (uName && nameToFubUserId.has(uName)) {
                    fubId = nameToFubUserId.get(uName);
                } else if (btUser.name && nameToFubUserId.has(btUser.name.toLowerCase())) {
                    fubId = nameToFubUserId.get(btUser.name.toLowerCase());
                }

                if (fubId && !ownerFubIds.includes(fubId)) {
                    ownerFubIds.push(fubId);
                }
            }
        }

        const enrichedTx = {
            ...pristineTx,
            ownerFubIds: ownerFubIds,
            syncedAt: new Date().toISOString()
        };

        // Upsert into Firestore
        await db.collection('transactions').doc(String(transactionId)).set(enrichedTx, { merge: true });

        return res.status(200).json({ success: true, action: 'upserted', transactionId });

    } catch (error: any) {
        console.error('Webhook processing error:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
