# MongoDB + NextAuth Integration

This app uses **MongoDB Atlas** for persistent storage of users and search history, and **NextAuth.js** for authentication (email/password + Google OAuth).

## 1. Create a MongoDB Atlas cluster (free)

1. Sign up at https://www.mongodb.com/atlas (free M0 cluster is enough).
2. Create a cluster, choose a region close to you.
3. **Database Access** → add a user. Save the username + auto-generated password.
4. **Network Access** → add IP `0.0.0.0/0` (allow from anywhere; fine for dev).
5. **Database → Connect → Drivers** → copy the connection string.

Replace `USER` and `PASS` with your database credentials, and append the database name (`/qarinha`) before the query string:

```
mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/qarinha?retryWrites=true&w=majority
```

## 2. Create a Google OAuth client

1. Go to https://console.cloud.google.com and create a new project (e.g. "qarinha").
2. **APIs & Services → OAuth consent screen** → External → fill in the app name + support email → save.
3. **Credentials → Create Credentials → OAuth client ID** → **Web application**:
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
4. Copy the **Client ID** and **Client Secret**.

## 3. Configure environment

Copy the example file:

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

```
MONGODB_URI=mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/qarinha?retryWrites=true&w=majority

NEXTAUTH_SECRET=<run: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

## 4. Install + run

```bash
pnpm install
pnpm dev
```

Visit:
- `/register` — create an email/password account
- `/login` — sign in (or "Continue with Google")
- `/history` — search history is now synced to MongoDB and visible across devices

## How history sync works

- Guest users: history stays in `localStorage` only.
- Signed-in users: every `add()` is POSTed to `/api/history` and stored in MongoDB.
- On first sign-in, any guest `localStorage` entries are merged into the user's MongoDB collection via `POST /api/history/merge`.
- Sign-out clears the merge flag so re-signing-in merges again if needed.