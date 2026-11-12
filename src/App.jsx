import { useEffect, useState } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { api, auth } from './firebase';
import { errorText } from './format';
import Dashboard from './pages/Dashboard.jsx';
import Users from './pages/Users.jsx';
import BadResults from './pages/BadResults.jsx';
import Recent from './pages/Recent.jsx';

const TABS = [
  { id: 'dashboard', name: 'Overview' },
  { id: 'users', name: 'Users' },
  { id: 'bad', name: 'Bad results' },
  { id: 'recent', name: 'Latest designs' },
];

function Login({ message }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(message ?? '');

  const signIn = async () => {
    setBusy(true);
    setError('');
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (e) {
      setError(errorText(e));
    }
    setBusy(false);
  };

  return (
    <div className="center">
      <div className="box">
        <h1>HomeStage Back office</h1>
        <p>Only admins can come in.</p>
        <button className="primary" onClick={signIn} disabled={busy}>
          {busy ? 'Please wait…' : 'Sign in with Google'}
        </button>
        {error ? <div className="error">{error}</div> : null}
      </div>
    </div>
  );
}

function NoAccess({ email, onSignOut }) {
  return (
    <div className="center">
      <div className="box">
        <h1>No access</h1>
        <p>
          {email ? email + ' is not in the admin list.' : 'This account is not in the admin list.'} Ask the owner to
          add it.
        </p>
        <button className="ghost" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </div>
  );
}

function Shell({ email, onSignOut }) {
  const [tab, setTab] = useState(() => localStorage.getItem('bo.tab') || 'dashboard');
  const [toCheck, setToCheck] = useState(0);

  const openTab = (id) => {
    setTab(id);
    try {
      localStorage.setItem('bo.tab', id);
    } catch (e) {
      // the page works without it
    }
  };

  return (
    <div className="shell">
      <div className="top">
        <div className="brand">HomeStage Back office</div>
        <div className="tabs">
          {TABS.map((item) => (
            <button key={item.id} className={'tab' + (tab === item.id ? ' on' : '')} onClick={() => openTab(item.id)}>
              {item.name}
              {item.id === 'bad' && toCheck > 0 ? <span className="badge">{toCheck}</span> : null}
            </button>
          ))}
        </div>
        <div className="me">
          <span>{email}</span>
          <button className="ghost" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </div>
      <div className="page">
        {tab === 'dashboard' ? <Dashboard onToCheck={setToCheck} /> : null}
        {tab === 'users' ? <Users /> : null}
        {tab === 'bad' ? <BadResults onToCheck={setToCheck} /> : null}
        {tab === 'recent' ? <Recent /> : null}
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(undefined);
  const [access, setAccess] = useState('checking');

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (!user) {
      setAccess('checking');
      return;
    }
    setAccess('checking');
    api('me')
      .then(() => setAccess('yes'))
      .catch(() => setAccess('no'));
  }, [user]);

  const leave = () => signOut(auth);

  if (user === undefined) return <div className="spin">Loading…</div>;
  if (!user || user.isAnonymous) return <Login />;
  if (access === 'checking') return <div className="spin">Checking access…</div>;
  if (access === 'no') return <NoAccess email={user.email} onSignOut={leave} />;
  return <Shell email={user.email} onSignOut={leave} />;
}
