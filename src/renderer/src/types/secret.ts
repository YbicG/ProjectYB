export type SecretCategory = 'ai' | 'database' | 'auth' | 'cloud' | 'payments' | 'devops' | 'custom';
export type SecretEnvironment = 'all' | 'dev' | 'staging' | 'prod';

export interface SecretVaultItem {
  id: string;
  key: string;
  value: string;
  category: SecretCategory;
  environment: SecretEnvironment;
  description?: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}
