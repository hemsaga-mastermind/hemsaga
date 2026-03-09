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
        setChildCartoonUrl(data.cartoonUrl); setChild(prev => ({ ...prev, cartoon_url: data.cartoonUrl }));
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
  const getDaysOld = (birthday) => Math.floor((new Date() - new Date(birthday)) / 86400000).toLocaleString();
  const formatDate = (d) => new Date(d).toLocaleDateString('en-SE', { day: 'numeric', month: 'long', year: 'numeric' });
  const formatShort = (d) => new Date(d).toLocaleDateString('en-SE', { day: 'numeric', month: 'short' });
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Papa';

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF7F2' }}>
      <div style={{ textAlign: 'center', fontFamily: "'Lora', Georgia, serif", color: '#8B6B4A' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px', display: 'inline-block', animation: 'hs-breathe 2s ease-in-out infinite' }}>🌸</div>
        <div style={{ fontSize: '16px', fontStyle: 'italic', opacity: 0.7 }}>Loading your family story…</div>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap');

        /* ═══════════════════════════════════════════════════
           DESIGN TOKENS
           Warm ivory + deep espresso + terracotta
        ═══════════════════════════════════════════════════ */
        :root {
          --ivory:        #FAF7F2;
          --ivory-2:      #F3EDE4;
          --ivory-3:      #EAE0D3;
          --parchment:    #E8DDD0;
          --espresso:     #2C1A0E;
          --espresso-2:   #4A2E1A;
          --espresso-3:   #6B4226;
          --terra:        #C4724A;    /* warm terracotta — primary accent */
          --terra-light:  rgba(196,114,74,0.10);
          --terra-mid:    rgba(196,114,74,0.22);
          --sage:         #7A9E7E;    /* soft sage — secondary accent */
          --blush:        #D4A5A0;    /* blush — tertiary */
          --ink:          #2C1A0E;
          --ink-2:        #5C3D24;
          --ink-3:        #8C6B4E;
          --ink-4:        #B89980;
          --ink-5:        #D4BBA8;
          --white:        #FFFFFF;
          --shadow-xs:    0 1px 3px rgba(44,26,14,0.06), 0 1px 2px rgba(44,26,14,0.04);
          --shadow-sm:    0 2px 8px rgba(44,26,14,0.07), 0 1px 3px rgba(44,26,14,0.05);
          --shadow-md:    0 4px 16px rgba(44,26,14,0.09), 0 2px 6px rgba(44,26,14,0.06);
          --shadow-lg:    0 12px 40px rgba(44,26,14,0.12), 0 4px 12px rgba(44,26,14,0.08);
          --shadow-xl:    0 24px 64px rgba(44,26,14,0.15), 0 8px 20px rgba(44,26,14,0.10);
          --font-serif:   'Lora', 'Georgia', serif;
          --font-sans:    'Plus Jakarta Sans', system-ui, sans-serif;
          --r-sm:         10px;
          --r-md:         16px;
          --r-lg:         24px;
          --r-xl:         32px;
          --sidebar-w:    280px;
          --topbar-h:     64px;
        }

        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body {
          background: var(--ivory);
          color: var(--ink);
          font-family: var(--font-sans);
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        /* ── Global keyframes ── */
        @keyframes hs-breathe   { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
        @keyframes hs-fadein    { from{opacity:0} to{opacity:1} }
        @keyframes hs-slideup   { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes hs-spin      { to{transform:rotate(360deg)} }
        @keyframes hs-shimmer   { 0%{transform:translateX(-100%) skewX(-12deg)} 100%{transform:translateX(250%) skewX(-12deg)} }
        @keyframes hs-pop       { 0%{transform:scale(.96);opacity:0} 60%{transform:scale(1.01)} 100%{transform:scale(1);opacity:1} }
        @keyframes hs-ripple    { 0%{transform:scale(0);opacity:.4} 100%{transform:scale(4);opacity:0} }
        @keyframes hs-avatar-ring { 0%,100%{box-shadow:0 0 0 3px rgba(196,114,74,.18),0 0 0 6px rgba(196,114,74,.06)} 50%{box-shadow:0 0 0 3px rgba(196,114,74,.35),0 0 0 8px rgba(196,114,74,.12)} }
        @keyframes hs-dot-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }
        @keyframes hs-hero-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes hs-stagger-in {
          from { opacity:0; transform:translateY(14px); }
          to   { opacity:1; transform:translateY(0); }
        }

        /* ═══════════════════════════════════════════════════
           LAYOUT
        ═══════════════════════════════════════════════════ */
        .hs-layout { display: flex; min-height: 100vh; }

        /* ═══════════════════════════════════════════════════
           SIDEBAR
        ═══════════════════════════════════════════════════ */
        .hs-sidebar {
          width: var(--sidebar-w);
          position: fixed; top: 0; left: 0; height: 100vh;
          background: var(--espresso);
          display: flex; flex-direction: column;
          z-index: 200; overflow: hidden;
        }

        /* Subtle texture overlay */
        .hs-sidebar::before {
          content: '';
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 160% 60% at 50% 0%, rgba(196,114,74,.18) 0%, transparent 60%),
            radial-gradient(ellipse 120% 40% at 20% 100%, rgba(196,114,74,.10) 0%, transparent 50%);
          pointer-events: none;
        }

        /* ── Brand ── */
        .hs-brand {
          padding: 28px 24px 22px;
          border-bottom: 1px solid rgba(255,255,255,.07);
          position: relative; z-index: 1;
          flex-shrink: 0;
        }
        .hs-logo {
          display: flex; align-items: center; gap: 11px;
          font-family: var(--font-serif);
          font-size: 21px; font-weight: 700;
          color: rgba(250,247,242,0.96);
          letter-spacing: -.2px; margin-bottom: 3px;
        }
        .hs-logo-mark {
          width: 34px; height: 34px;
          background: linear-gradient(135deg, var(--terra) 0%, #E8956A 100%);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px;
          box-shadow: 0 4px 12px rgba(196,114,74,.4);
          flex-shrink: 0;
        }
        .hs-tagline {
          font-size: 10px; letter-spacing: 2.5px; text-transform: uppercase;
          color: rgba(250,247,242,.28); padding-left: 45px;
        }

        /* ── Child profile card ── */
        .hs-profile {
          padding: 20px 20px 0;
          position: relative; z-index: 1;
          flex-shrink: 0;
        }
        .hs-profile-card {
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.09);
          border-radius: var(--r-md);
          padding: 16px;
          cursor: pointer;
          transition: background .2s, border-color .2s;
        }
        .hs-profile-card:hover {
          background: rgba(255,255,255,.10);
          border-color: rgba(196,114,74,.4);
        }
        .hs-profile-top {
          display: flex; align-items: center; gap: 13px;
          margin-bottom: 14px;
        }
        .hs-avatar-wrap { position: relative; flex-shrink: 0; }
        .hs-avatar {
          width: 50px; height: 50px; border-radius: 50%;
          background: linear-gradient(135deg, rgba(196,114,74,.5), rgba(196,114,74,.2));
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; overflow: hidden;
          animation: hs-avatar-ring 5s ease-in-out infinite;
        }
        .hs-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .hs-avatar-edit {
          position: absolute; bottom: -2px; right: -2px;
          width: 18px; height: 18px; border-radius: 50%;
          background: var(--terra); border: 2px solid var(--espresso);
          display: flex; align-items: center; justify-content: center;
          font-size: 8px; color: white;
        }
        .hs-child-name {
          font-family: var(--font-serif);
          font-size: 18px; font-weight: 600;
          color: rgba(250,247,242,.95); line-height: 1.2;
        }
        .hs-child-age { font-size: 11px; color: rgba(250,247,242,.38); margin-top: 2px; }

        /* Mini stats in profile card */
        .hs-profile-stats {
          display: grid; grid-template-columns: repeat(3,1fr);
          gap: 1px; background: rgba(255,255,255,.07);
          border-radius: 8px; overflow: hidden;
        }
        .hs-ps {
          background: rgba(0,0,0,.15);
          padding: 9px 6px; text-align: center;
        }
        .hs-ps-n {
          font-family: var(--font-serif);
          font-size: 18px; font-weight: 500;
          color: rgba(250,247,242,.9); line-height: 1;
        }
        .hs-ps-l {
          font-size: 8.5px; letter-spacing: 1.5px; text-transform: uppercase;
          color: rgba(250,247,242,.3); margin-top: 3px;
        }

        /* ── Nav ── */
        .hs-nav {
          flex: 1; padding: 10px 14px;
          position: relative; z-index: 1;
          overflow-y: auto;
        }
        .hs-nav-label {
          font-size: 9px; letter-spacing: 3px; text-transform: uppercase;
          color: rgba(250,247,242,.22); padding: 18px 8px 7px;
          font-weight: 600;
        }
        .hs-nav-item {
          display: flex; align-items: center; gap: 10px;
          width: 100%; padding: 10px 12px; border-radius: var(--r-sm);
          border: none; background: none; cursor: pointer;
          font-family: var(--font-sans); font-size: 13.5px; font-weight: 400;
          color: rgba(250,247,242,.45); text-align: left;
          transition: all .18s; margin-bottom: 1px;
          position: relative; overflow: hidden;
        }
        .hs-nav-item:hover {
          background: rgba(255,255,255,.08);
          color: rgba(250,247,242,.8);
        }
        .hs-nav-item.active {
          background: rgba(196,114,74,.2);
          color: rgba(250,247,242,.95);
          font-weight: 500;
        }
        .hs-nav-item.active::before {
          content: '';
          position: absolute; left: 0; top: 20%; bottom: 20%;
          width: 3px; border-radius: 0 3px 3px 0;
          background: var(--terra);
        }
        .hs-nav-icon {
          width: 28px; height: 28px; border-radius: 8px;
          background: rgba(255,255,255,.06);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; flex-shrink: 0;
          transition: background .18s;
        }
        .hs-nav-item.active .hs-nav-icon { background: rgba(196,114,74,.25); }
        .hs-nav-badge {
          margin-left: auto;
          background: var(--terra); color: white;
          font-size: 10px; font-weight: 600;
          padding: 2px 7px; border-radius: 20px;
          min-width: 20px; text-align: center;
        }

        /* ── Bottom user ── */
        .hs-sb-bottom {
          padding: 12px 14px 16px;
          border-top: 1px solid rgba(255,255,255,.06);
          position: relative; z-index: 1; flex-shrink: 0;
        }
        .hs-user-row {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 10px; border-radius: var(--r-sm);
          transition: background .2s; cursor: default;
        }
        .hs-user-row:hover { background: rgba(255,255,255,.07); }
        .hs-user-av {
          width: 32px; height: 32px; border-radius: 50%;
          background: rgba(196,114,74,.3); border: 1.5px solid rgba(196,114,74,.4);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-serif); font-size: 13px; font-weight: 600;
          color: rgba(250,247,242,.8); flex-shrink: 0;
        }
        .hs-user-name {
          flex: 1; font-size: 12.5px; color: rgba(250,247,242,.45);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .hs-signout {
          background: none; border: none; cursor: pointer;
          color: rgba(250,247,242,.25); font-size: 14px; padding: 3px;
          transition: color .2s; line-height: 1;
        }
        .hs-signout:hover { color: rgba(250,247,242,.6); }

        /* ═══════════════════════════════════════════════════
           MAIN CONTENT
        ═══════════════════════════════════════════════════ */
        .hs-main {
          margin-left: var(--sidebar-w);
          flex: 1; min-height: 100vh;
          background: var(--ivory);
          display: flex; flex-direction: column;
        }

        /* ── Topbar ── */
        .hs-topbar {
          height: var(--topbar-h);
          background: rgba(250,247,242,.92);
          backdrop-filter: blur(20px) saturate(150%);
          -webkit-backdrop-filter: blur(20px) saturate(150%);
          border-bottom: 1px solid rgba(44,26,14,.07);
          padding: 0 44px;
          display: flex; align-items: center; justify-content: space-between;
          position: sticky; top: 0; z-index: 100;
        }
        .hs-greeting {
          font-family: var(--font-serif);
          font-size: 15px; font-weight: 400;
          color: var(--ink-3);
          display: flex; align-items: center; gap: 6px;
        }
        .hs-greeting em { font-style: italic; color: var(--terra); font-weight: 500; }
        .hs-topbar-actions { display: flex; gap: 8px; align-items: center; }

        /* Buttons */
        .btn-ghost {
          background: transparent; color: var(--ink-3);
          border: 1.5px solid var(--ivory-3); border-radius: 40px;
          padding: 8px 18px; font-family: var(--font-sans); font-size: 12px;
          font-weight: 500; cursor: pointer; transition: all .2s;
          display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;
        }
        .btn-ghost:hover {
          border-color: var(--terra); color: var(--terra);
          background: var(--terra-light);
        }
        .btn-primary {
          background: var(--espresso); color: rgba(250,247,242,.95);
          border: none; border-radius: 40px;
          padding: 9px 22px; font-family: var(--font-sans); font-size: 12px;
          font-weight: 500; letter-spacing: .6px; cursor: pointer;
          transition: all .25s; display: inline-flex; align-items: center; gap: 7px;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(44,26,14,.2);
        }
        .btn-primary:hover {
          background: var(--terra);
          box-shadow: 0 4px 20px rgba(196,114,74,.4);
          transform: translateY(-1px);
        }
        .btn-primary:disabled { opacity: .45; cursor: not-allowed; transform: none; box-shadow: none; }

        /* ── Content area ── */
        .hs-content {
          padding: 44px 44px 60px;
          max-width: 1100px;
        }

        /* Section labels */
        .hs-section-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
        .hs-section-label {
          font-size: 10px; letter-spacing: 3px; text-transform: uppercase;
          color: var(--terra); font-weight: 600;
          display: flex; align-items: center; gap: 10px;
        }
        .hs-section-label::before {
          content: ''; width: 20px; height: 1.5px;
          background: currentColor; border-radius: 2px; flex-shrink: 0;
        }
        .hs-section-link {
          font-size: 12px; color: var(--ink-4); cursor: pointer;
          background: none; border: none; font-family: var(--font-sans);
          transition: color .2s;
        }
        .hs-section-link:hover { color: var(--terra); }

        /* ── Stagger animation container ── */
        .hs-stagger > * {
          opacity: 0;
          animation: hs-stagger-in .5s cubic-bezier(.22,.68,0,1.2) forwards;
        }
        .hs-stagger > *:nth-child(1) { animation-delay: .04s; }
        .hs-stagger > *:nth-child(2) { animation-delay: .10s; }
        .hs-stagger > *:nth-child(3) { animation-delay: .16s; }
        .hs-stagger > *:nth-child(4) { animation-delay: .22s; }
        .hs-stagger > *:nth-child(5) { animation-delay: .28s; }
        .hs-stagger > *:nth-child(6) { animation-delay: .34s; }

        /* ═══════════════════════════════════════════════════
           HERO — Story card
        ═══════════════════════════════════════════════════ */
        .hs-hero {
          position: relative; overflow: hidden;
          border-radius: var(--r-lg);
          padding: 44px 52px 44px 52px;
          margin-bottom: 36px;
          background: var(--espresso);
          border: none; cursor: pointer; width: 100%; text-align: left;
          transition: transform .3s cubic-bezier(.22,.68,0,1.2), box-shadow .3s;
          box-shadow: var(--shadow-lg);
        }
        .hs-hero:hover {
          transform: translateY(-3px);
          box-shadow: var(--shadow-xl);
        }
        .hs-hero:disabled { opacity: .65; cursor: not-allowed; transform: none; box-shadow: var(--shadow-md); }

        /* Hero background texture */
        .hs-hero::before {
          content: '';
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 80% 80% at 80% 20%, rgba(196,114,74,.25) 0%, transparent 55%),
            radial-gradient(ellipse 60% 60% at 0% 80%, rgba(196,114,74,.12) 0%, transparent 50%);
          pointer-events: none;
        }

        /* Decorative line pattern */
        .hs-hero::after {
          content: '';
          position: absolute; top: 0; right: 0;
          width: 240px; height: 240px;
          background-image: radial-gradient(circle, rgba(255,255,255,.06) 1px, transparent 1px);
          background-size: 18px 18px;
          border-radius: 0 var(--r-lg) 0 0;
          pointer-events: none;
        }

        .hs-hero-eyebrow {
          font-size: 9.5px; letter-spacing: 3.5px; text-transform: uppercase;
          color: rgba(196,114,74,.7); margin-bottom: 12px;
          position: relative; z-index: 1;
          display: flex; align-items: center; gap: 8px;
        }
        .hs-hero-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--terra);
          animation: hs-dot-pulse 2.5s ease infinite;
        }
        .hs-hero-title {
          font-family: var(--font-serif);
          font-size: clamp(24px, 3vw, 34px);
          font-weight: 600; line-height: 1.2;
          color: rgba(250,247,242,.95);
          position: relative; z-index: 1;
          margin-bottom: 10px;
        }
        .hs-hero-title em { font-style: italic; color: #E8956A; }
        .hs-hero-sub {
          font-size: 13px; color: rgba(250,247,242,.42);
          position: relative; z-index: 1; line-height: 1.6;
        }
        .hs-hero-cta {
          position: relative; z-index: 1;
          display: inline-flex; align-items: center; gap: 10px;
          margin-top: 24px;
          background: rgba(255,255,255,.10);
          border: 1px solid rgba(255,255,255,.16);
          border-radius: 40px; padding: 10px 22px;
          font-family: var(--font-sans); font-size: 12.5px; font-weight: 500;
          color: rgba(250,247,242,.88);
          transition: all .25s;
        }
        .hs-hero:hover .hs-hero-cta {
          background: rgba(196,114,74,.35);
          border-color: rgba(196,114,74,.5);
          color: rgba(250,247,242,.98);
        }
        .hs-hero-arrow { transition: transform .25s; }
        .hs-hero:hover .hs-hero-arrow { transform: translateX(4px); }

        /* Avatar in hero corner */
        .hs-hero-avatar {
          position: absolute; right: 52px; top: 50%;
          transform: translateY(-50%);
          width: 88px; height: 88px; border-radius: 50%;
          overflow: hidden;
          border: 3px solid rgba(255,255,255,.15);
          box-shadow: 0 8px 32px rgba(0,0,0,.3);
          z-index: 1;
          animation: hs-hero-float 4s ease-in-out infinite;
        }
        .hs-hero-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .hs-hero-avatar-empty {
          width: 100%; height: 100%;
          background: rgba(196,114,74,.2);
          display: flex; align-items: center; justify-content: center;
          font-size: 36px;
        }

        .hs-hero-spinner {
          width: 18px; height: 18px; border-radius: 50%;
          border: 2px solid rgba(250,247,242,.2);
          border-top-color: rgba(250,247,242,.8);
          animation: hs-spin .8s linear infinite;
        }

        /* ═══════════════════════════════════════════════════
           STAT CARDS
        ═══════════════════════════════════════════════════ */
        .hs-stats-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; margin-bottom: 36px; }
        .hs-stat-card {
          background: var(--white);
          border: 1px solid var(--ivory-3);
          border-radius: var(--r-md); padding: 22px 20px;
          transition: all .25s; position: relative; overflow: hidden;
        }
        .hs-stat-card:hover {
          border-color: var(--parchment);
          box-shadow: var(--shadow-sm);
          transform: translateY(-1px);
        }
        .hs-stat-card::after {
          content: '';
          position: absolute; bottom: 0; left: 0; right: 0;
          height: 3px; border-radius: 0 0 var(--r-md) var(--r-md);
          background: linear-gradient(90deg, var(--terra) 0%, var(--blush) 100%);
          transform: scaleX(0);
          transition: transform .3s cubic-bezier(.22,.68,0,1.2);
          transform-origin: left;
        }
        .hs-stat-card:hover::after { transform: scaleX(1); }
        .hs-stat-icon { font-size: 20px; margin-bottom: 12px; }
        .hs-stat-num {
          font-family: var(--font-serif);
          font-size: 38px; font-weight: 500;
          color: var(--ink); line-height: 1; margin-bottom: 5px;
          letter-spacing: -1px;
        }
        .hs-stat-lbl {
          font-size: 10.5px; color: var(--ink-4);
          letter-spacing: 1.5px; text-transform: uppercase;
        }

        /* ═══════════════════════════════════════════════════
           ACTION CARDS
        ═══════════════════════════════════════════════════ */
        .hs-actions-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; margin-bottom: 36px; }
        .hs-action-card {
          background: var(--white);
          border: 1.5px solid var(--ivory-3);
          border-radius: var(--r-md); padding: 24px 22px;
          cursor: pointer; transition: all .25s;
          display: flex; flex-direction: column; gap: 11px;
          position: relative; overflow: hidden;
        }
        .hs-action-card:hover {
          border-color: var(--terra);
          box-shadow: 0 8px 32px rgba(196,114,74,.12), var(--shadow-sm);
          transform: translateY(-3px);
        }

        /* Shimmer on hover */
        .hs-action-card::after {
          content: ''; position: absolute;
          top: 0; left: -80%; width: 50%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent);
          transform: skewX(-12deg);
        }
        .hs-action-card:hover::after { animation: hs-shimmer .55s ease; }

        .hs-action-icon {
          width: 42px; height: 42px; border-radius: var(--r-sm);
          display: flex; align-items: center; justify-content: center;
          font-size: 19px;
        }
        .hs-action-title {
          font-family: var(--font-serif);
          font-size: 16px; font-weight: 600; color: var(--ink);
          line-height: 1.25;
        }
        .hs-action-desc { font-size: 12.5px; color: var(--ink-4); line-height: 1.6; }
        .hs-action-arrow {
          margin-top: auto; font-size: 13px; color: var(--terra);
          opacity: 0; transform: translateX(-4px);
          transition: all .2s;
        }
        .hs-action-card:hover .hs-action-arrow { opacity: 1; transform: translateX(0); }

        /* ═══════════════════════════════════════════════════
           MEMORY FEED
        ═══════════════════════════════════════════════════ */
        .hs-memory-feed { display: flex; flex-direction: column; gap: 12px; }
        .hs-memory-item {
          background: var(--white);
          border: 1px solid var(--ivory-3);
          border-radius: var(--r-md);
          display: flex; overflow: hidden;
          transition: all .22s;
        }
        .hs-memory-item:hover {
          border-color: var(--parchment);
          box-shadow: var(--shadow-sm);
          transform: translateX(3px);
        }
        .hs-memory-accent {
          width: 4px; flex-shrink: 0;
          background: linear-gradient(180deg, var(--terra) 0%, var(--blush) 50%, var(--sage) 100%);
        }
        .hs-memory-body { flex: 1; padding: 18px 22px; min-width: 0; }
        .hs-memory-meta { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap; }
        .hs-author-pill {
          font-size: 9.5px; letter-spacing: 1.8px; text-transform: uppercase;
          color: var(--terra); font-weight: 600;
          background: var(--terra-light); padding: 3px 10px; border-radius: 20px;
        }
        .hs-memory-date { font-size: 11.5px; color: var(--ink-4); }
        .hs-memory-text {
          font-family: var(--font-serif); font-size: 16.5px; font-style: italic;
          color: var(--ink-2); line-height: 1.8;
        }
        .hs-memory-photo { width: 100px; flex-shrink: 0; object-fit: cover; }

        /* ═══════════════════════════════════════════════════
           EMPTY STATES
        ═══════════════════════════════════════════════════ */
        .hs-empty {
          text-align: center; padding: 64px 40px;
          border: 1.5px dashed var(--parchment);
          border-radius: var(--r-lg);
          background: linear-gradient(135deg, var(--white) 0%, var(--ivory) 100%);
        }
        .hs-empty-icon { font-size: 44px; margin-bottom: 16px; opacity: .6; }
        .hs-empty-title {
          font-family: var(--font-serif); font-size: 22px; font-weight: 500;
          color: var(--ink); margin-bottom: 10px;
        }
        .hs-empty-desc { font-size: 14px; color: var(--ink-4); line-height: 1.7; max-width: 380px; margin: 0 auto; }

        /* ═══════════════════════════════════════════════════
           SETUP / ONBOARDING SCREEN
        ═══════════════════════════════════════════════════ */
        .hs-setup-wrap {
          flex: 1; display: flex; align-items: center; justify-content: center;
          padding: 48px 44px; min-height: calc(100vh - var(--topbar-h));
        }
        .hs-setup-card {
          background: var(--white);
          border: 1px solid var(--ivory-3);
          border-radius: var(--r-xl);
          padding: 64px 56px; text-align: center;
          max-width: 460px; width: 100%;
          box-shadow: var(--shadow-xl);
          animation: hs-pop .6s cubic-bezier(.22,.68,0,1.2) both;
          position: relative; overflow: hidden;
        }
        .hs-setup-card::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 4px;
          background: linear-gradient(90deg, var(--terra), var(--blush), var(--sage));
        }
        .hs-setup-icon { font-size: 56px; margin-bottom: 22px; display: block; animation: hs-breathe 3s ease-in-out infinite; }
        .hs-setup-title {
          font-family: var(--font-serif); font-size: 32px; font-weight: 600;
          color: var(--ink); margin-bottom: 12px; line-height: 1.2;
        }
        .hs-setup-title em { font-style: italic; color: var(--terra); }
        .hs-setup-desc { font-size: 14.5px; color: var(--ink-3); margin-bottom: 36px; line-height: 1.75; }

        /* ═══════════════════════════════════════════════════
           MODAL SYSTEM
        ═══════════════════════════════════════════════════ */
        .hs-overlay {
          position: fixed; inset: 0;
          background: rgba(44,26,14,.45);
          backdrop-filter: blur(12px) saturate(140%);
          -webkit-backdrop-filter: blur(12px) saturate(140%);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; padding: 24px;
          animation: hs-fadein .22s ease;
        }
        .hs-modal {
          background: var(--white);
          border: 1px solid var(--ivory-3);
          border-radius: var(--r-xl);
          padding: 0; width: 100%; max-width: 500px;
          max-height: 92vh; overflow-y: auto;
          box-shadow: var(--shadow-xl);
          animation: hs-pop .3s cubic-bezier(.22,.68,0,1.2) both;
          position: relative;
        }
        .hs-modal-header {
          padding: 36px 40px 0;
          position: sticky; top: 0;
          background: var(--white);
          border-bottom: 1px solid transparent;
        }
        .hs-modal-header-bar {
          height: 3px; border-radius: 3px 3px 0 0;
          margin: -36px -40px 28px;
          background: linear-gradient(90deg, var(--terra), var(--blush));
        }
        .hs-modal-title {
          font-family: var(--font-serif);
          font-size: 26px; font-weight: 600; color: var(--ink); margin-bottom: 6px;
        }
        .hs-modal-title em { font-style: italic; color: var(--terra); }
        .hs-modal-desc { font-size: 13.5px; color: var(--ink-3); margin-bottom: 0; line-height: 1.65; }
        .hs-modal-body { padding: 24px 40px 40px; }

        /* Form elements */
        .hs-label {
          display: block; font-size: 10px; letter-spacing: 2.5px;
          text-transform: uppercase; color: var(--ink-3); font-weight: 600;
          margin-bottom: 8px;
        }
        .hs-input {
          width: 100%; padding: 12px 15px;
          background: var(--ivory); border: 1.5px solid var(--ivory-3);
          border-radius: var(--r-sm);
          font-family: var(--font-sans); font-size: 14px; color: var(--ink);
          outline: none; transition: all .22s; margin-bottom: 18px;
        }
        .hs-input:focus {
          border-color: var(--terra); background: var(--white);
          box-shadow: 0 0 0 4px rgba(196,114,74,.08);
        }
        .hs-textarea {
          width: 100%; padding: 14px 16px;
          background: var(--ivory); border: 1.5px solid var(--ivory-3);
          border-radius: var(--r-sm);
          font-family: var(--font-serif); font-style: italic;
          font-size: 16px; color: var(--ink);
          outline: none; resize: none; min-height: 130px; line-height: 1.75;
          transition: all .22s; margin-bottom: 18px;
        }
        .hs-textarea:focus {
          border-color: var(--terra); background: var(--white);
          box-shadow: 0 0 0 4px rgba(196,114,74,.08);
        }
        .hs-textarea::placeholder { color: var(--ink-5); font-style: italic; }

        /* Photo upload */
        .hs-upload-zone {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 9px;
          padding: 28px; border: 2px dashed var(--parchment);
          border-radius: var(--r-md);
          background: var(--ivory); cursor: pointer;
          transition: all .25s; margin-bottom: 18px;
          text-align: center;
        }
        .hs-upload-zone:hover {
          border-color: var(--terra);
          background: var(--terra-light);
        }
        .hs-upload-icon { font-size: 28px; opacity: .5; }
        .hs-upload-label { font-size: 13px; color: var(--ink-3); font-weight: 500; }
        .hs-upload-hint { font-size: 11px; color: var(--ink-5); }

        /* Modal buttons */
        .hs-modal-actions { display: flex; gap: 10px; margin-top: 4px; }
        .hs-btn-save {
          flex: 1; padding: 13px; background: var(--espresso); color: rgba(250,247,242,.95);
          border: none; border-radius: 12px; font-family: var(--font-sans);
          font-size: 12px; font-weight: 600; letter-spacing: 1px;
          text-transform: uppercase; cursor: pointer; transition: all .25s;
        }
        .hs-btn-save:hover { background: var(--terra); box-shadow: 0 4px 16px rgba(196,114,74,.35); }
        .hs-btn-save:disabled { opacity: .4; cursor: not-allowed; }
        .hs-btn-cancel {
          padding: 13px 22px; background: transparent;
          border: 1.5px solid var(--ivory-3); border-radius: 12px;
          font-family: var(--font-sans); font-size: 13px; color: var(--ink-3);
          cursor: pointer; transition: all .22s;
        }
        .hs-btn-cancel:hover { border-color: var(--parchment); color: var(--ink-2); }

        /* Invite code box */
        .hs-invite-box {
          background: var(--ivory); border: 1.5px solid var(--parchment);
          border-radius: var(--r-sm); padding: 14px 16px;
          font-family: monospace; font-size: 12px; color: var(--ink-2);
          word-break: break-all; line-height: 1.6; margin-bottom: 16px;
        }

        /* Cartoon modal */
        .hs-cartoon-spinner {
          width: 48px; height: 48px; border-radius: 50%;
          border: 3px solid var(--parchment); border-top-color: var(--terra);
          animation: hs-spin 1s linear infinite; margin: 0 auto 16px;
        }
        .hs-transform-row {
          display: flex; align-items: center; justify-content: center;
          gap: 20px; padding: 16px 0 24px;
        }

        /* ═══════════════════════════════════════════════════
           STORY VIEW special card
        ═══════════════════════════════════════════════════ */
        .hs-story-book-card {
          background: var(--white);
          border: 1px solid var(--ivory-3);
          border-radius: var(--r-lg); padding: 56px 48px;
          text-align: center;
          box-shadow: var(--shadow-md);
        }
        .hs-story-book-title {
          font-family: var(--font-serif); font-size: 38px; font-weight: 600;
          color: var(--ink); margin-bottom: 8px; line-height: 1.2;
        }
        .hs-story-book-sub { font-size: 13px; color: var(--ink-4); margin-bottom: 32px; }

        /* ═══════════════════════════════════════════════════
           RESPONSIVE
        ═══════════════════════════════════════════════════ */
        @media (max-width: 1024px) {
          :root { --sidebar-w: 250px; }
          .hs-content { padding: 32px 32px 48px; }
          .hs-topbar { padding: 0 32px; }
          .hs-stats-grid { grid-template-columns: repeat(2,1fr); }
        }
        @media (max-width: 768px) {
          .hs-sidebar { display: none; }
          .hs-main { margin-left: 0; }
          .hs-actions-grid { grid-template-columns: 1fr 1fr; }
          .hs-stats-grid { grid-template-columns: repeat(2,1fr); }
          .hs-content { padding: 24px 20px; }
          .hs-topbar { padding: 0 20px; }
          .hs-hero { padding: 32px 28px; }
          .hs-hero-avatar { display: none; }
        }
        @media (max-width: 500px) {
          .hs-actions-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="hs-layout">

        {/* ═══════════════════════════════════════
            SIDEBAR
        ═══════════════════════════════════════ */}
        <aside className="hs-sidebar">
          {/* Brand */}
          <div className="hs-brand">
            <div className="hs-logo">
              <div className="hs-logo-mark">📖</div>
              Hemsaga
            </div>
            <div className="hs-tagline">Family Stories Forever</div>
          </div>

          {child ? (
            <>
              {/* Profile */}
              <div className="hs-profile" style={{ paddingTop: '20px' }}>
                <div className="hs-profile-card" onClick={() => setShowCartoonModal(true)}>
                  <div className="hs-profile-top">
                    <div className="hs-avatar-wrap">
                      <div className="hs-avatar">
                        {childCartoonUrl ? <img src={childCartoonUrl} alt={child.name} /> : <span>🌟</span>}
                      </div>
                      <div className="hs-avatar-edit">✎</div>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="hs-child-name">{child.name}</div>
                      <div className="hs-child-age">{getAge(child.birthday)}</div>
                    </div>
                  </div>
                  <div className="hs-profile-stats">
                    <div className="hs-ps">
                      <div className="hs-ps-n">{memories.length}</div>
                      <div className="hs-ps-l">Memories</div>
                    </div>
                    <div className="hs-ps">
                      <div className="hs-ps-n">{Math.ceil(memories.length / 5) || 0}</div>
                      <div className="hs-ps-l">Chapters</div>
                    </div>
                    <div className="hs-ps">
                      <div className="hs-ps-n">{getDaysOld(child.birthday)}</div>
                      <div className="hs-ps-l">Days</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Nav */}
              <nav className="hs-nav">
                <div className="hs-nav-label">Views</div>
                {[
                  { id: 'home',     icon: '⌂',  label: 'Dashboard' },
                  { id: 'memories', icon: '🌸', label: 'Memories', badge: memories.length || null },
                  { id: 'story',    icon: '📖', label: 'Our Story' },
                ].map(n => (
                  <button
                    key={n.id}
                    className={`hs-nav-item ${activeView === n.id ? 'active' : ''}`}
                    onClick={() => setActiveView(n.id)}
                  >
                    <span className="hs-nav-icon">{n.icon}</span>
                    {n.label}
                    {n.badge && <span className="hs-nav-badge">{n.badge}</span>}
                  </button>
                ))}

                <div className="hs-nav-label" style={{ marginTop: '8px' }}>Actions</div>
                <button className="hs-nav-item" onClick={() => setShowAddMemory(true)}>
                  <span className="hs-nav-icon">✦</span> Add Memory
                </button>
                <button className="hs-nav-item" onClick={() => { setShowInviteModal(true); setInviteLink(''); }}>
                  <span className="hs-nav-icon">👨‍👩‍👧</span> Invite Family
                </button>
                <button className="hs-nav-item" onClick={() => setShowCartoonModal(true)}>
                  <span className="hs-nav-icon">🎨</span> Cartoon Avatar
                </button>
              </nav>
            </>
          ) : (
            <div className="hs-nav">
              <p style={{ fontSize: '12.5px', color: 'rgba(250,247,242,.3)', lineHeight: '1.75', padding: '8px', marginTop: '16px' }}>
                Add your child's profile to begin their story.
              </p>
            </div>
          )}

          {/* User row */}
          <div className="hs-sb-bottom">
            <div className="hs-user-row">
              <div className="hs-user-av">{userName[0].toUpperCase()}</div>
              <span className="hs-user-name">{userName}</span>
              <button className="hs-signout" title="Sign out"
                onClick={async () => { await supabase.auth.signOut(); router.push('/auth'); }}>
                ↪
              </button>
            </div>
          </div>
        </aside>

        {/* ═══════════════════════════════════════
            MAIN
        ═══════════════════════════════════════ */}
        <div className="hs-main">

          {/* Topbar */}
          <header className="hs-topbar">
            <div className="hs-greeting">
              {child
                ? <>{getGreeting()} —&nbsp;<em>{child.name}'s story</em>&nbsp;awaits</>
                : <>Welcome to&nbsp;<em>Hemsaga</em></>}
            </div>
            <div className="hs-topbar-actions">
              {child && (
                <>
                  <button className="btn-ghost" onClick={() => setShowAddMemory(true)}>
                    + Memory
                  </button>
                  <button
                    className="btn-primary"
                    onClick={() => generateStory(false)}
                    disabled={generating || memories.length === 0}
                  >
                    {generating
                      ? <><div className="hs-hero-spinner" style={{ width: 13, height: 13, borderWidth: '1.5px' }} />Writing…</>
                      : <>✦ Generate Chapter</>}
                  </button>
                </>
              )}
            </div>
          </header>

          {/* No child yet */}
          {!child && (
            <div className="hs-setup-wrap">
              <div className="hs-setup-card">
                <span className="hs-setup-icon">🌸</span>
                <h1 className="hs-setup-title">Add your <em>child's</em> profile</h1>
                <p className="hs-setup-desc">
                  Their story starts the moment you add them here.<br />
                  Every memory you log becomes a chapter they'll treasure for life.
                </p>
                <button
                  className="btn-primary"
                  style={{ margin: '0 auto', padding: '12px 36px', fontSize: '13px', borderRadius: '14px' }}
                  onClick={() => setShowAddChild(true)}
                >
                  Begin the Story →
                </button>
              </div>
            </div>
          )}

          {/* ══ HOME VIEW ══ */}
          {child && activeView === 'home' && (
            <div className="hs-content hs-stagger">

              {/* Hero card */}
              <button
                className="hs-hero"
                onClick={() => memories.length > 0 ? generateStory(false) : setShowAddMemory(true)}
                disabled={generating}
              >
                {/* Floating avatar */}
                <div className="hs-hero-avatar">
                  {childCartoonUrl
                    ? <img src={childCartoonUrl} alt={child.name} />
                    : <div className="hs-hero-avatar-empty">🌟</div>}
                </div>

                <div className="hs-hero-eyebrow">
                  <div className="hs-hero-dot" />
                  AI Story Engine · Hemsaga
                </div>
                {generating
                  ? <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
                      <div className="hs-hero-spinner" />
                      <div className="hs-hero-title">Writing {child.name}'s next chapter…</div>
                    </div>
                  : <>
                      <div className="hs-hero-title">
                        {memories.length === 0
                          ? <>Start <em>{child.name}'s</em> story</>
                          : <>Continue <em>{child.name}'s</em> story</>}
                      </div>
                      <div className="hs-hero-sub">
                        {memories.length === 0
                          ? 'Every great story begins with a single moment. Add the first memory.'
                          : `${memories.length} ${memories.length === 1 ? 'memory' : 'memories'} ready · AI will weave them into the next chapter`}
                      </div>
                      <div className="hs-hero-cta">
                        <span>{memories.length === 0 ? 'Add first memory' : 'Generate next chapter'}</span>
                        <span className="hs-hero-arrow">→</span>
                      </div>
                    </>}
              </button>

              {/* Stats */}
              <div className="hs-section-row">
                <span className="hs-section-label">At a glance</span>
              </div>
              <div className="hs-stats-grid">
                {[
                  { icon: '🌸', n: memories.length,                  l: 'Memories logged'  },
                  { icon: '📖', n: Math.ceil(memories.length/5) || 0, l: 'Story chapters'   },
                  { icon: '📅', n: getDaysOld(child.birthday),        l: 'Days of adventure' },
                  { icon: '💛', n: '∞',                               l: 'Love stored'       },
                ].map((s, i) => (
                  <div key={i} className="hs-stat-card">
                    <div className="hs-stat-icon">{s.icon}</div>
                    <div className="hs-stat-num">{s.n}</div>
                    <div className="hs-stat-lbl">{s.l}</div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="hs-section-row">
                <span className="hs-section-label">Quick Actions</span>
              </div>
              <div className="hs-actions-grid">
                {[
                  {
                    icon: '✍️',
                    bg: 'rgba(196,114,74,.12)',
                    title: 'Log a Memory',
                    desc: `What happened with ${child.name} today?`,
                    fn: () => setShowAddMemory(true),
                  },
                  {
                    icon: '👨‍👩‍👧',
                    bg: 'rgba(122,158,126,.12)',
                    title: 'Invite Family',
                    desc: 'Share a link — grandparents can add memories too',
                    fn: () => { setShowInviteModal(true); setInviteLink(''); },
                  },
                  {
                    icon: '🎨',
                    bg: 'rgba(212,165,160,.18)',
                    title: 'Cartoon Avatar',
                    desc: childCartoonUrl ? 'Update the avatar art' : 'Generate a Pixar-style portrait',
                    fn: () => setShowCartoonModal(true),
                  },
                ].map((a, i) => (
                  <div key={i} className="hs-action-card" onClick={a.fn}>
                    <div className="hs-action-icon" style={{ background: a.bg }}>{a.icon}</div>
                    <div className="hs-action-title">{a.title}</div>
                    <div className="hs-action-desc">{a.desc}</div>
                    <div className="hs-action-arrow">→</div>
                  </div>
                ))}
              </div>

              {/* Recent memories */}
              <div className="hs-section-row">
                <span className="hs-section-label">Recent Memories</span>
                {memories.length > 4 && (
                  <button className="hs-section-link" onClick={() => setActiveView('memories')}>View all →</button>
                )}
              </div>

              {memories.length === 0 ? (
                <div className="hs-empty">
                  <div className="hs-empty-icon">🌸</div>
                  <div className="hs-empty-title">The first memory is waiting</div>
                  <div className="hs-empty-desc">
                    Even the smallest moment becomes part of {child.name}'s story forever.<br />
                    What happened today?
                  </div>
                </div>
              ) : (
                <div className="hs-memory-feed">
                  {memories.slice(0, 4).map(m => (
                    <div key={m.id} className="hs-memory-item">
                      <div className="hs-memory-accent" />
                      <div className="hs-memory-body">
                        <div className="hs-memory-meta">
                          <span className="hs-author-pill">{m.author}</span>
                          <span className="hs-memory-date">{formatShort(m.memory_date)}</span>
                        </div>
                        <div className="hs-memory-text">{m.content}</div>
                      </div>
                      {m.photo_url && <img src={m.photo_url} alt="" className="hs-memory-photo" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══ MEMORIES VIEW ══ */}
          {child && activeView === 'memories' && (
            <div className="hs-content hs-stagger">
              <div className="hs-section-row">
                <span className="hs-section-label">All Memories · {memories.length}</span>
                <button className="btn-ghost" style={{ fontSize: '11.5px', padding: '7px 14px' }} onClick={() => setShowAddMemory(true)}>+ Add Memory</button>
              </div>

              {memories.length === 0 ? (
                <div className="hs-empty">
                  <div className="hs-empty-icon">🌸</div>
                  <div className="hs-empty-title">No memories yet</div>
                  <div className="hs-empty-desc">Start logging moments for {child.name} — big or small, they all matter.</div>
                </div>
              ) : (
                <div className="hs-memory-feed">
                  {memories.map(m => (
                    <div key={m.id} className="hs-memory-item">
                      <div className="hs-memory-accent" />
                      <div className="hs-memory-body">
                        <div className="hs-memory-meta">
                          <span className="hs-author-pill">{m.author}</span>
                          <span className="hs-memory-date">{formatDate(m.memory_date)}</span>
                        </div>
                        <div className="hs-memory-text">{m.content}</div>
                      </div>
                      {m.photo_url && <img src={m.photo_url} alt="" className="hs-memory-photo" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══ STORY VIEW ══ */}
          {child && activeView === 'story' && (
            <div className="hs-content hs-stagger">
              <div className="hs-section-row">
                <span className="hs-section-label">The Story of {child.name}</span>
              </div>

              {/* Hero banner */}
              <button
                className="hs-hero"
                onClick={() => generateStory(false)}
                disabled={generating || memories.length === 0}
                style={{ marginBottom: 28 }}
              >
                <div className="hs-hero-avatar">
                  {childCartoonUrl
                    ? <img src={childCartoonUrl} alt={child.name} />
                    : <div className="hs-hero-avatar-empty">📖</div>}
                </div>
                <div className="hs-hero-eyebrow">
                  <div className="hs-hero-dot" />
                  Living family novel
                </div>
                {generating
                  ? <div style={{ display:'flex', alignItems:'center', gap:12, position:'relative', zIndex:1 }}>
                      <div className="hs-hero-spinner" />
                      <div className="hs-hero-title">Writing the next chapter…</div>
                    </div>
                  : <>
                      <div className="hs-hero-title">Add a new <em>chapter</em></div>
                      <div className="hs-hero-sub">{memories.length} {memories.length === 1 ? 'memory' : 'memories'} to weave into the story</div>
                      <div className="hs-hero-cta">
                        <span>Continue the novel</span>
                        <span className="hs-hero-arrow">→</span>
                      </div>
                    </>}
              </button>

              {memories.length === 0 ? (
                <div className="hs-empty">
                  <div className="hs-empty-icon">📖</div>
                  <div className="hs-empty-title">No chapters yet</div>
                  <div className="hs-empty-desc">Add some memories first, then let AI weave them into {child.name}'s story.</div>
                </div>
              ) : (
                <div className="hs-story-book-card">
                  {childCartoonUrl && (
                    <img
                      src={childCartoonUrl}
                      alt={child.name}
                      style={{
                        width: 80, height: 80, borderRadius: '50%', objectFit: 'cover',
                        border: '3px solid var(--parchment)',
                        display: 'block', margin: '0 auto 20px',
                        animation: 'hs-breathe 4s ease-in-out infinite'
                      }}
                    />
                  )}
                  <div className="hs-story-book-title">{child.name}'s Story</div>
                  <div className="hs-story-book-sub">{memories.length} memories · A growing family novel</div>
                  <button
                    className="btn-primary"
                    style={{ margin: '0 auto', padding: '12px 36px', borderRadius: '14px' }}
                    onClick={() => generateStory(false)}
                    disabled={generating}
                  >
                    {generating ? '✦ Writing…' : '✦ Read & Add Chapter'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════
          MODAL: Add Child
      ═══════════════════════════════════════ */}
      {showAddChild && (
        <div className="hs-overlay">
          <div className="hs-modal">
            <div className="hs-modal-header">
              <div className="hs-modal-header-bar" />
              <h2 className="hs-modal-title">Add your <em>child</em></h2>
              <p className="hs-modal-desc">Their story starts the moment you add them here.</p>
            </div>
            <div className="hs-modal-body">
              <label className="hs-label">Child's Name</label>
              <input className="hs-input" placeholder="e.g. Ivaan" value={childName} onChange={e => setChildName(e.target.value)} />
              <label className="hs-label">Birthday</label>
              <input className="hs-input" type="date" value={childBirthday} onChange={e => setChildBirthday(e.target.value)} />
              <div className="hs-modal-actions">
                <button className="hs-btn-save" onClick={saveChild} disabled={saving || !childName || !childBirthday}>
                  {saving ? 'Creating…' : 'Create Profile →'}
                </button>
                <button className="hs-btn-cancel" onClick={() => setShowAddChild(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════
          MODAL: Add Memory
      ═══════════════════════════════════════ */}
      {showAddMemory && (
        <div className="hs-overlay" onClick={() => setShowAddMemory(false)}>
          <div className="hs-modal" onClick={e => e.stopPropagation()}>
            <div className="hs-modal-header">
              <div className="hs-modal-header-bar" />
              <h2 className="hs-modal-title">Log a <em>memory</em></h2>
              <p className="hs-modal-desc">Even the smallest moment becomes part of {child?.name}'s story forever.</p>
            </div>
            <div className="hs-modal-body">
              <label className="hs-label">Who is logging this?</label>
              <input
                className="hs-input"
                placeholder="Papa, Mama, Nana…"
                value={memoryAuthor}
                onChange={e => setMemoryAuthor(e.target.value)}
              />
              <label className="hs-label">What happened?</label>
              <textarea
                className="hs-textarea"
                placeholder={`e.g. ${child?.name} took her first steps today — she walked right towards me and grinned…`}
                value={memoryText}
                onChange={e => setMemoryText(e.target.value)}
              />
              <label className="hs-label">Photo (optional)</label>
              {memoryPhotoPreview ? (
                <div style={{ position: 'relative', marginBottom: 18 }}>
                  <img
                    src={memoryPhotoPreview} alt="Preview"
                    style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 12 }}
                  />
                  <button
                    onClick={() => { setMemoryPhoto(null); setMemoryPhotoPreview(null); }}
                    style={{
                      position: 'absolute', top: 8, right: 8,
                      background: 'rgba(44,26,14,.7)', color: 'white', border: 'none',
                      borderRadius: '50%', width: 28, height: 28, cursor: 'pointer',
                      fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                  >×</button>
                </div>
              ) : (
                <label className="hs-upload-zone">
                  <div className="hs-upload-icon">📷</div>
                  <div className="hs-upload-label">Tap to add a photo</div>
                  <div className="hs-upload-hint">JPG, PNG up to 10MB</div>
                  <input
                    type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => {
                      const f = e.target.files[0];
                      if (!f) return;
                      setMemoryPhoto(f); setMemoryPhotoPreview(URL.createObjectURL(f));
                    }}
                  />
                </label>
              )}
              <div className="hs-modal-actions">
                <button className="hs-btn-save" onClick={saveMemory} disabled={saving || !memoryText.trim()}>
                  {saving ? 'Saving…' : 'Save Memory →'}
                </button>
                <button className="hs-btn-cancel" onClick={() => { setShowAddMemory(false); setMemoryPhoto(null); setMemoryPhotoPreview(null); }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════
          MODAL: Cartoon Avatar
      ═══════════════════════════════════════ */}
      {showCartoonModal && (
        <div className="hs-overlay" onClick={() => { if (!cartoonizing) { setShowCartoonModal(false); setCartoonPhoto(null); setCartoonPhotoPreview(null); } }}>
          <div className="hs-modal" onClick={e => e.stopPropagation()}>
            <div className="hs-modal-header">
              <div className="hs-modal-header-bar" />
              <h2 className="hs-modal-title">🎨 Cartoon <em>Avatar</em></h2>
              <p className="hs-modal-desc">Transform a photo of {child?.name} into a beautiful Pixar-style illustration.</p>
            </div>
            <div className="hs-modal-body">
              {cartoonizing && (
                <div style={{ textAlign: 'center', padding: '36px 0' }}>
                  <div className="hs-cartoon-spinner" />
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--ink)', marginBottom: 8 }}>
                    Creating {child?.name}'s cartoon…
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink-4)' }}>This takes about 30–60 seconds ✨</div>
                </div>
              )}

              {!cartoonizing && childCartoonUrl && !cartoonPhotoPreview && (
                <div style={{ textAlign: 'center' }}>
                  <img
                    src={childCartoonUrl} alt="avatar"
                    style={{ width: 130, height: 130, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--parchment)', display: 'block', margin: '0 auto 14px', animation: 'hs-breathe 3s ease-in-out infinite' }}
                  />
                  <p style={{ fontSize: 13, color: 'var(--ink-4)', marginBottom: 24 }}>{child?.name}'s current avatar</p>
                  <label className="hs-upload-zone">
                    <div className="hs-upload-icon">📷</div>
                    <div className="hs-upload-label">Upload a new photo to regenerate</div>
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={e => { const f=e.target.files[0]; if(!f) return; setCartoonPhoto(f); setCartoonPhotoPreview(URL.createObjectURL(f)); }} />
                  </label>
                  <button className="hs-btn-cancel" style={{ width: '100%' }} onClick={() => setShowCartoonModal(false)}>Close</button>
                </div>
              )}

              {!cartoonizing && cartoonPhotoPreview && (
                <>
                  <div className="hs-transform-row">
                    <img src={cartoonPhotoPreview} alt="Original"
                      style={{ width: 110, height: 110, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--parchment)' }} />
                    <span style={{ fontSize: 24, color: 'var(--terra)' }}>→</span>
                    <div style={{ width: 110, height: 110, borderRadius: '50%', background: 'var(--ivory-2)', border: '2px dashed var(--parchment)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>✨</div>
                  </div>
                  <div className="hs-modal-actions">
                    <button className="hs-btn-save" onClick={generateCartoon}>✨ Generate Cartoon</button>
                    <button className="hs-btn-cancel" onClick={() => { setCartoonPhoto(null); setCartoonPhotoPreview(null); }}>Change Photo</button>
                  </div>
                </>
              )}

              {!cartoonizing && !childCartoonUrl && !cartoonPhotoPreview && (
                <>
                  <label className="hs-upload-zone" style={{ padding: 44 }}>
                    <div style={{ fontSize: 42 }}>📷</div>
                    <div className="hs-upload-label" style={{ fontSize: 15 }}>Upload a photo of {child?.name}</div>
                    <div className="hs-upload-hint">Clear, front-facing photo works best</div>
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={e => { const f=e.target.files[0]; if(!f) return; setCartoonPhoto(f); setCartoonPhotoPreview(URL.createObjectURL(f)); }} />
                  </label>
                  <button className="hs-btn-cancel" style={{ width: '100%' }} onClick={() => setShowCartoonModal(false)}>Cancel</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════
          MODAL: Invite Family
      ═══════════════════════════════════════ */}
      {showInviteModal && (
        <div className="hs-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="hs-modal" onClick={e => e.stopPropagation()}>
            <div className="hs-modal-header">
              <div className="hs-modal-header-bar" />
              <h2 className="hs-modal-title">Invite <em>Family</em></h2>
              <p className="hs-modal-desc">
                Share this link with grandparents — no account needed.<br />
                They can add memories for {child?.name} directly.
              </p>
            </div>
            <div className="hs-modal-body">
              {!inviteLink ? (
                <div className="hs-modal-actions">
                  <button className="hs-btn-save" onClick={generateInviteLink}>Generate Invite Link</button>
                  <button className="hs-btn-cancel" onClick={() => setShowInviteModal(false)}>Cancel</button>
                </div>
              ) : (
                <>
                  <div className="hs-invite-box">{inviteLink}</div>
                  <div className="hs-modal-actions">
                    <button className="hs-btn-save" onClick={() => { navigator.clipboard.writeText(inviteLink); alert('Copied! Send it on WhatsApp 💙'); }}>
                      📋 Copy Link
                    </button>
                    <button className="hs-btn-cancel" onClick={() => setShowInviteModal(false)}>Close</button>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--ink-5)', marginTop: 14, textAlign: 'center' }}>
                    Anyone with this link can add memories for {child?.name}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════
          STORY READER (full-screen)
      ═══════════════════════════════════════ */}
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