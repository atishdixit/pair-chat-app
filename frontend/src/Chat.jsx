import { useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { connectSocket, disconnectSocket } from './socket.js';

function initials(name) {
  return name.slice(0, 2).toUpperCase();
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function Chat({ username, onSignedOut }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    api
      .messages()
      .then((history) => {
        if (!cancelled) setMessages(history);
      })
      .catch((err) => setError(err.message));

    const socket = connectSocket();
    socket.on('message:new', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });
    socket.on('presence:update', (users) => {
      setOnlineUsers(users);
    });
    socket.on('connect_error', (err) => {
      setError(err.message);
    });

    return () => {
      cancelled = true;
      socket.off('message:new');
      socket.off('presence:update');
      socket.off('connect_error');
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const partnerOnline = onlineUsers.some((u) => u !== username);
  const partnerName = onlineUsers.find((u) => u !== username);

  function handleSend(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    connectSocket().emit('message:send', text);
    setDraft('');
  }

  async function handleSignOut() {
    disconnectSocket();
    await api.logout().catch(() => {});
    onSignedOut();
  }

  return (
    <div className="chat-app chat-app--full">
      <div className="chat-header">
        <div className="avatar">{initials(partnerName || '?')}</div>
        <div className="chat-header-info">
          <div className="chat-header-name">{partnerName || 'Waiting for the other person…'}</div>
          <div className={`chat-header-status ${partnerOnline ? '' : 'offline'}`}>
            <span className="status-dot" />
            {partnerOnline ? 'online' : 'offline'}
          </div>
        </div>
        <button className="signout-btn" onClick={handleSignOut} title={`Signed in as ${username}`}>
          Sign out
        </button>
      </div>

      {error && <div className="chat-error">{error}</div>}

      <div className="chat-messages chat-messages--scroll" ref={scrollRef}>
        {messages.length === 0 && <p className="chat-empty">No messages yet — say hello.</p>}
        {messages.map((m) => (
          <div key={m.id} className={`msg-row ${m.sender === username ? 'me' : 'them'}`}>
            <div className="bubble">{m.body}</div>
            <div className="msg-time">{formatTime(m.created_at)}</div>
          </div>
        ))}
      </div>

      <form className="chat-composer" onSubmit={handleSend}>
        <input
          className="composer-input composer-input--live"
          placeholder="Type a message…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSend(e);
            }
          }}
          autoFocus
        />
        <button className="composer-send" type="submit" aria-label="Send" disabled={!draft.trim()}>
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 12L20 4L14 20L11 13L4 12Z" fill="var(--accent-contrast)" />
          </svg>
        </button>
      </form>
    </div>
  );
}
