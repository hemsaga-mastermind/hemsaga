'use client';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleAuth = async () => {
    setLoading(true);
    setMessage('');

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
      else router.push('/dashboard');
    } else {
      const { error } = await supabase.auth.signUp({ email, password,
        options: { data: { full_name: name } }
      });
      if (error) setMessage(error.message);
      else setMessage('Check your email to confirm your account!');
    }
    setLoading(false);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400&family=Jost:wght@300;400;500&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body { background:#FAF7F2; font-family:'Jost',sans-serif; }

        .auth-page {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
        }

        /* LEFT — Brand side */
        .auth-left {
          background: linear-gradient(135deg, #2E2118 0%, #4A3428 100%);
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 80px;
          position: relative;
          overflow: hidden;
        }
        .auth-left::before {
          content: '';
          position: absolute;
          top: -100px; right: -100px;
          width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(242,228,220,0.08), transparent);
          border-radius: 50%;
        }
        .auth-left::after {
          content: '';
          position: absolute;
          bottom: -80px; left: -80px;
          width: 300px; height: 300px;
          background: radial-gradient(circle, rgba(214,229,216,0.06), transparent);
          border-radius: 50%;
        }
        .auth-logo {
          font-family: 'Cormorant Garamond', serif;
          font-size: 32px;
          font-weight: 600;
          color: #FAF7F2;
          letter-spacing: 1px;
          margin-bottom: 60px;
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative; z-index: 1;
        }
        .auth-quote {
          font-family: 'Cormorant Garamond', serif;
          font-size: 36px;
          font-weight: 300;
          font-style: italic;
          color: #FAF7F2;
          line-height: 1.5;
          margin-bottom: 32px;
          position: relative; z-index: 1;
        }
        .auth-quote em {
          color: #F2E4DC;
          font-style: italic;
        }
        .auth-quote-author {
          font-size: 12px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: rgba(250,247,242,0.4);
          position: relative; z-index: 1;
        }

        /* Floating memory bubbles on left */
        .memory-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          padding: 10px 18px;
          border-radius: 40px;
          font-size: 13px;
          color: rgba(250,247,242,0.7);
          margin-top: 60px;
          margin-right: 12px;
          position: relative; z-index: 1;
        }

        /* RIGHT — Form side */
        .auth-right {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 80px;
          background: #FAF7F2;
        }
        .auth-form-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 42px;
          font-weight: 300;
          color: #2E2118;
          margin-bottom: 8px;
        }
        .auth-form-title em {
          font-style: italic;
          color: #B07D5B;
        }
        .auth-form-subtitle {
          font-size: 14px;
          color: #A8917E;
          margin-bottom: 48px;
          line-height: 1.6;
        }

        .form-group {
          margin-bottom: 24px;
        }
        .form-label {
          display: block;
          font-size: 11px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #6B5744;
          margin-bottom: 8px;
        }
        .form-input {
          width: 100%;
          padding: 14px 18px;
          background: white;
          border: 1px solid rgba(201,184,168,0.4);
          border-radius: 12px;
          font-family: 'Jost', sans-serif;
          font-size: 15px;
          color: #2E2118;
          outline: none;
          transition: all 0.3s ease;
        }
        .form-input:focus {
          border-color: #B07D5B;
          box-shadow: 0 0 0 3px rgba(176,125,91,0.1);
        }
        .form-input::placeholder { color: #C9B8A8; }

        .btn-submit {
          width: 100%;
          padding: 16px;
          background: #2E2118;
          color: #FAF7F2;
          border: none;
          border-radius: 12px;
          font-family: 'Jost', sans-serif;
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 8px;
        }
        .btn-submit:hover {
          background: #B07D5B;
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(176,125,91,0.3);
        }
        .btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .auth-switch {
          text-align: center;
          margin-top: 28px;
          font-size: 14px;
          color: #A8917E;
        }
        .auth-switch button {
          background: none;
          border: none;
          color: #B07D5B;
          font-family: 'Jost', sans-serif;
          font-size: 14px;
          cursor: pointer;
          text-decoration: underline;
          padding: 0;
        }

        .message {
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 13px;
          margin-bottom: 20px;
          background: #F2E4DC;
          color: #6B5744;
          border: 1px solid rgba(176,125,91,0.2);
        }

        .divider {
          display: flex;
          align-items: center;
          gap: 16px;
          margin: 28px 0;
          color: #C9B8A8;
          font-size: 12px;
          letter-spacing: 1px;
        }
        .divider::before, .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(201,184,168,0.4);
        }

        @media(max-width: 768px) {
          .auth-page { grid-template-columns: 1fr; }
          .auth-left { display: none; }
          .auth-right { padding: 40px 24px; }
        }
      `}</style>

      <div className="auth-page">
        {/* LEFT */}
        <div className="auth-left">
          <div className="auth-logo">📖 Hemsaga</div>
          <p className="auth-quote">
            Every family has a <em>story</em> worth telling. Yours begins today.
          </p>
          <p className="auth-quote-author">Where memories become legacy</p>
          <div style={{marginTop: '60px'}}>
            <span className="memory-pill">📸 Papa logs a moment</span>
            <span className="memory-pill">✦ AI weaves the story</span>
            <span className="memory-pill">📖 They read it when it matters</span>
          </div>
        </div>

        {/* RIGHT */}
        <div className="auth-right">
          <h1 className="auth-form-title">
            {isLogin ? <>Welcome <em>back</em></> : <>Begin your <em>saga</em></>}
          </h1>
          <p className="auth-form-subtitle">
            {isLogin
              ? "Your family's story is waiting for you."
              : "Create your family account and start your story today."}
          </p>
          <p style={{ fontSize: 12, color: '#A8917E', marginBottom: 24, lineHeight: 1.5 }}>
            Hemsaga is in private beta. Sign in if you have an account. New sign-ups are for invited testers only.
          </p>

          {message && <div className="message">{message}</div>}

          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Your Name</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. Raj"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              className="form-input"
              type="email"
              placeholder="you@hemsaga.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button
            className="btn-submit"
            onClick={handleAuth}
            disabled={loading}
          >
            {loading ? 'Please wait...' : isLogin ? 'Sign In →' : 'Create Account →'}
          </button>

          <div className="divider">or</div>

          <div className="auth-switch">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => { setIsLogin(!isLogin); setMessage(''); }}>
              {isLogin ? 'Create one' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}