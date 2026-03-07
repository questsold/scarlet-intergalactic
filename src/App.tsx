import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import DashboardLayout from './components/DashboardLayout';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from './services/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import AgentTable from './components/AgentTable';
import TopProducers from './components/TopProducers';
import { fetchAllPeople, fetchUsers, fetchAllDeals } from './services/fubApi';
import type { FubPerson, FubUser } from './types/fub';
import type { FubDeal } from './types/fubDeals';
import { boldtrailApi } from './services/boldtrailApi';
import type { BoldTrailTransaction, BoldTrailUser } from './types/boldtrail';
import type { UnifiedDeal } from './types/unifiedDeal';
import { isConvertedStage, calculateConversionRate } from './utils/fubData';
import { AgentProductionTable } from './components/AgentProductionTable';
import type { AgentProductionData } from './components/AgentProductionTable';
import { filterByTimeframe } from './utils/timeFilters';
import type { Timeframe } from './utils/timeFilters';
import TimeframeSelector from './components/TimeframeSelector';
import CashFlowPredictor from './components/CashFlowPredictor';

function App() {
  const [authUser] = useAuthState(auth);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const [people, setPeople] = useState<FubPerson[]>([]);
  const [users, setUsers] = useState<FubUser[]>([]);
  const [deals, setDeals] = useState<FubDeal[]>([]);
  const [transactions, setTransactions] = useState<BoldTrailTransaction[]>([]);
  const [ownedTransactions, setOwnedTransactions] = useState<BoldTrailTransaction[] | null>(null);
  const [btUsers, setBtUsers] = useState<BoldTrailUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('This Year');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [directoryPhotos, setDirectoryPhotos] = useState<Record<string, string>>({});
  const [agentCaps, setAgentCaps] = useState<Record<number, { capAmount: number, officeContribution: number, anniversaryTs: number, agentNet: number }>>({});
  const navigate = useNavigate();

  useEffect(() => {
    if (!authUser) {
      setIsAdmin(false);
      return;
    }
    const checkAdmin = async () => {
      try {
        if (!authUser.email) {
          setIsAdmin(false);
          return;
        }
        const userDoc = await getDoc(doc(db, 'allowed_users', authUser.email.toLowerCase()));
        if (userDoc.exists() && userDoc.data().role === 'admin') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } catch (e) {
        // Graceful fallback for founders in case of firestore permission errors
        const isFounder = authUser.email?.toLowerCase() === 'ali@questsold.com' || authUser.email?.toLowerCase() === 'admin@questsold.com';
        setIsAdmin(isFounder);
      }
    };
    checkAdmin();
  }, [authUser]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [peopleResponse, usersResponse, dealsResponse, btTransactionsRes, btUsersRes, dbUsersSnap] = await Promise.all([
          fetchAllPeople(),
          fetchUsers(),
          fetchAllDeals(),
          boldtrailApi.getTransactions(),
          boldtrailApi.getUsers(),
          getDocs(collection(db, 'allowed_users')).catch((err) => {
            console.warn("Insufficient permissions for allowed_users, bypassing dashboard avatars:", err);
            return { forEach: () => { } };
          })
        ]);
        setPeople(peopleResponse.people || []);
        const uRes = usersResponse.users || [];
        const buRes = btUsersRes || [];
        setUsers(uRes);
        setBtUsers(buRes);
        setDeals(dealsResponse.deals || []);
        setTransactions(btTransactionsRes || []);

        const photos: Record<string, string> = {};
        dbUsersSnap.forEach(d => {
          const data = d.data();
          if (data.photoUrl && data.email) {
            photos[data.email.toLowerCase()] = data.photoUrl;
          }
        });
        setDirectoryPhotos(photos);

        const currentFubUser = authUser?.email ? uRes.find(u => u.email?.toLowerCase() === authUser.email!.toLowerCase()) : null;
        let myTxs: BoldTrailTransaction[] | null = null;

        if (currentFubUser && currentFubUser.role !== 'Owner') {
          const btUser = buRes.find(bu => bu.email?.toLowerCase() === currentFubUser.email?.toLowerCase());
          if (btUser) {
            const btUserId = btUser.user_id || btUser.id;
            myTxs = await boldtrailApi.getTransactions(1000, btUserId);
          }
        }
        setOwnedTransactions(myTxs);

        setError(null);
      } catch (err: any) {
        console.error("Error loading FUB data:", err);
        setError(err.message || 'Failed to connect to FUB API.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const LOCAL_STORAGE_KEY_COMMS = 'bt_tx_comms_v1';
  const [txCommissions, setTxCommissions] = useState<Record<number, { officeNet: number, officeContribution: number, agentNet: number }>>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY_COMMS);
      if (cached) return JSON.parse(cached);
    } catch (e) { }
    return {};
  });

  const LOCAL_STORAGE_KEY = 'bt_tx_parts_v1';
  const [txParticipants, setTxParticipants] = useState<Record<number, number[]>>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) return JSON.parse(cached);
    } catch (e) { }
    return {};
  });

  // Background hydration for missing transactions
  useEffect(() => {
    if (transactions.length === 0) return;

    // Only hydrate recent deals (strictly THIS year) to avoid hitting Brokermint's 200 request/minute API rate limits
    const now = new Date();
    const currentYear = now.getFullYear();

    const relevantTxs = transactions.filter(tx => {
      const d1 = tx.closing_date ? new Date(tx.closing_date).getFullYear() : 0;
      const d2 = tx.acceptance_date ? new Date(tx.acceptance_date).getFullYear() : 0;

      // Strict mapping: Dashboard defaults to "This Year" (2026).
      // Only fetch deals that actually impact the leaderboard or KPIs for "This Year".
      const impactsThisYear = (d1 === currentYear || d2 === currentYear);
      const isImportantStatus = ['closed', 'pending', 'listing'].includes(tx.status);

      const hasBrokerageAccountOverride = tx.buying_side_representer?.id === 2750 || tx.listing_side_representer?.id === 2750;

      return impactsThisYear && isImportantStatus && hasBrokerageAccountOverride;
    });

    const missingIds = relevantTxs.map(tx => tx.id).filter(id => !txParticipants[id]);
    if (missingIds.length === 0) return;

    let isMounted = true;
    const fetchMissing = async () => {
      // EXTREMELY conservative chunking. Vercel will fan-out these requests to Brokermint.
      // Brokermint limits to 200req/min. We will send 10 at a time, every 3.5 seconds. (~170req/min theoretical max)
      const chunkSize = 10;
      for (let i = 0; i < missingIds.length; i += chunkSize) {
        if (!isMounted) break;
        const chunk = missingIds.slice(i, i + chunkSize);
        try {
          const res = await boldtrailApi.getTransactionParticipants(chunk);
          if (!isMounted) break;

          setTxParticipants(prev => {
            const next = { ...prev };
            let changed = false;
            for (const [txIdStr, pUsers] of Object.entries(res)) {
              if ((pUsers as any).error === 429) continue; // rate limited
              const txId = parseInt(txIdStr);
              const owners = (pUsers as any[]).filter(u => u && (u as any).owner === true);
              const targets = owners.length > 0 ? owners : (pUsers as any[]);
              const agentIds = targets.map(u => u.user_id || u.account_user_id || u.id).filter(Boolean);
              next[txId] = agentIds;
              changed = true;
            }
            if (changed) {
              try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next)); } catch (e) { }
            }
            return next;
          });
        } catch (e) {
          console.error("Participant fetch error", e);
        }

        // 3.5 second delay between batches to respect Brokermint's API rate limits
        await new Promise(resolve => setTimeout(resolve, 3500));
      }
    };

    // Delay the start of background fetch by 10 seconds to allow core API requests (transactions, users) to finish untouched.
    const timeoutId = setTimeout(fetchMissing, 10000);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [transactions]);

  // Background hydration for missing commissions
  useEffect(() => {
    if (transactions.length === 0) return;

    // Only hydrate recent deals (strictly THIS year)
    const now = new Date();
    const currentYear = now.getFullYear();

    const relevantTxs = transactions.filter(tx => {
      const d1 = tx.closing_date ? new Date(tx.closing_date).getFullYear() : 0;
      const d2 = tx.acceptance_date ? new Date(tx.acceptance_date).getFullYear() : 0;

      const impactsThisYear = (d1 === currentYear || d2 === currentYear);
      const isImportantStatus = ['closed', 'pending'].includes(tx.status);

      return impactsThisYear && isImportantStatus;
    });

    const missingIds = relevantTxs.map(tx => tx.id).filter(id => !txCommissions[id]);
    if (missingIds.length === 0) return;

    let isMounted = true;
    const fetchMissing = async () => {
      // Fetch 10 deals at a time
      const chunkSize = 10;
      for (let i = 0; i < missingIds.length; i += chunkSize) {
        if (!isMounted) break;
        const chunk = missingIds.slice(i, i + chunkSize);
        try {
          const res = await boldtrailApi.getTransactionCommissions(chunk);
          if (!isMounted) break;

          setTxCommissions(prev => {
            const next = { ...prev, ...res };
            try { localStorage.setItem(LOCAL_STORAGE_KEY_COMMS, JSON.stringify(next)); } catch (e) { }
            return next;
          });
        } catch (e) {
          console.error("Commission fetch error", e);
        }

        // Wait a few seconds to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 3500));
      }
    };

    // Delay start to allow transactions/participants to settle primarily
    const timeoutId = setTimeout(fetchMissing, 15000);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [transactions]);

  // --- Cap Calculation ---
  useEffect(() => {
    const calculateCaps = async () => {
      if (users.length === 0 || btUsers.length === 0) return;

      const activeEmails = new Set(
        users.filter(u => u.status === 'Active' && (u.role === 'Owner' || u.role === 'Agent'))
          .map(u => u.email?.toLowerCase())
          .filter(Boolean)
      );

      const targetBtIds = btUsers
        .filter(bu => bu.email && activeEmails.has(bu.email.toLowerCase()))
        .map(bu => bu.id);

      if (targetBtIds.length === 0) return;

      const [btProfiles, reportData] = await Promise.all([
        boldtrailApi.getUserDetails(targetBtIds),
        boldtrailApi.getCapReport()
      ]);

      const emailToFubId = new Map<string, number>();
      users.forEach(u => { if (u.email) emailToFubId.set(u.email.toLowerCase(), u.id); });

      const btIdToEmail = new Map<number, string>();
      btUsers.forEach(bu => { if (bu.email) btIdToEmail.set(bu.id, bu.email.toLowerCase()); });

      const finalCaps: Record<number, { capAmount: number, officeContribution: number, anniversaryTs: number, agentNet: number }> = {};

      for (const [btIdStr, profile] of Object.entries(btProfiles)) {
        if (!profile) continue;
        const btId = Number(btIdStr);
        const email = btIdToEmail.get(btId);
        if (!email) continue;

        const fubId = emailToFubId.get(email);
        if (!fubId) continue;

        const capAmount = profile.goal_amount ? Number(profile.goal_amount) : 12000;
        let anniversaryTs = 0;
        let officeContribution = 0;
        let agentNet = 0;

        let reportRow = null;
        if (reportData && reportData.length > 0) {
          reportRow = reportData.find((r: any) => r.email?.toLowerCase() === email.toLowerCase());
        }

        if (reportRow) {
          anniversaryTs = reportRow.anniversary_date || 0;
          officeContribution = Number(reportRow.office_contribution) || 0;
          agentNet = Number(reportRow.agent_net) || 0;
        } else {
          // Fallback if not in report
          if (profile.anniversary_date) {
            const annivDate = new Date(profile.anniversary_date);
            const now = new Date();
            let currentYearAnniv = new Date(now.getFullYear(), annivDate.getMonth(), annivDate.getDate());
            if (currentYearAnniv > now) {
              currentYearAnniv = new Date(now.getFullYear() - 1, annivDate.getMonth(), annivDate.getDate());
            }
            anniversaryTs = currentYearAnniv.getTime();
          }
        }

        finalCaps[fubId] = {
          capAmount,
          officeContribution,
          anniversaryTs,
          agentNet
        };
      }

      setAgentCaps(finalCaps);
    };

    // Delay calculations so it doesn't block critical screen paints
    setTimeout(() => { calculateCaps(); }, 1500);
  }, [users, btUsers]);

  // --- Data Processing ---
  const filteredPeople = useMemo(() => filterByTimeframe(people, timeframe, customStartDate, customEndDate), [people, timeframe, customStartDate, customEndDate]);
  // Note: deals are NOT pre-filtered by timeframe here — pending/closed counts use enteredStageAt-based filtering
  // inside productionTableData and agentDealMap instead of createdAt-based filtering.




  const agentTableData = useMemo(() => {
    if (filteredPeople.length === 0 || users.length === 0) return [];

    const agentMap = new Map<number, { name: string, total: number, converted: number, avatarUrl?: string }>();
    users.forEach(user => {
      if (user.status === 'Active' && (user.role === 'Owner' || user.role === 'Agent')) {
        const emailLower = user.email?.toLowerCase();
        const fallbackPic = user.picture?.["162x162"] || user.picture?.["60x60"] || user.picture?.original;

        agentMap.set(user.id, {
          name: user.name,
          total: 0,
          converted: 0,
          avatarUrl: (emailLower && directoryPhotos[emailLower]) || fallbackPic
        });
      }
    });

    filteredPeople.forEach(person => {
      const agentId = person.assignedUserId;
      if (agentId && agentMap.has(agentId)) {
        const agent = agentMap.get(agentId)!;
        agent.total += 1;
        if (isConvertedStage(person.stage)) {
          agent.converted += 1;
        }
      }
    });

    return Array.from(agentMap.values())
      .filter(a => a.total > 0)
      .map(agent => ({
        agentName: agent.name,
        totalLeads: agent.total,
        convertedLeads: agent.converted,
        conversionRate: calculateConversionRate(agent.converted, agent.total),
        avatarUrl: agent.avatarUrl
      }))
      .sort((a, b) => b.totalLeads - a.totalLeads);
  }, [filteredPeople, users]);

  // --- Production Table Data Processing ---
  // IMPORTANT: Closed and pending deals are counted by when the deal *entered that stage* (enteredStageAt),
  // NOT by when the deal was created (createdAt). This is the correct behavior: a deal created in October
  // but closed in February should count toward February's closed total.
  const { filteredTransactions, productionTableData, dashboardKpis } = useMemo(() => {
    if (users.length === 0 || isAdmin === null) return { productionTableData: [], filteredTransactions: [], dashboardKpis: { activeListings: [], activeListingsTotal: [], underContract: [], underContractTotal: [], cancelled: [], cancelledTotalYTD: [], closed: [], closedTotalYTD: [] } };

    // Determine if we should filter the global dashboard down to just the currently logged-in Agent
    let authFubUserId: number | null = null;
    if (!isAdmin && authUser && authUser.email) {
      const authEmail = authUser.email.toLowerCase();
      const me = users.find(u => u.email && u.email.toLowerCase() === authEmail);
      if (me) authFubUserId = me.id;
    }

    // Build start/end date range from the current timeframe selection
    const now = new Date();
    let rangeStart: Date | null = null;
    let rangeEnd: Date | null = null;
    if (timeframe !== 'All Time') {
      switch (timeframe) {
        case 'This Week': {
          const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1));
          rangeStart = d;
          rangeEnd = new Date(d);
          rangeEnd.setDate(rangeEnd.getDate() + 7);
          break;
        }
        case 'This Month':
          rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
          rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          break;
        case 'Last Month':
          rangeStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          rangeEnd = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'This Quarter': {
          const qm = Math.floor(now.getMonth() / 3) * 3;
          rangeStart = new Date(now.getFullYear(), qm, 1);
          rangeEnd = new Date(now.getFullYear(), qm + 3, 1);
          break;
        }
        case 'This Year':
          rangeStart = new Date(now.getFullYear(), 0, 1);
          rangeEnd = new Date(now.getFullYear() + 1, 0, 1);
          break;
        case '2025':
          rangeStart = new Date(2025, 0, 1); rangeEnd = new Date(2026, 0, 1); break;
        case '2024':
          rangeStart = new Date(2024, 0, 1); rangeEnd = new Date(2025, 0, 1); break;
        case 'Custom':
          if (customStartDate) rangeStart = new Date(customStartDate);
          if (customEndDate) { const e = new Date(customEndDate); e.setDate(e.getDate() + 1); rangeEnd = e; }
          break;
      }
    }

    const inRange = (dateParam: string | number | undefined | null): boolean => {
      if (!dateParam) return false;
      const d = new Date(dateParam);
      if (rangeStart && d < rangeStart) return false;
      if (rangeEnd && d >= rangeEnd) return false;
      return true;
    };

    const prodMap = new Map<number, AgentProductionData>();
    users.forEach(user => {
      if (user.status === 'Active' && (user.role === 'Owner' || user.role === 'Agent')) {
        const emailLower = user.email?.toLowerCase();
        const fallbackPic = user.picture?.["162x162"] || user.picture?.["60x60"] || user.picture?.original;
        const caps = agentCaps[user.id];
        prodMap.set(user.id, {
          agentName: user.name,
          newLeads: 0,
          writtenDeals: 0,
          closedDeals: 0,
          volume: 0,
          avatarUrl: (emailLower && directoryPhotos[emailLower]) || fallbackPic,
          capAmount: caps?.capAmount,
          officeContribution: caps?.officeContribution,
          fubUserId: user.id
        });
      }
    });

    // New leads: filtered by createdAt (when the lead came in)
    filteredPeople.forEach(person => {
      const agentId = person.assignedUserId;
      if (agentId && prodMap.has(agentId)) {
        prodMap.get(agentId)!.newLeads += 1;
      }
    });

    const activeListings: UnifiedDeal[] = [];
    const activeListingsTotal: UnifiedDeal[] = [];
    const underContract: UnifiedDeal[] = [];
    const underContractTotal: UnifiedDeal[] = [];
    const cancelled: UnifiedDeal[] = [];
    const cancelledTotalYTD: UnifiedDeal[] = [];
    const closed: UnifiedDeal[] = [];
    const closedTotalYTD: UnifiedDeal[] = [];
    const filteredTransactions: UnifiedDeal[] = [];

    const btIdToNameMap = new Map<number, string>();
    const btIdToEmailMap = new Map<number, string>();
    btUsers.forEach(u => {
      btIdToNameMap.set(u.id, u.name);
      btIdToNameMap.set(u.user_id, u.name);
      if (u.email) {
        btIdToEmailMap.set(u.id, u.email.toLowerCase());
        btIdToEmailMap.set(u.user_id, u.email.toLowerCase());
      }
    });

    const nameToFubUserId = new Map<string, number>();
    const emailToFubUserId = new Map<string, number>();
    users.forEach(u => {
      nameToFubUserId.set(u.name.toLowerCase(), u.id);
      if (u.email) emailToFubUserId.set(u.email.toLowerCase(), u.id);
    });


    const transactionsToIterateForKPIs = (ownedTransactions !== null && authFubUserId) ? ownedTransactions : transactions;

    transactionsToIterateForKPIs.forEach(tx => {
      // Is this deal belonging to the logged in agent?
      let belongsToAgent = false;
      if (!authFubUserId) {
        belongsToAgent = true; // Admin sees all
      } else if (ownedTransactions !== null) {
        belongsToAgent = true; // Entire list belongs to the agent
      } else {
        let _btAgentIds = txParticipants[tx.id];
        if (!_btAgentIds || _btAgentIds.length === 0) {
          _btAgentIds = [];
          if (tx.buying_side_representer?.id) _btAgentIds.push(tx.buying_side_representer.id);
          if (tx.listing_side_representer?.id) _btAgentIds.push(tx.listing_side_representer.id);
        }
        for (const btAgentId of _btAgentIds) {
          const agentEmail = btIdToEmailMap.get(btAgentId);
          const agentName = btIdToNameMap.get(btAgentId);
          if (agentEmail && emailToFubUserId.get(agentEmail) === authFubUserId) { belongsToAgent = true; break; }
          if (agentName && nameToFubUserId.get(agentName.toLowerCase()) === authFubUserId) { belongsToAgent = true; break; }
        }
      }

      // Add to overall user-visible transactions
      if (belongsToAgent) {
        filteredTransactions.push(tx);
      }

      // 1. Active Listings (from BoldTrail representing seller/both)
      if (belongsToAgent && tx.status === 'listing' && (tx.representing === 'seller' || tx.representing === 'both')) {
        activeListingsTotal.push(tx);
        const listDateStr = tx.listing_date || tx.created_at || tx.updated_at;
        if (timeframe === 'All Time' || inRange(listDateStr)) {
          activeListings.push(tx);
        }
      }

      const contractDateStr = tx.acceptance_date || tx.created_at;
      const isWritten = timeframe === 'All Time' || inRange(contractDateStr);

      const allowedWrittenStatuses = ['pending', 'closed', 'cancelled'];
      const isValidWrittenStatus = allowedWrittenStatuses.includes(tx.status);

      const closeDateStr = tx.closing_date;
      const isClosedState = tx.status === 'closed';
      const isClosed = isClosedState && (timeframe === 'All Time' || inRange(closeDateStr));

      if (belongsToAgent && tx.status === 'pending') {
        underContractTotal.push(tx);
      }

      if (isWritten && isValidWrittenStatus) {
        if (belongsToAgent) underContract.push(tx);
      }

      if (tx.status === 'cancelled' && belongsToAgent) {
        const cancelDateStr = tx.acceptance_date || tx.created_at;
        if (timeframe === 'All Time' || inRange(cancelDateStr)) {
          cancelled.push(tx);
        }
        if (cancelDateStr) {
          const d = new Date(cancelDateStr);
          if (d.getFullYear() === now.getFullYear()) {
            cancelledTotalYTD.push(tx);
          }
        }
      }

      if (isClosed) {
        if (belongsToAgent) closed.push(tx);
      }
      if (isClosedState && belongsToAgent && closeDateStr) {
        const d = new Date(closeDateStr);
        if (d.getFullYear() === now.getFullYear()) {
          closedTotalYTD.push(tx);
        }
      }
    });

    transactions.forEach(tx => {
      const contractDateStr = tx.acceptance_date || tx.created_at;
      const isWritten = timeframe === 'All Time' || inRange(contractDateStr);

      const allowedWrittenStatuses = ['pending', 'closed', 'cancelled'];
      const isValidWrittenStatus = allowedWrittenStatuses.includes(tx.status);

      const closeDateStr = tx.closing_date;
      const isClosedState = tx.status === 'closed';
      const isClosed = isClosedState && (timeframe === 'All Time' || inRange(closeDateStr));

      // Map agent production
      let btAgentIds = txParticipants[tx.id];
      if (!btAgentIds || btAgentIds.length === 0) {
        btAgentIds = [];
        if (tx.buying_side_representer?.id) btAgentIds.push(tx.buying_side_representer.id);
        if (tx.listing_side_representer?.id) btAgentIds.push(tx.listing_side_representer.id);
      }

      const uniqueBtAgentIds = Array.from(new Set(btAgentIds));

      for (const btAgentId of uniqueBtAgentIds) {
        const agentName = btIdToNameMap.get(btAgentId);
        const agentEmail = btIdToEmailMap.get(btAgentId);

        if (agentName || agentEmail) {
          let fubId: number | undefined;
          if (agentEmail && emailToFubUserId.has(agentEmail)) {
            fubId = emailToFubUserId.get(agentEmail);
          } else if (agentName && nameToFubUserId.has(agentName.toLowerCase())) {
            fubId = nameToFubUserId.get(agentName.toLowerCase());
          }

          if (fubId) {
            const fubUser = users.find(u => u.id === fubId);
            if (fubUser) {
              const isOwner = fubUser.role === 'Owner';
              if (!tx.assigned_agent_name || ((tx as any)._temp_assigned_is_owner && !isOwner)) {
                const emailLower = fubUser.email?.toLowerCase();
                const fallbackPic = fubUser.picture?.["162x162"] || fubUser.picture?.["60x60"] || fubUser.picture?.original;
                tx.assigned_agent_name = agentName;
                tx.assigned_agent_avatar = (emailLower && directoryPhotos[emailLower]) || fallbackPic;
                (tx as any)._temp_assigned_is_owner = isOwner;
              }
            }
          }

          if (fubId && prodMap.has(fubId)) {
            const prod = prodMap.get(fubId)!;
            if (isWritten && isValidWrittenStatus) prod.writtenDeals += 1;
            if (isClosed) {
              const comms = txCommissions[tx.id];
              prod.closedDeals += 1;
              prod.volume += (tx.price || 0) / btAgentIds.length;
              prod.officeContributionTimeframe = (prod.officeContributionTimeframe || 0) + (comms ? comms.officeNet / btAgentIds.length : 0);
            }
          }
        }
      }
    });

    // Enforce exact match for "This Year" timeframe to align calendar YTD strictly with Cap YTD visually per business requirement
    if (timeframe === 'This Year') {
      for (const prod of prodMap.values()) {
        prod.officeContributionTimeframe = prod.officeContribution || 0;
      }
    }

    return {
      filteredTransactions,
      productionTableData: Array.from(prodMap.values()),
      dashboardKpis: { activeListings, activeListingsTotal, underContract, underContractTotal, cancelled, cancelledTotalYTD, closed, closedTotalYTD }
    };
  }, [filteredPeople, deals, transactions, btUsers, users, timeframe, customStartDate, customEndDate, txParticipants, txCommissions, authUser, isAdmin, directoryPhotos, agentCaps]);

  // Format data for the TopProducers component
  const topProducersData = useMemo(() => {
    return [...productionTableData]
      .sort((a, b) => (b.closedDeals + b.writtenDeals) - (a.closedDeals + a.writtenDeals))
      .slice(0, 10)
      .map(a => {
        const user = users.find(u => u.name === a.agentName);
        const emailLower = user?.email?.toLowerCase();
        const fallbackPic = user?.picture?.["162x162"] || user?.picture?.["60x60"] || user?.picture?.original;

        return {
          name: a.agentName,
          closed: a.closedDeals,
          written: a.writtenDeals,
          avatarUrl: (emailLower && directoryPhotos[emailLower]) || fallbackPic
        };
      });
  }, [productionTableData, users, directoryPhotos]);

  // --- Per-agent deal maps for drill-down navigation ---
  const agentDealMap = useMemo(() => {
    const map = new Map<string, UnifiedDeal[]>();
    users.forEach(user => {
      if (user.status === 'Active' && (user.role === 'Owner' || user.role === 'Agent')) {
        map.set(user.name, []);
      }
    });

    // 1. Prepare User Map
    const btIdToNameMap = new Map<number, string>();
    btUsers.forEach(u => {
      btIdToNameMap.set(u.id, u.name);
      btIdToNameMap.set(u.user_id, u.name);
    });

    // 2. BoldTrail Active Listings
    transactions.forEach(tx => {
      if (tx.status === 'listing' && (tx.representing === 'seller' || tx.representing === 'both')) {
        const btAgentIds = txParticipants[tx.id] || [];
        for (const btAgentId of btAgentIds) {
          const agentName = btIdToNameMap.get(btAgentId);
          if (agentName && map.has(agentName)) {
            map.get(agentName)!.push(tx);
          }
        }
      }
    });

    // 3. BoldTrail Transactions (Pending, Closed, Cancelled)
    transactions.forEach(tx => {
      if (tx.status === 'listing') return; // Handled above for Active Listings
      const btAgentIds = txParticipants[tx.id] || [];
      for (const btAgentId of btAgentIds) {
        const agentName = btIdToNameMap.get(btAgentId);
        if (agentName && map.has(agentName)) {
          map.get(agentName)!.push(tx);
        }
      }
    });

    return map;
  }, [deals, transactions, btUsers, users, txParticipants]);


  const handleAgentClick = (agentName: string) => {
    if (!isAdmin) {
      const authEmail = authUser?.email?.toLowerCase();
      const clickedUser = users.find(u => u.name === agentName);
      if (!authEmail || !clickedUser || clickedUser.email?.toLowerCase() !== authEmail) {
        return; // Agents cannot click on other agents' profiles
      }
    }

    const allAgentDeals = agentDealMap.get(agentName) || [];
    const fubUser = users.find(u => u.name === agentName);
    const agentAvatar = (fubUser?.email && directoryPhotos[fubUser.email.toLowerCase()]) || fubUser?.picture?.["162x162"] || fubUser?.picture?.["60x60"] || fubUser?.picture?.original;
    const caps = fubUser ? agentCaps[fubUser.id] : undefined;

    navigate(`/agent/${encodeURIComponent(agentName)}`, {
      state: {
        agentName,
        agentAvatar,
        capAmount: caps?.capAmount,
        officeContribution: caps?.officeContribution,
        anniversaryTs: caps?.anniversaryTs,
        allDeals: allAgentDeals,
        initialTimeframe: timeframe,
        initialCustomStart: customStartDate,
        initialCustomEnd: customEndDate,
      }
    });
  };

  const handleKpiClick = (title: string, kpiDeals: UnifiedDeal[]) => {
    navigate(`/kpi-deals`, {
      state: {
        title,
        deals: kpiDeals,
        allTransactions: filteredTransactions,
        initialTimeframe: timeframe,
        initialCustomStart: customStartDate,
        initialCustomEnd: customEndDate
      }
    });
  };

  // --- Rendering ---
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1322] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4"></div>
          <p className="text-slate-400">Syncing with CRM...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f1322] flex items-center justify-center p-6">
        <div className="glass-card p-8 max-w-md w-full border-red-500/30 text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="text-red-400" size={32} />
          </div>
          <p className="text-slate-400 mb-6">{error}</p>
        </div>
      </div>
    );
  }

  const headerFilterUI = (
    <TimeframeSelector
      timeframe={timeframe}
      setTimeframe={setTimeframe}
      customStartDate={customStartDate}
      setCustomStartDate={setCustomStartDate}
      customEndDate={customEndDate}
      setCustomEndDate={setCustomEndDate}
      isDropdownOpen={isDropdownOpen}
      setIsDropdownOpen={setIsDropdownOpen}
    />
  );

  return (
    <DashboardLayout headerActions={headerFilterUI}>
      {/* TOP ROW: KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full animate-in fade-in duration-500 mb-6">
        <div
          onClick={() => handleKpiClick("Active Listings", dashboardKpis.activeListings)}
          className="glass-card p-6 flex flex-col justify-between bg-[#1c2336] border border-white/5 h-[160px] cursor-pointer hover:bg-white/5 transition-colors group"
        >
          <div className="flex w-full items-center justify-between">
            <h3 className="text-slate-200 font-bold text-lg group-hover:text-white transition-colors">Active Listings</h3>
          </div>
          <div className="flex-1 flex items-end justify-between w-full pt-4">
            <div className="flex flex-col items-start gap-1">
              <span className="text-4xl font-bold text-white tracking-tight leading-none">{dashboardKpis.activeListings.length}</span>
              <span className="text-slate-400 text-xs">Total in time frame.</span>
            </div>
            <div className="flex flex-col items-end gap-1 pb-1">
              <span className="text-2xl font-bold text-white/50 tracking-tight leading-none">{dashboardKpis.activeListingsTotal.length}</span>
              <span className="text-slate-500 text-[10px] uppercase font-semibold tracking-wider">Total current listings</span>
            </div>
          </div>
        </div>
        <div
          onClick={() => handleKpiClick("Under Contract", dashboardKpis.underContract)}
          className="glass-card p-6 flex flex-col justify-between bg-[#1c2336] border border-white/5 h-[160px] cursor-pointer hover:bg-white/5 transition-colors group"
        >
          <div className="flex w-full items-center justify-between">
            <h3 className="text-slate-200 font-bold text-lg group-hover:text-white transition-colors">Under Contract</h3>
          </div>
          <div className="flex-1 flex items-end justify-between w-full pt-4">
            <div className="flex flex-col items-start gap-1">
              <span className="text-4xl font-bold text-brand-green tracking-tight leading-none">{dashboardKpis.underContract.length}</span>
              <span className="text-slate-400 text-xs">Total in time frame.</span>
            </div>
            <div className="flex flex-col items-end gap-1 pb-1">
              <span className="text-2xl font-bold text-brand-green/50 tracking-tight leading-none">{dashboardKpis.underContractTotal.length}</span>
              <span className="text-slate-500 text-[10px] uppercase font-semibold tracking-wider">Total current U/C</span>
            </div>
          </div>
        </div>
        <div
          onClick={() => handleKpiClick("Cancelled Deals", dashboardKpis.cancelled)}
          className="glass-card p-6 flex flex-col justify-between bg-[#1c2336] border border-white/5 h-[160px] cursor-pointer hover:bg-white/5 transition-colors group"
        >
          <div className="flex w-full items-center justify-between">
            <h3 className="text-slate-200 font-bold text-lg group-hover:text-white transition-colors">Cancelled</h3>
          </div>
          <div className="flex-1 flex items-end justify-between w-full pt-4">
            <div className="flex flex-col items-start gap-1">
              <span className="text-4xl font-bold text-red-400 tracking-tight leading-none">{dashboardKpis.cancelled.length}</span>
              <span className="text-slate-400 text-xs">Fell through in timeframe.</span>
            </div>
            <div className="flex flex-col items-end gap-1 pb-1">
              <span className="text-2xl font-bold text-red-400/50 tracking-tight leading-none">{dashboardKpis.cancelledTotalYTD.length}</span>
              <span className="text-slate-500 text-[10px] uppercase font-semibold tracking-wider">Total cancelled YTD</span>
            </div>
          </div>
        </div>
        <div
          onClick={() => handleKpiClick("Closed Deals", dashboardKpis.closed)}
          className="glass-card p-6 flex flex-col justify-between bg-[#1c2336] border border-white/5 h-[160px] cursor-pointer hover:bg-white/5 transition-colors group"
        >
          <div className="flex w-full items-center justify-between">
            <h3 className="text-slate-200 font-bold text-lg group-hover:text-white transition-colors">Closed</h3>
          </div>
          <div className="flex-1 flex items-end justify-between w-full pt-4">
            <div className="flex flex-col items-start gap-1">
              <span className="text-4xl font-bold text-green-400 tracking-tight leading-none">{dashboardKpis.closed.length}</span>
              <span className="text-slate-400 text-xs">Closed in timeframe.</span>
            </div>
            <div className="flex flex-col items-end gap-1 pb-1">
              <span className="text-2xl font-bold text-green-400/50 tracking-tight leading-none">{dashboardKpis.closedTotalYTD.length}</span>
              <span className="text-slate-500 text-[10px] uppercase font-semibold tracking-wider">Total closed YTD</span>
            </div>
          </div>
        </div>
      </div>

      {authUser?.email === 'ali@questsold.com' && <CashFlowPredictor transactions={transactions} />}

      {/* AGENT CAP PROGRESS: Display only for non-admins if they have valid cap data */}
      {(!isAdmin && authUser?.email) && (() => {
        const currentFubUser = users.find(u => u.email?.toLowerCase() === authUser.email?.toLowerCase());
        if (currentFubUser && agentCaps[currentFubUser.id] && agentCaps[currentFubUser.id].capAmount !== undefined) {
          const caps = agentCaps[currentFubUser.id];
          const annivDateStr = new Date(caps.anniversaryTs).toLocaleDateString();
          return (
            <div className="w-full animate-in fade-in duration-500 delay-100 mb-6">
              <div className="glass-card p-6 border border-white/5 rounded-2xl relative overflow-hidden bg-[#1c2336]/60 backdrop-blur-xl shrink-0 h-[140px] flex flex-col justify-center shadow-lg">
                <div className="absolute inset-0 w-[500px] h-[500px] bg-gradient-to-tr from-brand-green/20 to-transparent opacity-20 blur-3xl rounded-full top-[-250px] right-[-150px]"></div>
                <div className="absolute inset-0 top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3 relative z-10 w-full pl-2 pr-2">
                  <div>
                    <h3 className="text-slate-200 font-bold mb-0.5 flex items-center gap-2 text-lg">
                      Office Cap Progress
                    </h3>
                    <p className="text-slate-400 text-xs shadow-sm">Contributions since last anniversary rollover ({annivDateStr})</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider backdrop-blur-sm bg-black/30 px-3 py-1 rounded-full border border-white/5 shadow-sm">
                      YTD Agent Net: <span className="text-green-400 ml-1.5 font-bold text-xs">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(caps.agentNet || 0)}</span>
                    </div>
                    <div className="flex items-center gap-2 font-semibold">
                      {caps.officeContribution >= caps.capAmount && (
                        <div className="bg-green-500/20 text-green-400 text-[10px] px-2 py-1 rounded flex items-center font-bold mr-1 border border-green-500/20 uppercase tracking-widest shadow-sm">
                          Cap Met
                        </div>
                      )}
                      <span className={caps.officeContribution >= caps.capAmount ? "text-green-400 text-2xl" : "text-blue-400 text-2xl"}>
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Math.min(caps.officeContribution, caps.capAmount))}
                      </span>
                      <span className="text-slate-500 text-lg">
                        / {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(caps.capAmount)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="w-full bg-[#0a0f1c] rounded-full h-3 overflow-hidden shadow-inner relative border border-white/5 z-10 mt-1">
                  <div className={`h-full rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-2 text-[10px] text-white/50 relative overflow-hidden ${caps.officeContribution >= caps.capAmount
                    ? 'bg-gradient-to-r from-green-600/50 to-green-400 border border-green-400/50 shadow-[0_0_15px_rgba(74,222,128,0.4)]'
                    : 'bg-gradient-to-r from-blue-700/50 to-blue-500 border border-blue-400/50 shadow-[0_0_15px_rgba(96,165,250,0.4)]'
                    }`}
                    style={{ width: `${Math.max(1, Math.min(100, (caps.officeContribution / caps.capAmount) * 100))}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-[200%] animate-[shimmer_2s_infinite]"></div>
                  </div>
                </div>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* MIDDLE ROW: Leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full animate-in fade-in duration-500 delay-100">
        <div className="flex flex-col min-w-0">
          <AgentTable data={agentTableData.slice(0, 10)} onAgentClick={handleAgentClick} />
        </div>
        <div className="flex flex-col min-w-0">
          <TopProducers producers={topProducersData} title="Top Converters 🏆" onAgentClick={handleAgentClick} />
        </div>
      </div>

      {/* BOTTOM SECTION (Full Width: Agent Production) */}
      <div className="w-full mt-6 animate-in fade-in duration-500 delay-200">
        <AgentProductionTable
          data={isAdmin ? productionTableData : (() => {
            const currentFubUser = users.find(u => u.email?.toLowerCase() === authUser?.email?.toLowerCase());
            return currentFubUser ? productionTableData.filter(d => d.fubUserId === currentFubUser.id) : [];
          })()}
          onAgentClick={handleAgentClick}
        />
      </div>

    </DashboardLayout>
  );
}

export default App;
