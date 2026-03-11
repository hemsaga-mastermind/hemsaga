// app/join/[token]/page.js
'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from '../../../lib/i18n/LanguageContext';

export default function JoinPage() {
  const { token } = useParams();
  const router = useRouter();
  const [space, setSpace]       = useState(null);
  const [name, setName]         = useState('');
  const [loading, setLoading]   = useState(true);
  const [joining, setJoining]   = useState(false);
  const [error, setError]       = useState('');
  const [notFound, setNotFound] = useState(false);
  const { t, lang, toggleLang } = useTranslation();

  useEffect(() => {
    if (!token) return;

    // If already joined this space, go straight to contributor dashboard
    const saved = localStorage.getItem(`hemsaga_contributor_${token}`);
    if (saved) {
      const c = JSON.parse(saved);
      router.push(`/contribute/${token}?name=${encodeURIComponent(c.name)}`);
      return;
    }

    // Load space info from token
    fetch(`/api/spaces/invite?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setNotFound(true); }
        else { setSpace(data.space); }
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [token]);

  const join = async () => {
    if (!name.trim()) return;
    setJoining(true);
    setError('');
    try {
      // Update the space_members row with the contributor's name
      const res = await fetch('/api/spaces/invite/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, displayName: name.trim() }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setJoining(false); return; }

      // Save contributor session to localStorage
      const contributorId = data.contributorId;
      localStorage.setItem(`hemsaga_contributor_${token}`, JSON.stringify({
        name: name.trim(),
        contributorId,
        spaceId: space.id,
        spaceName: space.name,
        token,
      }));

      router.push(`/contribute/${token}`);
    } catch (e) {
      setError('Something went wrong. Try again.');
      setJoining(false);
    }
  };

  if (loading) return (
    <div style={styles.center}>
      <div style={styles.spinner}/>
    </div>
  );

  if (notFound) return (
    <div style={styles.center}>
      <div style={{textAlign:'center',padding:'0 32px'}}>
        <div style={{fontSize:48,marginBottom:16}}>🔗</div>
        <h2 style={{fontFamily:'Georgia,serif',fontSize:24,color:'#2C1A0E',marginBottom:10}}>{t.invalidLink}</h2>
        <p style={{fontSize:14,color:'#8C6B4E',lineHeight:1.7}}>{t.invalidLinkDesc}</p>
      </div>
    </div>
  );

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap');
        @keyframes j-up { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes j-spin{ to{transform:rotate(360deg)} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      {/* Background orbs */}
      <div style={{position:'fixed',inset:0,background:'linear-gradient(155deg,#160C04 0%,#2D1A0B 55%,#160C04 100%)',zIndex:0}}/>
      <div style={{position:'fixed',top:'-20%',right:'-10%',width:500,height:500,borderRadius:'50%',background:'radial-gradient(circle,rgba(196,114,74,.09),transparent)',filter:'blur(60px)',zIndex:0,pointerEvents:'none'}}/>

      {/* Card */}
      <div style={{...styles.card, animation:'j-up .7s cubic-bezier(.22,.68,0,1.2) both'}}>
        {/* Space avatar */}
        <div style={{marginBottom:24,animation:'j-up .5s .1s both'}}>
          {space.cartoon_url
            ? <img src={space.cartoon_url} alt="" style={{width:90,height:90,borderRadius:'50%',objectFit:'cover',border:'3px solid rgba(196,114,74,.35)',display:'block',margin:'0 auto',boxShadow:'0 8px 28px rgba(0,0,0,.35)'}}/>
            : <div style={{width:90,height:90,borderRadius:'50%',background:'rgba(196,114,74,.18)',border:'3px solid rgba(196,114,74,.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:40,margin:'0 auto',boxShadow:'0 8px 28px rgba(0,0,0,.3)'}}>{space.cover_emoji}</div>}
        </div>

        {/* Heading */}
        <div style={{animation:'j-up .5s .18s both',textAlign:'center',marginBottom:28}}>
          <div style={{fontSize:9,letterSpacing:4,textTransform:'uppercase',color:'rgba(196,114,74,.6)',marginBottom:10}}>
            {t.youreInvitedTo}
          </div>
          <h1 style={{fontFamily:'Lora,Georgia,serif',fontSize:'clamp(22px,5vw,32px)',fontWeight:600,color:'rgba(250,247,242,.95)',lineHeight:1.2,marginBottom:10}}>
            {space.name}
          </h1>
          <p style={{fontSize:13.5,color:'rgba(250,247,242,.38)',lineHeight:1.75,maxWidth:320,margin:'0 auto'}}>
            {t.joinDesc}
          </p>
        </div>

        {/* Surprise note */}
        <div style={{animation:'j-up .5s .25s both',background:'rgba(196,114,74,.1)',border:'1px solid rgba(196,114,74,.2)',borderRadius:12,padding:'12px 16px',marginBottom:24,textAlign:'center'}}>
          <span style={{fontSize:13,color:'rgba(196,114,74,.9)',lineHeight:1.6}}>
            {t.surpriseNote}
          </span>
        </div>

        {/* Name input */}
        <div style={{animation:'j-up .5s .32s both'}}>
          <label style={{display:'block',fontSize:9,letterSpacing:3,textTransform:'uppercase',color:'rgba(250,247,242,.35)',marginBottom:8,fontFamily:'Plus Jakarta Sans,sans-serif',fontWeight:600}}>
            {t.whatShouldWeCallYou}
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && join()}
            placeholder={t.namePlaceholder}
            autoFocus
            style={{
              width:'100%', padding:'13px 16px',
              background:'rgba(255,255,255,.07)',
              border:'1.5px solid rgba(255,255,255,.12)',
              borderRadius:10, color:'rgba(250,247,242,.9)',
              fontFamily:'Lora,Georgia,serif', fontSize:16,
              fontStyle:'italic', outline:'none', marginBottom:12,
              transition:'border-color .2s',
            }}
            onFocus={e => e.target.style.borderColor='rgba(196,114,74,.6)'}
            onBlur={e => e.target.style.borderColor='rgba(255,255,255,.12)'}
          />
          {error && <div style={{fontSize:12.5,color:'#E88080',marginBottom:10,padding:'8px 12px',background:'rgba(200,80,80,.1)',borderRadius:8}}>{error}</div>}
          <button
            onClick={join}
            disabled={joining || !name.trim()}
            style={{
              width:'100%', padding:'14px',
              background: joining || !name.trim() ? 'rgba(196,114,74,.35)' : 'rgba(196,114,74,.9)',
              color:'white', border:'none', borderRadius:10,
              fontFamily:'Plus Jakarta Sans,sans-serif', fontSize:13.5,
              fontWeight:600, letterSpacing:.8, cursor: joining||!name.trim()?'not-allowed':'pointer',
              transition:'all .25s', boxShadow: name.trim()&&!joining?'0 6px 24px rgba(196,114,74,.4)':'none',
            }}
          >
            {joining ? t.joining : t.joinAs(name.trim() || '…')}
          </button>
        </div>

        <p style={{fontSize:11,color:'rgba(250,247,242,.2)',textAlign:'center',marginTop:18,lineHeight:1.6,animation:'j-up .5s .4s both'}}>
          {t.noAccountNeeded}
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', padding: '24px', position: 'relative', zIndex: 1,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  card: {
    background: 'rgba(255,255,255,.04)',
    border: '1px solid rgba(255,255,255,.09)',
    borderRadius: 24, padding: '40px 36px',
    width: '100%', maxWidth: 420,
    backdropFilter: 'blur(20px)',
    position: 'relative', zIndex: 1,
  },
  center: {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: '#1A0F06',
  },
  spinner: {
    width: 36, height: 36, borderRadius: '50%',
    border: '3px solid rgba(196,114,74,.2)',
    borderTopColor: 'rgba(196,114,74,.8)',
    animation: 'j-spin 1s linear infinite',
  },
};