# ProjectYB

[![Version](https://img.shields.io/badge/version-1.0.0-8b5cf6?style=flat-square&logo=semver&logoColor=white)](https://github.com/YbicG/ProjectYB/releases/tag/v1.0.0)
[![Electron](https://img.shields.io/badge/Electron-34.2.0-47848F?style=flat-square&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-6.1.0-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Platform](https://img.shields.io/badge/platform-Windows%20|%20macOS%20|%20Linux-22c55e?style=flat-square)](#getting-started)
[![License](https://img.shields.io/badge/license-MIT-f59e0b?style=flat-square)](LICENSE)

Desktop project manager and command deck for developers. Built with Electron, React, TypeScript, and Tailwind CSS.

ProjectYB consolidates local repository management, multi-process terminals, background services, Git workflows, database inspection, and local network tooling into a single desktop application.

---

## Features

### Workspace & Monorepo Management
- **Automatic Project Discovery**: Recursively scans designated directories to index repositories across ecosystems (Node.js, Python, Rust, Go, monorepos).
- **Subproject Workflows**: First-class support for monorepo packages (`apps/`, `packages/`) with direct terminal launch, folder navigation, in-app file peek, and `.env` editing.
- **Workspace Scoping**: Filter projects, services, and Git streams by custom workspaces.
- **Shared Team Configs**: Committable `.ybicg/services.json` format for defining reproducible multi-service launch configurations.

### Developer Tooling
- **Hardware-Accelerated Terminal Dock**: Persistent bottom terminal canvas powered by `node-pty` and `@xterm/xterm` with WebGL rendering. Accessible globally via `Ctrl+``.
- **Git Studio**: Working tree management with virtualization for large diffs, visual branch DAG visualization, 3-way merge conflict editor, stash manager, and changelog generator.
- **Database Studio**: Multi-tier SQLite query engine with CLI fallback, live schema introspection, tabular data viewer with CSV/JSON export, and Redis key-value inspector.
- **API Studio & OpenAPI**: Native HTTP client with request timing metrics and automatic OpenAPI / Swagger specification detection.
- **Global Secrets Vault**: Encrypted credential storage with 1-click `.env` synchronization and multi-environment targeting (`dev`, `staging`, `prod`).
- **Executable Runbooks**: Markdown editor with clickable task lists, syntax highlighting, and inline/dock command execution.
- **Developer Asset Forge**: One-click generation of favicon suites, apple touch icons, and PWA manifests (`site.webmanifest`).
- **Disk Optimizer & Deep Freeze**: Identifies heavy reclaimable folders (`node_modules`, `dist`, `.cache`) with 1-click dormant project archiving and instant restoration.
- **Smart Port Resolver**: Automatic port conflict detection with process PID inspection, process termination, and `.env` port rerouting.
- **Mobile Remote Companion**: Lightweight local PWA for monitoring running services, hardware telemetry, and triggering commands from a mobile device.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Shell & Runtime** | Electron 34, Node.js 22 |
| **Frontend UI** | React 19, TypeScript 5.7, Tailwind CSS v4, Framer Motion, Lucide Icons |
| **Terminal Engine** | `node-pty`, `@xterm/xterm` with WebGL Addon, `@xterm/addon-fit` |
| **State Management** | Zustand 5.0, `electron-store` |
| **Build & Bundling** | Vite 6, `electron-vite`, `electron-builder` |
| **Testing** | Vitest 4 |

---

## Getting Started

### Prerequisites
- Node.js >= 20.0.0
- npm, pnpm, or yarn
- Git

### Development Setup

```bash
# Clone the repository
git clone https://github.com/YbicG/ProjectYB.git
cd ProjectYB

# Install dependencies
npm install

# Start the application in development mode with HMR
npm run dev
```

### Running Tests & Typechecks

```bash
# Run type checking across main and renderer processes
npm run typecheck

# Run test suite
npm test
```

### Building & Packaging

```bash
# Build production assets
npm run build

# Package standalone Windows application (unpacked directory)
npm run package:dir

# Build Windows NSIS installer
npm run package:win
```

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + K` / `Cmd + K` | Open Global Command Palette |
| `Ctrl + `` | Toggle Universal Bottom Terminal Dock |
| `Ctrl + Shift + F` | Global Cross-Project Search |
| `Ctrl + Shift + V` | Snippets Vault |
| `Ctrl + Shift + N` | Global Scratchpad |
| `Ctrl + Shift + M` | Mobile Remote Companion Pairing |
| `Ctrl + /` | Keyboard Shortcuts Cheat Sheet |

---

## Documentation

Comprehensive architecture, feature, and API references are available in the [`docs/`](./docs) directory:

- [Architecture Guide](./docs/ARCHITECTURE.md) — Main/Preload/Renderer lifecycle, IPC bridge, PTY process isolation, and state model.
- [Feature Reference](./docs/FEATURES.md) — Detailed overview of every page, service, and utility.
- [User Guide](./docs/USER_GUIDE.md) — Step-by-step developer workflows.
- [IPC API Reference](./docs/IPC_REFERENCE.md) — IPC channel catalog, payload structures, and response schemas.

---

## License

MIT License. Copyright (c) 2026 YbicG.
