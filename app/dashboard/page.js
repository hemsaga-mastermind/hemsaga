'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import StoryReader from './StoryReader';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [child, setChild] = useState(null);
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('home');
  const [showAddMemory, setShowAddMemory] = useState(false);
  const [showAddChild, setShowAddChild] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCartoonModal, setShowCartoonModal] = useState(false);
  const [memoryText, setMemoryText] = useState('');
  const [memoryAuthor, setMemoryAuthor] = useState('Papa');
  const [memoryPhoto, setMemoryPhoto] = useState(null);
  const [memoryPhotoPreview, setMemoryPhotoPreview] = useState(null);
  const [childName, setChildName] = useState('');
  const [childBirthday, setChildBirthday] = useState('');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [story, setStory] = useState([]);
  const [showStory, setShowStory] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [cartoonizing, setCartoonizing] = useState(false);
  const [childCartoonUrl, setChildCartoonUrl] = useState(null);
  const [cartoonPhoto, setCartoonPhoto] = useState(null);
  const [cartoonPhotoPreview, setCartoonPhotoPreview] = useState(null);
  const [entered, setEntered] = useState(false);
  const router = useRouter();

  useEffect(() => { getUser(); }, []);
  useEffect(() => { if (!loading) setTimeout(() => setEntered(true), 80); }, [loading]);

  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth'); return; }
    setUser(user);
    await getChild(user.id);
    setLoading(false);
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return 'Good morning';
    if (h >= 12 && h < 17) return 'Good afternoon';
    if (h >= 17 && h < 21) return 'Good evening';
    return 'Good night';
  };

  const getChild = async (userId) => {
    const { data } = await supabase.from('children').select('*').eq('family_id', userId).single();
    if (data) {
      setChild(data);
      if (data.cartoon_url) setChildCartoonUrl(data.cartoon_url);
      await getMemories(data.id);
    }
  };

  const getMemories = async (childId) => {
    const { data } = await supabase.from('memories').select('*').eq('child_id', childId).order('created_at', { ascending: false });
    if (data) setMemories(data);
  };

  const generateStory = async (regenerate = false) => {
    if (memories.length === 0) { alert('Add some memories first!'); return; }
    setGenerating(true);
    try {
      const res = await fetch('/api/generate-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId: String(child.id), childName: String(child.name), childAge: String(getAge(child.birthday)), regenerate: regenerate === true })
      });
      const data = await res.json();
      if (data.chapters) { setStory(data.chapters); setShowStory(true); }
    } catch (err) { console.error(err); }
    setGenerating(false);
  };

  const saveChild = async () => {
    setSaving(true);
    const { data } = await supabase.from('children').insert([{ name: childName, birthday: childBirthday, family_id: user.id }]).select().single();
    if (data) { setChild(data); setShowAddChild(false); }
    setSaving(false);
  };

  const saveMemory = async () => {
    if (!memoryText.trim()) return;
    setSaving(true);
    let photoUrl = null;
    if (memoryPhoto) {
      const fileName = `${user.id}/${Date.now()}-${memoryPhoto.name.replace(/\s/g, '_')}`;
      const { error } = await supabase.storage.from('memories').upload(fileName, memoryPhoto);
      if (!error) {
        const { data: urlData } = supabase.storage.from('memories').getPublicUrl(fileName);
        photoUrl = urlData.publicUrl;
      }
    }
    const { data } = await supabase.from('memories').insert([{
      child_id: child.id, family_id: user.id, author: memoryAuthor || 'Papa',
      content: memoryText, memory_date: new Date().toISOString().split('T')[0], photo_url: photoUrl
    }]).select().single();
    if (data) {
      setMemories([data, ...memories]);
      setMemoryText(''); setMemoryAuthor('Papa'); setMemoryPhoto(null); setMemoryPhotoPreview(null); setShowAddMemory(false);
    }
    setSaving(false);
  };

  const generateInviteLink = async () => {
    const { data } = await supabase.from('family_invites').insert([{ child_id: child.id, family_id: user.id }]).select().single();
    if (data) setInviteLink(`https://hemsaga.com/family/${data.token}`);
  };

  const generateCartoon = async () => {
    if (!cartoonPhoto) { alert('Upload a photo first!'); return; }
    setCartoonizing(true);
    try {
      const fileName = `${user.id}/avatar-${Date.now()}-${cartoonPhoto.name.replace(/\s/g, '_')}`;
      const { error } = await supabase.storage.from('memories').upload(fileName, cartoonPhoto);
      if (error) { alert('Upload failed: ' + error.message); setCartoonizing(false); return; }
      const { data: urlData } = supabase.storage.from('memories').getPublicUrl(fileName);
      const res = await fetch('/api/cartoonify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageUrl: urlData.publicUrl, childName: String(child.name) }) });
      const data = await res.json();
      if (data.cartoonUrl) {
        await supabase.from('children').update({ cartoon_url: data.cartoonUrl }).eq('id', child.id);
        setChildCartoonUrl(data.cartoonUrl);
        setChild(prev => ({ ...prev, cartoon_url: data.cartoonUrl }));
        setShowCartoonModal(false); setCartoonPhoto(null); setCartoonPhotoPreview(null);
      } else { alert('Failed: ' + (data.error || 'Unknown error')); }
    } catch (err) { alert('Check Replicate API key in Vercel.'); }
    setCartoonizing(false);
  };

  const getAge = (birthday) => {
    const b = new Date(birthday), n = new Date();
    const m = (n.getFullYear() - b.getFullYear()) * 12 + (n.getMonth() - b.getMonth());
    if (m < 12) return `${m} months old`;
    const y = Math.floor(m / 12);
    return `${y} year${y > 1 ? 's' : ''} old`;
  };

  const getDaysOld = (birthday) => Math.floor((new Date() - new Date(birthday)) / 86400000);
  const formatDate = (d) => new Date(d).toLocaleDateString('en-SE', { day: 'numeric', month: 'long', year: 'numeric' });
  const formatShort = (d) => new Date(d).toLocaleDateString('en-SE', { day: 'numeric', month: 'short' });

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Papa';

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0C0906', fontFamily: "'Playfair Display', serif", fontSize: '20px', color: 'rgba(245,222,200,0.5)' }}>
      <div style={{ textAlign: 'center', animation: 'db-pulse 2s ease infinite' }}>
        <div style={{ fontSize: '36px', marginBottom: '14px' }}>📖</div>
        Loading your family story…
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400;1,600&family=DM+Sans:wght@300;400;500&display=swap');

        :root {
          --bg:       #0C0906;
          --bg-2:     #130F0A;
          --surface:  rgba(255,255,255,0.04);
          --surface-hover: rgba(255,255,255,0.07);
          --border:   rgba(245,222,200,0.08);
          --border-h: rgba(245,222,200,0.2);
          --text:     rgba(245,222,200,0.92);
          --text-2:   rgba(245,222,200,0.5);
          --text-3:   rgba(245,222,200,0.28);
          --accent:   #C4926A;
          --accent-d: #A0643A;
          --accent-glow: rgba(196,146,106,0.15);
          --gold:     #E8C88A;
          --sidebar-w: 268px;
          --font-serif: 'Playfair Display', Georgia, serif;
          --font-sans:  'DM Sans', system-ui, sans-serif;
          --radius: 16px;
          --radius-sm: 10px;
        }

        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        html, body { background: var(--bg); color: var(--text); font-family: var(--font-sans); -webkit-font-smoothing: antialiased; }

        /* ── Keyframes ── */
        @keyframes db-pulse    { 0%,100%{opacity:.5} 50%{opacity:1} }
        @keyframes db-float    { 0%{transform:translateY(100vh) scale(0);opacity:0} 8%{opacity:.5} 92%{opacity:.2} 100%{transform:translateY(-8vh) scale(1.6);opacity:0} }
        @keyframes db-fadein   { from{opacity:0} to{opacity:1} }
        @keyframes db-up       { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes db-glow-pulse { 0%,100%{opacity:.18} 50%{opacity:.32} }
        @keyframes db-spin     { to{transform:rotate(360deg)} }
        @keyframes db-shimmer  { 0%{transform:translateX(-100%) skewX(-15deg)} 100%{transform:translateX(220%) skewX(-15deg)} }
        @keyframes db-avatar-glow { 0%,100%{box-shadow:0 0 24px rgba(196,146,106,.15),0 0 0 2px rgba(196,146,106,.12)} 50%{box-shadow:0 0 48px rgba(196,146,106,.35),0 0 0 2px rgba(196,146,106,.3)} }
        @keyframes db-card-in  { from{opacity:0;transform:translateY(28px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }

        /* ── Layout ── */
        .db-layout { display:flex; min-height:100vh; }

        /* ━━━━━ SIDEBAR ━━━━━ */
        .db-sidebar {
          width: var(--sidebar-w); position:fixed; top:0; left:0; height:100vh;
          background: #0A0806;
          border-right: 1px solid var(--border);
          display:flex; flex-direction:column; z-index:100; overflow:hidden;
        }
        .db-sb-glow1 {
          position:absolute; top:-120px; right:-80px;
          width:320px; height:320px; border-radius:50%;
          background:radial-gradient(circle,rgba(196,146,106,.07) 0%,transparent 70%);
          pointer-events:none; animation:db-glow-pulse 6s ease-in-out infinite;
        }
        .db-sb-glow2 {
          position:absolute; bottom:-120px; left:-80px;
          width:360px; height:360px; border-radius:50%;
          background:radial-gradient(circle,rgba(196,146,106,.05) 0%,transparent 70%);
          pointer-events:none; animation:db-glow-pulse 8s ease-in-out infinite 2s;
        }

        /* Brand */
        .db-brand {
          padding:26px 22px 20px; position:relative; z-index:1;
          border-bottom:1px solid var(--border);
        }
        .db-logo {
          font-family:var(--font-serif); font-size:21px; font-weight:700;
          color:var(--text); display:flex; align-items:center; gap:10px;
          margin-bottom:4px;
        }
        .db-logo-icon {
          width:30px; height:30px; border-radius:8px;
          background:rgba(196,146,106,.15); border:1px solid rgba(196,146,106,.2);
          display:flex; align-items:center; justify-content:center; font-size:15px;
        }
        .db-tagline {
          font-size:9.5px; color:var(--text-3); letter-spacing:2.5px;
          text-transform:uppercase; padding-left:40px;
        }

        /* Profile */
        .db-profile {
          padding:18px 18px 0; position:relative; z-index:1;
        }
        .db-profile-btn {
          display:flex; align-items:center; gap:12px; width:100%;
          padding:12px 14px; border-radius:var(--radius-sm);
          background:var(--surface); border:1px solid var(--border);
          cursor:pointer; transition:all .22s;
          border-bottom: none; border-radius: 12px 12px 0 0;
          background: linear-gradient(135deg, rgba(196,146,106,.08), rgba(196,146,106,.04));
        }
        .db-profile-btn:hover { background:rgba(196,146,106,.12); border-color:rgba(196,146,106,.2); }
        .db-avatar-wrap {
          position:relative; flex-shrink:0;
        }
        .db-avatar {
          width:46px; height:46px; border-radius:50%;
          background:linear-gradient(135deg,rgba(196,146,106,.3),rgba(196,146,106,.1));
          display:flex; align-items:center; justify-content:center;
          font-size:20px; overflow:hidden;
          animation:db-avatar-glow 4s ease-in-out infinite;
        }
        .db-avatar img { width:100%; height:100%; object-fit:cover; }
        .db-avatar-ring {
          position:absolute; inset:-3px; border-radius:50%;
          border:1.5px solid rgba(196,146,106,.25);
          pointer-events:none;
        }
        .db-avatar-edit {
          position:absolute; bottom:-1px; right:-1px;
          width:15px; height:15px; border-radius:50%;
          background:var(--accent); border:2px solid var(--bg);
          font-size:7px; display:flex; align-items:center; justify-content:center;
          color:white;
        }
        .db-child-name {
          font-family:var(--font-serif); font-size:17px; font-weight:600;
          color:var(--text); line-height:1.2;
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        }
        .db-child-sub { font-size:11px; color:var(--text-3); margin-top:2px; }

        /* Stats strip */
        .db-stats {
          margin:0 18px; display:flex;
          background:rgba(196,146,106,.04);
          border:1px solid var(--border); border-top:none;
          border-radius:0 0 12px 12px; overflow:hidden;
        }
        .db-stat { flex:1; text-align:center; padding:12px 4px; }
        .db-stat:hover { background:var(--surface-hover); }
        .db-stat-n {
          font-family:var(--font-serif); font-size:22px; font-weight:300;
          color:var(--text); line-height:1;
        }
        .db-stat-l {
          font-size:8.5px; color:var(--text-3); letter-spacing:1.5px;
          text-transform:uppercase; margin-top:3px;
        }
        .db-stat-div { width:1px; background:var(--border); margin:8px 0; }

        /* Nav */
        .db-nav { flex:1; padding:10px 12px; position:relative; z-index:1; overflow-y:auto; }
        .db-nav-section {
          font-size:9px; letter-spacing:3px; text-transform:uppercase;
          color:var(--text-3); padding:16px 8px 6px; font-weight:500;
        }
        .db-nav-item {
          display:flex; align-items:center; gap:9px; width:100%;
          padding:9px 10px; border-radius:8px; border:none; background:none;
          font-family:var(--font-sans); font-size:13px; font-weight:400;
          color:var(--text-2); cursor:pointer; transition:all .18s;
          margin-bottom:1px; text-align:left;
        }
        .db-nav-item:hover { background:var(--surface-hover); color:var(--text); }
        .db-nav-item.active { background:rgba(196,146,106,.15); color:var(--accent); }
        .db-nav-item.active .db-nav-icon { background:rgba(196,146,106,.2); }
        .db-nav-icon {
          width:26px; height:26px; border-radius:7px; flex-shrink:0;
          background:rgba(255,255,255,.04); display:flex; align-items:center;
          justify-content:center; font-size:13px;
        }
        .db-nav-badge {
          margin-left:auto; background:var(--accent); color:white;
          font-size:9.5px; font-weight:600; padding:1px 6px; border-radius:8px;
        }

        /* Bottom */
        .db-sb-bottom { padding:12px 16px; border-top:1px solid var(--border); position:relative; z-index:1; }
        .db-user-row {
          display:flex; align-items:center; gap:9px; padding:8px 10px;
          border-radius:8px; cursor:pointer; transition:background .2s;
        }
        .db-user-row:hover { background:var(--surface-hover); }
        .db-user-av {
          width:30px; height:30px; border-radius:50%;
          background:rgba(196,146,106,.2); border:1px solid rgba(196,146,106,.2);
          display:flex; align-items:center; justify-content:center;
          font-size:12px; font-weight:600; color:var(--accent); flex-shrink:0;
        }
        .db-user-name { flex:1; font-size:12px; color:var(--text-2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .db-signout { background:none; border:none; cursor:pointer; color:var(--text-3); font-size:14px; padding:3px; transition:color .2s; }
        .db-signout:hover { color:var(--text-2); }

        /* ━━━━━ MAIN ━━━━━ */
        .db-main { margin-left:var(--sidebar-w); flex:1; min-height:100vh; position:relative; overflow:hidden; }

        /* Ambient background particles */
        .db-particles { position:fixed; inset:0; pointer-events:none; z-index:0; overflow:hidden; margin-left:var(--sidebar-w); }
        .db-particle {
          position:absolute; border-radius:50%;
          animation:db-float linear infinite; opacity:0;
        }

        /* Ambient glow orbs */
        .db-glow-orb {
          position:fixed; border-radius:50%; pointer-events:none; z-index:0;
          filter:blur(90px); animation:db-glow-pulse ease-in-out infinite;
          transition:all 1.5s ease;
        }

        /* ── Topbar ── */
        .db-topbar {
          position:sticky; top:0; z-index:50;
          background:rgba(12,9,6,.85); backdrop-filter:blur(20px) saturate(180%);
          border-bottom:1px solid var(--border);
          padding:0 36px; height:60px;
          display:flex; align-items:center; justify-content:space-between;
        }
        .db-greeting {
          font-family:var(--font-serif); font-size:16px; font-weight:300;
          color:var(--text-2);
        }
        .db-greeting em { font-style:italic; color:var(--accent); }
        .db-topbar-right { display:flex; gap:8px; align-items:center; }

        .db-btn-ghost {
          background:transparent; color:var(--text-2);
          border:1px solid var(--border); border-radius:40px;
          padding:8px 18px; font-family:var(--font-sans);
          font-size:11.5px; font-weight:400; letter-spacing:.8px;
          cursor:pointer; transition:all .25s; white-space:nowrap;
          display:flex; align-items:center; gap:6px;
        }
        .db-btn-ghost:hover { border-color:var(--accent); color:var(--accent); }

        .db-btn-solid {
          background:var(--accent); color:#0C0906;
          border:none; border-radius:40px;
          padding:8px 20px; font-family:var(--font-sans);
          font-size:11.5px; font-weight:500; letter-spacing:1px;
          text-transform:uppercase; cursor:pointer; transition:all .25s;
          display:flex; align-items:center; gap:6px; white-space:nowrap;
        }
        .db-btn-solid:hover { background:var(--gold); transform:translateY(-1px); box-shadow:0 4px 20px rgba(196,146,106,.35); }
        .db-btn-solid:disabled { opacity:.4; cursor:not-allowed; transform:none; box-shadow:none; }

        /* ── Content ── */
        .db-content { padding:36px 40px; max-width:1060px; position:relative; z-index:1; }

        /* ── Section labels ── */
        .db-section-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
        .db-section-label {
          font-size:9.5px; letter-spacing:3.5px; text-transform:uppercase;
          color:var(--accent); font-weight:500;
          display:flex; align-items:center; gap:10px;
        }
        .db-section-label::before { content:''; width:18px; height:1px; background:var(--accent); border-radius:2px; }
        .db-section-link { font-size:11.5px; color:var(--text-3); cursor:pointer; background:none; border:none; font-family:var(--font-sans); transition:color .2s; }
        .db-section-link:hover { color:var(--accent); }

        /* ── Hero Story Card ── */
        .db-hero {
          position:relative; border-radius:var(--radius); overflow:hidden;
          padding:36px 44px; margin-bottom:28px;
          background:linear-gradient(135deg, #1A0F06 0%, #2A1A0C 45%, #1E1408 100%);
          border:1px solid rgba(196,146,106,.12);
          cursor:pointer; transition:all .3s; width:100%; text-align:left;
        }
        .db-hero:hover { border-color:rgba(196,146,106,.3); transform:translateY(-2px); box-shadow:0 16px 60px rgba(0,0,0,.5); }
        .db-hero:disabled { opacity:.6; cursor:not-allowed; transform:none; }
        .db-hero-orb1 {
          position:absolute; top:-60px; right:-60px;
          width:240px; height:240px; border-radius:50%;
          background:radial-gradient(circle,rgba(196,146,106,.1),transparent);
          pointer-events:none;
        }
        .db-hero-orb2 {
          position:absolute; bottom:-80px; left:35%;
          width:300px; height:300px; border-radius:50%;
          background:radial-gradient(circle,rgba(196,146,106,.06),transparent);
          pointer-events:none;
        }
        .db-hero-eyebrow {
          font-size:9.5px; letter-spacing:3.5px; text-transform:uppercase;
          color:rgba(196,146,106,.45); margin-bottom:10px; position:relative; z-index:1;
        }
        .db-hero-title {
          font-family:var(--font-serif); font-size:clamp(22px,2.8vw,32px); font-weight:300;
          color:var(--text); line-height:1.3; position:relative; z-index:1;
        }
        .db-hero-title em { font-style:italic; color:var(--accent); }
        .db-hero-sub {
          font-size:12.5px; color:var(--text-3); margin-top:8px;
          position:relative; z-index:1;
        }
        .db-hero-arrow {
          position:absolute; right:36px; top:50%; transform:translateY(-50%);
          font-size:26px; color:rgba(196,146,106,.2);
          transition:all .3s; z-index:1;
        }
        .db-hero:hover .db-hero-arrow { color:rgba(196,146,106,.7); transform:translateY(-50%) translateX(5px); }
        .db-hero-spinner {
          width:16px; height:16px; border-radius:50%;
          border:2px solid rgba(196,146,106,.2); border-top-color:var(--accent);
          animation:db-spin .8s linear infinite;
        }

        /* ── Stat cards ── */
        .db-stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:28px; }
        .db-stat-card {
          background:var(--surface); border:1px solid var(--border);
          border-radius:var(--radius-sm); padding:20px 18px;
          transition:all .25s; position:relative; overflow:hidden;
        }
        .db-stat-card:hover { border-color:var(--border-h); background:var(--surface-hover); }
        .db-stat-card-icon { font-size:18px; margin-bottom:10px; opacity:.7; }
        .db-stat-card-num {
          font-family:var(--font-serif); font-size:34px; font-weight:300;
          color:var(--text); line-height:1; margin-bottom:4px;
        }
        .db-stat-card-lbl { font-size:10px; color:var(--text-3); letter-spacing:1.5px; text-transform:uppercase; }

        /* ── Action cards ── */
        .db-actions-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:28px; }
        .db-action-card {
          background:var(--surface); border:1px solid var(--border);
          border-radius:var(--radius-sm); padding:22px 20px;
          cursor:pointer; transition:all .25s;
          display:flex; flex-direction:column; gap:10px;
          position:relative; overflow:hidden;
        }
        .db-action-card::after {
          content:''; position:absolute; inset:0;
          background:linear-gradient(135deg, rgba(196,146,106,.06), transparent);
          opacity:0; transition:opacity .3s;
        }
        .db-action-card:hover { border-color:rgba(196,146,106,.25); transform:translateY(-3px); box-shadow:0 8px 32px rgba(0,0,0,.4); }
        .db-action-card:hover::after { opacity:1; }
        .db-action-shine {
          position:absolute; top:0; left:-80%; width:45%; height:100%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent);
          transform:skewX(-15deg);
        }
        .db-action-card:hover .db-action-shine { animation:db-shimmer .6s ease; }
        .db-action-icon {
          width:38px; height:38px; border-radius:9px;
          display:flex; align-items:center; justify-content:center; font-size:17px;
        }
        .db-action-title { font-family:var(--font-serif); font-size:15.5px; font-weight:600; color:var(--text); }
        .db-action-desc { font-size:12px; color:var(--text-3); line-height:1.55; }

        /* ── Memory feed ── */
        .db-memory-feed { display:flex; flex-direction:column; gap:10px; }
        .db-memory-item {
          display:flex; background:var(--surface); border:1px solid var(--border);
          border-radius:var(--radius-sm); overflow:hidden; transition:all .22s;
        }
        .db-memory-item:hover { border-color:var(--border-h); box-shadow:0 4px 20px rgba(0,0,0,.3); transform:translateX(3px); }
        .db-memory-stripe {
          width:3px; flex-shrink:0;
          background:linear-gradient(180deg, rgba(196,146,106,.8), rgba(196,146,106,.2), rgba(196,146,106,.5));
        }
        .db-memory-body { flex:1; padding:16px 20px; min-width:0; }
        .db-memory-meta { display:flex; align-items:center; gap:10px; margin-bottom:7px; }
        .db-memory-author {
          font-size:9px; letter-spacing:2px; text-transform:uppercase;
          color:var(--accent); font-weight:600;
          background:rgba(196,146,106,.1); padding:3px 9px; border-radius:20px;
        }
        .db-memory-date { font-size:11px; color:var(--text-3); }
        .db-memory-text {
          font-family:var(--font-serif); font-size:16px; font-style:italic;
          color:var(--text-2); line-height:1.7;
        }
        .db-memory-thumb { width:88px; flex-shrink:0; object-fit:cover; }

        /* ── Empty state ── */
        .db-empty {
          text-align:center; padding:52px 32px;
          background:var(--surface); border-radius:var(--radius);
          border:1px dashed rgba(196,146,106,.12);
        }
        .db-empty-icon { font-size:40px; margin-bottom:14px; opacity:.5; }
        .db-empty-title { font-family:var(--font-serif); font-size:22px; font-weight:300; color:var(--text); margin-bottom:8px; }
        .db-empty-desc { font-size:13px; color:var(--text-3); line-height:1.65; }

        /* ── Setup screen ── */
        .db-setup-wrap { display:flex; align-items:center; justify-content:center; flex:1; min-height:calc(100vh - 60px); padding:48px; }
        .db-setup-card {
          background:rgba(255,255,255,.03); border:1px solid var(--border);
          border-radius:24px; padding:64px 52px; text-align:center;
          max-width:440px; width:100%;
          box-shadow:0 40px 80px rgba(0,0,0,.5);
          animation:db-card-in .6s ease both;
        }
        .db-setup-emoji { font-size:52px; margin-bottom:20px; }
        .db-setup-title { font-family:var(--font-serif); font-size:32px; font-weight:300; color:var(--text); margin-bottom:12px; }
        .db-setup-title em { font-style:italic; color:var(--accent); }
        .db-setup-desc { font-size:14px; color:var(--text-2); margin-bottom:32px; line-height:1.75; }

        /* ── Staggered animations for home view ── */
        .db-stagger > * { animation:db-card-in .5s ease both; }
        .db-stagger > *:nth-child(1) { animation-delay:.05s; }
        .db-stagger > *:nth-child(2) { animation-delay:.12s; }
        .db-stagger > *:nth-child(3) { animation-delay:.19s; }
        .db-stagger > *:nth-child(4) { animation-delay:.26s; }
        .db-stagger > *:nth-child(5) { animation-delay:.33s; }

        /* ── Modal ── */
        .db-overlay {
          position:fixed; inset:0; background:rgba(0,0,0,.75);
          backdrop-filter:blur(16px); display:flex;
          align-items:center; justify-content:center;
          z-index:300; padding:24px;
          animation:db-fadein .2s ease;
        }
        .db-modal {
          background:#12100D; border:1px solid rgba(196,146,106,.12);
          border-radius:20px; padding:40px; width:100%; max-width:480px;
          box-shadow:0 40px 80px rgba(0,0,0,.6);
          max-height:92vh; overflow-y:auto;
          animation:db-card-in .3s ease both;
        }
        .db-modal-bar {
          height:2px; border-radius:2px 2px 0 0;
          background:linear-gradient(90deg,var(--accent),rgba(196,146,106,.3),var(--accent));
          margin:-40px -40px 32px;
        }
        .db-modal-title { font-family:var(--font-serif); font-size:28px; font-weight:300; color:var(--text); margin-bottom:6px; }
        .db-modal-title em { font-style:italic; color:var(--accent); }
        .db-modal-desc { font-size:13px; color:var(--text-2); margin-bottom:26px; line-height:1.65; }
        .db-f-label { display:block; font-size:9.5px; letter-spacing:2.5px; text-transform:uppercase; color:var(--text-3); margin-bottom:7px; }
        .db-f-input {
          width:100%; padding:12px 15px;
          background:rgba(255,255,255,.05); border:1px solid rgba(196,146,106,.15);
          border-radius:9px; font-family:var(--font-sans);
          font-size:14px; color:var(--text); outline:none;
          transition:all .25s; margin-bottom:16px;
        }
        .db-f-input:focus { border-color:var(--accent); box-shadow:0 0 0 3px rgba(196,146,106,.1); }
        .db-f-textarea {
          width:100%; padding:12px 15px;
          background:rgba(255,255,255,.05); border:1px solid rgba(196,146,106,.15);
          border-radius:9px; font-family:var(--font-serif);
          font-size:16.5px; font-style:italic; color:var(--text); outline:none;
          resize:none; min-height:125px; line-height:1.7;
          transition:all .25s; margin-bottom:16px;
        }
        .db-f-textarea:focus { border-color:var(--accent); box-shadow:0 0 0 3px rgba(196,146,106,.1); }
        .db-f-textarea::placeholder { color:rgba(196,146,106,.25); }
        .db-f-upload {
          display:flex; flex-direction:column; align-items:center;
          justify-content:center; gap:8px; padding:26px;
          border:1.5px dashed rgba(196,146,106,.2); border-radius:9px;
          background:rgba(255,255,255,.02); cursor:pointer;
          color:var(--text-3); font-size:13px;
          transition:all .25s; margin-bottom:16px;
        }
        .db-f-upload:hover { border-color:rgba(196,146,106,.5); color:var(--accent); background:rgba(196,146,106,.04); }
        .db-modal-btns { display:flex; gap:10px; }
        .db-btn-modal-save {
          flex:1; padding:12px; background:var(--accent); color:#0C0906;
          border:none; border-radius:9px; font-family:var(--font-sans);
          font-size:11.5px; font-weight:500; letter-spacing:1.5px;
          text-transform:uppercase; cursor:pointer; transition:all .25s;
        }
        .db-btn-modal-save:hover { background:var(--gold); }
        .db-btn-modal-save:disabled { opacity:.4; cursor:not-allowed; }
        .db-btn-modal-cancel {
          padding:12px 20px; background:transparent; color:var(--text-2);
          border:1px solid rgba(196,146,106,.15); border-radius:9px;
          font-family:var(--font-sans); font-size:12px; cursor:pointer; transition:all .25s;
        }
        .db-btn-modal-cancel:hover { border-color:var(--accent); color:var(--accent); }

        .db-cartoon-spinner {
          width:44px; height:44px; border-radius:50%;
          border:2.5px solid rgba(196,146,106,.15); border-top-color:var(--accent);
          animation:db-spin 1s linear infinite; margin:0 auto 14px;
        }
        .db-invite-code {
          background:rgba(255,255,255,.04); border-radius:9px; padding:14px;
          margin-bottom:14px; font-size:12px; color:var(--text-2);
          word-break:break-all; font-family:monospace; line-height:1.5;
          border:1px solid rgba(196,146,106,.12);
        }

        @media (max-width:900px) {
          :root { --sidebar-w:230px; }
          .db-content { padding:24px; }
          .db-topbar { padding:0 24px; }
          .db-stats-grid { grid-template-columns:repeat(2,1fr); }
          .db-actions-grid { grid-template-columns:repeat(2,1fr); }
        }
        @media (max-width:680px) {
          .db-sidebar { display:none; }
          .db-main { margin-left:0; }
          .db-particles { margin-left:0; }
          .db-stats-grid { grid-template-columns:repeat(2,1fr); }
          .db-actions-grid { grid-template-columns:1fr; }
        }
      `}</style>

      <div className="db-layout">

        {/* ━━━━━ BACKGROUND PARTICLES ━━━━━ */}
        <div className="db-particles">
          {Array.from({ length: 20 }, (_, i) => (
            <div key={i} className="db-particle" style={{
              left: `${4 + (i * 41) % 93}%`,
              width: `${2 + (i * 2) % 3}px`,
              height: `${2 + (i * 2) % 3}px`,
              background: `rgba(196,146,106,${0.12 + (i % 5) * 0.06})`,
              animationDuration: `${9 + (i * 2.4) % 13}s`,
              animationDelay: `${(i * 1.9) % 11}s`,
            }} />
          ))}
        </div>

        {/* Ambient glow orbs */}
        <div className="db-glow-orb" style={{ width:500, height:500, background:'radial-gradient(circle, rgba(196,146,106,0.06), transparent)', top:'-100px', right:'0px', animationDuration:'8s' }} />
        <div className="db-glow-orb" style={{ width:400, height:400, background:'radial-gradient(circle, rgba(196,146,106,0.04), transparent)', bottom:'-80px', right:'20%', animationDuration:'11s', animationDelay:'3s' }} />

        {/* ━━━━━ SIDEBAR ━━━━━ */}
        <aside className="db-sidebar">
          <div className="db-sb-glow1" /><div className="db-sb-glow2" />

          {/* Brand */}
          <div className="db-brand">
            <div className="db-logo">
              <div className="db-logo-icon">📖</div>
              Hemsaga
            </div>
            <div className="db-tagline">Family Stories Forever</div>
          </div>

          {child ? (
            <>
              {/* Profile */}
              <div className="db-profile" style={{ paddingBottom: '0', marginBottom: '0' }}>
                <div className="db-profile-btn" onClick={() => setShowCartoonModal(true)}>
                  <div className="db-avatar-wrap">
                    <div className="db-avatar">
                      {childCartoonUrl ? <img src={childCartoonUrl} alt={child.name} /> : <span>🌟</span>}
                    </div>
                    <div className="db-avatar-ring" />
                    <div className="db-avatar-edit">✎</div>
                  </div>
                  <div style={{ minWidth:0 }}>
                    <div className="db-child-name">{child.name}</div>
                    <div className="db-child-sub">{getAge(child.birthday)}</div>
                  </div>
                </div>
              </div>

              {/* Stats strip */}
              <div className="db-stats" style={{ margin: '0 18px 14px' }}>
                <div className="db-stat">
                  <div className="db-stat-n">{memories.length}</div>
                  <div className="db-stat-l">Memories</div>
                </div>
                <div className="db-stat-div" />
                <div className="db-stat">
                  <div className="db-stat-n">{Math.ceil(memories.length / 5) || 0}</div>
                  <div className="db-stat-l">Chapters</div>
                </div>
                <div className="db-stat-div" />
                <div className="db-stat">
                  <div className="db-stat-n">{getDaysOld(child.birthday)}</div>
                  <div className="db-stat-l">Days</div>
                </div>
              </div>

              {/* Nav */}
              <nav className="db-nav">
                <div className="db-nav-section">Views</div>
                {[
                  { id:'home', icon:'⌂', label:'Dashboard' },
                  { id:'memories', icon:'🌸', label:'Memories', badge: memories.length || null },
                  { id:'story', icon:'📖', label:'Our Story' },
                ].map(n => (
                  <button key={n.id} className={`db-nav-item ${activeView === n.id ? 'active' : ''}`} onClick={() => setActiveView(n.id)}>
                    <span className="db-nav-icon">{n.icon}</span>
                    {n.label}
                    {n.badge && <span className="db-nav-badge">{n.badge}</span>}
                  </button>
                ))}

                <div className="db-nav-section" style={{ marginTop:'8px' }}>Actions</div>
                <button className="db-nav-item" onClick={() => setShowAddMemory(true)}>
                  <span className="db-nav-icon">✦</span> Add Memory
                </button>
                <button className="db-nav-item" onClick={() => { setShowInviteModal(true); setInviteLink(''); }}>
                  <span className="db-nav-icon">👨‍👩‍👧</span> Invite Family
                </button>
                <button className="db-nav-item" onClick={() => setShowCartoonModal(true)}>
                  <span className="db-nav-icon">🎨</span> Cartoon Avatar
                </button>
              </nav>
            </>
          ) : (
            <div className="db-nav">
              <p style={{ fontSize:'12px', color:'var(--text-3)', lineHeight:'1.7', padding:'8px' }}>
                Add your child's profile to begin their story.
              </p>
            </div>
          )}

          <div className="db-sb-bottom">
            <div className="db-user-row">
              <div className="db-user-av">{userName[0].toUpperCase()}</div>
              <span className="db-user-name">{userName}</span>
              <button className="db-signout" onClick={async () => { await supabase.auth.signOut(); router.push('/auth'); }}>↪</button>
            </div>
          </div>
        </aside>

        {/* ━━━━━ MAIN ━━━━━ */}
        <div className="db-main">

          {/* Topbar */}
          <header className="db-topbar">
            <span className="db-greeting">
              {child
                ? <>{getGreeting()} — <em>{child.name}'s story</em> awaits</>
                : <>Welcome to <em>Hemsaga</em></>}
            </span>
            <div className="db-topbar-right">
              {child && (
                <>
                  <button className="db-btn-ghost" onClick={() => setShowAddMemory(true)}>+ Memory</button>
                  <button className="db-btn-solid" onClick={() => generateStory(false)} disabled={generating || memories.length === 0}>
                    {generating
                      ? <><div className="db-hero-spinner" style={{ width:13, height:13, borderWidth:'1.5px' }} />Writing…</>
                      : <>✦ Generate Chapter</>}
                  </button>
                </>
              )}
            </div>
          </header>

          {/* No child */}
          {!child && (
            <div className="db-setup-wrap">
              <div className="db-setup-card">
                <div className="db-setup-emoji">🌸</div>
                <h1 className="db-setup-title">Add your <em>child's</em> profile</h1>
                <p className="db-setup-desc">Their story starts the moment you add them here. Every memory you log becomes a chapter they'll treasure for life.</p>
                <button className="db-btn-solid" style={{ margin:'0 auto', padding:'12px 32px' }} onClick={() => setShowAddChild(true)}>
                  Begin the Story →
                </button>
              </div>
            </div>
          )}

          {/* ━━━ HOME VIEW ━━━ */}
          {child && activeView === 'home' && (
            <div className="db-content db-stagger">

              {/* Hero story button */}
              <button className="db-hero" onClick={() => memories.length > 0 ? generateStory(false) : setShowAddMemory(true)} disabled={generating}>
                <div className="db-hero-orb1" /><div className="db-hero-orb2" />
                <div className="db-hero-eyebrow">AI Story Engine · Hemsaga</div>
                {generating
                  ? <div style={{ display:'flex', alignItems:'center', gap:12, position:'relative', zIndex:1 }}>
                      <div className="db-hero-spinner" />
                      <div className="db-hero-title">Writing {child.name}'s next chapter…</div>
                    </div>
                  : <>
                      <div className="db-hero-title">
                        {memories.length === 0
                          ? <>Start with <em>the first memory</em></>
                          : <>Continue <em>{child.name}'s</em> story</>}
                      </div>
                      <div className="db-hero-sub">
                        {memories.length === 0
                          ? 'Every great story begins with a single moment'
                          : `${memories.length} memories ready · Generate the next chapter`}
                      </div>
                      <div className="db-hero-arrow">→</div>
                    </>}
              </button>

              {/* Stats */}
              <div className="db-section-row"><span className="db-section-label">At a glance</span></div>
              <div className="db-stats-grid" style={{ marginBottom:28 }}>
                {[
                  { icon:'🌸', n:memories.length, l:'Memories' },
                  { icon:'📖', n:Math.ceil(memories.length/5)||0, l:'Chapters' },
                  { icon:'📅', n:getDaysOld(child.birthday), l:'Days old' },
                  { icon:'💛', n:'∞', l:'Love given' },
                ].map((s,i) => (
                  <div key={i} className="db-stat-card">
                    <div className="db-stat-card-icon">{s.icon}</div>
                    <div className="db-stat-card-num">{s.n}</div>
                    <div className="db-stat-card-lbl">{s.l}</div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="db-section-row"><span className="db-section-label">Quick Actions</span></div>
              <div className="db-actions-grid">
                {[
                  { icon:'✍️', bg:'rgba(196,146,106,.12)', title:'Log a Memory', desc:`What happened with ${child.name} today?`, fn:() => setShowAddMemory(true) },
                  { icon:'👨‍👩‍👧', bg:'rgba(100,146,160,.12)', title:'Invite Family', desc:'Share a magic link with grandparents', fn:() => { setShowInviteModal(true); setInviteLink(''); } },
                  { icon:'🎨', bg:'rgba(160,100,196,.12)', title:'Cartoon Avatar', desc:childCartoonUrl ? 'Update the avatar' : 'Generate from photo', fn:() => setShowCartoonModal(true) },
                ].map((a,i) => (
                  <div key={i} className="db-action-card" onClick={a.fn}>
                    <div className="db-action-shine" />
                    <div className="db-action-icon" style={{ background:a.bg }}>{a.icon}</div>
                    <div className="db-action-title">{a.title}</div>
                    <div className="db-action-desc">{a.desc}</div>
                  </div>
                ))}
              </div>

              {/* Recent memories */}
              <div className="db-section-row">
                <span className="db-section-label">Recent Memories</span>
                {memories.length > 3 && <button className="db-section-link" onClick={() => setActiveView('memories')}>View all →</button>}
              </div>

              {memories.length === 0 ? (
                <div className="db-empty">
                  <div className="db-empty-icon">🌸</div>
                  <div className="db-empty-title">The first memory is waiting</div>
                  <div className="db-empty-desc">Even the smallest moment becomes part of {child.name}'s story.<br />What happened today?</div>
                </div>
              ) : (
                <div className="db-memory-feed">
                  {memories.slice(0,4).map(m => (
                    <div key={m.id} className="db-memory-item">
                      <div className="db-memory-stripe" />
                      <div className="db-memory-body">
                        <div className="db-memory-meta">
                          <span className="db-memory-author">{m.author}</span>
                          <span className="db-memory-date">{formatShort(m.memory_date)}</span>
                        </div>
                        <div className="db-memory-text">{m.content}</div>
                      </div>
                      {m.photo_url && <img src={m.photo_url} alt="" className="db-memory-thumb" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ━━━ MEMORIES VIEW ━━━ */}
          {child && activeView === 'memories' && (
            <div className="db-content db-stagger">
              <div className="db-section-row">
                <span className="db-section-label">All Memories · {memories.length}</span>
                <button className="db-btn-ghost" style={{ fontSize:'11px', padding:'7px 14px' }} onClick={() => setShowAddMemory(true)}>+ Add</button>
              </div>
              {memories.length === 0 ? (
                <div className="db-empty">
                  <div className="db-empty-icon">🌸</div>
                  <div className="db-empty-title">No memories yet</div>
                  <div className="db-empty-desc">Start logging moments — big or small, they all matter.</div>
                </div>
              ) : (
                <div className="db-memory-feed">
                  {memories.map(m => (
                    <div key={m.id} className="db-memory-item">
                      <div className="db-memory-stripe" />
                      <div className="db-memory-body">
                        <div className="db-memory-meta">
                          <span className="db-memory-author">{m.author}</span>
                          <span className="db-memory-date">{formatDate(m.memory_date)}</span>
                        </div>
                        <div className="db-memory-text">{m.content}</div>
                      </div>
                      {m.photo_url && <img src={m.photo_url} alt="" className="db-memory-thumb" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ━━━ STORY VIEW ━━━ */}
          {child && activeView === 'story' && (
            <div className="db-content db-stagger">
              <div className="db-section-row"><span className="db-section-label">The Story of {child.name}</span></div>

              <button className="db-hero" onClick={() => generateStory(false)} disabled={generating || memories.length === 0} style={{ marginBottom:28 }}>
                <div className="db-hero-orb1" /><div className="db-hero-orb2" />
                <div className="db-hero-eyebrow">Continue the novel</div>
                {generating
                  ? <div style={{ display:'flex', alignItems:'center', gap:12, position:'relative', zIndex:1 }}>
                      <div className="db-hero-spinner" />
                      <div className="db-hero-title">Writing the next chapter…</div>
                    </div>
                  : <>
                      <div className="db-hero-title">Add a new <em>chapter</em></div>
                      <div className="db-hero-sub">{memories.length} memories to weave into the story</div>
                      <div className="db-hero-arrow">→</div>
                    </>}
              </button>

              {memories.length === 0 ? (
                <div className="db-empty">
                  <div className="db-empty-icon">📖</div>
                  <div className="db-empty-title">No chapters yet</div>
                  <div className="db-empty-desc">Add some memories first, then let AI weave them into {child.name}'s story.</div>
                </div>
              ) : (
                <div style={{ background:'var(--surface)', borderRadius:'var(--radius)', padding:'48px', border:'1px solid var(--border)', textAlign:'center' }}>
                  {childCartoonUrl && (
                    <img src={childCartoonUrl} alt={child.name} style={{ width:72, height:72, borderRadius:'50%', objectFit:'cover', border:'2px solid rgba(196,146,106,.3)', display:'block', margin:'0 auto 20px', animation:'db-avatar-glow 4s ease-in-out infinite' }} />
                  )}
                  <div style={{ fontFamily:'var(--font-serif)', fontSize:'34px', fontWeight:300, color:'var(--text)', marginBottom:8 }}>{child.name}'s Story</div>
                  <div style={{ fontSize:'12.5px', color:'var(--text-3)', marginBottom:28 }}>{memories.length} memories · A growing family novel</div>
                  <button className="db-btn-solid" style={{ margin:'0 auto' }} onClick={() => generateStory(false)} disabled={generating}>
                    {generating ? '✦ Writing…' : '✦ Read & Add Chapter'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ━━━━━ ADD CHILD MODAL ━━━━━ */}
      {showAddChild && (
        <div className="db-overlay">
          <div className="db-modal">
            <div className="db-modal-bar" />
            <h2 className="db-modal-title">Add your <em>child</em></h2>
            <p className="db-modal-desc">Their story starts the moment you add them here.</p>
            <label className="db-f-label">Child's Name</label>
            <input className="db-f-input" placeholder="e.g. Ivaan" value={childName} onChange={e => setChildName(e.target.value)} />
            <label className="db-f-label">Birthday</label>
            <input className="db-f-input" type="date" value={childBirthday} onChange={e => setChildBirthday(e.target.value)} />
            <div className="db-modal-btns">
              <button className="db-btn-modal-save" onClick={saveChild} disabled={saving}>{saving ? 'Saving…' : 'Create Profile →'}</button>
              <button className="db-btn-modal-cancel" onClick={() => setShowAddChild(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━ ADD MEMORY MODAL ━━━━━ */}
      {showAddMemory && (
        <div className="db-overlay" onClick={() => setShowAddMemory(false)}>
          <div className="db-modal" onClick={e => e.stopPropagation()}>
            <div className="db-modal-bar" />
            <h2 className="db-modal-title">Log a <em>memory</em></h2>
            <p className="db-modal-desc">Even the smallest moment becomes part of {child?.name}'s story forever.</p>
            <label className="db-f-label">Who is logging this?</label>
            <input className="db-f-input" placeholder="Papa, Mama, Nana…" value={memoryAuthor} onChange={e => setMemoryAuthor(e.target.value)} />
            <label className="db-f-label">What happened?</label>
            <textarea className="db-f-textarea" placeholder={`e.g. ${child?.name} stood up all by herself today and just grinned at me…`} value={memoryText} onChange={e => setMemoryText(e.target.value)} />
            <label className="db-f-label">Photo (optional)</label>
            {memoryPhotoPreview ? (
              <div style={{ position:'relative', marginBottom:16 }}>
                <img src={memoryPhotoPreview} alt="Preview" style={{ width:'100%', maxHeight:190, objectFit:'cover', borderRadius:9 }} />
                <button onClick={() => { setMemoryPhoto(null); setMemoryPhotoPreview(null); }}
                  style={{ position:'absolute', top:8, right:8, background:'rgba(0,0,0,.65)', color:'white', border:'none', borderRadius:'50%', width:26, height:26, cursor:'pointer', fontSize:15, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
              </div>
            ) : (
              <label className="db-f-upload">
                <span style={{ fontSize:26 }}>📷</span>
                <span>Tap to add a photo</span>
                <input type="file" accept="image/*" style={{ display:'none' }} onChange={e => { const f=e.target.files[0]; if(!f) return; setMemoryPhoto(f); setMemoryPhotoPreview(URL.createObjectURL(f)); }} />
              </label>
            )}
            <div className="db-modal-btns">
              <button className="db-btn-modal-save" onClick={saveMemory} disabled={saving}>{saving ? 'Saving…' : 'Save Memory →'}</button>
              <button className="db-btn-modal-cancel" onClick={() => { setShowAddMemory(false); setMemoryPhoto(null); setMemoryPhotoPreview(null); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━ CARTOON MODAL ━━━━━ */}
      {showCartoonModal && (
        <div className="db-overlay" onClick={() => { if(!cartoonizing){ setShowCartoonModal(false); setCartoonPhoto(null); setCartoonPhotoPreview(null); } }}>
          <div className="db-modal" onClick={e => e.stopPropagation()}>
            <div className="db-modal-bar" />
            <h2 className="db-modal-title">🎨 Cartoon <em>Avatar</em></h2>
            <p className="db-modal-desc">Transform a photo of {child?.name} into a beautiful Pixar-style illustration.</p>

            {cartoonizing && (
              <div style={{ textAlign:'center', padding:'32px 0' }}>
                <div className="db-cartoon-spinner" />
                <div style={{ fontFamily:'var(--font-serif)', fontSize:19, color:'var(--text)', marginBottom:6 }}>Creating {child?.name}'s cartoon…</div>
                <div style={{ fontSize:12.5, color:'var(--text-3)' }}>This takes about 30–60 seconds ✨</div>
              </div>
            )}

            {!cartoonizing && childCartoonUrl && !cartoonPhotoPreview && (
              <div style={{ textAlign:'center' }}>
                <img src={childCartoonUrl} alt="avatar" style={{ width:130, height:130, borderRadius:'50%', objectFit:'cover', border:'2px solid rgba(196,146,106,.3)', display:'block', margin:'0 auto 14px', animation:'db-avatar-glow 4s ease-in-out infinite' }} />
                <p style={{ fontSize:12.5, color:'var(--text-3)', marginBottom:22 }}>{child?.name}'s current avatar</p>
                <label className="db-f-upload">
                  <span style={{ fontSize:20 }}>📷</span>
                  <span>Upload a new photo to regenerate</span>
                  <input type="file" accept="image/*" style={{ display:'none' }} onChange={e => { const f=e.target.files[0]; if(!f) return; setCartoonPhoto(f); setCartoonPhotoPreview(URL.createObjectURL(f)); }} />
                </label>
                <button className="db-btn-modal-cancel" style={{ width:'100%' }} onClick={() => setShowCartoonModal(false)}>Close</button>
              </div>
            )}

            {!cartoonizing && cartoonPhotoPreview && (
              <>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:20, margin:'20px 0 24px' }}>
                  <img src={cartoonPhotoPreview} alt="Original" style={{ width:105, height:105, borderRadius:'50%', objectFit:'cover', border:'2px solid rgba(196,146,106,.2)' }} />
                  <span style={{ fontSize:22, color:'var(--accent)' }}>→</span>
                  <div style={{ width:105, height:105, borderRadius:'50%', background:'rgba(196,146,106,.08)', display:'flex', alignItems:'center', justifyContent:'center', border:'2px dashed rgba(196,146,106,.2)', fontSize:28 }}>✨</div>
                </div>
                <div className="db-modal-btns">
                  <button className="db-btn-modal-save" onClick={generateCartoon}>✨ Generate Cartoon</button>
                  <button className="db-btn-modal-cancel" onClick={() => { setCartoonPhoto(null); setCartoonPhotoPreview(null); }}>Change Photo</button>
                </div>
              </>
            )}

            {!cartoonizing && !childCartoonUrl && !cartoonPhotoPreview && (
              <>
                <label className="db-f-upload" style={{ padding:40 }}>
                  <span style={{ fontSize:38 }}>📷</span>
                  <span style={{ fontFamily:'var(--font-serif)', fontSize:16 }}>Upload a photo of {child?.name}</span>
                  <span style={{ fontSize:11.5, color:'var(--text-3)', textAlign:'center' }}>Clear, front-facing photo works best</span>
                  <input type="file" accept="image/*" style={{ display:'none' }} onChange={e => { const f=e.target.files[0]; if(!f) return; setCartoonPhoto(f); setCartoonPhotoPreview(URL.createObjectURL(f)); }} />
                </label>
                <button className="db-btn-modal-cancel" style={{ width:'100%' }} onClick={() => setShowCartoonModal(false)}>Cancel</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ━━━━━ INVITE MODAL ━━━━━ */}
      {showInviteModal && (
        <div className="db-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="db-modal" onClick={e => e.stopPropagation()}>
            <div className="db-modal-bar" />
            <h2 className="db-modal-title">Invite <em>Family</em></h2>
            <p className="db-modal-desc">Share this link with grandparents — no account needed. They can add memories for {child?.name} directly.</p>
            {!inviteLink ? (
              <div className="db-modal-btns">
                <button className="db-btn-modal-save" onClick={generateInviteLink}>Generate Invite Link</button>
                <button className="db-btn-modal-cancel" onClick={() => setShowInviteModal(false)}>Cancel</button>
              </div>
            ) : (
              <>
                <div className="db-invite-code">{inviteLink}</div>
                <div className="db-modal-btns">
                  <button className="db-btn-modal-save" onClick={() => { navigator.clipboard.writeText(inviteLink); alert('Copied! Send it on WhatsApp 💙'); }}>📋 Copy Link</button>
                  <button className="db-btn-modal-cancel" onClick={() => setShowInviteModal(false)}>Close</button>
                </div>
                <p style={{ fontSize:11.5, color:'var(--text-3)', marginTop:12, textAlign:'center' }}>Anyone with this link can add memories for {child?.name}</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* ━━━━━ STORY READER ━━━━━ */}
      {showStory && story && story.length > 0 && (
        <StoryReader
          chapters={story}
          childName={child?.name}
          avatarUrl={childCartoonUrl}
          onClose={() => setShowStory(false)}
          onRegenerate={() => { setShowStory(false); generateStory(true); }}
        />
      )}
    </>
  );
}