import { useState } from 'react';
import { api } from '../firebase';
import { dateTime, errorText } from '../format';
import { useLoad } from '../useLoad';
import Design from './Design.jsx';

function Fact({ label, value }) {
  return (
    <div className="fact">
      <div className="label">{label}</div>
      <div className="value">{value ?? '—'}</div>
    </div>
  );
}

function planText(plan) {
  if (!plan) return 'could not read';
  if (plan.tester) return 'test account (unlimited)';
  if (plan.unknown) return 'RevenueCat did not answer';
  const parts = [];
  if (plan.subscription) {
    parts.push(plan.subscription.productId + ': ' + plan.subscription.left + ' of ' + plan.subscription.total + ' left');
  }
  if (plan.packLeft > 0) parts.push(plan.packLeft + ' pack/gift left');
  if (plan.freeLeft > 0) parts.push('free design not used');
  return parts.length ? parts.join(' · ') : 'nothing left';
}

export default function UserPanel({ uid, onClose, onChanged }) {
  const { data, error, loading, reload } = useLoad(() => api('user', { uid }), [uid]);
  const [howMany, setHowMany] = useState('3');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const run = async (job, doneText) => {
    setBusy(true);
    setMessage('');
    try {
      await job();
      setMessage(doneText);
      await reload();
      onChanged?.();
    } catch (e) {
      setMessage('Error: ' + errorText(e));
    }
    setBusy(false);
  };

  const user = data?.user;

  return (
    <>
      <div className="shade" onClick={onClose} />
      <div className="panel">
        <div className="head">
          <h2>User</h2>
          <button className="ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="mono muted" style={{ marginBottom: 14, wordBreak: 'break-all' }}>
          {uid}
        </div>

        {loading && !data ? <div className="spin">Loading…</div> : null}
        {error ? <div className="error">{error}</div> : null}

        {data ? (
          <>
            <div className="facts">
              <Fact label="Plan now" value={planText(data.plan)} />
              <Fact label="Free used" value={user.free} />
              <Fact label="Subscription used" value={user.paid} />
              <Fact label="Pack/gift used" value={user.pack} />
              <Fact label="Gift given" value={user.gift} />
              <Fact label="Paid before" value={user.hasPaidBefore ? 'yes' : 'no'} />
              <Fact label="Account made" value={dateTime(data.account?.createdAt)} />
              <Fact label="Last design" value={dateTime(user.lastGenerationAt)} />
              <Fact label="Status" value={user.blocked ? 'BLOCKED' : 'active'} />
            </div>

            <h3>Actions</h3>
            <div className="gift">
              <input value={howMany} onChange={(e) => setHowMany(e.target.value)} inputMode="numeric" />
              <button
                className="primary"
                disabled={busy}
                onClick={() => run(() => api('gift', { uid, count: Number(howMany) }), 'Designs given.')}
              >
                Give designs
              </button>
              <button
                className={'ghost ' + (user.blocked ? 'good' : 'danger')}
                disabled={busy}
                onClick={() =>
                  run(
                    () => api('block', { uid, blocked: !user.blocked }),
                    user.blocked ? 'Unblocked.' : 'Blocked. This person cannot make designs.'
                  )
                }
              >
                {user.blocked ? 'Unblock' : 'Block'}
              </button>
            </div>
            {message ? <div className="muted" style={{ marginTop: 10 }}>{message}</div> : null}

            <h3>Designs ({data.projects.length})</h3>
            {data.projects.length === 0 ? <div className="muted">No saved designs.</div> : null}
            <div className="grid">
              {data.projects.map((project) => (
                <Design key={project.id} project={project} />
              ))}
            </div>

            {data.feedback.length > 0 ? (
              <>
                <h3>Ratings</h3>
                {data.feedback.map((item) => (
                  <div className="note" key={item.id}>
                    {item.rating === 'up' ? '👍' : '👎'} {item.reason ?? ''} {item.note} — {item.status}
                  </div>
                ))}
              </>
            ) : null}
          </>
        ) : null}
      </div>
    </>
  );
}
