import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const todayStr = () => new Date().toISOString().split('T')[0];
const emptyForm = { date: todayStr(), fromId: '', fromOther: '', toId: '', toOther: '', amount: '', note: '', d500: '', d200: '', d100: '', d50: '', d20: '', d10: '' };

const DENOMS = [500, 200, 100, 50, 20, 10];
const calcDenomTotal = (form) => DENOMS.reduce((sum, d) => sum + ((parseFloat(form[`d${d}`]) || 0) * d), 0);

// Matches KanlaERP's Cash Ledger date convention (e.g. "23-Jul-26")
const toCashDate = (isoDate) => {
  const d = new Date(isoDate);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-');
};

export default function BankTranScreen() {
  const [accounts, setAccounts] = useState([]);
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAccounts, setShowAccounts] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('bank_pwa')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bank_accounts' }, (payload) => {
        setAccounts(prev => prev.find(a => a.id === payload.new.id) ? prev : [...prev, payload.new]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bank_accounts' }, (payload) => {
        setAccounts(prev => prev.map(a => a.id === payload.new.id ? payload.new : a));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'bank_accounts' }, (payload) => {
        setAccounts(prev => prev.filter(a => a.id !== payload.old.id));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bank_transactions' }, (payload) => {
        setTxns(prev => prev.find(t => t.id === payload.new.id) ? prev : [payload.new, ...prev]);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'bank_transactions' }, (payload) => {
        setTxns(prev => prev.filter(t => t.id !== payload.old.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: accData } = await supabase.from('bank_accounts').select('*');
    if (accData) setAccounts(accData);
    const { data: txnData } = await supabase.from('bank_transactions').select('*').order('id', { ascending: false });
    if (txnData) setTxns(txnData);
    setLoading(false);
  };

  const fmt = (n) => '₹' + Math.round(n || 0).toLocaleString('en-IN');
  const isTradingAcc = (acc) => /trading/i.test(`${acc.holder_name} ${acc.bank_name}`);
  const accountLabel = (acc) => `${acc.holder_name} — ${acc.bank_name} (••${String(acc.account_no).slice(-4)})`;

  const accountBalance = (accId) => {
    const acc = accounts.find(a => a.id === accId);
    if (!acc) return 0;
    const incoming = txns.filter(t => t.to_acc_id === accId).reduce((s, t) => s + (t.amount || 0), 0);
    const outgoing = txns.filter(t => t.from_acc_id === accId).reduce((s, t) => s + (t.amount || 0), 0);
    return (parseFloat(acc.opening_balance) || 0) + incoming - outgoing;
  };

  const totalBalance = accounts.reduce((s, a) => s + accountBalance(a.id), 0);

  const simpleLabel = (acc) => `${acc.holder_name} (${acc.bank_name})`;

  const handleSave = async () => {
    const involvesCash = form.fromId === 'cash' || form.toId === 'cash';
    const amount = involvesCash ? calcDenomTotal(form) : parseFloat(form.amount);
    if (!amount) { setError(involvesCash ? 'Koi denomination nahi dali!' : 'Amount daalo!'); return; }

    const fromAcc = (form.fromId && form.fromId !== 'other' && form.fromId !== 'cash') ? accounts.find(a => a.id === parseInt(form.fromId)) : null;
    const toAcc = (form.toId && form.toId !== 'other' && form.toId !== 'cash') ? accounts.find(a => a.id === parseInt(form.toId)) : null;
    const fromLabel = form.fromId === 'cash' ? 'Cash' : form.fromId === 'other' ? form.fromOther.trim() : (fromAcc ? accountLabel(fromAcc) : '');
    const toLabel = form.toId === 'cash' ? 'Cash' : form.toId === 'other' ? form.toOther.trim() : (toAcc ? accountLabel(toAcc) : '');
    if (!fromLabel || !toLabel) { setError('From aur To dono select/bharo!'); return; }

    setError('');
    setSaving(true);
    const entry = {
      id: Date.now(),
      date: form.date,
      from_acc_id: fromAcc ? fromAcc.id : null,
      to_acc_id: toAcc ? toAcc.id : null,
      from_label: fromLabel,
      to_label: toLabel,
      amount,
      note: form.note,
    };
    const { error: insertError } = await supabase.from('bank_transactions').insert(entry);
    if (insertError) {
      console.error('Insert error:', insertError);
      setError(`Save nahi hua: ${insertError.message || 'dobara try karo'}`);
      setSaving(false);
      return;
    }

    setTxns(prev => [entry, ...prev]);

    // Cash involved → auto-create the matching Cash Ledger entry in Supabase
    if (involvesCash) {
      const isWithdraw = form.toId === 'cash'; // bank → cash = withdrawal = Cash Ledger IN
      const otherAcc = isWithdraw ? fromAcc : toAcc;
      const otherLabel = otherAcc ? simpleLabel(otherAcc) : (isWithdraw ? form.fromOther : form.toOther) || 'Account';
      const type = isWithdraw ? 'IN' : 'OUT';
      const sign = isWithdraw ? 1 : -1;
      const cashEntry = {
        id: Date.now() + 1,
        date: toCashDate(form.date),
        particulars: `${otherLabel} & ${isWithdraw ? 'Withdraw' : 'Deposit'}`,
        type,
        d500: sign * (parseFloat(form.d500) || 0),
        d200: sign * (parseFloat(form.d200) || 0),
        d100: sign * (parseFloat(form.d100) || 0),
        d50: sign * (parseFloat(form.d50) || 0),
        d20: sign * (parseFloat(form.d20) || 0),
        d10: sign * (parseFloat(form.d10) || 0),
        total: sign * amount,
      };
      const { error: cashError } = await supabase.from('cash_ledger').insert(cashEntry);
      if (cashError) console.error('Cash ledger insert error:', cashError);
    }

    setForm({ ...emptyForm });
    setShowModal(false);
    setSaving(false);
  };

  const handleDelete = async (id) => {
    const { error: delError } = await supabase.from('bank_transactions').delete().eq('id', id);
    if (!delError) {
      setTxns(prev => prev.filter(t => t.id !== id));
    } else {
      console.error('Delete error:', delError);
    }
  };

  const inp = {
    width: '100%', padding: '9px 10px',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px', fontSize: '13px', color: 'var(--text)', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'Inter, sans-serif',
  };
  const lbl = { fontSize: '10px', color: 'var(--text-2)', fontWeight: '700', marginBottom: '4px' };

  return (
    <div>
      {/* TOTAL BALANCE + NEW TRANSACTION */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="sec-label">Total Balance</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: totalBalance >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {fmt(totalBalance)}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '3px' }}>{accounts.length} accounts</div>
        </div>
        <button onClick={() => { setShowModal(true); setForm({ ...emptyForm }); setError(''); }}
          style={{ padding: '9px 16px', background: 'var(--gold)', color: '#000', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
          + New Transaction
        </button>
      </div>

      {/* ACCOUNTS (collapsible, view only) */}
      <div onClick={() => setShowAccounts(!showAccounts)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 4px 8px', cursor: 'pointer' }}>
        <span className="sec-label" style={{ margin: 0 }}>Bank Accounts ({accounts.length})</span>
        <span style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 700 }}>{showAccounts ? '▲ Hide' : '▼ Show'}</span>
      </div>
      {showAccounts && (loading ? (
        [...Array(2)].map((_, i) => (
          <div className="skeleton-card" key={i}>
            <div className="skeleton-line w80"></div>
            <div className="skeleton-line w40"></div>
          </div>
        ))
      ) : accounts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-3)', padding: '20px' }}>Koi bank account nahi mila</div>
      ) : accounts.map(a => {
        const bal = accountBalance(a.id);
        const trading = isTradingAcc(a);
        return (
          <div key={a.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {a.holder_name}
                {trading && <span style={{ fontSize: '8px', fontWeight: 700, color: 'var(--gold)', background: 'var(--gold-dim)', padding: '1px 6px', borderRadius: '8px' }}>💹 Trading</span>}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '2px' }}>{a.bank_name} · ••{String(a.account_no).slice(-4)}</div>
            </div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: bal >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(bal)}</div>
          </div>
        );
      }))}

      {/* TRANSACTIONS */}
      <div className="sec-label" style={{ margin: '14px 4px 8px' }}>Transfer Records</div>
      {loading ? (
        [...Array(3)].map((_, i) => (
          <div className="skeleton-card" key={i}>
            <div className="skeleton-line w80"></div>
            <div className="skeleton-line w50"></div>
          </div>
        ))
      ) : txns.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-3)', padding: '20px' }}>
          <div style={{ fontSize: '24px', marginBottom: '6px' }}>🔁</div>
          <div style={{ fontSize: '12px' }}>Koi transfer record nahi hai</div>
        </div>
      ) : txns.map(t => (
        <div key={t.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
          <div>
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text)' }}>
              {t.from_label} <span style={{ color: 'var(--gold)' }}>→</span> {t.to_label}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '2px' }}>{t.date}{t.note ? ` · ${t.note}` : ''}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--blue)' }}>{fmt(t.amount)}</div>
            <button onClick={() => handleDelete(t.id)} style={{ background: 'var(--red-bg)', color: 'var(--red)', border: 'none', borderRadius: '6px', width: '24px', height: '24px', fontSize: '11px', cursor: 'pointer', flexShrink: 0 }}>✕</button>
          </div>
        </div>
      ))}

      {/* NEW TRANSACTION MODAL */}
      {showModal && (
        <div onClick={() => setShowModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--card)', borderRadius: '20px 20px 0 0', padding: '20px 18px calc(20px + env(safe-area-inset-bottom))', width: '100%', maxWidth: '480px', boxShadow: '0 -8px 32px rgba(0,0,0,0.4)', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text)' }}>🔁 New Transaction</div>
              <button onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '8px', width: '28px', height: '28px', color: 'var(--text-3)', fontSize: '13px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <div style={lbl}>DATE</div>
              <input type="date" style={inp} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <div style={lbl}>FROM</div>
              <select style={inp} value={form.fromId} onChange={e => setForm({ ...form, fromId: e.target.value })}>
                <option value="">Select account</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{accountLabel(a)}</option>)}
                <option value="cash">💵 Cash</option>
                <option value="other">Other / Not listed</option>
              </select>
            </div>
            {form.fromId === 'other' && (
              <div style={{ marginBottom: '10px' }}>
                <div style={lbl}>FROM (naam likho)</div>
                <input style={inp} value={form.fromOther} onChange={e => setForm({ ...form, fromOther: e.target.value })} placeholder="e.g. Papa's SBI A/c" />
              </div>
            )}

            <div style={{ marginBottom: '10px' }}>
              <div style={lbl}>TO</div>
              <select style={inp} value={form.toId} onChange={e => setForm({ ...form, toId: e.target.value })}>
                <option value="">Select account</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{accountLabel(a)}</option>)}
                <option value="cash">💵 Cash</option>
                <option value="other">Other / Not listed</option>
              </select>
            </div>
            {form.toId === 'other' && (
              <div style={{ marginBottom: '10px' }}>
                <div style={lbl}>TO (naam likho)</div>
                <input style={inp} value={form.toOther} onChange={e => setForm({ ...form, toOther: e.target.value })} placeholder="e.g. Papa's SBI A/c" />
              </div>
            )}

            {(form.fromId === 'cash' || form.toId === 'cash') ? (
              <div style={{ marginBottom: '10px' }}>
                <div style={lbl}>DENOMINATION (notes count)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                  {DENOMS.map(d => (
                    <div key={d}>
                      <div style={{ fontSize: '10px', color: 'var(--text-3)', marginBottom: '3px', fontWeight: '600' }}>₹{d} notes</div>
                      <input type="number" inputMode="numeric" style={{ ...inp, textAlign: 'center' }} value={form[`d${d}`]} onChange={e => setForm({ ...form, [`d${d}`]: e.target.value })} placeholder="0" />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '8px', background: 'var(--gold-dim)' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-2)' }}>{form.toId === 'cash' ? '💵 Cash Withdrawal' : '🏦 Cash Deposit'}</span>
                  <span style={{ fontSize: '17px', fontWeight: '800', color: 'var(--gold)' }}>₹{calcDenomTotal(form).toLocaleString('en-IN')}</span>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: '10px' }}>
                <div style={lbl}>AMOUNT (₹)</div>
                <input type="number" inputMode="numeric" style={inp} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="50000" />
              </div>
            )}

            <div style={{ marginBottom: '14px' }}>
              <div style={lbl}>NOTE (optional)</div>
              <input style={inp} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="e.g. Capital transfer" />
            </div>

            {error && (
              <div style={{ padding: '8px 10px', background: 'var(--red-bg)', borderRadius: '6px', fontSize: '11px', color: 'var(--red)', marginBottom: '10px', fontWeight: '600' }}>⚠️ {error}</div>
            )}

            <button onClick={handleSave} disabled={saving} style={{
              width: '100%', padding: '13px', background: saving ? 'var(--text-3)' : 'var(--gold)',
              color: '#000', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}>
              {saving ? '⏳ Saving...' : '✓ Save Transaction'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}