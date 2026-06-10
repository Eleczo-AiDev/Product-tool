# PIM Tool — Product Information Management

A full-stack Product Information Management tool for an electrical-products catalogue
(MCCBs, Wire & Cable, …). It implements a **Magento-style EAV engine** —
attributes → attribute groups → attribute sets (product structures) → products created
against a set with a dynamically generated form — and stores **three parallel value sets
per product** (HIVA, Magento, CRM) using an *override-then-shared* model. Products are
published through a transactional **outbox → worker → connectors** flow.

```
┌────────────┐     /api      ┌──────────────┐    Prisma    ┌────────────┐
│  web (SPA) │ ────────────▶ │  api (NestJS)│ ───────────▶ │ PostgreSQL │
│ React+Vite │   nginx proxy │  + worker    │              │            │
└────────────┘               └──────┬───────┘              └────────────┘
                                     │ outbox poll (3s)
                                     ▼
                         HIVA · Magento · CRM connectors (stubbed)
```

---

## 1. Run it (Docker — the easy path)

Requires Docker Desktop (or Docker Engine + Compose v2).

```bash
docker compose up --build
```

That starts three containers: PostgreSQL, the API (which auto-creates the schema and
seeds sample data on first boot), and the web UI behind nginx.

Then open:

| URL                              | What                              |
|----------------------------------|-----------------------------------|
| http://localhost:8080            | The PIM web app                   |
| http://localhost:3000/api/health | API health check                 |
| http://localhost:3000/api/products | Raw API (JSON)                  |

The database is persisted in a Docker volume (`pgdata`), so your data survives restarts.

To stop: `Ctrl-C`, then `docker compose down`. To wipe data too: `docker compose down -v`.

> **First build downloads Prisma's query engine** from binaries.prisma.sh. That's
> expected and only happens once. If your network blocks it, see the note in
> *Troubleshooting* below.

---

## 2. Run it locally (for development)

You need Node 20+ and a PostgreSQL instance.

**Backend**
```bash
cd backend
cp .env.example .env          # adjust DATABASE_URL to your Postgres
npm install
npx prisma db push            # create tables from the schema
npm run seed                  # load sample attributes/sets/masters/product
npm run start:dev             # http://localhost:3000/api
```

**Frontend**
```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173  (proxies /api → :3000)
```

---

## 3. What's in the box

```
pim-tool/
├── docker-compose.yml         # db + api + web
├── backend/                   # NestJS + Prisma + PostgreSQL
│   ├── prisma/
│   │   ├── schema.prisma      # EAV + three-system value model + outbox
│   │   └── seed.ts            # sample MCCB / Wire & Cable catalogue
│   └── src/
│       ├── common/resolution.ts   # pure resolve/validate logic (unit-tested)
│       ├── attributes/  masters/  sets/  products/
│       ├── publish/           # outbox service + polling worker + connectors
│       └── importexport/      # CSV export / import
└── frontend/                  # React + TS + Vite + Tailwind + TanStack Query
    └── src/pages/             # Products · Attribute Sets · Attributes · Masters
```

### Core domain rules (enforced server-side)
- `product_code`, `name`, `brand`, `module` are **system attributes**: present in every
  set, cannot be deleted, cannot be removed from a set.
- An attribute's **code and data type are immutable** once created.
- `brand` and `module` are **master-backed**; their per-system values derive from the master.
- A value is entered once as **shared**; you only override per system where it differs.
- Publish is blocked while required fields are missing.

### REST API
```
GET    /api/health
GET    /api/attributes            POST /api/attributes
PATCH  /api/attributes/:id        DELETE /api/attributes/:id
GET    /api/masters               POST /api/masters     PATCH /api/masters/:id
GET    /api/sets                  GET  /api/sets/:id
POST   /api/sets                  PATCH /api/sets/:id   DELETE /api/sets/:id
GET    /api/products              GET  /api/products/:id
POST   /api/products              PATCH /api/products/:id  DELETE /api/products/:id
GET    /api/products/:id/resolve?system=hiva|magento|crm
POST   /api/products/:id/publish  POST /api/products/publish   (bulk)
GET    /api/export/products.csv   POST /api/import/products
```

---

## 4. Production swaps (intentionally left as plug-points)

This build is a complete, runnable vertical slice. The following are deliberately
stubbed so you can drop in your real infrastructure:

- **Connectors** (`backend/src/publish/connectors.ts`) currently log and return success.
  Replace with real HIVA / Magento / CRM clients. The outbox + worker around them is real.
- **Message transport**: the worker polls the outbox table every 3s. For production,
  swap the poll for **RabbitMQ** or **Oracle AQ** consuming the same outbox rows.
- **Auth/SSO**: no authentication is wired in. The intended plug-in point is a
  **Keycloak/OIDC** guard at the NestJS layer; the UI shell would sit behind the same SSO.

---

## 5. Troubleshooting

- **API container restarts / "DB not ready"** — the API retries `prisma db push` until
  Postgres is healthy; give it a few seconds on first boot.
- **Prisma engine download blocked** — if your environment can't reach binaries.prisma.sh,
  set `PRISMA_ENGINES_MIRROR` to an internal mirror, or pre-bake the engines into the image.
- **Port already in use** — change the host ports in `docker-compose.yml` (`8080`, `3000`, `5432`).
- **Reset everything** — `docker compose down -v && docker compose up --build`.

---

## 6. Verification status (full transparency)

What was verified while building this:
- **Frontend**: full TypeScript type-check (`tsc --noEmit`) and a real production build
  (`vite build`) both pass.
- **Backend**: every `.ts` file passes a strict esbuild compile; the core resolution and
  validation logic in `common/resolution.ts` passes a 12-case unit test
  (master per-system resolution, override-then-shared, payload building, required/option/master validation).

What was **not** run in the build environment: the backend server and PostgreSQL were not
executed here, because the sandbox blocks Prisma's engine download. The schema, migrations
strategy (`db push`), seed, and Docker wiring are written to run on your machine via
`docker compose up`. If anything fails to boot on first run, it'll almost certainly be the
Prisma engine download note above.
