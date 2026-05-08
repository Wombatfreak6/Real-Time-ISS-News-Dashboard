// ─── localStorage key names (single source of truth) ──────────────────────────
// These are used by both the SettingsModal (write) and aiService (read).
export const LS_KEY_OPENROUTER  = 'openrouter_api_key';
export const LS_KEY_NEWSAPI     = 'news_api_key';

// ─── Legacy bundled-key support ───────────────────────────────────────────────
// The old format stored all keys as a JSON object under one key.
// We migrate any existing keys to the new per-key format on first read.
const LEGACY_KEY = 'dashboard_api_keys';

const migrateIfNeeded = () => {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return;
    const legacy = JSON.parse(raw);
    if (legacy.openrouter  && !localStorage.getItem(LS_KEY_OPENROUTER))  localStorage.setItem(LS_KEY_OPENROUTER,  legacy.openrouter);
    if (legacy.newsapi     && !localStorage.getItem(LS_KEY_NEWSAPI))     localStorage.setItem(LS_KEY_NEWSAPI,     legacy.newsapi);
    localStorage.removeItem(LEGACY_KEY);
  } catch { /* ignore */ }
};

// Run migration once at module load
migrateIfNeeded();

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns all three API keys from localStorage as a plain object.
 * Shape: { openrouter, newsapi, huggingface }
 */
export const getApiKeys = () => ({
  openrouter:  localStorage.getItem(LS_KEY_OPENROUTER)  || '',
  newsapi:     localStorage.getItem(LS_KEY_NEWSAPI)     || '',
});

/**
 * Saves one or more keys to localStorage.
 * Only writes non-empty values; clears the key if an empty string is passed.
 *
 * @param {{ openrouter?: string, newsapi?: string, huggingface?: string }} keys
 */
export const setApiKeys = (keys) => {
  try {
    if ('openrouter'  in keys) keys.openrouter.trim()
      ? localStorage.setItem(LS_KEY_OPENROUTER,  keys.openrouter.trim())
      : localStorage.removeItem(LS_KEY_OPENROUTER);

    if ('newsapi'     in keys) keys.newsapi.trim()
      ? localStorage.setItem(LS_KEY_NEWSAPI,     keys.newsapi.trim())
      : localStorage.removeItem(LS_KEY_NEWSAPI);
  } catch (err) {
    console.error('[KeyManager] Failed to save API keys:', err);
  }
};

/**
 * Returns a single key by provider name.
 * @param {'openrouter'|'newsapi'|'huggingface'} provider
 */
export const getApiKey = (provider) => {
  switch (provider) {
    case 'openrouter':  return localStorage.getItem(LS_KEY_OPENROUTER)  || null;
    case 'newsapi':     return localStorage.getItem(LS_KEY_NEWSAPI)     || null;
    default: return null;
  }
};

/**
 * Basic format validation — key must be a non-empty string longer than 10 chars.
 */
export const validateApiKey = (key) => {
  if (!key || typeof key !== 'string') return false;
  return key.trim().length > 10;
};
