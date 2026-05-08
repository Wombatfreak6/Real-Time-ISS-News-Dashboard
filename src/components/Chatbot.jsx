import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, X, Send, Bot, Trash2, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAppStore } from '../store/useAppStore';
import { fetchAiResponse } from '../services/aiService';
import toast from 'react-hot-toast';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const abortRef = useRef(null);

  const { chatMessages, addChatMessage, clearChat, issData, astronauts, news, apiKeys } =
    useAppStore();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [chatMessages, isTyping, isOpen, scrollToBottom]);

  // Clean up any in-flight request when component unmounts
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;

    if (!apiKeys.openrouter && !apiKeys.huggingface) {
      toast.error('Please add an AI provider key in Settings first.', { duration: 4000 });
      return;
    }

    const userMsg = { role: 'user', content: trimmed, timestamp: Date.now() };
    addChatMessage(userMsg);
    setInput('');
    setIsTyping(true);

    // Build grounded context from live dashboard data
    const context = {
      iss: issData
        ? {
            latitude: issData.latitude,
            longitude: issData.longitude,
            altitude_km: issData.altitude,
            velocity_km_per_h: issData.velocity,
            visibility: issData.visibility,
          }
        : null,
      astronauts_on_iss: astronauts.map((a) => a.name),
      top_news_headlines: news.slice(0, 8).map((n) => ({
        title: n.title,
        source: n.source_id,
        published: n.pubDate,
      })),
    };

    // Cancel any previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Pass the full conversation (including the new user message)
      const currentConversation = [...chatMessages, userMsg].map(m => ({
        role: m.role,
        content: m.content
      }));
      
      const response = await fetchAiResponse(currentConversation, context, controller.signal);
      addChatMessage({ role: 'assistant', content: response, timestamp: Date.now() });
    } catch (err) {
      if (err.name === 'AbortError') return; // User cancelled — do nothing

      const friendly = err.message?.includes('rate limit')
        ? 'Rate limit hit. Please wait a moment before trying again.'
        : err.message?.includes('Invalid')
        ? err.message
        : 'AI request failed. Please check your API key and network connection.';

      toast.error(friendly, { duration: 5000 });
      addChatMessage({
        role: 'assistant',
        content: `*⚠️ ${friendly}*`,
        timestamp: Date.now(),
      });
    } finally {
      setIsTyping(false);
    }
  }, [input, isTyping, apiKeys, issData, astronauts, news, addChatMessage]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const hasKeys = !!(apiKeys.openrouter || apiKeys.huggingface);

  return (
    <>
      {/* ── Floating toggle button ── */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
        style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </button>

      {/* ── Chat window ── */}
      <div
        className={`fixed bottom-24 right-6 z-50 flex flex-col rounded-2xl shadow-2xl transition-all duration-300 origin-bottom-right ${
          isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'
        }`}
        style={{
          width: '24rem',
          maxWidth: 'calc(100vw - 2rem)',
          height: '520px',
          maxHeight: 'calc(100vh - 9rem)',
          backgroundColor: 'var(--background)',
          border: '1px solid var(--border)',
        }}
        role="dialog"
        aria-label="Dashboard AI Chatbot"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between rounded-t-2xl px-4 py-3 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5" style={{ color: 'var(--primary)' }} />
            <h3 className="font-semibold text-sm">Dashboard AI</h3>
            {!hasKeys && (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                <AlertCircle className="h-3 w-3" /> No key
              </span>
            )}
          </div>
          <button
            onClick={clearChat}
            className="rounded-md p-1.5 transition hover:bg-secondary"
            style={{ color: 'var(--muted-foreground)' }}
            aria-label="Clear chat history"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatMessages.length === 0 && (
            <div className="mt-8 text-center" style={{ color: 'var(--muted-foreground)' }}>
              <MessageSquare className="mx-auto mb-3 h-8 w-8 opacity-40" />
              <p className="text-sm font-medium">Dashboard AI</p>
              <p className="mt-1 text-xs">
                Ask me about the ISS position, speed, astronauts, or loaded news headlines.
              </p>
              {!hasKeys && (
                <p className="mt-3 text-xs text-yellow-600 dark:text-yellow-400">
                  ⚠️ Add an AI key in Settings to get started.
                </p>
              )}
            </div>
          )}

          {chatMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div
                  className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: 'var(--secondary)' }}
                >
                  <Bot className="h-3.5 w-3.5" />
                </div>
              )}
              <div
                className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  msg.role === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'
                }`}
                style={
                  msg.role === 'user'
                    ? { backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }
                    : { backgroundColor: 'var(--secondary)', color: 'var(--foreground)' }
                }
              >
                <ReactMarkdown
                  components={{
                    // Prevent ReactMarkdown from rendering block-level <p> wrappers that break inline bubbles
                    p: ({ children }) => <span className="block">{children}</span>,
                    code: ({ children }) => (
                      <code className="rounded bg-black/10 px-1 py-0.5 text-xs font-mono">
                        {children}
                      </code>
                    ),
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex gap-2 justify-start">
              <div
                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: 'var(--secondary)' }}
              >
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div
                className="flex items-center gap-1 rounded-2xl rounded-tl-sm px-4 py-3"
                style={{ backgroundColor: 'var(--secondary)' }}
              >
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="h-1.5 w-1.5 rounded-full animate-bounce"
                    style={{
                      backgroundColor: 'var(--muted-foreground)',
                      animationDelay: `${delay}ms`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="rounded-b-2xl border-t p-3" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={hasKeys ? 'Ask about ISS or news…' : 'Add AI key in Settings first'}
              disabled={isTyping}
              className="flex-1 rounded-full border px-4 py-2 text-sm outline-none transition focus:ring-2"
              style={{
                backgroundColor: 'var(--background)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)',
              }}
              aria-label="Chat input"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="flex h-8 w-8 items-center justify-center rounded-full transition disabled:opacity-40"
              style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
