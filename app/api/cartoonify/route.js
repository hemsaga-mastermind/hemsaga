'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [child, setChild] = useState(null);
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    getUser();
  }, []);

  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth'); return; }
    setUser(user);
    await getChild(user.id);
    setLoading(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    if (hour >= 17 && hour < 21) return 'Good evening';
    return 'Good night';
  };

  const getChild = async (userId) => {
    const { data } = await supabase
      .from('children')
      .select('*')
      .eq('family_id', userId)
      .single();
    if (data) {
      setChild(data);
      if (data.cartoon_url) setChildCartoonUrl(data.cartoon_url);
      await getMemories(data.id);
    }
  };

  const getMemories = async (childId) => {
    const { data } = await supabase
      .from('memories')
      .select('*')
      .eq('child_id', childId)
      .order('created_at', { ascending: false });
    if (data) setMemories(data);
  };

  const generateStory = async (regenerate = false) => {
    if (memories.length === 0) {
      alert('Add some memories first!');
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch('/api/generate-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: String(child.id),
          childName: String(child.name),
          childAge: String(getAge(child.birthday)),
          regenerate: regenerate === true
        })
      });
      const data = await res.json();
      if (data.chapters) {
        setStory(data.chapters);
        setShowStory(true);
      }
    } catch (err) {
      console.error(err);
    }
    setGenerating(false);
  };

  const saveChild = async () => {
    setSaving(true);
    const { data } = await supabase
      .from('children')
      .insert([{ name: childName, birthday: childBirthday, family_id: user.id }])
      .select().single();
    if (data) { setChild(data); setShowAddChild(false); }
    setSaving(false);
  };

  const saveMemory = async () => {
    if (!memoryText.trim()) return;
    setSaving(true);

    let photoUrl = null;
    if (memoryPhoto) {
      const fileName = `${user.id}/${Date.now()}-${memoryPhoto.name.replace(/\s/g, '_')}`;
      const { error: uploadError } = await supabase.storage
        .from('memories')
        .upload(fileName, memoryPhoto);
      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('memories')
          .getPublicUrl(fileName);
        photoUrl = urlData.publicUrl;
      }
    }

    const { data } = await supabase
      .from('memories')
      .insert([{
        child_id: child.id,
        family_id: user.id,
        author: memoryAuthor || 'Papa',
        content: memoryText,
        memory_date: new Date().toISOString().split('T')[0],
        photo_url: photoUrl
      }])
      .select().single();

    if (data) {
      setMemories([data, ...memories]);
      setMemoryText('');
      setMemoryAuthor('Papa');
      setMemoryPhoto(null);
      setMemoryPhotoPreview(null);
      setShowAddMemory(false);
    }
    setSaving(false);
  };

  const generateInviteLink = async () => {
    const { data } = await supabase
      .from('family_invites')
      .insert([{ child_id: child.id, family_id: user.id }])
      .select()
      .single();
    if (data) {
      setInviteLink(`https://hemsaga.com/family/${data.token}`);
    }
  };

  const generateCartoon = async () => {
    if (!cartoonPhoto) {
      alert('Please upload a photo of ' + child.name + ' first!');
      return;
    }
    setCartoonizing(true);
    try {
      // Upload photo to Supabase Storage first
      const fileName = `${user.id}/avatar-${Date.now()}-${cartoonPhoto.name.replace(/\s/g, '_')}`;
      const { error: uploadError } = await supabase.storage
        .from('memories')
        .upload(fileName, cartoonPhoto);

      if (uploadError) {
        alert('Photo upload failed: ' + uploadError.message);
        setCartoonizing(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('memories')
        .getPublicUrl(fileName);
      const photoUrl = urlData.publicUrl;

      // Call cartoon API
      const res = await fetch('/api/cartoonify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: photoUrl,
          childName: String(child.name)
        })
      });

      const data = await res.json();

      if (data.cartoonUrl) {
        await supabase
          .from('children')
          .update({ cartoon_url: data.cartoonUrl })
          .eq('id', child.id);
        setChildCartoonUrl(data.cartoonUrl);
        setChild(prev => ({ ...prev, cartoon_url: data.cartoonUrl }));
        setShowCartoonModal(false);
        setCartoonPhoto(null);
        setCartoonPhotoPreview(null);
      } else {
        alert('Cartoon generation failed: ' + (data.error || 'Unknown error. Check Replicate API key in Vercel.'));
      }
    } catch (err) {
      console.error(err);
      alert('Something went wrong. Check your Replicate API key in Vercel env vars.');
    }
    setCartoonizing(false);
  };

  const getAge = (birthday) => {
    const birth = new Date(birthday);
    const now = new Date();
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    if (months < 12) return `${months} months old`;
    const years = Math.floor(months / 12);
    return `${years} year${years > 1 ? 's' : ''} old`;
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-SE', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF7F2', fontFamily: 'Cormorant Garamond, serif', fontSize: '24px', color: '#B07D5B' }}>
      Loading your family story...
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400&family=Jost:wght@300;400;500&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body { background:#FAF7F2; font-family:'Jost',sans-serif; }
        .btn-generate {
          width: 100%; padding: 20px;
          background: linear-gradient(135deg, #2E2118, #4A3428);
          border: none; border-radius: 16px;
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px; color: #FAF7F2;
          cursor: pointer; transition: all 0.3s ease;
          margin-bottom: 16px; letter-spacing: 0.5px;
        }
        .btn-generate:hover { transform: translateY(-3px); box-shadow: 0 12px 40px rgba(46,33,24,0.25); }
        .btn-generate:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
        .dash-nav {
          background: white;
          border-bottom: 1px solid rgba(201,184,168,0.2);
          padding: 20px 48px;
          display: flex; justify-content: space-between; align-items: center;
          position: sticky; top: 0; z-index: 100;
        }
        .dash-logo {
          font-family: 'Cormorant Garamond', serif;
          font-size: 24px; font-weight: 600;
          color: #2E2118; letter-spacing: 1px;
          display: flex; align-items: center; gap: 10px;
        }
        .dash-user { display: flex; align-items: center; gap: 16px; font-size: 13px; color: #A8917E; }
        .btn-signout {
          background: none; border: 1px solid rgba(201,184,168,0.4);
          padding: 8px 20px; border-radius: 40px;
          font-family: 'Jost', sans-serif; font-size: 12px;
          color: #6B5744; cursor: pointer; transition: all 0.3s; letter-spacing: 1px;
        }
        .btn-signout:hover { border-color: #B07D5B; color: #B07D5B; }
        .dash-main { max-width: 900px; margin: 0 auto; padding: 48px 24px; }
        .welcome-section { margin-bottom: 48px; }
        .welcome-greeting {
          font-family: 'Cormorant Garamond', serif;
          font-size: 48px; font-weight: 300;
          color: #2E2118; line-height: 1.2; margin-bottom: 8px;
        }
        .welcome-greeting em { font-style: italic; color: #B07D5B; }
        .welcome-sub { font-size: 15px; color: #A8917E; line-height: 1.6; }
        .child-card {
          background: linear-gradient(135deg, #2E2118, #4A3428);
          border-radius: 24px; padding: 40px;
          display: flex; align-items: center; gap: 32px;
          margin-bottom: 16px; position: relative; overflow: hidden;
        }
        .child-card::before {
          content: ''; position: absolute; top: -60px; right: -60px;
          width: 200px; height: 200px;
          background: radial-gradient(circle, rgba(242,228,220,0.1), transparent);
          border-radius: 50%;
        }
        .child-avatar {
          width: 80px; height: 80px;
          background: linear-gradient(135deg, #F2E4DC, #E8D5D0);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 32px; flex-shrink: 0; overflow: hidden;
          border: 3px solid rgba(242,228,220,0.3);
          cursor: pointer; transition: all 0.3s;
          position: relative; z-index: 1;
        }
        .child-avatar:hover { border-color: rgba(242,228,220,0.9); transform: scale(1.08); }
        .child-info { flex: 1; position: relative; z-index: 1; }
        .child-name {
          font-family: 'Cormorant Garamond', serif;
          font-size: 36px; font-weight: 600; color: #FAF7F2; margin-bottom: 4px;
        }
        .child-age { font-size: 14px; color: rgba(250,247,242,0.6); letter-spacing: 1px; }
        .child-stats { display: flex; gap: 32px; position: relative; z-index: 1; }
        .child-stat { text-align: center; }
        .child-stat-num {
          font-family: 'Cormorant Garamond', serif;
          font-size: 32px; font-weight: 300; color: #FAF7F2;
        }
        .child-stat-label { font-size: 11px; color: rgba(250,247,242,0.5); letter-spacing: 1.5px; text-transform: uppercase; }
        .btn-cartoon {
          width: 100%; padding: 13px;
          background: linear-gradient(135deg, rgba(228,222,237,0.4), rgba(214,229,216,0.4));
          border: 1px solid rgba(201,184,168,0.35);
          border-radius: 14px;
          font-family: 'Jost', sans-serif; font-size: 12px;
          letter-spacing: 1.5px; text-transform: uppercase;
          color: #6B5744; cursor: pointer; transition: all 0.3s;
          margin-bottom: 20px;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .btn-cartoon:hover { background: linear-gradient(135deg, rgba(228,222,237,0.8), rgba(214,229,216,0.8)); color: #2E2118; transform: translateY(-1px); }
        .btn-add-memory {
          width: 100%; padding: 18px;
          background: white; border: 2px dashed rgba(201,184,168,0.5);
          border-radius: 16px; font-family: 'Cormorant Garamond', serif;
          font-size: 20px; color: #B07D5B; cursor: pointer;
          transition: all 0.3s ease; margin-bottom: 16px;
          display: flex; align-items: center; justify-content: center; gap: 12px;
        }
        .btn-add-memory:hover {
          border-color: #B07D5B; background: #FAF7F2;
          transform: translateY(-2px); box-shadow: 0 8px 30px rgba(176,125,91,0.1);
        }
        .btn-invite {
          width: 100%; padding: 14px; background: transparent;
          border: 1px solid rgba(201,184,168,0.5); border-radius: 16px;
          font-family: 'Jost', sans-serif; font-size: 13px;
          letter-spacing: 1.5px; text-transform: uppercase;
          color: #6B5744; cursor: pointer; transition: all 0.3s ease; margin-bottom: 32px;
        }
        .btn-invite:hover { border-color: #B07D5B; color: #B07D5B; }
        .memories-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 28px; font-weight: 300; color: #2E2118; margin-bottom: 20px;
        }
        .memories-title em { font-style: italic; color: #B07D5B; }
        .memory-card {
          background: white; border-radius: 20px; padding: 32px;
          margin-bottom: 16px; border: 1px solid rgba(201,184,168,0.2);
          transition: all 0.3s ease; position: relative; overflow: hidden;
        }
        .memory-card::before {
          content: ''; position: absolute; top: 0; left: 0;
          width: 4px; height: 100%;
          background: linear-gradient(180deg, #F2E4DC, #E4DEED);
        }
        .memory-card:hover { transform: translateY(-3px); box-shadow: 0 12px 40px rgba(46,33,24,0.06); }
        .memory-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .memory-author { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #B07D5B; font-weight: 500; }
        .memory-date { font-size: 12px; color: #C9B8A8; }
        .memory-content { font-family: 'Cormorant Garamond', serif; font-size: 18px; color: #2E2118; line-height: 1.8; font-style: italic; }
        .memory-photo { width: 100%; max-height: 220px; object-fit: cover; border-radius: 12px; margin-bottom: 16px; }
        .empty-state {
          text-align: center; padding: 60px 40px; background: white;
          border-radius: 20px; border: 1px solid rgba(201,184,168,0.2);
        }
        .empty-state-icon { font-size: 48px; margin-bottom: 16px; }
        .empty-state-title { font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 300; color: #2E2118; margin-bottom: 8px; }
        .empty-state-sub { font-size: 14px; color: #A8917E; line-height: 1.6; }
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(46,33,24,0.5);
          backdrop-filter: blur(8px); display: flex; align-items: center;
          justify-content: center; z-index: 200; padding: 24px;
        }
        .modal {
          background: #FAF7F2; border-radius: 24px; padding: 48px;
          width: 100%; max-width: 520px;
          box-shadow: 0 40px 80px rgba(0,0,0,0.2);
          max-height: 90vh; overflow-y: auto;
        }
        .modal-title { font-family: 'Cormorant Garamond', serif; font-size: 36px; font-weight: 300; color: #2E2118; margin-bottom: 8px; }
        .modal-title em { font-style: italic; color: #B07D5B; }
        .modal-sub { font-size: 14px; color: #A8917E; margin-bottom: 32px; line-height: 1.6; }
        .modal-label { display: block; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #6B5744; margin-bottom: 8px; }
        .modal-input {
          width: 100%; padding: 14px 18px; background: white;
          border: 1px solid rgba(201,184,168,0.4); border-radius: 12px;
          font-family: 'Jost', sans-serif; font-size: 15px; color: #2E2118;
          outline: none; transition: all 0.3s; margin-bottom: 20px;
        }
        .modal-input:focus { border-color: #B07D5B; box-shadow: 0 0 0 3px rgba(176,125,91,0.1); }
        .modal-textarea {
          width: 100%; padding: 14px 18px; background: white;
          border: 1px solid rgba(201,184,168,0.4); border-radius: 12px;
          font-family: 'Cormorant Garamond', serif; font-size: 18px; color: #2E2118;
          outline: none; transition: all 0.3s; margin-bottom: 20px;
          resize: none; min-height: 140px; line-height: 1.6; font-style: italic;
        }
        .modal-textarea:focus { border-color: #B07D5B; box-shadow: 0 0 0 3px rgba(176,125,91,0.1); }
        .modal-textarea::placeholder { color: #C9B8A8; font-style: italic; }
        .modal-buttons { display: flex; gap: 12px; }
        .btn-save {
          flex: 1; padding: 14px; background: #2E2118; color: #FAF7F2;
          border: none; border-radius: 12px; font-family: 'Jost', sans-serif;
          font-size: 13px; font-weight: 500; letter-spacing: 1.5px;
          text-transform: uppercase; cursor: pointer; transition: all 0.3s;
        }
        .btn-save:hover { background: #B07D5B; }
        .btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-cancel {
          padding: 14px 24px; background: transparent; color: #6B5744;
          border: 1px solid rgba(201,184,168,0.4); border-radius: 12px;
          font-family: 'Jost', sans-serif; font-size: 13px; cursor: pointer; transition: all 0.3s;
        }
        .btn-cancel:hover { border-color: #B07D5B; color: #B07D5B; }
        .photo-upload-area {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 28px; border-radius: 12px;
          border: 1.5px dashed rgba(201,184,168,0.6); background: white;
          cursor: pointer; color: #A8917E; font-size: 14px; gap: 8px;
          transition: all 0.3s; margin-bottom: 20px;
        }
        .photo-upload-area:hover { border-color: #B07D5B; background: #FAF7F2; }
        .setup-card {
          background: white; border-radius: 24px; padding: 60px;
          text-align: center; border: 1px solid rgba(201,184,168,0.2); margin-bottom: 40px;
        }
        .setup-icon { font-size: 56px; margin-bottom: 24px; }
        .setup-title { font-family: 'Cormorant Garamond', serif; font-size: 36px; font-weight: 300; color: #2E2118; margin-bottom: 12px; }
        .setup-title em { font-style: italic; color: #B07D5B; }
        .setup-sub { font-size: 15px; color: #A8917E; margin-bottom: 32px; line-height: 1.6; }
        .btn-setup {
          background: #2E2118; color: #FAF7F2; padding: 16px 40px;
          border-radius: 50px; font-family: 'Jost', sans-serif; font-size: 13px;
          font-weight: 500; letter-spacing: 1.5px; text-transform: uppercase;
          border: none; cursor: pointer; transition: all 0.3s;
        }
        .btn-setup:hover { background: #B07D5B; transform: translateY(-2px); }
        .invite-link-box {
          background: white; border-radius: 12px; padding: 16px; margin-bottom: 16px;
          font-size: 13px; color: #6B5744; word-break: break-all; font-family: monospace;
          border: 1px solid rgba(201,184,168,0.3);
        }
        .cartoon-spinner {
          width: 56px; height: 56px; border-radius: 50%;
          border: 3px solid rgba(201,184,168,0.3);
          border-top-color: #B07D5B;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .cartoon-compare {
          display: flex; gap: 20px; margin: 24px 0;
          align-items: center; justify-content: center;
        }
        .cartoon-compare img {
          width: 130px; height: 130px; object-fit: cover; border-radius: 50%;
          border: 3px solid rgba(201,184,168,0.4);
        }
      `}</style>

      {/* NAV */}
      <nav className="dash-nav">
        <div className="dash-logo">📖 Hemsaga</div>
        <div className="dash-user">
          <span>Welcome, {user?.user_metadata?.full_name || 'Papa'}</span>
          <button className="btn-signout" onClick={async () => { await supabase.auth.signOut(); router.push('/auth'); }}>
            Sign out
          </button>
        </div>
      </nav>

      <main className="dash-main">
        {/* Welcome */}
        <div className="welcome-section">
          <h1 className="welcome-greeting">
            {child ? <>{getGreeting()}, <em>{child.name}'s story</em> awaits</> : <>Welcome to <em>Hemsaga</em></>}
          </h1>
          <p className="welcome-sub">
            {child ? `Every memory you log today becomes part of ${child.name}'s story forever.` : "Let's begin by adding your child's profile."}
          </p>
        </div>

        {/* No child yet */}
        {!child && (
          <div className="setup-card">
            <div className="setup-icon">🌸</div>
            <h2 className="setup-title">Add your <em>child's</em> profile</h2>
            <p className="setup-sub">Tell us about your child and their story begins today.</p>
            <button className="btn-setup" onClick={() => setShowAddChild(true)}>
              Create Profile →
            </button>
          </div>
        )}

        {/* Child exists */}
        {child && (
          <>
            {/* Child card */}
            <div className="child-card">
              <div
                className="child-avatar"
                onClick={() => setShowCartoonModal(true)}
                title={childCartoonUrl ? 'Click to update cartoon' : 'Click to generate cartoon avatar'}
              >
                {childCartoonUrl ? (
                  <img src={childCartoonUrl} alt={`${child.name} cartoon`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span title="Click to generate cartoon">🎨</span>
                )}
              </div>
              <div className="child-info">
                <div className="child-name">{child.name}</div>
                <div className="child-age">{getAge(child.birthday)} · Born {formatDate(child.birthday)}</div>
              </div>
              <div className="child-stats">
                <div className="child-stat">
                  <div className="child-stat-num">{memories.length}</div>
                  <div className="child-stat-label">Memories</div>
                </div>
                <div className="child-stat">
                  <div className="child-stat-num">{Math.ceil(memories.length / 5) || 0}</div>
                  <div className="child-stat-label">Chapters</div>
                </div>
              </div>
            </div>

            {/* Cartoon button */}
            <button className="btn-cartoon" onClick={() => setShowCartoonModal(true)}>
              🎨 &nbsp; {childCartoonUrl ? `Update ${child.name}'s cartoon avatar` : `✨ Generate cartoon avatar for ${child.name}`}
            </button>

            {/* Generate Story */}
            {memories.length > 0 && (
              <button className="btn-generate" onClick={() => generateStory(false)} disabled={generating}>
                {generating ? '✦ Weaving your story...' : '✦ Generate Story Chapter'}
              </button>
            )}

            {/* Add memory */}
            <button className="btn-add-memory" onClick={() => setShowAddMemory(true)}>
              ✦ &nbsp; What happened today with {child.name}?
            </button>

            {/* Invite family */}
            <button className="btn-invite" onClick={() => { setShowInviteModal(true); setInviteLink(''); }}>
              👨‍👩‍👧 &nbsp; Invite Family Members
            </button>

            {/* Memories */}
            <h2 className="memories-title">Recent <em>Memories</em></h2>

            {memories.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🌸</div>
                <h3 className="empty-state-title">The first memory is waiting</h3>
                <p className="empty-state-sub">Every great story starts with a single moment.<br />What happened with {child.name} today?</p>
              </div>
            ) : (
              memories.map(m => (
                <div key={m.id} className="memory-card">
                  {m.photo_url && (
                    <img src={m.photo_url} alt="Memory" className="memory-photo" />
                  )}
                  <div className="memory-meta">
                    <span className="memory-author">{m.author}</span>
                    <span className="memory-date">{formatDate(m.memory_date)}</span>
                  </div>
                  <div className="memory-content">{m.content}</div>
                </div>
              ))
            )}
          </>
        )}
      </main>

      {/* Add Child Modal */}
      {showAddChild && (
        <div className="modal-overlay">
          <div className="modal">
            <h2 className="modal-title">Add your <em>child</em></h2>
            <p className="modal-sub">Their story starts the moment you add them here.</p>
            <label className="modal-label">Child's Name</label>
            <input className="modal-input" placeholder="e.g. Ivaan" value={childName} onChange={e => setChildName(e.target.value)} />
            <label className="modal-label">Birthday</label>
            <input className="modal-input" type="date" value={childBirthday} onChange={e => setChildBirthday(e.target.value)} />
            <div className="modal-buttons">
              <button className="btn-save" onClick={saveChild} disabled={saving}>{saving ? 'Saving...' : 'Create Profile →'}</button>
              <button className="btn-cancel" onClick={() => setShowAddChild(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Memory Modal */}
      {showAddMemory && (
        <div className="modal-overlay">
          <div className="modal">
            <h2 className="modal-title">Log a <em>memory</em></h2>
            <p className="modal-sub">What happened today? Even the smallest moment matters.</p>

            <label className="modal-label">Your Name</label>
            <input
              className="modal-input"
              placeholder="Papa, Mama, Nana..."
              value={memoryAuthor}
              onChange={e => setMemoryAuthor(e.target.value)}
            />

            <label className="modal-label">What happened?</label>
            <textarea
              className="modal-textarea"
              placeholder={`e.g. ${child?.name} stood up holding the sofa today and just grinned at me...`}
              value={memoryText}
              onChange={e => setMemoryText(e.target.value)}
            />

            <label className="modal-label">Add a Photo (optional)</label>
            {memoryPhotoPreview ? (
              <div style={{ position: 'relative', marginBottom: '20px' }}>
                <img src={memoryPhotoPreview} alt="Preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '12px' }} />
                <button
                  onClick={() => { setMemoryPhoto(null); setMemoryPhotoPreview(null); }}
                  style={{
                    position: 'absolute', top: '8px', right: '8px',
                    background: 'rgba(0,0,0,0.6)', color: 'white',
                    border: 'none', borderRadius: '50%', width: '30px', height: '30px',
                    cursor: 'pointer', fontSize: '18px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >×</button>
              </div>
            ) : (
              <label className="photo-upload-area">
                <span style={{ fontSize: '32px' }}>📷</span>
                <span>Tap to add a photo</span>
                <input
                  type="file" accept="image/*"
                  onChange={e => {
                    const file = e.target.files[0];
                    if (!file) return;
                    setMemoryPhoto(file);
                    setMemoryPhotoPreview(URL.createObjectURL(file));
                  }}
                  style={{ display: 'none' }}
                />
              </label>
            )}

            <div className="modal-buttons">
              <button className="btn-save" onClick={saveMemory} disabled={saving}>
                {saving ? 'Saving...' : 'Save Memory →'}
              </button>
              <button className="btn-cancel" onClick={() => {
                setShowAddMemory(false);
                setMemoryPhoto(null);
                setMemoryPhotoPreview(null);
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* 🎨 Cartoon Modal */}
      {showCartoonModal && (
        <div className="modal-overlay" onClick={() => { if (!cartoonizing) { setShowCartoonModal(false); setCartoonPhoto(null); setCartoonPhotoPreview(null); } }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">✨ Cartoon <em>Avatar</em></h2>
            <p className="modal-sub">
              Upload a clear photo of {child?.name} and we'll transform it into a beautiful
              Pixar-style cartoon for their storybook.
            </p>

            {/* STATE 1: Generating */}
            {cartoonizing && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div className="cartoon-spinner" />
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', color: '#2E2118', marginBottom: '8px' }}>
                  Creating {child?.name}'s cartoon...
                </p>
                <p style={{ fontSize: '13px', color: '#A8917E' }}>
                  This takes 30–60 seconds ✨
                </p>
              </div>
            )}

            {/* STATE 2: Has existing cartoon, no new photo selected */}
            {!cartoonizing && childCartoonUrl && !cartoonPhotoPreview && (
              <div style={{ textAlign: 'center' }}>
                <img
                  src={childCartoonUrl}
                  alt="Current cartoon"
                  style={{ width: '160px', height: '160px', borderRadius: '50%', objectFit: 'cover', border: '4px solid #F2E4DC', marginBottom: '16px' }}
                />
                <p style={{ fontSize: '14px', color: '#A8917E', marginBottom: '24px' }}>
                  {child?.name}'s current cartoon avatar
                </p>
                <label className="photo-upload-area">
                  <span style={{ fontSize: '28px' }}>📷</span>
                  <span>Upload new photo to regenerate</span>
                  <input
                    type="file" accept="image/*"
                    onChange={e => {
                      const file = e.target.files[0];
                      if (!file) return;
                      setCartoonPhoto(file);
                      setCartoonPhotoPreview(URL.createObjectURL(file));
                    }}
                    style={{ display: 'none' }}
                  />
                </label>
                <button className="btn-cancel" style={{ width: '100%', marginTop: '8px' }}
                  onClick={() => { setShowCartoonModal(false); }}>
                  Close
                </button>
              </div>
            )}

            {/* STATE 3: Photo selected, ready to generate */}
            {!cartoonizing && cartoonPhotoPreview && (
              <>
                <div className="cartoon-compare">
                  <img src={cartoonPhotoPreview} alt="Your photo" />
                  <span style={{ fontSize: '28px', color: '#B07D5B' }}>→</span>
                  <div style={{
                    width: '130px', height: '130px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #F2E4DC, #E4DEED)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '3px dashed rgba(201,184,168,0.5)', fontSize: '36px'
                  }}>✨</div>
                </div>
                <p style={{ textAlign: 'center', fontSize: '13px', color: '#A8917E', marginBottom: '24px' }}>
                  Ready to transform into a cartoon!
                </p>
                <div className="modal-buttons">
                  <button className="btn-save" onClick={generateCartoon}>
                    ✨ Generate Cartoon
                  </button>
                  <button className="btn-cancel" onClick={() => { setCartoonPhoto(null); setCartoonPhotoPreview(null); }}>
                    Change Photo
                  </button>
                </div>
              </>
            )}

            {/* STATE 4: No cartoon yet, no photo selected */}
            {!cartoonizing && !childCartoonUrl && !cartoonPhotoPreview && (
              <>
                <label className="photo-upload-area" style={{ padding: '40px' }}>
                  <span style={{ fontSize: '48px' }}>📷</span>
                  <span style={{ fontSize: '16px', fontFamily: "'Cormorant Garamond', serif" }}>
                    Upload a photo of {child?.name}
                  </span>
                  <span style={{ fontSize: '12px', color: '#C9B8A8', textAlign: 'center' }}>
                    Use a clear front-facing photo for best results
                  </span>
                  <input
                    type="file" accept="image/*"
                    onChange={e => {
                      const file = e.target.files[0];
                      if (!file) return;
                      setCartoonPhoto(file);
                      setCartoonPhotoPreview(URL.createObjectURL(file));
                    }}
                    style={{ display: 'none' }}
                  />
                </label>
                <button className="btn-cancel" style={{ width: '100%' }}
                  onClick={() => setShowCartoonModal(false)}>
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2 className="modal-title">Invite <em>Family</em></h2>
            <p className="modal-sub">Share this link with grandparents — no account needed. They can add memories and photos directly.</p>
            {!inviteLink ? (
              <div className="modal-buttons">
                <button className="btn-save" onClick={generateInviteLink}>Generate Invite Link</button>
                <button className="btn-cancel" onClick={() => setShowInviteModal(false)}>Cancel</button>
              </div>
            ) : (
              <>
                <div className="invite-link-box">{inviteLink}</div>
                <div className="modal-buttons">
                  <button className="btn-save" onClick={() => {
                    navigator.clipboard.writeText(inviteLink);
                    alert('Link copied! Send it on WhatsApp 💙');
                  }}>📋 Copy Link</button>
                  <button className="btn-cancel" onClick={() => setShowInviteModal(false)}>Close</button>
                </div>
                <p style={{ fontSize: '12px', color: '#A8917E', marginTop: '16px', textAlign: 'center' }}>
                  Anyone with this link can add memories for {child.name}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Story Modal */}
      {showStory && story && story.length > 0 && (
        <div className="modal-overlay" onClick={() => setShowStory(false)}>
          <div className="modal" style={{ maxWidth: '680px', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ height: '4px', background: 'linear-gradient(90deg,#F2E4DC,#E4DEED,#D6E5D8)', borderRadius: '4px 4px 0 0', margin: '-48px -48px 40px' }} />
            <div style={{ textAlign: 'center', marginBottom: '40px', paddingBottom: '32px', borderBottom: '1px solid rgba(201,184,168,0.2)' }}>
              <div style={{ fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', color: '#B07D5B', marginBottom: '12px' }}>
                The Story of
              </div>
              {childCartoonUrl && (
                <img src={childCartoonUrl} alt="Cartoon" style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', marginBottom: '12px', border: '3px solid #F2E4DC', display: 'block', margin: '0 auto 12px' }} />
              )}
              <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '42px', fontWeight: '300', color: '#2E2118' }}>
                {child.name}
              </h1>
              <div style={{ fontSize: '13px', color: '#A8917E', marginTop: '8px' }}>
                {story.length} {story.length === 1 ? 'Chapter' : 'Chapters'} · A Family Story
              </div>
            </div>

            {story.map((chapter, index) => (
              <div key={chapter.id} style={{ marginBottom: '48px' }}>
                <div style={{ fontSize: '10px', letterSpacing: '2.5px', textTransform: 'uppercase', color: '#B07D5B', marginBottom: '8px' }}>
                  Chapter {chapter.chapter_number}
                </div>
                <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '28px', fontWeight: '600', color: '#2E2118', marginBottom: '24px', fontStyle: 'italic' }}>
                  {chapter.title}
                </h2>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', color: '#6B5744', lineHeight: '1.9', fontStyle: 'italic', whiteSpace: 'pre-line' }}>
                  {chapter.content}
                </p>
                {index < story.length - 1 && (
                  <div style={{ textAlign: 'center', margin: '40px 0 0', color: '#C9B8A8', fontSize: '20px', letterSpacing: '8px' }}>· · ·</div>
                )}
              </div>
            ))}

            <div style={{ borderTop: '1px solid rgba(201,184,168,0.2)', paddingTop: '32px', display: 'flex', gap: '12px' }}>
              <button className="btn-save" onClick={() => setShowStory(false)}>Close</button>
              <button className="btn-cancel" onClick={() => { setShowStory(false); generateStory(true); }}>
                Regenerate Story
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}