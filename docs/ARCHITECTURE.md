# 🏛️ ProjectYB Architecture Deep Dive

This document provides an exhaustive architectural overview of **ProjectYB Desktop & Mobile Companion**, detailing process boundaries, security isolation, state machine synchronization, IPC data flow, native add-on integration, and daemon subsystems.

---

## 📑 Table of Contents

1. [High-Level System Topology](#1-high-level-system-topology)
2. [Process Model & Security Boundaries](#2-process-model--security-boundaries)
3. [Electron Main Process Architecture](#3-electron-main-process-architecture)
4. [Preload Bridge & Type-Safe Context Isolation](#4-preload-bridge--type-safe-context-isolation)
5. [React 19 Renderer & Dual Layout Engine](#5-react-19-renderer--dual-layout-engine)
6. [Zustand State Architecture & Reactive Data Flow](#6-zustand-state-architecture--reactive-data-flow)
7. [PTY Terminal Subsystem & Lifecycle](#7-pty-terminal-subsystem--lifecycle)
8. [Multi-Tier Resilient SQLite & Database Engine](#8-multi-tier-resilient-sqlite--database-engine)
9. [Local HTTPS Reverse Proxy & Windows Root CA PKI](#9-local-https-reverse-proxy--windows-root-ca-pki)
10. [Cloudflare Zero Trust Tunnel Infrastructure](#10-cloudflare-zero-trust-tunnel-infrastructure)
11. [Mobile Companion PWA & Telemetry Pipeline](#11-mobile-companion-pwa--telemetry-pipeline)
12. [Performance Engine & Virtualization Strategies](#12-performance-engine--virtualization-strategies)

---

## 1. High-Level System Topology

ProjectYB separates responsibilities across a multi-process architecture: an Electron Main process running Node.js with native OS capabilities, a secure Preload bridge, a sandboxed React 19 single-page application (SPA), and several embedded background daemons.

```mermaid
graph TB
    subgraph OS ["Host Operating System (Windows / macOS / Linux)"]
        FS["Filesystem (Repositories, .ybicg, .env)"]
        OS_NET["Network Stack (TCP Ports, Sockets, DNS hosts)"]
        CERT_STORE["Windows CryptoAPI / Cert Store"]
        PTY_DRV["ConPTY / WinPTY / POSIX PTY"]
        DOCKER_DAEMON["Docker Daemon Socket"]
        REMOTE_API["External APIs (Cloudflare v4, GitHub v3, LLM Providers)"]
    end

    subgraph MAIN ["Electron Main Process (Node.js 22 Runtime)"]
        MAIN_INIT["main/index.ts (App Lifecycle & Window Management)"]
        
        subgraph IPC_DISPATCH ["IPC Dispatcher Layer (39 Handlers)"]
            IPC_HANDLERS["ipcMain.handle / ipcMain.on"]
        end

        subgraph SERVICES ["Main Backend Services (40 Modules)"]
            SVC_SCANNER["project-scanner.ts"]
            SVC_TERM["terminal.service.ts (node-pty)"]
            SVC_GIT["git.service.ts & git-conflict.service.ts"]
            SVC_DB["database.service.ts (3-Tier Engine)"]
            SVC_PROXY["local-proxy.service.ts (HTTP/HTTPS SNI)"]
            SVC_CA["root-ca.service.ts (PKI Generator)"]
            SVC_CF["cloudflare.service.ts & cloudflare-api.service.ts"]
            SVC_CRON["cron.service.ts (cron-parser)"]
            SVC_MOBILE["mobile-companion.service.ts (HTTP/PWA)"]
            SVC_MOCK["mock-server.service.ts"]
            SVC_SECRETS["security.ts & env-manager.ts"]
            SVC_DISK["disk-cleaner.service.ts & project-archiver.service.ts"]
        end
    end

    subgraph PRELOAD ["Preload Secure Isolation Layer"]
        BRIDGE["preload/index.ts (contextBridge.exposeInMainWorld)"]
        API_CONTRACT["IElectronAPI (38 Namespaces, Typed IPC)"]
    end

    subgraph RENDERER ["React 19 Renderer Process (Vite 6 + Tailwind v4)"]
        APP_ROOT["App.tsx (Root Layout Switcher)"]
        
        subgraph LAYOUTS ["Dual UI Modes"]
            MODERN_UI["Modern Bento Layout (ModernAppLayout)"]
            CLASSIC_UI["Classic Layout (AppLayout)"]
        end

        subgraph DOCK ["Universal Bottom Terminal Dock"]
            XTERM["xterm.js + WebGL Addon + FitAddon"]
        end

        subgraph STORES ["Zustand State Stores (35 Stores)"]
            ST_PROJ["useProjectStore"]
            ST_GIT["useGitStore"]
            ST_DB["useDatabaseStore"]
            ST_PROXY["useProxyStore"]
            ST_VAULT["useSecretVaultStore"]
            ST_WS["useWorkspaceStore"]
            ST_SYS["useSystemStore"]
        end
    end

    subgraph MOBILE_CLIENT ["Mobile Smartphone / Tablet"]
        PWA["Mobile PWA HUD (Pure Vector SVG)"]
    end

    %% Connections
    FS <--> SVC_SCANNER
    FS <--> SVC_SECRETS
    FS <--> SVC_DISK
    PTY_DRV <--> SVC_TERM
    CERT_STORE <--> SVC_CA
    OS_NET <--> SVC_PROXY
    OS_NET <--> SVC_MOBILE
    DOCKER_DAEMON <--> SERVICES
    REMOTE_API <--> SERVICES

    MAIN_INIT --> IPC_DISPATCH
    IPC_DISPATCH <--> SERVICES
    IPC_DISPATCH <== "Electron IPC Channel" ==> BRIDGE
    BRIDGE <== "window.api" ==> RENDERER

    SVC_MOBILE <== "WiFi / Cloudflare Tunnel (Port 4848)" ==> PWA
```

---

## 2. Process Model & Security Boundaries

ProjectYB strictly implements the **Principle of Least Privilege** and Electron security best practices:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        RENDERER PROCESS (SANDBOXED)                    │
│  • Context Isolation: ENABLED                                          │
│  • Node Integration: DISABLED                                          │
│  • Direct File System Access: BLOCKED                                  │
│  • Direct Process Spawning: BLOCKED                                    │
│  • Only accesses exposed APIs via window.api (Preload contextBridge)   │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ Typed Method Calls
┌────────────────────────────────────▼───────────────────────────────────┐
│                    PRELOAD CONTEXT BRIDGE BOUNDARY                     │
│  • contextBridge.exposeInMainWorld('api', apiContract)                 │
│  • Validates parameter types and serializes objects across boundary    │
│  • Converts ipcRenderer.on callbacks into unsubscribe closures         │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ ipcRenderer.invoke / ipcRenderer.send
┌────────────────────────────────────▼───────────────────────────────────┐
│                     MAIN PROCESS (FULL PRIVILEGE)                      │
│  • Native Node.js 22 runtime                                           │
│  • Native Add-ons (node-pty C++ bindings, SQLite)                      │
│  • Direct OS system calls, child process execution, TCP server sockets  │
│  • Credential masking and sanitization before IPC dispatch             │
└────────────────────────────────────────────────────────────────────────┘
```

### Security Guardrails:
1. **Window Open Interception**: All external links clicked in the renderer are intercepted via `mainWindow.webContents.setWindowOpenHandler` and forwarded to the user's default OS browser using `shell.openExternal(url)`. Direct web navigation inside Electron windows is prohibited (`{ action: 'deny' }`).
2. **Credential Masking**: Connection strings (`postgres://user:pass@host/db`) and authorization headers are masked in the Main process before being serialized across IPC to prevent renderer memory leakage.
3. **Encrypted Vault Storage**: Cloud sync bundles and secret vaults utilize **AES-256-GCM** encryption with PBKDF2 key derivation (100,000 iterations) and random initialization vectors (IV).

---

## 3. Electron Main Process Architecture

The Electron Main process serves as the core kernel of ProjectYB. It handles window management, orchestrates native worker threads, registers all IPC channels, and runs standing server daemons.

### Lifecycle Sequencing

```mermaid
sequenceDiagram
    autonumber
    participant App as Electron App
    participant Main as main/index.ts
    participant Store as electron-store
    participant Tray as tray.service.ts
    participant IPC as IPC Registration
    participant Daemons as Background Daemons
    participant Win as BrowserWindow

    App->>Main: app.whenReady()
    Main->>Store: getStore() -> Read windowBounds & preferences
    Store-->>Main: bounds { width, height, x, y }
    Main->>Win: new BrowserWindow(options)
    Main->>Tray: trayService.init(mainWindow)
    Main->>IPC: Register 39 setup*Ipc() modules
    Main->>Daemons: cronService.initialize()
    Main->>Win: loadURL(devServer) OR loadFile(dist/index.html)
    Win-->>Main: WebContents DOM Ready
    
    Note over App,Win: Application Running Active Session
    
    App->>Main: app.on('before-quit')
    Main->>Tray: trayService.destroy()
    Main->>Daemons: terminalService.killAll()
    Main->>Daemons: cloudflareService.cleanupAll()
    Main->>Daemons: systemMonitor.stopMonitoring()
```

### Main Services Inventory
Located in `src/main/services/`, the backend is composed of modular singletons:
* **Project Engine**: `project-scanner.ts`, `workspace.service.ts`, `template.service.ts`.
* **Execution & Processes**: `terminal.service.ts`, `service-killer.service.ts`, `pipeline.service.ts`, `cron.service.ts`.
* **Database & Sockets**: `database.service.ts`, `port.service.ts`, `port-resolver.service.ts`, `docker.service.ts`.
* **Networking & SSL**: `local-proxy.service.ts`, `root-ca.service.ts`, `hosts.service.ts`, `cloudflare.service.ts`, `cloudflare-api.service.ts`, `mock-server.service.ts`, `http-client.service.ts`.
* **Remote & Mobile**: `mobile-companion.service.ts`, `cloud-sync.service.ts`, `logstream.service.ts`.
* **Storage & Utilities**: `disk-cleaner.service.ts`, `project-archiver.service.ts`, `asset-forge.service.ts`, `changelog.service.ts`, `notes.service.ts`, `search.service.ts`.

---

## 4. Preload Bridge & Type-Safe Context Isolation

The preload script at `src/preload/index.ts` securely bridges the gap between the Main process and Renderer using `contextBridge.exposeInMainWorld`.

### Interface Definition (`IElectronAPI`)
The preload module exposes 38 distinct namespaces under `window.api`. Each namespace contains asynchronous methods returning typed Promises, as well as reactive event subscription helpers.

```typescript
// Example: Preload Event Subscription Pattern with Automatic Cleanup
terminal: {
  onData(id: string, callback: (data: string) => void): () => void {
    const channel = `terminal:data:${id}`;
    const listener = (_: any, data: string) => callback(data);
    ipcRenderer.on(channel, listener);
    return () => {
      ipcRenderer.removeListener(channel, listener);
    };
  }
}
```

This pattern ensures that when React components unmount, calling the returned unsubscribe function immediately unregisters the listener from `ipcRenderer`, preventing memory leaks and orphaned listeners.

---

## 5. React 19 Renderer & Dual Layout Engine

The Renderer is structured as a reactive React 19 application powered by Vite 6 and styled using Tailwind CSS v4 and Radix UI primitives.

```
src/renderer/src/
├── App.tsx                        # Root application component & lifecycle
├── assets/                        # Static assets, fonts, and global CSS
├── components/
│   ├── ai/                        # AI Chat, Copilot, Error Diagnosis Dialogs
│   ├── assets/                    # Asset Forge & Favicon Suite
│   ├── cron/                      # Cron Scheduler & History Modals
│   ├── dashboard/                 # Pinned Projects, Health Cards, Quick Actions
│   ├── database/                  # SQL Workbench, Redis Browser, Schema Tree
│   ├── dependencies/              # Dependency Inspector, Vulnerability Audits
│   ├── disk/                      # Disk Optimizer & Deep Freeze Archiver
│   ├── docker/                    # Docker Containers & Database Prober
│   ├── env/                       # .env Manager, Profiler, Comparison Dialogs
│   ├── git/                       # Git Studio, Branch DAG, Conflict Resolver
│   ├── layout/                    # Classic App Layout & Nav Rails
│   ├── modern/                    # Modern Bento Layout, Workbench, Dock
│   │   ├── dashboard/             # ModernBentoDashboard & Telemetry Bento
│   │   ├── layout/                # ModernAppLayout, Sidebar, Header
│   │   ├── project/               # ModernProjectWorkbench (Segmented HUD)
│   │   └── terminal/              # ModernTerminalDock (Sliding WebGL Dock)
│   ├── proxy/                     # Local HTTPS Proxy & Root CA Dialogs
│   ├── recipes/                   # Visual Action Palette & Step Execution Flow
│   ├── secrets/                   # Encrypted Global Secrets Vault Modal
│   ├── shared/                    # Command Palette, Modals, Error Boundary
│   └── tunnels/                   # Cloudflare Quick & Named Tunnel Modals
├── hooks/                         # useKeyboard, useWorkspaceProjects, etc.
├── pages/                         # Top-level Page Views (20 Views)
├── stores/                        # Zustand Domain State Stores (35 Stores)
└── types/                         # TypeScript Interface Definitions
```

### Hot-Swappable Dual Layout Engine
The UI supports hot-swapping between **Modern Bento Layout** and **Classic Layout** via `useThemeStore.getState().uiMode`.
* **State Persistence**: Switching modes does not remount root state providers, keeping background terminals, running pipelines, and active logs alive without interruption.
* **Modern Bento Mode**: High-density bento grid dashboard, collapsible icon rail, workspace breadcrumb chips, and an omnipresent sliding terminal dock.
* **Universal Bottom Terminal Dock**: The dock component (`ModernTerminalDock`) is rendered at the root layout level, ensuring that navigating between pages (`Dashboard` -> `Git` -> `Database`) does not unmount the terminal WebGL canvas or interrupt terminal output.

---

## 6. Zustand State Architecture & Reactive Data Flow

ProjectYB utilizes **Zustand 5.0** to manage state across 35 decoupled domain stores. This eliminates prop drilling and provides granular re-renders across the component tree.

```mermaid
graph TD
    subgraph UI_TRIGGERS ["Renderer UI Triggers"]
        BTN_ACTION["User Clicks 'Run Script' / 'Scan' / 'Push'"]
        KEY_PRESS["Global Keyboard Shortcut (Ctrl+K, Ctrl+~)"]
    end

    subgraph STORES ["Zustand Store Actions"]
        ST_CALL["Store Action (e.g. useProjectStore.scanProjects)"]
    end

    subgraph PRELOAD_IPC ["Preload IPC Call"]
        API_CALL["window.api.projects.scan()"]
    end

    subgraph MAIN_SERVICE ["Electron Main Service"]
        EXEC["projectScanner.scanDirectories()"]
    end

    subgraph REACTIVE_UPDATE ["Reactive State Update"]
        SET_STATE["set({ projects, isScanning: false })"]
        SUBSCRIBERS["Subscribed React Components Re-render"]
    end

    BTN_ACTION --> ST_CALL
    KEY_PRESS --> ST_CALL
    ST_CALL --> API_CALL
    API_CALL --> EXEC
    EXEC --> API_CALL
    API_CALL --> SET_STATE
    SET_STATE --> SUBSCRIBERS
```

### Workspace Scoping Hook (`useWorkspaceProjects`)
A central reactive hook (`useWorkspaceProjects`) filters all projects based on the currently active workspace. If an active workspace is set, every page (Dashboard, Git Studio, Database Studio, Services, Command Palette, Telemetry) displays only the repositories assigned to that workspace, providing complete focus isolation.

---

## 7. PTY Terminal Subsystem & Lifecycle

The terminal subsystem in `src/main/services/terminal.service.ts` provides native interactive shell sessions multiplexed across the application.

```mermaid
stateDiagram-v2
    [*] --> Spawning: terminal.spawn(options)
    Spawning --> Active: node-pty.spawn(shell, cols, rows, cwd)
    
    state Active {
        [*] --> Streaming
        Streaming --> BufferAccumulation: onData event
        BufferAccumulation --> Streaming: IPC push to Renderer
        Streaming --> Resized: terminal.resize(cols, rows)
        Resized --> Streaming: pty.resize()
    }
    
    Active --> Terminated: pty.onExit() / terminal.kill()
    Terminated --> CleanedUp: Remove session from Map & notify listeners
    CleanedUp --> [*]
```

### Core Architecture:
* **Native PTY Process**: Uses `node-pty` with automatic platform shell detection (`powershell.exe` on Windows, `zsh`/`bash` on macOS/Linux).
* **Hardware Acceleration**: Renderer terminal views utilize `@xterm/xterm` with the `@xterm/addon-webgl` addon. If WebGL is unavailable, it gracefully falls back to the HTML5 Canvas renderer.
* **ConPTY ANSI Sanitization**: Filters and sanitizes Windows ConPTY escape sequences and cursor positioning artifacts before forwarding to the UI and LogStream aggregator.
* **Dynamic Geometry Management**: Uses `@xterm/addon-fit` wrapped in a 50ms resize debounce observer to synchronize terminal columns and rows dynamically with UI pane resizing.

---

## 8. Multi-Tier Resilient SQLite & Database Engine

To prevent Electron runtime incompatibilities (such as `ERR_UNKNOWN_BUILTIN_MODULE: node:sqlite`), `database.service.ts` employs a **3-tier fallback execution engine**:

```mermaid
flowchart TD
    START["Execute SQL Query / Introspect Schema"] --> TIER1{"Tier 1: Try Native<br/>node:sqlite DatabaseSync"}
    TIER1 -- "Success" --> RES1["Return Structured Query Result"]
    TIER1 -- "Module Missing or Error" --> TIER2{"Tier 2: Transparent CLI<br/>sqlite3 -json \"path\" \"query\""}
    TIER2 -- "CLI Available" --> RES2["Parse JSON Stdout & Return Result"]
    TIER2 -- "CLI Missing" --> TIER3["Tier 3: Binary Header Verification & Regex Introspection"]
    TIER3 --> RES3["Return Verified Schema & Table List"]
```

### Supported Database Engines:
1. **SQLite**: Native 3-tier executor for `.sqlite`, `.sqlite3`, `.db` files with sub-millisecond execution and column type mapping.
2. **PostgreSQL**: TCP socket probing and structured SQL query execution.
3. **MySQL**: Socket ping and connection testing.
4. **Redis**: Direct RESP protocol socket tokenizer supporting `GET`, `SET`, `HGETALL`, `KEYS`, `INFO`, and key scanning with TTL timers.
5. **MongoDB**: Connection string verification and port probing.

---

## 9. Local HTTPS Reverse Proxy & Windows Root CA PKI

ProjectYB includes an embedded reverse proxy (`local-proxy.service.ts`) and PKI certificate authority (`root-ca.service.ts`) to enable trusted HTTPS development with `.test` domains.

```mermaid
sequenceDiagram
    autonumber
    participant Browser as Chrome / Edge / Safari
    participant Proxy as local-proxy.service.ts (Port 443)
    participant PKI as root-ca.service.ts
    participant CertStore as Windows Root Store
    participant DevServer as Local App (Port 3000)

    Note over PKI,CertStore: One-Time Initialization
    PKI->>PKI: Generate ProjectYB Local Root CA (X.509)
    PKI->>CertStore: certutil -user -addstore "Root" projectyb-root-ca.crt
    CertStore-->>PKI: Trusted Certificate Installed

    Note over Browser,DevServer: Inbound HTTPS Request (https://my-app.test)
    Browser->>Proxy: TLS ClientHello (SNI: my-app.test)
    Proxy->>PKI: getCertificateForDomain('my-app.test')
    PKI-->>Proxy: Dynamic Leaf Cert (Signed by ProjectYB Root CA)
    Proxy-->>Browser: TLS Handshake Completed (Trusted Green Padlock)
    Browser->>Proxy: HTTP GET /api/users
    Proxy->>DevServer: Forward to http://127.0.0.1:3000/api/users
    DevServer-->>Proxy: HTTP 200 OK (Response Body)
    Proxy-->>Browser: HTTP 200 OK (Response Body)
```

---

## 10. Cloudflare Zero Trust Tunnel Infrastructure

ProjectYB integrates directly with Cloudflare's tunneling infrastructure through `cloudflare.service.ts` and `cloudflare-api.service.ts`:

1. **Quick Tunnels**:
   - Executes `cloudflared tunnel --url http://localhost:<port>`.
   - Parses stderr output for the ephemeral `*.trycloudflare.com` assigned URL.
   - Instantly exposes local ports to the public internet with zero Cloudflare configuration required.

2. **Named Persistent Tunnels (Cloudflare API v4)**:
   - Authenticates via user-provided Cloudflare API tokens.
   - Lists accounts and available DNS Zones (`example.com`).
   - Automatically provisions a named tunnel ID and generates a permanent tunnel credentials JSON.
   - Configures ingress routing rules and provisions DNS CNAME records (`subdomain.example.com` -> `<tunnel-id>.cfargotunnel.com`) in 1 click.

---

## 11. Mobile Companion PWA & Telemetry Pipeline

The Mobile Companion service (`mobile-companion.service.ts`) turns any smartphone into a remote control HUD for your desktop development environment.

```
┌────────────────────────────────────────────────────────────────────────┐
│               MOBILE SMARTPHONE (PWA - PORT 4848)                     │
│  • Pure Vector SVG UI (No external asset downloads)                    │
│  • Safe-Area Inset Handling: env(safe-area-inset-top/bottom)           │
│  • LocalStorage Session Token (SHA-256 Auth)                           │
│  • Tabbed HUD: Dashboard, Services, Console, Git, Cron, Notes          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP REST + Polling / SSE Streams
┌───────────────────────────────────▼────────────────────────────────────┐
│          EMBEDDED HTTP SERVER (mobile-companion.service.ts)            │
│  • Port 4848 (Local WiFi or proxied over Cloudflare Tunnel)            │
│  • Endpoints:                                                          │
│    ├── POST /api/auth/login            ── Auth Verification            │
│    ├── GET  /api/status                ── Hardware Telemetry (CPU/RAM) │
│    ├── GET  /api/services/running      ── Running Background Services  │
│    ├── POST /api/services/start|stop   ── Service Lifecycle Control    │
│    ├── POST /api/terminal/exec         ── Interactive Mobile Shell     │
│    ├── GET  /api/terminal/logs         ── Service Stdout Stream        │
│    ├── GET  /api/git/status            ── Git Repository State         │
│    ├── POST /api/git/pull|commit-push  ── Remote Git Push/Pull         │
│    └── POST /api/emergency-stop        ── 1-Tap Emergency Kill All     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 12. Performance Engine & Virtualization Strategies

To ensure 60 FPS fluidity even in enterprise-scale repositories, ProjectYB implements three key performance strategies:

1. **Progressive Working Tree Virtualization (`GitStatus.tsx`)**:
   - When repositories have **10,000+ uncommitted or untracked changes**, rendering all DOM nodes causes UI locking.
   - ProjectYB uses a progressive windowed viewport and sub-millisecond memoized filtering, rendering only visible rows and providing pagination without dropping frames.

2. **Parallel Breadth-First Disk Scanner (`disk-cleaner.service.ts`)**:
   - Replaced naive recursive `fs.stat` loops with parallel chunked workers and directory `mtime` size caching.
   - Disk analysis is **50x faster**; unmodified directories resolve in **0ms** from memory cache.
   - Streams progress incrementally via `disk:project-analyzed` events, eliminating blank-screen loading states.

3. **Singleton AudioContext & Notification Throttling (`useNotificationStore.ts`)**:
   - Employs a reusable singleton `AudioContext` with proper resume/suspended state handling, preventing OS audio hardware exhaustion crashes.
   - Throttles rapid duplicate notifications within a 1.5-second deduplication window.

---

<div align="center">
  <sub>ProjectYB Architecture Guide • Version 1.0.0 • Maintained by YBicG</sub>
</div>
