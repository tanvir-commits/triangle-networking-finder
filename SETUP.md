# Vercel setup (tanvir-commits)

Do this once to enable production AI chat and server events.

## 1. Log in to Vercel with GitHub

1. Open [https://vercel.com](https://vercel.com) and sign in with **GitHub** as **tanvir-commits**.
2. Authorize Vercel for your GitHub account if prompted.

## 2. Import the repo

1. **Add New… → Project** → import **tanvir-commits/triangle-networking-finder**.
2. Leave **Root Directory** as `.` (repo root).
3. Confirm build settings match `vercel.json`: **Build Command** `npm run build`, **Output** `dist`, `/api` serverless functions from the `api/` folder.

## 3. Add environment variables

In the project → **Settings → Environment Variables** (Production), add:

| Name | Required |
|------|----------|
| `OPENAI_API_KEY` | Yes |
| `TAVILY_API_KEY` | Optional |
| `KV_REST_API_URL` | Optional (Vercel KV) |
| `KV_REST_API_TOKEN` | Optional (Vercel KV) |

Redeploy after adding secrets.

## 4. Deploy production

- **Dashboard:** **Deployments → Redeploy** (or push to `main`).
- **CLI (this machine):** add Node to PATH, then:

```powershell
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
cd C:\Users\tanju\Projects\triangle-networking-finder
npx vercel login
npx vercel --prod
```

Copy the **Production** URL (e.g. `https://triangle-networking-finder-xxxx.vercel.app`). API base is that host + `/api`.

## 5. Point the GitHub Pages app at the API

1. Open [https://tanvir-commits.github.io/triangle-networking-finder/](https://tanvir-commits.github.io/triangle-networking-finder/) → **Settings** (gear).
2. Set **API base URL** to `https://<your-vercel-host>/api` (no trailing slash after `api`).
3. Save. Test **Events** tab and the floating **AI** chat.

Alternative: set `VITE_API_BASE_URL` to the same value at GitHub Pages build time and redeploy the frontend.
