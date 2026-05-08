import { create } from 'zustand';
import { getApiKeys, setApiKeys } from '../utils/apiKeyManager';

// Apply theme class immediately on store init so the DOM reflects persisted theme
const initTheme = () => {
  const saved = localStorage.getItem('theme') || 'dark';
  if (saved === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  return saved;
};

export const useAppStore = create((set, get) => ({
  // ─── Theme ────────────────────────────────────────────────────────────────
  theme: initTheme(),
  toggleTheme: () => {
    const current = get().theme;
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme: next });
  },

  // ─── API Keys ─────────────────────────────────────────────────────────────
  apiKeys: getApiKeys(),
  updateApiKeys: (newKeys) => {
    setApiKeys(newKeys);
    set({ apiKeys: getApiKeys() });
  },

  // ─── ISS ──────────────────────────────────────────────────────────────────
  // issData is NEVER cleared back to null after it first populates.
  // Stale data is preserved so widgets never go blank on transient failures.
  ...( (() => {
    try {
      const raw = localStorage.getItem('last_iss_state');
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
      issData: null,
      issTrajectory: [],
      issSpeedHistory: [],
    };
  })() ),
  issError: null,          // human-readable error string | null
  issUsingStale: false,    // true when displaying last-known data after a failure
  astronauts: [],

  setIssData: (data) => {
    set((state) => {
      const newTrajectory = [
        ...state.issTrajectory,
        { lat: data.latitude, lng: data.longitude },
      ].slice(-100);

      const newSpeedHistory = [
        ...state.issSpeedHistory,
        {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          speed: Math.round(data.velocity),
        },
      ].slice(-30);

      const newState = {
        issData: data,
        issError: null,
        issUsingStale: false,
        issTrajectory: newTrajectory,
        issSpeedHistory: newSpeedHistory,
      };

      try {
        localStorage.setItem('last_iss_state', JSON.stringify({
          issData: data,
          issTrajectory: newTrajectory,
          issSpeedHistory: newSpeedHistory,
        }));
      } catch {}

      return newState;
    });
  },

  // Called by the polling singleton on failure — sets error but does NOT clear issData
  setIssError: (msg) => {
    set((state) => ({
      issError: msg,
      // Only mark as stale if we actually have data to show
      issUsingStale: state.issData !== null,
    }));
  },

  setAstronauts: (people) => set({ astronauts: people }),

  // ─── News ─────────────────────────────────────────────────────────────────
  news: [],
  setNews: (articles) => set({ news: articles }),

  // ─── Chatbot ──────────────────────────────────────────────────────────────
  chatMessages: (() => {
    try {
      return JSON.parse(localStorage.getItem('chat_messages') || '[]');
    } catch {
      return [];
    }
  })(),

  addChatMessage: (msg) => {
    set((state) => {
      const newMsgs = [...state.chatMessages, msg].slice(-20);
      try {
        localStorage.setItem('chat_messages', JSON.stringify(newMsgs));
      } catch {
        // Silently ignore localStorage quota errors
      }
      return { chatMessages: newMsgs };
    });
  },

  clearChat: () => {
    try {
      localStorage.removeItem('chat_messages');
    } catch {
      // ignore
    }
    set({ chatMessages: [] });
  },
}));
