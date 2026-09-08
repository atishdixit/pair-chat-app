import { useEffect, useState } from 'react';
import './App.css';
import { api } from './api.js';
import Chat from './Chat.jsx';
import Login from './Login.jsx';

export default function App() {
  const [username, setUsername] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api
      .me()
      .then((user) => setUsername(user.username))
      .catch(() => setUsername(null))
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return <div className="app-loading">Loading…</div>;
  }

  return username ? (
    <Chat username={username} onSignedOut={() => setUsername(null)} />
  ) : (
    <Login onSignedIn={setUsername} />
  );
}
