'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

/*
  StoryReader — Apple Books–inspired
  Desktop : open book two-page spread, hover margins to reveal turn arrows
  Mobile  : single full-screen page, swipe left/right to turn
  Cover   : dark cinematic
  Pages   : warm parchment, serif, justified, book-like
*/
export default function StoryReader({ chapters = [], spaceName, spaceEmoji = '📖', avatarUrl, onClose, onRegenerate }) {
  const [page, setPage]         = useState(-1);   // -1=cover, 0..n-1=chapters, n=end
  const [turning, setTurning]   = useState(false);
  const [direction, setDir]     = useState(1);
  const [isMobile, setMobile]   = useState(false);
  const [showUI, setShowUI]     = useState(true);
  /** Touch start X — ref avoids stale closure in onTouchEnd (React state would lag). */
  const touchStartXRef = useRef(null);
  const hideRef = useRef(null);
  const total = chapters.length;

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check(); window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const fn = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') turn(1);
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')  turn(-1);
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [page, turning]);

  useEffect(() => { if (page >= 0) bump(); }, [page]);

  const bump = () => {
    setShowUI(true);
    clearTimeout(hideRef.current);
    hideRef.current = setTimeout(() => setShowUI(false), 3500);
  };

  const turn = useCallback((dir) => {
    if (turning) return;
    const next = page + dir;
    if (next < -1 || next > total) return;
    setDir(dir); setTurning(true);
    setTimeout(() => { setPage(next); setTurning(false); }, 300);
  }, [page, turning, total]);

  const jumpTo = (i) => {
    if (turning) return;
    setDir(i >= page ? 1 : -1); setTurning(true);
    setTimeout(() => { setPage(i); setTurning(false); }, 300);
  };

  const onTS = (e) => { touchStartXRef.current = e.touches[0].clientX; };
  const onTE = (e) => {
    const x0 = touchStartXRef.current;
    touchStartXRef.current = null;
    if (x0 === null) return;
    const dx = x0 - e.changedTouches[0].clientX;
    if (Math.abs(dx) > 44) turn(dx > 0 ? 1 : -1);
  };

  const ch = (page >= 0 && page < total) ? chapters[page] : null;
  const progress = ((page + 1) / total) * 100;

  const paras = (text = '') =>
    text.split(/\n+/).filter(p => p.trim()).map((p, i) => (
      <p key={i} style={{ margin:'0 0 1.2em', textIndent: i === 0 ? 0 : '1.8em', lineHeight:1.95 }}>{p}</p>
    ));

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;1,400;1,600&family=Plus+Jakarta+Sans:wght@300;400;500&display=swap');
    @keyframes sr-fadein  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
    @keyframes sr-breathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
    @keyframes sr-glow    { 0%,100%{box-shadow:0 0 28px rgba(196,114,74,.18),0 0 0 3px rgba(196,114,74,.12)} 50%{box-shadow:0 0 56px rgba(196,114,74,.4),0 0 0 3px rgba(196,114,74,.3)} }
    @keyframes sr-fwd     { from{opacity:0;transform:translateX(32px) scale(.98)} to{opacity:1;transform:none} }
    @keyframes sr-bwd     { from{opacity:0;transform:translateX(-32px) scale(.98)} to{opacity:1;transform:none} }
    @keyframes sr-flip-fwd{ 0%{transform:perspective(1200px) rotateY(0);opacity:1} 100%{transform:perspective(1200px) rotateY(-12deg) translateX(-2%);opacity:0} }
    @keyframes sr-flip-in { 0%{transform:perspective(1200px) rotateY(8deg) translateX(2%);opacity:0} 100%{transform:perspective(1200px) rotateY(0);opacity:1} }
    .sr-page-anim-fwd { animation: sr-fwd .3s cubic-bezier(.22,.68,0,1.2) both; }
    .sr-page-anim-bwd { animation: sr-bwd .3s cubic-bezier(.22,.68,0,1.2) both; }
    .sr-desk-anim-fwd { animation: sr-flip-in .32s cubic-bezier(.22,.68,0,1.2) both; }
    .sr-desk-anim-bwd { animation: sr-bwd .32s cubic-bezier(.22,.68,0,1.2) both; }
  `;

  /* ─── COVER ─── */
  if (page < 0) return (
    <div style={{ position:'fixed',inset:0,zIndex:1000,background:'linear-gradient(155deg,#160C04 0%,#2D1A0B 55%,#160C04 100%)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:"'Lora',Georgia,serif" }}
      onTouchStart={onTS} onTouchEnd={onTE}>
      <style>{CSS}</style>
      {[[{top:'-20%',right:'-12%',w:500,c:'rgba(196,114,74,.07)'},{bottom:'-18%',left:'-10%',w:420,c:'rgba(196,114,74,.05)'}]].flat().map((o,i)=>(
        <div key={i} style={{position:'absolute',...o,height:o.w,borderRadius:'50%',background:`radial-gradient(circle,${o.c},transparent)`,filter:'blur(50px)',pointerEvents:'none'}}/>
      ))}
      <button onClick={onClose} style={{position:'absolute',top:18,right:18,background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.12)',borderRadius:'50%',width:38,height:38,color:'rgba(250,247,242,.6)',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
      <div style={{animation:'sr-breathe 4s ease-in-out infinite',marginBottom:26}}>
        <div style={{width:106,height:106,borderRadius:'50%',overflow:'hidden',animation:'sr-glow 4.5s ease-in-out infinite',background:'rgba(196,114,74,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:44}}>
          {avatarUrl ? <img src={avatarUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : spaceEmoji}
        </div>
      </div>
      <div style={{textAlign:'center',animation:'sr-fadein .9s ease both',maxWidth:500,padding:'0 32px'}}>
        <div style={{fontSize:10,letterSpacing:4,textTransform:'uppercase',color:'rgba(196,114,74,.55)',marginBottom:14}}>A Story by Hemsaga</div>
        <h1 style={{fontSize:'clamp(26px,6vw,46px)',fontWeight:600,color:'rgba(250,247,242,.95)',margin:'0 0 10px',lineHeight:1.2}}>{spaceName}</h1>
        <p style={{fontSize:13.5,color:'rgba(250,247,242,.32)',margin:'0 0 38px',fontStyle:'italic'}}>{total} {total===1?'chapter':'chapters'} · A living story</p>
        <button onClick={()=>turn(1)} style={{background:'rgba(196,114,74,.88)',color:'white',border:'none',borderRadius:40,padding:'13px 34px',fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:14,fontWeight:500,letterSpacing:.8,cursor:'pointer',boxShadow:'0 8px 30px rgba(196,114,74,.38)'}}>
          Begin Reading →
        </button>
      </div>
      {total>1&&<div style={{position:'absolute',bottom:26,display:'flex',gap:6}}>
        {chapters.map((_,i)=><div key={i} style={{width:6,height:6,borderRadius:'50%',background:`rgba(196,114,74,${i === 0 ? 0.7 : 0.2})`}}/>)}
      </div>}
    </div>
  );

  /* ─── END PAGE ─── */
  if (page >= total) return (
    <div style={{position:'fixed',inset:0,zIndex:1000,background:'linear-gradient(155deg,#160C04,#2D1A0B)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:"'Lora',Georgia,serif"}}
      onTouchStart={onTS} onTouchEnd={onTE}>
      <style>{CSS}</style>
      <div style={{textAlign:'center',animation:'sr-fadein .9s ease both',padding:'0 32px',maxWidth:460}}>
        <div style={{fontSize:44,marginBottom:18}}>🌸</div>
        <h2 style={{fontSize:'clamp(20px,4vw,30px)',fontWeight:400,color:'rgba(250,247,242,.88)',margin:'0 0 12px',fontStyle:'italic'}}>The story continues…</h2>
        <p style={{fontSize:13.5,color:'rgba(250,247,242,.32)',margin:'0 0 34px',lineHeight:1.75}}>Every new memory adds another page. Come back as the story grows.</p>
        <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
          <button onClick={()=>setPage(-1)} style={{background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.13)',borderRadius:40,padding:'10px 22px',color:'rgba(250,247,242,.65)',fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:13,cursor:'pointer'}}>← Read Again</button>
          {onRegenerate&&<button onClick={onRegenerate} style={{background:'rgba(196,114,74,.88)',border:'none',borderRadius:40,padding:'10px 22px',color:'white',fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:13,fontWeight:500,cursor:'pointer'}}>✦ Add Chapter</button>}
          <button onClick={onClose} style={{background:'transparent',border:'1px solid rgba(255,255,255,.1)',borderRadius:40,padding:'10px 22px',color:'rgba(250,247,242,.35)',fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:13,cursor:'pointer'}}>Close</button>
        </div>
      </div>
      <button onClick={()=>turn(-1)} style={{position:'absolute',bottom:24,left:'50%',transform:'translateX(-50%)',background:'none',border:'none',color:'rgba(250,247,242,.22)',fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:12,cursor:'pointer'}}>← Previous chapter</button>
    </div>
  );

  /* ─── MOBILE SINGLE PAGE ─── */
  if (isMobile) return (
    <div style={{position:'fixed',inset:0,zIndex:1000,background:'#FDF8EE',display:'flex',flexDirection:'column',fontFamily:"'Lora',Georgia,serif",color:'#2C1A0E'}}
      onTouchStart={onTS} onTouchEnd={onTE}>
      <style>{CSS}</style>
      {/* Progress */}
      <div style={{height:3,background:'rgba(196,114,74,.12)',flexShrink:0}}>
        <div style={{height:'100%',width:`${progress}%`,background:'rgba(196,114,74,.55)',transition:'width .4s'}}/>
      </div>
      {/* Header */}
      <div style={{padding:'14px 20px 0',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
        <span style={{fontSize:9,letterSpacing:3,textTransform:'uppercase',color:'rgba(196,114,74,.55)'}}>{spaceEmoji} {spaceName}</span>
        <button onClick={onClose} style={{background:'rgba(44,26,14,.07)',border:'none',borderRadius:'50%',width:32,height:32,color:'#8C6B4E',fontSize:15,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
      </div>
      {/* Page content */}
      <div className={turning ? (direction>0?'sr-page-anim-fwd':'sr-page-anim-bwd') : ''} style={{flex:1,overflowY:'auto',padding:'24px 26px 20px'}}>
        <div style={{textAlign:'center',marginBottom:24}}>
          <div style={{fontSize:9,letterSpacing:3,textTransform:'uppercase',color:'rgba(196,114,74,.55)',marginBottom:7}}>Chapter {ch.chapter_number}</div>
          <h2 style={{fontSize:19,fontWeight:600,color:'#2C1A0E',margin:0,lineHeight:1.3}}>{ch.title}</h2>
          <div style={{width:32,height:1.5,background:'rgba(196,114,74,.5)',margin:'11px auto 0',borderRadius:2}}/>
        </div>
        <div style={{textAlign:'justify',fontSize:16}}>{paras(ch.content)}</div>
      </div>
      {/* Bottom nav */}
      <div style={{flexShrink:0,borderTop:'1px solid rgba(196,114,74,.1)',background:'#FDF8EE',padding:'10px 28px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <button onClick={()=>turn(-1)} disabled={page<=0} style={{background:'none',border:'none',color:page<=0?'transparent':'#C4724A',fontSize:22,cursor:'pointer',padding:6}}>←</button>
        <div style={{display:'flex',gap:5}}>
          {chapters.map((_,i)=>(
            <div key={i} onClick={()=>jumpTo(i)} style={{width:i===page?20:6,height:6,borderRadius:3,background:i===page?'rgba(196,114,74,.8)':'rgba(196,114,74,.2)',cursor:'pointer',transition:'all .3s'}}/>
          ))}
        </div>
        <button onClick={()=>turn(1)} style={{background:'none',border:'none',color:'#C4724A',fontSize:22,cursor:'pointer',padding:6}}>{page>=total-1?'✓':'→'}</button>
      </div>
    </div>
  );

  /* ─── DESKTOP BOOK SPREAD ─── */
  return (
    <div style={{position:'fixed',inset:0,zIndex:1000,background:'#26160A',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Lora',Georgia,serif"}}
      onMouseMove={bump}>
      <style>{CSS}</style>

      {/* Progress top */}
      <div style={{position:'fixed',top:0,left:0,right:0,height:2.5,background:'rgba(196,114,74,.1)',zIndex:10}}>
        <div style={{height:'100%',width:`${progress}%`,background:'rgba(196,114,74,.55)',transition:'width .5s ease'}}/>
      </div>

      {/* Book */}
      <div className={turning?(direction>0?'sr-desk-anim-fwd':'sr-desk-anim-bwd'):''}
        style={{position:'relative',width:'min(1020px,94vw)',height:'min(700px,88vh)',display:'flex',borderRadius:4,overflow:'hidden',boxShadow:'0 48px 120px rgba(0,0,0,.7),0 0 0 1px rgba(196,114,74,.08)'}}>

        {/* LEFT — table of contents */}
        <div style={{width:'41%',background:'#F5EDD8',borderRight:'1px solid rgba(196,114,74,.14)',padding:'54px 42px 54px 50px',display:'flex',flexDirection:'column',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',right:0,top:0,bottom:0,width:20,background:'linear-gradient(to right,transparent,rgba(196,114,74,.06))',pointerEvents:'none'}}/>
          <div style={{marginBottom:30}}>
            <div style={{fontSize:9,letterSpacing:3,textTransform:'uppercase',color:'rgba(196,114,74,.55)',marginBottom:7}}>{spaceEmoji} {spaceName}</div>
            <div style={{width:28,height:1.5,background:'rgba(196,114,74,.4)',borderRadius:2}}/>
          </div>
          <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
            <div style={{fontSize:9,letterSpacing:2.5,textTransform:'uppercase',color:'#B89980',marginBottom:12}}>Contents</div>
            {chapters.map((c,i)=>(
              <div key={c.id} onClick={()=>jumpTo(i)} style={{display:'flex',alignItems:'baseline',gap:9,padding:'8px 0',borderBottom:'1px solid rgba(196,114,74,.08)',cursor:'pointer',opacity:i===page?1:.5,transition:'opacity .2s'}}>
                <span style={{fontSize:11,color:'rgba(196,114,74,.7)',fontWeight:600,minWidth:20}}>{c.chapter_number}</span>
                <span style={{fontSize:12.5,color:i===page?'#2C1A0E':'#6B4226',lineHeight:1.35,fontWeight:i===page?600:400}}>{c.title}</span>
              </div>
            ))}
          </div>
          <div style={{marginTop:'auto',paddingTop:24,fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:11,color:'rgba(196,114,74,.35)',letterSpacing:1}}>{(page+1)*2-1}</div>
        </div>

        {/* SPINE */}
        <div style={{width:14,flexShrink:0,background:'linear-gradient(to right,rgba(44,26,14,.2),rgba(196,114,74,.12),rgba(44,26,14,.15))',position:'relative',zIndex:2}}>
          <div style={{position:'absolute',inset:0,backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 4px,rgba(0,0,0,.025) 4px,rgba(0,0,0,.025) 5px)'}}/>
        </div>

        {/* RIGHT — chapter content */}
        <div style={{flex:1,background:'#FDF8EE',padding:'54px 50px 54px 42px',display:'flex',flexDirection:'column',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',left:0,top:0,bottom:0,width:20,background:'linear-gradient(to left,transparent,rgba(44,26,14,.04))',pointerEvents:'none'}}/>
          <div style={{textAlign:'center',marginBottom:30,flexShrink:0}}>
            <div style={{fontSize:9,letterSpacing:3.5,textTransform:'uppercase',color:'rgba(196,114,74,.5)',marginBottom:8}}>Chapter {ch.chapter_number}</div>
            <h2 style={{fontSize:21,fontWeight:600,color:'#2C1A0E',margin:0,lineHeight:1.3}}>{ch.title}</h2>
            <div style={{width:36,height:1.5,background:'rgba(196,114,74,.45)',margin:'13px auto 0',borderRadius:2}}/>
          </div>
          <div style={{flex:1,overflowY:'auto',textAlign:'justify',fontSize:15}}>{paras(ch.content)}</div>
          <div style={{marginTop:20,fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:11,color:'rgba(196,114,74,.35)',letterSpacing:1,textAlign:'right',flexShrink:0}}>{(page+1)*2}</div>
        </div>

        {/* Left turn zone */}
        <div onClick={()=>turn(-1)} style={{position:'absolute',left:0,top:0,width:'10%',bottom:0,cursor:page>0?'w-resize':'default',zIndex:5,display:'flex',alignItems:'center',justifyContent:'flex-start',paddingLeft:10,opacity:0,transition:'opacity .25s'}}
          onMouseOver={e=>{if(page>0)e.currentTarget.style.opacity=1}}
          onMouseOut={e=>e.currentTarget.style.opacity=0}>
          {page>0&&<div style={{background:'rgba(44,26,14,.38)',borderRadius:'50%',width:34,height:34,display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(250,247,242,.8)',fontSize:15}}>←</div>}
        </div>

        {/* Right turn zone */}
        <div onClick={()=>turn(1)} style={{position:'absolute',right:0,top:0,width:'10%',bottom:0,cursor:'e-resize',zIndex:5,display:'flex',alignItems:'center',justifyContent:'flex-end',paddingRight:10,opacity:0,transition:'opacity .25s'}}
          onMouseOver={e=>e.currentTarget.style.opacity=1}
          onMouseOut={e=>e.currentTarget.style.opacity=0}>
          <div style={{background:'rgba(44,26,14,.38)',borderRadius:'50%',width:34,height:34,display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(250,247,242,.8)',fontSize:15}}>→</div>
        </div>
      </div>

      {/* Controls bar */}
      <div style={{position:'fixed',bottom:22,left:'50%',transform:'translateX(-50%)',display:'flex',alignItems:'center',gap:10,background:'rgba(22,12,4,.8)',backdropFilter:'blur(16px)',border:'1px solid rgba(196,114,74,.14)',borderRadius:40,padding:'9px 18px',transition:'opacity .4s',opacity:showUI?1:0,pointerEvents:showUI?'all':'none'}}>
        <button onClick={()=>{turn(-1);bump()}} disabled={page<=0} style={{background:'none',border:'none',color:page<=0?'rgba(250,247,242,.18)':'rgba(250,247,242,.65)',cursor:page<=0?'default':'pointer',fontSize:14,padding:3}}>←</button>
        {chapters.map((_,i)=>(
          <div key={i} onClick={()=>jumpTo(i)} style={{width:i===page?20:7,height:7,borderRadius:4,background:i===page?'rgba(196,114,74,.9)':'rgba(250,247,242,.2)',cursor:'pointer',transition:'all .3s'}}/>
        ))}
        <button onClick={()=>{turn(1);bump()}} style={{background:'none',border:'none',color:'rgba(250,247,242,.65)',cursor:'pointer',fontSize:14,padding:3}}>{page>=total-1?'✓':'→'}</button>
        <div style={{width:1,height:14,background:'rgba(250,247,242,.1)'}}/>
        <button onClick={onClose} style={{background:'none',border:'none',color:'rgba(250,247,242,.35)',cursor:'pointer',fontSize:11,fontFamily:"'Plus Jakarta Sans',sans-serif",padding:'1px 4px'}}>close</button>
      </div>
    </div>
  );
}