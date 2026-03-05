import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import DashboardLayout from './components/DashboardLayout';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from './services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import AgentTable from './components/AgentTable';
import TopProducers from './components/TopProducers';
import { fetchAllPeople, fetchUsers } from './services/fubApi';
import type { FubPerson, FubUser } from './types/fub';
import { boldtrailApi } from './services/boldtrailApi';
import type { BoldTrailTransaction, BoldTrailUser } from './types/boldtrail';
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
  const [transactions, setTransactions] = useState<BoldTrailTransaction[]>([]);
  const [btUsers, setBtUsers] = useState<BoldTrailUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('This Month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, [authUser]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [peopleResponse, usersResponse, btTransactionsRes, btUsersRes] = await Promise.all([
          fetchAllPeople(),
          fetchUsers(),
          boldtrailApi.getTransactions(),
          boldtrailApi.getUsers()
        ]);
        setPeople(peopleResponse.people || []);
        setUsers(usersResponse.users || []);
        setTransactions(btTransactionsRes || []);
        setBtUsers(btUsersRes || []);
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

  // --- Data Processing ---
  const filteredPeople = useMemo(() => filterByTimeframe(people, timeframe, customStartDate, customEndDate), [people, timeframe, customStartDate, customEndDate]);

  const LOCAL_STORAGE_KEY = 'bt_tx_parts_v1';
  const [txParticipants, setTxParticipants] = useState<Record<number, number[]>>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) return JSON.parse(cached);
    } catch (e) { }
    return {};
  });

  useEffect(() => {
    if (transactions.length === 0) return;

    const needsParticipantIds = transactions.map(tx => tx.id).filter(id => !txParticipants[id]);

    if (needsParticipantIds.length > 0) {
      boldtrailApi.getTransactionParticipants(needsParticipantIds).then(res => {
        setTxParticipants(prev => {
          const next = { ...prev };
          let changed = false;
          for (const [txIdStr, pUsers] of Object.entries(res)) {
            if ((pUsers as any).error === 429) continue;
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
      });
    }
  }, [transactions, txParticipants]);


  const agentTableData = useMemo(() => {
    if (users.length === 0) return [];

    const agentMap = new Map<number, { name: string, total: number, converted: number, avatarUrl?: string }>();
    users.forEach(user => {
      if (user.status === 'Active' && (user.role === 'Owner' || user.role === 'Agent')) {
        agentMap.set(user.id, {
          name: user.name,
          total: 0,
          converted: 0,
          avatarUrl: user.picture?.["162x162"] || user.picture?.["60x60"] || user.picture?.original
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

  const { productionTableData, dashboardKpis } = useMemo(() => {
    if (users.length === 0 || isAdmin === null) return { productionTableData: [], dashboardKpis: { activeListings: [], underContract: [], cancelled: [], closed: [] } };

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

      const dateNum = typeof dateParam === 'number' ?
        (dateParam > 9999999999 ? dateParam : dateParam * 1000) :
        dateParam;

      const d = new Date(dateNum);
      if (rangeStart && d < rangeStart) return false;
      if (rangeEnd && d >= rangeEnd) return false;
      return true;
    };

    const prodMap = new Map<number, AgentProductionData>();
    users.forEach(user => {
      if (user.status === 'Active' && (user.role === 'Owner' || user.role === 'Agent')) {
        prodMap.set(user.id, {
          agentName: user.name,
          newLeads: 0,
          writtenDeals: 0,
          closedDeals: 0,
          volume: 0
        });
      }
    });

    filteredPeople.forEach(person => {
      const agentId = person.assignedUserId;
      if (agentId && prodMap.has(agentId)) {
        prodMap.get(agentId)!.newLeads += 1;
      }
    });

    const activeListings: BoldTrailTransaction[] = [];
    const underContract: BoldTrailTransaction[] = [];
    const cancelled: BoldTrailTransaction[] = [];
    const closed: BoldTrailTransaction[] = [];

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

    let authFubUserId: number | null = null;
    if (!isAdmin && authUser && authUser.email) {
      const authEmail = authUser.email.toLowerCase();
      const me = users.find(u => u.email && u.email.toLowerCase() === authEmail);
      if (me) authFubUserId = me.id;
    }

    transactions.forEach(tx => {
      const btAgentIds = txParticipants[tx.id] || [];
      let belongsToAgent = !authFubUserId;
      if (authFubUserId) {
        for (const btAgentId of btAgentIds) {
          const email = btIdToEmailMap.get(btAgentId);
          const name = btIdToNameMap.get(btAgentId);
          if (email && emailToFubUserId.get(email) === authFubUserId) { belongsToAgent = true; break; }
          if (name && nameToFubUserId.get(name.toLowerCase()) === authFubUserId) { belongsToAgent = true; break; }
        }
      }

      if (!belongsToAgent) return;

      const listingDate = tx.listing_date || tx.created_at;
      const acceptanceDate = tx.acceptance_date || tx.created_at;
      const closingDate = tx.closing_date;

      if (tx.status === 'listing' && (tx.representing === 'seller' || tx.representing === 'both')) {
        if (timeframe === 'All Time' || inRange(listingDate)) {
          activeListings.push(tx);
        }
      }

      if (['pending', 'closed', 'cancelled'].includes(tx.status)) {
        if (timeframe === 'All Time' || inRange(acceptanceDate)) {
          underContract.push(tx);

          btAgentIds.forEach(btId => {
            const email = btIdToEmailMap.get(btId);
            const name = btIdToNameMap.get(btId);
            let fId: number | undefined;
            if (email) fId = emailToFubUserId.get(email);
            if (!fId && name) fId = nameToFubUserId.get(name.toLowerCase());

            if (fId && prodMap.has(fId)) {
              prodMap.get(fId)!.writtenDeals += 1;
            }
          });
        }
      }

      if (tx.status === 'closed') {
        if (timeframe === 'All Time' || inRange(closingDate)) {
          closed.push(tx);

          btAgentIds.forEach(btId => {
            const email = btIdToEmailMap.get(btId);
            const name = btIdToNameMap.get(btId);
            let fId: number | undefined;
            if (email) fId = emailToFubUserId.get(email);
            if (!fId && name) fId = nameToFubUserId.get(name.toLowerCase());

            if (fId && prodMap.has(fId)) {
              const prod = prodMap.get(fId)!;
              prod.closedDeals += 1;
              prod.volume += (tx.price || 0) / (btAgentIds.length || 1);
            }
          });
        }
      }

      if (tx.status === 'cancelled') {
        if (timeframe === 'All Time' || inRange(acceptanceDate)) {
          cancelled.push(tx);
        }
      }

      // Assign agent avatar for KPI drilldowns
      const firstBtId = btAgentIds[0];
      if (firstBtId) {
        const email = btIdToEmailMap.get(firstBtId);
        const name = btIdToNameMap.get(firstBtId);
        let fId: number | undefined;
        if (email) fId = emailToFubUserId.get(email);
        if (!fId && name) fId = nameToFubUserId.get(name.toLowerCase());

        if (fId) {
          const u = users.find(user => user.id === fId);
          if (u) {
            tx.assigned_agent_name = u.name;
            tx.assigned_agent_avatar = u.picture?.["162x162"] || u.picture?.["60x60"] || u.picture?.original;
          }
        }
      }
    });

    return {
      productionTableData: Array.from(prodMap.values()),
      dashboardKpis: { activeListings, underContract, cancelled, closed }
    };
  }, [filteredPeople, transactions, btUsers, users, timeframe, customStartDate, customEndDate, txParticipants, authUser, isAdmin]);

  const topProducersData = useMemo(() => {
    return [...productionTableData]
      .sort((a, b) => (b.closedDeals + b.writtenDeals) - (a.closedDeals + a.writtenDeals))
      .slice(0, 10)
      .map(a => {
        const user = users.find(u => u.name === a.agentName);
        return {
          name: a.agentName,
          closed: a.closedDeals,
          written: a.writtenDeals,
          avatarUrl: user?.picture?.["162x162"] || user?.picture?.["60x60"] || user?.picture?.original
        };
      });
  }, [productionTableData, users]);

  const agentDealMap = useMemo(() => {
    const map = new Map<string, BoldTrailTransaction[]>();
    users.forEach(user => {
      if (user.status === 'Active' && (user.role === 'Owner' || user.role === 'Agent')) {
        map.set(user.name, []);
      }
    });

    const btIdToNameMap = new Map<number, string>();
    btUsers.forEach(u => {
      btIdToNameMap.set(u.id, u.name);
      btIdToNameMap.set(u.user_id, u.name);
    });

    transactions.forEach(tx => {
      const ids = txParticipants[tx.id] || [];
      ids.forEach(id => {
        const name = btIdToNameMap.get(id);
        if (name && map.has(name)) {
          map.get(name)!.push(tx);
        }
      });
    });

    return map;
  }, [transactions, btUsers, users, txParticipants]);


  const handleAgentClick = (agentName: string) => {
    if (!isAdmin) {
      const authEmail = authUser?.email?.toLowerCase();
      const clickedUser = users.find(u => u.name === agentName);
      if (!authEmail || !clickedUser || clickedUser.email?.toLowerCase() !== authEmail) {
        return;
      }
    }

    const allAgentDeals = agentDealMap.get(agentName) || [];
    const fubUser = users.find(u => u.name === agentName);
    const agentAvatar = fubUser?.picture?.["162x162"] || fubUser?.picture?.["60x60"] || fubUser?.picture?.original;
    navigate(`/agent/${encodeURIComponent(agentName)}`, {
      state: {
        agentName,
        agentAvatar,
        allDeals: allAgentDeals,
        initialTimeframe: timeframe,
        initialCustomStart: customStartDate,
        initialCustomEnd: customEndDate,
      }
    });
  };

  const handleKpiClick = (title: string, kpiDeals: BoldTrailTransaction[]) => {
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full animate-in fade-in duration-500 mb-6">
        {[
          { title: "Active Listings", count: dashboardKpis.activeListings.length, sub: "Total current", color: "text-white", kpi: dashboardKpis.activeListings },
          { title: "Under Contract", count: dashboardKpis.underContract.length, sub: "Total in timeframe", color: "text-brand-green", kpi: dashboardKpis.underContract },
          { title: "Cancelled", count: dashboardKpis.cancelled.length, sub: "Fell through", color: "text-red-400", kpi: dashboardKpis.cancelled },
          { title: "Closed", count: dashboardKpis.closed.length, sub: "Closed in timeframe", color: "text-green-400", kpi: dashboardKpis.closed }
        ].map((kpi, idx) => (
          <div
            key={idx}
            onClick={() => handleKpiClick(kpi.title, kpi.kpi)}
            className="glass-card p-6 flex flex-col items-center justify-center bg-[#1c2336] border border-white/5 h-[160px] cursor-pointer hover:bg-white/5 transition-colors group"
          >
            <h3 className="text-slate-200 font-bold text-lg w-full text-left group-hover:text-white transition-colors">{kpi.title}</h3>
            <p className="text-slate-400 text-sm flex items-center gap-2 w-full text-left mt-1">{kpi.sub}</p>
            <div className="flex-1 flex items-center justify-start w-full pt-4">
              <span className={`text-5xl font-bold ${kpi.color} tracking-tight`}>{kpi.count}</span>
            </div>
          </div>
        ))}
      </div>

      {authUser?.email === 'ali@questsold.com' && <CashFlowPredictor transactions={transactions} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full animate-in fade-in duration-500 delay-100">
        <div className="flex flex-col min-w-0">
          <AgentTable data={agentTableData.slice(0, 10)} onAgentClick={handleAgentClick} />
        </div>
        <div className="flex flex-col min-w-0">
          <TopProducers producers={topProducersData} title="Top Converters 🏆" onAgentClick={handleAgentClick} />
        </div>
      </div>

      {isAdmin && productionTableData.length > 0 && (
        <div className="w-full mt-6 animate-in fade-in duration-500 delay-200">
          <AgentProductionTable data={productionTableData} onAgentClick={handleAgentClick} />
        </div>
      )}
    </DashboardLayout>
  );
}

export default App;
