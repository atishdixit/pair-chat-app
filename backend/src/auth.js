import bcrypt from 'bcryptjs';
import * as cookie from 'cookie';
import jwt from 'jsonwebtoken';
import { db } from './db.js';

const COOKIE_NAME = 'pc_token';
const TOKEN_TTL = '30d';

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value) {
    throw new Error('JWT_SECRET is not set');
  }
  return value;
}

export function verifyCredentials(username, password) {
  const row = db.prepare('SELECT username, password_hash FROM users WHERE username = ?').get(username);
  if (!row) {
    return false;
  }
  return bcrypt.compareSync(password, row.password_hash);
}

export function issueTokenCookie(res, username) {
  const token = jwt.sign({ sub: username }, secret(), { expiresIn: TOKEN_TTL });
  res.setHeader(
    'Set-Cookie',
    cookie.serialize(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30
    })
  );
}

export function clearTokenCookie(res) {
  res.setHeader('Set-Cookie', cookie.serialize(COOKIE_NAME, '', { path: '/', maxAge: 0 }));
}

function readTokenFromCookieHeader(cookieHeader) {
  if (!cookieHeader) return null;
  const parsed = cookie.parse(cookieHeader);
  return parsed[COOKIE_NAME] || null;
}

export function requireAuth(req, res, next) {
  const token = readTokenFromCookieHeader(req.headers.cookie);
  if (!token) {
    return res.status(401).json({ message: 'Not signed in' });
  }
  try {
    const payload = jwt.verify(token, secret());
    req.username = payload.sub;
    next();
  } catch {
    return res.status(401).json({ message: 'Session expired, please sign in again' });
  }
}

export function socketAuthMiddleware(socket, next) {
  const token = readTokenFromCookieHeader(socket.handshake.headers.cookie);
  if (!token) {
    return next(new Error('Not signed in'));
  }
  try {
    const payload = jwt.verify(token, secret());
    socket.username = payload.sub;
    next();
  } catch {
    next(new Error('Session expired'));
  }
}
