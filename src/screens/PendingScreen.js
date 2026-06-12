import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function PendingScreen() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // all, purchase, sale

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('status', 'Pending')
      .order('id', { ascending: false });

    if (!error && data) setEntries(data);
    setLoading(false);
  };

  const pendingPurchase = entries.filter(e => e.type === 'Purchase');
  const pendingSale = entries.filter(e => e.type === 'Sale');
  
  const displayEntries = 
    activeTab === 'purchase' ? pendingPurchase : 
    activeTab === 'sale' ? pendingSale : 
    entries;

  const fmtWt = (w) => w ? Number(w).toFixed(3) : '0.000';

  return (
    <div>
      {/* SUMMARY CARD */}
      <div className="card" style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '12px 16px'
      }}>
        <div>
          <div className="sec-label">Pending Purchase</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--green)' }}>
            {pendingPurchase.length}
          </div>
        </div>
        <div style={{ height: '40px', width: '1px', background: 'var(--border)' }} />
        <div>
          <div className="sec-label">Pending Sale</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--red)' }}>
            {pendingSale.length}
          </div>
        </div>
      </div>

      {/* TAB BUTTONS */}
      <div style={{ display: 'flex', gap: '8px', margin: '12px 4px', flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: 'All Pending', count: entries.length },
          { key: 'purchase', label: 'Purchase', count: pendingPurchase.length },
          { key: 'sale', label: 'Sale', count: pendingSale.length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              border: '0.5px solid var(--border)',
              background: activeTab === tab.key ? 'var(--gold)' : 'transparent',
              color: activeTab === tab.key ? '#000' : 'var(--text-2)',
              fontSize: '10px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}>
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* ENTRIES */}
      <div className="sec-label" style={{ margin: '12px 4px 8px' }}>
        {activeTab === 'all' ? 'All Pending' : activeTab === 'purchase' ? 'Pending Purchases' : 'Pending Sales'}
      </div>

      {loading ? (
        [...Array(3)].map((_, i) => (
          <div className="skeleton-card" key={i}>
            <div className="skeleton-line w50"></div>
            <div className="skeleton-line w80"></div>
            <div className="skeleton-line w40"></div>
          </div>
        ))
      ) : displayEntries.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-3)', padding: '20px' }}>
          No {activeTab === 'purchase' ? 'purchase' : activeTab === 'sale' ? 'sale' : ''} pending transactions
        </div>
      ) : displayEntries.map(e => (
        <div key={e.id} className="card" style={{ padding: '12px 16px', marginBottom: '8px' }}>
          {/* HEADER WITH TYPE BADGE */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '10px',
            paddingBottom: '10px',
            borderBottom: '0.5px solid var(--border)',
            background: `linear-gradient(90deg, ${e.type === 'Purchase' ? 'var(--green-bg)' : 'var(--red-bg)'}, transparent)`,
            padding: '10px 12px',
            margin: '-12px -16px 10px',
            borderRadius: '8px 8px 0 0'
          }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1A1A2E' }}>
                {e.party || '—'}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '2px' }}>
                {e.txn_id || '—'} · {e.date}
              </div>
            </div>
            <div style={{
              fontSize: '9px',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '12px',
              background: e.type === 'Purchase' ? 'var(--green)' : 'var(--red)',
              color: '#fff',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {e.type}
            </div>
          </div>
          {/* METAL & WEIGHT */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
            <span style={{ color: 'var(--text-2)' }}>
              {e.metal} · {e.purity}
            </span>
            <span style={{ fontWeight: 700, fontSize: '13px', color: '#1A1A2E' }}>
              {fmtWt(e.weight)} g
            </span>
          </div>

          {/* RATE & AMOUNT */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-2)' }}>
            <span>Rate: ₹{(e.rate || 0).toLocaleString('en-IN')}</span>
            <span style={{ fontWeight: 600, color: '#1A1A2E' }}>
              ₹{(e.amount || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}