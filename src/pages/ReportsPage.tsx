import React from 'react';
import DashboardLayout from '../components/DashboardLayout';

const ReportsPage: React.FC = () => {
    return (
        <DashboardLayout>
            <div className="w-full flex justify-center items-center h-[50vh] text-slate-400">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-slate-200 mb-2">Detailed Reports</h1>
                    <p>This page is under construction. It will contain customizable reports and analytics soon.</p>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default ReportsPage;
