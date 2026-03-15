'use client';
import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    const navbar = document.getElementById('navbar');
    const handleScroll = () => {
      navbar.classList.toggle('scrolled', window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll);

    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add('visible'), i * 100);
        }
      });
    }, { threshold: 0.15 });
    reveals.forEach(el => observer.observe(el));

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400;1,600&family=Jost:wght@300;400;500&display=swap');
        :root {
          --cream: #FAF7F2; --blush: #F2E4DC; --sage: #D6E5D8;
          --lavender: #E4DEED; --dusty-rose: #E8D5D0;
          --warm-tan: #C9B8A8; --text-dark: #2E2118;
          --text-mid: #6B5744; --text-light: #A8917E; --accent: #B07D5B;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body { background-color: var(--cream); color: var(--text-dark); font-family: 'Jost', sans-serif; font-weight: 300; overflow-x: hidden; }

        nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 24px 60px; transition: all 0.4s ease;
        }
        nav.scrolled {
          background: rgba(250,247,242,0.9); backdrop-filter: blur(16px);
          padding: 16px 60px; border-bottom: 1px solid rgba(201,184,168,0.25);
        }
        .nav-logo {
          font-family: 'Cormorant Garamond', serif; font-size: 26px;
          font-weight: 600; color: var(--text-dark); letter-spacing: 1px;
          display: flex; align-items: center; gap: 10px; text-decoration: none;
        }
        .nav-links { display: flex; align-items: center; gap: 36px; }
        .nav-links a {
          font-size: 13px; letter-spacing: 1.5px; text-transform: uppercase;
          color: var(--text-mid); text-decoration: none; transition: color 0.3s;
        }
        .nav-links a:hover { color: var(--text-dark); }
        .btn-nav {
          background: var(--text-dark) !important; color: var(--cream) !important;
          padding: 10px 24px; border-radius: 40px; font-size: 12px !important;
          letter-spacing: 1.5px; transition: all 0.3s !important;
        }
        .btn-nav:hover { background: var(--accent) !important; transform: translateY(-1px); }

        .hero {
          min-height: 100vh; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          text-align: center; padding: 140px 40px 80px; position: relative;
        }
        .blob { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.45; pointer-events: none; }
        .blob-1 { width:500px;height:500px; background:radial-gradient(circle,#F2E4DC,transparent); top:-100px;left:-150px; }
        .blob-2 { width:400px;height:400px; background:radial-gradient(circle,#E4DEED,transparent); top:100px;right:-100px; }
        .blob-3 { width:350px;height:350px; background:radial-gradient(circle,#D6E5D8,transparent); bottom:0;left:50%;transform:translateX(-50%); }

        .hero-tag {
          display: inline-flex; align-items: center; gap: 8px;
          background: white; border: 1px solid rgba(201,184,168,0.4);
          padding: 8px 20px; border-radius: 40px; font-size: 12px;
          letter-spacing: 2px; text-transform: uppercase; color: var(--text-light);
          margin-bottom: 40px; animation: fadeUp 1s ease forwards; opacity: 0; animation-delay: 0.2s;
        }
        .hero-tag::before { content:''; width:6px;height:6px; background:var(--accent); border-radius:50%; }

        .hero-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(52px,7vw,96px); font-weight: 300;
          line-height: 1.08; letter-spacing: -1px;
          color: var(--text-dark); max-width: 800px; margin-bottom: 28px;
          animation: fadeUp 1s ease forwards; opacity: 0; animation-delay: 0.4s;
        }
        .hero-title em { font-style: italic; color: var(--accent); font-weight: 400; }

        .hero-subtitle {
          font-size: 17px; font-weight: 300; color: var(--text-mid);
          line-height: 1.8; max-width: 500px; margin-bottom: 52px;
          animation: fadeUp 1s ease forwards; opacity: 0; animation-delay: 0.6s;
        }

        .hero-buttons {
          display: flex; gap: 16px; flex-wrap: wrap; justify-content: center;
          animation: fadeUp 1s ease forwards; opacity: 0; animation-delay: 0.8s;
        }
        .btn-primary {
          background: var(--text-dark); color: var(--cream);
          padding: 16px 36px; border-radius: 50px;
          font-family: 'Jost', sans-serif; font-size: 13px; font-weight: 500;
          letter-spacing: 1.5px; text-transform: uppercase;
          border: none; cursor: pointer; transition: all 0.3s ease;
          text-decoration: none; display: inline-block;
        }
        .btn-primary:hover { background: var(--accent); transform: translateY(-3px); box-shadow: 0 12px 40px rgba(176,125,91,0.3); }
        .btn-ghost {
          background: transparent; color: var(--text-dark);
          padding: 15px 36px; border-radius: 50px;
          font-family: 'Jost', sans-serif; font-size: 13px; font-weight: 400;
          letter-spacing: 1.5px; text-transform: uppercase;
          border: 1px solid rgba(46,33,24,0.25); cursor: pointer;
          transition: all 0.3s; text-decoration: none; display: inline-block;
        }
        .btn-ghost:hover { border-color: var(--accent); color: var(--accent); transform: translateY(-3px); }

        .story-preview-wrapper {
          margin-top: 80px; width: 100%; max-width: 680px;
          animation: fadeUp 1.2s ease forwards; opacity: 0;
          animation-delay: 1s; position: relative;
        }
        .story-card {
          background: white; border-radius: 24px; padding: 48px 52px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.02), 0 20px 60px rgba(46,33,24,0.08), 0 0 0 1px rgba(201,184,168,0.2);
          text-align: left; position: relative; overflow: hidden;
        }
        .story-card::before {
          content: ''; position: absolute; top:0;left:0;right:0; height: 3px;
          background: linear-gradient(90deg, var(--blush), var(--lavender), var(--sage));
        }
        .story-card-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .story-chapter-tag { font-size: 10px; letter-spacing: 2.5px; text-transform: uppercase; color: var(--accent); font-weight: 500; }
        .story-page-label { font-size: 11px; color: var(--text-light); letter-spacing: 1px; }
        .story-title { font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 600; color: var(--text-dark); margin-bottom: 20px; line-height: 1.3; }
        .story-text { font-family: 'Cormorant Garamond', serif; font-size: 17px; color: var(--text-mid); line-height: 1.9; font-style: italic; }
        .story-text strong { font-style: normal; font-weight: 600; color: var(--text-dark); }
        .story-fade { position: absolute; bottom:0;left:0;right:0; height: 80px; background: linear-gradient(transparent, white); }

        .float-pill {
          position: absolute; border-radius: 50px; font-size: 11px;
          font-weight: 500; letter-spacing: 0.5px; padding: 8px 16px;
          white-space: nowrap; animation: floatPill 4s ease-in-out infinite;
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
        }
        .pill-1 { background: var(--blush); color: var(--text-mid); top: 20px; left: -120px; }
        .pill-2 { background: var(--sage); color: #4A6741; top: 80px; right: -130px; animation-delay: 1s; }
        .pill-3 { background: var(--lavender); color: #5A4A6B; bottom: 60px; left: -100px; animation-delay: 2s; }

        .section-divider { display:flex; align-items:center; gap:20px; padding:0 60px; margin:20px 0; opacity:0.3; }
        .section-divider::before,.section-divider::after { content:''; flex:1; height:1px; background:var(--warm-tan); }
        .section-divider span { font-size:12px; letter-spacing:3px; text-transform:uppercase; color:var(--warm-tan); }

        .section { padding: 100px 60px; max-width: 1100px; margin: 0 auto; }
        .section-label { font-size:11px; letter-spacing:3px; text-transform:uppercase; color:var(--text-light); margin-bottom:16px; display:flex; align-items:center; gap:12px; }
        .section-label::before { content:''; width:30px; height:1px; background:var(--text-light); }
        .section-title { font-family:'Cormorant Garamond',serif; font-size:clamp(36px,4vw,56px); font-weight:300; line-height:1.15; color:var(--text-dark); max-width:520px; margin-bottom:70px; }
        .section-title em { font-style:italic; color:var(--accent); }

        .steps-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:32px; }
        .step-card { background:white; border-radius:20px; padding:40px 36px; border:1px solid rgba(201,184,168,0.2); transition:all 0.4s ease; position:relative; overflow:hidden; }
        .step-card:hover { transform:translateY(-6px); box-shadow:0 20px 60px rgba(46,33,24,0.08); }
        .step-icon { width:52px;height:52px; border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:22px; margin-bottom:24px; }
        .icon-blush { background:var(--blush); }
        .icon-sage { background:var(--sage); }
        .icon-lavender { background:var(--lavender); }
        .step-number { font-size:11px; letter-spacing:2px; color:var(--text-light); text-transform:uppercase; margin-bottom:10px; }
        .step-title { font-family:'Cormorant Garamond',serif; font-size:22px; font-weight:600; color:var(--text-dark); margin-bottom:12px; }
        .step-desc { font-size:14px; line-height:1.8; color:var(--text-mid); }

        .family-section { background:white; padding:100px 0; }
        .family-inner { max-width:1100px; margin:0 auto; padding:0 60px; display:grid; grid-template-columns:1fr 1fr; gap:80px; align-items:center; }
        .family-visual { position:relative; height:420px; }
        .family-bubble { position:absolute; border-radius:20px; padding:24px 28px; box-shadow:0 8px 32px rgba(0,0,0,0.06); }
        .bubble-1 { background:var(--blush); top:0;left:0; width:240px; }
        .bubble-2 { background:var(--sage); top:80px;right:0; width:220px; }
        .bubble-3 { background:var(--lavender); bottom:40px;left:40px; width:200px; }
        .bubble-role { font-size:10px; letter-spacing:2px; text-transform:uppercase; color:var(--text-light); margin-bottom:8px; }
        .bubble-text { font-family:'Cormorant Garamond',serif; font-size:15px; font-style:italic; color:var(--text-dark); line-height:1.6; }
        .family-desc { font-size:16px; line-height:1.9; color:var(--text-mid); margin-bottom:40px; }

        .quote-section { padding:100px 60px; text-align:center; max-width:800px; margin:0 auto; }
        .quote-mark { font-family:'Cormorant Garamond',serif; font-size:80px; color:var(--blush); line-height:0.5; margin-bottom:32px; }
        .quote-text { font-family:'Cormorant Garamond',serif; font-size:clamp(24px,3vw,36px); font-weight:300; font-style:italic; color:var(--text-dark); line-height:1.6; margin-bottom:28px; }
        .quote-author { font-size:12px; letter-spacing:2px; text-transform:uppercase; color:var(--text-light); }

        .cta-section { margin:0 60px 100px; border-radius:32px; background:linear-gradient(135deg,#2E2118 0%,#4A3428 100%); padding:80px; text-align:center; position:relative; overflow:hidden; }
        .cta-section::before { content:''; position:absolute; top:-100px;right:-100px; width:300px;height:300px; background:radial-gradient(circle,rgba(242,228,220,0.1),transparent); border-radius:50%; }
        .cta-title { font-family:'Cormorant Garamond',serif; font-size:clamp(36px,4vw,56px); font-weight:300; color:#FAF7F2; margin-bottom:16px; position:relative;z-index:1; }
        .cta-title em { font-style:italic; color:#E8D5D0; }
        .cta-subtitle { font-size:15px; color:rgba(250,247,242,0.6); margin-bottom:44px; line-height:1.8; position:relative;z-index:1; }
        .cta-buttons { display:flex; gap:16px; justify-content:center; position:relative;z-index:1; }
        .btn-cta-primary { background:var(--blush); color:var(--text-dark); padding:16px 40px; border-radius:50px; font-size:13px; font-weight:500; letter-spacing:1.5px; text-transform:uppercase; border:none; cursor:pointer; transition:all 0.3s; text-decoration:none; display:inline-block; }
        .btn-cta-primary:hover { background:white; transform:translateY(-3px); }
        .btn-cta-ghost { background:transparent; color:rgba(250,247,242,0.7); padding:15px 40px; border-radius:50px; font-size:13px; letter-spacing:1.5px; text-transform:uppercase; border:1px solid rgba(250,247,242,0.2); cursor:pointer; transition:all 0.3s; text-decoration:none; display:inline-block; }
        .btn-cta-ghost:hover { border-color:rgba(250,247,242,0.6); color:rgba(250,247,242,0.9); }

        footer { padding:40px 60px; display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(201,184,168,0.2); font-size:12px; color:var(--text-light); }
        footer a { color:var(--text-light); text-decoration:none; transition:color 0.3s; }
        footer a:hover { color:var(--accent); }

        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes floatPill { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        .reveal { opacity:0; transform:translateY(30px); transition:opacity 0.8s ease,transform 0.8s ease; }
        .reveal.visible { opacity:1; transform:translateY(0); }

        @media(max-width:768px){
          nav{padding:20px 24px;} nav.scrolled{padding:14px 24px;} .nav-links{display:none;}
          .hero{padding:120px 24px 60px;}
          .section{padding:60px 24px;}
          .steps-grid{grid-template-columns:1fr;}
          .family-inner{grid-template-columns:1fr;padding:0 24px;}
          .family-visual{height:300px;}
          .cta-section{margin:0 24px 60px;padding:48px 32px;}
          footer{flex-direction:column;gap:12px;padding:32px 24px;text-align:center;}
          .float-pill{display:none;}
          .story-card{padding:32px 28px;}
        }
      `}</style>

      {/* NAV */}
      <nav id="navbar">
        <a href="/" className="nav-logo">
          <span>📖</span> Hemsaga
        </a>
        <div className="nav-links">
          <a href="#how">How it works</a>
          <a href="#family">Family</a>
          <a href="#story">Sample Story</a>
          <a href="/auth" className="btn-nav">Sign in</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />

        <div className="hero-tag">Private beta — invite only</div>

        <h1 className="hero-title">
          Turn your family's <em>memories</em> into a living storybook
        </h1>

        <p className="hero-subtitle">
          Right now Hemsaga is in private beta. You can try it only with an invite link
          from someone who has a space — use their link to add your memories. Space owners can sign in below.
        </p>

        <div className="hero-buttons">
          <a href="/auth" className="btn-ghost">Sign in (space owners)</a>
          <a href="#story" className="btn-ghost">See a Sample</a>
        </div>

        {/* Story preview */}
        <div className="story-preview-wrapper" id="story">
          <div className="float-pill pill-1">📸 Memory logged</div>
          <div className="float-pill pill-2">✦ Chapter generated</div>
          <div className="float-pill pill-3">💌 Shared with grandparents</div>
          <div className="story-card">
            <div className="story-card-meta">
              <div className="story-chapter-tag">The Day He Stood</div>
              <div className="story-page-label">Chapter 4 · Page 1</div>
            </div>
            <h2 className="story-title">Nine Months Old — A Tuesday Morning</h2>
            <p className="story-text">
              It happened on a Tuesday, the way most important things do —
              quietly, without announcement. He had been eyeing the sofa for weeks.{' '}
              <strong>Papa had joked that he was planning something.</strong>
              <br /><br />
              He was. On a crisp morning, he reached out, grabbed the cushion
              with both fists, and <strong>pulled himself up</strong>.
              He wobbled. He steadied. He stood.
              <br /><br />
              Hundreds of kilometres away, Grandma watched the video four times.
              Then she called — crying and laughing at once, the way grandmothers
              do when they are too full of love for just one feeling.
            </p>
            <div className="story-fade" />
          </div>
        </div>
      </section>

      {/* DIVIDER */}
      <div className="section-divider"><span>How it works</span></div>

      {/* HOW IT WORKS */}
      <section className="section" id="how">
        <p className="section-label reveal">The process</p>
        <h2 className="section-title reveal">
          Three simple steps to a <em>lifetime</em> of stories
        </h2>
        <div className="steps-grid">
          {[
            { icon:'🌸', bg:'icon-blush', num:'Step 01', title:'Log a Memory', desc:'Send a voice note, text, or photo from WhatsApp or the app. Takes less than 30 seconds. No forms. No friction.' },
            { icon:'✦', bg:'icon-sage', num:'Step 02', title:'AI Weaves the Story', desc:'Hemsaga gathers contributions from the whole family and crafts a beautifully written chapter in your family\'s own voice.' },
            { icon:'📖', bg:'icon-lavender', num:'Step 03', title:'A Chapter is Born', desc:'A new chapter appears every month. Share digitally or order a beautiful printed hardcover keepsake.' },
          ].map((s, i) => (
            <div className="step-card reveal" key={i}>
              <div className={`step-icon ${s.bg}`}>{s.icon}</div>
              <div className="step-number">{s.num}</div>
              <div className="step-title">{s.title}</div>
              <p className="step-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAMILY */}
      <div className="family-section" id="family">
        <div className="family-inner">
          <div className="family-visual reveal">
            <div className="family-bubble bubble-1">
              <div className="bubble-role">Papa · Sweden</div>
              <div className="bubble-text">"He stood up today holding the sofa and just grinned at me."</div>
            </div>
            <div className="family-bubble bubble-2">
              <div className="bubble-role">Mama · Home</div>
              <div className="bubble-text">"He has been planning this for weeks. I could see it in his eyes."</div>
            </div>
            <div className="family-bubble bubble-3">
              <div className="bubble-role">Grandma · Far away</div>
              <div className="bubble-text">"I watched the video four times. My heart is so full."</div>
            </div>
          </div>
          <div className="family-content reveal">
            <p className="section-label">The family</p>
            <h2 className="section-title">
              Every voice adds a <em>different colour</em> to the story
            </h2>
            <p className="family-desc">
              Your child's story is not just theirs alone. It belongs to
              everyone who loves them — parents near and grandparents far.
              Hemsaga brings every voice together into one beautiful narrative.
            </p>
            <p className="family-invite-note" style={{ marginTop: 20, fontSize: 14, color: 'var(--text-mid)' }}>
              In private beta — join with an invite link from a space owner. <a href="/auth" style={{ color: 'var(--accent)', fontWeight: 500 }}>Sign in</a> if you already have a space.
            </p>
          </div>
        </div>
      </div>

      {/* QUOTE */}
      <div className="quote-section reveal">
        <div className="quote-mark">"</div>
        <p className="quote-text">
          Your child will be eighteen one day and ask —
          what was I like when I was little?
          Hemsaga will have the answer.
        </p>
        <div className="quote-author">The story begins today</div>
      </div>

      {/* CTA */}
      <div className="cta-section reveal">
        <h2 className="cta-title">Invite-only for now</h2>
        <p className="cta-subtitle">
          We're testing with a small group. Join with an invite link from a space owner,
          or <a href="/auth" style={{ color: 'var(--accent)', fontWeight: 500 }}>sign in</a> if you run a space.
        </p>
        <div className="cta-buttons">
          <a href="#how" className="btn-cta-primary">See how it works</a>
        </div>
      </div>

      {/* FOOTER */}
      <footer>
        <div>© 2026 Hemsaga · Built by a loving papa</div>
        <div style={{display:'flex', gap:'24px'}}>
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">hello@hemsaga.com</a>
        </div>
      </footer>
    </>
  );
}