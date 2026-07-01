import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { LayoutDashboard, Smartphone, Users, Settings, Terminal, BarChart2, MessageSquare, Flame, Brain } from 'lucide-react';

import Dashboard from './pages/Dashboard';
import Conexao from './pages/Conexao';
import Prospeccao from './pages/Prospeccao';
import Configuracao from './pages/Configuracao';
import Analytics from './pages/Analytics';
import TerminalLogs from './pages/TerminalLogs';
import Conversas from './pages/Conversas';
import Warmup from './pages/Warmup';
import LearningDashboard from './components/LearningDashboard';
import LearningConfig from './pages/LearningConfig';
import KnowledgeBase from './pages/KnowledgeBase';

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <nav className="sidebar">
          <div className="glass-header" style={{ padding: '2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', background: 'linear-gradient(to right, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>🤖 Fezinha Bot</h2>
            <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Painel Administrativo</p>
          </div>
          <div style={{ flex: 1, padding: '1rem 0' }}>
            <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <LayoutDashboard size={20} /> Dashboard
            </NavLink>
            <NavLink to="/analytics" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <BarChart2 size={20} /> Analytics
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
          </div>
        </nav>
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/conexao" element={<Conexao />} />
            <Route path="/prospeccao" element={<Prospeccao />} />
            <Route path="/conversas" element={<Conversas />} />
            <Route path="/warmup" element={<Warmup />} />
            <Route path="/learning" element={<LearningDashboard />} />
            <Route path="/learning-config" element={<LearningConfig />} />
            <Route path="/knowledge-base" element={<KnowledgeBase />} />
            <Route path="/configuracao" element={<Configuracao />} />
            <Route path="/logs" element={<TerminalLogs />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
