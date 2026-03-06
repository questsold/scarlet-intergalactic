import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Settings, LogOut, Menu, LayoutDashboard, Users, BarChart3, Megaphone, FileSpreadsheet, Clock } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../services/firebase';

interface DashboardLayoutProps {
    children: ReactNode;
    headerActions?: ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, headerActions }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [authUser] = useAuthState(auth);

    const navItems = [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
        { name: 'Transactions', icon: FileSpreadsheet, path: '/transactions' },
        { name: 'Client Portals', icon: Clock, path: '/portals' },
        { name: 'Agents', icon: Users, path: '/agents' },
        { name: 'Reports', icon: BarChart3, path: '/reports' },
        { name: 'Marketing', icon: Megaphone, path: '/marketing' },
    ];

    return (
        <div className="min-h-screen text-slate-50 flex bg-[#0f1322] overflow-hidden">
            {/* Sidebar */}
            <aside
                className={`transition-all duration-300 ease-in-out border-r border-white/5 bg-[#121727] flex flex-col ${isSidebarOpen ? 'w-64' : 'w-20'
                    }`}
            >
                {/* Sidebar Header / Toggle */}
                <div className="h-16 flex items-center justify-center border-b border-white/5">
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors flex items-center justify-center w-full mx-4"
                        title="Toggle Menu"
                    >
                        <Menu size={20} className="text-slate-400 hover:text-slate-200" />
                    </button>
                </div>

                {/* Sidebar Links */}
                <nav className="flex-1 py-6 px-3 space-y-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));

                        return (
                            <button
                                key={item.name}
                                onClick={() => navigate(item.path)}
                                className={`w-full flex items-center ${isSidebarOpen ? 'justify-start px-4' : 'justify-center'} py-3 rounded-xl transition-all ${isActive
                                    ? 'bg-brand-green/10 text-brand-green border border-brand-green/20'
                                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'
                                    }`}
                                title={!isSidebarOpen ? item.name : undefined}
                            >
                                <Icon size={20} className={isActive ? 'text-brand-green' : 'text-slate-400'} />
                                {isSidebarOpen && <span className="ml-3 font-medium text-sm whitespace-nowrap">{item.name}</span>}
                            </button>
                        );
                    })}
                </nav>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Top Navigation Bar */}
                <header className="h-16 flex items-center justify-between px-6 border-b border-white/5 sticky top-0 z-30 bg-[#0f1322]">
                    {/* Left: Logo */}
                    <div
                        className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => navigate('/')}
                        title="Go to Dashboard"
                    >
                        <img src="/logo.png" alt="Realty Logo" className="h-8 object-contain" />
                    </div>

                    {/* Right: Actions & User Menu */}
                    <div className="flex items-center gap-4 text-sm text-slate-300">
                        {headerActions && (
                            <div className="flex items-center mr-4">
                                {headerActions}
                            </div>
                        )}

                        {authUser && (
                            <div className="flex items-center" title={`Logged in as ${authUser.displayName || authUser.email}`}>
                                {authUser.photoURL ? (
                                    <img src={authUser.photoURL} alt="Profile" className="w-8 h-8 rounded-full ml-2 border border-white/10 object-cover" />
                                ) : (
                                    <div className="ml-2 bg-brand-green/20 text-brand-green w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border border-brand-green/30 cursor-default">
                                        {authUser.displayName
                                            ? authUser.displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                                            : authUser.email ? authUser.email[0].toUpperCase() : '?'}
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            onClick={() => navigate('/settings')}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors ml-2"
                            title="Settings"
                        >
                            <Settings size={18} />
                        </button>
                        <button
                            onClick={async () => {
                                await auth.signOut();
                                navigate('/login');
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                        >
                            <LogOut size={16} />
                            <span className="hidden sm:inline">Logout</span>
                        </button>
                    </div>
                </header>

                <main className="flex-1 w-full p-4 md:p-6 overflow-y-auto">
                    <div className="max-w-[1920px] mx-auto h-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
