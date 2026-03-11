// app/contribute/[token]/page.js
'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import StoryReader from '../../dashboard/StoryReader';

export default function ContributePage() {
  const { token } = useParams();
  const router = useRouter();

  const [contributor, setContributor] = useState(null); // { name, contributorId, spaceId, spaceName }
  const [space, setSpace]             = useState(null);
  const [myMemories, setMyMemories]   = useState([]);
  const [totalCount, setTotalCount]   = useState(0);
  const [story, setStory]             = useState([]);
  const [showStory, setShowStory]     = useState(false);
  const [showAddMem, setShowAddMem]   = useState(false);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [generating, setGenerating]   = useState(false);
  const [error, setError]             = useState('');

  const [memText,   setMemText]   = useState('');
  const [memDate,   setMemDate]   = useState('');
  const [memPhoto,  setMemPhoto]  = useState(null);
  const [memPreview,setMemPrev]   = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem(`hemsaga_contributor_${token}`);
    if (!saved) { router.push(`/join/${token}`); return; }
    const c = JSON.parse(saved);
    setContributor(c);
    loadAll(c);
  }, [token]);

  const loadAll = async (c) => {
    try {
      // Load space info
      const sr = await fetch(`/api/spaces/invite?token=${token}`);
      const sd = await sr.json();
      if (sd.space) setSpace(sd.space);

      // Load MY memories only
      const mr = await fetch(`/api/memories?spaceId=${c.spaceId}&contributorId=${c.contributorId}`);
      const md = await mr.json();
      setMyMemories(md.memories || []);
      setTotalCount(md.totalCount || 0);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const saveMemory = async () => {
    if (!memText.trim() || !contributor) return;
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spaceId: contributor.spaceId,
          contributorId: contributor.contributorId,
          author: contributor.name,
          content: memText,
          memory_date: memDate || new Date().toISOString().split('T')[0],
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setSaving(false); return; }
      setMyMemories(prev => [data.memory, ...prev]);
      setTotalCount(prev => prev + 1);
      setMemText(''); setMemDate(''); setShowAddMem(false);
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const readStory = async () => {
    if (!contributor) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/generate-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spaceId: contributor.spaceId, regenerate: false }),
      });
      const data = await res.json();
      if (data.chapters?.length) { setStory(data.chapters); setShowStory(true); }
    } catch (e) { console.error(e); }
    setGenerating(false);
  };

  const othersCount = totalCount - myMemories.length;
  const fmtShort = (d) => new Date(d).toLocaleDateString('en-SE', { day:'numeric', month:'short' });

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#FAF7F2'}}>
      <div style={{width:32,height:32,borderRadius:'50%',border:'3px solid rgba(196,114,74,.2)',borderTopColor:'rgba(196,114,74,.8)',animation:'spin 1s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const spaceName = space?.name || contributor?.spaceName || 'Our Story';
  const spaceEmoji = space?.cover_emoji || '📖';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap');
        *,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
        body{background:#FAF7F2;font-family:'Plus Jakarta Sans',sans-serif;-webkit-font-smoothing:antialiased;}
        @keyframes spin  {to{transform:rotate(360deg)}}
        @keyframes c-up  {from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes c-in  {from{opacity:0}to{opacity:1}}
        @keyframes c-pop {0%{transform:scale(.96);opacity:0}60%{transform:scale(1.02)}100%{transform:scale(1);opacity:1}}
        @keyframes c-shim{0%{transform:translateX(-100%) skewX(-12deg)}100%{transform:translateX(250%) skewX(-12deg)}}
        .c-stagger>*{opacity:0;animation:c-up .4s cubic-bezier(.22,.68,0,1.2) forwards;}
        .c-stagger>*:nth-child(1){animation-delay:.05s}.c-stagger>*:nth-child(2){animation-delay:.12s}
        .c-stagger>*:nth-child(3){animation-delay:.19s}.c-stagger>*:nth-child(4){animation-delay:.26s}
        .c-stagger>*:nth-child(5){animation-delay:.33s}
      `}</style>

      {/* ── TOP BAR ── */}
      <header style={{
        height:56, background:'rgba(250,247,242,.94)', backdropFilter:'blur(20px)',
        borderBottom:'1px solid rgba(44,26,14,.07)', padding:'0 20px',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        position:'sticky', top:0, zIndex:100,
      }}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:20}}>{spaceEmoji}</span>
          <span style={{fontFamily:'Lora,Georgia,serif',fontSize:15,fontWeight:600,color:'#2C1A0E'}}>{spaceName}</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{fontSize:11,color:'#8C6B4E',background:'rgba(196,114,74,.08)',padding:'4px 10px',borderRadius:20}}>
            👤 {contributor?.name}
          </div>
        </div>
      </header>

      {/* ── CONTENT ── */}
      <div style={{maxWidth:560,margin:'0 auto',padding:'28px 20px 100px'}} className="c-stagger">

        {/* Hero — generate story */}
        <button onClick={readStory} disabled={generating||totalCount===0} style={{
          width:'100%', padding:'32px 28px', marginBottom:20,
          background:'linear-gradient(135deg,#2C1A0E,#4A2A16)',
          border:'none', borderRadius:16, cursor: totalCount===0?'not-allowed':'pointer',
          textAlign:'left', position:'relative', overflow:'hidden',
          boxShadow:'0 8px 32px rgba(44,26,14,.2)', transition:'transform .25s,box-shadow .25s',
          opacity: totalCount===0 ? .6 : 1,
        }}
          onMouseOver={e=>{if(totalCount>0){e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 14px 42px rgba(44,26,14,.3)';}}}
          onMouseOut={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='0 8px 32px rgba(44,26,14,.2)';}}
        >
          <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse 70% 80% at 75% 20%,rgba(196,114,74,.2),transparent 55%)',pointerEvents:'none'}}/>
          {space?.cartoon_url && (
            <img src={space.cartoon_url} alt="" style={{position:'absolute',right:24,top:'50%',transform:'translateY(-50%)',width:64,height:64,borderRadius:'50%',objectFit:'cover',border:'2px solid rgba(255,255,255,.12)',opacity:.9}}/>
          )}
          <div style={{fontSize:9,letterSpacing:3.5,textTransform:'uppercase',color:'rgba(196,114,74,.65)',marginBottom:8,position:'relative',zIndex:1}}>
            The Story · {totalCount} memories from the family
          </div>
          {generating
            ? <div style={{display:'flex',alignItems:'center',gap:10,position:'relative',zIndex:1}}><div style={{width:16,height:16,borderRadius:'50%',border:'2px solid rgba(250,247,242,.2)',borderTopColor:'rgba(250,247,242,.8)',animation:'spin .8s linear infinite'}}/><span style={{fontFamily:'Lora,Georgia,serif',fontSize:20,color:'rgba(250,247,242,.9)'}}>Writing the story…</span></div>
            : <><div style={{fontFamily:'Lora,Georgia,serif',fontSize:'clamp(18px,4vw,24px)',fontWeight:600,color:'rgba(250,247,242,.95)',marginBottom:6,position:'relative',zIndex:1}}>Read <em style={{fontStyle:'italic',color:'#E8956A'}}>{spaceName}</em></div>
                <div style={{fontSize:12.5,color:'rgba(250,247,242,.38)',position:'relative',zIndex:1,lineHeight:1.6}}>{totalCount===0?'Add memories first — then read the story together.':'AI weaves all contributions into one story. Tap to read.'}</div>
                {totalCount>0&&<div style={{display:'inline-flex',alignItems:'center',gap:8,marginTop:16,background:'rgba(255,255,255,.09)',border:'1px solid rgba(255,255,255,.13)',borderRadius:40,padding:'8px 18px',fontFamily:'Plus Jakarta Sans,sans-serif',fontSize:12,color:'rgba(250,247,242,.8)',position:'relative',zIndex:1}}>Read the story <span>→</span></div>}</>}
        </button>

        {/* Curiosity counter */}
        {othersCount > 0 && (
          <div style={{
            background:'rgba(196,114,74,.07)', border:'1px solid rgba(196,114,74,.15)',
            borderRadius:12, padding:'12px 16px', marginBottom:20,
            display:'flex', alignItems:'center', gap:12,
          }}>
            <span style={{fontSize:20}}>🤫</span>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:'#2C1A0E'}}>
                {othersCount} {othersCount===1?'memory':'memories'} from others — hidden until the story is told
              </div>
              <div style={{fontSize:11.5,color:'#8C6B4E',marginTop:2}}>Read the story above to see what everyone contributed</div>
            </div>
          </div>
        )}

        {/* Add memory CTA */}
        <button onClick={()=>setShowAddMem(true)} style={{
          width:'100%', padding:'18px 20px', marginBottom:24,
          background:'#fff', border:'1.5px solid #EAE0D3', borderRadius:14,
          cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:14,
          transition:'all .22s', boxShadow:'0 2px 8px rgba(44,26,14,.06)',
        }}
          onMouseOver={e=>{e.currentTarget.style.borderColor='#C4724A';e.currentTarget.style.boxShadow='0 6px 20px rgba(196,114,74,.12)';}}
          onMouseOut={e=>{e.currentTarget.style.borderColor='#EAE0D3';e.currentTarget.style.boxShadow='0 2px 8px rgba(44,26,14,.06)';}}
        >
          <div style={{width:44,height:44,borderRadius:12,background:'rgba(196,114,74,.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>✍️</div>
          <div>
            <div style={{fontFamily:'Lora,Georgia,serif',fontSize:16,fontWeight:600,color:'#2C1A0E',marginBottom:3}}>Add a memory</div>
            <div style={{fontSize:12.5,color:'#8C6B4E',lineHeight:1.5}}>Your contribution is private until the story is told</div>
          </div>
          <span style={{marginLeft:'auto',color:'#C4724A',fontSize:18}}>→</span>
        </button>

        {/* My memories */}
        <div style={{marginBottom:12,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{fontSize:9.5,letterSpacing:3,textTransform:'uppercase',color:'#C4724A',fontWeight:600,display:'flex',alignItems:'center',gap:8}}>
            <span style={{width:18,height:1.5,background:'#C4724A',display:'inline-block',borderRadius:2}}/>
            My Memories · {myMemories.length}
          </div>
        </div>

        {myMemories.length === 0
          ? <div style={{textAlign:'center',padding:'40px 24px',border:'1.5px dashed #E8DDD0',borderRadius:14,background:'linear-gradient(135deg,#fff,#FAF7F2)'}}>
              <div style={{fontSize:36,marginBottom:12,opacity:.5}}>🌸</div>
              <div style={{fontFamily:'Lora,Georgia,serif',fontSize:18,fontWeight:500,color:'#2C1A0E',marginBottom:6}}>Your first memory is waiting</div>
              <div style={{fontSize:13,color:'#B89980',lineHeight:1.7}}>Whatever you share becomes part of the story.</div>
            </div>
          : <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {myMemories.map(m => (
                <div key={m.id} style={{display:'flex',background:'#fff',border:'1px solid #EAE0D3',borderRadius:14,overflow:'hidden',transition:'all .2s'}}
                  onMouseOver={e=>e.currentTarget.style.transform='translateX(3px)'}
                  onMouseOut={e=>e.currentTarget.style.transform='none'}>
                  <div style={{width:4,flexShrink:0,background:'linear-gradient(180deg,#C4724A,#D4A5A0)'}}/>
                  <div style={{flex:1,padding:'14px 18px'}}>
                    <div style={{fontSize:11,color:'#B89980',marginBottom:6}}>{fmtShort(m.memory_date)}</div>
                    <div style={{fontFamily:'Lora,Georgia,serif',fontSize:15,fontStyle:'italic',color:'#5C3D24',lineHeight:1.8}}>{m.content}</div>
                  </div>
                  {m.photo_url&&<img src={m.photo_url} alt="" style={{width:80,objectFit:'cover',flexShrink:0}}/>}
                </div>
              ))}
            </div>}
      </div>

      {/* ── ADD MEMORY MODAL ── */}
      {showAddMem && (
        <div style={{position:'fixed',inset:0,background:'rgba(44,26,14,.45)',backdropFilter:'blur(12px)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:1000,padding:'0',animation:'c-in .2s ease'}}
          onClick={()=>setShowAddMem(false)}>
          <div style={{background:'#fff',borderRadius:'20px 20px 0 0',padding:0,width:'100%',maxWidth:560,maxHeight:'90vh',overflowY:'auto',animation:'c-up .3s cubic-bezier(.22,.68,0,1.2) both',boxShadow:'0 -20px 60px rgba(44,26,14,.15)'}}
            onClick={e=>e.stopPropagation()}>
            {/* Bar */}
            <div style={{height:3,background:'linear-gradient(90deg,#C4724A,#D4A5A0)',borderRadius:'3px 3px 0 0'}}/>
            <div style={{padding:'24px 24px 0'}}>
              <div style={{width:36,height:4,borderRadius:4,background:'#EAE0D3',margin:'0 auto 20px'}}/>
              <h2 style={{fontFamily:'Lora,Georgia,serif',fontSize:22,fontWeight:600,color:'#2C1A0E',marginBottom:4}}>
                Add a <em style={{fontStyle:'italic',color:'#C4724A'}}>memory</em>
              </h2>
              <p style={{fontSize:12.5,color:'#8C6B4E',marginBottom:20,lineHeight:1.6}}>Only you can see this until the story is generated.</p>
            </div>
            <div style={{padding:'0 24px 32px'}}>
              {error&&<div style={{background:'rgba(196,50,50,.07)',border:'1px solid rgba(196,50,50,.2)',borderRadius:8,padding:'10px 14px',fontSize:12.5,color:'#b03030',marginBottom:14}}>{error}</div>}
              <label style={{display:'block',fontSize:9.5,letterSpacing:2.5,textTransform:'uppercase',color:'#8C6B4E',fontWeight:600,marginBottom:7}}>When?</label>
              <input type="date" value={memDate||new Date().toISOString().split('T')[0]} max={new Date().toISOString().split('T')[0]} onChange={e=>setMemDate(e.target.value)}
                style={{width:'100%',padding:'11px 14px',background:'#FAF7F2',border:'1.5px solid #EAE0D3',borderRadius:9,fontFamily:'Plus Jakarta Sans,sans-serif',fontSize:13.5,color:'#2C1A0E',outline:'none',marginBottom:16}}/>
              <label style={{display:'block',fontSize:9.5,letterSpacing:2.5,textTransform:'uppercase',color:'#8C6B4E',fontWeight:600,marginBottom:7}}>What happened?</label>
              <textarea value={memText} onChange={e=>setMemText(e.target.value)} placeholder="Describe the moment in your own words…"
                style={{width:'100%',padding:'12px 14px',background:'#FAF7F2',border:'1.5px solid #EAE0D3',borderRadius:9,fontFamily:'Lora,Georgia,serif',fontStyle:'italic',fontSize:16,color:'#2C1A0E',outline:'none',resize:'none',minHeight:130,lineHeight:1.75,marginBottom:16}}
                onFocus={e=>{e.target.style.borderColor='#C4724A';e.target.style.background='#fff';}}
                onBlur={e=>{e.target.style.borderColor='#EAE0D3';e.target.style.background='#FAF7F2';}}
              />
              <div style={{display:'flex',gap:10}}>
                <button onClick={saveMemory} disabled={saving||!memText.trim()} style={{flex:1,padding:'13px',background:saving||!memText.trim()?'rgba(44,26,14,.3)':'#2C1A0E',color:'rgba(250,247,242,.95)',border:'none',borderRadius:10,fontFamily:'Plus Jakarta Sans,sans-serif',fontSize:12,fontWeight:600,letterSpacing:.8,textTransform:'uppercase',cursor:saving||!memText.trim()?'not-allowed':'pointer',transition:'background .25s'}}>
                  {saving?'Saving…':'Save Memory →'}
                </button>
                <button onClick={()=>{setShowAddMem(false);setError('');}} style={{padding:'13px 18px',background:'transparent',border:'1.5px solid #EAE0D3',borderRadius:10,fontFamily:'Plus Jakarta Sans,sans-serif',fontSize:13,color:'#8C6B4E',cursor:'pointer'}}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Story Reader */}
      {showStory && story?.length > 0 && (
        <StoryReader
          chapters={story}
          spaceName={spaceName}
          spaceEmoji={spaceEmoji}
          avatarUrl={space?.cartoon_url}
          onClose={()=>setShowStory(false)}
          onRegenerate={null}
        />
      )}

      {/* Floating add button (mobile) */}
      <button onClick={()=>setShowAddMem(true)} style={{
        position:'fixed', bottom:24, right:20, width:56, height:56,
        borderRadius:'50%', background:'#2C1A0E', color:'white',
        border:'none', fontSize:24, cursor:'pointer', zIndex:200,
        boxShadow:'0 6px 24px rgba(44,26,14,.35)', display:'flex',
        alignItems:'center', justifyContent:'center',
        transition:'all .2s',
      }}
        onMouseOver={e=>{e.currentTarget.style.background='#C4724A';e.currentTarget.style.transform='scale(1.08)';}}
        onMouseOut={e=>{e.currentTarget.style.background='#2C1A0E';e.currentTarget.style.transform='scale(1)';}}
      >
        ✦
      </button>
    </>
  );
}