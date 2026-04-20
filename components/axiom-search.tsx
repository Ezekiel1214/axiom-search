'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

const T = {
  bg: '#06060f',
  surface: '#0c0c1a',
  surface2: '#131325',
  border: '#1c1c30',
  borderHover: '#2e2e50',
  text: '#d0d0e8',
  text2: '#5a5a78',
  text3: '#8888aa',
  accent: '#00e5a0',
  accentDim: '#00e5a018',
  accentBorder: '#00e5a040',
};

const MODES = [
  { id: 'web',      label: 'Web',      hint: 'Real-time web search' },
  { id: 'research', label: 'Research', hint: 'Academic & papers' },
  { id: 'code',     label: 'Code',     hint: 'Docs & examples' },
  { id: 'quick',    label: 'Quick',    hint: 'Concise answer' },
];

const EXAMPLES = [
  'How do transformer attention mechanisms work?',
  'Latest developments in multi-agent AI systems',
  'Next.js 15 App Router best practices',
  'Vector database comparison: Pinecone vs pgvector vs Weaviate',
  'Retrieval-augmented generation architecture patterns',
  'How to implement streaming with the Anthropic API',
];

function getSystem(mode: string) {
  const common = `You are AXIOM, a universal AI search engine. Always use the web_search tool before responding to ensure accuracy and currency. After searching, synthesize the results into a clear, well-structured answer.\n\nWhen citing sources, use inline markdown links: [source title](url). Format your response using headers (## and ###), bullet lists, and code blocks where appropriate.`;
  const by_mode: Record<string, string> = {
    web:      'Provide a comprehensive, balanced answer covering multiple perspectives. Aim for depth and completeness.',
    research: 'Focus on academic sources, research papers, and authoritative references. Mention study authors, methodologies, and findings where relevant.',
    code:     'Prioritize working code examples, official documentation, and implementation patterns. Use code blocks with appropriate language tags. Be precise and technical.',
    quick:    'Answer in 2–3 tight paragraphs. Cut all padding. The most essential information only.',
  };
  return `${common}\n\n${by_mode[mode] || by_mode.web}`;
}

function renderInline(text: string, keyBase = 0): React.ReactNode[] {
  if (!text) return [];
  const parts: React.ReactNode[] = [];
  const re = /(\*\*(?:[^*]|\*(?!\*))+?\*\*|`[^`\n]+?`|\[([^\]]+)\]\((https?:\/\/[^)]+)\)|\*(?!\*)(?:[^*\n])+?(?<!\*)\*(?!\*))/g;
  let last = 0, m: RegExpExecArray | null, k = keyBase;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={k++}>{text.slice(last, m.index)}</span>);
    const s = m[0];
    if (s.startsWith('**')) {
      parts.push(<strong key={k++} style={{ color: T.text, fontWeight: 600 }}>{s.slice(2, -2)}</strong>);
    } else if (s.startsWith('`')) {
      parts.push(<code key={k++} style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '0.82em', background: T.surface2, color: T.accent, padding: '1px 5px', borderRadius: 3, border: `1px solid ${T.border}` }}>{s.slice(1, -1)}</code>);
    } else if (s.startsWith('[')) {
      parts.push(<a key={k++} href={m[3]} target="_blank" rel="noopener noreferrer" style={{ color: T.accent, textDecoration: 'none', borderBottom: `1px solid ${T.accentBorder}` }}>{m[2]}</a>);
    } else if (s.startsWith('*')) {
      parts.push(<em key={k++} style={{ color: T.text3, fontStyle: 'italic' }}>{s.slice(1, -1)}</em>);
    }
    last = m.index + s.length;
  }
  if (last < text.length) parts.push(<span key={k}>{text.slice(last)}</span>);
  return parts;
}

interface ParsedBlock {
  type: string;
  text?: string;
  code?: string;
  lang?: string;
  items?: string[];
}

function Md({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.split('\n');
  const els: ParsedBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (l.startsWith('```')) {
      const lang = l.slice(3).trim();
      let code = '';
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        code += (code ? '\n' : '') + lines[i]; i++;
      }
      els.push({ type: 'code', code, lang });
    } else if (l.startsWith('### ')) els.push({ type: 'h3', text: l.slice(4) });
    else if (l.startsWith('## '))  els.push({ type: 'h2', text: l.slice(3) });
    else if (l.startsWith('# '))   els.push({ type: 'h1', text: l.slice(2) });
    else if (l.match(/^[-*] /)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[-*] /)) { items.push(lines[i].slice(2)); i++; }
      els.push({ type: 'ul', items }); continue;
    } else if (l.match(/^\d+\. /)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) { items.push(lines[i].replace(/^\d+\. /, '')); i++; }
      els.push({ type: 'ol', items }); continue;
    } else if (l.match(/^---+$/)) els.push({ type: 'hr' });
    else if (!l.trim()) els.push({ type: 'gap' });
    else els.push({ type: 'p', text: l });
    i++;
  }

  return (
    <div>
      {els.map((e, idx) => {
        switch (e.type) {
          case 'h1': return <div key={idx} style={{ fontSize: 17, fontWeight: 600, color: T.text, margin: '16px 0 7px', letterSpacing: '-0.2px' }}>{renderInline(e.text!)}</div>;
          case 'h2': return <div key={idx} style={{ fontSize: 15, fontWeight: 600, color: T.text, margin: '14px 0 6px', letterSpacing: '-0.1px' }}>{renderInline(e.text!)}</div>;
          case 'h3': return <div key={idx} style={{ fontSize: 13.5, fontWeight: 600, color: T.text3, margin: '11px 0 4px', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: '"IBM Plex Mono", monospace' }}>{e.text}</div>;
          case 'p':  return <p key={idx} style={{ margin: '3px 0 9px', lineHeight: 1.78, color: T.text, fontSize: 14 }}>{renderInline(e.text!)}</p>;
          case 'ul': return (
            <ul key={idx} style={{ margin: '5px 0 10px', padding: 0, listStyle: 'none' }}>
              {e.items!.map((it, j) => (
                <li key={j} style={{ display: 'flex', gap: 9, margin: '3px 0', fontSize: 14, lineHeight: 1.65, color: T.text }}>
                  <span style={{ color: T.accent, flexShrink: 0, marginTop: 2 }}>·</span>
                  <span>{renderInline(it)}</span>
                </li>
              ))}
            </ul>
          );
          case 'ol': return (
            <ol key={idx} style={{ margin: '5px 0 10px', padding: 0, listStyle: 'none' }}>
              {e.items!.map((it, j) => (
                <li key={j} style={{ display: 'flex', gap: 9, margin: '3px 0', fontSize: 14, lineHeight: 1.65, color: T.text }}>
                  <span style={{ color: T.accent, fontFamily: '"IBM Plex Mono", monospace', fontSize: 11.5, flexShrink: 0, minWidth: 16, marginTop: 2 }}>{j + 1}.</span>
                  <span>{renderInline(it)}</span>
                </li>
              ))}
            </ol>
          );
          case 'code': return (
            <pre key={idx} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 7, padding: '11px 15px', margin: '8px 0 10px', fontSize: 12.5, fontFamily: '"IBM Plex Mono", monospace', color: '#9be0c0', overflow: 'auto', lineHeight: 1.55, whiteSpace: 'pre' }}>
              {e.lang && <div style={{ fontSize: 10, color: T.text2, marginBottom: 8, letterSpacing: '0.1em' }}>{e.lang.toUpperCase()}</div>}
              <code>{e.code}</code>
            </pre>
          );
          case 'hr':  return <hr key={idx} style={{ border: 'none', borderTop: `1px solid ${T.border}`, margin: '12px 0' }} />;
          case 'gap': return <div key={idx} style={{ height: 5 }} />;
          default: return null;
        }
      })}
    </div>
  );
}

function Searching() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep(s => (s + 1) % 4), 380);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', color: T.accent, fontSize: 12.5, fontFamily: '"IBM Plex Mono", monospace', letterSpacing: '0.02em' }}>
      <span style={{ display: 'flex', gap: 4 }}>
        {[0, 1, 2].map(j => (
          <span key={j} style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: T.accent, opacity: step === j ? 1 : 0.2, transition: 'opacity 0.2s' }} />
        ))}
      </span>
      <span>Searching the web</span>
    </div>
  );
}

interface Source { title: string; url: string; snippet?: string; }

function SourceCard({ src }: { src: Source }) {
  const [hov, setHov] = useState(false);
  let domain = '';
  try { domain = new URL(src.url).hostname.replace('www.', ''); } catch { domain = src.url; }
  return (
    <a href={src.url} target="_blank" rel="noopener noreferrer"
      style={{ display: 'block', textDecoration: 'none', background: hov ? T.surface2 : T.surface, border: `1px solid ${hov ? T.borderHover : T.border}`, borderRadius: 7, padding: '9px 12px', transition: 'all 0.12s' }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <div style={{ fontSize: 10.5, color: T.accent, fontFamily: '"IBM Plex Mono", monospace', marginBottom: 3, letterSpacing: '0.04em', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{domain}</div>
      <div style={{ fontSize: 12.5, color: hov ? T.text : T.text3, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{src.title || domain}</div>
    </a>
  );
}

function Cursor() {
  return <span style={{ display: 'inline-block', width: 7, height: 14, background: T.accent, marginLeft: 2, verticalAlign: 'text-bottom', animation: 'axiom-blink 0.75s step-end infinite' }} />;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode?: string;
  sources?: Source[];
  searching?: boolean;
  streaming?: boolean;
}

export default function AxiomSearch() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('web');
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasMessages = msgs.length > 0;

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);
  useEffect(() => { if (!loading) setTimeout(() => inputRef.current?.focus(), 80); }, [loading]);

  const search = useCallback(async (q?: string) => {
    const question = (q || query).trim();
    if (!question || loading) return;
    setQuery('');

    const uid = `u-${Date.now()}`;
    const aid = `a-${Date.now()}`;
    const snapMsgs = msgs;

    setMsgs(prev => [...prev,
      { id: uid, role: 'user', content: question, mode },
      { id: aid, role: 'assistant', content: '', sources: [], searching: false, streaming: true },
    ]);
    setLoading(true);

    try {
      const history = [...snapMsgs, { role: 'user' as const, content: question }]
        .filter(m => m.content && !m.streaming)
        .map(m => ({ role: m.role, content: m.content }));

      const cleanHistory = history.reduce((acc: typeof history, m) => {
        if (acc.length > 0 && acc[acc.length - 1].role === m.role) return acc;
        return [...acc, m];
      }, []);

      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          stream: true,
          system: getSystem(mode),
          messages: cleanHistory,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`API ${res.status}: ${errText.slice(0, 120)}`);
      }

      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = '', text = '', sources: Source[] = [];

      const upd = (patch: Partial<Message>) =>
        setMsgs(prev => prev.map(m => m.id === aid ? { ...m, ...patch } : m));

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6);
          if (raw === '[DONE]') continue;
          try {
            const ev = JSON.parse(raw);
            if (ev.type === 'content_block_start') {
              const blk = ev.content_block;
              if (blk?.type === 'tool_use' && blk?.name === 'web_search') upd({ searching: true });
              if (blk?.type === 'tool_result') {
                upd({ searching: false });
                for (const item of blk?.content || []) {
                  if (item?.type === 'document' && item?.document) {
                    const { title, url } = item.document;
                    if (url && !sources.some((s: Source) => s.url === url)) sources.push({ title: title || url, url });
                  }
                }
                upd({ sources: [...sources] });
              }
            }
            if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
              text += ev.delta.text;
              upd({ content: text, searching: false });
            }
            if (ev.type === 'message_stop') {
              const linkRe = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
              let lm;
              while ((lm = linkRe.exec(text)) !== null) {
                if (!sources.some((s: Source) => s.url === lm![2])) {
                  try { sources.push({ title: lm[1], url: lm[2] }); } catch {}
                }
              }
              upd({ content: text, sources: [...sources], streaming: false, searching: false });
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMsgs(prev => prev.map(m =>
        m.id === aid ? { ...m, content: `**Error:** ${msg}`, streaming: false, searching: false } : m
      ));
    } finally {
      setLoading(false);
    }
  }, [query, mode, msgs, loading]);

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, display: 'flex', flexDirection: 'column', fontFamily: '"Inter", system-ui, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 2px; }
        @keyframes axiom-blink  { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes axiom-fade   { from{opacity:0;transform:translateY(7px)} to{opacity:1;transform:translateY(0)} }
        @keyframes axiom-spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes axiom-pulse  { 0%,100%{opacity:0.6} 50%{opacity:1} }
        .axiom-msg { animation: axiom-fade 0.22s ease both; }
        input::placeholder { color: ${T.text2} !important; }
        input { caret-color: ${T.accent}; }
        button { font-family: inherit; }
      `}</style>

      {hasMessages && (
        <header style={{ position: 'sticky', top: 0, zIndex: 20, height: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: T.bg + 'f2', backdropFilter: 'blur(10px)', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 14, fontWeight: 500, color: T.accent, letterSpacing: '0.18em' }}>AXIOM</span>
            <span style={{ width: 1, height: 14, background: T.border }} />
            <span style={{ fontSize: 11.5, color: T.text2, fontFamily: '"IBM Plex Mono", monospace', letterSpacing: '0.06em' }}>universal search</span>
          </div>
          <button onClick={() => { setMsgs([]); setQuery(''); }}
            style={{ background: 'none', border: `1px solid ${T.border}`, color: T.text2, padding: '4px 13px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontFamily: '"IBM Plex Mono", monospace', letterSpacing: '0.08em', transition: 'all 0.12s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.text3; (e.currentTarget as HTMLButtonElement).style.color = T.text; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.border; (e.currentTarget as HTMLButtonElement).style.color = T.text2; }}>
            new search
          </button>
        </header>
      )}

      <main style={{ flex: 1, maxWidth: 780, width: '100%', margin: '0 auto', padding: '0 20px', display: 'flex', flexDirection: 'column' }}>
        {!hasMessages && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: 130 }}>
            <div style={{ textAlign: 'center', marginBottom: 44 }}>
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
                <div style={{ fontSize: 52, fontWeight: 600, fontFamily: '"IBM Plex Mono", monospace', color: T.accent, letterSpacing: '0.14em', lineHeight: 1 }}>AXIOM</div>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${T.accent}, transparent)`, animation: 'axiom-pulse 2.5s ease-in-out infinite' }} />
              </div>
              <div style={{ fontSize: 13.5, color: T.text2, letterSpacing: '0.02em', marginTop: 10 }}>
                Universal AI search — web, research, code, and more
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 9, width: '100%', maxWidth: 600 }}>
              {EXAMPLES-map((ex, i) => (
                <button key={i} onClick={() => search(ex)}
                  style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 9, padding: '11px 15px', cursor: 'pointer', color: T.text2, fontSize: 13, textAlign: 'left', lineHeight: 1.45, transition: 'all 0.13s', display: 'flex', alignItems: 'flex-start', gap: 8 }}
                  onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = T.accentBorder; b.style.color = T.text; b.style.background = T.surface2; }}
                  onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = T.border; b.style.color = T.text2; b.style.background = T.surface; }}>
                  <span style={{ color: T.border, fontSize: 12, fontFamily: 'monospace', flexShrink: 0, marginTop: 1 }}>→</span>
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {hasMessages && (
          <div style={{ flex: 1, paddingTop: 32, paddingBottom: 170 }}>
            {msgs.map(msg => (
              <div key={msg.id} className="axiom-msg" style={{ marginBottom: 30 }}>
                {msg.role === 'user' ? (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ maxWidth: '76%' }}>
                      <div style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 12, borderBottomRightRadius: 4, padding: '11px 16px' }}>
                        <div style={{ fontSize: 14, color: T.text, lineHeight: 1.6 }}>{msg.content}</div>
                      </div>
                      <div style={{ textAlign: 'right', marginTop: 5, fontSize: 10, color: T.text2, fontFamily: '"IBM Plex Mono", monospace', letterSpacing: '0.1em' }}>
                        {msg.mode?.toUpperCase()} MODE
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    {msg.searching && <div style={{ marginBottom: 12 }}><Searching /></div>}
                    {(msg.content || (msg.streaming && !msg.searching)) && (
                      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, borderTopLeftRadius: 4, padding: '16px 18px' }}>
                        <Md text={msg.content} />
                        {msg.streaming && !msg.searching && <Cursor />}
                      </div>
                    )}
                    {msg.sources && msg.sources.length > 0 && !msg.streaming && (
                      <div style={{ marginTop: 11 }}>
                        <div style={{ fontSize: 10, color: T.text2, fontFamily: '"IBM Plex Mono", monospace', letterSpacing: '0.12em', marginBottom: 8 }}>
                          SOURCES — {msg.sources.length}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 7 }}>
                          {msg.sources.map((src, i) => <SourceCard key={i} src={src} />)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </main>

      <div style={{
        position: hasMessages ? 'fixed' : 'relative',
        bottom: 0, left: 0, right: 0, zIndex: 15,
        background: hasMessages ? T.bg + 'f5' : 'transparent',
        backdropFilter: hasMessages ? 'blur(14px)' : 'none',
        borderTop: hasMessages ? `1px solid ${T.border}` : 'none',
        padding: hasMessages ? '14px 20px 20px' : '0 0 24px',
      }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
            {MODES.map(m => (
              <button key={m.id} onClick={() => setMode(m.id)} title={m.hint}
                style={{ background: mode === m.id ? T.accentDim : 'none', border: `1px solid ${mode === m.id ? T.accentBorder : T.border}`, color: mode === m.id ? T.accent : T.text2, padding: '4px 13px', borderRadius: 4, cursor: 'pointer', fontSize: 11.5, fontFamily: '"IBM Plex Mono", monospace', letterSpacing: '0.06em', transition: 'all 0.12s' }}>
                {m.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); search(); } }}
              placeholder={`Ask anything — ${MODES.find(m => m.id === mode)?.hint?.toLowerCase() || 'search'}`}
              disabled={loading}
              style={{ flex: 1, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 17px', color: T.text, fontSize: 14.5, fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.15s' }}
              onFocus={e => { (e.target as HTMLInputElement).style.borderColor = T.accentBorder; }}
              onBlur={e => { (e.target as HTMLInputElement).style.borderColor = T.border; }}
            />
            <button onClick={() => search()} disabled={!query.trim() || loading}
              style={{ background: loading ? T.surface : (query.trim() ? T.accent : T.surface), border: `1px solid ${loading ? T.border : (query.trim() ? T.accent : T.border)}`, borderRadius: 10, width: 46, cursor: (loading || !query.trim()) ? 'not-allowed' : 'pointer', color: loading ? T.text2 : (query.trim() ? '#041a0e' : T.text2), fontSize: 20, fontWeight: 700, transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {loading ? <span style={{ fontSize: 16, display: 'inline-block', animation: 'axiom-spin 1.1s linear infinite', opacity: 0.7 }}>◌</span> : '↑'}
            </button>
          </div>
          {hasMessages && (
            <div style={{ marginTop: 8, textAlign: 'center', fontSize: 11, color: T.text2, fontFamily: '"IBM Plex Mono", monospace' }}>
              {msgs.filter(m => m.role === 'user').length} {msgs.filter(m => m.role === 'user').length === 1 ? 'query' : 'queries'} · enter to search
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
