import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function StatementScreen() {
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState('');
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
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
    if (!customerName) { setSales([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('saleslog')
      .select('*')
      .eq('customer_name', customerName)
      .order('id', { ascending: false });
    if (!error && data) setSales(data);
    setLoading(false);
  };

  const totalOS = sales.reduce((s, e) => s + ((e.amt_os || 0) - (e.part_received || 0) - (e.due_balance || 0)), 0);
  const totalGross = sales.reduce((s, e) => s + (e.gross_amount || 0), 0);
  const totalReceived = sales.reduce((s, e) => s + (e.amt_received || 0) + (e.part_received || 0), 0);

  return (
    <div>
      <div className="card">
        <div className="sec-label">Select Customer</div>
        <select
          value={selected}
          onChange={(e) => fetchStatement(e.target.value)}
          style={{
            width:'100%', padding:'11px 13px', background:'var(--bg)',
            border:'1.5px solid var(--border-strong)', borderRadius:'var(--radius)',
            fontSize:'14px', color:'var(--text)', outline:'none', appearance:'none'
          }}
        >
          <option value="">— Choose Customer —</option>
          {customers.map(c => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>
      </div>

      {selected && !loading && (
        <div className="card" style={{display:'flex', justifyContent:'space-between'}}>
          <div>
            <div className="sec-label">Outstanding</div>
            <div style={{fontSize:'18px', fontWeight:800, color: totalOS > 0 ? 'var(--red)' : 'var(--green)'}}>
              ₹{totalOS.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      )}

      {loading && [...Array(3)].map((_, i) => (
        <div className="skeleton-card" key={i}>
          <div className="skeleton-line w80"></div>
          <div className="skeleton-line w50"></div>
        </div>
      ))}

      {selected && !loading && (
        <>
          <div className="sec-label" style={{margin:'12px 4px 8px'}}>Transaction History</div>
          {sales.length === 0 ? (
            <div className="card" style={{textAlign:'center', color:'var(--text-3)'}}>No transactions found</div>
          ) : sales.map(s => (
            <div key={s.id} className="card" style={{padding:'12px 16px'}}>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <div style={{fontSize:'10px', color:'var(--text-3)'}}>{s.date_time}</div>
                <div style={{fontSize:'10px', color:'var(--text-2)'}}>{s.metal}</div>
              </div>
              <div style={{display:'flex', justifyContent:'space-between', marginTop:'6px', fontSize:'13px'}}>
                <span>Weight: <strong>{s.weight} g</strong></span>
                <span>Amount: <strong>₹{(s.gross_amount || 0).toLocaleString('en-IN')}</strong></span>
              </div>
              <div style={{display:'flex', justifyContent:'space-between', marginTop:'4px', fontSize:'12px'}}>
                <span style={{color:'var(--green)'}}>Received: ₹{((s.amt_received||0)+(s.part_received||0)).toLocaleString('en-IN')}</span>
                <span style={{color: ((s.amt_os||0)-(s.part_received||0)-(s.due_balance||0)) > 0 ? 'var(--red)' : 'var(--text-3)', fontWeight:700}}>
                  O/S: ₹{((s.amt_os||0)-(s.part_received||0)-(s.due_balance||0)).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}