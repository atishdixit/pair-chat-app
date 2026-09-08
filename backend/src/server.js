import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import {
  clearTokenCookie,
  issueTokenCookie,
  requireAuth,
  socketAuthMiddleware,
  verifyCredentials
} from './auth.js';
import { db } from './db.js';

const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const app = express();
app.use(express.json());
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ message: 'Name and password are required' });
  }
  if (!verifyCredentials(username, password)) {
    return res.status(401).json({ message: 'Incorrect name or password' });
  }
  issueTokenCookie(res, username);
  res.json({ username });
});

app.post('/api/logout', requireAuth, (req, res) => {
  clearTokenCookie(res);
  res.json({ ok: true });
});

app.get('/api/me', requireAuth, (req, res) => {
  res.json({ username: req.username });
});

app.get('/api/messages', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT id, sender, body, created_at FROM messages ORDER BY id ASC').all();
  res.json(rows);
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN, credentials: true }
});

io.use(socketAuthMiddleware);

const insertMessage = db.prepare('INSERT INTO messages (sender, body) VALUES (?, ?)');
const getMessageById = db.prepare('SELECT id, sender, body, created_at FROM messages WHERE id = ?');

// socket.id -> username, so presence reflects who currently has a live connection.
const onlineSockets = new Map();

function broadcastPresence() {
  const onlineUsers = [...new Set(onlineSockets.values())];
  io.emit('presence:update', onlineUsers);
}

io.on('connection', (socket) => {
  onlineSockets.set(socket.id, socket.username);
  broadcastPresence();
  console.log(`socket connected: ${socket.username} (${socket.id})`);

  socket.on('message:send', (body) => {
    const text = typeof body === 'string' ? body.trim() : '';
    if (!text) return;

    const result = insertMessage.run(socket.username, text);
    const saved = getMessageById.get(result.lastInsertRowid);

    io.emit('message:new', saved);
  });

  socket.on('disconnect', () => {
    onlineSockets.delete(socket.id);
    broadcastPresence();
    console.log(`socket disconnected: ${socket.username} (${socket.id})`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`PairChat backend listening on http://localhost:${PORT}`);
});
