import { useMemo, useState } from 'react';
import { api } from '../firebase';
import { shortId, timeAgo } from '../format';
import { useLoad } from '../useLoad';
import UserPanel from '../components/UserPanel.jsx';

function Kind({ user }) {
  if (user.blocked) return <span className="pill blocked">blocked</span>;
  if (user.plan === 'paid') return <span className="pill test">test</span>;
  if (user.hasPaidBefore) return <span className="pill paid">paying</span>;
  return <span className="pill">free</span>;
}

export default function Users() {
  const { data, error, loading, reload } = useLoad(() => api('users'), []);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [openUid, setOpenUid] = useState(null);

  const rows = useMemo(() => {
    const list = data?.users ?? [];
    const text = search.trim().toLowerCase();
    return list.filter((user) => {
      if (text && !user.uid.toLowerCase().includes(text)) return false;
      if (filter === 'paying') return user.hasPaidBefore;
      if (filter === 'free') return !user.hasPaidBefore && user.plan !== 'paid';
      if (filter === 'blocked') return user.blocked;
      return true;
    });
  }, [data, search, filter]);

  if (loading && !data) return <div className="spin">Loading…</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <>
      <div className="tools">
        <h2 style={{ margin: 0, alignSelf: 'center' }}>Users who made designs ({rows.length})</h2>
        <input className="search" placeholder="Search by user id" value={search} onChange={(e) => setSearch(e.target.value)} />
        {['all', 'paying', 'free', 'blocked'].map((name) => (
          <button key={name} className={'tab' + (filter === name ? ' on' : '')} onClick={() => setFilter(name)}>
            {name}
          </button>
        ))}
        <button className="ghost" onClick={reload} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Kind</th>
              <th>Free used</th>
              <th>Subscription used</th>
              <th>Pack/gift used</th>
              <th>Gift given</th>
              <th>Last design</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((user) => (
              <tr key={user.uid} onClick={() => setOpenUid(user.uid)}>
                <td className="mono">{shortId(user.uid)}</td>
                <td>
                  <Kind user={user} />
                </td>
                <td>{user.free}</td>
                <td>{user.paid}</td>
                <td>{user.pack}</td>
                <td>{user.gift}</td>
                <td>{timeAgo(user.lastGenerationAt)}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="muted">
                  Nobody here.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ marginTop: 12 }}>
        People appear here after their first design. "Paying" means they had a plan or a pack when they made a design.
      </p>

      {openUid ? <UserPanel uid={openUid} onClose={() => setOpenUid(null)} onChanged={reload} /> : null}
    </>
  );
}
