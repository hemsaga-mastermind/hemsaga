'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import StoryReader from './StoryReader';

const SPACE_TYPES = [
  { id:'child',   emoji:'🌟', label:'Child',   desc:'Family story for your little one' },
  { id:'couple',  emoji:'💑', label:'Couple',  desc:'Your love story, told together' },
  { id:'friends', emoji:'👥', label:'Friends', desc:'Adventures with your crew' },
  { id:'self',    emoji:'📔', label:'Solo',    desc:'Your personal journal' },
  { id:'custom',  emoji:'📖', label:'Custom',  desc:'Any story you want to tell' },
];

const TYPE_THEME = {
  child:   { grad:'linear-gradient(135deg,#2C1A0E,#4A2A16)' },
  couple:  { grad:'linear-gradient(135deg,#1E0E0E,#3A1A1A)' },
  friends: { grad:'linear-gradient(135deg,#0E1E12,#1A3020)' },
  self:    { grad:'linear-gradient(135deg,#0E1620,#1A2A3A)' },
  custom:  { grad:'linear-gradient(135deg,#2C1A0E,#4A2A16)' },
};

export default function Dashboard() {
  const [user, setUser]             = useState(null);
  const [spaces, setSpaces]         = useState([]);
  const [activeSpace, setActive]    = useState(null);
  const [memories, setMemories]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [view, setView]             = useState('home');
  const [showNewSpace, setShowNew]  = useState(false);
  const [showAddMem, setShowAddMem] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showCartoon, setShowCartoon] = useState(false);
  const [showMobileMenu, setMobileMenu] = useState(false);

  const [nsType,    setNsType]    = useState('child');
  const [nsName,    setNsName]    = useState('');
  const [nsSubject, setNsSubject] = useState('');
  const [nsDob,     setNsDob]     = useState('');

  const [memText,   setMemText]   = useState('');
  const [memAuthor, setMemAuthor] = useState('Papa');
  const [memDate,   setMemDate]   = useState('');
  const [memPhoto,  setMemPhoto]  = useState(null);
  const [memPreview,setMemPrev]   = useState(null);

  const [cartoonPhoto, setCartoonPhoto]  = useState(null);
  const [cartoonPreview, setCartoonPrev] = useState(null);
  const [cartoonizing, setCartoonizing]  = useState(false);

  const [story, setStory]         = useState([]);
  const [showStory, setShowStory] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [inviteLink, setInviteLink] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [totalMemCount, setTotalMemCount] = useState(0);

  const router = useRouter();

  useEffect(() => { init(); }, []);

  const init = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }
      setUser(user);
      await loadSpaces(user.id);
    } catch (e) {
      console.error('init error:', e);
    }
    setLoading(false);
  };

  const loadSpaces = async (uid) => {
    try {
      const res = await fetch(`/api/spaces?userId=${uid}`);
      const data = await res.json();
      if (data.error) { console.error('loadSpaces:', data.error); return; }
      setSpaces(data.spaces || []);
      if (data.spaces?.length) {
        setActive(data.spaces[0]);
        await loadMemories(data.spaces[0].id, uid);
      }
    } catch (e) { console.error('loadSpaces exception:', e); }
  };

  const loadMemories = async (spaceId, uid) => {
    try {
      // Owner sees only their own memories — filtered by their user.id as contributorId
      const res = await fetch(`/api/memories?spaceId=${spaceId}&contributorId=${uid}&accessor=owner:${uid}`);
      const data = await res.json();
      if (data.error) { console.error('loadMemories:', data.error); return; }
      setMemories(data.memories || []);
      setTotalMemCount(data.totalCount || 0);
    } catch (e) { console.error('loadMemories exception:', e); }
  };

  const switchSpace = async (s) => {
    setActive(s); setView('home'); setMobileMenu(false);
    await loadMemories(s.id, user?.id);
  };

  const createSpace = async () => {
    if (!nsName.trim() || !user) return;
    setSaving(true); setError('');
    try {
      const type = SPACE_TYPES.find(t => t.id === nsType);
      const res = await fetch('/api/spaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          name: nsName.trim(),
          space_type: nsType,
          cover_emoji: type.emoji,
          subject_name: nsSubject.trim() || null,
          subject_dob: nsDob || null,
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setSaving(false); return; }
      setSpaces(prev => [...prev, data.space]);
      setActive(data.space); setMemories([]);
      setShowNew(false); setNsName(''); setNsSubject(''); setNsDob(''); setNsType('child');
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const saveMemory = async () => {
    if (!memText.trim() || !activeSpace || !user) return;
    setSaving(true); setError('');
    try {
      // Upload photo server-side (private bucket, no public URL)
      let photoPath = null;
      if (memPhoto) {
        const fd = new FormData();
        fd.append('file', memPhoto);
        fd.append('spaceId', activeSpace.id);
        fd.append('contributorId', user.id);
        fd.append('type', 'memory');
        const upRes = await fetch('/api/upload', { method: 'POST', body: fd });
        const upData = await upRes.json();
        if (upData.path) photoPath = upData.path;
        else console.warn('Photo upload failed:', upData.error);
      }
      const res = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spaceId: activeSpace.id,
          userId: user.id,
          contributorId: user.id,
          author: memAuthor || 'Someone',
          content: memText,
          memory_date: memDate || new Date().toISOString().split('T')[0],
          photo_path: photoPath,
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setSaving(false); return; }
      setMemories(prev => [data.memory, ...prev]);
      setMemText(''); setMemAuthor('Papa'); setMemDate('');
      setMemPhoto(null); setMemPrev(null); setShowAddMem(false);
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const generateStory = async (regenerate = false) => {
    if (!activeSpace || memories.length === 0) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/generate-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spaceId: activeSpace.id, regenerate }),
      });
      const data = await res.json();
      if (data.chapters) { setStory(data.chapters); setShowStory(true); }
    } catch (e) { console.error(e); }
    setGenerating(false);
  };

  const generateCartoon = async () => {
    if (!cartoonPhoto || !activeSpace) return;
    setCartoonizing(true);
    try {
      const fn = `${user.id}/avatar-${Date.now()}-${cartoonPhoto.name.replace(/\s/g,'_')}`;
      await supabase.storage.from('memories').upload(fn, cartoonPhoto);
      const { data: u } = supabase.storage.from('memories').getPublicUrl(fn);
      const res = await fetch('/api/cartoonify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: u.publicUrl }),
      });
      const data = await res.json();
      if (data.cartoonUrl) {
        await fetch(`/api/spaces`, { method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ spaceId: activeSpace.id, cartoon_url: data.cartoonUrl }),
        });
        const updated = { ...activeSpace, cartoon_url: data.cartoonUrl };
        setActive(updated); setSpaces(spaces.map(s => s.id === updated.id ? updated : s));
        setShowCartoon(false); setCartoonPhoto(null); setCartoonPrev(null);
      }
    } catch (e) { alert('Check Replicate API key.'); }
    setCartoonizing(false);
  };

  const generateInvite = async () => {
    const res = await fetch('/api/spaces/invite', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spaceId: activeSpace.id }),
    });
    const data = await res.json();
    if (data.token) setInviteLink(`https://hemsaga.com/join/${data.token}`);
  };

  const getDays  = (dob) => dob ? Math.floor((new Date()-new Date(dob))/86400000).toLocaleString() : '—';
  const fmtDate  = (d) => new Date(d).toLocaleDateString('en-SE',{day:'numeric',month:'short',year:'numeric'});
  const fmtShort = (d) => new Date(d).toLocaleDateString('en-SE',{day:'numeric',month:'short'});
  const greeting = () => { const h=new Date().getHours(); return h<12?'Good morning':h<17?'Good afternoon':h<21?'Good evening':'Good night'; };
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'You';
  const theme    = TYPE_THEME[activeSpace?.space_type] || TYPE_THEME.custom;

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#FAF7F2',fontFamily:"'Lora',Georgia,serif",color:'#C4724A',fontSize:16,fontStyle:'italic'}}>
      Loading your stories…
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap');
        :root {
          --ivory:#FAF7F2; --ivory2:#F3EDE4; --ivory3:#EAE0D3; --parchment:#E8DDD0;
          --espresso:#2C1A0E; --terra:#C4724A;
          --ink:#2C1A0E; --ink2:#5C3D24; --ink3:#8C6B4E; --ink4:#B89980; --ink5:#D4BBA8;
          --serif:'Lora',Georgia,serif; --sans:'Plus Jakarta Sans',system-ui,sans-serif;
          --sidebar:272px; --topbar:60px; --r:14px; --rsm:9px;
          --sh:0 2px 8px rgba(44,26,14,.07); --shmd:0 4px 16px rgba(44,26,14,.09); --shlg:0 12px 40px rgba(44,26,14,.12);
        }
        *,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
        html,body{background:var(--ivory);color:var(--ink);font-family:var(--sans);-webkit-font-smoothing:antialiased;}
        @keyframes hs-up  {from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes hs-in  {from{opacity:0}to{opacity:1}}
        @keyframes hs-pop {0%{transform:scale(.96);opacity:0}60%{transform:scale(1.01)}100%{transform:scale(1);opacity:1}}
        @keyframes hs-spin{to{transform:rotate(360deg)}}
        @keyframes hs-shim{0%{transform:translateX(-100%) skewX(-12deg)}100%{transform:translateX(250%) skewX(-12deg)}}
        .hs-stagger>*{opacity:0;animation:hs-up .45s cubic-bezier(.22,.68,0,1.2) forwards;}
        .hs-stagger>*:nth-child(1){animation-delay:.04s}.hs-stagger>*:nth-child(2){animation-delay:.10s}
        .hs-stagger>*:nth-child(3){animation-delay:.16s}.hs-stagger>*:nth-child(4){animation-delay:.22s}
        .hs-stagger>*:nth-child(5){animation-delay:.28s}.hs-stagger>*:nth-child(6){animation-delay:.34s}

        .hs-layout{display:flex;min-height:100vh;}
        .hs-sb{width:var(--sidebar);position:fixed;top:0;left:0;height:100vh;background:var(--espresso);display:flex;flex-direction:column;z-index:200;overflow:hidden;}
        .hs-sb::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 140% 50% at 50% 0%,rgba(196,114,74,.16),transparent 55%);pointer-events:none;}
        .hs-brand{padding:24px 20px 18px;border-bottom:1px solid rgba(255,255,255,.07);position:relative;z-index:1;flex-shrink:0;}
        .hs-logo{display:flex;align-items:center;gap:10px;font-family:var(--serif);font-size:20px;font-weight:700;color:rgba(250,247,242,.96);margin-bottom:3px;}
        .hs-logo-mark{width:32px;height:32px;background:linear-gradient(135deg,var(--terra),#E8956A);border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 4px 12px rgba(196,114,74,.4);flex-shrink:0;}
        .hs-tagline{font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:rgba(250,247,242,.25);padding-left:42px;}
        .hs-spaces-list{padding:14px 14px 0;flex-shrink:0;position:relative;z-index:1;}
        .hs-spaces-label{font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:rgba(250,247,242,.22);padding:0 6px 8px;font-weight:600;}
        .hs-space-btn{display:flex;align-items:center;gap:10px;width:100%;padding:9px 10px;border-radius:9px;border:none;background:none;cursor:pointer;font-family:var(--sans);font-size:13px;color:rgba(250,247,242,.45);text-align:left;transition:all .18s;margin-bottom:2px;position:relative;overflow:hidden;}
        .hs-space-btn:hover{background:rgba(255,255,255,.08);color:rgba(250,247,242,.8);}
        .hs-space-btn.active{background:rgba(196,114,74,.18);color:rgba(250,247,242,.95);font-weight:500;}
        .hs-space-btn.active::before{content:'';position:absolute;left:0;top:20%;bottom:20%;width:3px;border-radius:0 3px 3px 0;background:var(--terra);}
        .hs-space-icon{width:26px;height:26px;border-radius:7px;background:rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;}
        .hs-space-btn.active .hs-space-icon{background:rgba(196,114,74,.22);}
        .hs-add-space-btn{display:flex;align-items:center;gap:8px;width:calc(100% - 28px);margin:6px 14px 0;padding:9px 12px;border:1.5px dashed rgba(255,255,255,.12);border-radius:9px;background:none;cursor:pointer;color:rgba(250,247,242,.3);font-family:var(--sans);font-size:12px;transition:all .2s;}
        .hs-add-space-btn:hover{border-color:rgba(196,114,74,.4);color:rgba(196,114,74,.7);}
        .hs-nav{flex:1;padding:8px 14px;position:relative;z-index:1;overflow-y:auto;margin-top:8px;}
        .hs-nav-lbl{font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:rgba(250,247,242,.2);padding:12px 6px 6px;font-weight:600;}
        .hs-nav-item{display:flex;align-items:center;gap:9px;width:100%;padding:9px 10px;border-radius:8px;border:none;background:none;cursor:pointer;font-family:var(--sans);font-size:13px;color:rgba(250,247,242,.42);text-align:left;transition:all .18s;margin-bottom:1px;position:relative;}
        .hs-nav-item:hover{background:rgba(255,255,255,.08);color:rgba(250,247,242,.8);}
        .hs-nav-item.active{background:rgba(196,114,74,.18);color:rgba(250,247,242,.92);font-weight:500;}
        .hs-nav-item.active::before{content:'';position:absolute;left:0;top:22%;bottom:22%;width:3px;border-radius:0 3px 3px 0;background:var(--terra);}
        .hs-nav-icon{width:26px;height:26px;border-radius:7px;background:rgba(255,255,255,.05);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;}
        .hs-nav-item.active .hs-nav-icon{background:rgba(196,114,74,.22);}
        .hs-nav-badge{margin-left:auto;background:var(--terra);color:white;font-size:9.5px;font-weight:600;padding:1px 6px;border-radius:8px;}
        .hs-sb-bot{padding:10px 14px 14px;border-top:1px solid rgba(255,255,255,.06);position:relative;z-index:1;flex-shrink:0;}
        .hs-user-row{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:8px;}
        .hs-user-av{width:30px;height:30px;border-radius:50%;background:rgba(196,114,74,.25);border:1.5px solid rgba(196,114,74,.3);display:flex;align-items:center;justify-content:center;font-family:var(--serif);font-size:12px;font-weight:600;color:rgba(250,247,242,.75);flex-shrink:0;}
        .hs-user-name{flex:1;font-size:12px;color:rgba(250,247,242,.4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .hs-signout{background:none;border:none;cursor:pointer;color:rgba(250,247,242,.22);font-size:14px;padding:3px;line-height:1;transition:color .2s;}
        .hs-signout:hover{color:rgba(250,247,242,.55);}
        .hs-main{margin-left:var(--sidebar);flex:1;min-height:100vh;background:var(--ivory);}
        .hs-topbar{height:var(--topbar);background:rgba(250,247,242,.92);backdrop-filter:blur(20px);border-bottom:1px solid rgba(44,26,14,.07);padding:0 40px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;}
        .hs-greeting{font-family:var(--serif);font-size:15px;color:var(--ink3);display:flex;align-items:center;gap:6px;}
        .hs-greeting em{font-style:italic;color:var(--terra);}
        .hs-topbar-right{display:flex;gap:8px;align-items:center;}
        .btn-ghost{background:transparent;color:var(--ink3);border:1.5px solid var(--ivory3);border-radius:40px;padding:7px 16px;font-family:var(--sans);font-size:12px;font-weight:500;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;}
        .btn-ghost:hover{border-color:var(--terra);color:var(--terra);}
        .btn-primary{background:var(--espresso);color:rgba(250,247,242,.95);border:none;border-radius:40px;padding:8px 20px;font-family:var(--sans);font-size:12px;font-weight:500;cursor:pointer;transition:all .25s;display:inline-flex;align-items:center;gap:7px;white-space:nowrap;box-shadow:0 2px 8px rgba(44,26,14,.2);}
        .btn-primary:hover{background:var(--terra);transform:translateY(-1px);}
        .btn-primary:disabled{opacity:.4;cursor:not-allowed;transform:none;}
        .hs-content{padding:40px 40px 60px;max-width:1060px;}
        .hs-sec-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
        .hs-sec-lbl{font-size:9.5px;letter-spacing:3px;text-transform:uppercase;color:var(--terra);font-weight:600;display:flex;align-items:center;gap:10px;}
        .hs-sec-lbl::before{content:'';width:18px;height:1.5px;background:currentColor;border-radius:2px;}
        .hs-hero{position:relative;overflow:hidden;border-radius:var(--r);padding:40px 48px;margin-bottom:32px;border:none;cursor:pointer;width:100%;text-align:left;transition:transform .3s,box-shadow .3s;box-shadow:var(--shlg);}
        .hs-hero:hover{transform:translateY(-3px);}
        .hs-hero:disabled{opacity:.65;cursor:not-allowed;transform:none;}
        .hs-hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 70% 80% at 75% 20%,rgba(196,114,74,.22),transparent 55%);pointer-events:none;}
        .hs-hero-eyebrow{font-size:9.5px;letter-spacing:3.5px;text-transform:uppercase;color:rgba(196,114,74,.65);margin-bottom:10px;position:relative;z-index:1;}
        .hs-hero-title{font-family:var(--serif);font-size:clamp(22px,2.8vw,32px);font-weight:600;line-height:1.25;color:rgba(250,247,242,.95);position:relative;z-index:1;margin-bottom:8px;}
        .hs-hero-title em{font-style:italic;color:#E8956A;}
        .hs-hero-sub{font-size:13px;color:rgba(250,247,242,.4);position:relative;z-index:1;line-height:1.65;}
        .hs-hero-cta{position:relative;z-index:1;display:inline-flex;align-items:center;gap:9px;margin-top:22px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);border-radius:40px;padding:9px 20px;font-family:var(--sans);font-size:12.5px;font-weight:500;color:rgba(250,247,242,.85);transition:all .25s;}
        .hs-hero:hover .hs-hero-cta{background:rgba(196,114,74,.3);}
        .hs-hero-arr{transition:transform .25s;}
        .hs-hero:hover .hs-hero-arr{transform:translateX(4px);}
        .hs-hero-avatar{position:absolute;right:48px;top:50%;transform:translateY(-50%);width:84px;height:84px;border-radius:50%;overflow:hidden;border:3px solid rgba(255,255,255,.14);box-shadow:0 8px 28px rgba(0,0,0,.3);z-index:1;}
        .hs-hero-spinner{width:16px;height:16px;border-radius:50%;border:2px solid rgba(250,247,242,.2);border-top-color:rgba(250,247,242,.8);animation:hs-spin .8s linear infinite;}
        .hs-stats-g{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:32px;}
        .hs-stat-c{background:#fff;border:1px solid var(--ivory3);border-radius:var(--r);padding:20px 18px;transition:all .25s;position:relative;overflow:hidden;}
        .hs-stat-c:hover{box-shadow:var(--sh);transform:translateY(-1px);}
        .hs-stat-c::after{content:'';position:absolute;bottom:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--terra),#D4A5A0);transform:scaleX(0);transition:transform .3s;transform-origin:left;}
        .hs-stat-c:hover::after{transform:scaleX(1);}
        .hs-stat-icon{font-size:18px;margin-bottom:10px;}
        .hs-stat-n{font-family:var(--serif);font-size:36px;font-weight:500;color:var(--ink);line-height:1;margin-bottom:4px;}
        .hs-stat-l{font-size:10px;color:var(--ink4);letter-spacing:1.5px;text-transform:uppercase;}
        .hs-act-g{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:32px;}
        .hs-act-c{background:#fff;border:1.5px solid var(--ivory3);border-radius:var(--r);padding:22px 20px;cursor:pointer;transition:all .25s;display:flex;flex-direction:column;gap:10px;position:relative;overflow:hidden;}
        .hs-act-c:hover{border-color:var(--terra);box-shadow:0 8px 28px rgba(196,114,74,.1);transform:translateY(-3px);}
        .hs-act-c::after{content:'';position:absolute;top:0;left:-80%;width:50%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent);transform:skewX(-12deg);}
        .hs-act-c:hover::after{animation:hs-shim .55s ease;}
        .hs-act-icon{width:40px;height:40px;border-radius:var(--rsm);display:flex;align-items:center;justify-content:center;font-size:18px;}
        .hs-act-title{font-family:var(--serif);font-size:15.5px;font-weight:600;color:var(--ink);}
        .hs-act-desc{font-size:12px;color:var(--ink4);line-height:1.6;}
        .hs-act-arrow{margin-top:auto;font-size:12px;color:var(--terra);opacity:0;transform:translateX(-4px);transition:all .2s;}
        .hs-act-c:hover .hs-act-arrow{opacity:1;transform:translateX(0);}
        .hs-mem-feed{display:flex;flex-direction:column;gap:10px;}
        .hs-mem-item{display:flex;background:#fff;border:1px solid var(--ivory3);border-radius:var(--r);overflow:hidden;transition:all .22s;}
        .hs-mem-item:hover{box-shadow:var(--sh);transform:translateX(3px);}
        .hs-mem-stripe{width:4px;flex-shrink:0;background:linear-gradient(180deg,var(--terra),#D4A5A0,#7A9E7E);}
        .hs-mem-body{flex:1;padding:16px 20px;min-width:0;}
        .hs-mem-meta{display:flex;align-items:center;gap:10px;margin-bottom:7px;flex-wrap:wrap;}
        .hs-mem-author{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--terra);font-weight:600;background:rgba(196,114,74,.1);padding:3px 9px;border-radius:20px;}
        .hs-mem-date{font-size:11px;color:var(--ink4);}
        .hs-mem-text{font-family:var(--serif);font-size:16px;font-style:italic;color:var(--ink2);line-height:1.8;}
        .hs-mem-photo{width:90px;flex-shrink:0;object-fit:cover;}
        .hs-empty{text-align:center;padding:56px 32px;border:1.5px dashed var(--parchment);border-radius:var(--r);background:linear-gradient(135deg,#fff,var(--ivory));}
        .hs-empty-icon{font-size:40px;margin-bottom:14px;opacity:.55;}
        .hs-empty-title{font-family:var(--serif);font-size:21px;font-weight:500;color:var(--ink);margin-bottom:8px;}
        .hs-empty-desc{font-size:13.5px;color:var(--ink4);line-height:1.7;max-width:380px;margin:0 auto;}
        .hs-setup-wrap{flex:1;display:flex;align-items:center;justify-content:center;padding:40px;min-height:calc(100vh - var(--topbar));}
        .hs-setup-card{background:#fff;border:1px solid var(--ivory3);border-radius:24px;padding:60px 52px;text-align:center;max-width:480px;width:100%;box-shadow:var(--shlg);animation:hs-pop .6s cubic-bezier(.22,.68,0,1.2) both;position:relative;overflow:hidden;}
        .hs-setup-card::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,var(--terra),#D4A5A0,#7A9E7E);}
        .hs-overlay{position:fixed;inset:0;background:rgba(44,26,14,.4);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px;animation:hs-in .2s ease;}
        .hs-modal{background:#fff;border:1px solid var(--ivory3);border-radius:20px;width:100%;max-width:500px;max-height:92vh;overflow-y:auto;box-shadow:0 40px 80px rgba(44,26,14,.18);animation:hs-pop .3s cubic-bezier(.22,.68,0,1.2) both;}
        .hs-modal-hd{padding:32px 36px 0;position:sticky;top:0;background:#fff;}
        .hs-modal-bar{height:3px;border-radius:3px 3px 0 0;margin:-32px -36px 24px;background:linear-gradient(90deg,var(--terra),#D4A5A0);}
        .hs-modal-title{font-family:var(--serif);font-size:24px;font-weight:600;color:var(--ink);margin-bottom:5px;}
        .hs-modal-title em{font-style:italic;color:var(--terra);}
        .hs-modal-desc{font-size:13px;color:var(--ink3);line-height:1.65;}
        .hs-modal-body{padding:20px 36px 36px;}
        .hs-lbl{display:block;font-size:9.5px;letter-spacing:2.5px;text-transform:uppercase;color:var(--ink3);font-weight:600;margin-bottom:7px;}
        .hs-input{width:100%;padding:11px 14px;background:var(--ivory);border:1.5px solid var(--ivory3);border-radius:var(--rsm);font-family:var(--sans);font-size:13.5px;color:var(--ink);outline:none;transition:all .22s;margin-bottom:16px;}
        .hs-input:focus{border-color:var(--terra);background:#fff;box-shadow:0 0 0 3px rgba(196,114,74,.08);}
        .hs-textarea{width:100%;padding:12px 14px;background:var(--ivory);border:1.5px solid var(--ivory3);border-radius:var(--rsm);font-family:var(--serif);font-style:italic;font-size:16px;color:var(--ink);outline:none;resize:none;min-height:120px;line-height:1.75;transition:all .22s;margin-bottom:16px;}
        .hs-textarea:focus{border-color:var(--terra);background:#fff;box-shadow:0 0 0 3px rgba(196,114,74,.08);}
        .hs-textarea::placeholder{color:var(--ink5);font-style:italic;}
        .hs-upload{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:26px;border:2px dashed var(--parchment);border-radius:var(--r);background:var(--ivory);cursor:pointer;transition:all .25s;margin-bottom:16px;text-align:center;}
        .hs-upload:hover{border-color:var(--terra);background:rgba(196,114,74,.05);}
        .hs-modal-btns{display:flex;gap:10px;margin-top:4px;}
        .hs-btn-save{flex:1;padding:12px;background:var(--espresso);color:rgba(250,247,242,.95);border:none;border-radius:10px;font-family:var(--sans);font-size:11.5px;font-weight:600;letter-spacing:.8px;text-transform:uppercase;cursor:pointer;transition:all .25s;}
        .hs-btn-save:hover{background:var(--terra);}
        .hs-btn-save:disabled{opacity:.4;cursor:not-allowed;}
        .hs-btn-cancel{padding:12px 20px;background:transparent;border:1.5px solid var(--ivory3);border-radius:10px;font-family:var(--sans);font-size:13px;color:var(--ink3);cursor:pointer;}
        .hs-type-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:18px;}
        .hs-type-btn{padding:12px 8px;border-radius:10px;border:1.5px solid var(--ivory3);background:var(--ivory);cursor:pointer;text-align:center;transition:all .2s;font-family:var(--sans);}
        .hs-type-btn.sel{border-color:var(--terra);background:rgba(196,114,74,.06);}
        .hs-type-emoji{font-size:22px;display:block;margin-bottom:5px;}
        .hs-type-label{font-size:11.5px;font-weight:600;color:var(--ink);display:block;}
        .hs-type-desc{font-size:10px;color:var(--ink4);margin-top:2px;line-height:1.4;display:block;}
        .hs-invite-box{background:var(--ivory);border:1.5px solid var(--parchment);border-radius:var(--rsm);padding:12px 14px;font-family:monospace;font-size:12px;color:var(--ink2);word-break:break-all;line-height:1.6;margin-bottom:14px;}
        .hs-err{background:rgba(196,50,50,.07);border:1px solid rgba(196,50,50,.2);border-radius:8px;padding:10px 14px;font-size:12.5px;color:#b03030;margin-bottom:14px;}
        .hs-mob-nav{
          display:none;position:fixed;bottom:0;left:0;right:0;
          background:rgba(250,247,242,.97);
          backdrop-filter:blur(20px) saturate(180%);
          -webkit-backdrop-filter:blur(20px) saturate(180%);
          border-top:1px solid rgba(44,26,14,.08);
          z-index:300;
          padding:6px 0 max(10px,env(safe-area-inset-bottom));
          box-shadow:0 -4px 20px rgba(44,26,14,.06);
        }
        .hs-mob-nav-inner{display:flex;justify-content:space-around;align-items:center;max-width:480px;margin:0 auto;}
        .hs-mob-nav-item{
          display:flex;flex-direction:column;align-items:center;gap:2px;
          padding:6px 10px;border:none;background:none;cursor:pointer;
          font-family:var(--sans);font-size:9.5px;font-weight:500;
          color:var(--ink4);transition:all .18s;min-width:56px;
          border-radius:12px;
        }
        .hs-mob-nav-item.active{color:var(--terra);}
        .hs-mob-nav-item.active span:first-child{transform:scale(1.15);}
        .hs-mob-nav-item span:first-child{font-size:22px;transition:transform .2s;display:block;}
        /* FAB — floating add button on mobile */
        .hs-mob-fab{
          display:none;position:fixed;bottom:max(80px,calc(70px + env(safe-area-inset-bottom)));
          right:18px;width:52px;height:52px;border-radius:50%;
          background:var(--espresso);color:white;border:none;
          font-size:22px;cursor:pointer;z-index:301;
          box-shadow:0 6px 20px rgba(44,26,14,.3);
          display:none;align-items:center;justify-content:center;
          transition:all .2s;
        }
        .hs-mob-fab:hover{background:var(--terra);transform:scale(1.08);}

        /* ── TABLET ── */
        @media(max-width:768px){
          .hs-sb{display:none;}
          .hs-main{margin-left:0;width:100%;}
          .hs-mob-nav{display:block;}
          /* Topbar */
          .hs-topbar{padding:0 16px;height:52px;}
          .hs-greeting{font-size:14px;}
          /* Content */
          .hs-content{padding:16px 14px 96px;width:100%;}
          /* Hero */
          .hs-hero{padding:24px 20px 28px;border-radius:12px;margin-bottom:20px;}
          .hs-hero-avatar{display:none;}
          .hs-hero-eyebrow{font-size:8.5px;margin-bottom:8px;}
          .hs-hero-title{font-size:20px!important;}
          .hs-hero-sub{font-size:12px;}
          .hs-hero-cta{padding:8px 16px;font-size:12px;margin-top:16px;}
          /* Stats — 2 col on tablet */
          .hs-stats-g{grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:20px;}
          .hs-stat-n{font-size:28px;}
          .hs-stat-c{padding:16px 14px;}
          /* Actions — 1 col on tablet */
          .hs-act-g{grid-template-columns:1fr;gap:10px;margin-bottom:20px;}
          .hs-act-c{padding:16px 16px;flex-direction:row;align-items:center;gap:14px;}
          .hs-act-icon{flex-shrink:0;}
          .hs-act-arrow{display:none;}
          /* Memories */
          .hs-mem-text{font-size:15px;}
          .hs-mem-photo{width:72px;}
          /* Modals — slide up from bottom */
          .hs-overlay{align-items:flex-end;padding:0;}
          .hs-modal{border-radius:20px 20px 0 0;max-width:100%;max-height:94vh;}
          .hs-modal-hd{padding:20px 20px 0;}
          .hs-modal-bar{margin:-20px -20px 20px;border-radius:3px 3px 0 0;}
          .hs-modal-body{padding:12px 20px 32px;}
          /* Type grid */
          .hs-type-grid{grid-template-columns:repeat(3,1fr);}
          /* Setup card */
          .hs-setup-card{padding:40px 28px;}
          /* Section label */
          .hs-sec-row{margin-bottom:12px;}
        }

        /* ── SMALL PHONES (iPhone SE, older Android) ── */
        @media(max-width:390px){
          .hs-content{padding:12px 12px 96px;}
          .hs-hero{padding:20px 16px 24px;}
          .hs-hero-title{font-size:18px!important;}
          .hs-stats-g{grid-template-columns:repeat(2,1fr);gap:8px;}
          .hs-stat-n{font-size:24px;}
          .hs-stat-c{padding:14px 12px;}
          .hs-type-grid{grid-template-columns:repeat(2,1fr);}
          .hs-modal-body{padding:10px 16px 28px;}
          .hs-modal-hd{padding:16px 16px 0;}
          .hs-modal-bar{margin:-16px -16px 16px;}
          .hs-mem-text{font-size:14px;}
        }
      `}</style>

      {/* SIDEBAR */}
      <aside className="hs-sb">
        <div className="hs-brand">
          <div className="hs-logo"><div className="hs-logo-mark">📖</div>Hemsaga</div>
          <div className="hs-tagline">Family Stories Forever</div>
        </div>
        <div className="hs-spaces-list">
          <div className="hs-spaces-label">My Spaces</div>
          {spaces.map(s => (
            <button key={s.id} className={`hs-space-btn ${activeSpace?.id===s.id?'active':''}`} onClick={()=>switchSpace(s)}>
              <span className="hs-space-icon">{s.cover_emoji}</span>
              <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.name}</span>
            </button>
          ))}
          <button className="hs-add-space-btn" onClick={()=>setShowNew(true)}>＋ New Space</button>
        </div>
        {activeSpace && (
          <nav className="hs-nav">
            <div className="hs-nav-lbl">Views</div>
            {[{id:'home',icon:'⌂',label:'Dashboard'},{id:'memories',icon:'🌸',label:'Memories',badge:memories.length||null},{id:'story',icon:'📖',label:'Our Story'}].map(n=>(
              <button key={n.id} className={`hs-nav-item ${view===n.id?'active':''}`} onClick={()=>setView(n.id)}>
                <span className="hs-nav-icon">{n.icon}</span>{n.label}
                {n.badge&&<span className="hs-nav-badge">{n.badge}</span>}
              </button>
            ))}
            <div className="hs-nav-lbl" style={{marginTop:8}}>Actions</div>
            <button className="hs-nav-item" onClick={()=>setShowAddMem(true)}><span className="hs-nav-icon">✦</span>Add Memory</button>
            <button className="hs-nav-item" onClick={()=>{setShowInvite(true);setInviteLink('');}}><span className="hs-nav-icon">👥</span>Invite Someone</button>
            <button className="hs-nav-item" onClick={()=>setShowCartoon(true)}><span className="hs-nav-icon">🎨</span>Cartoon Avatar</button>
          </nav>
        )}
        <div className="hs-sb-bot">
          <div className="hs-user-row">
            <div className="hs-user-av">{userName[0].toUpperCase()}</div>
            <span className="hs-user-name">{userName}</span>
            <button className="hs-signout" onClick={async()=>{await supabase.auth.signOut();router.push('/auth');}}>↪</button>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="hs-main">
        <header className="hs-topbar">
          {/* Desktop greeting */}
          <span className="hs-greeting" style={{display:'none'}} id="hs-desk-greet">
            {activeSpace ? <>{greeting()} — <em>{activeSpace.name}</em></> : <>Welcome to <em>Hemsaga</em></>}
          </span>
          {/* Mobile: logo + space name */}
          <div style={{display:'flex',alignItems:'center',gap:8}} id="hs-mob-greet">
            <div style={{width:26,height:26,background:'linear-gradient(135deg,#C4724A,#E8956A)',borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,flexShrink:0}}>📖</div>
            <span style={{fontFamily:'var(--serif)',fontSize:14,fontWeight:600,color:'var(--ink)',maxWidth:'45vw',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              {activeSpace ? activeSpace.name : 'Hemsaga'}
            </span>
          </div>
          <style>{`@media(min-width:769px){#hs-desk-greet{display:flex!important;}#hs-mob-greet{display:none!important;}}`}</style>
          <div className="hs-topbar-right">
            {activeSpace && <>
              <button className="btn-ghost" onClick={()=>setShowAddMem(true)} style={{}} id="hs-desk-add">+ Memory</button>
              <button className="btn-primary" onClick={()=>generateStory(false)} disabled={generating||memories.length===0} style={{padding:'7px 14px',fontSize:'11.5px'}}>
                {generating?<><div className="hs-hero-spinner" style={{width:11,height:11,borderWidth:'1.5px'}}/>Writing…</>:<>✦ Generate</>}
              </button>
              <style>{`@media(max-width:768px){#hs-desk-add{display:none!important;}}`}</style>
            </>}
          </div>
        </header>

        {/* No spaces setup */}
        {spaces.length === 0 && (
          <div className="hs-setup-wrap">
            <div className="hs-setup-card">
              <div style={{fontSize:52,marginBottom:20}}>📖</div>
              <h1 style={{fontFamily:'var(--serif)',fontSize:30,fontWeight:600,color:'var(--ink)',marginBottom:12}}>
                Create your first <em style={{fontStyle:'italic',color:'var(--terra)'}}>Space</em>
              </h1>
              <p style={{fontSize:14,color:'var(--ink3)',marginBottom:32,lineHeight:1.75}}>
                A Space is your story container — name it anything.
              </p>
              <button className="btn-primary" style={{margin:'0 auto',padding:'12px 32px',borderRadius:14}} onClick={()=>setShowNew(true)}>
                Create a Space →
              </button>
            </div>
          </div>
        )}

        {/* HOME */}
        {activeSpace && view==='home' && (
          <div className="hs-content hs-stagger">
            <button className="hs-hero" style={{background:theme.grad}} onClick={()=>memories.length>0?generateStory(false):setShowAddMem(true)} disabled={generating}>
              {activeSpace.cartoon_url
                ? <div className="hs-hero-avatar"><img src={activeSpace.cartoon_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/></div>
                : <div className="hs-hero-avatar" style={{background:'rgba(255,255,255,.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:36}}>{activeSpace.cover_emoji}</div>}
              <div className="hs-hero-eyebrow">AI Story Engine · Hemsaga</div>
              {generating
                ? <div style={{display:'flex',alignItems:'center',gap:12,position:'relative',zIndex:1}}><div className="hs-hero-spinner"/><div className="hs-hero-title">Writing the next chapter…</div></div>
                : <><div className="hs-hero-title">{memories.length===0?<>Start <em>{activeSpace.name}</em></>:<>Continue <em>{activeSpace.name}</em></>}</div>
                    <div className="hs-hero-sub">{memories.length===0?'Every story begins with a single moment.':
                      `${memories.length} ${memories.length===1?'memory':'memories'} · AI will weave them into the next chapter`}</div>
                    <div className="hs-hero-cta"><span>{memories.length===0?'Add first memory':'Generate next chapter'}</span><span className="hs-hero-arr">→</span></div></>}
            </button>

            <div className="hs-sec-row"><span className="hs-sec-lbl">At a glance</span></div>
            <div className="hs-stats-g">
              {[
                {icon:'🌸',n:memories.length,l:'Memories'},
                {icon:'📖',n:Math.ceil(memories.length/5)||0,l:'Chapters'},
                {icon:'📅',n:activeSpace.subject_dob?getDays(activeSpace.subject_dob):'—',l:'Days old'},
                {icon:'💛',n:'∞',l:'Love stored'},
              ].map((s,i)=>(
                <div key={i} className="hs-stat-c">
                  <div className="hs-stat-icon">{s.icon}</div>
                  <div className="hs-stat-n">{s.n}</div>
                  <div className="hs-stat-l">{s.l}</div>
                </div>
              ))}
            </div>

            {/* Curiosity counter — others' hidden memories */}
            {totalMemCount - memories.length > 0 && (
              <div style={{background:'rgba(196,114,74,.07)',border:'1px solid rgba(196,114,74,.15)',borderRadius:12,padding:'12px 18px',marginBottom:20,display:'flex',alignItems:'center',gap:12}}>
                <span style={{fontSize:20}}>🤫</span>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:'var(--ink)'}}>{totalMemCount - memories.length} {totalMemCount - memories.length === 1 ? 'memory' : 'memories'} from family — hidden until the story is told</div>
                  <div style={{fontSize:11.5,color:'var(--ink4)',marginTop:2}}>Generate the story to see what everyone contributed</div>
                </div>
              </div>
            )}
            <div className="hs-sec-row"><span className="hs-sec-lbl">Quick Actions</span></div>
            <div className="hs-act-g">
              {[
                {icon:'✍️',bg:'rgba(196,114,74,.1)',title:'Log a Memory',desc:'Capture a moment for this story',fn:()=>setShowAddMem(true)},
                {icon:'👥',bg:'rgba(93,138,107,.1)',title:'Invite Someone',desc:'Share this space with anyone',fn:()=>{setShowInvite(true);setInviteLink('');}},
                {icon:'🎨',bg:'rgba(181,99,94,.12)',title:'Cartoon Avatar',desc:activeSpace.cartoon_url?'Update the avatar':'Generate a Pixar-style portrait',fn:()=>setShowCartoon(true)},
              ].map((a,i)=>(
                <div key={i} className="hs-act-c" onClick={a.fn}>
                  <div className="hs-act-icon" style={{background:a.bg}}>{a.icon}</div>
                  <div className="hs-act-title">{a.title}</div>
                  <div className="hs-act-desc">{a.desc}</div>
                  <div className="hs-act-arrow">→</div>
                </div>
              ))}
            </div>

            <div className="hs-sec-row">
              <span className="hs-sec-lbl">Recent Memories</span>
              {memories.length>4&&<button className="btn-ghost" style={{fontSize:11,padding:'5px 12px'}} onClick={()=>setView('memories')}>View all →</button>}
            </div>
            {memories.length===0
              ? <div className="hs-empty"><div className="hs-empty-icon">🌸</div><div className="hs-empty-title">The first memory is waiting</div><div className="hs-empty-desc">Even the smallest moment becomes part of this story forever.</div></div>
              : <div className="hs-mem-feed">{memories.slice(0,4).map(m=>(
                  <div key={m.id} className="hs-mem-item">
                    <div className="hs-mem-stripe"/>
                    <div className="hs-mem-body">
                      <div className="hs-mem-meta"><span className="hs-mem-author">{m.author}</span><span className="hs-mem-date">{fmtShort(m.memory_date)}</span></div>
                      <div className="hs-mem-text">{m.content}</div>
                    </div>
                    {m.photo_url&&<img src={m.photo_url} alt="" className="hs-mem-photo"/>}
                  </div>
                ))}</div>}
          </div>
        )}

        {/* MEMORIES */}
        {activeSpace && view==='memories' && (
          <div className="hs-content hs-stagger">
            <div className="hs-sec-row">
              <span className="hs-sec-lbl">All Memories · {memories.length}</span>
              <button className="btn-ghost" style={{fontSize:'11px',padding:'6px 14px'}} onClick={()=>setShowAddMem(true)}>+ Add</button>
            </div>
            {memories.length===0
              ? <div className="hs-empty"><div className="hs-empty-icon">🌸</div><div className="hs-empty-title">No memories yet</div><div className="hs-empty-desc">Start logging moments — big or small, they all matter.</div></div>
              : <div className="hs-mem-feed">{memories.map(m=>(
                  <div key={m.id} className="hs-mem-item">
                    <div className="hs-mem-stripe"/>
                    <div className="hs-mem-body">
                      <div className="hs-mem-meta"><span className="hs-mem-author">{m.author}</span><span className="hs-mem-date">{fmtDate(m.memory_date)}</span></div>
                      <div className="hs-mem-text">{m.content}</div>
                    </div>
                    {m.photo_url&&<img src={m.photo_url} alt="" className="hs-mem-photo"/>}
                  </div>
                ))}</div>}
          </div>
        )}

        {/* STORY */}
        {activeSpace && view==='story' && (
          <div className="hs-content hs-stagger">
            <div className="hs-sec-row"><span className="hs-sec-lbl">The Story of {activeSpace.name}</span></div>
            {memories.length===0
              ? <div className="hs-empty"><div className="hs-empty-icon">📖</div><div className="hs-empty-title">No chapters yet</div><div className="hs-empty-desc">Add some memories first, then let AI weave them into your story.</div></div>
              : <div style={{background:'#fff',border:'1px solid var(--ivory3)',borderRadius:'var(--r)',padding:'52px 44px',textAlign:'center',boxShadow:'var(--shmd)'}}>
                  {activeSpace.cartoon_url&&<img src={activeSpace.cartoon_url} alt="" style={{width:76,height:76,borderRadius:'50%',objectFit:'cover',border:'3px solid var(--parchment)',display:'block',margin:'0 auto 18px'}}/>}
                  <div style={{fontFamily:'var(--serif)',fontSize:32,fontWeight:600,color:'var(--ink)',marginBottom:7}}>{activeSpace.name}</div>
                  <div style={{fontSize:13,color:'var(--ink4)',marginBottom:28}}>{memories.length} memories · A growing story</div>
                  <button className="btn-primary" style={{margin:'0 auto',padding:'12px 32px',borderRadius:14}} onClick={()=>generateStory(false)} disabled={generating}>
                    {generating?'✦ Writing…':'✦ Read & Generate Chapter'}
                  </button>
                </div>}
          </div>
        )}

        {/* MOBILE NAV */}
        <nav className="hs-mob-nav">
          <div className="hs-mob-nav-inner">
            {activeSpace && <>
              {[{id:'home',icon:'⌂',label:'Home'},{id:'memories',icon:'🌸',label:'Memories'},{id:'story',icon:'📖',label:'Story'}].map(n=>(
                <button key={n.id} className={`hs-mob-nav-item ${view===n.id?'active':''}`} onClick={()=>setView(n.id)}>
                  <span>{n.icon}</span><span>{n.label}</span>
                </button>
              ))}
              <button className="hs-mob-nav-item" onClick={()=>setShowAddMem(true)}><span>✦</span><span>Memory</span></button>
            </>}
            {!activeSpace&&<button className="hs-mob-nav-item active" onClick={()=>setShowNew(true)}><span>＋</span><span>New Space</span></button>}
          </div>
        </nav>
      </div>

      {/* NEW SPACE MODAL */}
      {showNewSpace && (
        <div className="hs-overlay" onClick={()=>setShowNew(false)}>
          <div className="hs-modal" onClick={e=>e.stopPropagation()}>
            <div className="hs-modal-hd"><div className="hs-modal-bar"/><h2 className="hs-modal-title">Create a <em>Space</em></h2><p className="hs-modal-desc">Name it anything. A child, a couple, a friendship, yourself.</p></div>
            <div className="hs-modal-body">
              {error&&<div className="hs-err">⚠ {error}</div>}
              <label className="hs-lbl">What kind of story?</label>
              <div className="hs-type-grid">
                {SPACE_TYPES.map(t=>(
                  <button key={t.id} className={`hs-type-btn ${nsType===t.id?'sel':''}`} onClick={()=>setNsType(t.id)}>
                    <span className="hs-type-emoji">{t.emoji}</span>
                    <span className="hs-type-label">{t.label}</span>
                    <span className="hs-type-desc">{t.desc}</span>
                  </button>
                ))}
              </div>
              <label className="hs-lbl">Space Name</label>
              <input className="hs-input" placeholder={nsType==='child'?"e.g. Ivaan's Story":nsType==='couple'?"e.g. Me & Sara":"e.g. Our Story"} value={nsName} onChange={e=>setNsName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&createSpace()}/>
              {(nsType==='child'||nsType==='self')&&<>
                <label className="hs-lbl">Subject Name</label>
                <input className="hs-input" placeholder="e.g. Ivaan" value={nsSubject} onChange={e=>setNsSubject(e.target.value)}/>
                <label className="hs-lbl">Date of Birth (optional)</label>
                <input className="hs-input" type="date" value={nsDob} onChange={e=>setNsDob(e.target.value)}/>
              </>}
              <div className="hs-modal-btns">
                <button className="hs-btn-save" onClick={createSpace} disabled={saving||!nsName.trim()}>{saving?'Creating…':'Create Space →'}</button>
                <button className="hs-btn-cancel" onClick={()=>{setShowNew(false);setError('');}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD MEMORY MODAL */}
      {showAddMem && (
        <div className="hs-overlay" onClick={()=>setShowAddMem(false)}>
          <div className="hs-modal" onClick={e=>e.stopPropagation()}>
            <div className="hs-modal-hd"><div className="hs-modal-bar"/><h2 className="hs-modal-title">Log a <em>memory</em></h2><p className="hs-modal-desc">Even the smallest moment becomes part of this story forever.</p></div>
            <div className="hs-modal-body">
              {error&&<div className="hs-err">⚠ {error}</div>}
              <label className="hs-lbl">Who is sharing?</label>
              <input className="hs-input" placeholder="Papa, Mama, Nana…" value={memAuthor} onChange={e=>setMemAuthor(e.target.value)}/>
              <label className="hs-lbl">When did this happen?</label>
              <input className="hs-input" type="date" value={memDate||new Date().toISOString().split('T')[0]} max={new Date().toISOString().split('T')[0]} onChange={e=>setMemDate(e.target.value)}/>
              <label className="hs-lbl">What happened?</label>
              <textarea className="hs-textarea" placeholder="Describe the moment…" value={memText} onChange={e=>setMemText(e.target.value)}/>
              <label className="hs-lbl">Photo (optional)</label>
              {memPreview
                ? <div style={{position:'relative',marginBottom:16}}><img src={memPreview} style={{width:'100%',maxHeight:190,objectFit:'cover',borderRadius:10}} alt=""/><button onClick={()=>{setMemPhoto(null);setMemPrev(null);}} style={{position:'absolute',top:8,right:8,background:'rgba(44,26,14,.65)',color:'white',border:'none',borderRadius:'50%',width:26,height:26,cursor:'pointer',fontSize:15,display:'flex',alignItems:'center',justifyContent:'center'}}>×</button></div>
                : <label className="hs-upload"><span style={{fontSize:26}}>📷</span><span style={{fontSize:13,color:'var(--ink3)',fontWeight:500}}>Tap to add a photo</span><input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files[0];if(f){setMemPhoto(f);setMemPrev(URL.createObjectURL(f));}}}/></label>}
              <div className="hs-modal-btns">
                <button className="hs-btn-save" onClick={saveMemory} disabled={saving||!memText.trim()}>{saving?'Saving…':'Save Memory →'}</button>
                <button className="hs-btn-cancel" onClick={()=>{setShowAddMem(false);setError('');setMemPhoto(null);setMemPrev(null);}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CARTOON MODAL */}
      {showCartoon && (
        <div className="hs-overlay" onClick={()=>{if(!cartoonizing){setShowCartoon(false);setCartoonPhoto(null);setCartoonPrev(null);}}}>
          <div className="hs-modal" onClick={e=>e.stopPropagation()}>
            <div className="hs-modal-hd"><div className="hs-modal-bar"/><h2 className="hs-modal-title">🎨 Cartoon <em>Avatar</em></h2><p className="hs-modal-desc">Transform a photo into a Pixar-style illustration.</p></div>
            <div className="hs-modal-body">
              {cartoonizing&&<div style={{textAlign:'center',padding:'32px 0'}}><div style={{width:44,height:44,borderRadius:'50%',border:'3px solid var(--parchment)',borderTopColor:'var(--terra)',animation:'hs-spin 1s linear infinite',margin:'0 auto 14px'}}/><div style={{fontFamily:'var(--serif)',fontSize:18,color:'var(--ink)'}}>Creating the cartoon…</div></div>}
              {!cartoonizing&&!cartoonPreview&&(<><label className="hs-upload" style={{padding:40}}><span style={{fontSize:36}}>📷</span><span style={{fontFamily:'var(--serif)',fontSize:15}}>Upload a photo</span><span style={{fontSize:11.5,color:'var(--ink5)',textAlign:'center'}}>Clear, front-facing works best</span><input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files[0];if(f){setCartoonPhoto(f);setCartoonPrev(URL.createObjectURL(f));}}}/></label><button className="hs-btn-cancel" style={{width:'100%'}} onClick={()=>setShowCartoon(false)}>Cancel</button></>)}
              {!cartoonizing&&cartoonPreview&&(<><div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:18,margin:'16px 0 22px'}}><img src={cartoonPreview} alt="" style={{width:100,height:100,borderRadius:'50%',objectFit:'cover',border:'3px solid var(--parchment)'}}/><span style={{fontSize:22,color:'var(--terra)'}}>→</span><div style={{width:100,height:100,borderRadius:'50%',background:'var(--ivory2)',border:'2px dashed var(--parchment)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:30}}>✨</div></div><div className="hs-modal-btns"><button className="hs-btn-save" onClick={generateCartoon}>✨ Generate</button><button className="hs-btn-cancel" onClick={()=>{setCartoonPhoto(null);setCartoonPrev(null);}}>Change Photo</button></div></>)}
            </div>
          </div>
        </div>
      )}

      {/* INVITE MODAL */}
      {showInvite && (
        <div className="hs-overlay" onClick={()=>setShowInvite(false)}>
          <div className="hs-modal" onClick={e=>e.stopPropagation()}>
            <div className="hs-modal-hd"><div className="hs-modal-bar"/><h2 className="hs-modal-title">Invite <em>Someone</em></h2><p className="hs-modal-desc">Share a magic link to let anyone add memories.</p></div>
            <div className="hs-modal-body">
              {!inviteLink
                ? <div className="hs-modal-btns"><button className="hs-btn-save" onClick={generateInvite}>Generate Invite Link</button><button className="hs-btn-cancel" onClick={()=>setShowInvite(false)}>Cancel</button></div>
                : <><div className="hs-invite-box">{inviteLink}</div><div className="hs-modal-btns"><button className="hs-btn-save" onClick={()=>{navigator.clipboard.writeText(inviteLink);alert('Copied!');}}>📋 Copy Link</button><button className="hs-btn-cancel" onClick={()=>setShowInvite(false)}>Close</button></div></>}
            </div>
          </div>
        </div>
      )}

      {/* STORY READER */}
      {showStory && story?.length>0 && (
        <StoryReader chapters={story} spaceName={activeSpace?.name} spaceEmoji={activeSpace?.cover_emoji} avatarUrl={activeSpace?.cartoon_url} onClose={()=>setShowStory(false)} onRegenerate={()=>{setShowStory(false);generateStory(true);}}/>
      )}
    </>
  );
}