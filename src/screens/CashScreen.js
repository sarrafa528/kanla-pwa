import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const DENOMS = [500, 200, 100, 50, 20, 10];

const emptyForm = {
  particulars: '',
  type: 'IN',
  d500: '', d200: '', d100: '', d50: '', d20: '', d10: '',
};

function calcTotal(form) {
  return DENOMS.reduce((sum, d) => sum + ((parseFloat(form[`d${d}`]) || 0) * d), 0);
}

export default function CashScreen() {
  const [allEntries, setAllEntries] = useState([]);
  const [todayEntries, setTodayEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: '2-digit'
  }).replace(/ /g, '-');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('cash_ledger')
        .select('*')
        .order('id', { ascending: false });

      if (!error && data) {
        setAllEntries(data);
        setTodayEntries(data.filter(e => e.date === today));
      }
      setLoading(false);
    };
    fetchData();
  }, [today]);

  const balance = allEntries.reduce((s, e) => s + (e.total || 0), 0);
  const netTotal = calcTotal(form);

  const handleSave = async () => {
    if (!form.particulars.trim()) { setError('Particulars daalo!'); return; }
    if (netTotal === 0) { setError('Koi denomination nahi dali!'); return; }
    setError('');
    setSaving(true);

    const isOut = form.type === 'OUT';
    const entry = {
      id: Date.now(),
      date: today,
      particulars: form.particulars.trim(),
      type: form.type,
      d500: isOut ? -(Math.abs(parseFloat(form.d500) || 0)) : (parseFloat(form.d500) || 0),
      d200: isOut ? -(Math.abs(parseFloat(form.d200) || 0)) : (parseFloat(form.d200) || 0),
      d100: isOut ? -(Math.abs(parseFloat(form.d100) || 0)) : (parseFloat(form.d100) || 0),
      d50:  isOut ? -(Math.abs(parseFloat(form.d50)  || 0)) : (parseFloat(form.d50)  || 0),
      d20:  isOut ? -(Math.abs(parseFloat(form.d20)  || 0)) : (parseFloat(form.d20)  || 0),
      d10:  isOut ? -(Math.abs(parseFloat(form.d10)  || 0)) : (parseFloat(form.d10)  || 0),
      total: isOut ? -Math.abs(netTotal) : Math.abs(netTotal),
    };

    const { error: insertError } = await supabase
      .from('cash_ledger')
      .insert(entry);

    if (insertError) {
      setError('Save nahi hua, dobara try karo');
    } else {
      setAllEntries(prev => [entry, ...prev]);
      setTodayEntries(prev => [entry, ...prev]);
      setForm({ ...emptyForm });
      setShowForm(false);
    }
    setSaving(false);
  };

  const inp = {
    width: '100%',
    padding: '9px 10px',
    background: 'var(--bg)',
    border: '1.5px solid var(--border-strong)',
    borderRadius: '8px',
    fontSize: '13px',
    color: 'var(--text)',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div>
      {/* BALANCE CARD */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="sec-label">Cash Balance</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: balance >= 0 ? 'var(--green)' : 'var(--red)' }}>
            ₹{balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setForm({ ...emptyForm }); setError(''); }}
          style={{
            padding: '9px 16px',
            background: showForm ? 'var(--bg)' : 'var(--gold)',
            color: showForm ? 'var(--text)' : '#000',
            border: showForm ? '1.5px solid var(--border-strong)' : 'none',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: '700',
            cursor: 'pointer',
          }}
        >
          {showForm ? '✕ Cancel' : '+ New Entry'}
        </button>
      </div>

      {/* NEW ENTRY FORM */}
      {showForm && (
        <div className="card" style={{ border: '1.5px solid var(--gold-border)', background: 'var(--gold-bg)' }}>
          <div className="sec-label" style={{ marginBottom: '10px' }}>New Cash Entry</div>

          {/* Particulars */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-2)', fontWeight: '700', marginBottom: '4px' }}>PARTICULARS *</div>
            <input
              type="text"
              placeholder="e.g. Sale Receipt, Purchase Payment..."
              value={form.particulars}
              onChange={e => setForm({ ...form, particulars: e.target.value })}
              style={inp}
            />
          </div>

          {/* Type */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-2)', fontWeight: '700', marginBottom: '6px' }}>TYPE</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['IN', 'OUT'].map(t => (
                <button
                  key={t}
                  onClick={() => setForm({ ...form, type: t })}
                  style={{
                    flex: 1, padding: '8px',
                    background: form.type === t ? (t === 'IN' ? '#E8F5E9' : '#FFEBEE') : 'var(--bg)',
                    color: form.type === t ? (t === 'IN' ? 'var(--green)' : 'var(--red)') : 'var(--text-3)',
                    border: `1.5px solid ${form.type === t ? (t === 'IN' ? 'var(--green)' : 'var(--red)') : 'var(--border)'}`,
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  {t === 'IN' ? '↓ IN' : '↑ OUT'}
                </button>
              ))}
            </div>
          </div>

          {/* Denominations */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-2)', fontWeight: '700', marginBottom: '6px' }}>DENOMINATION (notes count)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {DENOMS.map(d => (
                <div key={d}>
                  <div style={{ fontSize: '10px', color: 'var(--text-3)', marginBottom: '3px', fontWeight: '600' }}>₹{d} notes</div>
                  <input
                    type="number"
                    placeholder="0"
                    value={form[`d${d}`]}
                    onChange={e => setForm({ ...form, [`d${d}`]: e.target.value })}
                    style={{ ...inp, textAlign: 'center' }}
                    inputMode="numeric"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 12px', borderRadius: '8px',
            background: netTotal > 0 ? (form.type === 'IN' ? '#E8F5E9' : '#FFEBEE') : 'var(--bg)',
            marginBottom: '10px',
          }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-2)' }}>Total Amount</span>
            <span style={{ fontSize: '18px', fontWeight: '800', color: form.type === 'IN' ? 'var(--green)' : 'var(--red)' }}>
              {form.type === 'OUT' ? '-' : ''}₹{Math.abs(netTotal).toLocaleString('en-IN')}
            </span>
          </div>

          {error && (
            <div style={{ padding: '8px 10px', background: '#FFEBEE', borderRadius: '6px', fontSize: '11px', color: 'var(--red)', marginBottom: '8px', fontWeight: '600' }}>
              ⚠️ {error}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: '100%', padding: '12px',
              background: saving ? 'var(--text-3)' : 'var(--gold)',
              color: '#000', border: 'none', borderRadius: '10px',
              fontSize: '13px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? '⏳ Saving...' : '✓ Save Entry'}
          </button>
        </div>
      )}

      {/* TODAY'S ENTRIES */}
      <div className="sec-label" style={{ margin: '12px 4px 8px' }}>Today's Entries</div>

      {loading ? (
        [...Array(3)].map((_, i) => (
          <div className="skeleton-card" key={i}>
            <div className="skeleton-line w80"></div>
            <div className="skeleton-line w40"></div>
          </div>
        ))
      ) : todayEntries.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-3)', padding: '24px' }}>
          <div style={{ fontSize: '24px', marginBottom: '6px' }}>💵</div>
          <div style={{ fontSize: '12px' }}>Aaj koi entry nahi</div>
        </div>
      ) : todayEntries.map(e => (
        <div key={e.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{e.particulars || '—'}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '2px' }}>
              {e.date} &nbsp;·&nbsp;
              <span style={{ color: e.type === 'IN' ? 'var(--green)' : 'var(--red)', fontWeight: '700' }}>{e.type}</span>
            </div>
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: e.type === 'IN' ? 'var(--green)' : 'var(--red)' }}>
            {e.type === 'IN' ? '+' : '-'}₹{Math.abs(e.total || 0).toLocaleString('en-IN')}
          </div>
        </div>
      ))}
    </div>
  );
}