import { Routes, Route, NavLink } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Questions } from './pages/Questions';
import { Queue } from './pages/Queue';
import { Bans } from './pages/Bans';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/questions', label: 'Questions', icon: '❓' },
  { path: '/queue', label: 'Queue', icon: '📋' },
  { path: '/bans', label: 'Bans', icon: '🚫' },
];

export default function App() {
  return (
    <div className="flex min-h-screen bg-slate-900 text-white">
      {/* Sidebar */}
      <nav className="w-64 border-r border-slate-700 bg-slate-800 p-4">
        <div className="mb-8">
          <h1 className="text-xl font-bold">
            World<span className="text-blue-400">Pulse</span>
          </h1>
          <p className="text-sm text-slate-400">Admin Panel</p>
        </div>

        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-4 py-2 transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-700'
                  }`
                }
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Main content */}
      <main className="flex-1 p-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/questions" element={<Questions />} />
          <Route path="/queue" element={<Queue />} />
          <Route path="/bans" element={<Bans />} />
        </Routes>
      </main>
    </div>
  );
}
