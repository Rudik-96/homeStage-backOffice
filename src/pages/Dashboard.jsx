import { useEffect } from 'react';
import { api } from '../firebase';
import { useLoad } from '../useLoad';

function Card({ label, value, hint }) {
  return (
    <div className="card">
      <div className="label">{label}</div>
      <div className="value">{value ?? '—'}</div>
      {hint ? <div className="hint">{hint}</div> : null}
    </div>
  );
}

function Bars({ items, valueKey }) {
  const max = Math.max(1, ...items.map((item) => item[valueKey]));
  return (
    <div className="bars">
      {items.map((item) => (
        <div className="bar" key={item.day} title={item.day + ': ' + item[valueKey]}>
          <div className="n">{item[valueKey]}</div>
          <div className="fill" style={{ height: (item[valueKey] / max) * 85 + '%' }} />
          <div className="d">{item.day.slice(5)}</div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard({ onToCheck }) {
  const { data, error, loading, reload } = useLoad(() => api('stats'), []);

  useEffect(() => {
    if (data) onToCheck(data.feedback.toCheck);
  }, [data, onToCheck]);

  if (loading && !data) return <div className="spin">Loading…</div>;
  if (error) return <div className="error">{error}</div>;

  const spentAll = data.spent.free + data.spent.paid + data.spent.pack;

  return (
    <>
      <div className="tools">
        <h2 style={{ flex: 1, margin: 0 }}>Overview</h2>
        <button className="ghost" onClick={reload} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      <h3>People</h3>
      <div className="cards">
        <Card label="All accounts (opened the app)" value={data.accounts} />
        <Card label="Made at least 1 design" value={data.madeDesigns} />
        <Card label="Paying" value={data.paying} hint="paid before and made a design" />
        <Card label="Free" value={data.free} hint="made a design, never paid" />
        <Card label="Test accounts" value={data.testers} />
        <Card label="Blocked" value={data.blocked} />
      </div>

      <h3>Designs</h3>
      <div className="cards">
        <Card label="Designs made (all time)" value={data.designsDone} />
        <Card label="Free designs used" value={data.spent.free} />
        <Card label="Subscription designs used" value={data.spent.paid} />
        <Card label="Pack and gift designs used" value={data.spent.pack} hint={'all counted: ' + spentAll} />
      </div>

      <h3>How people rate</h3>
      <div className="cards">
        <Card label="👍 Good" value={data.feedback.up} />
        <Card label="👎 Bad" value={data.feedback.down} />
        <Card label="Bad, not checked yet" value={data.feedback.toCheck} />
      </div>

      <div className="charts">
        <div className="card">
          <div className="label">Designs per day (last 14 days)</div>
          {data.perDay ? (
            <Bars items={data.perDay} valueKey="designs" />
          ) : (
            <div className="muted" style={{ marginTop: 12 }}>
              The database is still building this view. Check again in a few minutes.
            </div>
          )}
        </div>
        <div className="card">
          <div className="label">New accounts per day (last 14 days)</div>
          <Bars items={data.signups} valueKey="accounts" />
        </div>
      </div>
      <p className="muted" style={{ marginTop: 16 }}>
        Days are counted in Yerevan time. Tester designs are in "Designs made" but not in the used counters.
      </p>
    </>
  );
}
