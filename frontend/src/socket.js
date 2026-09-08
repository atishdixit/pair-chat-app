import { io } from 'socket.io-client';
import { api } from './api.js';

let socket = null;

export function connectSocket() {
  if (socket) return socket;
  socket = io(api.base, { withCredentials: true });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
