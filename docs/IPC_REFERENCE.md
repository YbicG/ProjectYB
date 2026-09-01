# 🔌 ProjectYB IPC Reference Specification

This document provides the complete, authoritative specification for all **39 IPC modules**, **60+ IPC channels**, request payload types, response schemas, and streaming event listeners used in **ProjectYB Desktop**.

---

## 📑 Table of Contents

1. [IPC Architecture & Invocation Conventions](#1-ipc-architecture--invocation-conventions)
2. [Terminal Module (`terminal:*`)](#2-terminal-module-terminal)
3. [Git & GitHub Modules (`git:*`, `github:*`, `gitConflict:*`)](#3-git--github-modules-git-github-gitconflict)
4. [Projects & Workspace Modules (`projects:*`, `workspaces:*`)](#4-projects--workspace-modules-projects-workspaces)
5. [Database Studio Module (`database:*`)](#5-database-studio-module-database)
6. [Cloudflare & Tunnels Modules (`cloudflare:*`, `cloudflare:api:*`)](#6-cloudflare--tunnels-modules-cloudflare-cloudflareapi)
7. [Local Reverse Proxy & Root CA (`proxy:*`, `rootCa:*`, `hosts:*`)](#7-local-reverse-proxy--root-ca-proxy-rootca-hosts)
8. [Secrets & Cloud Sync Modules (`sync:*`)](#8-secrets--cloud-sync-modules-sync)
9. [Environment & Port Resolvers (`env:*`, `ports:*`, `portResolver:*`)](#9-environment--port-resolvers-env-ports-portresolver)
10. [AI Copilot & Diagnostics Module (`ai:*`)](#10-ai-copilot--diagnostics-module-ai)
11. [Pipelines & Recipes Module (`pipelines:*`)](#11-pipelines--recipes-module-pipelines)
12. [Mobile Remote Companion (`mobile:*`)](#12-mobile-remote-companion-mobile)
13. [Cron Scheduler Module (`cron:*`)](#13-cron-scheduler-module-cron)
14. [Storage, Cleaner & Archiver (`disk:*`, `projectArchiver:*`, `archive:*`)](#14-storage-cleaner--archiver-disk-projectarchiver-archive)
15. [Asset Forge & Changelog Tools (`assetForge:*`, `changelog:*`)](#15-asset-forge--changelog-tools-assetforge-changelog)
16. [Mock Server, HTTP Client & OpenAPI (`mockServer:*`, `http:*`, `openapi:*`)](#16-mock-server-http-client--openapi-mockserver-http-openapi)
17. [System, LogStream, Notes & Window (`system:*`, `logstream:*`, `notes:*`, `window:*`, `store:*`, `services:*`, `templates:*`, `dependencies:*`, `docker:*`, `health:*`, `search:*`)](#17-system-logstream-notes--window-modules)

---

## 1. IPC Architecture & Invocation Conventions

ProjectYB relies on standard asynchronous request-response pairs (`ipcMain.handle` / `ipcRenderer.invoke`) and unidirectional push event streams (`webContents.send` / `ipcRenderer.on`).

### Naming Format
Channels are formatted with lowercase domain names and camelCase actions:
`<domain>:<action>` (e.g. `projects:scan`, `database:executeQuery`, `proxy:start`).

### Invocation Pattern
In the Renderer process, all channels are accessed via `window.api.<namespace>.<method>()`:
```typescript
// Invocation Example
const status = await window.api.database.executeQuery(conn, "SELECT * FROM users");
```

---

## 2. Terminal Module (`terminal:*`)

Manages interactive `node-pty` background shell processes and terminal streaming.

| Channel | Method | Arguments | Returns |
| :--- | :--- | :--- | :--- |
| `terminal:spawn` | `invoke` | `options: SpawnOptions` | `Promise<boolean>` |
| `terminal:write` | `send` | `id: string, data: string` | `void` |
| `terminal:resize` | `send` | `id: string, cols: number, rows: number` | `void` |
| `terminal:kill` | `send` | `id: string` | `void` |
| `terminal:getBuffer` | `invoke` | `id: string` | `Promise<string>` |
| `terminal:list` | `invoke` | — | `Promise<TerminalInfo[]>` |

### Streaming Events:
* `terminal:data:${id}`: Emitted when stdout/stderr data arrives from the PTY process. Listener: `(data: string) => void`.
* `terminal:exit:${id}`: Emitted when the PTY process terminates. Listener: `(exitCode: number) => void`.

### Data Types:
```typescript
export interface SpawnOptions {
  id: string;
  cwd?: string;
  cols: number;
  rows: number;
  shell?: string;
  name?: string;
  projectId?: string;
  projectName?: string;
  serviceId?: string;
  isService?: boolean;
  command?: string;
  port?: number;
}

export interface TerminalInfo {
  id: string;
  pid: number;
  cwd: string;
}
```

---

## 3. Git & GitHub Modules (`git:*`, `github:*`, `gitConflict:*`)

### Git Core Channels (`git:*`)
| Channel | Method | Arguments | Returns |
| :--- | :--- | :--- | :--- |
| `git:status` | `invoke` | `repoPath: string` | `Promise<GitStatus>` |
| `git:commit` | `invoke` | `repoPath: string, message: string, stageAll?: boolean` | `Promise<any>` |
| `git:push` | `invoke` | `repoPath: string, remote?: string, branch?: string` | `Promise<any>` |
| `git:pull` | `invoke` | `repoPath: string, remote?: string, branch?: string` | `Promise<any>` |
| `git:branches` | `invoke` | `repoPath: string` | `Promise<BranchSummary>` |
| `git:checkout` | `invoke` | `repoPath: string, branch: string, createNew?: boolean` | `Promise<any>` |
| `git:deleteBranch` | `invoke` | `repoPath: string, branch: string` | `Promise<any>` |
| `git:mergeBranch` | `invoke` | `repoPath: string, branch: string` | `Promise<{ success: boolean; conflicts: string[]; error?: string }>` |
| `git:abortMerge` | `invoke` | `repoPath: string` | `Promise<{ success: boolean; error?: string }>` |
| `git:diff` | `invoke` | `repoPath: string, staged?: boolean` | `Promise<string>` |
| `git:fileDiff` | `invoke` | `repoPath: string, filePath: string, staged?: boolean` | `Promise<string>` |
| `git:commitDiff` | `invoke` | `repoPath: string, commitHash: string` | `Promise<string>` |
| `git:stageAll` | `invoke` | `path: string` | `Promise<any>` |
| `git:stageFile` | `invoke` | `path: string, filePath: string` | `Promise<any>` |
| `git:unstageFile`| `invoke` | `path: string, filePath: string` | `Promise<any>` |
| `git:discardChanges` | `invoke` | `path: string, filePath: string` | `Promise<any>` |
| `git:stash` | `invoke` | `repoPath: string, action: 'push'|'pop'|'list'|'apply'|'drop', message?: string, index?: number` | `Promise<any>` |
| `git:log` | `invoke` | `repoPath: string, limit?: number` | `Promise<GitLogEntry[]>` |
| `git:isRepo` | `invoke` | `path: string` | `Promise<boolean>` |
| `git:init` | `invoke` | `path: string` | `Promise<any>` |
| `git:getRemotes` | `invoke` | `path: string` | `Promise<Array<{ name: string; refs: { fetch: string; push: string } }>>` |

### Git Conflict Channels (`gitConflict:*`)
| Channel | Method | Arguments | Returns |
| :--- | :--- | :--- | :--- |
| `gitConflict:getConflictedFiles` | `invoke` | `repoPath: string` | `Promise<string[]>` |
| `gitConflict:parseFile` | `invoke` | `repoPath: string, relativePath: string` | `Promise<ConflictFileParsed>` |
| `gitConflict:resolveFile` | `invoke` | `repoPath: string, relativePath: string, content: string` | `Promise<{ success: boolean; error?: string }>` |
| `gitConflict:abortMerge` | `invoke` | `repoPath: string` | `Promise<{ success: boolean; error?: string }>` |

### GitHub Channels (`github:*`)
| Channel | Method | Arguments | Returns |
| :--- | :--- | :--- | :--- |
| `github:createRepo` | `invoke` | `name: string, isPrivate: boolean, description?: string` | `Promise<any>` |
| `github:getRepo` | `invoke` | `owner: string, repo: string` | `Promise<any>` |
| `github:listRepos` | `invoke` | — | `Promise<any>` |
| `github:createPR` | `invoke` | `owner: string, repo: string, title: string, head: string, base: string, body?: string` | `Promise<any>` |
| `github:listPRs` | `invoke` | `owner: string, repo: string, state?: 'open'|'closed'|'all'` | `Promise<any[]>` |
| `github:listIssues` | `invoke` | `owner: string, repo: string, state?: 'open'|'closed'|'all'` | `Promise<any[]>` |
| `github:getUser` | `invoke` | — | `Promise<any>` |
| `github:initAndPush` | `invoke` | `localPath: string, repoName: string, isPrivate: boolean, description?: string` | `Promise<any>` |

---

## 4. Projects & Workspace Modules (`projects:*`, `workspaces:*`)

### Projects Channels (`projects:*`)
| Channel | Method | Arguments | Returns |
| :--- | :--- | :--- | :--- |
| `projects:scan` | `invoke` | `options?: { rootPaths?: string[]; mode?: 'git' \| 'all' }` | `Promise<ProjectInfo[]>` |
| `projects:addManual` | `invoke` | `folderPath: string` | `Promise<ProjectInfo \| null>` |
| `projects:ignore` | `invoke` | `folderPath: string` | `Promise<string>` |
| `projects:unignore` | `invoke` | `folderPath: string` | `Promise<string>` |
| `projects:getConfig` | `invoke` | `folderPath: string` | `Promise<{ config: any; filePath: string \| null }>` |
| `projects:saveConfig` | `invoke` | `folderPath: string, config: any, overwrite?: boolean` | `Promise<string>` |
| `projects:readServices` | `invoke` | `folderPath: string` | `Promise<any[]>` |
| `projects:writeServices` | `invoke` | `folderPath: string, services: any[]` | `Promise<string>` |
| `projects:generateAiContext` | `invoke` | `folderPath: string` | `Promise<{ success: boolean; filePath: string; content: string }>` |
| `projects:getAll` | `invoke` | — | `Promise<ProjectInfo[]>` |
| `projects:openInExplorer` | `invoke` | `path: string` | `Promise<void>` |
| `projects:openInVSCode` | `invoke` | `path: string` | `Promise<void>` |

### Workspace Channels (`workspaces:*`)
| Channel | Method | Arguments | Returns |
| :--- | :--- | :--- | :--- |
| `workspaces:getWorkspaces` | `invoke` | — | `Promise<any[]>` |
| `workspaces:saveWorkspace` | `invoke` | `workspace: any` | `Promise<any[]>` |
| `workspaces:deleteWorkspace` | `invoke` | `workspaceId: string` | `Promise<any[]>` |
| `workspaces:getStacks` | `invoke` | — | `Promise<any[]>` |
| `workspaces:saveStack` | `invoke` | `stack: any` | `Promise<any[]>` |
| `workspaces:deleteStack` | `invoke` | `stackId: string` | `Promise<any[]>` |
| `workspaces:getActive` | `invoke` | — | `Promise<string \| null>` |
| `workspaces:setActive` | `invoke` | `id: string \| null` | `Promise<void>` |

---

## 5. Database Studio Module (`database:*`)

Provides database auto-discovery, native 3-tier SQLite query execution, and Redis RESP key inspection.

| Channel | Method | Arguments | Returns |
| :--- | :--- | :--- | :--- |
| `database:discoverConnections` | `invoke` | `projects: Array<{ id: string; name: string; path: string }>` | `Promise<DatabaseConnection[]>` |
| `database:testConnection` | `invoke` | `conn: DatabaseConnection` | `Promise<{ success: boolean; message: string; pingMs?: number }>` |
| `database:executeQuery` | `invoke` | `conn: DatabaseConnection, query: string` | `Promise<QueryResult>` |
| `database:getSchema` | `invoke` | `conn: DatabaseConnection` | `Promise<TableSchema[]>` |
| `database:getRedisKeys` | `invoke` | `conn: DatabaseConnection, pattern?: string` | `Promise<RedisKeyItem[]>` |

### Data Schemas:
```typescript
export interface DatabaseConnection {
  id: string;
  name: string;
  engine: 'sqlite' | 'postgres' | 'mysql' | 'redis' | 'mongodb';
  connectionString?: string;
  filePath?: string;
  maskedUri?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  source: 'auto-discovered' | 'manual' | 'docker';
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  durationMs: number;
  error?: string;
}

export interface TableSchema {
  name: string;
  type: 'table' | 'view' | 'collection';
  columns: Array<{ name: string; type: string; nullable: boolean; isPrimary: boolean }>;
  rowCount?: number;
}
```

---

## 6. Cloudflare & Tunnels Modules (`cloudflare:*`, `cloudflare:api:*`)

### Cloudflare Binary & Tunnels (`cloudflare:*`)
| Channel | Method | Arguments | Returns |
| :--- | :--- | :--- | :--- |
| `cloudflare:getBinaryStatus` | `invoke` | — | `Promise<{ installed: boolean; version?: string; source: string }>` |
| `cloudflare:installBinary` | `invoke` | — | `Promise<{ success: boolean; path?: string; error?: string }>` |
| `cloudflare:startQuickTunnel` | `invoke` | `options: { localPort: number; protocol?: string }` | `Promise<TunnelInstance>` |
| `cloudflare:startNamedTunnel` | `invoke` | `options: { name: string; tunnelToken: string; localPort?: number }` | `Promise<TunnelInstance>` |
| `cloudflare:stopTunnel` | `invoke` | `tunnelId: string` | `Promise<boolean>` |
| `cloudflare:listActiveTunnels` | `invoke` | — | `Promise<TunnelInstance[]>` |
| `cloudflare:getTunnelLogs` | `invoke` | `tunnelId: string` | `Promise<string[]>` |

### Cloudflare API v4 Management (`cloudflare:api:*`)
| Channel | Method | Arguments | Returns |
| :--- | :--- | :--- | :--- |
| `cloudflare:api:verify` | `invoke` | `config: CloudflareApiConfig` | `Promise<{ success: boolean; accountName?: string; error?: string }>` |
| `cloudflare:api:listZones` | `invoke` | `config: CloudflareApiConfig` | `Promise<{ success: boolean; zones: ZoneInfo[]; error?: string }>` |
| `cloudflare:api:createNamedTunnel` | `invoke` | `name: string, config: CloudflareApiConfig` | `Promise<{ success: boolean; tunnelId?: string; token?: string; error?: string }>` |
| `cloudflare:api:configureIngress` | `invoke` | `tunnelId: string, hostname: string, localPort: number, config: CloudflareApiConfig` | `Promise<{ success: boolean; error?: string }>` |
| `cloudflare:api:createDnsCname` | `invoke` | `zoneId: string, subdomain: string, tunnelId: string, config: CloudflareApiConfig` | `Promise<{ success: boolean; recordId?: string; hostname?: string }>` |

---

## 7. Local Reverse Proxy & Root CA (`proxy:*`, `rootCa:*`, `hosts:*`)

### Local HTTPS Proxy (`proxy:*`)
| Channel | Method | Arguments | Returns |
| :--- | :--- | :--- | :--- |
| `proxy:start` | `invoke` | `httpPort?: number, httpsPort?: number` | `Promise<{ success: boolean; error?: string }>` |
| `proxy:stop` | `invoke` | — | `Promise<{ success: boolean; error?: string }>` |
| `proxy:getStatus` | `invoke` | — | `Promise<ProxyStatus>` |
| `proxy:setRoutes` | `invoke` | `routes: ProxyRoute[]` | `Promise<{ success: boolean }>` |
| `proxy:getRoutes` | `invoke` | — | `Promise<ProxyRoute[]>` |

### Root CA PKI (`rootCa:*`)
| Channel | Method | Arguments | Returns |
| :--- | :--- | :--- | :--- |
| `rootCa:getStatus` | `invoke` | — | `Promise<{ installed: boolean; subject: string; validUntil?: string; caPath?: string }>` |
| `rootCa:install` | `invoke` | — | `Promise<{ success: boolean; message: string; error?: string }>` |
| `rootCa:uninstall` | `invoke` | — | `Promise<{ success: boolean; error?: string }>` |
| `rootCa:getCertificate` | `invoke` | `domain: string` | `Promise<{ key: string; cert: string }>` |

### Hosts File Sync (`hosts:*`)
| Channel | Method | Arguments | Returns |
| :--- | :--- | :--- | :--- |
| `hosts:checkStatus` | `invoke` | `domains: string[]` | `Promise<Record<string, boolean>>` |
| `hosts:getMappedDomains` | `invoke` | — | `Promise<string[]>` |
| `hosts:syncDomains` | `invoke` | `domains: string[]` | `Promise<{ success: boolean; error?: string }>` |
| `hosts:clearDomains` | `invoke` | — | `Promise<{ success: boolean; error?: string }>` |
| `hosts:readRaw` | `invoke` | — | `Promise<string>` |

---

## 8. Secrets & Cloud Sync Modules (`sync:*`)

Handles AES-256-GCM encrypted data vaults and GitHub Gist synchronization.

| Channel | Method | Arguments | Returns |
| :--- | :--- | :--- | :--- |
| `sync:exportData` | `invoke` | — | `Promise<CloudVaultPayload>` |
| `sync:encrypt` | `invoke` | `payload: CloudVaultPayload, password: string` | `Promise<{ success: boolean; bundle?: EncryptedBundle; error?: string }>` |
| `sync:decryptAndRestore` | `invoke` | `bundle: EncryptedBundle, password: string` | `Promise<{ success: boolean; itemsRestored?: number; error?: string }>` |
| `sync:githubGist` | `invoke` | `bundle: EncryptedBundle, githubToken: string, gistId?: string` | `Promise<{ success: boolean; gistId?: string; htmlUrl?: string }>` |
| `sync:restoreFromGist` | `invoke` | `gistId: string, password: string, githubToken?: string` | `Promise<{ success: boolean; payload?: any }>` |
| `sync:exportToFile` | `invoke` | `bundle: EncryptedBundle` | `Promise<{ success: boolean; filePath?: string }>` |
| `sync:importFromFile` | `invoke` | — | `Promise<{ success: boolean; bundle?: EncryptedBundle }>` |

---

## 9. Environment & Port Resolvers (`env:*`, `ports:*`, `portResolver:*`)

### Environment Variable Manager (`env:*`)
| Channel | Method | Arguments | Returns |
| :--- | :--- | :--- | :--- |
| `env:listFiles` | `invoke` | `projectPath: string` | `Promise<EnvFileInfo[]>` |
| `env:read` | `invoke` | `filePath: string` | `Promise<{ raw: string; entries: EnvEntry[] }>` |
| `env:write` | `invoke` | `filePath: string, entries: EnvEntry[], rawContent?: string` | `Promise<{ success: boolean }>` |
| `env:generateExample` | `invoke` | `sourceFilePath: string, targetFilePath?: string` | `Promise<{ targetPath: string; content: string }>` |
| `env:compare` | `invoke` | `fileAPath: string, fileBPath: string` | `Promise<EnvComparisonResult>` |
| `env:syncKeys` | `invoke` | `sourceFilePath: string, targetFilePath: string, keys: string[]` | `Promise<{ success: boolean; addedCount: number }>` |

### Smart Port Collision Auto-Rerouter (`portResolver:*`)
| Channel | Method | Arguments | Returns |
| :--- | :--- | :--- | :--- |
| `portResolver:findAvailablePort` | `invoke` | `startPort?: number` | `Promise<number>` |
| `portResolver:getPortProcess` | `invoke` | `port: number` | `Promise<{ pid?: number; processName?: string } \| null>` |
| `portResolver:killPortProcess` | `invoke` | `port: number` | `Promise<{ success: boolean; message: string }>` |
| `portResolver:updateEnvPort` | `invoke` | `projectPath: string, newPort: number` | `Promise<{ success: boolean; message: string; oldPort?: number }>` |

---

## 10. AI Copilot & Diagnostics Module (`ai:*`)

Connects with Ollama, Claude, OpenAI, and Gemini for terminal error diagnosis and commit message generation.

| Channel | Method | Arguments | Returns |
| :--- | :--- | :--- | :--- |
| `ai:checkOllamaStatus` | `invoke` | `baseUrl?: string` | `Promise<{ running: boolean; models: any[]; error?: string }>` |
| `ai:generateCompletion` | `invoke` | `prompt: string, systemPrompt: string, config: AiProviderConfig` | `Promise<{ success: boolean; text: string; error?: string }>` |
| `ai:diagnoseError` | `invoke` | `errorLogs: string, command: string, config: AiProviderConfig` | `Promise<{ success: boolean; explanation: string; suggestedFix: string; error?: string }>` |
| `ai:generateCommitMessage` | `invoke` | `diffText: string, config: AiProviderConfig` | `Promise<{ success: boolean; commitMessage: string; error?: string }>` |

---

## 11. Pipelines & Recipes Module (`pipelines:*`)

Executes multi-step developer recipes with visual step progress.

| Channel | Method | Arguments | Returns |
| :--- | :--- | :--- | :--- |
| `pipelines:run` | `invoke` | `pipeline: PipelineConfig, cwd?: string` | `Promise<any>` |
| `pipelines:stop` | `invoke` | `pipelineId: string` | `Promise<boolean>` |

### Streaming Events:
* `pipelines:statusUpdate`: Emitted when step state changes (`idle` -> `running` -> `passed` / `failed`).
* `pipelines:logLine`: Emitted with real-time stdout/stderr lines.

---

## 12. Mobile Remote Companion (`mobile:*`)

Orchestrates the embedded touch-optimized PWA on port 4848.

| Channel | Method | Arguments | Returns |
| :--- | :--- | :--- | :--- |
| `mobile:start` | `invoke` | `options: { tunnelType?: 'quick'\|'named'; namedToken?: string; port?: number }` | `Promise<{ success: boolean; status: MobileCompanionStatus }>` |
| `mobile:stop` | `invoke` | — | `Promise<boolean>` |
| `mobile:getStatus` | `invoke` | — | `Promise<MobileCompanionStatus>` |
| `mobile:setCredentials` | `invoke` | `username: string, rawPass: string` | `Promise<MobileCredentials>` |
| `mobile:getCredentials` | `invoke` | — | `Promise<{ username: string; rawPasswordDisplay?: string }>` |

---

## 13. Cron Scheduler Module (`cron:*`)

Background task scheduler based on cron expressions.

| Channel | Method | Arguments | Returns |
| :--- | :--- | :--- | :--- |
| `cron:getJobs` | `invoke` | — | `Promise<CronJob[]>` |
| `cron:saveJob` | `invoke` | `jobData: Partial<CronJob> & { name: string; command: string; schedule: string }` | `Promise<CronJob>` |
| `cron:deleteJob` | `invoke` | `id: string` | `Promise<boolean>` |
| `cron:runNow` | `invoke` | `id: string` | `Promise<any>` |
| `cron:toggleJob` | `invoke` | `id: string, enabled: boolean` | `Promise<any>` |
| `cron:getHistory` | `invoke` | `jobId: string` | `Promise<CronRunHistory[]>` |

---

## 14. Storage, Cleaner & Archiver (`disk:*`, `projectArchiver:*`, `archive:*`)

### Turbo Disk Space Scanner (`disk:*`)
| Channel | Method | Arguments | Returns |
| :--- | :--- | :--- | :--- |
| `disk:analyzeProjects` | `invoke` | `projects: Array<{ id: string; name: string; path: string }>` | `Promise<any>` |
| `disk:cancelScan` | `invoke` | — | `Promise<boolean>` |
| `disk:cleanProject` | `invoke` | `projectPath: string, categories: string[]` | `Promise<{ success: boolean; freedBytes: number }>` |
| `disk:cleanGlobalCache` | `invoke` | `type: 'pnpm'\|'npm'\|'cargo'\|'pip'` | `Promise<{ success: boolean; output: string }>` |

*Streaming Event*: `disk:project-analyzed` emits progressively as each directory finishes scanning.

### Deep Freeze Archiver (`projectArchiver:*`)
| Channel | Method | Arguments | Returns |
| :--- | :--- | :--- | :--- |
| `projectArchiver:scanInactiveProjects` | `invoke` | `projects: Array<{ id: string; name: string; path: string }>, daysThreshold?: number` | `Promise<InactiveProject[]>` |
| `projectArchiver:freezeProject` | `invoke` | `projectPath: string` | `Promise<{ success: boolean; savedBytes: number; message: string }>` |
| `projectArchiver:thawProject` | `invoke` | `projectPath: string` | `Promise<{ success: boolean; message: string }>` |

### Clean Snapshot ZIP Creator (`archive:*`)
| Channel | Method | Arguments | Returns |
| :--- | :--- | :--- | :--- |
| `archive:createSnapshot` | `invoke` | `options: SnapshotOptions` | `Promise<{ success: boolean; zipPath: string; fileSizeBytes: number }>` |

---

## 15. Asset Forge & Changelog Tools (`assetForge:*`, `changelog:*`)

### Developer Asset Forge (`assetForge:*`)
| Channel | Method | Arguments | Returns |
| :--- | :--- | :--- | :--- |
| `assetForge:generateFaviconSuite` | `invoke` | `projectPath: string, sourceImagePath: string` | `Promise<{ success: boolean; generatedFiles: string[]; targetDir: string }>` |
| `assetForge:convertImage` | `invoke` | `sourcePath: string, targetFormat: 'png'\|'jpeg', quality?: number` | `Promise<{ success: boolean; outputPath: string; savedPercent: number }>` |

### SemVer Changelog Generator (`changelog:*`)
| Channel | Method | Arguments | Returns |
| :--- | :--- | :--- | :--- |
| `changelog:generate` | `invoke` | `projectPath: string` | `Promise<ChangelogResult>` |
| `changelog:applyRelease` | `invoke` | `projectPath: string, version: string, changelogText: string, createTag: boolean` | `Promise<{ success: boolean; message: string }>` |

---

## 16. Mock Server, HTTP Client & OpenAPI (`mockServer:*`, `http:*`, `openapi:*`)

### Mock REST Server (`mockServer:*`)
| Channel | Method | Arguments | Returns |
| :--- | :--- | :--- | :--- |
| `mockServer:start` | `invoke` | `port?: number` | `Promise<{ success: boolean; port: number }>` |
| `mockServer:stop` | `invoke` | — | `Promise<boolean>` |
| `mockServer:getStatus` | `invoke` | — | `Promise<MockServerStatus>` |
| `mockServer:saveRoutes` | `invoke` | `routes: MockRoute[]` | `Promise<boolean>` |
| `mockServer:getWebhookLogs` | `invoke` | — | `Promise<WebhookLog[]>` |

### Native HTTP Client (`http:*`)
| Channel | Method | Arguments | Returns |
| :--- | :--- | :--- | :--- |
| `http:sendRequest` | `invoke` | `options: HttpRequestOptions` | `Promise<HttpResponseResult>` |

### OpenAPI / Swagger Explorer (`openapi:*`)
| Channel | Method | Arguments | Returns |
| :--- | :--- | :--- | :--- |
| `openapi:discover` | `invoke` | `projectPath: string` | `Promise<string[]>` |
| `openapi:loadFromFile` | `invoke` | `filePath: string` | `Promise<{ success: boolean; spec?: any }>` |
| `openapi:loadFromUrl` | `invoke` | `url: string` | `Promise<{ success: boolean; spec?: any }>` |

---

## 17. System, LogStream, Notes & Window Modules

### System Telemetry (`system:*`)
| Channel | Method | Arguments | Returns |
| :--- | :--- | :--- | :--- |
| `system:getMetrics` | `invoke` | — | `Promise<SystemMetrics>` |
| `system:getProcessStats` | `invoke` | `pids: number[]` | `Promise<ProcessStats[]>` |
| `system:getDeveloperProcesses`| `invoke` | — | `Promise<any[]>` |
| `system:showNotification` | `invoke` | `title: string, body: string` | `Promise<boolean>` |

*Events*: `system:metrics`, `system:serviceStats`.

### Service Killer (`services:*`)
| Channel | Method | Arguments | Returns |
| :--- | :--- | :--- | :--- |
| `services:forceKill` | `invoke` | `options: { pid?: number; port?: number; terminalId?: string }` | `Promise<{ success: boolean; killedPids: number[] }>` |
| `services:findPidsOnPort` | `invoke` | `port: number` | `Promise<number[]>` |

### LogStream Studio (`logstream:*`)
| Channel | Method | Arguments | Returns |
| :--- | :--- | :--- | :--- |
| `logstream:getRecent` | `invoke` | `limit?: number` | `Promise<LogEntry[]>` |
| `logstream:clear` | `invoke` | — | `Promise<{ success: boolean }>` |
| `logstream:emit` | `invoke` | `source: string, level: string, tag: string, message: string, projectId?: string` | `Promise<{ success: boolean }>` |

*Event*: `logstream:log` pushes formatted log records to subscribed views.

### Notes & Markdown Scratchpad (`notes:*`)
| Channel | Method | Arguments | Returns |
| :--- | :--- | :--- | :--- |
| `notes:read` | `invoke` | `projectPath: string` | `Promise<{ content: string; updatedAt: number }>` |
| `notes:write` | `invoke` | `projectPath: string, content: string` | `Promise<{ success: boolean }>` |
| `notes:getGlobal` | `invoke` | — | `Promise<string>` |
| `notes:setGlobal` | `invoke` | `content: string` | `Promise<boolean>` |

### Window Management (`window:*`)
| Channel | Method | Arguments | Returns |
| :--- | :--- | :--- | :--- |
| `window:minimize` | `send` | — | `void` |
| `window:maximize` | `send` | — | `void` |
| `window:close` | `send` | — | `void` |
| `window:isMaximized` | `invoke` | — | `Promise<boolean>` |

### Settings & Store (`store:*`)
| Channel | Method | Arguments | Returns |
| :--- | :--- | :--- | :--- |
| `store:get` | `invoke` | `key: string, defaultValue?: any` | `Promise<any>` |
| `store:set` | `invoke` | `key: string, value: any` | `Promise<void>` |
| `store:delete` | `invoke` | `key: string` | `Promise<void>` |

---

<div align="center">
  <sub>ProjectYB IPC Reference • Version 1.0.0 • Maintained by YBicG</sub>
</div>
