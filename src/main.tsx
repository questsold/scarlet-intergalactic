import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import AgentDealsPage from './pages/AgentDealsPage.tsx'
import LoginPage from './pages/LoginPage.tsx'
import SettingsPage from './pages/SettingsPage.tsx'
import AgentsPage from './pages/AgentsPage.tsx'
import ReportsPage from './pages/ReportsPage.tsx'
import KpiDealsPage from './pages/KpiDealsPage.tsx'
import MarketingPage from './pages/MarketingPage.tsx'
import { ProtectedRoute } from './components/ProtectedRoute.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={
          <ProtectedRoute>
            <App />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        } />
        <Route path="/agents" element={
          <ProtectedRoute>
            <AgentsPage />
          </ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute>
            <ReportsPage />
          </ProtectedRoute>
        } />
        <Route path="/agent/:agentName" element={
          <ProtectedRoute>
            <AgentDealsPage />
          </ProtectedRoute>
        } />
        <Route path="/marketing" element={
          <ProtectedRoute>
            <MarketingPage />
          </ProtectedRoute>
        } />
        <Route path="/kpi-deals" element={
          <ProtectedRoute>
            <KpiDealsPage />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
