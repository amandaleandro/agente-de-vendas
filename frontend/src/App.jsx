import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { LayoutDashboard, Smartphone, Users, Settings } from 'lucide-react';

import Dashboard from './pages/Dashboard';
import Conexao from './pages/Conexao';
import Prospeccao from './pages/Prospeccao';
import Configuracao from './pages/Configuracao';

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
            <NavLink to="/conexao" className={({ isActive }) => \`nav-link \${isActive ? 'active' : ''}\`}>
              <Smartphone size={20} /> Conexão WhatsApp
            </NavLink>
            <NavLink to="/prospeccao" className={({ isActive }) => \`nav-link \${isActive ? 'active' : ''}\`}>
              <Users size={20} /> Prospecção & IA
            </NavLink>
            <NavLink to="/configuracao" className={({ isActive }) => \`nav-link \${isActive ? 'active' : ''}\`}>
              <Settings size={20} /> Configurações
            </NavLink>
          </div>
        </nav>
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/conexao" element={<Conexao />} />
            <Route path="/prospeccao" element={<Prospeccao />} />
            <Route path="/configuracao" element={<Configuracao />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
