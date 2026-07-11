import React, { useState, useEffect } from 'react';
import './App.css';
import { supabase } from './supabaseClient';
import CashScreen from './screens/CashScreen';
import PendingScreen from './screens/PendingScreen';
import StatementScreen from './screens/StatementScreen';
import AnalyticsScreen from './screens/AnalyticsScreen';

function useMetalPrices() {
  const [prices, setPrices] = useState({ xau: null, xag: null, xauTrend: 0, xagTrend: 0, loading: true });
  useEffect(() => {
    let cancelled = false;
    const fetchPrices = () => {
      const c1 = new AbortController(), c2 = new AbortController();
      Promise.all([
        fetch('https://api.gold-api.com/price/XAU', { signal: c1.signal }).then(r => r.ok ? r.json() : Promise.reject()),
        fetch('https://api.gold-api.com/price/XAG', { signal: c2.signal }).then(r => r.ok ? r.json() : Promise.reject()),
      ]).then(([g, s]) => {
        if (cancelled) return;
        const xau = parseFloat(g.price), xag = parseFloat(s.price);
        setPrices(prev => ({
          xau: isNaN(xau) ? prev.xau : xau,
          xag: isNaN(xag) ? prev.xag : xag,
          xauTrend: (!isNaN(xau) && prev.xau) ? (xau > prev.xau ? 1 : xau < prev.xau ? -1 : prev.xauTrend) : prev.xauTrend,
          xagTrend: (!isNaN(xag) && prev.xag) ? (xag > prev.xag ? 1 : xag < prev.xag ? -1 : prev.xagTrend) : prev.xagTrend,
          loading: false,
        }));
      }).catch(() => { if (!cancelled) setPrices(prev => ({ ...prev, loading: false })); });
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 15000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);
  return prices;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('cash');
  const metalPrices = useMetalPrices();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [lastSync, setLastSync] = useState(new Date());
  const [pullRefresh, setPullRefresh] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [pullStartY, setPullStartY] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('kanla_pwa_user');
    if (saved) { setUser(JSON.parse(saved)); setShowWelcome(true); }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user && !showWelcome) {
      const timer = setTimeout(() => setShowWelcome(true), 2200);
      return () => clearTimeout(timer);
    }
  }, [user, showWelcome]);

  const handleLogin = async () => {
    if (!userId || !password) { setError('User ID aur Password fill karo!'); return; }
    setLoginLoading(true); setError('');
    try {
      const { data, error: err } = await supabase.from('users').select('*').eq('user_id', userId).single();
      if (err || !data || password !== data.password) {
        setError('Invalid User ID or Password'); setLoginLoading(false); return;
      }
      const userData = { id: data.id, user_id: data.user_id, name: data.name, role: data.role };
      setUser(userData);
      localStorage.setItem('kanla_pwa_user', JSON.stringify(userData));
      setUserId(''); setPassword('');
    } catch { setError('Login failed. Try again!'); }
    setLoginLoading(false);
  };

  const handleLogout = () => {
    setUser(null); setShowWelcome(false);
    localStorage.removeItem('kanla_pwa_user');
    setUserId(''); setPassword(''); setError('');
  };

  const handlePullStart = (e) => setPullStartY(e.touches?.[0].clientY || 0);
  const handlePullMove = (e) => {
    if (!e.touches) return;
    const diff = e.touches[0].clientY - pullStartY;
    if (diff > 0 && e.target.scrollTop === 0) { setIsPulling(true); setPullRefresh(Math.min(diff, 120)); }
  };
  const handlePullEnd = async () => {
    if (pullRefresh > 60) { setLastSync(new Date()); await new Promise(r => setTimeout(r, 800)); }
    setIsPulling(false); setPullRefresh(0);
  };

  const formatLastSync = () => {
    const diff = Math.floor((new Date() - lastSync) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  const inp = {
    width: '100%', padding: '12px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px', fontSize: '14px',
    color: '#F0F4FF', outline: 'none', boxSizing: 'border-box',
    transition: 'all 0.2s', fontFamily: 'Inter, sans-serif',
  };

  // ── LOADING ──
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#070B14' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '2px solid rgba(212,175,55,0.2)', borderTop: '2px solid #D4AF37', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <div style={{ color: '#4A5878', fontSize: '12px', letterSpacing: '1px' }}>LOADING</div>
      </div>
    </div>
  );

  // ── LOGIN ──
  if (!user) return (
    <div className="login-container" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#070B14', padding: '24px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: '-100px', left: '-100px', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-80px', right: '-80px', width: '250px', height: '250px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '360px' }}>
        <div className="login-header" style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '18px',
            background: 'linear-gradient(135deg, #D4AF37, #F0C842)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', boxShadow: '0 8px 32px rgba(212,175,55,0.3)',
            fontSize: '28px', fontWeight: '800', color: '#0A0F1E',
          }}>K</div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#F0F4FF', letterSpacing: '-0.5px' }}>Kanla Corporation</div>
          <div style={{ fontSize: '11px', color: '#4A5878', marginTop: '6px', letterSpacing: '2px', textTransform: 'uppercase' }}>Bullion Trader</div>
          <div style={{ fontSize: '9px', color: 'rgba(212,175,55,0.5)', marginTop: '8px', letterSpacing: '3px', fontStyle: 'italic' }}>— JAI SHREE SHYAM —</div>
        </div>

        <div className="login-form" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#4A5878', marginBottom: '6px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase' }}>User ID</div>
            <input type="text" value={userId} placeholder="e.g. mayank"
              onChange={e => { setUserId(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={inp}
              onFocus={e => e.target.style.borderColor = 'rgba(212,175,55,0.5)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>
          <div>
            <div style={{ fontSize: '10px', color: '#4A5878', marginBottom: '6px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase' }}>Password</div>
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? 'text' : 'password'} value={password} placeholder="••••••••"
                onChange={e => { setPassword(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={{ ...inp, paddingRight: '44px' }}
                onFocus={e => e.target.style.borderColor = 'rgba(212,175,55,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
              <button onClick={() => setShowPassword(!showPassword)} style={{
                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#4A5878', padding: '4px',
              }}>{showPassword ? '👁️' : '👁️‍🗨️'}</button>
            </div>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', fontSize: '12px', color: '#EF4444', textAlign: 'center' }}>
              ⚠️ {error}
            </div>
          )}

          <button onClick={handleLogin} disabled={loginLoading} style={{
            width: '100%', padding: '14px',
            background: loginLoading ? 'rgba(212,175,55,0.3)' : 'linear-gradient(135deg, #D4AF37, #F0C842)',
            color: loginLoading ? '#8A9BBE' : '#0A0F1E',
            border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '800',
            cursor: loginLoading ? 'not-allowed' : 'pointer', letterSpacing: '0.5px', marginTop: '6px',
            boxShadow: loginLoading ? 'none' : '0 8px 24px rgba(212,175,55,0.25)',
          }}>
            {loginLoading ? 'Logging in...' : 'LOGIN →'}
          </button>
        </div>

        <div className="login-footer" style={{ textAlign: 'center', fontSize: '9px', color: '#1E2A40', marginTop: '32px', letterSpacing: '3px' }}>
          — JAI SHREE SHYAM —
        </div>
      </div>
    </div>
  );

  // ── WELCOME ──
  if (!showWelcome) return (
    <div className="welcome-container" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#070B14', flexDirection: 'column', gap: '16px',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,55,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div className="welcome-mantra" style={{ fontSize: '10px', color: 'rgba(212,175,55,0.6)', letterSpacing: '4px', textTransform: 'uppercase' }}>
        🙏 Jai Shree Shyam 🙏
      </div>

      <div className="welcome-avatar" style={{
        width: '88px', height: '88px', borderRadius: '24px',
        background: 'linear-gradient(135deg, #D4AF37, #F0C842)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '36px', fontWeight: '800', color: '#0A0F1E',
        boxShadow: '0 0 0 0 rgba(212,175,55,0.4)',
        animation: 'goldPulse 2s ease-in-out infinite',
      }}>
        {user.name[0].toUpperCase()}
      </div>

      <div className="welcome-text" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '11px', color: '#4A5878', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>Welcome Back</div>
        <div style={{ fontSize: '24px', fontWeight: '800', color: '#F0F4FF', letterSpacing: '-0.5px' }}>
          {user.name}
        </div>
        <div style={{ display: 'inline-block', marginTop: '10px', padding: '4px 14px', borderRadius: '20px', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)', fontSize: '10px', color: '#D4AF37', letterSpacing: '1px', textTransform: 'uppercase' }}>
          {user.role} · Kanla Corporation
        </div>
      </div>

      <div className="welcome-date" style={{ fontSize: '11px', color: '#4A5878', marginTop: '8px' }}>
        {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
      </div>

      <div style={{ fontSize: '9px', color: '#1E2A40', marginTop: '40px', letterSpacing: '3px' }}>
        — JAI SHREE SHYAM —
      </div>
    </div>
  );

  // ── MAIN APP ──
  return (
    <div className="app">
      {/* HEADER */}
      <div className="header">
        <div className="header-brand-center">Kanla Corporation</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
          <div className="header-sub">{user.name} · {user.role}</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div className="sync-indicator">
              <span className="sync-dot" />
              <span>{formatLastSync()}</span>
            </div>
            <button onClick={handleLogout} style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: '700',
              cursor: 'pointer', color: '#EF4444', letterSpacing: '0.3px',
            }}>Logout</button>
          </div>
        </div>
        <div className="header-shyam">— JAI SHREE SHYAM —</div>
        {/* LIVE RATES TICKER */}
        <div style={{ overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '5px' }}>
          <div style={{ display: 'inline-flex', animation: 'tickerScroll 18s linear infinite', whiteSpace: 'nowrap' }}>
            {[0, 1].map(rep => (
              <div key={rep} style={{ display: 'inline-flex', gap: '16px', paddingRight: '16px' }}>
                <span style={{ fontSize: '10px', color: '#8A9BBE' }}>
                  XAU/USD &nbsp;
                  <span style={{ fontWeight: '700', color: metalPrices.xauTrend === 1 ? '#10B981' : metalPrices.xauTrend === -1 ? '#EF4444' : '#D4AF37' }}>
                    {metalPrices.xauTrend === 1 ? '▲ ' : metalPrices.xauTrend === -1 ? '▼ ' : ''}
                    {metalPrices.xau ? `$${metalPrices.xau.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                  </span>
                </span>
                <span style={{ color: '#1E2A40' }}>|</span>
                <span style={{ fontSize: '10px', color: '#8A9BBE' }}>
                  XAG/USD &nbsp;
                  <span style={{ fontWeight: '700', color: metalPrices.xagTrend === 1 ? '#10B981' : metalPrices.xagTrend === -1 ? '#EF4444' : '#D4AF37' }}>
                    {metalPrices.xagTrend === 1 ? '▲ ' : metalPrices.xagTrend === -1 ? '▼ ' : ''}
                    {metalPrices.xag ? `$${metalPrices.xag.toLocaleString('en-US', { minimumFractionDigits: 3 })}` : '—'}
                  </span>
                </span>
                <span style={{ color: '#1E2A40' }}>|</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SCREEN */}
      <div className="screen-wrap"
        onTouchStart={handlePullStart}
        onTouchMove={handlePullMove}
        onTouchEnd={handlePullEnd}
      >
        {pullRefresh > 0 && (
          <div className="pull-refresh-indicator" style={{ height: `${Math.min(pullRefresh, 52)}px`, transition: isPulling ? 'none' : 'height 0.3s ease' }}>
            <div style={{ fontSize: '18px', transform: `rotate(${pullRefresh * 2}deg)`, transition: 'transform 0.1s linear' }}>⟳</div>
          </div>
        )}
        <div key={activeTab} className="screen-content">
          {activeTab === 'cash' && <CashScreen />}
          {activeTab === 'analytics' && <AnalyticsScreen />}
          {activeTab === 'booking' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '12px' }}>
              <div style={{ fontSize: '40px' }}>📋</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#8A9BBE' }}>Booking</div>
              <div style={{ fontSize: '11px', color: '#4A5878' }}>Coming soon</div>
            </div>
          )}
          {activeTab === 'pending' && <PendingScreen />}
          {activeTab === 'statement' && <StatementScreen />}
        </div>
      </div>

      {/* BOTTOM NAV */}
      <div className="bnav">
        {[
          { key: 'booking', label: 'Booking', icon: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg> },
          { key: 'pending', label: 'Pending', icon: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
          { key: 'statement', label: 'Statement', icon: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
          { key: 'analytics', label: 'Analytics', icon: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg> },
          { key: 'cash', label: 'Cash', icon: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg> },
        ].map(tab => (
          <button key={tab.key} className={`bnav-tab ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}>
            {tab.icon}
            <span className="bnav-lbl">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}