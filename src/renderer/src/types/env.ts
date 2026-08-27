export interface EnvEntry {
  key: string
  value: string
  comment?: string
  isSecret?: boolean
}

export interface EnvFileInfo {
  name: string
  path: string
  relativePath: string
  isExample: boolean
  entriesCount?: number
}

export interface EnvDiffItem {
  key: string
  valA?: string
  valB?: string
  status: 'onlyA' | 'onlyB' | 'mismatch' | 'match'
}

export interface EnvComparisonResult {
  fileAPath: string
  fileBPath: string
  fileAName: string
  fileBName: string
  items: EnvDiffItem[]
  totalA: number
  totalB: number
  matchingCount: number
  missingInB: string[]
  missingInA: string[]
  mismatches: string[]
}
