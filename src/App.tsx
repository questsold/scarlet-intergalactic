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
  const [btUsers, setBtUsers] = useState<BoldTrailUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('This Month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [directoryPhotos, setDirectoryPhotos] = useState<Record<string, string>>({});
  const [agentCaps, setAgentCaps] = useState<Record<number, { capAmount: number, officeContribution: number }>>({});
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
        setUsers(usersResponse.users || []);
        setDeals(dealsResponse.deals || []);
        setTransactions(btTransactionsRes || []);
        setBtUsers(btUsersRes || []);

        const photos: Record<string, string> = {};
        dbUsersSnap.forEach(d => {
          const data = d.data();
          if (data.photoUrl && data.email) {
            photos[data.email.toLowerCase()] = data.photoUrl;
          }
        });
        setDirectoryPhotos(photos);

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

  const LOCAL_STORAGE_KEY = 'bt_tx_parts_v1';
  const [txParticipants] = useState<Record<number, number[]>>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) return JSON.parse(cached);
    } catch (e) { }
    return {};
  });

  // --- Cap Calculation ---
  useEffect(() => {
    const calculateCaps = async () => {
      if (users.length === 0 || btUsers.length === 0 || transactions.length === 0) return;

      const activeEmails = new Set(
        users.filter(u => u.status === 'Active' && (u.role === 'Owner' || u.role === 'Agent'))
          .map(u => u.email?.toLowerCase())
          .filter(Boolean)
      );

      const targetBtIds = btUsers
        .filter(bu => bu.email && activeEmails.has(bu.email.toLowerCase()))
        .map(bu => bu.id);

      if (targetBtIds.length === 0) return;

      const btProfiles = await boldtrailApi.getUserDetails(targetBtIds);

      const fubToCapInfo: Record<number, { btId: number, capAmount: number, anniversaryTs: number }> = {};
      const emailToFubId = new Map<string, number>();
      users.forEach(u => { if (u.email) emailToFubId.set(u.email.toLowerCase(), u.id); });

      const btIdToEmail = new Map<number, string>();
      btUsers.forEach(bu => { if (bu.email) btIdToEmail.set(bu.id, bu.email.toLowerCase()); });

      for (const [btIdStr, profile] of Object.entries(btProfiles)) {
        if (!profile) continue;
        const btId = Number(btIdStr);
        const email = btIdToEmail.get(btId);
        if (!email) continue;

        const fubId = emailToFubId.get(email);
        if (!fubId) continue;

        let anniversaryTs = 0;
        if (profile.anniversary_date) {
          const annivDate = new Date(profile.anniversary_date);
          const now = new Date();
          let currentYearAnniv = new Date(now.getFullYear(), annivDate.getMonth(), annivDate.getDate());
          if (currentYearAnniv > now) {
            currentYearAnniv = new Date(now.getFullYear() - 1, annivDate.getMonth(), annivDate.getDate());
          }
          anniversaryTs = currentYearAnniv.getTime();
        }

        fubToCapInfo[fubId] = {
          btId,
          capAmount: profile.goal_amount ? Number(profile.goal_amount) : 12000,
          anniversaryTs
        };
      }

      const txToFubIds: Record<number, number[]> = {};
      const txIdsToFetchCommissions: number[] = [];

      transactions.forEach(tx => {
        if (tx.status !== 'closed') return;
        const closeTime = tx.closing_date || tx.closed_at || tx.created_at;
        if (!closeTime) return;

        let transactionIncluded = false;

        Object.entries(fubToCapInfo).forEach(([fubIdStr, info]) => {
          const fubId = Number(fubIdStr);
          if (closeTime >= info.anniversaryTs) {
            let isParticipant = false;
            const btPartIds = txParticipants[tx.id] || [];
            if (btPartIds.includes(info.btId)) isParticipant = true;
            if (tx.buying_side_representer?.id === info.btId) isParticipant = true;
            if (tx.listing_side_representer?.id === info.btId) isParticipant = true;

            if (isParticipant) {
              transactionIncluded = true;
              if (!txToFubIds[tx.id]) txToFubIds[tx.id] = [];
              if (!txToFubIds[tx.id].includes(fubId)) txToFubIds[tx.id].push(fubId);
            }
          }
        });

        if (transactionIncluded) {
          txIdsToFetchCommissions.push(tx.id);
        }
      });

      const commissionsMap = await boldtrailApi.getTransactionCommissions(txIdsToFetchCommissions);
      const finalCaps: Record<number, { capAmount: number, officeContribution: number }> = {};

      Object.keys(fubToCapInfo).forEach(fubId => {
        finalCaps[Number(fubId)] = {
          capAmount: fubToCapInfo[Number(fubId)].capAmount,
          officeContribution: 0
        };
      });

      Object.entries(commissionsMap).forEach(([txIdStr, commInfo]) => {
        const txId = Number(txIdStr);
        const fubs = txToFubIds[txId];
        if (fubs && fubs.length > 0) {
          const officeNet = (commInfo as any).officeNet || 0;
          const share = officeNet / fubs.length;
          fubs.forEach(fubId => {
            finalCaps[fubId].officeContribution += share;
          });
        }
      });

      setAgentCaps(finalCaps);
    };

    // Delay calculations so it doesn't block critical screen paints
    setTimeout(() => { calculateCaps(); }, 1500);
  }, [users, btUsers, transactions, txParticipants]);

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
  const { productionTableData, dashboardKpis } = useMemo(() => {
    if (users.length === 0 || isAdmin === null) return { productionTableData: [], dashboardKpis: { activeListings: [], underContract: [], cancelled: [], closed: [] } };

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
          officeContribution: caps?.officeContribution
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
    const underContract: UnifiedDeal[] = [];
    const cancelled: UnifiedDeal[] = [];
    const closed: UnifiedDeal[] = [];

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

    transactions.forEach(tx => {
      // Is this deal belonging to the logged in agent?
      let belongsToAgent = false;
      let _btAgentIds = txParticipants[tx.id];
      if (!_btAgentIds || _btAgentIds.length === 0) {
        _btAgentIds = [];
        if (tx.buying_side_representer?.id) _btAgentIds.push(tx.buying_side_representer.id);
        if (tx.listing_side_representer?.id) _btAgentIds.push(tx.listing_side_representer.id);
      }

      if (!authFubUserId) {
        belongsToAgent = true; // Admin sees all
      } else {
        for (const btAgentId of _btAgentIds) {
          const agentEmail = btIdToEmailMap.get(btAgentId);
          const agentName = btIdToNameMap.get(btAgentId);
          if (agentEmail && emailToFubUserId.get(agentEmail) === authFubUserId) { belongsToAgent = true; break; }
          if (agentName && nameToFubUserId.get(agentName.toLowerCase()) === authFubUserId) { belongsToAgent = true; break; }
        }
      }

      // 1. Active Listings (from BoldTrail representing seller/both)
      if (belongsToAgent && tx.status === 'listing' && (tx.representing === 'seller' || tx.representing === 'both')) {
        activeListings.push(tx);
      }

      const contractDateStr = tx.acceptance_date || tx.created_at;
      const isWritten = timeframe === 'All Time' || inRange(contractDateStr);

      const allowedWrittenStatuses = ['pending', 'closed', 'cancelled'];
      const isValidWrittenStatus = allowedWrittenStatuses.includes(tx.status);

      const closeDateStr = tx.closing_date;
      const isClosedState = tx.status === 'closed';
      const isClosed = isClosedState && (timeframe === 'All Time' || inRange(closeDateStr));

      if (isWritten && isValidWrittenStatus) {
        if (belongsToAgent) underContract.push(tx);
      }

      if (tx.status === 'cancelled') {
        const cancelDateStr = tx.acceptance_date || tx.created_at;
        if (timeframe === 'All Time' || inRange(cancelDateStr)) {
          if (belongsToAgent) cancelled.push(tx);
        }
      }

      if (isClosed) {
        if (belongsToAgent) closed.push(tx);
      }

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
              prod.closedDeals += 1;
              prod.volume += (tx.price || 0) / btAgentIds.length;
            }
          }
        }
      }
    });

    return {
      productionTableData: Array.from(prodMap.values()),
      dashboardKpis: { activeListings, underContract, cancelled, closed }
    };
  }, [filteredPeople, deals, transactions, btUsers, users, timeframe, customStartDate, customEndDate, txParticipants, authUser, isAdmin, directoryPhotos, agentCaps]);

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
        allTransactions: transactions,
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
          className="glass-card p-6 flex flex-col items-center justify-center bg-[#1c2336] border border-white/5 h-[160px] cursor-pointer hover:bg-white/5 transition-colors group"
        >
          <h3 className="text-slate-200 font-bold text-lg w-full text-left group-hover:text-white transition-colors">Active Listings</h3>
          <p className="text-slate-400 text-sm flex items-center gap-2 w-full text-left mt-1">Total current listings</p>
          <div className="flex-1 flex items-center justify-start w-full pt-4">
            <span className="text-5xl font-bold text-white tracking-tight">{dashboardKpis.activeListings.length}</span>
          </div>
        </div>
        <div
          onClick={() => handleKpiClick("Under Contract", dashboardKpis.underContract)}
          className="glass-card p-6 flex flex-col items-center justify-center bg-[#1c2336] border border-white/5 h-[160px] cursor-pointer hover:bg-white/5 transition-colors group"
        >
          <h3 className="text-slate-200 font-bold text-lg w-full text-left group-hover:text-white transition-colors">Under Contract</h3>
          <p className="text-slate-400 text-sm flex items-center gap-2 w-full text-left mt-1">Total in timeframe</p>
          <div className="flex-1 flex items-center justify-start w-full pt-4">
            <span className="text-5xl font-bold text-brand-green tracking-tight">{dashboardKpis.underContract.length}</span>
          </div>
        </div>
        <div
          onClick={() => handleKpiClick("Cancelled Deals", dashboardKpis.cancelled)}
          className="glass-card p-6 flex flex-col items-center justify-center bg-[#1c2336] border border-white/5 h-[160px] cursor-pointer hover:bg-white/5 transition-colors group"
        >
          <h3 className="text-slate-200 font-bold text-lg w-full text-left group-hover:text-white transition-colors">Cancelled</h3>
          <p className="text-slate-400 text-sm flex items-center gap-2 w-full text-left mt-1">Fell through in timeframe</p>
          <div className="flex-1 flex items-center justify-start w-full pt-4">
            <span className="text-5xl font-bold text-red-400 tracking-tight">{dashboardKpis.cancelled.length}</span>
          </div>
        </div>
        <div
          onClick={() => handleKpiClick("Closed Deals", dashboardKpis.closed)}
          className="glass-card p-6 flex flex-col items-center justify-center bg-[#1c2336] border border-white/5 h-[160px] cursor-pointer hover:bg-white/5 transition-colors group"
        >
          <h3 className="text-slate-200 font-bold text-lg w-full text-left group-hover:text-white transition-colors">Closed</h3>
          <p className="text-slate-400 text-sm flex items-center gap-2 w-full text-left mt-1">Closed in timeframe</p>
          <div className="flex-1 flex items-center justify-start w-full pt-4">
            <span className="text-5xl font-bold text-green-400 tracking-tight">{dashboardKpis.closed.length}</span>
          </div>
        </div>
      </div>

      {authUser?.email === 'ali@questsold.com' && <CashFlowPredictor transactions={transactions} />}

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
      {isAdmin && (
        <div className="w-full mt-6 animate-in fade-in duration-500 delay-200">
          <AgentProductionTable data={productionTableData} onAgentClick={handleAgentClick} />
        </div>
      )}

    </DashboardLayout>
  );
}

export default App;
