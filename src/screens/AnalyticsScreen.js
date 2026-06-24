import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function AnalyticsScreen() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('vault_summary')
      .select('*')
      .eq('id', 1)
      .single();

    if (!error && data) setSummary(data);
    setLoading(false);
  };

  if (loading) {
    return (
      <div>
        {[...Array(3)].map((_, i) => (
          <div className="skeleton-card" key={i}>
            <div className="skeleton-line w80"></div>
            <div className="skeleton-line w50"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!summary) {
    return <div className="card" style={{textAlign:'center', color:'var(--text-3)'}}>No data found</div>;
  }

  const gold = summary.gold_purity_wise || [];
  const silver = summary.silver_purity_wise || [];
  const maxGold = Math.max(...gold.map(g => Math.abs(g.physical || 0)), 1);
  const maxSilver = Math.max(...silver.map(s => Math.abs(s.netStock || 0)), 1);
  const GOLD_COLORS_DARK = ['#F59E0B','#10B981','#3B82F6','#8B5CF6','#EF4444','#06B6D4','#A16207'];
  const SILVER_COLORS_DARK = ['#94A3B8','#64748B'];

  const lowStock = (summary.total_available_gold || 0) < 300;

  return (
    <div>
      {/* Stock Overview */}
      <div className="sec-label" style={{margin:'4px 4px 8px'}}>Stock Overview</div>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px', marginBottom:'12px'}}>
        <div className="card" style={{textAlign:'center', padding:'14px 8px', margin:0}}>
          <div style={{
            width:'40px', height:'40px', borderRadius:'12px', background:'#FFA726',
            display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 8px'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
          </div>
          <div style={{fontSize:'9px', color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.5px'}}>Physical</div>
          <div style={{fontSize:'16px', fontWeight:800, color:'#D4A017', marginTop:'2px'}}>{(summary.total_physical_gold || 0).toFixed(3)}</div>
          <div style={{fontSize:'9px', color:'var(--text-3)'}}>grams</div>
        </div>

        <div className="card" style={{textAlign:'center', padding:'14px 8px', margin:0}}>
          <div style={{
            width:'40px', height:'40px', borderRadius:'12px', background:'#66BB6A',
            display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 8px'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div style={{fontSize:'9px', color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.5px'}}>Available</div>
          <div style={{fontSize:'16px', fontWeight:800, color:'var(--green)', marginTop:'2px'}}>{(summary.total_available_gold || 0).toFixed(3)}</div>
          <div style={{fontSize:'9px', color:'var(--text-3)'}}>grams</div>
        </div>

        <div className="card" style={{textAlign:'center', padding:'14px 8px', margin:0}}>
          <div style={{
            width:'40px', height:'40px', borderRadius:'12px', background:'#EF5350',
            display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 8px'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div style={{fontSize:'9px', color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.5px'}}>Have to Book</div>
          <div style={{fontSize:'16px', fontWeight:800, color:'var(--red)', marginTop:'2px'}}>{(summary.have_to_booked || 0).toFixed(3)}</div>
          <div style={{fontSize:'9px', color:'var(--text-3)'}}>grams</div>
        </div>
      </div>

      {/* Gold Purity Breakdown */}
      <div className="sec-label" style={{margin:'4px 4px 8px'}}>Gold — Purity Wise</div>
      <div className="card">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px'}}>
          <div style={{fontSize:'15px', fontWeight:800}}>Breakdown</div>
          <div style={{fontSize:'10px', fontWeight:700, color:'var(--text-3)', background:'var(--bg)', padding:'3px 10px', borderRadius:'10px'}}>
            {gold.filter(g => Math.abs(g.physical || 0) > 0.001).length} purities
          </div>
        </div>
        {gold.filter(g => Math.abs(g.physical || 0) > 0.001).map((g, i) => (
          <div key={g.purity} style={{marginBottom: i < gold.length - 1 ? '14px' : 0}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'6px'}}>
              <span style={{fontSize:'13px', fontWeight:700}}>{g.purity.toFixed(2)}</span>
              <span style={{fontSize:'13px', fontWeight:700, color: g.physical < 0 ? 'var(--red)' : 'var(--green)'}}>
                {g.physical.toFixed(3)} g
              </span>
            </div>
            <div style={{height:'6px', background:'var(--bg)', borderRadius:'3px', overflow:'hidden'}}>
              <div style={{
                height:'100%', borderRadius:'3px',
                width: `${Math.min(100, (Math.abs(g.physical)/maxGold)*100)}%`,
                background: g.physical < 0 ? 'var(--red)' : GOLD_COLORS_DARK[i % GOLD_COLORS_DARK.length],
                transition:'width 0.6s ease'
              }} />
            </div>
          </div>
        ))}
        {gold.filter(g => Math.abs(g.physical || 0) > 0.001).length === 0 && (
          <div style={{textAlign:'center', color:'var(--text-3)', fontSize:'12px', padding:'8px'}}>No gold stock</div>
        )}
      </div>

      {/* Silver Purity Breakdown */}
      <div className="sec-label" style={{margin:'12px 4px 8px'}}>Silver — Purity Wise</div>
      <div className="card">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px'}}>
          <div style={{fontSize:'15px', fontWeight:800}}>Breakdown</div>
          <div style={{fontSize:'10px', fontWeight:700, color:'var(--text-3)', background:'var(--bg)', padding:'3px 10px', borderRadius:'10px'}}>
            {silver.length} {silver.length === 1 ? 'purity' : 'purities'}
          </div>
        </div>
        {silver.filter(sl => Math.abs(sl.netStock || 0) > 0.001).map((sl, i) => (
          <div key={sl.purity} style={{marginBottom: i < silver.length - 1 ? '14px' : 0}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'6px'}}>
              <span style={{fontSize:'13px', fontWeight:700}}>{sl.purity.toFixed(2)}</span>
              <span style={{fontSize:'13px', fontWeight:700, color: sl.netStock < 0 ? 'var(--red)' : 'var(--text)'}}>
                {sl.netStock.toFixed(3)} g
              </span>
            </div>
            <div style={{height:'6px', background:'var(--bg)', borderRadius:'3px', overflow:'hidden'}}>
              <div style={{
                height:'100%', borderRadius:'3px',
                width: `${Math.min(100, (Math.abs(sl.netStock)/maxSilver)*100)}%`,
                background: sl.netStock < 0 ? 'var(--red)' : SILVER_COLORS_DARK[i % SILVER_COLORS_DARK.length],
                transition:'width 0.6s ease'
              }} />
            </div>
          </div>
        ))}
        {silver.filter(sl => Math.abs(sl.netStock || 0) > 0.001).length === 0 && (
          <div style={{textAlign:'center', color:'var(--text-3)', fontSize:'12px', padding:'8px'}}>No silver stock</div>
        )}
      </div>

      {/* Bottom Cards: Cash, Purchase Pending, Sales Pending */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginTop:'12px'}}>
        <div className="card" style={{margin:0, padding:'14px'}}>
          <div style={{
            width:'34px', height:'34px', borderRadius:'10px', background:'var(--green)',
            display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'8px',
            fontSize:'14px', fontWeight:800, color:'#fff'
          }}>₹</div>
          <div style={{fontSize:'9px', color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.5px'}}>Cash Available</div>
          <div style={{fontSize:'16px', fontWeight:800, color:'var(--green)', marginTop:'2px'}}>
            ₹{(summary.cash_in_hand || 0).toLocaleString('en-IN', {maximumFractionDigits:0})}
          </div>
        </div>

        <div className="card" style={{margin:0, padding:'14px'}}>
          <div style={{
            width:'34px', height:'34px', borderRadius:'10px', background:'#FFA726',
            display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'8px'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div style={{fontSize:'9px', color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.5px'}}>Purch. Pending</div>
          <div style={{fontSize:'16px', fontWeight:800, color:'#D4A017', marginTop:'2px'}}>
            {(summary.total_purchase_pending || 0).toFixed(3)}
          </div>
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginTop:'8px', marginBottom:'12px'}}>
        <div className="card" style={{margin:0, padding:'14px'}}>
          <div style={{
            width:'34px', height:'34px', borderRadius:'10px', background:'#E67E22',
            display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'8px'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div style={{fontSize:'9px', color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.5px'}}>Sales Pending</div>
          <div style={{fontSize:'16px', fontWeight:800, color:'#E67E22', marginTop:'2px'}}>
            {(summary.total_committed || 0).toFixed(3)}
          </div>
        </div>

        <div className="card" style={{
          margin:0, padding:'14px',
          background: lowStock ? 'var(--red-bg)' : 'var(--green-bg)',
          border: `1px solid ${lowStock ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`
        }}>
          <div style={{
            width:'34px', height:'34px', borderRadius:'10px',
            background: lowStock ? 'var(--red)' : 'var(--green)',
            display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'8px'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {lowStock ? (
                <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>
              ) : (
                <polyline points="20 6 9 17 4 12"/>
              )}
            </svg>
          </div>
          <div style={{fontSize:'9px', color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.5px'}}>Status</div>
          <div style={{fontSize:'13px', fontWeight:800, color: lowStock ? 'var(--red)' : 'var(--green)', marginTop:'2px'}}>
            {lowStock ? '⚠ Low Stock!' : '✓ Stock OK'}
          </div>
        </div>
      </div>
    </div>
  );
}