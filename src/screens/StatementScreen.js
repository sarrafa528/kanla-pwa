import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

export default function StatementScreen() {
  const [customers, setCustomers] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [selected, setSelected] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name', { ascending: true });
    if (!error && data) setCustomers(data);
  };

  const fetchStatement = async (customerName) => {
    setSelected(customerName);
    setSearchText(customerName);
    setShowDropdown(false);
    if (!customerName) { setSales([]); return; }
    setLoading(true);
    const normalizedName = customerName.trim().toLowerCase();
    const { data, error } = await supabase
      .from('saleslog')
      .select('*')
      .order('id', { ascending: false });
    if (!error && data) {
      const filtered = data.filter(s =>
        s.customer_name?.trim().toLowerCase() === normalizedName
      );
      setSales(filtered);
    }
    setLoading(false);
  };

  const filteredCustomers = customers.filter(c =>
    c.name?.toLowerCase().includes(searchText.toLowerCase())
  );

  const totalOS = sales.reduce((sum, e) => {
    const os = parseFloat(e.amt_os) || 0;
    const part = parseFloat(e.part_received) || 0;
    const due = parseFloat(e.due_balance) || 0;
    return sum + Math.max(0, os - part - due);
  }, 0);

  const metalColor = (metal) => metal === 'Gold'
    ? { bg: '#FEF5E4', color: '#854F0B', dot: '#D4AF37' }
    : { bg: '#E6F1FB', color: '#185FA5', dot: '#185FA5' };

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
              if (!e.target.value) { setSelected(''); setSales([]); }
            }}
            onFocus={() => setShowDropdown(true)}
            style={{
              width: '100%',
              padding: '11px 40px 11px 14px',
              background: 'var(--bg)',
              border: '1.5px solid var(--border-strong)',
              borderRadius: 'var(--radius)',
              fontSize: '14px',
              color: 'var(--text)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {searchText && (
            <button
              onClick={() => { setSearchText(''); setSelected(''); setSales([]); setShowDropdown(false); }}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', fontSize: '16px', color: 'var(--text-3)', cursor: 'pointer', padding: '0' }}
            >✕</button>
          )}
        </div>

        {/* DROPDOWN */}
        {showDropdown && searchText && filteredCustomers.length > 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: '16px', right: '16px',
            background: 'var(--card)', border: '1.5px solid var(--border-strong)',
            borderRadius: 'var(--radius)', zIndex: 100, maxHeight: '200px',
            overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            marginTop: '4px',
          }}>
            {filteredCustomers.map(c => (
              <div
                key={c.id}
                onClick={() => fetchStatement(c.name)}
                style={{
                  padding: '11px 14px', fontSize: '13px', color: 'var(--text)',
                  cursor: 'pointer', borderBottom: '0.5px solid var(--border)',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
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
          }}>
            No customer found
          </div>
        )}
      </div>

      {/* TOTAL OS CARD */}
      {selected && !loading && (
        <div className="card" style={{ background: totalOS > 0 ? '#FFF5F5' : '#F0FFF4', border: `1.5px solid ${totalOS > 0 ? '#FFCDD2' : '#C8E6C9'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: '700', color: totalOS > 0 ? '#C62828' : '#2E7D32', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>
                Total Outstanding
              </div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: totalOS > 0 ? 'var(--red)' : 'var(--green)' }}>
                ₹{Math.round(totalOS).toLocaleString('en-IN')}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-3)', marginBottom: '4px' }}>{sales.length} transactions</div>
              <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-2)' }}>{selected}</div>
            </div>
          </div>
        </div>
      )}

      {/* LOADING SKELETON */}
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

          {sales.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--text-3)', padding: '32px 16px' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>📋</div>
              <div style={{ fontSize: '13px' }}>No transactions found</div>
            </div>
          ) : sales.map(s => {
            const mc = metalColor(s.metal);
            const weight = parseFloat(s.weight) || 0;
            const purityDiff = parseFloat(s.purity_diff) || 0;
            const grossWeight = parseFloat(s.gross_weight) || (weight + purityDiff);
            const avgRate = parseFloat(s.avg_rate) || 0;
            const grossAmt = parseFloat(s.gross_amount) || 0;

            return (
              <div key={s.id} style={{
                background: 'var(--card)',
                borderRadius: '12px',
                marginBottom: '10px',
                overflow: 'hidden',
                border: '1px solid var(--border)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}>
                {/* Card Header */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px',
                  background: 'var(--bg)',
                  borderBottom: '0.5px solid var(--border)',
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: '500' }}>
                    {s.date_time}
                  </div>
                  <span style={{
                    background: mc.bg, color: mc.color,
                    borderRadius: '20px', padding: '3px 10px',
                    fontSize: '10px', fontWeight: '700', letterSpacing: '0.3px',
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: mc.dot, display: 'inline-block' }}></span>
                    {s.metal}
                  </span>
                </div>

                {/* Card Body — 2x2 Grid */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr',
                  gap: '0px',
                  padding: '0',
                }}>
                  {[
                    { label: 'Weight', value: `${weight.toFixed(3)} g`, icon: '⚖️' },
                    { label: 'Gross Weight', value: `${grossWeight.toFixed(3)} g`, icon: '📦' },
                    { label: 'Avg Rate /10g', value: avgRate > 0 ? `₹${Math.round(avgRate).toLocaleString('en-IN')}` : '—', icon: '📈' },
                    { label: 'Amount', value: `₹${Math.round(grossAmt).toLocaleString('en-IN')}`, icon: '💰', highlight: true },
                  ].map((item, idx) => (
                    <div key={idx} style={{
                      padding: '12px 14px',
                      borderRight: idx % 2 === 0 ? '0.5px solid var(--border)' : 'none',
                      borderBottom: idx < 2 ? '0.5px solid var(--border)' : 'none',
                      background: item.highlight ? 'rgba(212,175,55,0.04)' : 'transparent',
                    }}>
                      <div style={{ fontSize: '9px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '4px', fontWeight: '600' }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: item.highlight ? '#D4AF37' : 'var(--text)' }}>
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}