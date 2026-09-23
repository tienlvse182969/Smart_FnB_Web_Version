# Smart F&B Web

React/Vite frontend for the Smart F&B Chain Platform. Owner, Admin, and Manager currently use the in-browser demo data. Waiter and Kitchen Staff use the backend API when `VITE_API_BASE_URL` is configured.

## First local setup

```powershell
Copy-Item .env.example .env
pnpm install
pnpm dev
```

The web app opens at `http://localhost:8443`.

Configure `.env` for the local backend:

```dotenv
VITE_API_BASE_URL=http://localhost:3100/api/v1
VITE_DEMO_PASSWORD=DemoPass123!
```

`VITE_DEMO_PASSWORD` is a local convenience value for the seeded Waiter and Kitchen Staff accounts. Never put a real production password in a Vite variable because it is included in the browser bundle.

## Demo accounts

| Role                  | Email                         | Password source                |
| --------------------- | ----------------------------- | ------------------------------ |
| Waiter                | `waiter.demo@smartfnb.local`  | Backend `SEED_DEMO_PASSWORD`   |
| Kitchen Staff         | `kitchen.demo@smartfnb.local` | Backend `SEED_DEMO_PASSWORD`   |
| Admin, Owner, Manager | Account shown on login screen | Local mock password `demo1234` |

The backend must allow `http://localhost:8443` in `CORS_ORIGIN`.

## Normal startup

Start the backend first, then run:

```powershell
pnpm dev
```

After pulling dependency changes, run `pnpm install` again. Use `pnpm build` to verify a production build.
