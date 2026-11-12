import { useEffect, useState } from 'react';
import { api } from '../firebase';
import { dateTime, errorText } from '../format';
import { useLoad } from '../useLoad';
import Design from '../components/Design.jsx';
import UserPanel from '../components/UserPanel.jsx';

const REASONS = {
  'room-changed': 'The room looks different',
  'door-or-window': 'Wrong door or window',
  furniture: 'Furniture looks wrong',
  other: 'Something else',
};

export default function BadResults({ onToCheck }) {
  const { data, error, loading, reload } = useLoad(() => api('feedback'), []);
  const [showDone, setShowDone] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState('');
  const [openUid, setOpenUid] = useState(null);

  const items = data?.items ?? [];
  const toCheck = items.filter((item) => item.status === 'new');
  const shown = showDone ? items.filter((item) => item.status !== 'new') : toCheck;

  useEffect(() => {
    if (data) onToCheck(toCheck.length);
  }, [data, toCheck.length, onToCheck]);

  const decide = async (item, decision) => {
    setBusyId(item.id);
    setMessage('');
    try {
      const result = await api('resolveFeedback', { id: item.id, decision });
      if (decision === 'refund') {
        setMessage(result.gaveBack ? 'Design given back to the person.' : 'Marked as refunded (there was nothing to give back).');
      }
      await reload();
    } catch (e) {
      setMessage('Error: ' + errorText(e));
    }
    setBusyId(null);
  };

  if (loading && !data) return <div className="spin">Loading…</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <>
      <div className="tools">
        <h2 style={{ margin: 0, alignSelf: 'center' }}>Bad results</h2>
        <button className={'tab' + (!showDone ? ' on' : '')} onClick={() => setShowDone(false)}>
          To check ({toCheck.length})
        </button>
        <button className={'tab' + (showDone ? ' on' : '')} onClick={() => setShowDone(true)}>
          Done
        </button>
        <button className="ghost" onClick={reload} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>
      {message ? <div className="muted" style={{ marginBottom: 12 }}>{message}</div> : null}

      {shown.length === 0 ? <div className="muted">Nothing here.</div> : null}
      <div className="grid">
        {shown.map((item) => (
          <Design
            key={item.id}
            onOpenUser={setOpenUid}
            project={{
              uid: item.uid,
              name: REASONS[item.reason] ?? 'No reason',
              styleId: item.plan,
              inputUri: item.inputUri,
              outputUri: item.outputUrl,
              createdAt: item.createdAt,
              notes: item.note,
              rating: 'down',
            }}
          >
            {item.status === 'new' ? (
              <div className="actions">
                <button className="ghost good" disabled={busyId === item.id} onClick={() => decide(item, 'refund')}>
                  Give design back
                </button>
                <button className="ghost danger" disabled={busyId === item.id} onClick={() => decide(item, 'reject')}>
                  Not bad
                </button>
              </div>
            ) : (
              <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
                {item.status === 'refunded' ? 'Given back' : 'Rejected'} · {dateTime(item.resolvedAt)} · {item.resolvedBy}
              </div>
            )}
          </Design>
        ))}
      </div>
      <p className="muted" style={{ marginTop: 16 }}>
        "Give design back" subtracts one used design from that person (free, subscription or pack, whichever the design
        used). Test accounts have nothing to give back.
      </p>

      {openUid ? <UserPanel uid={openUid} onClose={() => setOpenUid(null)} /> : null}
    </>
  );
}
