import fs from 'fs';
import path from 'path';

export interface SearchMatch {
  lineNumber: number;
  lineContent: string;
  matchStart: number;
  matchLength: number;
}

export interface SearchFileResult {
  projectId: string;
  projectName: string;
  filePath: string;
  relativePath: string;
  matches: SearchMatch[];
}

export interface SearchOptions {
  query: string;
  projectPaths: Array<{ id: string; name: string; path: string }>;
  isRegex?: boolean;
  isCaseSensitive?: boolean;
  fileExtensions?: string[]; // e.g. ['.ts', '.tsx', '.py', '.json']
  maxResultsPerProject?: number;
  maxTotalResults?: number;
}

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  '.nuxt',
  'dist',
  'build',
  'out',
  'target',
  '.venv',
  'venv',
  '__pycache__',
  '.cache',
  'coverage',
  '.turbo',
  'tmp',
  'temp',
  '.idea',
  '.vscode'
]);

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svg',
  '.mp4', '.webm', '.mp3', '.wav',
  '.zip', '.tar', '.gz', '.7z', '.rar',
  '.exe', '.dll', '.so', '.dylib', '.bin',
  '.woff', '.woff2', '.ttf', '.eot',
  '.pdf', '.docx', '.xlsx', '.sqlite', '.db'
]);

const MAX_FILE_SIZE = 1.5 * 1024 * 1024; // 1.5MB max per searchable text file

export class SearchService {
  async searchProjects(options: SearchOptions): Promise<SearchFileResult[]> {
    const {
      query,
      projectPaths,
      isRegex = false,
      isCaseSensitive = false,
      fileExtensions,
      maxResultsPerProject = 50,
      maxTotalResults = 250
    } = options;

    if (!query || !query.trim() || !projectPaths || projectPaths.length === 0) {
      return [];
    }

    let regex: RegExp;
    try {
      if (isRegex) {
        regex = new RegExp(query, isCaseSensitive ? 'g' : 'gi');
      } else {
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        regex = new RegExp(escaped, isCaseSensitive ? 'g' : 'gi');
      }
    } catch {
      return [];
    }

    const results: SearchFileResult[] = [];
    let totalMatchesFound = 0;

    for (const project of projectPaths) {
      if (totalMatchesFound >= maxTotalResults) break;
      if (!fs.existsSync(project.path)) continue;

      let projectMatchesCount = 0;

      const walk = (dir: string) => {
        if (totalMatchesFound >= maxTotalResults || projectMatchesCount >= maxResultsPerProject) return;

        let entries: fs.Dirent[] = [];
        try {
          entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
          return;
        }

        for (const entry of entries) {
          if (totalMatchesFound >= maxTotalResults || projectMatchesCount >= maxResultsPerProject) break;

          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            if (!IGNORED_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
              walk(fullPath);
            }
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (BINARY_EXTENSIONS.has(ext)) continue;

            if (fileExtensions && fileExtensions.length > 0) {
              const matchedExt = fileExtensions.some((e) =>
                e.startsWith('.') ? ext === e.toLowerCase() : ext === `.${e.toLowerCase()}`
              );
              if (!matchedExt) continue;
            }

            try {
              const stats = fs.statSync(fullPath);
              if (stats.size > MAX_FILE_SIZE) continue;

              const content = fs.readFileSync(fullPath, 'utf-8');
              const lines = content.split(/\r?\n/);
              const fileMatches: SearchMatch[] = [];

              for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
                const line = lines[lineIdx];
                regex.lastIndex = 0;
                let match: RegExpExecArray | null;

                while ((match = regex.exec(line)) !== null) {
                  fileMatches.push({
                    lineNumber: lineIdx + 1,
                    lineContent: line.trim(),
                    matchStart: match.index,
                    matchLength: match[0].length
                  });

                  projectMatchesCount++;
                  totalMatchesFound++;

                  if (projectMatchesCount >= maxResultsPerProject || totalMatchesFound >= maxTotalResults) {
                    break;
                  }

                  if (match[0].length === 0) {
                    regex.lastIndex++;
                  }

                  if (!regex.global) break;
                }

                if (projectMatchesCount >= maxResultsPerProject || totalMatchesFound >= maxTotalResults) {
                  break;
                }
              }

              if (fileMatches.length > 0) {
                results.push({
                  projectId: project.id,
                  projectName: project.name,
                  filePath: fullPath,
                  relativePath: path.relative(project.path, fullPath),
                  matches: fileMatches
                });
              }
            } catch {
              // skip unreadable file
            }
          }
        }
      };

      walk(project.path);
    }

    return results;
  }
}

export const searchService = new SearchService();
