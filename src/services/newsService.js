import axios from 'axios';

const NEWSDATA_ENDPOINT = 'https://newsdata.io/api/1/latest';
const CACHE_KEY         = 'dashboard_news';
const CACHE_TTL_MS      = 15 * 60 * 1000; // 15 minutes

// ─── Key lookup ────────────────────────────────────────────────────────────────
// The key is stored under 'news_api_key' (as required by the spec).
// The SettingsModal writes to 'newsapi_api_key' via apiKeyManager.
// We check BOTH so whichever the user has set works transparently.
const getNewsApiKey = () =>
  localStorage.getItem('news_api_key') ||
  localStorage.getItem('newsapi_api_key') ||
  null;

// ─── Cache helpers ─────────────────────────────────────────────────────────────
const readCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (!data || !timestamp) return null;
    if (Date.now() - timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data;
  } catch {
    try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
    return null;
  }
};

const writeCache = (data) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch { /* quota exceeded — skip silently */ }
};

// ─── Article normaliser ────────────────────────────────────────────────────────
/**
 * Converts a raw NewsData.io result item into a stable shape.
 * Missing fields are filled with safe defaults so the UI never renders undefined.
 */
const normalise = (item) => ({
  title:       item.title       || 'Untitled',
  description: item.description || item.content || '',
  image_url:   item.image_url   || null,
  source_id:   item.source_id   || item.source_name || 'Unknown',
  pubDate:     item.pubDate     || item.publishedAt  || new Date().toISOString(),
  link:        item.link        || item.url           || '#',
});

// ─── Main export ───────────────────────────────────────────────────────────────
/**
 * Fetches the latest space/tech news from NewsData.io.
 * Returns normalised articles from response.data.results.
 * Results are cached for 15 minutes in localStorage.
 *
 * @param {boolean} [force=false]  Force a fresh fetch, ignoring cache
 */
export const fetchNews = async (force = false) => {
  // 1. Serve from cache unless forced
  if (!force) {
    const cached = readCache();
    if (cached) {
      console.debug('[News] Serving from cache —', cached.length, 'articles');
      return cached;
    }
  }

  // 2. Key validation
  const apiKey = getNewsApiKey();
  console.debug('[News] news_api_key present:', !!apiKey);

  if (!apiKey || apiKey.trim().length < 10) {
    throw new Error('NewsData.io key is missing or invalid. Please add it in Settings.');
  }

  // 3. Request
  console.debug('[News] → Endpoint:', NEWSDATA_ENDPOINT);
  let response;
  try {
    response = await axios.get(NEWSDATA_ENDPOINT, {
      params: {
        apikey:   apiKey.trim(),
        q:        '"(ISS OR NASA OR SpaceX OR astronauts OR satellite OR orbital OR space station OR AI technology)"',
        category: 'science,technology',
        language: 'en',
      },
      timeout: 15_000,
    });
  } catch (err) {
    const status = err.response?.status;
    console.error('[News] Request error — status:', status, err.message);

    if (status === 401 || status === 403) {
      throw new Error('Invalid NewsData.io API key (401). Please check Settings.');
    }
    if (status === 422) {
      throw new Error('NewsData.io rejected query parameters (422).');
    }
    if (status === 429) {
      throw new Error('NewsData.io rate limit reached (429). Please wait a moment.');
    }
    if (err.code === 'ECONNABORTED') {
      throw new Error('NewsData.io request timed out. Please try again.');
    }
    throw new Error(`News fetch failed: ${err.message}`);
  }

  console.debug('[News] ← Status:', response.status);
  console.debug('[News] ← response.data.status:', response.data?.status);
  console.debug('[News] ← results count:', response.data?.results?.length);

  // 4. Parse — NewsData.io uses response.data.results (NOT articles)
  const raw = response.data;

  if (raw?.status === 'error') {
    throw new Error(raw.results?.message || 'NewsData.io returned an error status.');
  }

  if (!Array.isArray(raw?.results)) {
    console.error('[News] Unexpected response shape:', JSON.stringify(raw, null, 2));
    throw new Error('NewsData.io response did not contain a results array.');
  }

  if (raw.results.length === 0) {
    console.warn('[News] Empty results array returned');
    return [];
  }

  // 5. Normalise and filter
  const REQUIRED_KEYWORDS = ['ISS', 'NASA', 'SpaceX', 'space', 'astronaut', 'satellite', 'orbital', 'space station', 'AI', 'technology'];
  const FORBIDDEN_KEYWORDS = ['sports', 'football', 'basketball', 'cricket', 'election', 'Trump', 'golf', 'lacrosse'];

  const articles = raw.results
    .map(normalise)
    .filter((a) => {
      if (!a.title || a.title === '[Removed]' || a.link === '#') return false;
      const combinedText = `${a.title} ${a.description}`.toLowerCase();
      
      const hasRequired = REQUIRED_KEYWORDS.some((kw) => combinedText.includes(kw.toLowerCase()));
      const hasForbidden = FORBIDDEN_KEYWORDS.some((kw) => combinedText.includes(kw.toLowerCase()));
      
      return hasRequired && !hasForbidden;
    });

  console.debug('[News] ✓', articles.length, 'usable articles after filtering');

  // 6. Cache and return
  writeCache(articles);
  return articles;
};
