# PairChat

A private messaging app for exactly two people. One conversation, no contact lists, no discovery. Works the same on a phone or a laptop, in any browser.

- **Architecture & flow diagrams:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Stack:** React + Vite · Node.js + Express + Socket.IO · SQLite
- **Recommended host:** [Fly.io](https://fly.io) (see [Deploying](#deploying))

## Quick start (Windows)

```bash
setup.bat
run.bat
```

`setup.bat` installs both `backend/` and `frontend/`, creates their `.env` files, generates a random session secret, and seeds the two accounts (defaults: `Alex` / `Sam` — see `backend/.env.example` for the passwords, **change them**). `run.bat` starts everything and opens `http://localhost:5173` in your browser. Run `setup.bat` once; `run.bat` any time after that (it re-runs setup automatically if it detects a fresh clone).

## Manual setup (macOS/Linux, or if you'd rather not use the .bat files)

**Backend** (`http://localhost:4000`):

```bash
cd backend
npm install
cp .env.example .env      # then edit USER1_PASSWORD / USER2_PASSWORD
npm run seed               # creates the two accounts
npm start
```

**Frontend** (`http://localhost:5173`):

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` and sign in with one of the two accounts you seeded.

## How it works

- **Auth**: two fixed accounts (bcrypt-hashed passwords), session kept in an httpOnly cookie. No signup, ever.
- **Real-time**: Socket.IO. Sending a message saves it to SQLite first, then broadcasts it to whoever is connected.
- **History**: on connect, the client fetches every past message from `/api/messages` — this is also how a message reaches someone who was offline when it was sent.
- **Storage**: the whole conversation lives in one SQLite file at `backend/data/pairchat.db`.
- **One deployable unit**: `npm run build` in `frontend/` produces static files that the backend serves itself — see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full request flow.

## Environment variables

Local dev reads `backend/.env` and `frontend/.env` (see the matching `.env.example` files). Docker/Fly read a single set of variables instead:

| Variable | Used by | Purpose |
|---|---|---|
| `PORT` | backend | Port the server listens on (default `4000`). |
| `CLIENT_ORIGIN` | backend | Allowed CORS origin — only matters when the frontend isn't served by the same process (i.e. local dev with Vite on a different port). |
| `JWT_SECRET` | backend | Signs session cookies. Must be a long random string in anything beyond local testing. |
| `DB_PATH` | backend | Path to the SQLite file. |
| `USER1_NAME` / `USER1_PASSWORD` | backend (seed) | The first account. |
| `USER2_NAME` / `USER2_PASSWORD` | backend (seed) | The second account. |
| `VITE_API_BASE` | frontend (dev only) | Where the frontend dev server sends API/WebSocket calls. |

## API

| Endpoint | Auth | Purpose |
|---|---|---|
| `POST /api/login` | — | `{ username, password }` → sets the session cookie. |
| `POST /api/logout` | cookie | Clears the session cookie. |
| `GET /api/me` | cookie | Returns the signed-in username. |
| `GET /api/messages` | cookie | Full message history, oldest first. |
| `GET /api/health` | — | Liveness check. |

Real-time, over the same origin via Socket.IO (auth via the same cookie):

| Event | Direction | Payload |
|---|---|---|
| `message:send` | client → server | Plain text message body. |
| `message:new` | server → all clients | `{ id, sender, body, created_at }` |
| `presence:update` | server → all clients | Array of currently-connected usernames. |

## Deploying

### Fly.io (recommended)

A real always-on VM, not serverless — the WebSocket and a persistent volume for the SQLite file both just work, no extra plumbing.

```bash
fly launch --no-deploy          # links this repo to a Fly app (uses fly.toml)
fly volumes create pairchat_data --size 1
fly secrets set JWT_SECRET=$(openssl rand -hex 32) USER1_PASSWORD=... USER2_PASSWORD=...
fly deploy
```

### Docker (self-hosted / any VPS)

```bash
cp .env.example .env      # root .env, used by docker-compose - fill in real values
docker compose up -d --build
```

Serves on `http://localhost:4000`. Messages persist in the `pairchat-data` named volume across restarts and rebuilds.

## Project structure

```
pairchat/
├── Dockerfile              multi-stage: builds frontend, runs backend
├── docker-compose.yml      local containerized run, with a data volume
├── fly.toml                Fly.io deploy config
├── setup.bat               one-time install + .env + seed
├── run.bat                 one-click local start
├── docs/ARCHITECTURE.md    component map + message-flow diagrams
├── backend/                Express + Socket.IO + SQLite
└── frontend/                React + Vite
```

## Note on security

This is sized for two trusted people, not the general public. Two hardcoded accounts are enough to keep strangers out, but this auth model hasn't been hardened for sensitive data — don't reuse it for anything beyond casual personal messaging. In particular: use a real random `JWT_SECRET`, use real passwords (not the `.env.example` placeholders), and put it behind HTTPS in production (Fly.io does this for you; `fly.toml` already sets `force_https = true`).
