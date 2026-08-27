export interface ProjectNote {
  projectPath: string;
  content: string;
  updatedAt: number;
  filePath?: string;
  isDirty?: boolean;
}

export interface TaskItem {
  id: string;
  text: string;
  completed: boolean;
  rawLine: string;
  lineIndex: number;
}
