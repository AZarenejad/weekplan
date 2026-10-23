# WeekPlan

Weekly planner: one-off tasks, recurring items (never "done", only moved per occurrence), and goals with progress.

## Layout (npm workspaces)
| Path | Role |
|---|---|
| `packages/shared` | Pure domain (dates, recurrence, task rules) + zod schemas. Used by web **and** api, so rules exist once. |
| `apps/api` | Fastify + SQLite (Node's built-in `node:sqlite`, no native build; needs Node ≥ 22.13). `PlannerStore` is the persistence port; migrations in `db.ts`. |
| `apps/web` | React + Vite. UI talks to a `Gateway` (local-only or REST) with optimistic updates. |

## Develop
    npm install
    npm run dev            # API on :3000 + web on http://localhost:5173 (open this one)
    npm run dev:web        # web only
    npm test | npm run lint | npm run typecheck
The web dev server proxies `/api` to the API (`.env.development` sets `VITE_API_URL=/api`).
For offline/localStorage mode run the web app without that variable (delete `apps/web/.env.development`).
`localhost:3000` serves only the API in dev (the site there exists after `docker compose up` / with `WEB_DIST`).

## Run in production
    docker compose up -d --build              # http://localhost:3000, data in volume `weekplan-data`
Set `API_TOKEN` to require `Authorization: Bearer <token>` on the API (the web app reads it from
`localStorage['weekplan.token']`). For real multi-user exposure put it behind a reverse proxy / SSO / VPN.

## CI/CD
`.github/workflows/ci.yml`: lint, typecheck, tests, build on every push/PR; on `main` it also builds and pushes
`ghcr.io/<owner>/<repo>:latest` + `:<sha>`. Deploy by pulling that image (Watchtower, `docker compose pull`, or an SSH step).

## API
`GET /api/health` · `GET /api/state` · `POST /api/tasks` · `POST /api/tasks/:id/toggle` · `POST /api/tasks/:id/move`
· `DELETE /api/tasks/:id` · `POST /api/goals` · `DELETE /api/goals/:id`

## Extending
- New category: `Category` type + `CategorySchema` + `apps/web/src/ui/categories.ts`.
- New DB schema change: append a SQL string to `MIGRATIONS` (never edit old ones).
- Postgres: implement `PlannerStore`, swap it in `server.ts`.

توجه: تعطیلات ثابت خورشیدی در تقویم مشخص شده‌اند؛ برای تعطیلات قمری متغیر، دادهٔ معتبر سالانه لازم است.

## Goals and editing
Goals support work/personal groups, editable multi-line descriptions, optional Gregorian ISO deadline,
low/medium/high priority, completion/reopening, and deletion. Deleting a goal unlinks its tasks
without deleting the tasks. Task menus close on outside pointer click or Escape.

## Database and backups
In API mode tasks, goals, deadlines, completion and scheduling changes are stored in SQLite.
Persist the `weekplan-data` Docker volume. Back up the database using SQLite's backup API or
`VACUUM INTO` (do not copy a live WAL database without its WAL files). Never commit database files,
API tokens or `.env` secrets. Local-only mode uses browser localStorage, not SQLite.

## Before publishing on GitHub
1. Review `.env.example` and set secrets only in your deployment environment.
2. Run `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.
3. Verify a fresh SQLite database and an existing database upgrade, and restart to verify persistence.
4. Manually test drag/drop overlaps, editing, goal deletion, mobile layout and accessibility.
5. Set repository visibility, description and license (no license has been selected).

**Verification note:** The delivery environment did not have a complete dependency install;
`npm ci --offline` failed on missing cached packages and a network install timed out.
Consequently the build/typecheck/test/lint suite could not be verified here. CI must pass before release.

## Task workflow (v5)

Tasks may have **no calendar date** (`date: null`), and can independently be `todo`, `doing`, or `done`. Add undated tasks in the backlog; edit a task to enable/disable calendar scheduling. Change its workflow state directly on its chip. The status is persisted to SQLite when the API is enabled (migration v6) or to localStorage in offline mode. Existing completed tasks are migrated to `done`; older browser data falls back to `done` when the legacy checkbox is checked. Recurring items retain their previous recurrence semantics.

For a persistent multi-device deployment, configure `VITE_API_URL` and use the API with a persistent SQLite volume. LocalStorage is browser-specific and is not shared across devices.

## Workflow overview (v6)

The sidebar shows all **Doing** tasks, including unscheduled tasks, and a collapsible **Completed** history. Completing a task does not delete it. Each task records the date it first entered Doing (`startedAt`) and its most recent completion date (`completedAt`). Older records without known start/completion dates display «نامشخص» rather than an invented timestamp. Reopening a completed task clears its completion date. These fields are persisted in SQLite via migration v7 and are preserved in browser-only localStorage mode.

Goals are now listed separately from their creation form. Use **+ هدف جدید** to open the form, and the compact ellipsis menu on each goal for edit, complete/reopen and delete. Existing goal and task records remain in place.

### Verification

Run `npm ci && npm run typecheck && npm run lint && npm test && npm run build` in a Node.js 22.13+ environment with registry access. These checks were not fully executable in the artifact environment because `npm ci` failed. Do not treat this archive as a CI-verified release.

## Team members and one-on-one meetings

The **افراد تیم و جلسات ۱:۱** panel lets you add colleagues, assign existing tasks to them (edit a task and select its assignee), review each person's open responsibilities, and keep a dated 1:1 history. Each meeting has optional start/end times and separate fields for talking points, notes, decisions, and follow-ups. Team records are saved in SQLite when the API is enabled, or in browser localStorage in standalone mode.

API endpoints (when running in server mode): `GET /api/state` includes `people` and `oneOnOnes`; `PUT/DELETE /api/people/:id`; `PUT/DELETE /api/one-on-ones/:id`. Existing databases migrate automatically on server startup. Back up the SQLite database before upgrades. Deleting a person also deletes their 1:1 history and unassigns their tasks; it does **not** delete the tasks.

**Privacy:** 1:1 notes may be confidential. This version is intended for a single trusted user, not a multi-user HR system. Do not publish the SQLite file or API token. Set `API_TOKEN` and use HTTPS and access controls before exposing the server beyond a trusted local network. A public GitHub repository should contain source code only, never real team data or secrets.

### Team workspace (UI update)

The Team section uses a searchable people directory and per-person tabs for active tasks, completed tasks (including start/completion dates), and 1:1 meeting history. Meeting notes are edited in a separate form; assignee names also appear in the Doing overview. Team notes may be sensitive: never commit the SQLite database to a public repository.

## Team profile overlay (v10)

The team directory shows the number of tasks in Doing for each person. Select a person to open a focused profile dialog over a dimmed page, with active tasks, completed task history and 1:1 meeting notes. Close using Escape, the close control, or clicking the backdrop. The dialog traps keyboard focus and restores focus to the original card. Meeting and person data continue to use the existing persistence layer.


## Windows laptop: background autostart (port 4173)

Requires Node.js 22.13+ and npm. Run once from PowerShell in the project root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-windows.ps1
```

This installs dependencies, builds the API and web frontend with `VITE_API_URL=/api`, registers a per-user Windows Task Scheduler task, and creates a desktop shortcut. The server starts at **Windows sign-in** on **127.0.0.1:4173** without automatically opening a browser. Open the desktop shortcut when needed. SQLite data is stored at `data/weekplan.db` (excluded from Git). Logs are in `logs/weekplan.log`.

To remove autostart without deleting your data:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\uninstall-windows.ps1
```

After changing source code, stop the WeekPlan scheduled task, rerun `npm run build` with `VITE_API_URL=/api` set, then start the task again. Back up `data/weekplan.db` regularly. Do not expose this unauthenticated local-only instance to the network. If port 4173 is occupied, choose another port consistently in config, Vite proxy, scripts, and shortcut.
