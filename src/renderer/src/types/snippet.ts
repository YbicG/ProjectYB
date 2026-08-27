export interface SnippetParameter {
  key: string;
  label: string;
  defaultValue: string;
  description?: string;
}

export interface CommandSnippet {
  id: string;
  title: string;
  description: string;
  command: string;
  category: 'git' | 'docker' | 'npm' | 'python' | 'database' | 'system' | 'custom';
  tags: string[];
  parameters?: SnippetParameter[];
  isCustom?: boolean;
}
