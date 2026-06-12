import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function CashScreen() {
  const [allEntries, setAllEntries] = useState([]);
  const [todayEntries, setTodayEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('cash_ledger')
      .select('*')
      .order('id', { ascending: false });

    if (!error && data) {
      setAllEntries(data);
      const today = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'2-digit' }).replace(/ /g,'-');
      const filtered = data.filter(e => e.date === today);
      setTodayEntries(filtered);
    }
    setLoading(false);
  };

  const balance = allEntries.reduce((s, e) => s + (e.total || 0), 0);
  

  return (
    <div>
      <div className="card" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div>
          <div className="sec-label">Cash Balance</div>
          <div style={{fontSize:'22px', fontWeight:800, color: balance >= 0 ? 'var(--green)' : 'var(--red)'}}>
            ₹{balance.toLocaleString('en-IN', {maximumFractionDigits:0})}
          </div>
        </div>
        
      </div>

      <div className="sec-label" style={{margin:'12px 4px 8px'}}>Today's Entries</div>

      {loading ? (
        [...Array(3)].map((_, i) => (
          <div className="skeleton-card" key={i}>
            <div className="skeleton-line w80"></div>
            <div className="skeleton-line w40"></div>
          </div>
        ))
      ) : todayEntries.length === 0 ? (
        <div className="card" style={{textAlign:'center', color:'var(--text-3)'}}>No entries today</div>
      ) : todayEntries.map(e => (
        <div key={e.id} className="card" style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px'}}>
          <div>
            <div style={{fontSize:'13px', fontWeight:600}}>{e.particulars || '—'}</div>
            <div style={{fontSize:'10px', color:'var(--text-3)', marginTop:'2px'}}>{e.date}</div>
          </div>
          <div style={{fontSize:'14px', fontWeight:700, color: e.type === 'IN' ? 'var(--green)' : 'var(--red)'}}>
            {e.type === 'IN' ? '+' : ''}₹{(e.total || 0).toLocaleString('en-IN')}
          </div>
        </div>
      ))}
    </div>
  );
}