import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import { useAppStore } from './store/useAppStore';
import { startIssPolling } from './services/issService';

// ── Start the global ISS polling singleton as a module side-effect ────────────
// Runs exactly once when the module is first imported (before React renders).
// This guarantees one poller regardless of StrictMode double-invocation or
// any number of component mounts/unmounts.
startIssPolling(useAppStore);

function App() {
  const theme = useAppStore((s) => s.theme);

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <DashboardLayout>
        <Dashboard />
      </DashboardLayout>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--card)',
            color: 'var(--foreground)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            fontSize: '13px',
          },
        }}
      />
    </div>
  );
}

export default App;
