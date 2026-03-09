'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

/* ─── StoryReader ───────────────────────────────────────────────────────────
   Full-screen cinematic storybook reader.
   Props:
     chapters  – array of { id, chapter_number, title, content }
     childName – string
     avatarUrl – string | null
     onClose   – callback
     onRegenerate – callback
──────────────────────────────────────────────────────────────────────────── */
export default function StoryReader({ chapters = [], childName, avatarUrl, onClose, onRegenerate }) {
  const [page, setPage] = useState(-1);          // -1 = cover
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back
  const [animating, setAnimating] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const typeRef = useRef(null);
  const hideTimer = useRef(null);
  const totalPages = chapters.length; // cover=-1, chapters 0..n-1, end=n

  // ── Typewriter effect ──
  useEffect(() => {
    if (page < 0 || page >= totalPages) { setTypedText(''); return; }
    const text = chapters[page]?.content || '';
    setTypedText('');
    setIsTyping(true);
    let i = 0;
    clearInterval(typeRef.current);
    // Fast typing — ~6ms per char, whole chapter in ~2s for 300 chars
    typeRef.current = setInterval(() => {
      i++;
      setTypedText(text.slice(0, i));
      if (i >= text.length) { clearInterval(typeRef.current); setIsTyping(false); }
    }, 8);
    return () => clearInterval(typeRef.current);
  }, [page, totalPages]);

  // ── Show controls briefly on interaction ──
  const flashControls = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  useEffect(() => {
    flashControls();
    return () => clearTimeout(hideTimer.current);
  }, [page]);

  // ── Keyboard navigation ──
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') navigate(1);
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') navigate(-1);
      if (e.key === 'Escape') onClose?.();
      flashControls();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [page, animating]);

  // ── Touch swipe ──
  const touchStart = useRef(null);
  const onTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (!touchStart.current) return;
    const dx = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(dx) > 50) navigate(dx > 0 ? 1 : -1);
    touchStart.current = null;
  };

  const navigate = (dir) => {
    if (animating) return;
    const next = page + dir;
    if (next < -1 || next > totalPages) return;
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => {
      setPage(next);
      setAnimating(false);
    }, 380);
  };

  const isCover = page === -1;
  const isEnd = page === totalPages;
  const currentChapter = !isCover && !isEnd ? chapters[page] : null;
  const progress = isCover ? 0 : isEnd ? 1 : (page + 1) / totalPages;

  // ── Ambient colours per chapter ──
  const palettes = [
    { bg: '#0F1A2E', text: '#E8D5B0', accent: '#D4956A', glow: '#1E3A5F' },
    { bg: '#1A0F1E', text: '#E8D5E8', accent: '#C490C8', glow: '#3A1F42' },
    { bg: '#0F1E0F', text: '#D5E8C8', accent: '#7AB87A', glow: '#1A3A1A' },
    { bg: '#1E1A0F', text: '#E8E0C8', accent: '#C8B870', glow: '#3A3010' },
    { bg: '#1E0F0F', text: '#E8D0C8', accent: '#C87A6A', glow: '#3A1810' },
    { bg: '#0F1E1E', text: '#C8E8E8', accent: '#6AAAC8', glow: '#103A3A' },
  ];
  const pal = isCover
    ? { bg: '#0D0A06', text: '#FAF6F0', accent: '#C4966A', glow: '#2A1E10' }
    : isEnd
    ? { bg: '#0D0A06', text: '#FAF6F0', accent: '#C4966A', glow: '#2A1E10' }
    : palettes[(page || 0) % palettes.length];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,700;1,400;1,500&family=Lato:wght@300;400&display=swap');

        .sr-root {
          position: fixed; inset: 0; z-index: 1000;
          background: #0D0A06;
          font-family: 'Lato', sans-serif;
          overflow: hidden; user-select: none;
          transition: background 0.8s ease;
        }

        /* ── Particles ── */
        .sr-particles {
          position: absolute; inset: 0; pointer-events: none; z-index: 0;
          overflow: hidden;
        }
        .sr-particle {
          position: absolute; border-radius: 50%;
          animation: sr-float linear infinite;
          opacity: 0;
        }
        @keyframes sr-float {
          0%   { transform: translateY(100vh) scale(0); opacity: 0; }
          10%  { opacity: 0.6; }
          90%  { opacity: 0.3; }
          100% { transform: translateY(-10vh) scale(1.5); opacity: 0; }
        }

        /* ── Ambient glow ── */
        .sr-glow {
          position: absolute; border-radius: 50%;
          pointer-events: none; z-index: 0;
          transition: all 1.2s ease;
          filter: blur(80px); opacity: 0.25;
        }

        /* ── Page ── */
        .sr-page {
          position: absolute; inset: 0; z-index: 1;
          display: flex; align-items: center; justify-content: center;
          padding: 0 5vw;
          will-change: transform, opacity;
          transition: transform 0.38s cubic-bezier(0.4,0,0.2,1), opacity 0.38s ease;
        }
        .sr-page.entering-fwd  { transform: translateX(0);    opacity: 1; }
        .sr-page.exiting-fwd   { transform: translateX(-8vw); opacity: 0; }
        .sr-page.entering-back { transform: translateX(0);    opacity: 1; }
        .sr-page.exiting-back  { transform: translateX(8vw);  opacity: 0; }
        .sr-page.animating-fwd  { transform: translateX(-8vw); opacity: 0; }
        .sr-page.animating-back { transform: translateX(8vw);  opacity: 0; }

        /* ── Book card ── */
        .sr-card {
          position: relative; z-index: 2;
          max-width: 720px; width: 100%;
          padding: 56px 64px;
          text-align: center;
        }
        @media (max-width: 600px) { .sr-card { padding: 40px 28px; } }

        /* ── Cover ── */
        .sr-cover-avatar {
          width: 110px; height: 110px; border-radius: 50%;
          object-fit: cover; display: block; margin: 0 auto 28px;
          border: 3px solid rgba(196,150,106,0.35);
          box-shadow: 0 0 40px rgba(196,150,106,0.15);
          animation: sr-avatar-glow 4s ease-in-out infinite;
        }
        @keyframes sr-avatar-glow {
          0%,100% { box-shadow: 0 0 30px rgba(196,150,106,0.15); }
          50%      { box-shadow: 0 0 60px rgba(196,150,106,0.35); }
        }
        .sr-cover-avatar-placeholder {
          width: 110px; height: 110px; border-radius: 50%;
          background: rgba(196,150,106,0.1);
          display: flex; align-items: center; justify-content: center;
          font-size: 48px; margin: 0 auto 28px;
          border: 2px solid rgba(196,150,106,0.2);
        }
        .sr-cover-eyebrow {
          font-size: 10px; letter-spacing: 5px; text-transform: uppercase;
          opacity: 0.4; margin-bottom: 16px;
          animation: sr-fadein 1s ease 0.3s both;
        }
        .sr-cover-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(36px, 7vw, 64px);
          font-weight: 400; line-height: 1.15; margin-bottom: 12px;
          animation: sr-fadein 1s ease 0.5s both;
        }
        .sr-cover-title em { font-style: italic; }
        .sr-cover-sub {
          font-size: 14px; opacity: 0.4; letter-spacing: 1px;
          margin-bottom: 48px;
          animation: sr-fadein 1s ease 0.7s both;
        }
        .sr-cover-begin {
          display: inline-flex; align-items: center; gap: 10px;
          padding: 14px 36px; border-radius: 50px;
          border: 1px solid rgba(196,150,106,0.4);
          font-size: 12px; letter-spacing: 2.5px; text-transform: uppercase;
          cursor: pointer; background: none;
          font-family: 'Lato', sans-serif;
          transition: all 0.3s; color: inherit;
          animation: sr-fadein 1s ease 0.9s both;
        }
        .sr-cover-begin:hover {
          background: rgba(196,150,106,0.12);
          border-color: rgba(196,150,106,0.8);
          transform: translateY(-2px);
        }
        .sr-cover-begin-arrow {
          animation: sr-bounce 2s ease-in-out infinite;
        }
        @keyframes sr-bounce {
          0%,100% { transform: translateX(0); }
          50%      { transform: translateX(5px); }
        }

        /* ── Chapter page ── */
        .sr-chapter-num {
          font-size: 10px; letter-spacing: 4px; text-transform: uppercase;
          opacity: 0.35; margin-bottom: 20px;
        }
        .sr-chapter-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(24px, 4vw, 38px);
          font-weight: 400; font-style: italic;
          line-height: 1.25; margin-bottom: 36px;
          transition: color 0.8s;
        }
        .sr-chapter-divider {
          width: 48px; height: 1px; margin: 0 auto 36px;
          opacity: 0.25; border-radius: 2px;
        }
        .sr-chapter-body {
          font-family: 'Playfair Display', serif;
          font-size: clamp(15px, 2.2vw, 18px);
          font-style: italic; line-height: 1.95;
          opacity: 0.85; min-height: 180px;
          text-align: left; white-space: pre-line;
        }
        .sr-cursor {
          display: inline-block; width: 2px; height: 1.1em;
          background: currentColor; margin-left: 2px;
          vertical-align: middle; animation: sr-blink 0.8s step-end infinite;
        }
        @keyframes sr-blink { 0%,100%{opacity:1} 50%{opacity:0} }

        /* ── End page ── */
        .sr-end-icon { font-size: 56px; margin-bottom: 24px; }
        .sr-end-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(28px, 5vw, 46px);
          font-weight: 400; margin-bottom: 12px;
          animation: sr-fadein 0.8s ease both;
        }
        .sr-end-sub {
          font-size: 14px; opacity: 0.45;
          margin-bottom: 40px; letter-spacing: 0.5px;
          animation: sr-fadein 0.8s ease 0.2s both;
        }
        .sr-end-btns {
          display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;
          animation: sr-fadein 0.8s ease 0.4s both;
        }
        .sr-btn-light {
          padding: 12px 28px; border-radius: 50px;
          border: 1px solid rgba(196,150,106,0.4); background: none;
          font-size: 12px; letter-spacing: 2px; text-transform: uppercase;
          cursor: pointer; color: inherit; font-family: 'Lato', sans-serif;
          transition: all 0.25s;
        }
        .sr-btn-light:hover { background: rgba(196,150,106,0.12); border-color: rgba(196,150,106,0.8); }
        .sr-btn-solid {
          padding: 12px 28px; border-radius: 50px;
          background: rgba(196,150,106,0.2); border: 1px solid rgba(196,150,106,0.5);
          font-size: 12px; letter-spacing: 2px; text-transform: uppercase;
          cursor: pointer; color: inherit; font-family: 'Lato', sans-serif;
          transition: all 0.25s;
        }
        .sr-btn-solid:hover { background: rgba(196,150,106,0.35); }

        /* ── Progress bar ── */
        .sr-progress-wrap {
          position: fixed; top: 0; left: 0; right: 0; height: 2px; z-index: 20;
          background: rgba(255,255,255,0.05);
        }
        .sr-progress-bar {
          height: 100%; transition: width 0.6s cubic-bezier(0.4,0,0.2,1),
                                     background 0.8s ease;
          border-radius: 0 2px 2px 0;
        }

        /* ── Top controls ── */
        .sr-top-bar {
          position: fixed; top: 0; left: 0; right: 0; z-index: 10;
          padding: 20px 28px;
          display: flex; align-items: center; justify-content: space-between;
          background: linear-gradient(to bottom, rgba(0,0,0,0.4), transparent);
          transition: opacity 0.4s;
        }
        .sr-book-label {
          font-size: 11px; letter-spacing: 2.5px; text-transform: uppercase;
          opacity: 0.4; font-family: 'Lato', sans-serif;
        }
        .sr-close-btn {
          width: 36px; height: 36px; border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.15);
          background: rgba(0,0,0,0.3); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; color: white; transition: all 0.2s;
        }
        .sr-close-btn:hover { background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.4); }

        /* ── Chapter nav dots ── */
        .sr-dots-wrap {
          position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
          z-index: 10; display: flex; gap: 8px; align-items: center;
          transition: opacity 0.4s;
        }
        .sr-dot {
          border-radius: 50%; border: none; cursor: pointer;
          transition: all 0.3s; padding: 0; background: rgba(255,255,255,0.2);
        }
        .sr-dot.active { background: currentColor; }

        /* ── Bottom nav ── */
        .sr-nav-wrap {
          position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
          z-index: 10; display: flex; align-items: center; gap: 16px;
          transition: opacity 0.4s;
        }
        .sr-nav-btn {
          width: 48px; height: 48px; border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.15);
          background: rgba(0,0,0,0.4); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; color: white; transition: all 0.25s;
          backdrop-filter: blur(8px);
        }
        .sr-nav-btn:hover:not(:disabled) { background: rgba(255,255,255,0.15); transform: scale(1.1); }
        .sr-nav-btn:disabled { opacity: 0.2; cursor: not-allowed; transform: none; }
        .sr-page-counter {
          font-size: 12px; letter-spacing: 1.5px;
          opacity: 0.4; min-width: 60px; text-align: center;
          font-family: 'Lato', sans-serif;
          color: white;
        }

        @keyframes sr-fadein { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes sr-scalein { from{opacity:0;transform:scale(0.94)} to{opacity:1;transform:scale(1)} }
      `}</style>

      {/* Root */}
      <div
        className="sr-root"
        style={{ background: pal.bg, color: pal.text }}
        onMouseMove={flashControls}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Ambient particles */}
        <Particles accent={pal.accent} />

        {/* Glow orbs */}
        <div className="sr-glow" style={{ width: 400, height: 400, background: pal.glow, top: '-100px', right: '-100px' }} />
        <div className="sr-glow" style={{ width: 300, height: 300, background: pal.glow, bottom: '-80px', left: '-60px' }} />

        {/* Progress bar */}
        <div className="sr-progress-wrap">
          <div className="sr-progress-bar" style={{ width: `${progress * 100}%`, background: `linear-gradient(90deg, ${pal.accent}88, ${pal.accent})` }} />
        </div>

        {/* Top bar */}
        <div className="sr-top-bar" style={{ opacity: showControls ? 1 : 0 }}>
          <span className="sr-book-label" style={{ color: pal.text }}>
            {childName}'s Story
          </span>
          <button className="sr-close-btn" onClick={onClose}>×</button>
        </div>

        {/* Page content */}
        <div
          className={`sr-page ${animating ? (direction > 0 ? 'animating-fwd' : 'animating-back') : ''}`}
        >
          {isCover && <CoverPage childName={childName} avatarUrl={avatarUrl} chapters={chapters} accent={pal.accent} onBegin={() => navigate(1)} />}
          {currentChapter && (
            <ChapterPage
              chapter={currentChapter}
              typedText={typedText}
              isTyping={isTyping}
              accent={pal.accent}
              skipTyping={() => { clearInterval(typeRef.current); setTypedText(currentChapter.content); setIsTyping(false); }}
            />
          )}
          {isEnd && <EndPage childName={childName} chapters={chapters} accent={pal.accent} onClose={onClose} onRegenerate={onRegenerate} onRestart={() => setPage(-1)} />}
        </div>

        {/* Chapter dots */}
        {!isCover && !isEnd && totalPages > 1 && (
          <div className="sr-dots-wrap" style={{ opacity: showControls ? 1 : 0, color: pal.accent }}>
            {chapters.map((_, i) => (
              <button
                key={i}
                className={`sr-dot ${i === page ? 'active' : ''}`}
                style={{ width: i === page ? 24 : 7, height: 7 }}
                onClick={() => { setDirection(i > page ? 1 : -1); setAnimating(true); setTimeout(() => { setPage(i); setAnimating(false); }, 380); }}
              />
            ))}
          </div>
        )}

        {/* Nav buttons */}
        <div className="sr-nav-wrap" style={{ opacity: showControls ? 1 : 0 }}>
          <button className="sr-nav-btn" onClick={() => navigate(-1)} disabled={page === -1}>‹</button>
          <span className="sr-page-counter">
            {isCover ? 'Cover' : isEnd ? 'Fin' : `${page + 1} / ${totalPages}`}
          </span>
          <button className="sr-nav-btn" onClick={() => navigate(1)} disabled={isEnd}>›</button>
        </div>
      </div>
    </>
  );
}

/* ─── Floating particles ─────────────────────────────────────────────────── */
function Particles({ accent }) {
  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    left: `${5 + (i * 37) % 91}%`,
    size: 2 + (i * 3) % 4,
    duration: 8 + (i * 2.3) % 14,
    delay: (i * 1.7) % 12,
    opacity: 0.15 + (i % 5) * 0.07,
  }));
  return (
    <div className="sr-particles">
      {particles.map(p => (
        <div
          key={p.id}
          className="sr-particle"
          style={{
            left: p.left, width: p.size, height: p.size,
            background: accent,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            opacity: p.opacity,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Cover page ─────────────────────────────────────────────────────────── */
function CoverPage({ childName, avatarUrl, chapters, accent, onBegin }) {
  return (
    <div className="sr-card" style={{ animation: 'sr-scalein 0.6s ease both' }}>
      {avatarUrl
        ? <img src={avatarUrl} alt={childName} className="sr-cover-avatar" />
        : <div className="sr-cover-avatar-placeholder">📖</div>}

      <div className="sr-cover-eyebrow">A Family Story</div>

      <h1 className="sr-cover-title">
        The Story of<br /><em>{childName}</em>
      </h1>

      <p className="sr-cover-sub">
        {chapters.length} {chapters.length === 1 ? 'Chapter' : 'Chapters'} · Written by your family
      </p>

      <button className="sr-cover-begin" style={{ color: accent, borderColor: `${accent}55` }} onClick={onBegin}>
        Begin Reading
        <span className="sr-cover-begin-arrow">→</span>
      </button>
    </div>
  );
}

/* ─── Chapter page ───────────────────────────────────────────────────────── */
function ChapterPage({ chapter, typedText, isTyping, accent, skipTyping }) {
  return (
    <div
      className="sr-card"
      style={{ animation: 'sr-scalein 0.5s ease both', cursor: isTyping ? 'pointer' : 'default' }}
      onClick={isTyping ? skipTyping : undefined}
      title={isTyping ? 'Click to read instantly' : ''}
    >
      <div className="sr-chapter-num" style={{ color: accent }}>
        Chapter {chapter.chapter_number}
      </div>

      <h2 className="sr-chapter-title" style={{ color: `rgba(${hexToRgb(accent)},0.9)` }}>
        {chapter.title}
      </h2>

      <div className="sr-chapter-divider" style={{ background: accent }} />

      <p className="sr-chapter-body">
        {typedText}
        {isTyping && <span className="sr-cursor" style={{ background: accent }} />}
      </p>

      {isTyping && (
        <div style={{ fontSize: 11, opacity: 0.3, marginTop: 20, letterSpacing: 1.5, textAlign: 'center' }}>
          Tap to skip
        </div>
      )}
    </div>
  );
}

/* ─── End page ───────────────────────────────────────────────────────────── */
function EndPage({ childName, chapters, accent, onClose, onRegenerate, onRestart }) {
  return (
    <div className="sr-card" style={{ animation: 'sr-scalein 0.6s ease both' }}>
      <div className="sr-end-icon">✦</div>
      <h2 className="sr-end-title">
        The story continues…
      </h2>
      <p className="sr-end-sub">
        {chapters.length} chapters written · more memories, more chapters
      </p>
      <div className="sr-end-btns">
        <button className="sr-btn-light" style={{ color: accent, borderColor: `${accent}44` }} onClick={onRestart}>
          ↩ Read again
        </button>
        <button className="sr-btn-light" style={{ color: accent, borderColor: `${accent}44` }} onClick={onRegenerate}>
          ↻ Regenerate
        </button>
        <button className="sr-btn-solid" style={{ color: accent, borderColor: `${accent}55`, background: `${accent}18` }} onClick={onClose}>
          ✕ Close
        </button>
      </div>
    </div>
  );
}

/* ─── Helper ─────────────────────────────────────────────────────────────── */
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}