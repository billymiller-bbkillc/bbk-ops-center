# BBK Ops Center

**The nerve center for BBK Holdings operations.**

A real-time operations dashboard for managing AI agents, workflows, tasks, and infrastructure across all BBK Holdings business units.

![Stack](https://img.shields.io/badge/React_18-TypeScript-blue) ![Stack](https://img.shields.io/badge/Express-SQLite-green) ![Stack](https://img.shields.io/badge/Tailwind-shadcn/ui-purple)

## Features

### ⚡ Fleet Monitor
- Real-time agent status (online/offline/busy/error)
- Per-agent: model, current task, uptime, session history
- Live status updates via Server-Sent Events

### 💰 Cost Center
- Token usage analytics per agent and model
- Daily/weekly/monthly spend trending with interactive charts
- Budget alerts with configurable thresholds
- Model cost breakdown (pie chart + table)

### 📋 Kanban Task Board
- Drag-and-drop between columns: Backlog → To Do → In Progress → Review → Done
- Priority levels: low / medium / high / critical
- Filter by business unit and priority
- Persistent in SQLite

### 🖥️ System Health
- Node vitals: CPU, memory, disk usage with progress bars
- Per-node status indicators
- Uptime tracking
- Alert indicators for resource thresholds

### 🎨 Design
- Dark mode default with light mode toggle
- Mission control / Bloomberg terminal aesthetic
- Monospace numbers, status colors, real-time clock
- Responsive layout with sidebar navigation

## Quick Start

```bash
# Install dependencies
npm install

# Seed the database with mock data
npm run seed

# Start dev server (frontend + backend)
npm run dev
```

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001
- **SSE Stream:** http://localhost:3001/api/sse/stream

## Architecture

```
bbk-ops-center/
├── client/          # React + Vite frontend
│   └── src/
│       ├── components/
│       │   ├── ui/         # shadcn-style components
│       │   ├── layout/     # Sidebar, Header
│       │   ├── dashboard/  # Overview panel
│       │   ├── fleet/      # Fleet Monitor
│       │   ├── costs/      # Cost Center
│       │   ├── kanban/     # Kanban Task Board
│       │   └── health/     # System Health
│       ├── hooks/          # useApi, useSSE
│       └── lib/            # Utils
├── server/          # Express + TypeScript backend
│   ├── db/          # Schema, migrations, seed
│   └── routes/      # API routes + SSE
├── shared/          # Shared TypeScript types
└── data/            # SQLite database (auto-created)
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents` | List all agents |
| GET | `/api/agents/:id` | Agent details |
| GET | `/api/agents/:id/sessions` | Agent session history |
| GET | `/api/costs/summary?period=day\|week\|month` | Cost analytics |
| GET | `/api/costs/alerts` | Budget alerts |
| GET | `/api/tasks` | List all tasks |
| POST | `/api/tasks` | Create task |
| PATCH | `/api/tasks/:id` | Update task |
| PATCH | `/api/tasks/:id/move` | Move task (drag-and-drop) |
| DELETE | `/api/tasks/:id` | Delete task |
| GET | `/api/health` | Node health status |
| GET | `/api/sse/stream` | SSE event stream |
| GET | `/api/status` | System status |

## Tech Stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Recharts, Lucide Icons
- **Backend:** Express, TypeScript, Drizzle ORM, better-sqlite3
- **Real-time:** Server-Sent Events (SSE)
- **Database:** SQLite (WAL mode)

## What's Next

- Phase 2: OpenClaw API integration (replace mock data with live agent telemetry)
- Phase 3: Webhook integrations, notifications, audit log
- Phase 4: Multi-user auth, role-based access

---

**BBK Holdings** — Built by Bubba ⚡
