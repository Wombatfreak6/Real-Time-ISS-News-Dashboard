import { useState, useEffect, useRef } from 'react';
import { X, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { validateApiKey } from '../utils/apiKeyManager';
import toast from 'react-hot-toast';

export default function SettingsModal({ isOpen, onClose }) {
  const { apiKeys, updateApiKeys } = useAppStore();
  const [keys, setKeys] = useState({ newsapi: '', openrouter: '' });
  const [show, setShow] = useState({ newsapi: false, openrouter: false });
  const firstInputRef = useRef(null);

  // Populate form from current store whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setKeys({
        newsapi: apiKeys.newsapi || '',
        openrouter: apiKeys.openrouter || '',
      });
      // Focus first input for accessibility
      setTimeout(() => firstInputRef.current?.focus(), 50);
    }
  }, [isOpen, apiKeys]);

  // Trap Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = () => {
    // Trim all values before saving
    const trimmed = {
      newsapi: keys.newsapi.trim(),
      openrouter: keys.openrouter.trim(),
    };
    updateApiKeys(trimmed);
    toast.success('API keys saved!');
    onClose();
  };

  const toggleShow = (field) => setShow((prev) => ({ ...prev, [field]: !prev[field] }));

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between border-b px-5 py-4"
          style={{ borderColor: 'var(--border)' }}
        >
          <h2 id="settings-modal-title" className="text-base font-semibold">
            API Key Settings
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 transition hover:opacity-70"
            aria-label="Close settings"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 px-5 py-5">
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Keys are stored only in your browser's localStorage and never transmitted to any server.
          </p>

          <KeyField
            inputRef={firstInputRef}
            label="NewsData.io Key"
            hint='Get a free key at newsdata.io — key is stored as "news_api_key"'
            value={keys.newsapi}
            onChange={(v) => setKeys((p) => ({ ...p, newsapi: v }))}
            show={show.newsapi}
            onToggleShow={() => toggleShow('newsapi')}
          />
          <KeyField
            label="OpenRouter Key"
            hint='Free tier at openrouter.ai — key is stored as "openrouter_api_key"'
            value={keys.openrouter}
            onChange={(v) => setKeys((p) => ({ ...p, openrouter: v }))}
            show={show.openrouter}
            onToggleShow={() => toggleShow('openrouter')}
          />
        </div>

        {/* Footer */}
        <div
          className="flex justify-end gap-2 border-t px-5 py-4"
          style={{ borderColor: 'var(--border)' }}
        >
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm transition hover:opacity-70"
            style={{ backgroundColor: 'var(--secondary)', color: 'var(--secondary-foreground)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg px-4 py-2 text-sm font-medium transition hover:opacity-90"
            style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
          >
            Save Keys
          </button>
        </div>
      </div>
    </div>
  );
}

function KeyField({ label, hint, value, onChange, show, onToggleShow, inputRef }) {
  const isValid = validateApiKey(value);
  const hasValue = value.trim().length > 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        {hasValue && (
          isValid
            ? <CheckCircle className="h-4 w-4 text-green-500" />
            : <AlertCircle className="h-4 w-4 text-yellow-500" />
        )}
      </div>
      <div className="relative">
        <input
          ref={inputRef}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Paste your ${label.split(' ')[0]} key`}
          className="w-full rounded-lg border py-2 pl-3 pr-10 text-sm outline-none transition focus:ring-2"
          style={{
            backgroundColor: 'var(--background)',
            borderColor: 'var(--border)',
            color: 'var(--foreground)',
          }}
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 transition hover:opacity-70"
          style={{ color: 'var(--muted-foreground)' }}
          aria-label={show ? 'Hide key' : 'Show key'}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {hint && (
        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          {hint}
        </p>
      )}
    </div>
  );
}
