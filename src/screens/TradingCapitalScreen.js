import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function TradingCapitalScreen() {
  const [summary, setSummary] = useState(null);
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('capital_pwa')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'capital_summary' }, () => { fetchSummary(); })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'capital_parties' }, (payload) => {
        setParties(prev => prev.find(p => p.id === payload.new.id) ? prev : [...prev, payload.new]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'capital_parties' }, (payload) => {
        setParties(prev => prev.map(p => p.id === payload.new.id ? payload.new : p));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'capital_parties' }, (payload) => {
        setParties(prev => prev.filter(p => p.id !== payload.old.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSummary = async () => {
    const { data, error } = await supabase.from('capital_summary').select('*').eq('id', 1).single();
    if (!error && data) setSummary(data);
  };

  const fetchData = async () => {
    setLoading(true);
    await fetchSummary();
    const { data: partyData, error } = await supabase.from('capital_parties').select('*');
    if (!error && partyData) setParties(partyData);
    setLoading(false);
  };

  const fmt = (n) => '₹' + Math.round(n || 0).toLocaleString('en-IN');
  const baseCapital = summary?.base_capital || 0;
  const journalPnl = summary?.journal_pnl || 0;
  const netMovement = summary?.net_movement || 0;
  const fromBase = journalPnl + netMovement;

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
    return <div className="card" style={{ textAlign: 'center', color: 'var(--text-3)' }}>No data found</div>;
  }

  return (
    <div>
      {/* HERO: Base vs Updated Capital */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div className="card" style={{ margin: 0 }}>
          <div className="sec-label">Base Capital</div>
          <div style={{ fontSize: '19px', fontWeight: 800, color: 'var(--gold)' }}>{fmt(baseCapital)}</div>
        </div>
        <div className="card" style={{ margin: 0 }}>
          <div className="sec-label">Updated Capital</div>
          <div style={{ fontSize: '19px', fontWeight: 800, color: 'var(--text)' }}>{fmt(summary.updated_capital)}</div>
          <div style={{ fontSize: '10px', marginTop: '4px', fontWeight: 700, color: fromBase >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {fromBase >= 0 ? '▲' : '▼'} {fmt(Math.abs(fromBase))} from base
          </div>
        </div>
      </div>

      {/* BREAKDOWN */}
      <div className="sec-label" style={{ margin: '14px 4px 8px' }}>Breakdown</div>
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '10px', color: 'var(--text-3)', fontWeight: 600 }}>Profit / Loss</div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: journalPnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {journalPnl >= 0 ? '+' : ''}{fmt(journalPnl)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-3)', fontWeight: 600 }}>Addition / Withdrawal</div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--blue)' }}>
            {netMovement >= 0 ? '+' : ''}{fmt(netMovement)}
          </div>
        </div>
      </div>

      {/* PARTY BIFURCATION */}
      <div className="sec-label" style={{ margin: '14px 4px 8px' }}>Party Bifurcation</div>
      {parties.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-3)', padding: '20px' }}>Koi party nahi mili</div>
      ) : parties.map(p => {
        const share = baseCapital > 0 ? ((parseFloat(p.amount) || 0) / baseCapital * 100) : 0;
        return (
          <div key={p.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'var(--gold-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: 'var(--gold)' }}>
                {p.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{p.name}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>{share.toFixed(1)}% share</div>
              </div>
            </div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text)' }}>{fmt(p.amount)}</div>
          </div>
        );
      })}
    </div>
  );
}