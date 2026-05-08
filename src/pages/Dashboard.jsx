import { useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Navigation, Users, Activity, Newspaper, Satellite, AlertTriangle } from 'lucide-react';
import { fetchAstronauts } from '../services/issService';
import { refreshIssNow } from '../services/issService';
import { fetchNews } from '../services/newsService';
import { useCachedFetch } from '../hooks/useCachedFetch';
import { useAppStore } from '../store/useAppStore';
import IssMap from '../components/IssMap';
import IssSpeedChart from '../charts/IssSpeedChart';
import NewsDistributionChart from '../charts/NewsDistributionChart';
import toast from 'react-hot-toast';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function Dashboard() {
  // ── Consume shared ISS state — NO fetching here ───────────────────────────
  // All ISS data is written by the singleton in issService.js via the store.
  const issData      = useAppStore((s) => s.issData);
  const issError     = useAppStore((s) => s.issError);
  const issUsingStale = useAppStore((s) => s.issUsingStale);
  const issTrajectory = useAppStore((s) => s.issTrajectory);
  const astronauts   = useAppStore((s) => s.astronauts);
  const setAstronauts = useAppStore((s) => s.setAstronauts);
  const setNews      = useAppStore((s) => s.setNews);
  const apiKeys      = useAppStore((s) => s.apiKeys);

  // ── News (cached 15 min) ──────────────────────────────────────────────────
  const fetchNewsMemo = useCallback(() => fetchNews(), [apiKeys.newsapi]);
  const {
    data: newsData,
    loading: newsLoading,
    error: newsError,
    refetch: refetchNews,
  } = useCachedFetch('dashboard_news', fetchNewsMemo, [apiKeys.newsapi]);

  // Sync fetched news into Zustand so the chatbot has context
  useEffect(() => {
    if (newsData) setNews(newsData);
  }, [newsData, setNews]);

  // ── Astronauts (once on mount) ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    fetchAstronauts()
      .then((data) => {
        if (!cancelled && data?.people?.length) {
          setAstronauts(data.people);
        }
      })
      .catch((err) => console.error('[Astronauts]', err));
    return () => { cancelled = true; };
  }, [setAstronauts]);

  // ── Manual ISS refresh ────────────────────────────────────────────────────
  const handleManualRefreshIss = () => {
    refreshIssNow();
    toast.success('ISS refresh triggered');
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="mx-auto max-w-7xl space-y-6"
    >
      {/* ── Stale data / error banner ──────────────────────────────────────── */}
      {(issError || issUsingStale) && (
        <motion.div
          variants={itemVariants}
          className="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm"
          style={{
            backgroundColor: 'rgba(234,179,8,0.08)',
            borderColor: 'rgba(234,179,8,0.35)',
            color: '#b45309',
          }}
        >
          <AlertTriangle className="h-4 w-4 flex-shrink-0" style={{ color: '#d97706' }} />
          <span>
            {issUsingStale
              ? `Using last known ISS position${issError ? ` — ${issError}` : ''}`
              : issError}
          </span>
          <button
            onClick={handleManualRefreshIss}
            className="ml-auto flex-shrink-0 rounded-md px-2 py-1 text-xs font-medium transition hover:opacity-80"
            style={{ backgroundColor: 'rgba(234,179,8,0.15)' }}
          >
            Retry now
          </button>
        </motion.div>
      )}

      {/* ── Stat Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          variants={itemVariants}
          icon={<Activity className="h-5 w-5" />}
          iconColor="#3b82f6"
          label="Velocity"
          value={issData ? `${issData.velocity.toFixed(0)} km/h` : '—'}
          stale={issUsingStale}
        />
        <StatCard
          variants={itemVariants}
          icon={<Satellite className="h-5 w-5" />}
          iconColor="#a855f7"
          label="Altitude"
          value={issData ? `${issData.altitude.toFixed(1)} km` : '—'}
          stale={issUsingStale}
        />
        <StatCard
          variants={itemVariants}
          icon={<Navigation className="h-5 w-5" />}
          iconColor="#22c55e"
          label="Coordinates"
          value={
            issData
              ? `${issData.latitude.toFixed(2)}°, ${issData.longitude.toFixed(2)}°`
              : '—'
          }
          small
          stale={issUsingStale}
        />
        <StatCard
          variants={itemVariants}
          icon={<Users className="h-5 w-5" />}
          iconColor="#f97316"
          label="People in Space"
          value={astronauts.length > 0 ? String(astronauts.length) : '—'}
        />
      </div>

      {/* ── Map + Speed Chart ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Map */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-2 rounded-2xl border p-5 shadow-sm"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Live ISS Tracker</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={handleManualRefreshIss}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs transition hover:opacity-80"
                style={{ backgroundColor: 'var(--secondary)', color: 'var(--foreground)' }}
                aria-label="Refresh ISS data"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </button>
              <LiveDot isStale={issUsingStale} />
            </div>
          </div>
          <IssMap data={issData} trajectory={issTrajectory} />
        </motion.div>

        {/* Speed Chart */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col rounded-2xl border p-5 shadow-sm"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <h2 className="mb-4 text-base font-semibold">Speed History</h2>
          <div className="min-h-[300px] flex-1">
            <IssSpeedChart />
          </div>
        </motion.div>
      </div>

      {/* ── Astronauts Strip ──────────────────────────────────────────────────── */}
      {astronauts.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="rounded-2xl border p-5 shadow-sm"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <h2 className="mb-3 text-base font-semibold">
            People in Space ({astronauts.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {astronauts.map((a) => (
              <span
                key={a.name}
                className="rounded-full border px-3 py-1 text-xs font-medium"
                style={{
                  borderColor: 'var(--border)',
                  backgroundColor: 'var(--secondary)',
                  color: 'var(--secondary-foreground)',
                }}
              >
                {a.name}
                {a.craft !== 'ISS' && (
                  <span className="ml-1 opacity-60">({a.craft})</span>
                )}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── News Section ──────────────────────────────────────────────────────── */}
      <div id="news" className="pt-2">
        <motion.div
          variants={itemVariants}
          className="mb-5 flex items-center justify-between"
        >
          <h2 className="text-xl font-semibold">Latest News</h2>
          <button
            onClick={refetchNews}
            disabled={newsLoading}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition hover:opacity-80 disabled:opacity-50"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--secondary)' }}
          >
            <RefreshCw className={`h-4 w-4 ${newsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </motion.div>

        {!apiKeys.newsapi ? (
          <motion.div
            variants={itemVariants}
            className="flex flex-col items-center justify-center rounded-2xl border p-14 text-center shadow-sm"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <Newspaper className="mb-4 h-12 w-12 opacity-30" />
            <h3 className="mb-1 text-base font-medium">NewsData.io Key Required</h3>
            <p className="max-w-sm text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Open <strong>Settings</strong> in the sidebar and paste your free NewsData.io key to
              load live articles.
            </p>
          </motion.div>
        ) : newsLoading && !newsData ? (
          <NewsSkeletons />
        ) : newsError && !newsData ? (
          <motion.div
            variants={itemVariants}
            className="rounded-2xl border p-8 text-center shadow-sm"
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)',
              color: 'var(--destructive)',
            }}
          >
            <p className="font-medium">Failed to load news.</p>
            <p className="mt-1 text-sm opacity-70">
              {newsError.message || 'Check your API key and network connection.'}
            </p>
            <button
              onClick={refetchNews}
              className="mt-4 rounded-lg px-4 py-2 text-sm transition hover:opacity-80"
              style={{ backgroundColor: 'var(--secondary)', color: 'var(--foreground)' }}
            >
              Retry
            </button>
          </motion.div>
        ) : newsData && newsData.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <motion.div
              variants={itemVariants}
              className="lg:col-span-2 grid grid-cols-1 gap-5 sm:grid-cols-2"
            >
              {newsData.slice(0, 8).map((article, idx) => (
                <ArticleCard key={idx} article={article} />
              ))}
            </motion.div>
            <motion.div
              variants={itemVariants}
              className="rounded-2xl border p-5 shadow-sm"
              style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
            >
              <h3 className="mb-4 text-base font-semibold">By Source</h3>
              <NewsDistributionChart news={newsData} />
            </motion.div>
          </div>
        ) : (
          <motion.div
            variants={itemVariants}
            className="rounded-2xl border p-8 text-center shadow-sm"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <p style={{ color: 'var(--muted-foreground)' }}>
              No relevant space/technology news available.
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ variants, icon, iconColor, label, value, small, stale }) {
  return (
    <motion.div
      variants={variants}
      className="flex items-center gap-4 rounded-2xl border p-5 shadow-sm"
      style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
    >
      <div
        className="rounded-xl p-2.5"
        style={{ backgroundColor: `${iconColor}1a`, color: iconColor }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>
          {label}
        </p>
        <p
          className={`font-bold truncate ${small ? 'text-sm' : 'text-xl'}`}
          style={{ opacity: stale ? 0.65 : 1 }}
        >
          {value}
        </p>
        {stale && (
          <p className="text-xs" style={{ color: '#d97706' }}>last known</p>
        )}
      </div>
    </motion.div>
  );
}

function LiveDot({ isStale }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="relative flex h-2 w-2">
        {!isStale && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        )}
        <span
          className="relative inline-flex h-2 w-2 rounded-full"
          style={{ backgroundColor: isStale ? '#d97706' : '#22c55e' }}
        />
      </span>
      <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
        {isStale ? 'Stale' : 'Live'}
      </span>
    </div>
  );
}

function ArticleCard({ article }) {
  return (
    <a
      href={article.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-2xl border shadow-sm transition hover:shadow-md"
      style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
    >
      {article.image_url && (
        <div className="h-36 overflow-hidden">
          <img
            src={article.image_url}
            alt={article.title}
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span
            className="truncate rounded-full px-2 py-0.5 text-xs font-semibold"
            style={{ backgroundColor: 'var(--secondary)', color: 'var(--secondary-foreground)' }}
          >
            {article.source_id || 'Unknown'}
          </span>
          <span className="flex-shrink-0 text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {new Date(article.pubDate).toLocaleDateString()}
          </span>
        </div>
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug transition group-hover:opacity-70">
          {article.title}
        </h3>
        {article.description && (
          <p className="mt-2 line-clamp-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {article.description}
          </p>
        )}
      </div>
    </a>
  );
}

function NewsSkeletons() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-60 animate-pulse rounded-2xl border"
          style={{ backgroundColor: 'var(--secondary)', borderColor: 'var(--border)' }}
        />
      ))}
    </div>
  );
}
