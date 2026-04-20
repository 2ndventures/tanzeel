# Tanzeel

A full-stack Quran reading and recitation application built with React, Express, and TypeScript.

## Local Development

```bash
npm install
npm run dev
```

The app runs on `http://localhost:5000` (or whatever port `PORT` is set to).

## Scripts

- `npm run dev` — start the dev server (Vite + Express via tsx)
- `npm run build` — build the client (Vite) and bundle the server (esbuild) to `dist/`
- `npm start` — run the production build from `dist/index.js`
- `npm run check` — type-check with TypeScript
- `npm run db:push` — push Drizzle schema changes to the database

## Deploying to Railway

Railway will build and run this app using the existing `npm run build` and `npm start` scripts. The Express server already reads `process.env.PORT`, which Railway assigns dynamically.

### Step-by-step

1. **Create a Railway project**
   - Sign in at [railway.app](https://railway.app).
   - Click **New Project → Deploy from GitHub repo** and select this repository (or use **Deploy from Template / Empty Project** and push via the Railway CLI).

2. **Configure the service**
   - Railway auto-detects Node.js. Confirm the following under **Settings → Build & Deploy**:
     - **Build Command:** `npm ci && npm run build`
     - **Start Command:** `npm start`
     - **Root Directory:** `/` (default)
   - Under **Settings → Environment**, ensure Node version is **18 or higher** (set `NODE_VERSION=20` in variables if you want to pin it; Node 20 is recommended).

3. **Set environment variables**
   - Go to **Variables** and add anything your app needs, for example:
     - `NODE_ENV=production`
     - `DATABASE_URL=...` (if using Postgres — Railway can provision one with **+ New → Database → PostgreSQL**, which auto-injects `DATABASE_URL`)
     - `OPENAI_API_KEY=...` (if AI features are used)
   - Do **not** set `PORT` manually — Railway provides it automatically and the server reads it from `process.env.PORT`.

4. **Expose the service**
   - Under **Settings → Networking**, click **Generate Domain** to get a public `*.up.railway.app` URL, or attach a custom domain.

5. **Database migrations (if applicable)**
   - After the first deploy, run `npm run db:push` against the production `DATABASE_URL`. You can do this from your local machine with the production `DATABASE_URL` exported, or by adding a one-off command in Railway.

6. **Deploy**
   - Push to your connected branch (typically `main`). Railway builds and deploys automatically. Subsequent pushes redeploy.

### Notes

- The server binds to `0.0.0.0` and the port from `process.env.PORT`, which is what Railway requires.
- `npm run build` produces a static client bundle and an ESM server bundle in `dist/`. `npm start` runs the server in production mode and serves the built client.
- A `railway.toml` is included to pin the build/start commands and restart policy. You can remove it if you prefer to configure everything in the Railway dashboard.
