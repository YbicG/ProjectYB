import { describe, it, expect, beforeEach } from 'vitest';
import { useSecretVaultStore } from '../src/renderer/src/stores/useSecretVaultStore';
import { SecretVaultItem, SecretCategory, SecretEnvironment } from '../src/renderer/src/types/secret';

describe('Secret Vault Store', () => {
  beforeEach(async () => {
    // Reset store state before each test
    useSecretVaultStore.setState({
      secrets: [],
      filterCategory: 'all',
      filterEnvironment: 'all',
      searchQuery: '',
      isLoaded: false,
      vaultModalOpen: false
    });
    await useSecretVaultStore.getState().loadSecrets();
  });

  describe('Initialization & Default Secrets', () => {
    it('loads default categorized and scoped secrets', () => {
      const state = useSecretVaultStore.getState();
      expect(state.isLoaded).toBe(true);
      expect(state.secrets.length).toBeGreaterThanOrEqual(3);

      const openaiSecret = state.secrets.find((s) => s.key === 'OPENAI_API_KEY');
      expect(openaiSecret).toBeDefined();
      expect(openaiSecret?.category).toBe('ai');
      expect(openaiSecret?.environment).toBe('all');

      const dbSecret = state.secrets.find((s) => s.key === 'DATABASE_URL');
      expect(dbSecret).toBeDefined();
      expect(dbSecret?.category).toBe('database');
      expect(dbSecret?.environment).toBe('dev');

      const jwtSecret = state.secrets.find((s) => s.key === 'JWT_SECRET');
      expect(jwtSecret).toBeDefined();
      expect(jwtSecret?.category).toBe('auth');
      expect(jwtSecret?.environment).toBe('all');
    });
  });

  describe('Adding, Updating & Deleting Secrets', () => {
    it('normalizes secret key to uppercase and saves secret with unique ID', async () => {
      const added = await useSecretVaultStore.getState().addSecret({
        key: 'stripe-secret-key',
        value: 'sk_test_123456789',
        category: 'payments',
        environment: 'staging',
        description: 'Stripe staging key',
        tags: ['stripe', 'payments']
      });

      expect(added.key).toBe('STRIPE_SECRET_KEY');
      expect(added.id).toMatch(/^sec_/);
      expect(added.category).toBe('payments');
      expect(added.environment).toBe('staging');

      const current = useSecretVaultStore.getState().secrets;
      expect(current.some((s) => s.key === 'STRIPE_SECRET_KEY')).toBe(true);
    });

    it('updates existing secret when adding with identical key and environment', async () => {
      await useSecretVaultStore.getState().addSecret({
        key: 'AWS_ACCESS_KEY',
        value: 'INITIAL_VAL',
        category: 'cloud',
        environment: 'prod'
      });

      const initialCount = useSecretVaultStore.getState().secrets.length;

      // Add same key and same environment with updated value
      await useSecretVaultStore.getState().addSecret({
        key: 'AWS_ACCESS_KEY',
        value: 'UPDATED_VAL',
        category: 'cloud',
        environment: 'prod'
      });

      const after = useSecretVaultStore.getState().secrets;
      expect(after.length).toBe(initialCount);

      const secret = after.find((s) => s.key === 'AWS_ACCESS_KEY' && s.environment === 'prod');
      expect(secret?.value).toBe('UPDATED_VAL');
    });

    it('updates existing secret fields via updateSecret', async () => {
      const added = await useSecretVaultStore.getState().addSecret({
        key: 'REDIS_AUTH_PASS',
        value: 'pass1',
        category: 'database',
        environment: 'dev'
      });

      await useSecretVaultStore.getState().updateSecret(added.id, {
        value: 'pass_new_secure',
        description: 'Updated redis password'
      });

      const secret = useSecretVaultStore.getState().secrets.find((s) => s.id === added.id);
      expect(secret?.value).toBe('pass_new_secure');
      expect(secret?.description).toBe('Updated redis password');
    });

    it('deletes secret from vault', async () => {
      const added = await useSecretVaultStore.getState().addSecret({
        key: 'TEMP_SECRET',
        value: 'to_be_deleted',
        category: 'custom',
        environment: 'all'
      });

      expect(useSecretVaultStore.getState().secrets.some((s) => s.id === added.id)).toBe(true);

      await useSecretVaultStore.getState().deleteSecret(added.id);

      expect(useSecretVaultStore.getState().secrets.some((s) => s.id === added.id)).toBe(false);
    });
  });

  describe('Key Lookup & Environment Scoping', () => {
    it('retrieves secret by key with environment fallback to all', async () => {
      await useSecretVaultStore.getState().addSecret({
        key: 'API_ENDPOINT',
        value: 'https://dev.api.internal',
        category: 'devops',
        environment: 'dev'
      });

      await useSecretVaultStore.getState().addSecret({
        key: 'GLOBAL_CDN',
        value: 'https://cdn.example.com',
        category: 'cloud',
        environment: 'all'
      });

      // 1. Direct environment match
      const devMatch = useSecretVaultStore.getState().getSecretByKey('API_ENDPOINT', 'dev');
      expect(devMatch?.value).toBe('https://dev.api.internal');

      // 2. Fallback to 'all' when requesting prod for a secret scoped to 'all'
      const cdnMatch = useSecretVaultStore.getState().getSecretByKey('GLOBAL_CDN', 'prod');
      expect(cdnMatch?.value).toBe('https://cdn.example.com');

      // 3. Fallback when requesting with case-insensitivity
      const lowerMatch = useSecretVaultStore.getState().getSecretByKey('global_cdn');
      expect(lowerMatch?.value).toBe('https://cdn.example.com');
    });
  });

  describe('Bulk Sync to .env', () => {
    it('matches and maps vault secrets to .env entries based on target environment', async () => {
      await useSecretVaultStore.getState().addSecret({
        key: 'SENTRY_DSN',
        value: 'https://prod-dsn@sentry.io/1',
        category: 'devops',
        environment: 'prod'
      });

      await useSecretVaultStore.getState().addSecret({
        key: 'SENTRY_DSN',
        value: 'https://dev-dsn@sentry.io/2',
        category: 'devops',
        environment: 'dev'
      });

      const envKeysToPopulate = [
        { key: 'OPENAI_API_KEY', value: '' },
        { key: 'SENTRY_DSN', value: '' },
        { key: 'UNRECOGNIZED_VAR', value: '' }
      ];

      // Test syncing for dev environment
      const devSync = useSecretVaultStore.getState().bulkSyncToEnv(envKeysToPopulate, 'dev');
      expect(devSync['OPENAI_API_KEY']).toBe('sk-proj-example1234567890abcdef');
      expect(devSync['SENTRY_DSN']).toBe('https://dev-dsn@sentry.io/2');
      expect(devSync['UNRECOGNIZED_VAR']).toBeUndefined();

      // Test syncing for prod environment
      const prodSync = useSecretVaultStore.getState().bulkSyncToEnv(envKeysToPopulate, 'prod');
      expect(prodSync['SENTRY_DSN']).toBe('https://prod-dsn@sentry.io/1');
    });
  });

  describe('Export to Template & Filter State', () => {
    it('exports all vault secrets formatted as an env template', () => {
      const template = useSecretVaultStore.getState().exportVaultToTemplate();
      expect(template).toContain('OPENAI_API_KEY=');
      expect(template).toContain('DATABASE_URL=');
      expect(template).toContain('JWT_SECRET=');
      expect(template).toContain('#');
    });

    it('sets UI filter and modal states correctly', () => {
      useSecretVaultStore.getState().setFilterCategory('payments');
      expect(useSecretVaultStore.getState().filterCategory).toBe('payments');

      useSecretVaultStore.getState().setFilterEnvironment('staging');
      expect(useSecretVaultStore.getState().filterEnvironment).toBe('staging');

      useSecretVaultStore.getState().setSearchQuery('postgres');
      expect(useSecretVaultStore.getState().searchQuery).toBe('postgres');

      useSecretVaultStore.getState().setVaultModalOpen(true);
      expect(useSecretVaultStore.getState().vaultModalOpen).toBe(true);
    });
  });
});
