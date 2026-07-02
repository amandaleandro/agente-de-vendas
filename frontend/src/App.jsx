import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { LayoutDashboard, Smartphone, Users, Settings, Terminal, BarChart2, MessageSquare, Flame, Brain, TrendingUp, Shield, Activity, LinkIcon } from 'lucide-react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Conexao = lazy(() => import('./pages/Conexao'));
const Prospeccao = lazy(() => import('./pages/Prospeccao'));
const Configuracao = lazy(() => import('./pages/Configuracao'));
const Analytics = lazy(() => import('./pages/Analytics'));
const TerminalLogs = lazy(() => import('./pages/TerminalLogs'));
const Conversas = lazy(() => import('./pages/Conversas'));
const Warmup = lazy(() => import('./pages/Warmup'));
const LearningDashboard = lazy(() => import('./components/LearningDashboard'));
const LearningConfig = lazy(() => import('./pages/LearningConfig'));
const KnowledgeBase = lazy(() => import('./pages/KnowledgeBase'));
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard'));
const BackupManager = lazy(() => import('./pages/BackupManager'));
const SystemMonitor = lazy(() => import('./pages/SystemMonitor'));
const DemoPage = lazy(() => import('./pages/DemoPage'));
const CRMConfig = lazy(() => import('./pages/CRMConfig'));

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <nav className="sidebar">
          <div className="glass-header" style={{ padding: '1.25rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <h2 style={{ margin: 0, fontSize: '1.05rem', background: 'linear-gradient(to right, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>🤖 Fezinha Bot</h2>
            <p style={{ fontSize: '0.78rem', marginTop: '0.2rem' }}>Painel Administrativo</p>
          </div>
          <div style={{ flex: 1, padding: '0.75rem 0' }}>
            <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <LayoutDashboard size={20} /> Dashboard
            </NavLink>
            <NavLink to="/analytics" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <BarChart2 size={20} /> Analytics
            </NavLink>
            <NavLink to="/analytics-dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <TrendingUp size={20} /> Dashboard Premium
            </NavLink>
            <NavLink to="/conexao" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Smartphone size={20} /> Conexão WhatsApp
            </NavLink>
            <NavLink to="/prospeccao" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Users size={20} /> Prospecção & IA
            </NavLink>
            <NavLink to="/conversas" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <MessageSquare size={20} /> Conversas
            </NavLink>
            <NavLink to="/warmup" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Flame size={20} /> Warmup
            </NavLink>
            <NavLink to="/learning" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Brain size={20} /> Aprendizado Bot
            </NavLink>
            <NavLink to="/learning-config" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Settings size={20} /> Config. Learning
            </NavLink>
            <NavLink to="/knowledge-base" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Brain size={20} /> Base de Conhecimento
            </NavLink>
            <NavLink to="/configuracao" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Settings size={20} /> Configurações
            </NavLink>
            <NavLink to="/logs" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Terminal size={20} /> Terminal de Logs
            </NavLink>
            <NavLink to="/backup" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Shield size={20} /> Backups
            </NavLink>
            <NavLink to="/monitor" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Activity size={20} /> Monitor Sistema
            </NavLink>
            <NavLink to="/crm" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <LinkIcon size={20} /> Integrações CRM
            </NavLink>
          </div>
        </nav>
        
        <main className="main-content">
          <Suspense fallback={<div className="loading">Carregando...</div>}>
            <Routes>
              <Route path="/" element={<DemoPage />} />
              <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/analytics-dashboard" element={<AnalyticsDashboard />} />
              <Route path="/conexao" element={<Conexao />} />
              <Route path="/prospeccao" element={<Prospeccao />} />
              <Route path="/conversas" element={<Conversas />} />
              <Route path="/warmup" element={<Warmup />} />
              <Route path="/learning" element={<LearningDashboard />} />
              <Route path="/learning-config" element={<LearningConfig />} />
              <Route path="/knowledge-base" element={<KnowledgeBase />} />
              <Route path="/configuracao" element={<Configuracao />} />
              <Route path="/logs" element={<TerminalLogs />} />
              <Route path="/backup" element={<BackupManager />} />
              <Route path="/monitor" element={<SystemMonitor />} />
              <Route path="/crm" element={<CRMConfig />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
