# CLAUDE.md

Repository guide for Claude-style agents. Treat this as the operational map for local development, Vercel deployment, database migration, and the app’s end-to-end flow.

## Quick Commands

- `nvm use v24`
- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run migrate`
- `npm run migrate:localstorage`

## Runtime Model

This app is a React 18 + TypeScript + Vite frontend with PostgreSQL-backed persistence.

### Local Running

`npm run dev` starts `scripts/dev.js`, which runs:

- Vite on `http://localhost:8081`
- API proxy on `http://localhost:3000`

The proxy loads handlers from `api/` and forwards app traffic to Vite. Local frontend requests should point to `http://localhost:3000` via `VITE_API_URL`.

Use this workflow when debugging locally:

1. Set `DATABASE_URL` in `.env` or `.env.local`.
2. Run `npm run migrate` once to create tables.
3. Run `npm run dev`.
4. Open the app in the browser and exercise the target flow.

### Vercel Deployment

Vercel uses `vercel.json` to build `dist` and route `/api/*` to Edge Functions.

Deployment rules:

- Keep the frontend compatible with same-origin API calls in production.
- Keep Edge route code free of Node-only top-level imports.
- Use Neon-friendly parameterized queries through `sql.query(...)` when building dynamic SQL.
- Avoid assuming the old localStorage backend; the active source of truth is PostgreSQL.

## Database Migration

Migration is driven by `migrate.js` and `schema.sql`.

Important points:

- `migrate.js` loads `.env` first, then lets `.env.local` override it.
- `DATABASE_URL` is required.
- `schema.sql` is intended to be rerunnable.
- `npm run migrate:localstorage` imports exported browser data into PostgreSQL using `localStorage-export.json`.

For local Postgres:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/circlephone_db
```

For Vercel + Neon:

- use the Neon connection string in the Vercel environment variables
- keep the same `DATABASE_URL` in local `.env.local` when you want your local dev to point at Neon

## Project Flow

### Routes

`src/App.tsx` mounts:

- `/` Dashboard
- `/invoice/new` and `/invoice/:id` for Circle Pair
- `/phone/new` and `/phone/:id` for Circle Phone
- `/settings`

### Data Flow

1. UI pages call helpers from `src/lib/storage-api.ts`.
2. `src/lib/api-client.ts` decides the API base URL.
3. API routes under `api/` persist to PostgreSQL.
4. After mutations, the UI reloads the relevant collection from the backend.

### Domain Split

- Circle Pair: service invoices, items, signatures, service history.
- Circle Phone: sales invoices, line items, trade-ins.
- Users: shared customer records and stats used by both flows.

### Business Logic To Preserve

- invoice numbering format and status flow
- down payment / remaining amount calculations
- tax after line-item discount
- trade-in persistence for Circle Phone
- signatures and warranty fields for service invoices
- printable invoice/receipt layout

## Key Files

- `src/lib/storage-api.ts` for model mapping between UI and API payloads
- `src/lib/api-client.ts` for API base selection
- `api/circle-pair/index.ts` for service invoice CRUD
- `api/circle-phone/index.ts` for sales invoice CRUD
- `api/users/index.ts` for user lookup and stats
- `api/db-client.ts` for the shared DB client abstraction
- `schema.sql` and the migration scripts for DB structure

## Validation Strategy

After edits, validate in this order when possible:

1. `npm run build`
2. targeted local API or browser flow
3. `npm run lint` if the change is code-heavy

## Working Rules

- Preserve shadcn/ui components in `src/components/ui/`
- Keep changes minimal and behavior-focused
- Do not reintroduce localStorage as the primary source of truth for production
- Prefer fixing mapping/query issues at the storage layer before changing the UI
