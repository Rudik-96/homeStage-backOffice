import { useState } from 'react';
import { api } from '../firebase';
import { useLoad } from '../useLoad';
import Design from '../components/Design.jsx';
import UserPanel from '../components/UserPanel.jsx';

export default function Recent() {
  const { data, error, loading, reload } = useLoad(() => api('recent'), []);
  const [openUid, setOpenUid] = useState(null);

  if (loading && !data) return <div className="spin">Loading…</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <>
      <div className="tools">
        <h2 style={{ flex: 1, margin: 0 }}>Latest designs</h2>
        <button className="ghost" onClick={reload} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>
      <div className="grid">
        {data.projects.map((project) => (
          <Design key={project.uid + project.id} project={project} onOpenUser={setOpenUid} />
        ))}
      </div>
      {data.projects.length === 0 ? <div className="muted">No designs yet.</div> : null}
      <p className="muted" style={{ marginTop: 16 }}>
        The last 40 designs that people saved. Click the user id to see everything that person did.
      </p>

      {openUid ? <UserPanel uid={openUid} onClose={() => setOpenUid(null)} /> : null}
    </>
  );
}
