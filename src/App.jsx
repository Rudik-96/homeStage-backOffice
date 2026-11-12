import { useEffect, useState } from 'react';
import { api, savePassword, savedPassword } from './firebase';
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

function Login({ onDone }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("me", {}, password);
      savePassword(password);
      onDone();
    } catch (e) {
      setError(errorText(e));
    }
    setBusy(false);
  };

  return (
    <div className="center">
      <form className="box" onSubmit={submit}>
        <h1>HomeStage Back office</h1>
        <p>Enter the password.</p>
        <input
          className="search"
          type="password"
          autoFocus
          autoComplete="current-password"
          placeholder="Password"
          style={{ width: "100%", marginBottom: 12 }}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="primary" type="submit" disabled={busy || !password}>
          {busy ? "Please wait…" : "Enter"}
        </button>
        {error ? <div className="error">{error}</div> : null}
      </form>
    </div>
  );
}

function Shell({ onSignOut }) {
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
  const [state, setState] = useState(savedPassword() ? "checking" : "login");

  useEffect(() => {
    if (state !== "checking") return;
    api("me")
      .then(() => setState("in"))
      .catch(() => {
        savePassword("");
        setState("login");
      });
  }, [state]);

  const leave = () => {
    savePassword("");
    setState("login");
  };

  if (state === "checking") return <div className="spin">Loading…</div>;
  if (state === "login") return <Login onDone={() => setState("in")} />;
  return <Shell onSignOut={leave} />;
}
