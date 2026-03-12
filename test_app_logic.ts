import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
const serviceAccountJson = Buffer.from(serviceAccountBase64, 'base64').toString('utf-8');
const serviceAccount = JSON.parse(serviceAccountJson);
if (!getApps().length) {
    initializeApp({
        credential: cert(serviceAccount)
    });
}
const db = getFirestore();

async function run() {
    let ytdCount = 0;
    const now = new Date();
    const currentYear = now.getFullYear();
    const snapshot = await db.collection('transactions').get();

    const transactions: any[] = [];
    snapshot.forEach(d => {
        transactions.push(d.data());
    });

    const timeframe = 'This Year';
    let rangeStart: Date | null = new Date(now.getFullYear(), 0, 1);
    let rangeEnd: Date | null = new Date(now.getFullYear() + 1, 0, 1);

    const inRange = (dateParam: string | number | undefined | null): boolean => {
        if (!dateParam) return false;
        const d = new Date(dateParam);
        if (rangeStart && d < rangeStart) return false;
        if (rangeEnd && d >= rangeEnd) return false;
        return true;
    };

    let activeListingsTotal = 0;
    let closedTotalYTD = 0;

    let testUserFubId = null; // Admin

    transactions.forEach(tx => {
        let belongsToAgent = false;
        if (!testUserFubId) {
            belongsToAgent = true; // Admin sees all
        } else {
            const owners = tx.ownerFubIds || [];
            if (owners.includes(testUserFubId)) {
                belongsToAgent = true;
            }
        }

        if (belongsToAgent && tx.status === 'listing' && (tx.representing === 'seller' || tx.representing === 'both')) {
            activeListingsTotal++;
        }

        const closeDateStr = tx.closing_date;
        const isClosedState = tx.status === 'closed';
        const isClosed = isClosedState && (timeframe === 'All Time' || inRange(closeDateStr));

        if (isClosedState && belongsToAgent && closeDateStr) {
            const d = new Date(closeDateStr);
            if (d.getFullYear() === now.getFullYear()) {
                closedTotalYTD++;
            }
        }
    });

    let closedDealsInProd = 0;
    // Map agent production
    transactions.forEach(tx => {
        const contractDateStr = tx.acceptance_date || tx.created_at;
        const isWritten = timeframe === 'All Time' || inRange(contractDateStr);

        const closeDateStr = tx.closing_date;
        const isClosedState = tx.status === 'closed';
        const isClosed = isClosedState && (timeframe === 'All Time' || inRange(closeDateStr));

        const owners = tx.ownerFubIds || [];
        const uniqueFubIds = Array.from(new Set(owners)) as number[];

        for (const fubId of uniqueFubIds) {
            if (isClosed) {
                closedDealsInProd++;
            }
        }
    });

    console.log("Total Transactions from DB:", transactions.length);
    console.log("Active Listings Total:", activeListingsTotal);
    console.log("Closed Total YTD (global array):", closedTotalYTD);
    console.log("Closed Deals in YTD in Prod Map:", closedDealsInProd);
}

run().catch(console.error);
