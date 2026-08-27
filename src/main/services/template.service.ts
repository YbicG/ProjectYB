import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import simpleGit from 'simple-git';
import { logger } from '../utils/logger';
import { getStore } from '../ipc/store.ipc';
import { githubService } from './github.service';

const execAsync = promisify(exec);

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: 'web' | 'backend' | 'bot' | 'cli' | 'game' | 'docs' | 'custom';
  type: string;
  icon: string;
  tags: string[];
  defaultScripts?: Record<string, string>;
  files: Array<{ path: string; content: string }>;
}

export interface ScaffoldOptions {
  templateId: string;
  projectName: string;
  destinationPath: string;
  description?: string;
  packageManager?: 'pnpm' | 'npm' | 'yarn' | 'bun' | 'pip' | 'cargo' | 'go';
  initGit?: boolean;
  initGitHub?: boolean;
  githubPrivate?: boolean;
  installDeps?: boolean;
  openVsCode?: boolean;
}

export interface ScaffoldResult {
  success: boolean;
  projectPath: string;
  githubUrl?: string;
  error?: string;
  logs: string[];
}

const BUILTIN_TEMPLATES: ProjectTemplate[] = [
  // 1. Vite + React + TypeScript
  {
    id: 'vite-react-ts',
    name: 'Vite + React (TypeScript)',
    description: 'Blazing fast React Single Page Application powered by Vite and TypeScript.',
    category: 'web',
    type: 'node',
    icon: 'Atom',
    tags: ['React', 'Vite', 'TypeScript', 'Tailwind'],
    defaultScripts: { dev: 'vite', build: 'tsc -b && vite build', preview: 'vite preview' },
    files: [
      {
        path: 'package.json',
        content: JSON.stringify(
          {
            name: '{{projectName}}',
            private: true,
            version: '0.1.0',
            type: 'module',
            scripts: {
              dev: 'vite',
              build: 'tsc -b && vite build',
              preview: 'vite preview'
            },
            dependencies: {
              react: '^19.0.0',
              'react-dom': '^19.0.0',
              'lucide-react': '^0.468.0'
            },
            devDependencies: {
              '@types/react': '^19.0.0',
              '@types/react-dom': '^19.0.0',
              '@vitejs/plugin-react': '^4.3.4',
              typescript: '^5.7.0',
              vite: '^6.1.0'
            }
          },
          null,
          2
        )
      },
      {
        path: 'index.html',
        content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{projectName}}</title>
  </head>
  <body class="bg-zinc-950 text-zinc-100 min-h-screen">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`
      },
      {
        path: 'src/main.tsx',
        content: `import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)`
      },
      {
        path: 'src/App.tsx',
        content: `import React, { useState } from 'react'

export const App: React.FC = () => {
  const [count, setCount] = useState(0)

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', textAlign: 'center' }}>
      <h1>🚀 {{projectName}}</h1>
      <p style={{ color: '#888' }}>Created with ProjectYB</p>
      <div style={{ marginTop: '2rem' }}>
        <button
          onClick={() => setCount((c) => c + 1)}
          style={{
            padding: '0.6rem 1.2rem',
            fontSize: '1rem',
            background: '#7c3aed',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Count is {count}
        </button>
      </div>
    </div>
  )
}`
      },
      {
        path: 'src/index.css',
        content: `* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #09090b; color: #fafafa; }`
      },
      {
        path: 'tsconfig.json',
        content: JSON.stringify(
          {
            compilerOptions: {
              target: 'ES2022',
              useDefineForClassFields: true,
              lib: ['ES2022', 'DOM', 'DOM.Iterable'],
              module: 'ESNext',
              skipLibCheck: true,
              moduleResolution: 'bundler',
              resolveJsonModule: true,
              isolatedModules: true,
              jsx: 'react-jsx',
              strict: true
            },
            include: ['src']
          },
          null,
          2
        )
      },
      {
        path: 'vite.config.ts',
        content: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 }
})`
      },
      {
        path: '.gitignore',
        content: `node_modules\ndist\n.DS_Store\n*.local\n.env\n.env.*.local`
      },
      {
        path: 'README.md',
        content: `# {{projectName}}\n\n{{description}}\n\n## Getting Started\n\n\`\`\`bash\npnpm install\npnpm dev\n\`\`\``
      }
    ]
  },

  // 2. Next.js 15 (App Router + Tailwind + TS)
  {
    id: 'nextjs-app-ts',
    name: 'Next.js 15 (App Router)',
    description: 'Full-stack React framework with App Router, server components, and Tailwind CSS.',
    category: 'web',
    type: 'node',
    icon: 'Globe',
    tags: ['Next.js', 'React', 'TypeScript', 'SSR', 'Tailwind'],
    defaultScripts: { dev: 'next dev', build: 'next build', start: 'next start' },
    files: [
      {
        path: 'package.json',
        content: JSON.stringify(
          {
            name: '{{projectName}}',
            version: '0.1.0',
            private: true,
            scripts: {
              dev: 'next dev',
              build: 'next build',
              start: 'next start'
            },
            dependencies: {
              next: '^15.1.0',
              react: '^19.0.0',
              'react-dom': '^19.0.0',
              'lucide-react': '^0.468.0'
            },
            devDependencies: {
              '@types/node': '^22.0.0',
              '@types/react': '^19.0.0',
              '@types/react-dom': '^19.0.0',
              typescript: '^5.7.0'
            }
          },
          null,
          2
        )
      },
      {
        path: 'src/app/layout.tsx',
        content: `export const metadata = {
  title: '{{projectName}}',
  description: '{{description}}'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: '#09090b', color: '#fafafa', margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}`
      },
      {
        path: 'src/app/page.tsx',
        content: `export default function Home() {
  return (
    <main style={{ padding: '4rem 2rem', textAlign: 'center' }}>
      <h1>⚡ {{projectName}}</h1>
      <p style={{ color: '#888', marginTop: '0.5rem' }}>{{description}}</p>
      <p style={{ marginTop: '2rem' }}>Edit <code>src/app/page.tsx</code> to get started.</p>
    </main>
  )
}`
      },
      {
        path: 'tsconfig.json',
        content: JSON.stringify(
          {
            compilerOptions: {
              target: 'ES2022',
              lib: ['dom', 'dom.iterable', 'esnext'],
              allowJs: true,
              skipLibCheck: true,
              strict: true,
              noEmit: true,
              esModuleInterop: true,
              module: 'esnext',
              moduleResolution: 'bundler',
              resolveJsonModule: true,
              isolatedModules: true,
              jsx: 'preserve',
              incremental: true,
              plugins: [{ name: 'next' }]
            },
            include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
            exclude: ['node_modules']
          },
          null,
          2
        )
      },
      {
        path: '.gitignore',
        content: `node_modules\n.next\nout\n.env\n.env*.local`
      },
      {
        path: 'README.md',
        content: `# {{projectName}}\n\n{{description}}\n\n## Getting Started\n\n\`\`\`bash\npnpm install\npnpm dev\n\`\`\``
      }
    ]
  },

  // 3. Node.js Express REST API (TypeScript)
  {
    id: 'express-api-ts',
    name: 'Node.js Express REST API',
    description: 'Clean backend REST API with Express, TypeScript, CORS, and dotenv configuration.',
    category: 'backend',
    type: 'node',
    icon: 'Server',
    tags: ['Express', 'Node.js', 'TypeScript', 'REST'],
    defaultScripts: { dev: 'tsx watch src/index.ts', build: 'tsc', start: 'node dist/index.js' },
    files: [
      {
        path: 'package.json',
        content: JSON.stringify(
          {
            name: '{{projectName}}',
            version: '1.0.0',
            main: 'dist/index.js',
            scripts: {
              dev: 'tsx watch src/index.ts',
              build: 'tsc',
              start: 'node dist/index.js'
            },
            dependencies: {
              cors: '^2.8.5',
              dotenv: '^16.4.7',
              express: '^4.21.2'
            },
            devDependencies: {
              '@types/cors': '^2.8.17',
              '@types/express': '^5.0.0',
              '@types/node': '^22.0.0',
              tsx: '^4.19.2',
              typescript: '^5.7.0'
            }
          },
          null,
          2
        )
      },
      {
        path: 'src/index.ts',
        content: `import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: '{{projectName}}', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(\`🚀 Server running on http://localhost:\${PORT}\`)
})`
      },
      {
        path: '.env.example',
        content: `PORT=3000\nNODE_ENV=development`
      },
      {
        path: '.env',
        content: `PORT=3000\nNODE_ENV=development`
      },
      {
        path: 'tsconfig.json',
        content: JSON.stringify(
          {
            compilerOptions: {
              target: 'ES2022',
              module: 'commonjs',
              outDir: './dist',
              rootDir: './src',
              strict: true,
              esModuleInterop: true,
              skipLibCheck: true
            },
            include: ['src/**/*']
          },
          null,
          2
        )
      },
      {
        path: '.gitignore',
        content: `node_modules\ndist\n.env\n.env.*.local`
      },
      {
        path: 'README.md',
        content: `# {{projectName}}\n\n{{description}}\n\n## Getting Started\n\n\`\`\`bash\npnpm install\npnpm dev\n\`\`\``
      }
    ]
  },

  // 4. Python FastAPI Service
  {
    id: 'fastapi-python',
    name: 'Python FastAPI REST API',
    description: 'High-performance async Python web API with FastAPI, Pydantic, and Uvicorn.',
    category: 'backend',
    type: 'python',
    icon: 'FileCode',
    tags: ['Python', 'FastAPI', 'Uvicorn', 'Pydantic', 'Async'],
    defaultScripts: { dev: 'uvicorn main:app --reload --port 8000', start: 'uvicorn main:app --port 8000' },
    files: [
      {
        path: 'main.py',
        content: `from fastapi import FastAPI
from pydantic import BaseModel
import datetime

app = FastAPI(title="{{projectName}}", description="{{description}}")

class HealthResponse(BaseModel):
    status: str
    service: str
    timestamp: str

@app.get("/health", response_model=HealthResponse)
def health_check():
    return {
        "status": "ok",
        "service": "{{projectName}}",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)`
      },
      {
        path: 'requirements.txt',
        content: `fastapi>=0.115.0\nuvicorn[standard]>=0.32.0\npydantic>=2.10.0\npython-dotenv>=1.0.0`
      },
      {
        path: '.env.example',
        content: `PORT=8000\nDEBUG=True`
      },
      {
        path: '.gitignore',
        content: `__pycache__/\n*.py[cod]\n*$py.class\n.venv/\nenv/\nvenv/\n.env`
      },
      {
        path: 'README.md',
        content: `# {{projectName}}\n\n{{description}}\n\n## Getting Started\n\n\`\`\`bash\npip install -r requirements.txt\nuvicorn main:app --reload\n\`\`\``
      }
    ]
  },

  // 5. Discord Bot (TypeScript / discord.js)
  {
    id: 'discord-bot-ts',
    name: 'Discord Bot (discord.js + TS)',
    description: 'Ready-to-run Discord bot with slash commands, event handlers, and TypeScript support.',
    category: 'bot',
    type: 'node',
    icon: 'Bot',
    tags: ['Discord', 'discord.js', 'Bot', 'TypeScript'],
    defaultScripts: { dev: 'tsx watch src/index.ts', start: 'node dist/index.js' },
    files: [
      {
        path: 'package.json',
        content: JSON.stringify(
          {
            name: '{{projectName}}',
            version: '1.0.0',
            scripts: {
              dev: 'tsx watch src/index.ts',
              build: 'tsc',
              start: 'node dist/index.js'
            },
            dependencies: {
              'discord.js': '^14.16.3',
              dotenv: '^16.4.7'
            },
            devDependencies: {
              '@types/node': '^22.0.0',
              tsx: '^4.19.2',
              typescript: '^5.7.0'
            }
          },
          null,
          2
        )
      },
      {
        path: 'src/index.ts',
        content: `import { Client, GatewayIntentBits, Events } from 'discord.js'
import dotenv from 'dotenv'

dotenv.config()

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
})

client.once(Events.ClientReady, (c) => {
  console.log(\`🤖 Ready! Logged in as \${c.user.tag}\`)
})

const token = process.env.DISCORD_TOKEN
if (!token) {
  console.error('Missing DISCORD_TOKEN in .env file!')
  process.exit(1)
}

client.login(token)`
      },
      {
        path: '.env.example',
        content: `DISCORD_TOKEN=your_discord_bot_token_here\nCLIENT_ID=your_client_id_here`
      },
      {
        path: 'tsconfig.json',
        content: JSON.stringify(
          {
            compilerOptions: {
              target: 'ES2022',
              module: 'commonjs',
              outDir: './dist',
              rootDir: './src',
              strict: true,
              esModuleInterop: true
            },
            include: ['src/**/*']
          },
          null,
          2
        )
      },
      {
        path: '.gitignore',
        content: `node_modules\ndist\n.env`
      },
      {
        path: 'README.md',
        content: `# {{projectName}}\n\n{{description}}\n\n## Getting Started\n\n1. Copy \`.env.example\` to \`.env\` and add your bot token.\n2. Run \`pnpm install\` and \`pnpm dev\`.`
      }
    ]
  },

  // 6. Rust CLI Binary
  {
    id: 'rust-cli',
    name: 'Rust CLI Tool (Cargo)',
    description: 'High-performance command-line application in Rust with Clap argument parsing.',
    category: 'cli',
    type: 'rust',
    icon: 'TerminalSquare',
    tags: ['Rust', 'Cargo', 'CLI', 'Clap'],
    defaultScripts: { run: 'cargo run', build: 'cargo build --release', test: 'cargo test' },
    files: [
      {
        path: 'Cargo.toml',
        content: `[package]
name = "{{projectName}}"
version = "0.1.0"
edition = "2021"

[dependencies]
clap = { version = "4.5", features = ["derive"] }
colored = "2.1"`
      },
      {
        path: 'src/main.rs',
        content: `use clap::Parser;
use colored::*;

#[derive(Parser, Debug)]
#[command(name = "{{projectName}}", version = "0.1.0", about = "{{description}}")]
struct Args {
    #[arg(short, long, default_value = "World")]
    name: String,
}

fn main() {
    let args = Args::parse();
    println!("{} Hello, {}!", "🚀".green(), args.name.bold().cyan());
}`
      },
      {
        path: '.gitignore',
        content: `/target\n**/*.rs.bk\nCargo.lock`
      },
      {
        path: 'README.md',
        content: `# {{projectName}}\n\n{{description}}\n\n## Build & Run\n\n\`\`\`bash\ncargo run\n\`\`\``
      }
    ]
  },

  // 7. Go Web Service
  {
    id: 'go-web-api',
    name: 'Go Web API (Standard HTTP)',
    description: 'Fast, lightweight web service in Go using standard net/http and routing.',
    category: 'backend',
    type: 'go',
    icon: 'Cpu',
    tags: ['Go', 'Golang', 'HTTP', 'API'],
    defaultScripts: { run: 'go run main.go', build: 'go build -o bin/server main.go' },
    files: [
      {
        path: 'go.mod',
        content: `module {{projectName}}\n\ngo 1.22`
      },
      {
        path: 'main.go',
        content: `package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type HealthResponse struct {
	Status    string \`json:"status"\`
	Service   string \`json:"service"\`
	Timestamp string \`json:"timestamp"\`
}

func main() {
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(HealthResponse{
			Status:    "ok",
			Service:   "{{projectName}}",
			Timestamp: time.Now().Format(time.RFC3339),
		})
	})

	port := ":8080"
	fmt.Printf("🚀 Go server running on http://localhost%s\\n", port)
	http.ListenAndServe(port, nil)
}`
      },
      {
        path: '.gitignore',
        content: `bin/\n*.exe\n*.out`
      },
      {
        path: 'README.md',
        content: `# {{projectName}}\n\n{{description}}\n\n## Run\n\n\`\`\`bash\ngo run main.go\n\`\`\``
      }
    ]
  },

  // 8. VitePress Documentation Site
  {
    id: 'vitepress-docs',
    name: 'VitePress Documentation Site',
    description: 'Modern, fast static documentation site powered by Vite & Markdown.',
    category: 'docs',
    type: 'docs',
    icon: 'BookOpen',
    tags: ['Docs', 'VitePress', 'Markdown', 'Static Site'],
    defaultScripts: { dev: 'vitepress dev docs', build: 'vitepress build docs', preview: 'vitepress preview docs' },
    files: [
      {
        path: 'package.json',
        content: JSON.stringify(
          {
            name: '{{projectName}}',
            version: '1.0.0',
            scripts: {
              'docs:dev': 'vitepress dev docs',
              'docs:build': 'vitepress build docs',
              'docs:preview': 'vitepress preview docs'
            },
            devDependencies: {
              vitepress: '^1.5.0'
            }
          },
          null,
          2
        )
      },
      {
        path: 'docs/.vitepress/config.mts',
        content: `import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "{{projectName}}",
  description: "{{description}}",
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/getting-started' }
    ],
    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'Getting Started', link: '/getting-started' }
        ]
      }
    ]
  }
})`
      },
      {
        path: 'docs/index.md',
        content: `---
layout: home

hero:
  name: "{{projectName}}"
  text: "{{description}}"
  tagline: Documentation powered by VitePress & ProjectYB
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started

features:
  - title: Fast & Light
    details: Instant server start and sub-second rebuilds.
  - title: Markdown Centric
    details: Focus on writing clean markdown documentation.
---`
      },
      {
        path: 'docs/getting-started.md',
        content: `# Getting Started\n\nWelcome to **{{projectName}}** documentation!\n\n## Overview\n\n{{description}}`
      },
      {
        path: '.gitignore',
        content: `node_modules\ndocs/.vitepress/cache\ndocs/.vitepress/dist`
      },
      {
        path: 'README.md',
        content: `# {{projectName}}\n\n{{description}}\n\n## Run Documentation\n\n\`\`\`bash\npnpm install\npnpm docs:dev\n\`\`\``
      }
    ]
  }
];

class TemplateService {
  getBuiltinTemplates(): ProjectTemplate[] {
    return BUILTIN_TEMPLATES;
  }

  async getCustomTemplates(): Promise<ProjectTemplate[]> {
    try {
      const store = await getStore();
      return (store.get('customTemplates', []) as ProjectTemplate[]) || [];
    } catch {
      return [];
    }
  }

  async saveCustomTemplate(template: ProjectTemplate): Promise<void> {
    const store = await getStore();
    const existing = await this.getCustomTemplates();
    const filtered = existing.filter((t) => t.id !== template.id);
    filtered.push(template);
    store.set('customTemplates', filtered);
  }

  async scaffoldProject(
    options: ScaffoldOptions,
    onLog?: (line: string) => void
  ): Promise<ScaffoldResult> {
    const logs: string[] = [];
    const log = (msg: string) => {
      logs.push(msg);
      onLog?.(msg);
      logger.info(`[Scaffolder] ${msg}`);
    };

    const targetDir = path.join(options.destinationPath, options.projectName);

    try {
      // 1. Validation
      if (fs.existsSync(targetDir)) {
        const files = fs.readdirSync(targetDir);
        if (files.length > 0) {
          throw new Error(`Target folder already exists and is not empty: ${targetDir}`);
        }
      } else {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      log(`📁 Created target folder: ${targetDir}`);

      // 2. Find template
      const allTemplates = [...this.getBuiltinTemplates(), ...(await this.getCustomTemplates())];
      const template = allTemplates.find((t) => t.id === options.templateId);
      if (!template) {
        throw new Error(`Template not found: ${options.templateId}`);
      }

      log(`✨ Applying template "${template.name}"...`);

      // 3. Write template files with interpolation
      const desc = options.description || template.description;
      for (const file of template.files) {
        const fullFilePath = path.join(targetDir, file.path);
        const parentDir = path.dirname(fullFilePath);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }

        let content = file.content
          .replace(/\{\{projectName\}\}/g, options.projectName)
          .replace(/\{\{description\}\}/g, desc)
          .replace(/\{\{author\}\}/g, 'YBicG');

        fs.writeFileSync(fullFilePath, content, 'utf8');
        log(`  Created ${file.path}`);
      }

      // 4. Install Dependencies if requested
      if (options.installDeps) {
        const pm = options.packageManager || (template.type === 'python' ? 'pip' : template.type === 'rust' ? 'cargo' : 'pnpm');
        log(`📦 Installing dependencies with ${pm}...`);

        try {
          if (template.type === 'python') {
            await execAsync('pip install -r requirements.txt', { cwd: targetDir });
          } else if (template.type === 'rust') {
            await execAsync('cargo check', { cwd: targetDir });
          } else {
            await execAsync(`${pm} install`, { cwd: targetDir });
          }
          log(`✅ Dependencies installed successfully.`);
        } catch (depErr: any) {
          log(`⚠️ Dependency install had warnings/errors: ${depErr.message}`);
        }
      }

      // 5. Git Init
      let githubUrl: string | undefined;
      if (options.initGit) {
        log(`🌿 Initializing git repository...`);
        const git = simpleGit(targetDir);
        await git.init();
        await git.add('.');
        await git.commit('feat: initial commit from ProjectYB template');
        log(`✅ Git repository initialized with initial commit.`);

        // 6. Push to GitHub if requested
        if (options.initGitHub) {
          log(`🐙 Creating GitHub repository "${options.projectName}"...`);
          try {
            const res = await githubService.initAndPushToGitHub(
              targetDir,
              options.projectName,
              desc,
              options.githubPrivate ?? true
            );
            githubUrl = res.url;
            log(`✅ GitHub repository created and pushed: ${res.url}`);
          } catch (ghErr: any) {
            log(`⚠️ GitHub creation skipped/failed: ${ghErr.message}`);
          }
        }
      }

      // 7. Open in VS Code
      if (options.openVsCode) {
        try {
          exec(`code "${targetDir}"`);
          log(`💻 Launched VS Code for ${options.projectName}`);
        } catch {}
      }

      log(`🎉 Project scaffolded successfully!`);

      return {
        success: true,
        projectPath: targetDir,
        githubUrl,
        logs
      };
    } catch (err: any) {
      log(`❌ Scaffolding failed: ${err.message}`);
      return {
        success: false,
        projectPath: targetDir,
        error: err.message,
        logs
      };
    }
  }
}

export const templateService = new TemplateService();
