import React, { useState, useEffect } from 'react';
import bcrypt from 'bcryptjs';
import './App.css';
import { supabase } from './supabaseClient';
import CashScreen from './screens/CashScreen';
import PendingScreen from './screens/PendingScreen';
import StatementScreen from './screens/StatementScreen';
import AnalyticsScreen from './screens/AnalyticsScreen';

export default function App() {
  const [activeTab, setActiveTab] = useState('cash');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [lastSync, setLastSync] = useState(new Date());
  const [pullRefresh, setPullRefresh] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [pullStartY, setPullStartY] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('kanla_pwa_user');
    if (saved) {
      setUser(JSON.parse(saved));
      setShowWelcome(true);
    }
    const savedDarkMode = localStorage.getItem('kanla_dark_mode');
    if (savedDarkMode) setDarkMode(JSON.parse(savedDarkMode));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user && !showWelcome) {
      const timer = setTimeout(() => setShowWelcome(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [user, showWelcome]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('kanla_dark_mode', JSON.stringify(darkMode));
  }, [darkMode]);

  const handleLogin = async () => {
    if (!userId || !password) {
      setError('User ID aur Password fill karo!');
      return;
    }
    
    setLoginLoading(true);
    setError('');

    try {
      const { data, error: supabaseError } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (supabaseError || !data) {
        setError('Invalid User ID or Password');
        setLoginLoading(false);
        return;
      }

      // Password hash compare karo
      const isValidPassword = await bcrypt.compare(password, data.password);

      if (!isValidPassword) {
        setError('Invalid User ID or Password');
        setLoginLoading(false);
        return;
      }

      const userData = {
        id: data.id,
        user_id: data.user_id,
        name: data.name,
        role: data.role,
      };

      setUser(userData);
      localStorage.setItem('kanla_pwa_user', JSON.stringify(userData));
      setUserId('');
      setPassword('');
    } catch (err) {
      setError('Login failed. Try again!');
    }

    setLoginLoading(false);
  };

  const handleLogout = () => {
    setUser(null);
    setShowWelcome(false);
    localStorage.removeItem('kanla_pwa_user');
    setUserId('');
    setPassword('');
    setError('');
  };

  const handlePullStart = (e) => {
    setPullStartY(e.touches?.[0].clientY || 0);
  };

  const handlePullMove = (e) => {
    if (!e.touches) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - pullStartY;
    
    if (diff > 0 && e.target.scrollTop === 0) {
      setIsPulling(true);
      setPullRefresh(Math.min(diff, 120));
    }
  };

  const handlePullEnd = async () => {
    if (pullRefresh > 60) {
      setLastSync(new Date());
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    setIsPulling(false);
    setPullRefresh(0);
  };

  const formatLastSync = () => {
    const now = new Date();
    const diff = Math.floor((now - lastSync) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return lastSync.toLocaleDateString();
  };

  // ── LOADING SCREEN ──
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
          <div style={{ color: 'var(--text-2)', fontSize: '13px' }}>Loading...</div>
        </div>
      </div>
    );
  }

  // ── LOGIN SCREEN ──
  if (!user) {
    return (
      <div className="login-container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--bg)',
        padding: '20px',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '380px',
          background: 'var(--surface)',
          borderRadius: '16px',
          padding: '32px 24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          border: '0.5px solid var(--border)',
        }}>
          <div className="login-header" style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ fontSize: '28px', marginBottom: '10px', fontWeight: '700', color: 'var(--gold)' }}>
              Kanla
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-2)', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Bullion Trader
            </div>
            <div style={{ fontSize: '9px', color: 'var(--text-3)', marginTop: '4px' }}>
              — JAI SHREE SHYAM —
            </div>
          </div>

          <div className="login-form" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-2)', marginBottom: '6px', display: 'block', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                User ID
              </label>
              <input
                type="text"
                value={userId}
                onChange={(e) => { setUserId(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="e.g. mayank"
                style={{
                  width: '100%',
                  padding: '11px 13px',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: 'var(--text)',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'all 0.3s ease',
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--gold)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-2)', marginBottom: '6px', display: 'block', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '11px 40px 11px 13px',
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: 'var(--text)',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'all 0.3s ease',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--gold)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: 'var(--text-3)',
                    padding: '4px',
                  }}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                padding: '9px 12px',
                background: 'rgba(211, 47, 47, 0.1)',
                border: '0.5px solid #EF5350',
                borderRadius: '6px',
                fontSize: '11px',
                color: '#D32F2F',
                textAlign: 'center',
              }}>
                ⚠️ {error}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loginLoading}
              style={{
                width: '100%',
                padding: '12px',
                background: loginLoading ? 'var(--text-3)' : 'var(--gold)',
                color: loginLoading ? 'var(--text-2)' : '#000',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: loginLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                letterSpacing: '0.5px',
                marginTop: '8px',
              }}
            >
              {loginLoading ? '🔄 Logging in...' : 'LOGIN'}
            </button>
          </div>

          <div className="login-footer" style={{ textAlign: 'center', fontSize: '9px', color: 'var(--text-3)', marginTop: '20px', letterSpacing: '2px' }}>
            — JAI SHREE SHYAM —
          </div>
        </div>
      </div>
    );
  }

  // ── WELCOME SCREEN ──
  if (!showWelcome) {
    return (
      <div className="welcome-container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--bg)',
        flexDirection: 'column',
        gap: '20px',
      }}>
        <div className="welcome-mantra" style={{ fontSize: '13px', color: 'var(--gold)', letterSpacing: '2px', textTransform: 'uppercase' }}>
          🙏 Jai Shree Shyam 🙏
        </div>

        <div className="welcome-avatar" style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'var(--gold)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '36px',
          fontWeight: '700',
          color: '#000',
        }}>
          {user.name[0].toUpperCase()}
        </div>

        <div className="welcome-text" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
            Welcome Back
          </div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text)' }}>
            Mr. {user.name} 🙏
          </div>
          <div style={{
            fontSize: '9px',
            color: 'var(--text-3)',
            marginTop: '8px',
            border: '0.5px solid var(--border)',
            padding: '4px 12px',
            borderRadius: '12px',
            display: 'inline-block',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Kanla Corporation
          </div>
        </div>

        <div className="welcome-date" style={{ fontSize: '10px', color: 'var(--text-2)', marginTop: '16px' }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
        </div>

        <div className="welcome-footer" style={{ fontSize: '9px', color: 'var(--text-3)', marginTop: '32px', letterSpacing: '2px' }}>
          — JAI SHREE SHYAM —
        </div>
      </div>
    );
  }

  // ── MAIN APP ──
  return (
    <div className="app">
      <div className="header">
        <div className="header-shyam">— JAI SHREE SHYAM —</div>
        <div className="header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <div className="header-brand">Kanla Corporation</div>
            <div className="header-sub">{user.name} · {user.role}</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setDarkMode(!darkMode)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '16px',
                cursor: 'pointer',
                padding: '4px',
                transition: 'transform 0.2s ease',
              }}
              onMouseEnter={(e) => e.target.style.transform = 'scale(1.2)'}
              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
              title="Toggle dark mode"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button
              onClick={handleLogout}
              style={{
                background: 'var(--red)',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                color: '#fff',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => e.target.style.opacity = '0.8'}
              onMouseLeave={(e) => e.target.style.opacity = '1'}
              title="Logout"
            >
              🚪 Logout
            </button>
          </div>
        </div>
        <div className="sync-indicator" style={{ textAlign: 'center', marginTop: '6px', fontSize: '9px' }}>
          <span className="sync-dot"></span>
          Last synced: {formatLastSync()}
        </div>
      </div>

      <div 
        className="screen-wrap" 
        onTouchStart={handlePullStart}
        onTouchMove={handlePullMove}
        onTouchEnd={handlePullEnd}
        style={{ scrollBehavior: 'smooth', position: 'relative', overflow: 'auto' }}
      >
        {pullRefresh > 0 && (
          <div className="pull-refresh-indicator" style={{
            height: `${Math.min(pullRefresh, 60)}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: isPulling ? 'none' : 'height 0.3s ease',
          }}>
            <div className="pull-refresh-icon" style={{
              fontSize: '24px',
              transform: `rotate(${pullRefresh}deg)`,
              transition: 'transform 0.1s linear',
            }}>
              ⬇️
            </div>
          </div>
        )}
        {activeTab === 'cash' && <CashScreen />}
        {activeTab === 'analytics' && <AnalyticsScreen />}
        {activeTab === 'booking' && <div className="card">Booking — coming soon</div>}
        {activeTab === 'pending' && <PendingScreen />}
        {activeTab === 'statement' && <StatementScreen />}
      </div>

      <div className="bnav">
        {[
          { key: 'booking', label: 'Booking', icon: (
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          )},
          { key: 'pending', label: 'Pending', icon: (
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          )},
          { key: 'statement', label: 'Statement', icon: (
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          )},
          { key: 'analytics', label: 'Analytics', icon: (
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>
          )},
          { key: 'cash', label: 'Cash', icon: (
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>
          )},
        ].map(tab => (
          <button
            key={tab.key}
            className={`bnav-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon}
            <span className="bnav-lbl">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}