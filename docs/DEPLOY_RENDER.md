# Deploying PairChat on Render

This guide takes PairChat from this GitHub repo to a live `https://….onrender.com` link on Render's free plan. It covers every step: preparing the values, creating the service, checking it works, updating it, and fixing common problems.

PairChat deploys as **one Docker container**. The `Dockerfile` builds the React frontend, and the Node.js backend serves the website, the API and the Socket.IO WebSocket on one port. The repo's `render.yaml` file (a Render "Blueprint") holds all the service settings, so Render can create the service for you.

---

## 1. Know the free-plan limits first

| Limit | What it means for PairChat |
| --- | --- |
| Sleeps after 15 minutes with no traffic | The first visit after a quiet period takes about 1 minute to load. |
| Filesystem is wiped on every restart, redeploy or sleep | **Chat history is lost.** The two accounts are re-created on every start, so login still works. |
| 750 free instance hours per month | Enough for one service running all month. |
| Very little CPU | The first start after a deploy can be slow (several minutes). |

That makes the free plan fine for testing and demos. To keep messages, see [section 9](#9-keep-chat-history-paid-option).

---

## 2. What you need

- A **GitHub account** with access to this repo.
- A **Render account**. Sign up at <https://render.com> with **Sign in with GitHub** so Render can see your repos.
- **Two login names** for the two people, e.g. `Atish` and `Priya`.
- **Two strong passwords**, one for each name.

You do **not** need to create a `.env` file for Render. `.env` files are never committed (they are listed in `.gitignore`), and Render stores the values in its own **Environment** settings instead. `JWT_SECRET` is generated for you by `render.yaml`.

> Usernames and passwords are separate settings. Put the **name** in `USER1_NAME` and the **password** in `USER1_PASSWORD`; never a password in a `*_NAME` field, because names are printed in the logs.

---

## 3. (Optional) Test the production build on your computer

This catches problems before you deploy. It needs Docker Desktop.

```bash
git clone https://github.com/atishdixit/pair-chat-app.git
cd pair-chat-app
cp .env.example .env
```

Edit `.env` and set `JWT_SECRET` (any long random string, e.g. the output of `openssl rand -hex 32`), `USER1_NAME`, `USER1_PASSWORD`, `USER2_NAME` and `USER2_PASSWORD`. Then run:

```bash
docker compose up -d --build
```

Open <http://localhost:4000>, log in as each user in two browser windows (one normal, one private/incognito), and send messages both ways. Stop it with `docker compose down`.

---

## 4. Deploy with the Blueprint (recommended, new service)

The Blueprint creates a correctly configured service in a few clicks.

> **Already created a service by hand?** Either delete it first (service → **Settings** → **Delete Web Service**) and follow this section, or keep it and follow [section 5](#5-or-fix-an-existing-manually-created-service) instead. Running both wastes your free hours.

1. Log in to the [Render dashboard](https://dashboard.render.com).
2. Click **New +** (top right) → **Blueprint**.
3. Under **Connect a repository**, find `atishdixit/pair-chat-app` and click **Connect**.
   - If the repo isn't listed, click **Configure account** / **Configure GitHub App** and give Render access to it, then come back.
4. Render reads `render.yaml` and shows the service it will create: **pairchat** (web service, Docker, Free, Singapore).
5. Enter a **Blueprint Name**, e.g. `pairchat`. Leave **Branch** as `main`.
6. Fill in the four values Render asks for:

   | Key | Enter |
   | --- | --- |
   | `USER1_NAME` | first person's login name, e.g. `Atish` |
   | `USER1_PASSWORD` | first person's password |
   | `USER2_NAME` | second person's login name, e.g. `Priya` |
   | `USER2_PASSWORD` | second person's password |

   `PORT`, `DB_PATH` and `JWT_SECRET` are filled in automatically from `render.yaml`.
7. Click **Apply** (or **Deploy Blueprint**).
8. Open the new **pairchat** service and click the **Logs** tab. The build takes about 3–6 minutes, and the first start on the free plan can take several more. It is ready when you see:

   ```
   Seeded user: <name 1>
   Seeded user: <name 2>
   Done.
   PairChat backend listening on port 4000
   ==> Your service is live
   ```

9. Your URL is shown at the top of the service page, e.g. `https://pairchat.onrender.com` (Render adds a suffix if the name is taken). Continue with [section 6](#6-check-that-it-works).

---

## 5. Or: fix an existing manually-created service

If you created a web service by hand earlier, make its settings match `render.yaml`:

1. Open the service → **Settings**.
2. **Build & Deploy**:
   - **Runtime / Language:** Docker
   - **Dockerfile Path:** `./Dockerfile`
   - **Docker Build Context Directory:** `.`
   - **Branch:** `main`
   - **Auto-Deploy:** On Commit
3. **Health Checks** → **Health Check Path:** `/api/health`. Click **Save Changes**.
4. Open the **Environment** tab and make sure exactly these variables exist:

   | Key | Value |
   | --- | --- |
   | `PORT` | `4000` |
   | `DB_PATH` | `/app/backend/data/pairchat.db` |
   | `JWT_SECRET` | a long random string (click **Generate** if offered, or use `openssl rand -hex 32`) |
   | `USER1_NAME` | first login name (**not** a password) |
   | `USER1_PASSWORD` | first password |
   | `USER2_NAME` | second login name |
   | `USER2_PASSWORD` | second password |

   Click **Save, rebuild, and deploy** (or **Save Changes**, then **Manual Deploy → Deploy latest commit**).
5. Watch the **Logs** tab as in step 8 of section 4.

---

## 6. Check that it works

Replace `pairchat.onrender.com` with your own URL.

1. Open `https://pairchat.onrender.com/api/health`. It must show `{"status":"ok"}`.
2. Open `https://pairchat.onrender.com` on a laptop and log in as user 1.
3. Open the same URL on a phone (or a private browser window) and log in as user 2.
4. Each side should show the other as online.
5. Send a message from each side. It should appear instantly on the other, without refreshing.

Always use the `https://` address. The login cookie is marked `Secure` in production, so it won't work over plain `http://`.

---

## 7. Deploy updates

Render redeploys automatically on every push to `main`:

```bash
git add .
git commit -m "Describe your change"
git push
```

Follow progress in the service's **Events** and **Logs** tabs. To redeploy without a code change: **Manual Deploy → Deploy latest commit**. To roll back: **Events** → pick an earlier successful deploy → **Rollback**.

To change a name or password, edit it in the **Environment** tab and save. The service restarts and re-seeds the accounts with the new values.

---

## 8. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Deploy ends with **Timed Out** although the log says "listening" | Health check not passing in time. Older code listened on IPv6 only; free instances also start slowly | Make sure `server.js` listens on `'0.0.0.0'` (already fixed in this repo), set **Health Check Path** to `/api/health`, then **Manual Deploy → Deploy latest commit**. Retry once if the first start was simply slow |
| Login fails; browser DevTools → Network shows requests to `localhost:4000` | Old frontend code that defaulted to `localhost` in production | Already fixed in `frontend/src/api.js`; redeploy the latest commit |
| Login seems to work, then you're back on the login page | Site opened via `http://` | Use the `https://` URL |
| "Incorrect name or password" | Name/password values swapped or mistyped in **Environment** | Check that `USER*_NAME` holds the name and `USER*_PASSWORD` the password; save and redeploy |
| Deploy fails with `JWT_SECRET is not set` or `Both USER1_NAME/USER1_PASSWORD…` | Missing environment variable | Add it in **Environment** (section 5, step 4) |
| First visit takes about a minute | Free service was asleep | Expected on the free plan |
| Old messages disappeared | Free filesystem is wiped on restart/sleep | Expected; see section 9 |
| Messages only show after a page refresh | WebSocket connection failing | Check the browser console for Socket.IO errors; make sure you use the `https://` URL |

Logs: service → **Logs**. Search for `Seeded user`, `listening`, or `Error`.

---

## 9. Keep chat history (paid option)

The free plan can't keep files. To keep messages on Render:

1. Change the service's **Instance Type** to a paid plan (e.g. Starter).
2. Go to **Disks** → **Add Disk**:
   - **Mount Path:** `/app/backend/data`
   - **Size:** 1 GB
3. Save. The SQLite database at `/app/backend/data/pairchat.db` now survives restarts and redeploys.

If you use the Blueprint, you can instead edit `render.yaml`: set `plan: starter` and add under the service:

```yaml
    disk:
      name: pairchat-data
      mountPath: /app/backend/data
      sizeGB: 1
```

Commit, push, and Render applies the change (Blueprint → **Sync**).

---

## 10. Reference

| Item | Value |
| --- | --- |
| Blueprint file | `render.yaml` |
| Docker image | built from `Dockerfile` (frontend build + Node.js backend) |
| Port | `4000` (`PORT`) |
| Health check | `GET /api/health` → `{"status":"ok"}` |
| Database | SQLite at `/app/backend/data/pairchat.db` (`DB_PATH`) |
| Required variables | `JWT_SECRET`, `USER1_NAME`, `USER1_PASSWORD`, `USER2_NAME`, `USER2_PASSWORD` |

Render documentation: [Free plan limits](https://render.com/docs/free) · [Blueprint spec](https://render.com/docs/blueprint-spec) · [Troubleshooting deploys](https://render.com/docs/troubleshooting-deploys)
