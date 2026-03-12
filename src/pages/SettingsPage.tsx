import React from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { Shield, Key, Bell, CreditCard, Puzzle, Users, UserPlus } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

const SettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const [authUser] = useAuthState(auth);
    const [isAdmin, setIsAdmin] = React.useState<boolean | null>(null);

    React.useEffect(() => {
        if (!authUser?.email) return;
        const checkAdmin = async () => {
            try {
                const userDoc = await getDoc(doc(db, 'allowed_users', authUser.email!.toLowerCase()));
                if (userDoc.exists() && (userDoc.data().role === 'admin' || userDoc.data().role === 'Owner' || userDoc.data().isAdmin)) {
                    setIsAdmin(true);
                } else {
                    setIsAdmin(false);
                }
            } catch (err) {
                const isFounder = authUser.email?.toLowerCase() === 'ali@questsold.com' || authUser.email?.toLowerCase() === 'admin@questsold.com';
                setIsAdmin(isFounder);
            }
        };
        checkAdmin();
    }, [authUser]);

    // Placeholder cards for future settings
    const settingsCards = [
        {
            title: "Agents Directory",
            description: "Manage all agents, their dashboard access, and sync BackOffice data.",
            icon: Users,
            color: "text-brand-green",
            bg: "bg-brand-green/10",
            path: "/agents"
        },
        ...(isAdmin ? [{
            title: "Lead Input Forms",
            description: "Access options to manually input leads into your Follow Up Boss CRM.",
            icon: UserPlus,
            color: "text-brand-green",
            bg: "bg-brand-green/10",
            path: "/settings/lead-forms"
        }] : []),
        {
            title: "Notification Preferences",
            description: "Control how and when you receive alerts from the platform.",
            icon: Bell,
            color: "text-blue-400",
            bg: "bg-blue-500/10"
        },
        {
            title: "Security & Permissions",
            description: "Manage admin roles, 2FA, and global security policies for the team.",
            icon: Shield,
            color: "text-purple-400",
            bg: "bg-purple-500/10"
        },
        {
            title: "API Connections",
            description: "View and manage Follow Up Boss tokens and other external integrations.",
            icon: Key,
            color: "text-yellow-400",
            bg: "bg-yellow-400/10"
        },
        {
            title: "Billing & Subscriptions",
            description: "Manage payment methods, view invoices, and upgrade your plan.",
            icon: CreditCard,
            color: "text-green-400",
            bg: "bg-green-500/10"
        },
        {
            title: "Integrations",
            description: "Connect to other real estate tools such as RealScout or Zillow.",
            icon: Puzzle,
            color: "text-orange-400",
            bg: "bg-orange-500/10"
        }
    ];

    return (
        <DashboardLayout>
            <div className="w-full max-w-5xl mx-auto animate-in fade-in duration-500 pb-12">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-100">Settings</h1>
                    <p className="text-slate-400 mt-2">Manage your platform preferences and connections.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {settingsCards.map((card, i) => {
                        const Icon = card.icon;
                        return (
                            <div key={i} onClick={() => { if (card.path) navigate(card.path); }} className="glass-card bg-[#1c2336] border border-white/5 rounded-2xl p-6 hover:bg-[#20283e] hover:border-white/10 transition-all cursor-pointer group">
                                <div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                    <Icon className={card.color} size={24} />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-200 mb-2">{card.title}</h3>
                                <p className="text-sm text-slate-400 leading-relaxed">
                                    {card.description}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default SettingsPage;
