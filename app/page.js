'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const REQUEST_MAILTO =
  'mailto:hello@hemsaga.com?subject=Request%20access%20to%20Hemsaga%20beta&body=Hi%20Hemsaga%20team%2C%0A%0AI%27d%20like%20to%20request%20access%20to%20the%20beta.%0A%0A';

export default function Home() {
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestEmail, setRequestEmail] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestFeedback, setRequestFeedback] = useState('');

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

  useEffect(() => {
    if (!requestOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [requestOpen]);

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
          padding: 24px 60px; transition: all 0.4s ease; gap: 16px;
        }
        nav.scrolled {
          background: rgba(250,247,242,0.92); backdrop-filter: blur(16px);
          padding: 14px 60px; border-bottom: 1px solid rgba(201,184,168,0.25);
        }
        .nav-logo {
          font-family: 'Cormorant Garamond', serif; font-size: 26px;
          font-weight: 600; color: var(--text-dark); letter-spacing: 1px;
          display: flex; align-items: center; gap: 10px; text-decoration: none;
          flex-shrink: 0;
        }
        .nav-links { display: flex; align-items: center; gap: 28px; flex: 1; justify-content: center; }
        .nav-links a {
          font-size: 12px; letter-spacing: 1.2px; text-transform: uppercase;
          color: var(--text-mid); text-decoration: none; transition: color 0.3s;
        }
        .nav-links a:hover { color: var(--text-dark); }
        .nav-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .btn-nav-outline {
          background: transparent; color: var(--text-dark);
          padding: 10px 20px; border-radius: 40px; font-size: 11px;
          letter-spacing: 1.2px; text-transform: uppercase;
          border: 1px solid rgba(46,33,24,0.22); cursor: pointer;
          font-family: 'Jost', sans-serif; font-weight: 500;
          transition: all 0.25s;
        }
        .btn-nav-outline:hover { border-color: var(--accent); color: var(--accent); }
        .btn-nav {
          background: var(--text-dark) !important; color: var(--cream) !important;
          padding: 10px 22px; border-radius: 40px; font-size: 11px !important;
          letter-spacing: 1.2px; text-transform: uppercase; transition: all 0.3s !important;
          text-decoration: none; display: inline-block; border: none; cursor: pointer;
          font-family: 'Jost', sans-serif; font-weight: 500;
        }
        .btn-nav:hover { background: var(--accent) !important; transform: translateY(-1px); }

        .hero {
          min-height: 100vh; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          text-align: center; padding: 120px 40px 72px; position: relative;
        }
        .blob { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.45; pointer-events: none; }
        .blob-1 { width:500px;height:500px; background:radial-gradient(circle,#F2E4DC,transparent); top:-100px;left:-150px; }
        .blob-2 { width:400px;height:400px; background:radial-gradient(circle,#E4DEED,transparent); top:100px;right:-100px; }
        .blob-3 { width:350px;height:350px; background:radial-gradient(circle,#D6E5D8,transparent); bottom:0;left:50%;transform:translateX(-50%); }

        .hero-tag {
          display: inline-flex; align-items: center; gap: 8px;
          background: white; border: 1px solid rgba(201,184,168,0.4);
          padding: 7px 18px; border-radius: 40px; font-size: 11px;
          letter-spacing: 2px; text-transform: uppercase; color: var(--text-light);
          margin-bottom: 28px; animation: fadeUp 1s ease forwards; opacity: 0; animation-delay: 0.2s;
        }
        .hero-tag::before { content:''; width:5px;height:5px; background:var(--accent); border-radius:50%; }

        .hero-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(44px,6.5vw,88px); font-weight: 300;
          line-height: 1.06; letter-spacing: -1px;
          color: var(--text-dark); max-width: 720px; margin-bottom: 20px;
          animation: fadeUp 1s ease forwards; opacity: 0; animation-delay: 0.4s;
        }
        .hero-title em { font-style: italic; color: var(--accent); font-weight: 400; }

        .hero-subtitle {
          font-size: 16px; font-weight: 300; color: var(--text-mid);
          line-height: 1.65; max-width: 420px; margin-bottom: 36px;
          animation: fadeUp 1s ease forwards; opacity: 0; animation-delay: 0.55s;
        }

        .hero-buttons {
          display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;
          align-items: center;
          animation: fadeUp 1s ease forwards; opacity: 0; animation-delay: 0.7s;
        }
        .btn-primary {
          background: var(--text-dark); color: var(--cream);
          padding: 15px 32px; border-radius: 50px;
          font-family: 'Jost', sans-serif; font-size: 12px; font-weight: 500;
          letter-spacing: 1.4px; text-transform: uppercase;
          border: none; cursor: pointer; transition: all 0.3s ease;
          text-decoration: none; display: inline-block;
        }
        .btn-primary:hover { background: var(--accent); transform: translateY(-2px); box-shadow: 0 10px 36px rgba(176,125,91,0.28); }
        .btn-ghost {
          background: transparent; color: var(--text-dark);
          padding: 14px 28px; border-radius: 50px;
          font-family: 'Jost', sans-serif; font-size: 12px; font-weight: 400;
          letter-spacing: 1.4px; text-transform: uppercase;
          border: 1px solid rgba(46,33,24,0.22); cursor: pointer;
          transition: all 0.3s; text-decoration: none; display: inline-block;
        }
        .btn-ghost:hover { border-color: var(--accent); color: var(--accent); transform: translateY(-2px); }
        .hero-link-sample {
          font-size: 13px; letter-spacing: 0.5px; color: var(--text-light);
          text-decoration: none; border-bottom: 1px solid rgba(168,145,126,0.5);
          padding-bottom: 2px; margin-left: 4px;
        }
        .hero-link-sample:hover { color: var(--accent); border-color: var(--accent); }

        .story-preview-wrapper {
          margin-top: 56px; width: 100%; max-width: 640px;
          animation: fadeUp 1s ease forwards; opacity: 0;
          animation-delay: 0.9s; position: relative;
        }
        .story-card {
          background: white; border-radius: 22px; padding: 36px 40px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.02), 0 20px 60px rgba(46,33,24,0.08), 0 0 0 1px rgba(201,184,168,0.2);
          text-align: left; position: relative; overflow: hidden;
        }
        .story-card::before {
          content: ''; position: absolute; top:0;left:0;right:0; height: 3px;
          background: linear-gradient(90deg, var(--blush), var(--lavender), var(--sage));
        }
        .story-card-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
        .story-chapter-tag { font-size: 10px; letter-spacing: 2.5px; text-transform: uppercase; color: var(--accent); font-weight: 500; }
        .story-page-label { font-size: 11px; color: var(--text-light); letter-spacing: 1px; }
        .story-title { font-family: 'Cormorant Garamond', serif; font-size: 24px; font-weight: 600; color: var(--text-dark); margin-bottom: 16px; line-height: 1.3; }
        .story-text { font-family: 'Cormorant Garamond', serif; font-size: 16px; color: var(--text-mid); line-height: 1.85; font-style: italic; }
        .story-text strong { font-style: normal; font-weight: 600; color: var(--text-dark); }
        .story-fade { position: absolute; bottom:0;left:0;right:0; height: 72px; background: linear-gradient(transparent, white); }

        .float-pill {
          position: absolute; border-radius: 50px; font-size: 10px;
          font-weight: 500; letter-spacing: 0.5px; padding: 7px 14px;
          white-space: nowrap; animation: floatPill 4s ease-in-out infinite;
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
        }
        .pill-1 { background: var(--blush); color: var(--text-mid); top: 20px; left: -120px; }
        .pill-2 { background: var(--sage); color: #4A6741; top: 80px; right: -130px; animation-delay: 1s; }
        .pill-3 { background: var(--lavender); color: #5A4A6B; bottom: 60px; left: -100px; animation-delay: 2s; }

        .section-divider { display:flex; align-items:center; gap:20px; padding:0 60px; margin:16px 0; opacity:0.35; }
        .section-divider::before,.section-divider::after { content:''; flex:1; height:1px; background:var(--warm-tan); }
        .section-divider span { font-size:11px; letter-spacing:3px; text-transform:uppercase; color:var(--warm-tan); }

        .section { padding: 72px 60px; max-width: 1100px; margin: 0 auto; }
        .section-label { font-size:10px; letter-spacing:3px; text-transform:uppercase; color:var(--text-light); margin-bottom:12px; display:flex; align-items:center; gap:12px; }
        .section-label::before { content:''; width:24px; height:1px; background:var(--text-light); }
        .section-title { font-family:'Cormorant Garamond',serif; font-size:clamp(32px,3.8vw,48px); font-weight:300; line-height:1.12; color:var(--text-dark); max-width:480px; margin-bottom:40px; }
        .section-title em { font-style:italic; color:var(--accent); }

        .steps-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:24px; }
        .step-card { background:white; border-radius:18px; padding:28px 26px; border:1px solid rgba(201,184,168,0.2); transition:all 0.35s ease; position:relative; overflow:hidden; }
        .step-card:hover { transform:translateY(-4px); box-shadow:0 16px 48px rgba(46,33,24,0.07); }
        .step-icon { width:46px;height:46px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:20px; margin-bottom:18px; }
        .icon-blush { background:var(--blush); }
        .icon-sage { background:var(--sage); }
        .icon-lavender { background:var(--lavender); }
        .step-number { font-size:10px; letter-spacing:2px; color:var(--text-light); text-transform:uppercase; margin-bottom:8px; }
        .step-title { font-family:'Cormorant Garamond',serif; font-size:19px; font-weight:600; color:var(--text-dark); margin-bottom:8px; }
        .step-desc { font-size:13px; line-height:1.65; color:var(--text-mid); }

        .family-section { background:white; padding:72px 0; }
        .family-inner { max-width:1100px; margin:0 auto; padding:0 60px; display:grid; grid-template-columns:1fr 1fr; gap:56px; align-items:center; }
        .family-visual { position:relative; height:360px; }
        .family-bubble { position:absolute; border-radius:18px; padding:20px 22px; box-shadow:0 8px 32px rgba(0,0,0,0.06); }
        .bubble-1 { background:var(--blush); top:0;left:0; width:220px; }
        .bubble-2 { background:var(--sage); top:72px;right:0; width:200px; }
        .bubble-3 { background:var(--lavender); bottom:32px;left:32px; width:190px; }
        .bubble-role { font-size:9px; letter-spacing:2px; text-transform:uppercase; color:var(--text-light); margin-bottom:6px; }
        .bubble-text { font-family:'Cormorant Garamond',serif; font-size:14px; font-style:italic; color:var(--text-dark); line-height:1.55; }
        .family-desc { font-size:15px; line-height:1.75; color:var(--text-mid); }

        .quote-section { padding:72px 40px; text-align:center; max-width:640px; margin:0 auto; }
        .quote-mark { font-family:'Cormorant Garamond',serif; font-size:56px; color:var(--blush); line-height:0.5; margin-bottom:20px; }
        .quote-text { font-family:'Cormorant Garamond',serif; font-size:clamp(22px,2.8vw,30px); font-weight:300; font-style:italic; color:var(--text-dark); line-height:1.5; margin-bottom:20px; }
        .quote-author { font-size:11px; letter-spacing:2px; text-transform:uppercase; color:var(--text-light); }

        .cta-section { margin:0 60px 72px; border-radius:28px; background:linear-gradient(135deg,#2E2118 0%,#4A3428 100%); padding:52px 48px; text-align:center; position:relative; overflow:hidden; }
        .cta-section::before { content:''; position:absolute; top:-100px;right:-100px; width:280px;height:280px; background:radial-gradient(circle,rgba(242,228,220,0.1),transparent); border-radius:50%; }
        .cta-title { font-family:'Cormorant Garamond',serif; font-size:clamp(28px,3.5vw,42px); font-weight:300; color:#FAF7F2; margin-bottom:12px; position:relative;z-index:1; }
        .cta-subtitle { font-size:14px; color:rgba(250,247,242,0.55); margin-bottom:28px; line-height:1.6; position:relative;z-index:1; max-width:400px; margin-left:auto; margin-right:auto; }
        .cta-buttons { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; position:relative;z-index:1; }
        .btn-cta-primary { background:var(--blush); color:var(--text-dark); padding:14px 32px; border-radius:50px; font-size:12px; font-weight:500; letter-spacing:1.4px; text-transform:uppercase; border:none; cursor:pointer; transition:all 0.3s; text-decoration:none; display:inline-block; font-family:'Jost',sans-serif; }
        .btn-cta-primary:hover { background:white; transform:translateY(-2px); }
        .btn-cta-ghost { background:transparent; color:rgba(250,247,242,0.85); padding:13px 28px; border-radius:50px; font-size:12px; letter-spacing:1.4px; text-transform:uppercase; border:1px solid rgba(250,247,242,0.25); cursor:pointer; transition:all 0.3s; text-decoration:none; display:inline-block; font-family:'Jost',sans-serif; }
        .btn-cta-ghost:hover { border-color:rgba(250,247,242,0.55); color:#FAF7F2; }

        .pricing-section { padding-bottom: 48px; }
        .pricing-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:28px; max-width:920px; margin:0 auto; }
        .price-card { background:white; border-radius:22px; padding:36px 32px; border:1px solid rgba(201,184,168,0.35); position:relative; overflow:hidden; }
        .price-card.featured { border-color:rgba(176,125,91,0.55); box-shadow:0 18px 52px rgba(46,33,24,0.1); }
        .price-card .badge { position:absolute; top:16px; right:16px; font-size:9px; letter-spacing:2px; text-transform:uppercase; background:var(--blush); color:var(--text-mid); padding:6px 12px; border-radius:999px; }
        .price-name { font-family:'Cormorant Garamond',serif; font-size:24px; font-weight:600; color:var(--text-dark); margin-bottom:8px; }
        .price-tagline { font-size:14px; color:var(--text-mid); line-height:1.55; margin-bottom:20px; }
        .price-amount { font-family:'Cormorant Garamond',serif; font-size:38px; font-weight:600; color:var(--text-dark); }
        .price-amount span { font-size:15px; font-weight:400; color:var(--text-light); font-family:'Jost',sans-serif; }
        .price-sub { font-size:12px; color:var(--text-light); margin:6px 0 22px; }
        .price-list { list-style:none; margin:0; padding:0; }
        .price-list li { font-size:14px; color:var(--text-mid); padding:10px 0; border-top:1px solid rgba(201,184,168,0.2); display:flex; gap:10px; align-items:flex-start; }
        .price-list li:first-of-type { border-top:none; }
        .price-list li::before { content:'✓'; color:var(--accent); font-weight:600; flex-shrink:0; }
        .price-list li.muted::before { content:'—'; color:var(--text-light); font-weight:400; }
        .price-note { font-size:12px; color:var(--text-light); margin-top:20px; line-height:1.5; }

        .trust-section { background: linear-gradient(180deg, rgba(214,229,216,0.35) 0%, rgba(250,247,242,0) 100%); padding: 64px 60px 72px; border-top: 1px solid rgba(201,184,168,0.2); border-bottom: 1px solid rgba(201,184,168,0.15); }
        .trust-inner { max-width: 1100px; margin: 0 auto; }
        .trust-intro { font-size: 15px; line-height: 1.7; color: var(--text-mid); max-width: 560px; margin-bottom: 36px; }
        .trust-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; }
        .trust-card { background: white; border-radius: 18px; padding: 26px 24px; border: 1px solid rgba(201,184,168,0.28); transition: transform 0.3s ease, box-shadow 0.3s;
          box-shadow: 0 2px 12px rgba(46,33,24,0.04); }
        .trust-card:hover { transform: translateY(-3px); box-shadow: 0 14px 40px rgba(46,33,24,0.08); }
        .trust-icon { font-size: 22px; line-height: 1; margin-bottom: 14px; display: block; }
        .trust-card h3 { font-family: 'Cormorant Garamond', serif; font-size: 19px; font-weight: 600; color: var(--text-dark); margin-bottom: 8px; }
        .trust-card p { font-size: 13px; line-height: 1.65; color: var(--text-mid); margin: 0; }
        .trust-foot { margin-top: 28px; font-size: 12px; color: var(--text-light); line-height: 1.55; max-width: 640px; }
        .trust-foot a { color: var(--accent); text-decoration: none; border-bottom: 1px solid rgba(176,125,91,0.35); }
        .trust-foot a:hover { border-bottom-color: var(--accent); }

        .request-overlay {
          position: fixed; inset: 0; z-index: 200;
          background: rgba(46,33,24,0.45); backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
          padding: 24px; animation: fadeIn 0.2s ease;
        }
        .request-modal {
          background: var(--cream); border-radius: 20px;
          max-width: 420px; width: 100%;
          padding: 36px 32px 32px;
          box-shadow: 0 24px 80px rgba(46,33,24,0.18);
          border: 1px solid rgba(201,184,168,0.35);
          position: relative;
        }
        .request-modal h3 {
          font-family: 'Cormorant Garamond', serif; font-size: 26px; font-weight: 600;
          color: var(--text-dark); margin-bottom: 10px;
        }
        .request-modal p {
          font-size: 14px; line-height: 1.65; color: var(--text-mid); margin-bottom: 24px;
        }
        .request-modal .request-email {
          font-size: 13px; color: var(--text-dark); font-weight: 500;
          margin-bottom: 20px; word-break: break-all;
        }
        .request-modal-btns { display: flex; flex-direction: column; gap: 10px; }
        .request-modal .req-field {
          width: 100%; padding: 12px 14px; margin-bottom: 12px;
          border: 1px solid rgba(201,184,168,0.5); border-radius: 10px;
          font-family: 'Jost', sans-serif; font-size: 14px; color: var(--text-dark);
          background: #fff; box-sizing: border-box;
        }
        .request-modal textarea.req-field { min-height: 88px; resize: vertical; }
        .request-modal .req-hint { font-size: 12px; color: var(--text-mid); margin: -6px 0 14px; line-height: 1.5; }
        .request-modal .req-msg { font-size: 13px; padding: 10px 12px; border-radius: 8px; margin-bottom: 12px; }
        .request-modal .req-msg.ok { background: rgba(214,229,216,0.45); color: #3d5a40; }
        .request-modal .req-msg.err { background: rgba(242,228,220,0.7); color: #6b4226; }
        .request-modal .btn-close-modal {
          position: absolute; top: 14px; right: 14px;
          width: 36px; height: 36px; border: none; border-radius: 50%;
          background: rgba(46,33,24,0.06); color: var(--text-mid);
          font-size: 20px; line-height: 1; cursor: pointer;
        }
        .request-modal .btn-close-modal:hover { background: rgba(46,33,24,0.1); color: var(--text-dark); }

        footer { padding:32px 60px; display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(201,184,168,0.2); font-size:11px; color:var(--text-light); }
        footer a { color:var(--text-light); text-decoration:none; transition:color 0.3s; }
        footer a:hover { color:var(--accent); }

        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes floatPill { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        .reveal { opacity:0; transform:translateY(24px); transition:opacity 0.7s ease,transform 0.7s ease; }
        .reveal.visible { opacity:1; transform:translateY(0); }

        @media(max-width:768px){
          nav{padding:16px 20px; flex-wrap:wrap;}
          nav.scrolled{padding:12px 20px;}
          .nav-links{display:none;}
          .nav-actions{margin-left:auto;}
          .hero{padding:108px 22px 48px;}
          .section{padding:48px 22px;}
          .steps-grid{grid-template-columns:1fr;}
          .family-inner{grid-template-columns:1fr;padding:0 22px; gap:40px;}
          .family-visual{height:280px;}
          .cta-section{margin:0 22px 48px;padding:40px 24px;}
          .pricing-grid{grid-template-columns:1fr;}
          .trust-section{padding:48px 22px 56px;}
          .trust-grid{grid-template-columns:1fr;}
          footer{flex-direction:column;gap:10px;padding:28px 22px;text-align:center;}
          .float-pill{display:none;}
          .story-card{padding:28px 22px;}
        }
      `}</style>

      {requestOpen && (
        <div
          className="request-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="request-title"
          onClick={(e) => e.target === e.currentTarget && setRequestOpen(false)}
        >
          <div className="request-modal">
            <button type="button" className="btn-close-modal" aria-label="Stäng" onClick={() => setRequestOpen(false)}>×</button>
            <h3 id="request-title">Begär åtkomst</h3>
            <p>
              Vi släpper in i små vågor. Lämna din e-post — vi hör av oss när du kan skapa konto.
            </p>
            {requestFeedback && (
              <div className={`req-msg ${requestFeedback.startsWith('✓') ? 'ok' : 'err'}`}>{requestFeedback}</div>
            )}
            <input
              type="email"
              className="req-field"
              placeholder="din@epost.se"
              autoComplete="email"
              value={requestEmail}
              onChange={(e) => setRequestEmail(e.target.value)}
              disabled={requestSubmitting}
            />
            <textarea
              className="req-field"
              placeholder="Valfritt: några ord om dig eller familjen (hjälper oss prioritera)"
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              disabled={requestSubmitting}
            />
            <p className="req-hint">Föredrar e-post? <a href={REQUEST_MAILTO} style={{ color: 'var(--accent)' }}>Öppna mejlprogrammet</a></p>
            <div className="request-modal-btns">
              <button
                type="button"
                className="btn-primary"
                style={{ textAlign: 'center' }}
                disabled={requestSubmitting}
                onClick={async () => {
                  setRequestFeedback('');
                  const em = requestEmail.trim();
                  if (!em || !em.includes('@')) {
                    setRequestFeedback('Ange en giltig e-postadress.');
                    return;
                  }
                  setRequestSubmitting(true);
                  try {
                    const res = await fetch('/api/access-request', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: em, message: requestMessage.trim() }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (res.status === 429) {
                      setRequestFeedback(`För många försök. Vänta ${data.retryAfter || 60} s och försök igen.`);
                    } else if (data.error) {
                      setRequestFeedback(data.error);
                    } else if (data.duplicate) {
                      setRequestFeedback('✓ Vi har redan din förfrågan — håll utkik.');
                    } else {
                      setRequestFeedback('✓ Tack! Vi hör av oss.');
                      setRequestEmail('');
                      setRequestMessage('');
                    }
                  } catch {
                    setRequestFeedback('Något gick fel. Försök igen eller mejla oss.');
                  }
                  setRequestSubmitting(false);
                }}
              >
                {requestSubmitting ? 'Skickar…' : 'Skicka'}
              </button>
              <button type="button" className="btn-ghost" onClick={() => setRequestOpen(false)}>
                Stäng
              </button>
            </div>
          </div>
        </div>
      )}

      <nav id="navbar">
        <Link href="/" className="nav-logo">
          <span>📖</span> Hemsaga
        </Link>
        <div className="nav-links">
          <a href="#how">Så funkar det</a>
          <a href="#family">Familjen</a>
          <a href="#pricing">Priser</a>
          <a href="#trygghet">Trygghet</a>
          <a href="#story">Exempel</a>
        </div>
        <div className="nav-actions">
          <a href="#trygghet" className="btn-nav-outline" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
            Trygghet
          </a>
          <a href="#pricing" className="btn-nav-outline" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
            Priser
          </a>
          <button type="button" className="btn-nav-outline" onClick={() => setRequestOpen(true)}>
            Begär åtkomst
          </button>
          <a href="/auth" className="btn-nav">Logga in</a>
        </div>
      </nav>

      <section className="hero">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />

        <div className="hero-tag">Privat beta</div>

        <h1 className="hero-title">
          Bevara dina <em>familjeminnen</em> för alltid
        </h1>

        <p className="hero-subtitle">
          Samla stunder och bjud in familjen. På Pro vävs minnen till varma kapitel med AI — så att berättelsen lever vidare. Just nu: inbjudan och små vågor; logga in om du redan har plats.
        </p>

        <div className="hero-buttons">
          <button type="button" className="btn-primary" onClick={() => setRequestOpen(true)}>
            Begär åtkomst
          </button>
          <a href="/auth" className="btn-ghost">Logga in</a>
          <a href="#story" className="hero-link-sample">Se exempel ↓</a>
        </div>

        <div className="story-preview-wrapper" id="story">
          <div className="float-pill pill-1">Minne sparat</div>
          <div className="float-pill pill-2">Kapitel vävt</div>
          <div className="float-pill pill-3">Delat med familjen</div>
          <div className="story-card">
            <div className="story-card-meta">
              <div className="story-chapter-tag">Exempelkapitel</div>
              <div className="story-page-label">Chapter 4</div>
            </div>
            <h2 className="story-title">Nine Months Old — A Tuesday Morning</h2>
            <p className="story-text">
              It happened on a Tuesday, the way most important things do —
              quietly, without announcement. He had been eyeing the sofa for weeks.{' '}
              <strong>Someone had joked he was planning something.</strong>
              <br /><br />
              He reached out, grabbed the cushion with both fists, and{' '}
              <strong>pulled himself up</strong>. He wobbled. He steadied. He stood.
              <br /><br />
              Far away, a grandparent watched the video again — crying and laughing at once.
            </p>
            <div className="story-fade" />
          </div>
        </div>
      </section>

      <div className="section-divider"><span>Så funkar det</span></div>

      <section className="section" id="how">
        <p className="section-label reveal">Processen</p>
        <h2 className="section-title reveal">
          Tre steg. En <em>berättelse</em>.
        </h2>
        <div className="steps-grid">
          {[
            { icon:'🌸', bg:'icon-blush', num:'01', title:'Logga en stund', desc:'Text eller foto från telefonen — snabbt och enkelt.' },
            { icon:'✦', bg:'icon-sage', num:'02', title:'AI väver ihop (Pro)', desc:'Allas röster blir ett varmt kapitel när du vill aktivera storytelling.' },
            { icon:'📖', bg:'icon-lavender', num:'03', title:'Läs och dela', desc:'Sagan växer över tid — läs tillsammans när som helst.' },
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

      <div className="family-section" id="family">
        <div className="family-inner">
          <div className="family-visual reveal">
            <div className="family-bubble bubble-1">
              <div className="bubble-role">På distans</div>
              <div className="bubble-text">&quot;Han stod upp idag — och flinade bara mot soffan.&quot;</div>
            </div>
            <div className="family-bubble bubble-2">
              <div className="bubble-role">Hemma</div>
              <div className="bubble-text">&quot;Vi såg direkt att han tänkt ut det här länge.&quot;</div>
            </div>
            <div className="family-bubble bubble-3">
              <div className="bubble-role">Morbroor</div>
              <div className="bubble-text">&quot;Jag såg klippet fyra gånger. Hjärtat fullt.&quot;</div>
            </div>
          </div>
          <div className="family-content reveal">
            <p className="section-label">Tillsammans</p>
            <h2 className="section-title">
              Varje röst lägger till ett <em>lager</em>
            </h2>
            <p className="family-desc">
              Föräldrar, mor- och farföräldrar, vänner — Hemsaga samlar rösterna i en berättelse ni kan återvända till i åratal.
            </p>
          </div>
        </div>
      </div>

      <div className="section-divider"><span>Priser</span></div>

      <section className="section pricing-section" id="pricing">
        <p className="section-label reveal">Per familj</p>
        <h2 className="section-title reveal">
          Börja gratis, <em>väx</em> med Pro
        </h2>
        <div className="pricing-grid">
          <div className="price-card reveal">
            <div className="price-name">Free</div>
            <p className="price-tagline">Prova Hemsaga och samla minnen utan att binda dig.</p>
            <div className="price-amount">0 <span>kr</span></div>
            <p className="price-sub">Alltid</p>
            <ul className="price-list">
              <li>1 Space</li>
              <li>Upp till 10 minnen per Space</li>
              <li className="muted">Ingen AI-storytelling eller AI-bilder</li>
              <li>Dela Space med familjen</li>
            </ul>
            <p className="price-note">Perfekt för att känna på produkten innan ni väver längre kapitel.</p>
          </div>
          <div className="price-card featured reveal">
            <div className="badge">Pro</div>
            <div className="price-name">Hemsaga Pro</div>
            <p className="price-tagline">Oändliga ytor för minnen, AI som väver kapitel och trygg bildlagring.</p>
            <div className="price-amount">99 <span>kr / mån</span></div>
            <p className="price-sub">eller 799 kr / år — en plan per familj</p>
            <ul className="price-list">
              <li>Obegränsat antal Spaces</li>
              <li>AI som väver sagokapitel och justerar kapitel</li>
              <li>AI-bilder (t.ex. stiliserade foton) där det stöds</li>
              <li>Fotoarkiv som växer med er berättelse</li>
            </ul>
            <p className="price-note">Betalning och Pro aktiveras när ni kopplar Stripe i er servermiljö (se projektets STRIPE-setup för utvecklare).</p>
          </div>
        </div>
      </section>

      <section className="trust-section" id="trygghet" aria-labelledby="trygghet-heading">
        <div className="trust-inner">
          <p className="section-label reveal">Trygghet</p>
          <h2 className="section-title reveal" id="trygghet-heading">
            Era minnen förtjänar <em>respekt</em>
          </h2>
          <p className="trust-intro reveal">
            Familjeberättelser är känsliga. Här är hur vi tänker kring säkerhet och integritet — ärligt formulerat, utan onödigt småprat.
          </p>
          <div className="trust-grid">
            <div className="trust-card reveal">
              <span className="trust-icon" aria-hidden="true">🔐</span>
              <h3>Krypterad anslutning</h3>
              <p>
                All trafik till sidan och appen går över HTTPS (TLS), så det som skickas mellan er enhet och våra servrar är skyddat under överföring.
              </p>
            </div>
            <div className="trust-card reveal">
              <span className="trust-icon" aria-hidden="true">👥</span>
              <h3>Ni styr vilka som ser</h3>
              <p>
                Ett Space är privat för er krets — bara folk ni bjuder in kan bidra och ta del. Det är inte ett öppet flöde som vem som helst kan hitta.
              </p>
            </div>
            <div className="trust-card reveal">
              <span className="trust-icon" aria-hidden="true">🗄️</span>
              <h3>Säker lagring</h3>
              <p>
                Minnen och bilder lagras på infrastruktur byggd för produktion, med etablerad kryptering och åtkomstkontroll — där ni förväntar er att molntjänster sköter data.
              </p>
            </div>
            <div className="trust-card reveal">
              <span className="trust-icon" aria-hidden="true">🚫</span>
              <h3>Inget annonslager</h3>
              <p>
                Vi säljer inte familjers innehåll eller beteende till annonsnätverk. Affärsmodellen är er prenumeration — inte er data som vara.
              </p>
            </div>
            <div className="trust-card reveal">
              <span className="trust-icon" aria-hidden="true">✨</span>
              <h3>När ni använder AI (Pro)</h3>
              <p>
                Funktioner som väver text använder externa AI-leverantörer enligt deras villkor. Vi skickar i första hand det innehåll som behövs för att skapa kapitlet — inte hela kontot eller mer än nödvändigt för uppgiften.
              </p>
            </div>
            <div className="trust-card reveal">
              <span className="trust-icon" aria-hidden="true">🌱</span>
              <h3>Privat beta, lugnt tempo</h3>
              <p>
                Vi tar in familjer stegvis så att vi kan hålla kvalitet, support och säkerhet i balans med hur snabbt vi växer.
              </p>
            </div>
          </div>
          <p className="trust-foot reveal">
            Vill ni gräva djupare finns <a href="#">integritetspolicy</a> och <a href="#">villkor</a> (på gång). Frågor? Skriv till{' '}
            <a href="mailto:hello@hemsaga.com">hello@hemsaga.com</a>.
          </p>
        </div>
      </section>

      <div className="quote-section reveal">
        <div className="quote-mark">&ldquo;</div>
        <p className="quote-text">
          En dag frågar de hur de var när de var små. Då har ni redan sagan.
        </p>
        <div className="quote-author">Börja idag</div>
      </div>

      <div className="cta-section reveal">
        <h2 className="cta-title">Gå med i betan</h2>
        <p className="cta-subtitle">
          Begär åtkomst eller logga in om du redan driver ett Space.
        </p>
        <div className="cta-buttons">
          <button type="button" className="btn-cta-primary" onClick={() => setRequestOpen(true)}>
            Begär åtkomst
          </button>
          <a href="/auth" className="btn-cta-ghost">Logga in</a>
        </div>
      </div>

      <footer>
        <div>© 2026 Hemsaga</div>
        <div style={{display:'flex', gap:'20px', flexWrap:'wrap', justifyContent:'center'}}>
          <a href="#">Integritet</a>
          <a href="#">Villkor</a>
          <a href="mailto:hello@hemsaga.com">hello@hemsaga.com</a>
        </div>
      </footer>
    </>
  );
}
