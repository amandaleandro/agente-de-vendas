import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, Settings, Smartphone, LineChart } from 'lucide-react'

// Dummy components for now
import Dashboard from './pages/Dashboard'
import Prospeccao from './pages/Prospeccao'
import Conexao from './pages/Conexao'
import Config from './pages/Config'
import Analytics from './pages/Analytics'

function Sidebar() {
  const location = useLocation()
  
  const navItems = [
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/conexao', label: 'Conexão', icon: <Smartphone size={20} /> },
    { path: '/prospeccao', label: 'Prospecção', icon: <Users size={20} /> },
    { path: '/analytics', label: 'Analytics', icon: <LineChart size={20} /> },
    { path: '/config', label: 'Configurações', icon: <Settings size={20} /> },
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span style={{ fontSize: '1.8rem' }}>🤖</span> Fezinha
      </div>
      <nav className="sidebar-nav">
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}

function App() {
  return (
    <Router>
      <div className="app-container">
        <Sidebar />
        <main className="main-content animate-fade-in">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/conexao" element={<Conexao />} />
            <Route path="/prospeccao" element={<Prospeccao />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/config" element={<Config />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
