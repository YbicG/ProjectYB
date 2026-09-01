# 🌟 ProjectYB Features & Capabilities Guide

This document provides an exhaustive, detailed reference for all developer tools, background daemons, security systems, and productivity utilities built into **ProjectYB Desktop**.

---

## 📑 Table of Contents

1. [Modern Bento Dashboard & Mission Control Wallboard](#1-modern-bento-dashboard--mission-control-wallboard)
2. [Workspace Management & Monorepo Workbench](#2-workspace-management--monorepo-workbench)
3. [In-App Quick Code Peek Editor](#3-in-app-quick-code-peek-editor)
4. [Git Studio, Visual Branch DAG & Conflict Resolver](#4-git-studio-visual-branch-dag--conflict-resolver)
5. [Multi-Provider AI Copilot Hub](#5-multi-provider-ai-copilot-hub)
6. [Database Studio & Redis Key-Value Browser](#6-database-studio--redis-key-value-browser)
7. [API Studio & OpenAPI Swagger Explorer](#7-api-studio--openapi-swagger-explorer)
8. [Cloudflare Zero Trust Hub & Named Tunnels](#8-cloudflare-zero-trust-hub--named-tunnels)
9. [Local HTTPS Reverse Proxy & Trusted Root CA PKI](#9-local-https-reverse-proxy--trusted-root-ca-pki)
10. [Global Secrets Vault & Environment Manager](#10-global-secrets-vault--environment-manager)
11. [Deep Freeze Project Archiver & Disk Optimizer](#11-deep-freeze-project-archiver--disk-optimizer)
12. [Developer Asset Forge & Favicon Suite](#12-developer-asset-forge--favicon-suite)
13. [Executable Markdown Runbooks & Scratchpad](#13-executable-markdown-runbooks--scratchpad)
14. [Visual Developer Recipes & Automation](#14-visual-developer-recipes--automation)
15. [Background Cron Task Scheduler](#15-background-cron-task-scheduler)
16. [Mock REST Server & Webhook Catcher](#16-mock-rest-server--webhook-catcher)
17. [Smart Port Conflict Engine & Service Killer](#17-smart-port-conflict-engine--service-killer)
18. [Mobile Remote Companion PWA](#18-mobile-remote-companion-pwa)

---

## 1. Modern Bento Dashboard & Mission Control Wallboard

The Dashboard is the central command deck of ProjectYB. It provides high-density visibility into all active projects, system health, and running processes.

```
┌────────────────────────────────────────────────────────────────────────┐
│ 🚀 PROJECTYB DASHBOARD                           [Workspace: Main ▼]   │
├───────────────────────────────────┬────────────────────────────────────┤
│ 📌 PINNED PROJECTS                │ 📊 SYSTEM TELEMETRY                │
│ ┌───────────────┐ ┌─────────────┐ │ • CPU: [████░░░░░░░░] 34% (8-Core) │
│ │ Web Frontend  │ │ Auth API    │ │ • RAM: [███████░░░░░] 58% (18.4GB) │
│ │ Next.js 15    │ │ Express/TS  │ │ • Active Ports: 3000, 8080, 5432   │
│ │ ▶ dev | ▶ test│ │ ▶ start     │ │ • Running Services: 3 Active       │
│ └───────────────┘ └─────────────┘ ├────────────────────────────────────┤
│ 📁 ALL REPOSITORIES (18 Projects) │ 🟢 ACTIVE BACKGROUND SERVICES      │
│ ┌───────────────────────────────┐ │ 1. web-frontend (Port: 3000) [Logs]│
│ │ Search & Filter Projects...   │ │ 2. auth-api     (Port: 8080) [Logs]│
│ └───────────────────────────────┘ │ 3. redis-server (Port: 6379) [Stop]│
└───────────────────────────────────┴────────────────────────────────────┘
```

### Key Capabilities:
* **Dual Layout Modes**: Toggle seamlessly between **Modern Bento Layout** (high-density cards, telemetry sparklines, collapsible icon rail) and **Classic Layout** without restarting background services.
* **Pinned Projects Shelf**: Pin frequently used repositories to the top-tier shelf for 1-tap script execution.
* **Mission Control Telemetry**: Streaming sparkline graphs for CPU, RAM, disk I/O, active TCP ports, and container statuses.
* **Live Service Status Badges**: Real-time process badges showing whether a project's dev server is idle, booting, or actively serving traffic.

---

## 2. Workspace Management & Monorepo Workbench

Manage multiple multi-service architectures and monorepos without getting lost in nested folder structures.

### Key Capabilities:
* **Recursive Discovery**: Detects standard project manifests:
  * Node.js / JavaScript / TypeScript (`package.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lockb`)
  * Python (`requirements.txt`, `pyproject.toml`, `Pipfile`, `setup.py`)
  * Rust (`Cargo.toml`)
  * Go (`go.mod`)
  * Docker (`Dockerfile`, `docker-compose.yml`)
* **Monorepo Subproject Discovery**: Automatically detects nested workspaces inside `apps/`, `packages/`, `services/`, and `modules/`.
* **Subproject Action Toolbar**: Every nested subproject card provides 1-click actions:
  * `>_ Terminal`: Spawns a PTY terminal in the Universal Bottom Dock scoped to the subfolder.
  * `📁 Explorer`: Opens the subfolder in the OS file explorer.
  * `⚡ Code Peek`: Inspects manifest files (`package.json`, `.env`) in-app.
  * `🔒 Subproject .env`: Opens an isolated environment editor for the subfolder.
  * `💻 VS Code`: Opens the subproject directory in an external editor.
* **Workspace Scoping Engine**: Group repositories into isolated workspaces (e.g. *E-Commerce*, *DevOps*, *Internal Tools*). Activating a workspace filters the entire application across all tabs.
* **Team Configuration (`.ybicg/services.json`)**: Check project scripts, tags, and run configs into Git inside `.ybicg/services.json`.

---

## 3. In-App Quick Code Peek Editor

Inspect and edit configuration files without launching heavy IDEs.

### Key Capabilities:
* **Auto-Discovery of Config Files**: Instantly discovers common project files (`package.json`, `.env`, `.env.example`, `tsconfig.json`, `README.md`, `Dockerfile`, `Cargo.toml`, `requirements.txt`, `go.mod`).
* **Monospace Code Canvas**: Clean monospace rendering with line gutters, syntax coloring, and clipboard copy.
* **Hot-Saving**: Make quick edits and press <kbd>Ctrl</kbd> + <kbd>S</kbd> to persist changes atomically to disk.
* **Dirty State Indicator**: Displays a clear visual badge when changes are unsaved.

---

## 4. Git Studio, Visual Branch DAG & Conflict Resolver

A complete source control studio built directly into ProjectYB.

```
┌────────────────────────────────────────────────────────────────────────┐
│ 🌿 GIT STUDIO - my-project                     [Branch: feat/auth ▼]   │
├──────────────────────────┬─────────────────────────────────────────────┤
│ 📝 WORKING TREE (3 Files) │ 🔄 VISUAL DIFF / CONFLICT RESOLVER          │
│ [✓] Staged (2)           │ ┌─────────────────────────────────────────┐ │
│   + src/auth/login.ts    │ │ <<<<<<< HEAD (Current Change)           │ │
│   + src/auth/jwt.ts      │ │   const TOKEN_EXPIRY = '24h';           │ │
│ [ ] Unstaged (1)         │ │ =======                                 │ │
│   • package.json         │ │   const TOKEN_EXPIRY = '7d';            │ │
│ ──────────────────────── │ │ >>>>>>> feat/auth (Incoming Change)     │ │
│ 💬 COMMIT MESSAGE        │ └─────────────────────────────────────────┘ │
│ [AI Generate Message ✨] │ [Accept Current] [Accept Incoming] [Accept] │
│ feat(auth): add JWT auth │                                             │
│ [Commit & Push (Ctrl+↵)] │ 🌿 BRANCH DAG GRAPH (Visual Commit History) │
└──────────────────────────┴─────────────────────────────────────────────┘
```

### Key Capabilities:
* **Windowed Virtualization Engine**: Progressive viewport rendering handles repositories with **10,000+ uncommitted files** with zero UI lag.
* **Visual Branch DAG**: Interactive SVG commit tree displaying branches, commit SHA badges, author info, and stash shelves.
* **AI Commit Copilot**: 1-click generation of conventional commit messages based on staged file diffs.
* **Visual 3-Way Merge Conflict Editor**: Parses Git conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`) with 1-click **Accept Current**, **Accept Incoming**, or **Accept Both** resolution buttons.
* **GitHub Integration**: Direct GitHub REST API v3 integration pulling PRs, Issues, star counts, and 1-click remote repository creation.
* **Smart `.gitignore` Wizard**: Identifies untracked build artifacts (`node_modules`, `dist`, `.cache`) and appends clean ignore rules in 1 click.

---

## 5. Multi-Provider AI Copilot Hub

ProjectYB includes an AI assistant that integrates seamlessly with your local development tools.

### Supported Providers:
* **Local Ollama** (e.g. `llama3`, `codellama`, `mistral`, `deepseek-coder` via `http://localhost:11434`)
* **Anthropic Claude** (`claude-3-5-sonnet`, `claude-3-haiku`)
* **OpenAI** (`gpt-4o`, `gpt-4o-mini`, `o1`)
* **Google Gemini** (`gemini-1.5-pro`, `gemini-1.5-flash`)
* **Custom OpenAI-Compatible Endpoints** (LocalAI, vLLM, LM Studio, Groq, OpenRouter)

### AI Capabilities:
* **AI Commit Message Generator**: Analyzes staged diffs and generates structured conventional commits (`feat:`, `fix:`, `refactor:`).
* **Terminal Error Diagnosis**: Feed terminal stdout/stderr crash traces into the AI to receive actionable fix explanations and terminal commands.
* **AI Project Context Generator**: Scans repository structure and manifests to generate a comprehensive `.ai-context.md` file for LLM IDE tools (Cursor, Copilot, Windsurf).

---

## 6. Database Studio & Redis Key-Value Browser

An interactive database querying workstation supporting multiple engines with zero external software required.

```
┌────────────────────────────────────────────────────────────────────────┐
│ 🗄️ DATABASE STUDIO                                                     │
├──────────────────────────┬─────────────────────────────────────────────┤
│ 📁 DISCOVERED CONNECTIONS│ ⚡ SQL WORKBENCH (SQLite: app.db)           │
│ • [SQLite] app.db        │ ┌─────────────────────────────────────────┐ │
│ • [Postgres] localhost   │ │ SELECT id, email, created_at FROM users │ │
│ • [Redis] 127.0.0.1:6379 │ │ ORDER BY created_at DESC LIMIT 50;      │ │
│ ──────────────────────── │ └─────────────────────────────────────────┘ │
│ 🌳 SCHEMA TREE           │ [▶ Execute Query] [Syntax Helpers ▼] [Export]│
│ ▾ 📄 users (142 rows)    ├─────────────────────────────────────────────┤
│   • id (INTEGER PK)      │ 📊 RESULT DATA (142 Rows - 1.2ms)           │
│   • email (TEXT)         │ | id | email            | created_at        |│
│   • is_active (BOOLEAN)  │ | 1  | alice@yb.dev     | 2026-08-15 10:20  |│
│ ▾ 📄 sessions (48 rows)  │ | 2  | bob@yb.dev       | 2026-08-16 14:12  |│
└──────────────────────────┴─────────────────────────────────────────────┘
```

### Key Capabilities:
* **Smart Connection Auto-Discovery**: Automatically discovers database connection strings from `.env` files across root and subfolders while masking sensitive passwords.
* **Native 3-Tier SQLite Engine**: Embedded query execution using native Node `node:sqlite` DatabaseSync with transparent `sqlite3 -json` CLI fallback for 100% execution reliability.
* **Interactive Schema Tree**: Browse tables, views, columns, primary keys, and data types with 1-click **Inspect Rows** shortcuts.
* **Advanced Data Grid**: Sortable, filterable data grid with row numbering, sticky headers, JSON object modal preview, and 1-click CSV/JSON export.
* **Dedicated Redis RESP Studio**: Real RESP socket tokenizer with pattern matching (`user:*`, `cache:*`), key-type badges (`STRING`, `HASH`, `LIST`, `SET`), live TTL timers, and key value editing.

---

## 7. API Studio & OpenAPI Swagger Explorer

A native REST client and API documentation explorer.

### Key Capabilities:
* **Full HTTP Method Support**: Execute `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`.
* **Dynamic Parameter & Header Builders**: Key-value query parameter editors and autocomplete headers (`Content-Type`, `Authorization: Bearer <token>`).
* **Request Body Editor**: JSON, Form Data, and Raw text body support with format validation.
* **Response Benchmarking**: Inspect response status badges (`200 OK`), duration metrics (`42ms`), size (`12.4 KB`), headers, and formatted JSON output.
* **OpenAPI / Swagger Auto-Discovery**: Automatically finds local `openapi.json`, `swagger.json`, `openapi.yaml` files or loads remote URLs with 1-click endpoint transfer into the request builder.

---

## 8. Cloudflare Zero Trust Hub & Named Tunnels

Expose local development ports to the public internet securely.

### Key Capabilities:
* **Quick Tunnels (`trycloudflare.com`)**: 1-click instant tunnel launch requiring zero Cloudflare accounts. Returns a public HTTPS URL immediately.
* **Named Persistent Tunnels (Cloudflare API v4)**:
  * Authenticate with Cloudflare API tokens.
  * Select DNS Zones (`yourdomain.com`).
  * Automatically creates tunnel IDs, provisions ingress configuration, and registers DNS CNAME records (`api.yourdomain.com`).
* **Tunnel Lifecycle & Logs**: Live monitoring, connection restart, and log streaming for all active `cloudflared` instances.

---

## 9. Local HTTPS Reverse Proxy & Trusted Root CA PKI

Eliminate `http://localhost:3000` in favor of clean `.test` domain names with trusted green padlocks.

### Key Capabilities:
* **SNI-Based Reverse Proxy**: Routes inbound requests on port 80/443 (or 8080/8443) dynamically based on the requested hostname (e.g. `https://web.my-app.test` -> `http://127.0.0.1:3000`).
* **Automated Root CA PKI (Green Padlock Engine)**: Generates a trusted local X.509 certificate authority and installs it into the Windows Certificate Store (`Cert:\LocalMachine\Root`).
* **On-the-Fly Leaf Certificate Generation**: Dynamically signs valid SSL certificates for any `.test` domain requesting an HTTPS connection.
* **System Hosts File Sync**: Automatically synchronizes proxy hostnames to `127.0.0.1` in the OS `hosts` file using background elevation.

---

## 10. Global Secrets Vault & Environment Manager

Securely manage sensitive environment variables and credentials across projects.

```
┌────────────────────────────────────────────────────────────────────────┐
│ 🔐 GLOBAL SECRETS VAULT                                 [+ Add Secret] │
├────────────────────────────────────────────────────────────────────────┤
│ 🔍 Search secrets (AI, Database, Auth, Cloud, Payments)...             │
│ ┌───────────────────────┬──────────────┬─────────────┬───────────────┐ │
│ │ KEY NAME              │ CATEGORY     │ ENVIRONMENT │ ACTIONS       │ │
│ ├───────────────────────┼──────────────┼─────────────┼───────────────┤ │
│ │ OPENAI_API_KEY        │ AI           │ All         │ [Copy] [Sync] │ │
│ │ DATABASE_URL_PROD     │ Database     │ Production  │ [Copy] [Sync] │ │
│ │ STRIPE_SECRET_KEY     │ Payments     │ Staging     │ [Copy] [Sync] │ │
│ └───────────────────────┴──────────────┴─────────────┴───────────────┘ │
│ 💡 1-Click Sync: Replaces placeholder values in active project's .env  │
└────────────────────────────────────────────────────────────────────────┘
```

### Key Capabilities:
* **Encrypted Centralized Store**: Secure storage for reusable credentials with category filtering (`AI`, `Database`, `Auth`, `Cloud`, `Payments`, `DevOps`) and environment tagging (`Dev`, `Staging`, `Prod`).
* **1-Click Bulk `.env` Sync**: Scans the active project's `.env` for empty or missing variables and populates them from matching vault keys.
* **Auto-Suggest Chips**: When editing `.env` files, matching vault keys appear as 1-click autocomplete chips.
* **Environment Profiler & Example Generator**: Compares `.env` against `.env.example`, flags missing keys and duplicate entries, and generates clean sanitized `.env.example` templates.

---

## 11. Deep Freeze Project Archiver & Disk Optimizer

Reclaim tens of gigabytes of disk space occupied by dormant development projects.

### Key Capabilities:
* **Inactivity Scanner**: Scans repositories across configured roots and filters projects dormant for >14, 30, 60, or 90 days.
* **In-Place Deep Freeze**: Purges bulky build artifacts (`node_modules`, `target`, `.cache`, `dist`, `.venv`) while preserving all source code and caching a frozen manifest. Instantly reclaims **90%+ disk space**.
* **1-Click Thaw & Restore**: Restores the project manifest and triggers package installation when returning to development.
* **Turbocharged Disk Space Scanner**: Parallel breadth-first directory scanner with filesystem `mtime` caching, speeding up disk analysis by **50x** with real-time streaming updates.
* **Global Cache Cleaner**: Purges global package manager caches (`npm cache clean`, `pnpm store prune`, `pip cache purge`, `cargo cache`) in 1 click.

---

## 12. Developer Asset Forge & Favicon Suite

Generate comprehensive web and app icon suites without external tools.

### Key Capabilities:
* **Automated Favicon Suite Generation**: Select any source image (PNG, SVG, JPG) and automatically generate:
  * `favicon.ico`
  * `favicon-16x16.png`
  * `favicon-32x32.png`
  * `apple-touch-icon.png` (180x180)
  * `android-chrome-192x192.png`
  * `android-chrome-512x512.png`
  * `site.webmanifest`
  Directly into the project's `public/` directory.
* **Batch Image Converter & Optimizer**: Convert between PNG, JPEG, and WebP with configurable compression quality and real-time byte savings calculations.

---

## 13. Executable Markdown Runbooks & Scratchpad

Transform static project notes into interactive execution runbooks.

```
┌────────────────────────────────────────────────────────────────────────┐
│ 📝 RUNBOOK: deployment-guide.md                                        │
├────────────────────────────────────────────────────────────────────────┤
│ # Database Migration & Deployment Procedure                            │
│                                                                        │
│ Ensure you pull the latest migrations before running the seed script:  │
│                                                                        │
│ ┌─ bash ─────────────────────────────────────────────────────────────┐ │
│ │ pnpm prisma migrate deploy && pnpm prisma db seed                  │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│ [▶ Run in Dock]  [▶ Execute Inline (Exit: 0 | 142ms)]  [📋 Copy]       │
│                                                                        │
│ - [x] Step 1: Run database migration                                   │
│ - [ ] Step 2: Deploy Cloudflare Worker                                 │
└────────────────────────────────────────────────────────────────────────┘
```

### Key Capabilities:
* **Interactive Fenced Code Blocks**: Markdown code blocks (`bash`, `sh`, `sql`, `npm`, `python`) become interactive execution widgets.
* **Execution Options**:
  * **`▶ Run in Dock`**: Launches the command directly in the Universal Bottom Dock (`Ctrl+~`).
  * **`▶ Execute Inline`**: Runs the command in the background, displaying execution duration, exit code (`Exit 0`), stdout, and stderr in an expandable drawer.
* **Global Scratchpad (`Ctrl+Shift+N`)**: Omnipresent modal for cross-project scratch notes with debounced auto-save.

---

## 14. Visual Developer Recipes & Automation

Build, visualize, and execute multi-step development pipelines with visual action blocks.

### Supported Action Blocks:
1. `install_deps` — Runs `pnpm install` / `npm install` / `cargo build`.
2. `clean_artifacts` — Purges `dist/`, `build/`, `.cache/`.
3. `run_tests` — Executes test suites (`npm test`, `pytest`, `cargo test`).
4. `typecheck_lint` — Runs TypeScript `tsc --noEmit` and ESLint.
5. `docker_compose` — Executes `docker-compose up -d` or `docker-compose down`.
6. `project_script` — Executes any script declared in `package.json` or `.ybicg/services.json`.
7. `git_pull` — Triggers a fast-forward Git pull from remote upstream.
8. `custom_command` — Runs arbitrary shell scripts in the project directory.
9. `delay` — Pauses execution for a specified duration (e.g. waiting for database warm-up).

### Capabilities:
* Step-by-step progress tracking with animated active spinners.
* Real-time streaming log console capturing stdout/stderr per step.
* Execution timer benchmarks and Stop-on-Failure safety toggles.

---

## 15. Background Cron Task Scheduler

Automate recurring developer tasks in the background.

### Key Capabilities:
* **Cron Expression Support**: Define schedules using standard 5-field cron syntax (e.g. `*/15 * * * *` for every 15 minutes).
* **Manual Run Trigger**: Execute any scheduled job on demand with 1 click.
* **Duration Benchmarking**: Tracks average execution duration and success/failure exit codes.
* **Execution History**: Full log audit trail of previous runs.

---

## 16. Mock REST Server & Webhook Catcher

Emulate backend microservices and test third-party webhooks without external cloud services.

### Key Capabilities:
* **Custom Route Definitions**: Define arbitrary HTTP routes (`/api/v1/users`, `/webhooks/stripe`), methods (`GET`, `POST`, `PUT`, `DELETE`), and status codes (`200 OK`, `201 Created`, `400 Bad Request`, `500 Server Error`).
* **Simulated Latency**: Add configurable delay timers (e.g. `500ms`) to test loading skeletons and UI spinners.
* **Dynamic JSON Payloads**: Return custom JSON mock responses.
* **Incoming Webhook Inspector**: Capture, inspect, and replay incoming webhook HTTP headers and payloads (Stripe, GitHub, Shopify).

---

## 17. Smart Port Conflict Engine & Service Killer

Never let an occupied port halt your development flow.

### Key Capabilities:
* **Port Listener Scanner**: Real-time scanning of open TCP ports, PID ownership, and process names (`node.exe`, `python.exe`, `docker-proxy.exe`).
* **Smart Port Collision Auto-Rerouter**: When launching a service on an occupied port, ProjectYB presents two instant options:
  1. **Kill Occupying Process**: Forcefully terminates the occupying PID (`taskkill /F /PID`).
  2. **Auto-Reroute to Port Y**: Automatically finds the next free TCP port and updates `.env` `PORT=...` atomically.
* **Hanging Service Killer**: Scans process trees to forcefully terminate orphaned Node/Python processes and background zombie workers.

---

## 18. Mobile Remote Companion PWA

Control your desktop workstation from your phone over local WiFi or Cloudflare Zero Trust.

### Key Capabilities:
* **Pure Vector SVG Interface**: Zero external icon downloads; ultra-fast rendering on iOS Safari and Android Chrome.
* **Safe-Area Inset Handling**: Native-app feel adapting to iPhone Dynamic Islands and Android navigation bars.
* **Real-Time Telemetry HUD**: Live CPU and RAM load spark gauges.
* **Remote Service Management**: Start, stop, restart, view streaming logs, and force-kill desktop background services from your phone.
* **Interactive Mobile Console**: Run shell commands directly in any project folder with quick preset buttons.
* **Mobile Git Studio**: Check repository branch status, trigger `git pull`, and stage/commit/push changes remotely.
* **1-Tap Emergency STOP**: Instantly kills all active desktop background processes in an emergency.

---

<div align="center">
  <sub>ProjectYB Features Guide • Version 1.0.0 • Maintained by YBicG</sub>
</div>
