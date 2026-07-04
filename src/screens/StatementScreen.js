import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

export default function StatementScreen() {
  const [customers, setCustomers] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [selected, setSelected] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => { fetchCustomers(); }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchCustomers = async () => {
    const { data, error } = await supabase.from('customers').select('*').order('name', { ascending: true });
    if (!error && data) setCustomers(data);
  };

  const fetchStatement = async (customerName) => {
    setSelected(customerName);
    setSearchText(customerName);
    setShowDropdown(false);
    if (!customerName) { setTransactions([]); setSales([]); return; }
    setLoading(true);
    const normalizedName = customerName.trim().toLowerCase();

    // Transactions table se data — Purchase + Sale dono
    const { data: txnData, error: txnError } = await supabase
      .from('transactions').select('*').order('id', { ascending: false });
    if (!txnError && txnData) {
      setTransactions(txnData.filter(t => t.party?.trim().toLowerCase() === normalizedName));
    }

    // Saleslog se Total O/S ke liye
    const { data: salesData, error: salesError } = await supabase
      .from('saleslog').select('*').order('id', { ascending: false });
    if (!salesError && salesData) {
      setSales(salesData.filter(s => s.customer_name?.trim().toLowerCase() === normalizedName));
    }

    setLoading(false);
  };

  const filteredCustomers = customers.filter(c => c.name?.toLowerCase().includes(searchText.toLowerCase()));

  // Total O/S — saleslog se
  const totalOS = sales.reduce((sum, e) => {
    const os = parseFloat(e.amt_os) || 0;
    const part = parseFloat(e.part_received) || 0;
    const due = parseFloat(e.due_balance) || 0;
    return sum + (os - part - due);
  }, 0);

  const metalColor = (metal) => metal === 'Gold'
    ? { bg: 'rgba(212,175,55,0.15)', color: '#D4AF37', dot: '#D4AF37' }
    : { bg: 'rgba(59,130,246,0.15)', color: '#60A5FA', dot: '#60A5FA' };

  const typeColor = (type) => type === 'Sale'
    ? { bg: 'rgba(16,185,129,0.15)', color: '#10B981' }
    : { bg: 'rgba(239,68,68,0.15)', color: '#EF4444' };

  const statusColor = (status) => status === 'Clear'
    ? { bg: 'rgba(16,185,129,0.1)', color: '#10B981' }
    : { bg: 'rgba(251,191,36,0.15)', color: '#F59E0B' };

  return (
    <div style={{ paddingBottom: '20px' }}>

      {/* SEARCH CUSTOMER */}
      <div className="card" style={{ position: 'relative' }} ref={searchRef}>
        <div className="sec-label" style={{ marginBottom: '8px' }}>Customer Search</div>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Type customer name..."
            value={searchText}
            onChange={e => {
              setSearchText(e.target.value);
              setShowDropdown(true);
              if (!e.target.value) { setSelected(''); setTransactions([]); setSales([]); }
            }}
            onFocus={() => setShowDropdown(true)}
            style={{
              width: '100%', padding: '11px 40px 11px 14px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 'var(--radius)', fontSize: '14px', color: 'var(--text)',
              outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif',
            }}
          />
          {searchText && (
            <button onClick={() => { setSearchText(''); setSelected(''); setTransactions([]); setSales([]); setShowDropdown(false); }}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', fontSize: '16px', color: 'var(--text-3)', cursor: 'pointer', padding: '0' }}>✕</button>
          )}
        </div>

        {/* DROPDOWN */}
        {showDropdown && searchText && filteredCustomers.length > 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: '16px', right: '16px',
            background: 'var(--card)', border: '1.5px solid var(--border-strong)',
            borderRadius: 'var(--radius)', zIndex: 100, maxHeight: '200px',
            overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', marginTop: '4px',
          }}>
            {filteredCustomers.map(c => (
              <div key={c.id} onClick={() => fetchStatement(c.name)}
                style={{ padding: '11px 14px', fontSize: '13px', color: 'var(--text)', cursor: 'pointer', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #D4AF37, #E8C96B)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: '#1A1F36', flexShrink: 0 }}>
                  {c.name?.[0]?.toUpperCase()}
                </div>
                <span style={{ fontWeight: '500' }}>{c.name}</span>
              </div>
            ))}
          </div>
        )}

        {showDropdown && searchText && filteredCustomers.length === 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: '16px', right: '16px',
            background: 'var(--card)', border: '1.5px solid var(--border-strong)',
            borderRadius: 'var(--radius)', zIndex: 100, padding: '12px 14px',
            fontSize: '12px', color: 'var(--text-3)', textAlign: 'center',
            marginTop: '4px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          }}>No customer found</div>
        )}
      </div>

      {/* TOTAL OS CARD */}
      {selected && !loading && (
        <div className="card" style={{ background: totalOS > 0 ? 'var(--red-bg)' : 'var(--green-bg)', border: `1px solid ${totalOS > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: '700', color: totalOS > 0 ? 'var(--red)' : 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>Total Outstanding</div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: totalOS > 0 ? 'var(--red)' : 'var(--green)' }}>₹{Math.round(totalOS).toLocaleString('en-IN')}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-3)', marginBottom: '4px' }}>{transactions.length} transactions</div>
              <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-2)' }}>{selected}</div>
            </div>
          </div>
        </div>
      )}

      {/* LOADING */}
      {loading && [...Array(3)].map((_, i) => (
        <div className="skeleton-card" key={i}>
          <div className="skeleton-line w80"></div>
          <div className="skeleton-line w50"></div>
        </div>
      ))}

      {/* TRANSACTION CARDS */}
      {selected && !loading && (
        <>
          <div className="sec-label" style={{ margin: '14px 4px 8px' }}>Transaction History</div>

          {transactions.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--text-3)', padding: '32px 16px' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>📋</div>
              <div style={{ fontSize: '13px' }}>No transactions found</div>
            </div>
          ) : transactions.map(t => {
            const mc = metalColor(t.metal);
            const tc = typeColor(t.type);
            const sc = statusColor(t.status);
            const weight = parseFloat(t.weight) || 0;
            const purity = parseFloat(t.purity) || 0;
            const rate = parseFloat(t.rate) || 0;
            const amount = parseFloat(t.amount) || 0;

            return (
              <div key={t.id} style={{
                background: 'var(--card)', borderRadius: '12px', marginBottom: '10px',
                overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg)', borderBottom: '0.5px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: '500' }}>{t.date}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>·</span>
                    <span style={{ fontSize: '10px', fontWeight: '700', color: '#D4AF37', background: 'rgba(212,175,55,0.1)', padding: '2px 7px', borderRadius: '4px' }}>{t.txn_id}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ background: mc.bg, color: mc.color, borderRadius: '20px', padding: '3px 10px', fontSize: '10px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: mc.dot, display: 'inline-block' }}></span>
                      {t.metal}
                    </span>
                    <span style={{ background: tc.bg, color: tc.color, borderRadius: '20px', padding: '3px 10px', fontSize: '10px', fontWeight: '700' }}>
                      {t.type}
                    </span>
                  </div>
                </div>

                {/* Body 2x2 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                  {[
                    { label: 'Weight', value: `${weight.toFixed(3)} g` },
                    { label: 'Purity', value: purity ? purity.toFixed(2) : '—' },
                    { label: 'Rate /10g', value: rate > 0 ? `₹${Math.round(rate).toLocaleString('en-IN')}` : '—' },
                    { label: 'Amount', value: `₹${Math.round(amount).toLocaleString('en-IN')}`, highlight: true },
                  ].map((item, idx) => (
                    <div key={idx} style={{
                      padding: '12px 14px',
                      borderRight: idx % 2 === 0 ? '0.5px solid var(--border)' : 'none',
                      borderBottom: idx < 2 ? '0.5px solid var(--border)' : 'none',
                      background: item.highlight ? 'rgba(212,175,55,0.04)' : 'transparent',
                    }}>
                      <div style={{ fontSize: '9px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '4px', fontWeight: '600' }}>{item.label}</div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: item.highlight ? '#D4AF37' : 'var(--text)' }}>{item.value}</div>
                    </div>
                  ))}
                </div>

                {/* Footer — Status + Booking */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', background: 'rgba(255,255,255,0.02)', borderTop: '0.5px solid var(--border)' }}>
                  <span style={{ background: sc.bg, color: sc.color, borderRadius: '20px', padding: '3px 10px', fontSize: '10px', fontWeight: '700' }}>{t.status}</span>
                  {t.booking && (
                    <span style={{ fontSize: '10px', color: 'var(--text-3)', fontWeight: '500' }}>{t.booking}</span>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}