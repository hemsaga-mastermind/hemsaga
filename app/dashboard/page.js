'use client';
import { useState, useEffect } from 'react';
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
  const router = useRouter();

  useEffect(() => { getUser(); }, []);

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

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', fontFamily: 'var(--font-serif)', fontSize: '22px', color: 'var(--accent)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px', animation: 'pulse 2s infinite' }}>📖</div>
        Loading your family story…
      </div>
    </div>
  );

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Papa';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600&display=swap');

        :root {
          --bg: #F7F2EC;
          --surface: #FFFFFF;
          --surface-2: #F0EAE1;
          --border: rgba(190,170,150,0.18);
          --border-hover: rgba(176,125,91,0.35);
          --text: #241A12;
          --text-2: #7A6352;
          --text-3: #B09A87;
          --accent: #A0643A;
          --accent-light: rgba(160,100,58,0.09);
          --dark: #201610;
          --dark-2: #3A2518;
          --gradient: linear-gradient(135deg, #201610 0%, #3A2518 55%, #4E3020 100%);
          --font-serif: 'Playfair Display', Georgia, serif;
          --font-sans: 'DM Sans', system-ui, sans-serif;
          --radius: 18px;
          --radius-sm: 12px;
          --sidebar-w: 272px;
          --shadow: 0 4px 24px rgba(36,26,18,0.07);
          --shadow-lg: 0 12px 48px rgba(36,26,18,0.12);
        }

        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: var(--bg); font-family: var(--font-sans); color: var(--text); -webkit-font-smoothing: antialiased; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }

        /* ━━━━━ LAYOUT ━━━━━ */
        .layout { display: flex; min-height: 100vh; }

        /* ━━━━━ SIDEBAR ━━━━━ */
        .sidebar {
          width: var(--sidebar-w);
          position: fixed; top: 0; left: 0; height: 100vh;
          background: var(--gradient);
          display: flex; flex-direction: column;
          z-index: 100; overflow: hidden;
        }
        .sidebar-glow {
          position: absolute; top: -80px; right: -80px;
          width: 260px; height: 260px; border-radius: 50%;
          background: radial-gradient(circle, rgba(255,220,190,0.06) 0%, transparent 70%);
          pointer-events: none;
        }
        .sidebar-glow-2 {
          position: absolute; bottom: -100px; left: -60px;
          width: 300px; height: 300px; border-radius: 50%;
          background: radial-gradient(circle, rgba(160,100,58,0.08) 0%, transparent 70%);
          pointer-events: none;
        }

        /* Brand */
        .sb-brand {
          padding: 28px 24px 22px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          position: relative; z-index: 1;
        }
        .sb-logo {
          font-family: var(--font-serif);
          font-size: 22px; font-weight: 700;
          color: #FAF6F0; letter-spacing: 0.5px;
          display: flex; align-items: center; gap: 9px;
          margin-bottom: 3px;
        }
        .sb-logo-icon {
          width: 32px; height: 32px; border-radius: 9px;
          background: rgba(255,255,255,0.1);
          display: flex; align-items: center; justify-content: center;
          font-size: 16px;
        }
        .sb-tagline {
          font-size: 10.5px; color: rgba(250,246,240,0.3);
          letter-spacing: 2px; text-transform: uppercase;
          padding-left: 41px;
        }

        /* Child profile block */
        .sb-profile {
          padding: 22px 24px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          position: relative; z-index: 1;
        }
        .sb-profile-inner {
          display: flex; align-items: center; gap: 14px;
          padding: 14px; border-radius: var(--radius-sm);
          background: rgba(255,255,255,0.05);
          transition: background 0.2s;
          cursor: pointer;
        }
        .sb-profile-inner:hover { background: rgba(255,255,255,0.09); }
        .sb-avatar {
          width: 48px; height: 48px; border-radius: 50%;
          background: linear-gradient(135deg, #F5DEC8, #EDD0BC);
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; flex-shrink: 0; overflow: hidden;
          border: 2px solid rgba(245,222,200,0.2);
          position: relative;
        }
        .sb-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .sb-avatar-badge {
          position: absolute; bottom: -1px; right: -1px;
          width: 16px; height: 16px; background: var(--accent);
          border-radius: 50%; border: 2px solid var(--dark);
          font-size: 7px; display: flex; align-items: center; justify-content: center;
          color: white;
        }
        .sb-child-name {
          font-family: var(--font-serif);
          font-size: 18px; font-weight: 600; color: #FAF6F0;
          line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .sb-child-age {
          font-size: 11px; color: rgba(250,246,240,0.4);
          margin-top: 2px; letter-spacing: 0.3px;
        }

        /* Stats strip */
        .sb-stats {
          display: flex; padding: 6px 24px 18px;
          gap: 4px;
          position: relative; z-index: 1;
        }
        .sb-stat {
          flex: 1; text-align: center; padding: 12px 6px;
          border-radius: 10px;
          transition: background 0.2s; cursor: default;
        }
        .sb-stat:hover { background: rgba(255,255,255,0.05); }
        .sb-stat-n {
          font-family: var(--font-serif);
          font-size: 24px; font-weight: 400; color: #FAF6F0; line-height: 1;
        }
        .sb-stat-l {
          font-size: 9px; color: rgba(250,246,240,0.3);
          letter-spacing: 1.5px; text-transform: uppercase; margin-top: 4px;
        }
        .sb-stat-divider {
          width: 1px; background: rgba(255,255,255,0.06);
          margin: 10px 0; align-self: stretch;
        }

        /* Nav */
        .sb-nav {
          flex: 1; padding: 8px 16px;
          position: relative; z-index: 1; overflow-y: auto;
        }
        .sb-nav-label {
          font-size: 9.5px; letter-spacing: 2.5px; text-transform: uppercase;
          color: rgba(250,246,240,0.2); padding: 14px 8px 8px;
          font-weight: 500;
        }
        .sb-nav-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; border-radius: 10px;
          cursor: pointer; transition: all 0.18s;
          margin-bottom: 2px; border: none; background: none;
          width: 100%; text-align: left;
          font-family: var(--font-sans); font-size: 13.5px;
          font-weight: 400; color: rgba(250,246,240,0.45);
        }
        .sb-nav-item:hover { background: rgba(255,255,255,0.07); color: rgba(250,246,240,0.8); }
        .sb-nav-item.active { background: rgba(160,100,58,0.25); color: #F5DEC8; font-weight: 500; }
        .sb-nav-icon {
          width: 28px; height: 28px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; flex-shrink: 0;
          background: rgba(255,255,255,0.06);
        }
        .sb-nav-item.active .sb-nav-icon { background: rgba(160,100,58,0.3); }
        .sb-nav-badge {
          margin-left: auto; background: var(--accent);
          color: white; font-size: 10px; font-weight: 600;
          padding: 2px 7px; border-radius: 10px; min-width: 20px;
          text-align: center;
        }

        /* Sidebar bottom — user */
        .sb-bottom {
          padding: 16px; border-top: 1px solid rgba(255,255,255,0.06);
          position: relative; z-index: 1;
        }
        .sb-user {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; border-radius: 10px;
          cursor: pointer; transition: background 0.2s;
        }
        .sb-user:hover { background: rgba(255,255,255,0.06); }
        .sb-user-av {
          width: 32px; height: 32px; border-radius: 50%;
          background: rgba(160,100,58,0.35);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 600; color: #F5DEC8; flex-shrink: 0;
        }
        .sb-user-name {
          flex: 1; font-size: 12.5px; color: rgba(250,246,240,0.5);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .sb-signout-btn {
          background: none; border: none; cursor: pointer;
          color: rgba(250,246,240,0.25); font-size: 15px;
          padding: 4px; transition: color 0.2s; flex-shrink: 0;
        }
        .sb-signout-btn:hover { color: rgba(250,246,240,0.7); }

        /* ━━━━━ MAIN ━━━━━ */
        .main {
          margin-left: var(--sidebar-w);
          flex: 1; min-height: 100vh;
          display: flex; flex-direction: column;
          background: var(--bg);
        }

        /* Top bar */
        .topbar {
          position: sticky; top: 0; z-index: 50;
          background: rgba(247,242,236,0.88);
          backdrop-filter: blur(16px) saturate(180%);
          border-bottom: 1px solid var(--border);
          padding: 0 40px; height: 64px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .topbar-left { display: flex; align-items: center; gap: 6px; }
        .topbar-greeting {
          font-family: var(--font-serif);
          font-size: 17px; font-weight: 400; color: var(--text);
        }
        .topbar-greeting em { font-style: italic; color: var(--accent); }
        .topbar-right { display: flex; gap: 8px; align-items: center; }

        .btn-primary {
          background: var(--dark); color: #FAF6F0;
          border: none; border-radius: 40px;
          padding: 9px 20px; font-family: var(--font-sans);
          font-size: 12px; font-weight: 500; letter-spacing: 1px;
          text-transform: uppercase; cursor: pointer; transition: all 0.25s;
          display: flex; align-items: center; gap: 6px; white-space: nowrap;
        }
        .btn-primary:hover { background: var(--accent); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(160,100,58,0.3); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

        .btn-outline {
          background: white; color: var(--text-2);
          border: 1px solid var(--border); border-radius: 40px;
          padding: 9px 20px; font-family: var(--font-sans);
          font-size: 12px; font-weight: 500; letter-spacing: 1px;
          text-transform: uppercase; cursor: pointer; transition: all 0.25s;
          display: flex; align-items: center; gap: 6px; white-space: nowrap;
        }
        .btn-outline:hover { border-color: var(--accent); color: var(--accent); }

        /* ━━━━━ CONTENT ━━━━━ */
        .content {
          padding: 36px 40px; flex: 1;
          max-width: 1080px; animation: fadeUp 0.4s ease;
        }

        /* Section headers */
        .section-hd {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 18px;
        }
        .section-label {
          font-size: 10px; letter-spacing: 3px;
          text-transform: uppercase; color: var(--accent);
          font-weight: 600; display: flex; align-items: center; gap: 8px;
        }
        .section-label::before {
          content: ''; width: 20px; height: 1.5px;
          background: var(--accent); border-radius: 2px;
        }
        .section-action {
          font-size: 12px; color: var(--text-3);
          cursor: pointer; transition: color 0.2s; background: none; border: none;
          font-family: var(--font-sans);
        }
        .section-action:hover { color: var(--accent); }

        /* ━━━━━ HERO BANNER ━━━━━ */
        .hero-banner {
          background: var(--gradient);
          border-radius: var(--radius); padding: 36px 40px;
          position: relative; overflow: hidden;
          margin-bottom: 28px; cursor: pointer;
          border: none; width: 100%; text-align: left;
          transition: transform 0.3s, box-shadow 0.3s;
        }
        .hero-banner:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); }
        .hero-banner:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
        .hero-orb-1 {
          position: absolute; top: -60px; right: -60px;
          width: 220px; height: 220px; border-radius: 50%;
          background: radial-gradient(circle, rgba(245,222,200,0.08), transparent);
          pointer-events: none;
        }
        .hero-orb-2 {
          position: absolute; bottom: -80px; left: 30%;
          width: 280px; height: 280px; border-radius: 50%;
          background: radial-gradient(circle, rgba(160,100,58,0.1), transparent);
          pointer-events: none;
        }
        .hero-eyebrow {
          font-size: 10px; letter-spacing: 3px; text-transform: uppercase;
          color: rgba(245,222,200,0.4); margin-bottom: 10px;
          position: relative; z-index: 1;
        }
        .hero-title {
          font-family: var(--font-serif); font-size: 30px; font-weight: 400;
          color: #FAF6F0; line-height: 1.25; position: relative; z-index: 1;
        }
        .hero-title em { font-style: italic; color: #F5DEC8; }
        .hero-sub {
          font-size: 13px; color: rgba(250,246,240,0.45);
          margin-top: 8px; position: relative; z-index: 1;
        }
        .hero-arrow {
          position: absolute; right: 36px; top: 50%;
          transform: translateY(-50%);
          font-size: 28px; color: rgba(245,222,200,0.25);
          transition: all 0.3s; z-index: 1;
        }
        .hero-banner:hover .hero-arrow { color: rgba(245,222,200,0.7); transform: translateY(-50%) translateX(4px); }
        .hero-generating {
          display: flex; align-items: center; gap: 12px;
          position: relative; z-index: 1;
        }
        .hero-spinner {
          width: 18px; height: 18px; border-radius: 50%;
          border: 2px solid rgba(245,222,200,0.2);
          border-top-color: #F5DEC8;
          animation: spin 0.8s linear infinite;
        }

        /* ━━━━━ GRID ━━━━━ */
        .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 28px; }
        .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 28px; }
        .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 28px; }

        /* ━━━━━ STAT CARDS ━━━━━ */
        .stat-card {
          background: var(--surface); border-radius: var(--radius-sm);
          padding: 20px; border: 1px solid var(--border);
          transition: box-shadow 0.25s;
        }
        .stat-card:hover { box-shadow: var(--shadow); }
        .stat-icon { font-size: 20px; margin-bottom: 12px; }
        .stat-num {
          font-family: var(--font-serif); font-size: 36px; font-weight: 400;
          color: var(--text); line-height: 1; margin-bottom: 4px;
        }
        .stat-lbl { font-size: 11px; color: var(--text-3); letter-spacing: 1px; text-transform: uppercase; }

        /* ━━━━━ ACTION CARDS ━━━━━ */
        .action-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 28px; }
        .action-card {
          background: var(--surface); border-radius: var(--radius-sm);
          padding: 22px; cursor: pointer;
          border: 1.5px solid var(--border);
          transition: all 0.22s; display: flex; flex-direction: column;
          gap: 10px; position: relative; overflow: hidden;
        }
        .action-card:hover { border-color: var(--accent); box-shadow: 0 6px 24px rgba(160,100,58,0.1); transform: translateY(-2px); }
        .action-card-shine {
          position: absolute; top: 0; left: -60%;
          width: 40%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          transform: skewX(-20deg); opacity: 0;
          transition: opacity 0.3s;
        }
        .action-card:hover .action-card-shine { opacity: 1; animation: shimmer 0.6s ease; }
        .action-card-icon {
          width: 40px; height: 40px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px;
        }
        .action-card-title {
          font-family: var(--font-serif); font-size: 16px; font-weight: 600; color: var(--text);
        }
        .action-card-desc { font-size: 12px; color: var(--text-3); line-height: 1.5; }

        /* ━━━━━ MEMORY ITEMS ━━━━━ */
        .memory-feed { display: flex; flex-direction: column; gap: 12px; }
        .memory-item {
          background: var(--surface); border-radius: var(--radius-sm);
          border: 1px solid var(--border); overflow: hidden;
          display: flex; transition: all 0.22s;
        }
        .memory-item:hover { border-color: var(--border-hover); box-shadow: var(--shadow); }
        .memory-stripe {
          width: 4px; flex-shrink: 0;
          background: linear-gradient(180deg, #F5DEC8, #E8D0E0, #C8DCE0);
        }
        .memory-body { flex: 1; padding: 20px 22px; min-width: 0; }
        .memory-header {
          display: flex; align-items: center; gap: 10px; margin-bottom: 8px;
        }
        .memory-author-pill {
          font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase;
          color: var(--accent); font-weight: 600;
          background: var(--accent-light); padding: 3px 10px;
          border-radius: 20px; white-space: nowrap;
        }
        .memory-date-txt { font-size: 11.5px; color: var(--text-3); }
        .memory-text {
          font-family: var(--font-serif); font-size: 17px; font-style: italic;
          color: var(--text); line-height: 1.75;
        }
        .memory-thumb {
          width: 96px; flex-shrink: 0; object-fit: cover;
        }

        /* ━━━━━ EMPTY STATE ━━━━━ */
        .empty {
          text-align: center; padding: 56px 32px;
          background: var(--surface); border-radius: var(--radius);
          border: 1.5px dashed rgba(190,170,150,0.25);
        }
        .empty-icon { font-size: 44px; margin-bottom: 14px; opacity: 0.65; }
        .empty-title {
          font-family: var(--font-serif); font-size: 22px; font-weight: 400;
          color: var(--text); margin-bottom: 8px;
        }
        .empty-desc { font-size: 13.5px; color: var(--text-3); line-height: 1.65; }

        /* ━━━━━ SETUP SCREEN ━━━━━ */
        .setup-wrap {
          display: flex; align-items: center; justify-content: center;
          flex: 1; padding: 48px;
        }
        .setup-card {
          background: var(--surface); border-radius: 24px;
          padding: 64px 56px; text-align: center;
          max-width: 460px; width: 100%;
          box-shadow: 0 20px 60px rgba(36,26,18,0.07);
          border: 1px solid var(--border);
          animation: fadeUp 0.5s ease;
        }
        .setup-emoji { font-size: 56px; margin-bottom: 20px; }
        .setup-title {
          font-family: var(--font-serif); font-size: 34px; font-weight: 400;
          color: var(--text); margin-bottom: 12px;
        }
        .setup-title em { font-style: italic; color: var(--accent); }
        .setup-desc { font-size: 14.5px; color: var(--text-2); margin-bottom: 32px; line-height: 1.7; }

        /* ━━━━━ MODAL ━━━━━ */
        .overlay {
          position: fixed; inset: 0;
          background: rgba(32,22,16,0.6); backdrop-filter: blur(12px);
          display: flex; align-items: center; justify-content: center;
          z-index: 300; padding: 24px;
          animation: fadeIn 0.2s ease;
        }
        .modal {
          background: var(--bg); border-radius: 22px;
          padding: 44px; width: 100%; max-width: 500px;
          box-shadow: 0 32px 80px rgba(0,0,0,0.22);
          max-height: 92vh; overflow-y: auto;
          animation: fadeUp 0.28s ease;
        }
        .modal-bar {
          height: 3px; border-radius: 3px 3px 0 0;
          background: linear-gradient(90deg, #F5DEC8, #E8D0E0, #C8DCE0);
          margin: -44px -44px 36px;
        }
        .modal-title {
          font-family: var(--font-serif); font-size: 30px; font-weight: 400;
          color: var(--text); margin-bottom: 6px;
        }
        .modal-title em { font-style: italic; color: var(--accent); }
        .modal-desc { font-size: 13.5px; color: var(--text-2); margin-bottom: 28px; line-height: 1.65; }
        .f-label {
          display: block; font-size: 10px; letter-spacing: 2px;
          text-transform: uppercase; color: var(--text-2);
          margin-bottom: 7px; font-weight: 500;
        }
        .f-input {
          width: 100%; padding: 13px 16px;
          background: white; border: 1px solid rgba(190,170,150,0.35);
          border-radius: 10px; font-family: var(--font-sans);
          font-size: 14.5px; color: var(--text); outline: none;
          transition: all 0.25s; margin-bottom: 18px;
        }
        .f-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(160,100,58,0.1); }
        .f-textarea {
          width: 100%; padding: 13px 16px;
          background: white; border: 1px solid rgba(190,170,150,0.35);
          border-radius: 10px; font-family: var(--font-serif);
          font-size: 17px; font-style: italic; color: var(--text); outline: none;
          resize: none; min-height: 130px; line-height: 1.7;
          transition: all 0.25s; margin-bottom: 18px;
        }
        .f-textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(160,100,58,0.1); }
        .f-textarea::placeholder { color: #C4A990; font-style: italic; }
        .f-upload {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 8px; padding: 28px;
          border: 1.5px dashed rgba(190,170,150,0.45); border-radius: 10px;
          background: white; cursor: pointer;
          color: var(--text-3); font-size: 13px;
          transition: all 0.25s; margin-bottom: 18px;
        }
        .f-upload:hover { border-color: var(--accent); color: var(--accent); background: rgba(160,100,58,0.03); }
        .modal-actions { display: flex; gap: 10px; }
        .btn-modal-save {
          flex: 1; padding: 13px; background: var(--dark); color: #FAF6F0;
          border: none; border-radius: 10px; font-family: var(--font-sans);
          font-size: 12px; font-weight: 500; letter-spacing: 1.5px;
          text-transform: uppercase; cursor: pointer; transition: all 0.25s;
        }
        .btn-modal-save:hover { background: var(--accent); }
        .btn-modal-save:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-modal-cancel {
          padding: 13px 22px; background: white; color: var(--text-2);
          border: 1px solid rgba(190,170,150,0.3); border-radius: 10px;
          font-family: var(--font-sans); font-size: 12px;
          cursor: pointer; transition: all 0.25s;
        }
        .btn-modal-cancel:hover { border-color: var(--accent); color: var(--accent); }

        /* Cartoon modal */
        .cartoon-spinner-ring {
          width: 48px; height: 48px; border-radius: 50%;
          border: 3px solid rgba(190,170,150,0.25);
          border-top-color: var(--accent);
          animation: spin 1s linear infinite;
          margin: 0 auto 14px;
        }
        .cartoon-before-after {
          display: flex; align-items: center; justify-content: center;
          gap: 20px; margin: 20px 0 24px;
        }
        .cartoon-before-after img {
          width: 110px; height: 110px; object-fit: cover;
          border-radius: 50%; border: 3px solid rgba(190,170,150,0.25);
        }

        /* Story modal */
        .story-modal { max-width: 660px; }
        .story-header { text-align: center; margin-bottom: 36px; padding-bottom: 28px; border-bottom: 1px solid var(--border); }
        .story-eyebrow { font-size: 10px; letter-spacing: 3px; text-transform: uppercase; color: var(--accent); margin-bottom: 10px; }
        .story-book-title { font-family: var(--font-serif); font-size: 38px; font-weight: 400; color: var(--text); }
        .story-meta { font-size: 12.5px; color: var(--text-3); margin-top: 8px; }
        .chapter-block { margin-bottom: 44px; }
        .chapter-num { font-size: 10px; letter-spacing: 2.5px; text-transform: uppercase; color: var(--accent); margin-bottom: 8px; }
        .chapter-title { font-family: var(--font-serif); font-size: 24px; font-weight: 600; font-style: italic; color: var(--text); margin-bottom: 18px; }
        .chapter-body { font-family: var(--font-serif); font-size: 17px; font-style: italic; color: var(--text-2); line-height: 1.9; white-space: pre-line; }
        .chapter-sep { text-align: center; color: var(--text-3); font-size: 16px; letter-spacing: 8px; margin: 36px 0; }

        /* Invite */
        .invite-code {
          background: white; border-radius: 10px; padding: 14px 16px;
          margin-bottom: 14px; font-size: 12.5px; color: var(--text-2);
          word-break: break-all; font-family: monospace; line-height: 1.5;
          border: 1px solid var(--border);
        }

        /* Responsive */
        @media (max-width: 960px) {
          :root { --sidebar-w: 230px; }
          .content { padding: 24px 28px; }
          .topbar { padding: 0 28px; }
          .grid-4 { grid-template-columns: repeat(2,1fr); }
          .action-grid { grid-template-columns: repeat(2,1fr); }
        }
        @media (max-width: 700px) {
          .sidebar { display: none; }
          .main { margin-left: 0; }
          .grid-4 { grid-template-columns: repeat(2,1fr); }
          .action-grid { grid-template-columns: 1fr; }
          .grid-2 { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="layout">

        {/* ━━━━━ SIDEBAR ━━━━━ */}
        <aside className="sidebar">
          <div className="sidebar-glow" />
          <div className="sidebar-glow-2" />

          {/* Brand */}
          <div className="sb-brand">
            <div className="sb-logo">
              <div className="sb-logo-icon">📖</div>
              Hemsaga
            </div>
            <div className="sb-tagline">Family Stories Forever</div>
          </div>

          {/* Child profile */}
          {child ? (
            <>
              <div className="sb-profile">
                <div className="sb-profile-inner" onClick={() => setShowCartoonModal(true)} title="Update cartoon avatar">
                  <div className="sb-avatar">
                    {childCartoonUrl
                      ? <img src={childCartoonUrl} alt={child.name} />
                      : <span>🌟</span>}
                    <div className="sb-avatar-badge">✎</div>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="sb-child-name">{child.name}</div>
                    <div className="sb-child-age">{getAge(child.birthday)}</div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="sb-stats">
                <div className="sb-stat">
                  <div className="sb-stat-n">{memories.length}</div>
                  <div className="sb-stat-l">Memories</div>
                </div>
                <div className="sb-stat-divider" />
                <div className="sb-stat">
                  <div className="sb-stat-n">{Math.ceil(memories.length / 5) || 0}</div>
                  <div className="sb-stat-l">Chapters</div>
                </div>
                <div className="sb-stat-divider" />
                <div className="sb-stat">
                  <div className="sb-stat-n">{getDaysOld(child.birthday)}</div>
                  <div className="sb-stat-l">Days old</div>
                </div>
              </div>

              {/* Nav */}
              <nav className="sb-nav">
                <div className="sb-nav-label">Sections</div>
                {[
                  { id: 'home', icon: '⌂', label: 'Dashboard' },
                  { id: 'memories', icon: '🌸', label: 'Memories', badge: memories.length > 0 ? memories.length : null },
                  { id: 'story', icon: '📖', label: 'Our Story' },
                ].map(n => (
                  <button key={n.id} className={`sb-nav-item ${activeView === n.id ? 'active' : ''}`} onClick={() => setActiveView(n.id)}>
                    <span className="sb-nav-icon">{n.icon}</span>
                    {n.label}
                    {n.badge && <span className="sb-nav-badge">{n.badge}</span>}
                  </button>
                ))}
                <div className="sb-nav-label" style={{ marginTop: '8px' }}>Actions</div>
                <button className="sb-nav-item" onClick={() => setShowAddMemory(true)}>
                  <span className="sb-nav-icon">✦</span> Add Memory
                </button>
                <button className="sb-nav-item" onClick={() => { setShowInviteModal(true); setInviteLink(''); }}>
                  <span className="sb-nav-icon">👨‍👩‍👧</span> Invite Family
                </button>
                <button className="sb-nav-item" onClick={() => setShowCartoonModal(true)}>
                  <span className="sb-nav-icon">🎨</span> Cartoon Avatar
                </button>
              </nav>
            </>
          ) : (
            <div className="sb-nav">
              <p style={{ fontSize: '12.5px', color: 'rgba(250,246,240,0.3)', lineHeight: '1.7', padding: '8px' }}>
                Add your child's profile to begin their story.
              </p>
            </div>
          )}

          {/* Bottom user */}
          <div className="sb-bottom">
            <div className="sb-user">
              <div className="sb-user-av">{userName[0].toUpperCase()}</div>
              <span className="sb-user-name">{userName}</span>
              <button className="sb-signout-btn" title="Sign out"
                onClick={async () => { await supabase.auth.signOut(); router.push('/auth'); }}>
                ↪
              </button>
            </div>
          </div>
        </aside>

        {/* ━━━━━ MAIN ━━━━━ */}
        <div className="main">
          {/* Topbar */}
          <header className="topbar">
            <div className="topbar-left">
              <span className="topbar-greeting">
                {child
                  ? <>{getGreeting()}&nbsp;— <em>{child.name}'s story</em> awaits</>
                  : <>Welcome to <em>Hemsaga</em></>}
              </span>
            </div>
            <div className="topbar-right">
              {child && (
                <>
                  <button className="btn-outline" onClick={() => setShowAddMemory(true)}>+ Memory</button>
                  <button className="btn-primary" onClick={() => generateStory(false)} disabled={generating || memories.length === 0}>
                    {generating
                      ? <><div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.8s linear infinite' }} />Writing…</>
                      : <>✦ Generate Chapter</>}
                  </button>
                </>
              )}
            </div>
          </header>

          {/* No child */}
          {!child && (
            <div className="setup-wrap">
              <div className="setup-card">
                <div className="setup-emoji">🌸</div>
                <h1 className="setup-title">Add your <em>child's</em> profile</h1>
                <p className="setup-desc">Their story starts the moment you add them here. Every memory you log becomes a chapter they'll treasure for life.</p>
                <button className="btn-primary" style={{ margin: '0 auto', fontSize: '13px', padding: '12px 32px' }} onClick={() => setShowAddChild(true)}>
                  Begin the Story →
                </button>
              </div>
            </div>
          )}

          {/* ━━━ HOME VIEW ━━━ */}
          {child && activeView === 'home' && (
            <div className="content">

              {/* AI Story banner */}
              <button className="hero-banner" onClick={() => memories.length > 0 ? generateStory(false) : setShowAddMemory(true)} disabled={generating}>
                <div className="hero-orb-1" /><div className="hero-orb-2" />
                <div className="hero-eyebrow">AI Story Engine · Hemsaga</div>
                {generating
                  ? <div className="hero-generating">
                      <div className="hero-spinner" />
                      <div className="hero-title">Writing {child.name}'s next chapter…</div>
                    </div>
                  : <>
                      <div className="hero-title">
                        {memories.length === 0
                          ? <>Start by adding <em>the first memory</em></>
                          : <>Continue <em>{child.name}'s</em> story</>}
                      </div>
                      <div className="hero-sub">
                        {memories.length === 0
                          ? 'Every great story begins with a single moment'
                          : `${memories.length} memories ready · Generate the next chapter`}
                      </div>
                      <div className="hero-arrow">→</div>
                    </>}
              </button>

              {/* Stats */}
              <div className="section-hd">
                <span className="section-label">At a glance</span>
              </div>
              <div className="grid-4" style={{ marginBottom: '28px' }}>
                {[
                  { icon: '🌸', n: memories.length, l: 'Memories' },
                  { icon: '📖', n: Math.ceil(memories.length / 5) || 0, l: 'Chapters' },
                  { icon: '📅', n: getDaysOld(child.birthday), l: 'Days old' },
                  { icon: '👨‍👩‍👧', n: '∞', l: 'Love given' },
                ].map((s, i) => (
                  <div key={i} className="stat-card">
                    <div className="stat-icon">{s.icon}</div>
                    <div className="stat-num">{s.n}</div>
                    <div className="stat-lbl">{s.l}</div>
                  </div>
                ))}
              </div>

              {/* Quick actions */}
              <div className="section-hd">
                <span className="section-label">Quick Actions</span>
              </div>
              <div className="action-grid">
                {[
                  { icon: '✍️', bg: 'rgba(245,222,200,0.45)', title: 'Log a Memory', desc: `What happened with ${child.name} today?`, fn: () => setShowAddMemory(true) },
                  { icon: '👨‍👩‍👧', bg: 'rgba(200,220,224,0.45)', title: 'Invite Family', desc: 'Share a link — grandparents can add memories too', fn: () => { setShowInviteModal(true); setInviteLink(''); } },
                  { icon: '🎨', bg: 'rgba(232,208,224,0.45)', title: 'Cartoon Avatar', desc: childCartoonUrl ? 'Update the avatar' : 'Generate from photo', fn: () => setShowCartoonModal(true) },
                ].map((a, i) => (
                  <div key={i} className="action-card" onClick={a.fn}>
                    <div className="action-card-shine" />
                    <div className="action-card-icon" style={{ background: a.bg }}>{a.icon}</div>
                    <div className="action-card-title">{a.title}</div>
                    <div className="action-card-desc">{a.desc}</div>
                  </div>
                ))}
              </div>

              {/* Recent memories preview */}
              <div className="section-hd">
                <span className="section-label">Recent Memories</span>
                {memories.length > 3 && (
                  <button className="section-action" onClick={() => setActiveView('memories')}>View all →</button>
                )}
              </div>

              {memories.length === 0 ? (
                <div className="empty">
                  <div className="empty-icon">🌸</div>
                  <div className="empty-title">The first memory is waiting</div>
                  <div className="empty-desc">Even the smallest moment becomes part of {child.name}'s story forever.<br />What happened today?</div>
                </div>
              ) : (
                <div className="memory-feed">
                  {memories.slice(0, 4).map(m => (
                    <div key={m.id} className="memory-item">
                      <div className="memory-stripe" />
                      <div className="memory-body">
                        <div className="memory-header">
                          <span className="memory-author-pill">{m.author}</span>
                          <span className="memory-date-txt">{formatShort(m.memory_date)}</span>
                        </div>
                        <div className="memory-text">{m.content}</div>
                      </div>
                      {m.photo_url && <img src={m.photo_url} alt="" className="memory-thumb" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ━━━ MEMORIES VIEW ━━━ */}
          {child && activeView === 'memories' && (
            <div className="content">
              <div className="section-hd">
                <span className="section-label">All Memories · {memories.length}</span>
                <button className="btn-outline" style={{ fontSize: '11px', padding: '8px 16px' }} onClick={() => setShowAddMemory(true)}>+ Add</button>
              </div>

              {memories.length === 0 ? (
                <div className="empty">
                  <div className="empty-icon">🌸</div>
                  <div className="empty-title">No memories yet</div>
                  <div className="empty-desc">Start logging moments for {child.name} — big or small, they all matter.</div>
                </div>
              ) : (
                <div className="memory-feed">
                  {memories.map(m => (
                    <div key={m.id} className="memory-item">
                      <div className="memory-stripe" />
                      <div className="memory-body">
                        <div className="memory-header">
                          <span className="memory-author-pill">{m.author}</span>
                          <span className="memory-date-txt">{formatDate(m.memory_date)}</span>
                        </div>
                        <div className="memory-text">{m.content}</div>
                      </div>
                      {m.photo_url && <img src={m.photo_url} alt="" className="memory-thumb" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ━━━ STORY VIEW ━━━ */}
          {child && activeView === 'story' && (
            <div className="content">
              <div className="section-hd">
                <span className="section-label">The Story of {child.name}</span>
              </div>

              <button className="hero-banner" onClick={() => generateStory(false)} disabled={generating || memories.length === 0} style={{ marginBottom: '24px' }}>
                <div className="hero-orb-1" /><div className="hero-orb-2" />
                <div className="hero-eyebrow">Continue the novel</div>
                {generating
                  ? <div className="hero-generating">
                      <div className="hero-spinner" />
                      <div className="hero-title">Writing the next chapter…</div>
                    </div>
                  : <>
                      <div className="hero-title">Add a new <em>chapter</em></div>
                      <div className="hero-sub">{memories.length} memories available to weave into the story</div>
                      <div className="hero-arrow">→</div>
                    </>}
              </button>

              {memories.length === 0 ? (
                <div className="empty">
                  <div className="empty-icon">📖</div>
                  <div className="empty-title">No chapters yet</div>
                  <div className="empty-desc">Add some memories first, then let AI weave them into {child.name}'s story.</div>
                </div>
              ) : (
                <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '48px', border: '1px solid var(--border)', textAlign: 'center' }}>
                  {childCartoonUrl && (
                    <img src={childCartoonUrl} alt={child.name} style={{ width: 76, height: 76, borderRadius: '50%', objectFit: 'cover', border: '3px solid #F5DEC8', marginBottom: 20, display: 'block', margin: '0 auto 20px' }} />
                  )}
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '36px', fontWeight: 400, color: 'var(--text)', marginBottom: 8 }}>
                    {child.name}'s Story
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: 28 }}>
                    {memories.length} memories · A growing family novel
                  </div>
                  <button className="btn-primary" style={{ margin: '0 auto' }} onClick={() => generateStory(false)} disabled={generating}>
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
        <div className="overlay">
          <div className="modal">
            <div className="modal-bar" />
            <h2 className="modal-title">Add your <em>child</em></h2>
            <p className="modal-desc">Their story starts the moment you add them here.</p>
            <label className="f-label">Child's Name</label>
            <input className="f-input" placeholder="e.g. Ivaan" value={childName} onChange={e => setChildName(e.target.value)} />
            <label className="f-label">Birthday</label>
            <input className="f-input" type="date" value={childBirthday} onChange={e => setChildBirthday(e.target.value)} />
            <div className="modal-actions">
              <button className="btn-modal-save" onClick={saveChild} disabled={saving}>{saving ? 'Saving…' : 'Create Profile →'}</button>
              <button className="btn-modal-cancel" onClick={() => setShowAddChild(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━ ADD MEMORY MODAL ━━━━━ */}
      {showAddMemory && (
        <div className="overlay" onClick={() => setShowAddMemory(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-bar" />
            <h2 className="modal-title">Log a <em>memory</em></h2>
            <p className="modal-desc">Even the smallest moment becomes part of {child?.name}'s story forever.</p>
            <label className="f-label">Who is logging this?</label>
            <input className="f-input" placeholder="Papa, Mama, Nana…" value={memoryAuthor} onChange={e => setMemoryAuthor(e.target.value)} />
            <label className="f-label">What happened?</label>
            <textarea className="f-textarea" placeholder={`e.g. ${child?.name} stood up all by herself today and just grinned at me…`} value={memoryText} onChange={e => setMemoryText(e.target.value)} />
            <label className="f-label">Photo (optional)</label>
            {memoryPhotoPreview ? (
              <div style={{ position: 'relative', marginBottom: 18 }}>
                <img src={memoryPhotoPreview} alt="Preview" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 10 }} />
                <button onClick={() => { setMemoryPhoto(null); setMemoryPhotoPreview(null); }}
                  style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.55)', color: 'white', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>
            ) : (
              <label className="f-upload">
                <span style={{ fontSize: 28 }}>📷</span>
                <span>Tap to add a photo</span>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (!f) return; setMemoryPhoto(f); setMemoryPhotoPreview(URL.createObjectURL(f)); }} />
              </label>
            )}
            <div className="modal-actions">
              <button className="btn-modal-save" onClick={saveMemory} disabled={saving}>{saving ? 'Saving…' : 'Save Memory →'}</button>
              <button className="btn-modal-cancel" onClick={() => { setShowAddMemory(false); setMemoryPhoto(null); setMemoryPhotoPreview(null); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━ CARTOON MODAL ━━━━━ */}
      {showCartoonModal && (
        <div className="overlay" onClick={() => { if (!cartoonizing) { setShowCartoonModal(false); setCartoonPhoto(null); setCartoonPhotoPreview(null); } }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-bar" />
            <h2 className="modal-title">🎨 Cartoon <em>Avatar</em></h2>
            <p className="modal-desc">Transform a photo of {child?.name} into a beautiful Pixar-style illustration.</p>

            {cartoonizing && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div className="cartoon-spinner-ring" />
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--text)', marginBottom: 6 }}>Creating {child?.name}'s cartoon…</div>
                <div style={{ fontSize: 13, color: 'var(--text-3)' }}>This takes about 30–60 seconds ✨</div>
              </div>
            )}

            {!cartoonizing && childCartoonUrl && !cartoonPhotoPreview && (
              <div style={{ textAlign: 'center' }}>
                <img src={childCartoonUrl} alt="avatar" style={{ width: 140, height: 140, borderRadius: '50%', objectFit: 'cover', border: '4px solid #F5DEC8', display: 'block', margin: '0 auto 14px' }} />
                <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 22 }}>{child?.name}'s current avatar</p>
                <label className="f-upload">
                  <span style={{ fontSize: 22 }}>📷</span>
                  <span>Upload a new photo to regenerate</span>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (!f) return; setCartoonPhoto(f); setCartoonPhotoPreview(URL.createObjectURL(f)); }} />
                </label>
                <button className="btn-modal-cancel" style={{ width: '100%' }} onClick={() => setShowCartoonModal(false)}>Close</button>
              </div>
            )}

            {!cartoonizing && cartoonPhotoPreview && (
              <>
                <div className="cartoon-before-after">
                  <img src={cartoonPhotoPreview} alt="Original" />
                  <span style={{ fontSize: 24, color: 'var(--accent)' }}>→</span>
                  <div style={{ width: 110, height: 110, borderRadius: '50%', background: 'linear-gradient(135deg, #F5DEC8, #E8D0E0)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px dashed rgba(190,170,150,0.4)', fontSize: 28 }}>✨</div>
                </div>
                <div className="modal-actions">
                  <button className="btn-modal-save" onClick={generateCartoon}>✨ Generate Cartoon</button>
                  <button className="btn-modal-cancel" onClick={() => { setCartoonPhoto(null); setCartoonPhotoPreview(null); }}>Change Photo</button>
                </div>
              </>
            )}

            {!cartoonizing && !childCartoonUrl && !cartoonPhotoPreview && (
              <>
                <label className="f-upload" style={{ padding: 40 }}>
                  <span style={{ fontSize: 40 }}>📷</span>
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: 17 }}>Upload a photo of {child?.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center' }}>Clear, front-facing photo works best</span>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (!f) return; setCartoonPhoto(f); setCartoonPhotoPreview(URL.createObjectURL(f)); }} />
                </label>
                <button className="btn-modal-cancel" style={{ width: '100%' }} onClick={() => setShowCartoonModal(false)}>Cancel</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ━━━━━ INVITE MODAL ━━━━━ */}
      {showInviteModal && (
        <div className="overlay" onClick={() => setShowInviteModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-bar" />
            <h2 className="modal-title">Invite <em>Family</em></h2>
            <p className="modal-desc">Share this link with grandparents — no account needed. They can add memories and photos for {child?.name} directly.</p>
            {!inviteLink ? (
              <div className="modal-actions">
                <button className="btn-modal-save" onClick={generateInviteLink}>Generate Invite Link</button>
                <button className="btn-modal-cancel" onClick={() => setShowInviteModal(false)}>Cancel</button>
              </div>
            ) : (
              <>
                <div className="invite-code">{inviteLink}</div>
                <div className="modal-actions">
                  <button className="btn-modal-save" onClick={() => { navigator.clipboard.writeText(inviteLink); alert('Link copied! Send it on WhatsApp 💙'); }}>
                    📋 Copy Link
                  </button>
                  <button className="btn-modal-cancel" onClick={() => setShowInviteModal(false)}>Close</button>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 14, textAlign: 'center' }}>Anyone with this link can add memories for {child?.name}</p>
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