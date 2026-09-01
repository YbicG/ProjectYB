<div align="center">

# ⚡ ProjectYB Desktop

### *The Ultimate Developer Command Center & Project Manager for Modern Engineers*

[![Version](https://img.shields.io/badge/version-1.0.0-8b5cf6?style=for-the-badge&logo=semver&logoColor=white)](https://github.com/YbicG/ProjectYB)
[![Electron](https://img.shields.io/badge/Electron-34.2.0-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-6.1.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Platform](https://img.shields.io/badge/Platform-Windows%20|%20macOS%20|%20Linux-22c55e?style=for-the-badge&logo=linux&logoColor=white)](#-getting-started)
[![License](https://img.shields.io/badge/license-MIT-f59e0b?style=for-the-badge)](LICENSE)

<br />

**ProjectYB** is a high-performance, all-in-one desktop workstation designed to eliminate context switching for software engineers. It unifies recursive project scanning, monorepo management, hardware-accelerated PTY terminals, embedded Git & GitHub studios, multi-engine database querying, Cloudflare Zero Trust tunneling, trusted local HTTPS proxying, encrypted secret vaults, executable Markdown runbooks, and a responsive mobile companion PWA into a single, cohesive interface.

<br />

[✨ Key Features](#-key-features-showcase) •
[🏛️ Architecture](#%EF%B8%8F-architecture--tech-stack) •
[🚀 Getting Started](#-getting-started) •
[⌨️ Shortcuts](#%EF%B8%8F-keyboard-shortcuts-cheat-sheet) •
[📖 Documentation](#-documentation-index)

</div>

---

## 🎯 Value Proposition & Elevator Pitch

Modern software engineering involves juggling dozens of disparate tools: terminal emulators, Git GUI clients, database inspectors, API testers, `.env` file editors, tunneling utilities, Docker dashboards, and scratchpads. 

**ProjectYB consolidates this entire developer toolchain into one unified, lightning-fast workstation:**

- 🗂️ **Zero Configuration Discovery**: Recursively detects projects across your filesystem (Node, Python, Go, Rust, Monorepos) with instant script and environment extraction.
- ⚡ **Hardware-Accelerated Terminal Dock**: Omnipresent sliding PTY terminal dock (`Ctrl+~`) with WebGL acceleration that persists state across page transitions.
- 🌐 **Zero Trust Cloudflare Tunnels & Local HTTPS**: 1-click public URL generation and local `.test` domain reverse proxying with trusted green padlocks via Windows Root CA.
- 🗄️ **Multi-Engine Database Studio**: Direct SQL querying and schema exploration for SQLite, PostgreSQL, MySQL, Redis, and MongoDB with automatic `.env` discovery and zero-dependency fallbacks.
- 🔐 **Global Secrets Vault & Environment Sync**: Securely manage shared API keys, detect missing variables against `.env.example`, and sync credentials in 1 click.
- 📱 **Mobile Companion PWA**: Control background services, monitor hardware telemetry, run shell commands, and push Git commits directly from your smartphone over local WiFi or Cloudflare tunnels.

---

## ✨ Key Features Showcase

```mermaid
mindmap
  root((ProjectYB))
    Workspace & Monorepo
      Recursive Scanner
      Monorepo Subprojects
      Workspace Scoping
      .ybicg Services Schema
    Developer Studio
      Git Studio & Branch DAG
      AI Commit Copilot
      Database Studio & Redis
      API Studio & OpenAPI
      In-App Code Peek
    Cloud & Network
      Cloudflare Named Tunnels
      Local HTTPS Proxy
      Windows Root CA PKI
      Mock REST & Webhooks
    Secrets & Storage
      Global Secrets Vault
      Deep Freeze Archiver
      Turbo Disk Scanner
      Global Cache Cleaner
    Automation & Telemetry
      Visual Developer Recipes
      Executable Runbooks
      Background Cron Engine
      Mission Control Wallboard
      Port Collision Auto-Reroute
    Mobile Companion PWA
      Touch Telemetry HUD
      Service Remote Controls
      Mobile Shell Runner
      Git Pull & Push
```

### 1. 🏢 Workspace & Monorepo Hierarchy
* **Recursive Discovery**: Automatically scans root directories (e.g., `D:\Code`) detecting markers for Node.js, Python, Rust (Cargo), Go, and monorepos (`apps/`, `packages/`).
* **Subproject Action Toolbar**: 1-click terminal launch, folder explorer, code peek, `.env` manager, and VS Code integration for nested monorepo packages.
* **Workspace Scoping Engine**: Organize repositories into custom isolated workspaces (e.g., *Frontend*, *Microservices*, *Client A*) that scope the entire UI, Git views, and services.
* **Team-Shared Configuration**: Stores service scripts and multi-step run configurations in `.ybicg/services.json` inside each repository for version-controlled consistency.

### 2. 🛠️ Developer Studio
* **Git Studio & Branch DAG**: High-performance windowed working tree capable of handling 10,000+ file changes with zero lag, interactive branch tree visualization, 3-way merge conflict editor, and GitHub PR/issue tracking.
* **AI Commit Copilot**: Integrated support for local Ollama, Anthropic Claude, OpenAI, Google Gemini, and custom endpoints to generate conventional commit messages and diagnose runtime errors.
* **Database Studio**: Interactive SQL console with syntax helpers, schema inspector, table data grid with CSV/JSON export, and a dedicated Redis RESP key-value browser with live TTL tracking.
* **API Studio & OpenAPI Explorer**: Native REST client supporting custom headers, query params, response benchmarking, and automatic loading of OpenAPI/Swagger 2.0/3.0 specifications.
* **In-App Quick Code Peek**: Instant file inspector with line-number gutters, live dirty state indicators, clipboard copy, and `Ctrl+S` hotkey file saving directly to disk.

### 3. 🌐 Cloud, Network & Security
* **Cloudflare Zero Trust Hub**: Manage Quick Tunnels (`trycloudflare.com`) and Cloudflare API v4 Named Tunnels with automated DNS CNAME routing and custom hostname provisioning.
* **Local HTTPS Reverse Proxy**: Built-in SNI-capable reverse proxy mapping custom `.test` domains (e.g., `https://api.my-app.test`) to local development ports.
* **Windows Root CA PKI (Green Padlock Engine)**: Automated PowerShell PKI certificate generator and Windows Certificate Store installer (`Cert:\LocalMachine\Root`) providing trusted SSL in all major browsers.
* **System Hosts File Sync**: Automatically synchronizes `.test` proxy domains to `127.0.0.1` using elevated background scripts.
* **Mock REST Server & Webhook Catcher**: Run an embedded HTTP mock server with custom route definitions, simulated latency, dynamic JSON responses, and incoming webhook capture.

### 4. 🔒 Secrets, Storage & Optimization
* **Global Secrets Vault**: Centralized encrypted store for reusable API keys, database strings, and auth tokens with environment-aware tagging (`Dev`, `Staging`, `Prod`) and 1-click `.env` synchronization.
* **Environment Profiler**: Compares active `.env` against `.env.example`, flags missing keys and duplicate entries, and offers 1-click sync of missing keys with vault suggestions.
* **Deep Freeze Project Archiver**: Scans dormant repositories (>14, 30, 60, 90 days), safely purges bulky build artifacts (`node_modules`, `target`, `.cache`), and provides 1-click thaw/restore to reclaim 90%+ disk space.
* **Turbocharged Disk Space Scanner**: Parallel breadth-first directory scanner with filesystem `mtime` caching, speeding up disk analysis by **50x** with in-flight cancellation.
* **Global Cache Cleaner**: One-click cleanup for package manager caches (`npm`, `pnpm`, `cargo`, `pip`) and Docker build artifacts.

### 5. ⚡ Automation, Telemetry & Reliability
* **Visual Developer Recipes**: Build and execute multi-step workflows using 9 prebuilt visual action blocks (`install_deps`, `clean_artifacts`, `run_tests`, `typecheck_lint`, `docker_compose`, `project_script`, `git_pull`, `custom_command`, `delay`) with real-time log streaming and benchmark timers.
* **Executable Markdown Runbooks**: Per-project documentation where fenced code blocks (`bash`, `sh`, `sql`, `npm`) become interactive widgets with inline execution and dock runner integration.
* **Background Cron Task Scheduler**: In-app task scheduler based on cron expressions with manual execution, duration benchmarks, and execution history logging.
* **Smart Port Collision Auto-Rerouter**: Detects port collisions, identifies the occupying PID/process, and provides 1-click options to kill the colliding process or auto-reroute to the next free port with atomic `.env` updating.
* **Hanging Service Killer & Process Radar**: Process tree scanner using `taskkill /F /T` to forcefully terminate zombie background processes and orphaned ports.

### 6. 📱 Mobile Remote Companion PWA
* **100% Vector SVG HUD**: Pure SVG touch interface optimized for mobile devices with safe-area insets (`env(safe-area-inset-top)` & `env(safe-area-inset-bottom)`) for iPhone Dynamic Islands and Android navigation bars.
* **Remote Service Management**: Start, stop, restart, view live streaming logs, and force-kill desktop background services from your phone.
* **Interactive Mobile Console**: Run shell commands directly in any project directory with quick command presets (`git status`, `git pull`, `npm test`, `docker ps`).
* **Mobile Git Control**: Check working tree status, trigger fast-forward pulls, and stage/commit/push changes remotely.
* **Cross-Device Scratchpad**: Real-time synchronization between the desktop Global Scratchpad and your mobile device.

---

## 🏛️ Architecture & Tech Stack

ProjectYB is built on a high-reliability decoupled Electron architecture:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        REACT 19 RENDERER                               │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │ Dual UI Layouts         │  │ Zustand Reactive State Stores (35)  │  │
│  │ • Modern Bento Layout   │  │ • useProjectStore   • useGitStore   │  │
│  │ • Classic Dense Layout  │  │ • useDatabaseStore  • useProxyStore │  │
│  └─────────────────────────┘  └─────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Universal Bottom Dock (xterm.js + WebGL Canvas Acceleration)     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ contextBridge.exposeInMainWorld('api')
┌────────────────────────────────────▼───────────────────────────────────┐
│                       PRELOAD ISOLATION BRIDGE                         │
│  • 38 Strongly Typed API Namespaces (IElectronAPI)                     │
│  • Bidirectional IPC Handlers & Reactive Event Stream Listeners        │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ ipcRenderer.invoke / ipcMain.handle
┌────────────────────────────────────▼───────────────────────────────────┐
│                         ELECTRON MAIN PROCESS                          │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │ Core Services (40)      │  │ Network Daemons                     │  │
│  │ • node-pty Process Pool │  │ • Local HTTPS Reverse Proxy (SNI)   │  │
│  │ • Multi-Tier SQLite     │  │ • Mobile Companion HTTP/SSE (4848)  │  │
│  │ • System Monitor & Disk │  │ • Mock REST Server & Webhooks       │  │
│  │ • Root CA PKI Generator │  │ • Cloudflared Tunnel Subprocess     │  │
│  └─────────────────────────┘  └─────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Platform Integrations (PowerShell, Windows Cert Store, netstat)  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

| Subsystem | Technology | Purpose |
| :--- | :--- | :--- |
| **Desktop Runtime** | Electron 34.2.0 | Multi-process desktop application container |
| **Build & Bundling** | Electron-Vite 3.0 + Vite 6.1 | Lightning-fast HMR and optimized production builds |
| **Frontend Framework** | React 19.0.0 + TypeScript 5.7 | Modern component architecture with strict typing |
| **State Management** | Zustand 5.0 | 35 decoupled domain stores with persistent hydration |
| **Styling & Design System** | Tailwind CSS v4 + Radix UI + Framer Motion | High-density OLED dark interface with dynamic accent tokens |
| **Terminal Subsystem** | `node-pty` 1.0 + `@xterm/xterm` 5.5 + WebGL Addon | Hardware-accelerated terminal emulation and PTY multiplexing |
| **Database Engine** | Native `node:sqlite` + `sqlite3` CLI + Net sockets | Multi-tier resilient SQL querying and Redis RESP protocol |
| **Network & SSL** | Node.js `https` / `tls` SNI + Windows CryptoAPI | Local HTTPS proxy and automated trusted certificate management |
| **Source Control** | `simple-git` 3.27 + `@octokit/rest` 21.1 | Native Git CLI execution and GitHub REST API v3 integration |
| **System Telemetry** | `systeminformation` 5.23 + Node OS/ChildProcess | Real-time CPU, RAM, disk, process tree, and socket inspection |

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your workstation:
* **Node.js**: `v20.0.0` or higher (Node 22 LTS recommended)
* **Package Manager**: `pnpm` (recommended), `npm`, or `yarn`
* **Git**: `v2.30.0` or higher
* *(Optional)* **Docker Desktop**: For container dashboard and database probing
* *(Optional)* **Cloudflared**: For Cloudflare Zero Trust tunneling (can also be installed automatically within the app)

### Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/YbicG/ProjectYB.git
   cd ProjectYB
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Launch in development mode**:
   ```bash
   pnpm dev
   ```
   *Electron will launch with hot-module replacement (HMR) and Chrome DevTools enabled.*

### Type Checking & Linting

```bash
# Run TypeScript checks for both Main and Renderer processes
pnpm typecheck

# Run ESLint across the codebase
pnpm lint
```

### Packaging & Distribution

Build production installers and executables:

```bash
# Build unpacked directory (Windows)
pnpm package:dir

# Build Windows x64 NSIS Installer
pnpm package:win

# Build macOS DMG
pnpm package:mac

# Build Linux AppImage / DEB
pnpm package:linux
```

---

## ⌨️ Keyboard Shortcuts Cheat Sheet

ProjectYB features an extensive keyboard navigation engine. Press `?` or `Ctrl+/` anywhere in the app to view the interactive modal.

| Shortcut | Action | Scope |
| :--- | :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>K</kbd> | Open Universal Command Palette | Global |
| <kbd>Ctrl</kbd> + <kbd>`</kbd> / <kbd>~</kbd> | Toggle Universal Bottom Terminal Dock | Global |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>N</kbd> | Open Global Scratchpad | Global |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>F</kbd> | Open Global Cross-Project Search | Global |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> | Open Quick Command Runner | Global |
| <kbd>Ctrl</kbd> + <kbd>/</kbd> or <kbd>?</kbd> | Open Keyboard Shortcuts Cheat Sheet | Global |
| <kbd>Ctrl</kbd> + <kbd>S</kbd> | Save file in Code Peek / Notes Editor | Editor Views |
| <kbd>Ctrl</kbd> + <kbd>B</kbd> | Toggle Sidebar Navigation Rail | Global |
| <kbd>Esc</kbd> | Close active modal / Unfocus search | Global |

---

## 📖 Documentation Index

For exhaustive technical guides, architecture deep dives, and API specifications, consult the comprehensive documentation in `docs/`:

* 🏛️ **[Architecture Guide (`docs/ARCHITECTURE.md`)](docs/ARCHITECTURE.md)**: Deep dive into the Main Process, Preload ContextBridge, React Renderer, Zustand stores, PTY terminal lifecycle, Multi-Tier SQLite engine, and Local HTTPS reverse proxy.
* 🌟 **[Features Guide (`docs/FEATURES.md`)](docs/FEATURES.md)**: Exhaustive walkthrough of every capability across all 15 implementation phases.
* 📚 **[User Guide (`docs/USER_GUIDE.md`)](docs/USER_GUIDE.md)**: Step-by-step practical developer workflows, recipes, monorepo management, and Mobile PWA pairing.
* 🔌 **[IPC Reference (`docs/IPC_REFERENCE.md`)](docs/IPC_REFERENCE.md)**: Complete specification of all 39 IPC modules, 60+ channels, request payloads, response schemas, and streaming events.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<div align="center">
  <sub>Built with ❤️ by <b>YBicG</b> and the ProjectYB Engineering Team.</sub>
</div>
