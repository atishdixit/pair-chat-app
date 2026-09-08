# PairChat

A private messaging app for exactly two people. One conversation, no contact lists, no discovery. Works the same on a phone or a laptop, in any browser.

Design proposal (flow diagram, UI mockups, tech stack, deployment rationale): see the project write-up.

## Structure

```
pairchat/
├── backend/    Node.js + Express + Socket.IO + SQLite
└── frontend/   React + Vite
```

## Running locally

**Backend** (http://localhost:4000):

```bash
cd backend
npm install
cp .env.example .env      # then edit USER1_PASSWORD / USER2_PASSWORD
npm run seed               # creates the two accounts
npm start
```

**Frontend** (http://localhost:5173):

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 and sign in with one of the two accounts you seeded (defaults in `.env.example` are `Alex` / `Sam`).

## How it works

- **Auth**: two fixed accounts (bcrypt-hashed passwords), session kept in an httpOnly cookie.
- **Real-time**: Socket.IO. Sending a message saves it to SQLite first, then broadcasts it to whoever is connected.
- **History**: on connect, the client fetches every past message from `/api/messages` — this is also how a message reaches someone who was offline when it was sent.
- **Storage**: the whole conversation lives in one SQLite file at `backend/data/pairchat.db`.

## Deploying

Recommended: [Fly.io](https://fly.io) — a real always-on VM (not serverless), so the WebSocket and a persistent volume for the SQLite file both work without extra configuration. Build the frontend (`npm run build` in `frontend/`) and serve the static output from the backend, or deploy them as two small Fly apps with `CLIENT_ORIGIN` / `VITE_API_BASE` pointed at each other.

## Note on security

This is sized for two trusted people, not the general public. Two hardcoded accounts are enough to keep strangers out, but this auth model hasn't been hardened for sensitive data — don't reuse it for anything beyond casual personal messaging.
