# BBK Ops Center — Consolidated Execution Plan

**Author:** Bubba (Chief Solution Architect)
**Date:** 2026-03-20
**Status:** DRAFT — Awaiting Billy's approval
**Context:** Merges the original 4-phase Mission Control expansion plan with 7 tactical improvements identified during ops review.

---

## Guiding Principles

1. **Launch first** — SalesPipeCRM full launch is April 30, 2026. Everything that supports launch readiness gets priority.
2. **Quick wins early** — Ship improvements to existing tabs before building new ones.
3. **Security can't wait forever** — The Ops Center is currently open to anyone who hits the IP.
4. **Don't gold-plate** — Get it working, then polish.

---

## Phase 1: Tactical Improvements (Existing Tabs)
**Timeline:** Week 1 (March 20–27)
**Goal:** Make what we have actually useful for daily operations.

### 1A — Kanban: Overdue & Due Date Visibility
- Red border + sort-to-top for overdue tasks
- Yellow highlight for tasks due within 48 hours
- Overdue count badge on the Kanban sidebar icon
- **Why now:** We have 2 overdue tasks TODAY and the board doesn't show it. This is a 2-hour fix.

### 1B — Fleet Monitor: Active Task Context + Kill Switch
- Show current task title and last message timestamp per agent (not just status badge)
- Add "Stop Agent" button per agent card (calls OpenClaw API to kill session)
- **Why now:** "Active" tells you nothing. "Active — working on SalesPipeCRM v2 API redesign, last action 3m ago" tells you everything.

### 1C — Overview: Activity Ticker + Launch Countdown
- Real-time scrolling ticker of last 10 actions across all agents (task moves, completions, errors)
- Launch countdown widget: "41 days until SalesPipeCRM launch"
- **Why now:** Overview is the landing page. It needs to feel alive, not like a static report.

### 1D — Cost Center: Budget Projections
- "At current burn rate, projected spend by April 30: $X" card
- Configurable alert thresholds from UI (not hardcoded)
- **Why now:** Historical spend is nice. Knowing you're on track to blow your budget before launch is critical.

### 1E — CRM Panel: Trial Conversion Funnel
- Funnel visualization: Signup → Activated → Active (7d) → Converted to Paid
- Inactive tenant detection: flag tenants with no login in 14+ days
- **Why now:** This is THE metric for launch. If trials aren't converting, nothing else matters.

### 1F — N8N Panel: Error Surfacing
- Failed workflow executions get a red alert banner at top of panel
- Error count badge on N8N sidebar icon
- **Why now:** Silent failures are the worst kind. Quick fix.

### 1G — System Health: Historical Graphs
- CPU, RAM, disk usage over time (line charts, last 24h/7d)
- Store periodic snapshots in SQLite (every 5 min)
- **Why now:** A gauge showing 73% CPU means nothing without trend context. Is it climbing or stable?

**Phase 1 Deliverables:**
- [ ] Kanban overdue highlighting
- [ ] Fleet Monitor task context + kill switch
- [ ] Overview activity ticker + launch countdown
- [ ] Cost Center projections + configurable alerts
- [ ] CRM trial funnel + churn detection
- [ ] N8N error alerting
- [ ] System Health historical graphs

---

## Phase 2: Activity Log Tab + Security Foundation
**Timeline:** Week 2–3 (March 27 — April 10)
**Goal:** Add the missing visibility layer and lock the door.

### 2A — Activity Log Tab (NEW)
- Unified chronological feed: agent actions, task state changes, errors, deployments, approvals
- Filterable by: agent, business unit, severity, time range
- Persistent in SQLite (new `activity_log` table)
- SSE-powered real-time streaming
- **Architecture:**
  - All existing endpoints emit activity events (middleware pattern)
  - New `/api/activity` endpoint with pagination + filters
  - Frontend: virtualized list for performance (could be thousands of entries)

### 2B — Settings/Admin Tab (NEW) — Phase 1 Security
- **Login screen** with JWT-based session auth
- **RBAC:** Admin, Operator, Viewer roles
  - Admin: full access (create/delete tasks, kill agents, manage settings)
  - Operator: read/write tasks, view everything, no settings access
  - Viewer: read-only across all tabs
- **User management panel** (part of Settings tab)
- Secure all API routes with auth middleware
- **Why this phase:** We cannot keep running an open dashboard. Every day it's exposed is a risk.

### 2C — Aegis Review System (Quality Gates)
- Tasks moved to "Review" column require Admin approval to move to "Done"
- Approval/rejection buttons on Review column cards
- Agents cannot programmatically bypass Review → Done without approval flag
- Activity Log captures all approval/rejection events

**Phase 2 Deliverables:**
- [ ] Activity Log tab with filters + SSE
- [ ] Settings tab scaffolding
- [ ] JWT auth + login screen
- [ ] RBAC (3 roles) + API middleware
- [ ] Aegis quality gates on Kanban

---

## Phase 3: Orchestration & Management
**Timeline:** Week 4–5 (April 10–24)
**Goal:** Turn the dashboard into a true control plane, not just a monitor.

### 3A — Cron Job GUI
- Visual panel to manage OpenClaw cron jobs
- Create/edit/delete/pause cron schedules from the UI
- Natural language input → cron config (e.g., "Daily briefing at 9 AM")
- View next run time, last run result, execution history
- Lives as a section within the Settings/Admin tab

### 3B — Skills Hub Panel
- Browse installed OpenClaw skills with version info
- Install/update skills from ClawHub directly in the UI
- Skill health status (working / broken / outdated)
- Lives as a section within the Settings/Admin tab

### 3C — Environment Variable Manager
- Secure UI to view/add/edit/delete env vars per agent
- Masked values by default, reveal on click
- Audit log for all env var changes
- Lives as a section within the Settings/Admin tab
- **Security:** Encrypted at rest in SQLite, only Admin role can access

### 3D — Advanced Fleet Controls
- Bulk agent operations (restart all, stop all)
- Agent configuration editing (model, thinking level, channels)
- Real-time "thinking" view — see agent's current reasoning/tool calls streamed live
- **Architecture:** Requires deeper OpenClaw gateway API integration

**Phase 3 Deliverables:**
- [ ] Cron GUI in Settings tab
- [ ] Skills Hub in Settings tab
- [ ] Env Var Manager in Settings tab
- [ ] Advanced fleet controls (bulk ops, config editing, live telemetry)

---

## Phase 4: Scale & Multi-Gateway
**Timeline:** Post-launch (May 2026+)
**Goal:** Prepare for growth beyond a single VPS.

### 4A — Multi-Gateway Support
- Backend connects to multiple OpenClaw instances
- Gateway registry (add/remove/configure instances)
- Unified view: all agents across all gateways in one Fleet Monitor
- Per-gateway health in System Health tab
- **Architecture:** Abstract current single-gateway calls behind a gateway registry service

### 4B — Deployments Tab (NEW)
- Git push → build → deploy pipeline status per repo
- Trigger deploys from dashboard
- Rollback support
- Requires CI/CD pipeline (GitHub Actions) to be built first (existing task on board)

### 4C — Advanced Telemetry
- Deep log integration: full agent conversation traces viewable in dashboard
- Token-level cost attribution per conversation
- Performance profiling: response times, tool call latency
- Exportable reports (PDF/CSV)

### 4D — Notifications & Webhooks
- Configurable alerts to Telegram/Slack/Email
- Webhook endpoints for external integrations
- Escalation chains (alert → wait → escalate to Billy)

**Phase 4 Deliverables:**
- [ ] Multi-gateway registry + unified views
- [ ] Deployments tab (post CI/CD)
- [ ] Deep telemetry + conversation traces
- [ ] Notification system + webhooks

---

## Tab Summary (Final State)

| # | Tab | Status | Phase |
|---|-----|--------|-------|
| 1 | Overview | Exists → Enhanced (P1) | 1 |
| 2 | Fleet Monitor | Exists → Enhanced (P1, P3) | 1, 3 |
| 3 | Cost Center | Exists → Enhanced (P1) | 1 |
| 4 | Kanban | Exists → Enhanced (P1, P2) | 1, 2 |
| 5 | CRM Panel | Exists → Enhanced (P1) | 1 |
| 6 | N8N Panel | Exists → Enhanced (P1) | 1 |
| 7 | System Health | Exists → Enhanced (P1) | 1 |
| 8 | Activity Log | **NEW** | 2 |
| 9 | Settings/Admin | **NEW** | 2, 3 |
| 10 | Deployments | **NEW** (post-launch) | 4 |

---

## Dependencies & Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| OpenClaw API doesn't expose kill/restart endpoints | Fleet kill switch blocked | Fall back to SSH exec, or contribute upstream |
| SalesPipeCRM doesn't have trial tracking events yet | CRM funnel tab has no data | Billy needs to add tracking on Replit side first |
| Phase 2 auth breaks existing workflows | Agents can't talk to Ops Center | Add API key auth for machine-to-machine alongside JWT |
| Cron GUI requires OpenClaw config file writes | Could corrupt gateway config | Write to staging config, validate, then hot-swap |
| Multi-gateway adds network complexity | Latency, auth across VPSs | Defer to post-launch, keep single-gateway stable first |

---

## Execution Model

- **Phase 1:** Bubba executes directly — these are surgical improvements to existing code
- **Phase 2+:** Bubba architects, sub-agents execute under review (Aegis system eats its own dog food)
- **All code:** TypeScript, React 18, Express, SQLite, Tailwind — no new tech debt
- **All changes:** Committed to `billymiller-bbkillc/bbk-ops-center` repo

---

*"Ship the improvements that make today better. Build the platform that makes tomorrow possible."*
