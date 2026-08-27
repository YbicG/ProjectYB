import { safeStorage } from 'electron';

class SecurityService {
  isEncryptionAvailable(): boolean {
    return safeStorage.isEncryptionAvailable();
  }

  encryptSecret(plaintext: string): string {
    if (!this.isEncryptionAvailable()) {
      return Buffer.from(plaintext).toString('base64');
    }
    return safeStorage.encryptString(plaintext).toString('base64');
  }

  decryptSecret(encrypted: string): string {
    if (!this.isEncryptionAvailable()) {
      return Buffer.from(encrypted, 'base64').toString('utf8');
    }
    const buffer = Buffer.from(encrypted, 'base64');
    return safeStorage.decryptString(buffer);
  }
}

export const securityService = new SecurityService();
