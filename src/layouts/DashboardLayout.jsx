import { useState, useEffect, useCallback } from 'react';
import { Settings, Moon, Sun, LayoutDashboard, Map, Newspaper, Menu, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import SettingsModal from '../components/SettingsModal';
import Chatbot from '../components/Chatbot';

export default function DashboardLayout({ children }) {
  const { theme, toggleTheme } = useAppStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Close sidebar on escape key
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') setIsSidebarOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const openSettings = useCallback(() => {
    setIsSettingsOpen(true);
    setIsSidebarOpen(false);
  }, []);

  return (
    <div style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
      <div className="flex h-screen overflow-hidden">

        {/* ── Mobile overlay ─────────────────────────────────────────────────── */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* ── Sidebar ────────────────────────────────────────────────────────── */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r shadow-xl
            transition-transform duration-300 lg:relative lg:translate-x-0
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)',
          }}
        >
          {/* Logo */}
          <div
            className="flex h-16 items-center justify-between border-b px-5"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-2.5">
              <LayoutDashboard className="h-5 w-5" style={{ color: '#3b82f6' }} />
              <span className="text-lg font-bold tracking-tight">OrbitDash</span>
            </div>
            <button
              className="rounded-md p-1 lg:hidden transition hover:opacity-70"
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-1 p-3">
            <NavItem href="#" icon={<Map className="h-4.5 w-4.5" />} label="ISS Tracking" />
            <NavItem href="#news" icon={<Newspaper className="h-4.5 w-4.5" />} label="News Feed" onClick={() => setIsSidebarOpen(false)} />
          </nav>

          {/* Bottom actions */}
          <div className="space-y-1 border-t p-3" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={toggleTheme}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition hover:opacity-80"
              style={{ backgroundColor: 'var(--secondary)', color: 'var(--secondary-foreground)' }}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>
            <button
              onClick={openSettings}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition hover:opacity-80"
              style={{ backgroundColor: 'var(--secondary)', color: 'var(--secondary-foreground)' }}
              aria-label="Open settings"
            >
              <Settings className="h-4 w-4" />
              API Settings
            </button>
          </div>
        </aside>

        {/* ── Main content ───────────────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top navbar */}
          <header
            className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b px-5 shadow-sm"
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)',
            }}
          >
            <button
              className="rounded-md p-1.5 transition hover:opacity-70 lg:hidden"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold">Dashboard</h1>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-5 md:p-6">
            {children}
          </main>
        </div>

        {/* ── Global overlays ────────────────────────────────────────────────── */}
        <Chatbot />
        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      </div>
    </div>
  );
}

function NavItem({ href, icon, label, onClick }) {
  return (
    <a
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition hover:opacity-80"
      style={{ color: 'var(--foreground)' }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--secondary)')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      {icon}
      {label}
    </a>
  );
}
