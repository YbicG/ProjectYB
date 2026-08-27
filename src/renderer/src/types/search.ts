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

export interface SearchFilterState {
  query: string;
  selectedProjectId: string; // 'all' or projectId
  isRegex: boolean;
  isCaseSensitive: boolean;
  fileExtension: string; // 'all' or '.ts', '.py', etc.
}
